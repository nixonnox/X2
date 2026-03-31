import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const notificationRouter = router({
  /** 내 알림 목록 (필터 지원) */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        sourceType: z.string().optional(),
        since: z.string().optional(), // ISO date string
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.userId,
        isDismissed: false,
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: new Date() } },
        ],
      };
      if (input.unreadOnly) where.isRead = false;
      if (input.priority) where.priority = input.priority;
      if (input.sourceType) where.sourceType = input.sourceType;
      if (input.since) where.createdAt = { gte: new Date(input.since) };
      if (input.search) {
        where.AND = [
          {
            OR: [
              { title: { contains: input.search, mode: "insensitive" } },
              { message: { contains: input.search, mode: "insensitive" } },
            ],
          },
        ];
      }

      const [items, total, unreadCount] = await Promise.all([
        ctx.db.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        ctx.db.notification.count({ where }),
        ctx.db.notification.count({
          where: { userId: ctx.userId, isRead: false },
        }),
      ]);

      return {
        items,
        total,
        unreadCount,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }),

  /** 알림 읽음 처리 */
  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  /** 전체 읽음 처리 */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.notification.updateMany({
      where: { userId: ctx.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),

  /** 알림 해제 (dismiss) */
  dismiss: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { isDismissed: true, dismissedAt: new Date(), isRead: true, readAt: new Date() },
      });
      return { success: true };
    }),

  /** 알림 다시 알림 (snooze) */
  snooze: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        /** snooze 기간 (분) */
        minutes: z.number().min(5).max(10080).default(60), // 5분 ~ 7일
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const snoozedUntil = new Date(Date.now() + input.minutes * 60 * 1000);
      await ctx.db.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { snoozedUntil, isRead: true, readAt: new Date() },
      });
      return { success: true, snoozedUntil: snoozedUntil.toISOString() };
    }),

  /** 읽지 않은 알림 개수 (dismissed/snoozed 제외) */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.notification.count({
      where: {
        userId: ctx.userId,
        isRead: false,
        isDismissed: false,
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: new Date() } },
        ],
      },
    });
    return { count };
  }),

  // ─── Alert Preferences ──────────────────────────────────────

  /** 현재 사용자의 알림 설정 조회 (project-scoped) */
  getPreferences: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const projectId = input?.projectId ?? null;

      // 1차: project-specific
      let pref = null;
      if (projectId) {
        pref = await ctx.db.userAlertPreference.findFirst({
          where: { userId: ctx.userId, projectId },
        });
      }
      // 2차: global
      if (!pref) {
        pref = await ctx.db.userAlertPreference.findFirst({
          where: { userId: ctx.userId, projectId: null },
        });
      }

      if (!pref) {
        return {
          channelInApp: true,
          channelEmail: false,
          channelWebhook: false,
          webhookUrl: null,
          enableWarningSpike: true,
          enableLowConfidence: true,
          enableBenchmarkDecline: true,
          enableProviderCoverage: true,
          warningSpike_minCount: 3,
          lowConfidence_threshold: 0.4,
          benchmarkDecline_threshold: 15,
          globalCooldownMinutes: 60,
          maxAlertsPerDay: 20,
          isDefault: true,
          projectId: null,
        };
      }

      return { ...pref, isDefault: false };
    }),

  /** 알림 설정 변경 감사 로그 조회 */
  getPreferenceAuditLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      // 최근 변경 이력을 notification 테이블에서 조회 (sourceType: "pref_audit")
      const logs = await ctx.db.notification.findMany({
        where: {
          userId: ctx.userId,
          sourceType: "pref_audit",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          title: true,
          message: true,
          sourceId: true, // projectId or "global"
          createdAt: true,
        },
      });
      return { logs };
    }),

  /** 알림 설정 저장 (upsert, project-scoped) */
  savePreferences: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(), // null/undefined = global
        channelInApp: z.boolean().default(true),
        channelEmail: z.boolean().default(false),
        channelWebhook: z.boolean().default(false),
        webhookUrl: z.string().url().optional().or(z.literal("")),
        enableWarningSpike: z.boolean().default(true),
        enableLowConfidence: z.boolean().default(true),
        enableBenchmarkDecline: z.boolean().default(true),
        enableProviderCoverage: z.boolean().default(true),
        warningSpike_minCount: z.number().min(1).max(20).default(3),
        lowConfidence_threshold: z.number().min(0.1).max(0.9).default(0.4),
        benchmarkDecline_threshold: z.number().min(5).max(50).default(15),
        globalCooldownMinutes: z.number().min(10).max(1440).default(60),
        maxAlertsPerDay: z.number().min(1).max(100).default(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Guardrail warnings
      const warnings: string[] = [];
      if (input.globalCooldownMinutes < 30) {
        warnings.push(
          "쿨다운이 30분 미만이면 알림이 과도하게 생성될 수 있습니다.",
        );
      }
      if (input.maxAlertsPerDay > 50) {
        warnings.push(
          "일일 알림 수가 50건을 초과하면 알림 피로가 발생할 수 있습니다.",
        );
      }
      if (input.lowConfidence_threshold > 0.7) {
        warnings.push(
          "신뢰도 기준이 높으면 대부분의 분석에서 알림이 발생합니다.",
        );
      }
      if (input.benchmarkDecline_threshold < 5) {
        warnings.push(
          "벤치마크 하락 기준이 너무 낮으면 자연 변동에도 알림이 발생합니다.",
        );
      }
      if (input.channelWebhook && !input.webhookUrl) {
        warnings.push("외부 연동 채널을 켰지만 URL이 비어 있어요.");
      }

      // Webhook URL 변경 시 연결 테스트 (non-blocking warning)
      let webhookTestResult: { success: boolean; message: string } | null =
        null;
      if (input.channelWebhook && input.webhookUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000); // 5초 (저장 흐름이므로 짧게)
          const res = await fetch(input.webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "X2-Webhook-Test/1.0",
            },
            body: JSON.stringify({
              event: "save_test",
              timestamp: new Date().toISOString(),
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) {
            webhookTestResult = { success: true, message: "연결 확인됨" };
          } else {
            webhookTestResult = {
              success: false,
              message: `HTTP ${res.status} 응답`,
            };
            warnings.push(
              `Webhook URL 테스트에서 HTTP ${res.status} 응답을 받았어요. 설정을 저장했지만 확인해 주세요.`,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          webhookTestResult = {
            success: false,
            message: msg.includes("abort") ? "타임아웃" : "연결 실패",
          };
          warnings.push(
            "Webhook URL에 연결하지 못했어요. 설정은 저장했지만 URL을 확인해 주세요.",
          );
        }
      }

      // Load existing prefs for audit diff
      const targetProjectId = input.projectId ?? null;
      let oldPrefs: Record<string, unknown> | null = null;
      try {
        const existing = await ctx.db.userAlertPreference.findFirst({
          where: { userId: ctx.userId, projectId: targetProjectId },
        });
        if (existing) {
          const {
            id: _id,
            userId: _uid,
            createdAt: _c,
            updatedAt: _u,
            ...rest
          } = existing;
          oldPrefs = rest as Record<string, unknown>;
        }
      } catch {
        /* ignore */
      }

      const pref = await ctx.db.userAlertPreference.upsert({
        where: {
          userId_projectId: {
            userId: ctx.userId,
            projectId: targetProjectId as any,
          },
        },
        update: {
          channelInApp: input.channelInApp,
          channelEmail: input.channelEmail,
          channelWebhook: input.channelWebhook,
          webhookUrl: input.webhookUrl || null,
          enableWarningSpike: input.enableWarningSpike,
          enableLowConfidence: input.enableLowConfidence,
          enableBenchmarkDecline: input.enableBenchmarkDecline,
          enableProviderCoverage: input.enableProviderCoverage,
          warningSpike_minCount: input.warningSpike_minCount,
          lowConfidence_threshold: input.lowConfidence_threshold,
          benchmarkDecline_threshold: input.benchmarkDecline_threshold,
          globalCooldownMinutes: input.globalCooldownMinutes,
          maxAlertsPerDay: input.maxAlertsPerDay,
        },
        create: {
          userId: ctx.userId,
          projectId: targetProjectId,
          channelInApp: input.channelInApp,
          channelEmail: input.channelEmail,
          channelWebhook: input.channelWebhook,
          webhookUrl: input.webhookUrl || null,
          enableWarningSpike: input.enableWarningSpike,
          enableLowConfidence: input.enableLowConfidence,
          enableBenchmarkDecline: input.enableBenchmarkDecline,
          enableProviderCoverage: input.enableProviderCoverage,
          warningSpike_minCount: input.warningSpike_minCount,
          lowConfidence_threshold: input.lowConfidence_threshold,
          benchmarkDecline_threshold: input.benchmarkDecline_threshold,
          globalCooldownMinutes: input.globalCooldownMinutes,
          maxAlertsPerDay: input.maxAlertsPerDay,
        },
      });

      // Audit log: record what changed
      try {
        const newPrefs: Record<string, unknown> = {
          channelEmail: input.channelEmail,
          channelWebhook: input.channelWebhook,
          webhookUrl: input.webhookUrl || null,
          enableWarningSpike: input.enableWarningSpike,
          enableLowConfidence: input.enableLowConfidence,
          enableBenchmarkDecline: input.enableBenchmarkDecline,
          enableProviderCoverage: input.enableProviderCoverage,
          warningSpike_minCount: input.warningSpike_minCount,
          lowConfidence_threshold: input.lowConfidence_threshold,
          benchmarkDecline_threshold: input.benchmarkDecline_threshold,
          globalCooldownMinutes: input.globalCooldownMinutes,
          maxAlertsPerDay: input.maxAlertsPerDay,
        };

        // Find changed fields
        const changes: string[] = [];
        if (oldPrefs) {
          for (const [key, newVal] of Object.entries(newPrefs)) {
            const oldVal = oldPrefs[key];
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
              changes.push(
                `${key}: ${JSON.stringify(oldVal)} → ${JSON.stringify(newVal)}`,
              );
            }
          }
        } else {
          changes.push("신규 설정 생성");
        }

        if (changes.length > 0) {
          // Structured console log (always)
          console.info(
            `[PreferenceAudit] ${JSON.stringify({
              userId: ctx.userId,
              projectId: targetProjectId,
              changedAt: new Date().toISOString(),
              changes,
              isNew: !oldPrefs,
            })}`,
          );

          // DB audit record (lightweight — uses notification table with sourceType "pref_audit")
          await ctx.db.notification.create({
            data: {
              userId: ctx.userId,
              type: "SYSTEM_ALERT",
              title: "알림 설정 변경",
              message: changes.slice(0, 5).join("; "),
              priority: "LOW",
              sourceType: "pref_audit",
              sourceId: targetProjectId ?? "global",
              isRead: true, // 감사 로그는 자동 읽음 처리
            },
          });
        }
      } catch {
        // Audit failure must not block save
      }

      return { id: pref.id, warnings, saved: true, webhookTestResult };
    }),

  /** Webhook URL 연결 테스트 */
  testWebhook: protectedProcedure
    .input(
      z.object({
        webhookUrl: z.string().url(),
      }),
    )
    .mutation(async ({ input }) => {
      const { webhookUrl } = input;
      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        message: "X2 webhook 연결 테스트예요. 이 메시지가 보이면 정상이에요.",
      };

      // HMAC signature (optional — uses env secret if available)
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "X2-Webhook-Test/1.0",
      };

      const webhookSecret = process.env.NOTIFICATION_WEBHOOK_SECRET;
      if (webhookSecret) {
        const crypto = await import("crypto");
        const signature = crypto
          .createHmac("sha256", webhookSecret)
          .update(JSON.stringify(testPayload))
          .digest("hex");
        headers["X-Webhook-Signature"] = `sha256=${signature}`;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          return {
            success: true,
            status: res.status,
            message: "연결에 성공했어요! 이 URL로 알림을 보낼 수 있어요.",
          };
        }

        // HTTP error responses
        if (res.status === 401 || res.status === 403) {
          return {
            success: false,
            status: res.status,
            message: "인증 문제가 있어요. URL이나 토큰을 확인해 주세요.",
            errorType: "auth_error",
          };
        }
        if (res.status === 404) {
          return {
            success: false,
            status: res.status,
            message: "이 주소를 찾을 수 없어요. URL을 다시 확인해 주세요.",
            errorType: "not_found",
          };
        }
        if (res.status >= 500) {
          return {
            success: false,
            status: res.status,
            message: "상대 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.",
            errorType: "server_error",
          };
        }

        return {
          success: false,
          status: res.status,
          message: `HTTP ${res.status} 응답을 받았어요. URL 설정을 확인해 주세요.`,
          errorType: "http_error",
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "알 수 없는 오류";

        if (message.includes("abort") || message.includes("timeout")) {
          return {
            success: false,
            status: 0,
            message:
              "응답이 10초 안에 오지 않았어요. URL이나 서버 상태를 확인해 주세요.",
            errorType: "timeout",
          };
        }

        if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
          return {
            success: false,
            status: 0,
            message: "이 주소를 찾을 수 없어요. URL을 다시 확인해 주세요.",
            errorType: "dns_error",
          };
        }

        if (message.includes("ECONNREFUSED")) {
          return {
            success: false,
            status: 0,
            message:
              "서버가 연결을 거부했어요. 서버가 실행 중인지 확인해 주세요.",
            errorType: "connection_refused",
          };
        }

        return {
          success: false,
          status: 0,
          message: `연결에 실패했어요: ${message.slice(0, 100)}`,
          errorType: "network_error",
        };
      }
    }),
});
