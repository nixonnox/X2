/**
 * IntelligenceAlertService
 *
 * Intelligence 분석 결과를 평가하고, 유의미한 변화가 감지되면
 * 알림(Notification)을 트리거하는 서비스.
 *
 * - WARNING_SPIKE: 경고 수 급증
 * - LOW_CONFIDENCE: 낮은 신뢰도
 * - BENCHMARK_DECLINE: 벤치마크 점수 하락
 * - PROVIDER_COVERAGE_LOW: 소셜 provider 부분 연결 + 낮은 신뢰도
 */

import { randomBytes } from "crypto";
import {
  NotificationChannelDispatchService,
  type DeliveryChannel,
} from "../notification/channel-dispatch.service";

// ─── Types ───────────────────────────────────────────────────────

type IntelligenceAlertType =
  | "WARNING_SPIKE"
  | "LOW_CONFIDENCE"
  | "BENCHMARK_DECLINE"
  | "PROVIDER_COVERAGE_LOW";

type AlertSeverity = "HIGH" | "NORMAL";

type AlertConditionResult = {
  type: IntelligenceAlertType;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
};

type EvaluateAndAlertParams = {
  projectId: string;
  userId: string;
  seedKeyword: string;
  industryType: string;
  currentResult: {
    confidence: number;
    isPartial: boolean;
    warnings: string[];
    benchmarkComparison?: { overallScore: number; warnings: string[] } | null;
    signalQuality: { overallRichness: string };
  };
};

// ─── Default Constants (fallback when no user preference exists) ─

/** Type-specific cooldown defaults — only used when user has no globalCooldownMinutes set */
const DEFAULT_TYPE_COOLDOWNS: Record<IntelligenceAlertType, number> = {
  WARNING_SPIKE: 1 * 60 * 60 * 1000, // 1 hour
  LOW_CONFIDENCE: 24 * 60 * 60 * 1000, // 24 hours
  BENCHMARK_DECLINE: 24 * 60 * 60 * 1000, // 24 hours
  PROVIDER_COVERAGE_LOW: 6 * 60 * 60 * 1000, // 6 hours
};

const DEFAULT_PREFS = {
  enableWarningSpike: true,
  enableLowConfidence: true,
  enableBenchmarkDecline: true,
  enableProviderCoverage: true,
  warningSpike_minCount: 3,
  lowConfidence_threshold: 0.4,
  benchmarkDecline_threshold: 15,
  globalCooldownMinutes: 60,
  maxAlertsPerDay: 20,
  channelEmail: false,
  channelWebhook: false,
  webhookUrl: null as string | null,
};

type UserPrefs = {
  enableWarningSpike: boolean;
  enableLowConfidence: boolean;
  enableBenchmarkDecline: boolean;
  enableProviderCoverage: boolean;
  warningSpike_minCount: number;
  lowConfidence_threshold: number;
  benchmarkDecline_threshold: number;
  globalCooldownMinutes: number;
  maxAlertsPerDay: number;
  channelEmail: boolean;
  channelWebhook: boolean;
  webhookUrl: string | null;
};

// ─── Service ─────────────────────────────────────────────────────

export class IntelligenceAlertService {
  constructor(private readonly prisma: any) {}

  /**
   * Evaluate an analysis result and trigger alerts if thresholds are met.
   * Called after each intelligence.analyze execution.
   */
  async evaluateAndAlert(
    params: EvaluateAndAlertParams,
  ): Promise<{ alertsTriggered: string[]; dailyCapped?: boolean }> {
    const { projectId, userId, seedKeyword, industryType, currentResult } =
      params;

    const alertsTriggered: string[] = [];

    // Load user alert preferences (or use defaults)
    let prefs: UserPrefs = { ...DEFAULT_PREFS };
    let prefsSource: "project" | "global" | "default" = "default";
    try {
      // 1차: project-specific preference
      let userPref = null;
      if (projectId) {
        userPref = await this.prisma.userAlertPreference.findFirst({
          where: { userId, projectId },
        });
        if (userPref) prefsSource = "project";
      }
      // 2차: global user preference (projectId=null)
      if (!userPref) {
        userPref = await this.prisma.userAlertPreference.findFirst({
          where: { userId, projectId: null },
        });
        if (userPref) prefsSource = "global";
      }
      if (userPref) {
        prefs = userPref as unknown as UserPrefs;
      }
    } catch {
      // Use defaults on preference load failure
      prefsSource = "default";
    }

    // Policy trace log — 어떤 설정이 사용되는지 추적
    console.info(
      `[AlertPolicy] ${JSON.stringify({
        userId,
        projectId: projectId ?? null,
        prefsSource,
        appliedPolicy: {
          maxAlertsPerDay: prefs.maxAlertsPerDay,
          globalCooldownMinutes: prefs.globalCooldownMinutes,
          thresholds: {
            warningSpike: prefs.warningSpike_minCount,
            lowConfidence: prefs.lowConfidence_threshold,
            benchmarkDecline: prefs.benchmarkDecline_threshold,
          },
          channels: {
            email: prefs.channelEmail,
            webhook: prefs.channelWebhook,
          },
          enabledAlerts: {
            warningSpike: prefs.enableWarningSpike,
            lowConfidence: prefs.enableLowConfidence,
            benchmarkDecline: prefs.enableBenchmarkDecline,
            providerCoverage: prefs.enableProviderCoverage,
          },
        },
      })}`,
    );

    // Fetch the previous run for comparison-based alerts
    let previousRun: any = null;
    try {
      previousRun = await this.prisma.intelligenceAnalysisRun.findFirst({
        where: { projectId, seedKeyword },
        orderBy: { analyzedAt: "desc" },
        // Skip the most recent (current) — we want the one before it
        skip: 1,
      });
    } catch (err) {
      console.error("[IntelligenceAlert] Failed to fetch previous run:", err);
      // Continue without comparison — only absolute-threshold alerts will fire
    }

    // Check daily alert cap before evaluating conditions
    let dailyAlertCount = 0;
    let capCountFailed = false;
    try {
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0); // UTC 기준 (S3-1 fix)
      dailyAlertCount = await this.prisma.notification.count({
        where: {
          userId,
          sourceType: "intelligence_alert",
          createdAt: { gte: todayStart },
        },
      });
    } catch {
      // S2-1 fix: Count 실패 시 보수적으로 cap 적용 (안전 우선)
      capCountFailed = true;
      dailyAlertCount = prefs.maxAlertsPerDay;
      console.warn(
        `[IntelligenceAlert] Daily cap count query failed for user ${userId} — applying conservative cap`,
      );
    }

    if (dailyAlertCount >= prefs.maxAlertsPerDay) {
      console.info(
        `[IntelligenceAlert] Daily cap reached for user ${userId}: ${dailyAlertCount}/${prefs.maxAlertsPerDay}${capCountFailed ? " (conservative — count query failed)" : ""} — skipping all alerts`,
      );
      return { alertsTriggered: [], dailyCapped: true };
    }

    // Evaluate all alert conditions using user preferences
    const conditions = this.evaluateConditions(
      currentResult,
      previousRun,
      seedKeyword,
      prefs,
    );

    // Track remaining daily cap during this evaluation
    let remainingDailyCap = prefs.maxAlertsPerDay - dailyAlertCount;

    // Process each triggered condition
    for (const condition of conditions) {
      // Check per-iteration daily cap
      if (remainingDailyCap <= 0) {
        console.info(
          `[IntelligenceAlert] Daily cap reached mid-evaluation — skipping remaining conditions`,
        );
        break;
      }

      // Include projectId in sourceId for cross-project isolation
      const sourceId = `${projectId}:${condition.type}:${seedKeyword}`;

      try {
        // Cooldown: user's globalCooldownMinutes vs type-specific default (whichever is longer)
        // User can increase globalCooldown to suppress frequent alerts
        const userCooldownMs = prefs.globalCooldownMinutes * 60 * 1000;
        const typeCooldownMs = condition.cooldownMs; // from DEFAULT_TYPE_COOLDOWNS (fallback floor)
        const cooldownMs = Math.max(userCooldownMs, typeCooldownMs);
        const withinCooldown = await this.isWithinCooldown(
          sourceId,
          cooldownMs,
        );
        if (withinCooldown) {
          console.info(
            `[IntelligenceAlert] Skipped ${condition.type} for "${seedKeyword}" — cooldown active (${Math.round(cooldownMs / 60000)}min)`,
          );
          continue;
        }

        await this.createAlertNotification({
          userId,
          type: condition.type,
          severity: condition.severity,
          message: condition.message,
          sourceId,
          keyword: seedKeyword,
          projectId,
        });

        alertsTriggered.push(condition.type);
        remainingDailyCap--;
      } catch (err) {
        console.error(
          `[IntelligenceAlert] Failed to process ${condition.type} for "${seedKeyword}":`,
          err,
        );
        // Continue evaluating other conditions — don't let one failure block all
      }
    }

    return { alertsTriggered, dailyCapped: false };
  }

  // ─── Condition Evaluation ─────────────────────────────────────

  private evaluateConditions(
    current: EvaluateAndAlertParams["currentResult"],
    previousRun: any | null,
    keyword: string,
    prefs: UserPrefs,
  ): AlertConditionResult[] {
    const results: AlertConditionResult[] = [];

    // 1. WARNING_SPIKE — uses user's warningSpike_minCount
    if (prefs.enableWarningSpike) {
      if (current.warnings.length >= prefs.warningSpike_minCount) {
        const prevWarningCount: number =
          previousRun?.additionalWarnings?.length ?? 0;
        if (current.warnings.length > prevWarningCount) {
          results.push({
            type: "WARNING_SPIKE",
            severity: "HIGH",
            message: `'${keyword}' 분석에서 경고가 ${current.warnings.length}개로 증가했습니다`,
            cooldownMs: DEFAULT_TYPE_COOLDOWNS.WARNING_SPIKE,
          });
        }
      }
    }

    // 2. LOW_CONFIDENCE — uses user's lowConfidence_threshold
    if (prefs.enableLowConfidence) {
      if (current.confidence < prefs.lowConfidence_threshold) {
        results.push({
          type: "LOW_CONFIDENCE",
          severity: "NORMAL",
          message: `'${keyword}' 분석 신뢰도가 낮습니다 (${current.confidence})`,
          cooldownMs: DEFAULT_TYPE_COOLDOWNS.LOW_CONFIDENCE,
        });
      }
    }

    // 3. BENCHMARK_DECLINE — uses user's benchmarkDecline_threshold
    if (prefs.enableBenchmarkDecline) {
      if (current.benchmarkComparison && previousRun?.benchmarkComparison) {
        const currentScore = current.benchmarkComparison.overallScore;
        const prevScore =
          typeof previousRun.benchmarkComparison === "object" &&
          previousRun.benchmarkComparison !== null
            ? (previousRun.benchmarkComparison as any).overallScore
            : null;

        if (
          prevScore != null &&
          typeof prevScore === "number" &&
          prevScore - currentScore >= prefs.benchmarkDecline_threshold
        ) {
          results.push({
            type: "BENCHMARK_DECLINE",
            severity: "HIGH",
            message: `'${keyword}' 벤치마크 점수가 ${prevScore}에서 ${currentScore}로 하락했습니다`,
            cooldownMs: DEFAULT_TYPE_COOLDOWNS.BENCHMARK_DECLINE,
          });
        }
      }
    }

    // 4. PROVIDER_COVERAGE_LOW
    if (prefs.enableProviderCoverage) {
      if (current.isPartial && current.confidence < 0.5) {
        results.push({
          type: "PROVIDER_COVERAGE_LOW",
          severity: "NORMAL",
          message:
            "소셜 provider 연결이 부분적입니다. 데이터 정확도가 낮을 수 있습니다.",
          cooldownMs: DEFAULT_TYPE_COOLDOWNS.PROVIDER_COVERAGE_LOW,
        });
      }
    }

    return results;
  }

  // ─── Cooldown Check ───────────────────────────────────────────

  private async isWithinCooldown(
    sourceId: string,
    cooldownMs: number,
  ): Promise<boolean> {
    const cooldownStart = new Date(Date.now() - cooldownMs);

    const recent = await this.prisma.notification.findFirst({
      where: {
        sourceType: "intelligence_alert",
        sourceId,
        createdAt: { gte: cooldownStart },
      },
      orderBy: { createdAt: "desc" },
    });

    return recent != null;
  }

  // ─── Notification Creation ────────────────────────────────────

  private async createAlertNotification(params: {
    userId: string;
    type: IntelligenceAlertType;
    severity: AlertSeverity;
    message: string;
    sourceId: string;
    keyword: string;
    projectId: string;
  }): Promise<string | null> {
    try {
      const notificationId = randomBytes(12).toString("hex");
      const priority = params.severity === "HIGH" ? "HIGH" : "NORMAL";
      const actionUrl = `/intelligence?keyword=${encodeURIComponent(params.keyword)}`;

      // P1-2: Resolve channels from USER PREFERENCES (not just env)
      const channels: DeliveryChannel[] = ["IN_APP"];
      const userPrefs = await this.loadUserChannelPrefs(
        params.userId,
        params.projectId,
      );
      const dispatcher = new NotificationChannelDispatchService(
        undefined,
        this.prisma,
      );
      const envChannelStatus = dispatcher.getChannelStatus();

      // EMAIL: user pref ON + env configured
      if (userPrefs.channelEmail && envChannelStatus.EMAIL.configured) {
        channels.push("EMAIL");
      }
      // WEBHOOK: user pref ON + (env configured OR user has webhookUrl)
      if (
        userPrefs.channelWebhook &&
        (envChannelStatus.WEBHOOK.configured || userPrefs.webhookUrl)
      ) {
        channels.push("WEBHOOK");
      }

      // Channel decision trace log
      console.info(
        `[ChannelDecision] ${JSON.stringify({
          notificationId,
          userId: params.userId,
          resolvedChannels: channels,
          userPrefs: {
            email: userPrefs.channelEmail,
            webhook: userPrefs.channelWebhook,
            webhookUrl: !!userPrefs.webhookUrl,
          },
          envStatus: {
            emailConfigured: envChannelStatus.EMAIL.configured,
            webhookConfigured: envChannelStatus.WEBHOOK.configured,
          },
          skippedChannels: [
            ...(!userPrefs.channelEmail || !envChannelStatus.EMAIL.configured
              ? [
                  "EMAIL(user:" +
                    userPrefs.channelEmail +
                    ",env:" +
                    envChannelStatus.EMAIL.configured +
                    ")",
                ]
              : []),
            ...(!userPrefs.channelWebhook ||
            (!envChannelStatus.WEBHOOK.configured && !userPrefs.webhookUrl)
              ? [
                  "WEBHOOK(user:" +
                    userPrefs.channelWebhook +
                    ",env:" +
                    envChannelStatus.WEBHOOK.configured +
                    ")",
                ]
              : []),
          ],
        })}`,
      );

      // Save to DB (IN_APP delivery)
      await this.prisma.notification.create({
        data: {
          id: notificationId,
          userId: params.userId,
          type: "SYSTEM_ALERT",
          title: `Intelligence Alert: ${params.type}`,
          message: params.message,
          priority,
          sourceType: "intelligence_alert",
          sourceId: params.sourceId,
          actionUrl,
          channels,
          isRead: false,
        },
      });

      // Dispatch to external channels (non-blocking)
      if (channels.length > 1) {
        const externalChannels = channels.filter((c) => c !== "IN_APP");

        // Get user email + verification status for EMAIL channel
        let recipientEmail: string | undefined;
        if (externalChannels.includes("EMAIL")) {
          try {
            const user = await this.prisma.user.findUnique({
              where: { id: params.userId },
              select: { email: true, emailVerified: true },
            });
            if (user?.email) {
              if (user.emailVerified) {
                recipientEmail = user.email;
              } else {
                // Email not verified — skip EMAIL delivery, log reason
                console.info(
                  `[ChannelDecision] EMAIL skipped: email not verified for user ${params.userId}`,
                );
                const idx = externalChannels.indexOf("EMAIL");
                if (idx !== -1) externalChannels.splice(idx, 1);
              }
            }
          } catch {
            // Skip email if user lookup fails
          }
        }

        dispatcher
          .dispatch({
            notificationId,
            userId: params.userId,
            channels: externalChannels,
            title: `Intelligence Alert: ${params.type}`,
            message: params.message,
            priority,
            actionUrl,
            sourceType: "intelligence_alert",
            sourceId: params.sourceId,
            recipientEmail,
          })
          .then(async (results) => {
            // P2-3: Persist delivery results
            for (const r of results) {
              await this.persistDeliveryLog({
                notificationId,
                projectId: params.projectId,
                channel: r.channel,
                status:
                  r.status === "SUCCESS"
                    ? "sent"
                    : r.status === "SKIPPED"
                      ? "skipped"
                      : "failed",
                attemptCount: 1,
                failureReason: r.error,
                deliveredAt: r.deliveredAt,
              });

              if (r.status === "FAILED") {
                console.error(
                  `[IntelligenceAlert] ${r.channel} delivery failed for ${params.type}:`,
                  r.error,
                );

                // P2-4: Schedule retry for failed external deliveries
                await this.scheduleRetry({
                  notificationId,
                  userId: params.userId,
                  channel: r.channel,
                  title: `Intelligence Alert: ${params.type}`,
                  message: params.message,
                  priority,
                  actionUrl,
                  sourceType: "intelligence_alert",
                  sourceId: params.sourceId,
                  recipientEmail,
                  webhookUrl: userPrefs.webhookUrl ?? undefined,
                  attemptCount: 1,
                });
              }
            }
          })
          .catch((err) => {
            console.error("[IntelligenceAlert] Channel dispatch error:", err);
          });
      }

      return notificationId;
    } catch (err) {
      console.error(
        `[IntelligenceAlert] Notification create failed for ${params.type}:`,
        err,
      );
      return null;
    }
  }

  // ─── P1-2: User Channel Preference Loader (project-scoped) ──

  private async loadUserChannelPrefs(
    userId: string,
    projectId?: string,
  ): Promise<{
    channelInApp: boolean;
    channelEmail: boolean;
    channelWebhook: boolean;
    webhookUrl: string | null;
  }> {
    try {
      // 1차: project-specific preference
      if (projectId) {
        const projectPref = await this.prisma.userAlertPreference.findFirst({
          where: { userId, projectId },
          select: {
            channelInApp: true,
            channelEmail: true,
            channelWebhook: true,
            webhookUrl: true,
          },
        });
        if (projectPref) return projectPref;
      }

      // 2차: global user preference (projectId=null)
      const globalPref = await this.prisma.userAlertPreference.findFirst({
        where: { userId, projectId: null },
        select: {
          channelInApp: true,
          channelEmail: true,
          channelWebhook: true,
          webhookUrl: true,
        },
      });
      if (globalPref) return globalPref;
    } catch {
      // Fall through to defaults
    }
    return {
      channelInApp: true,
      channelEmail: false,
      channelWebhook: false,
      webhookUrl: null,
    };
  }

  // ─── P2-3: Persistent Delivery Log ──────────────────────────

  private async persistDeliveryLog(params: {
    notificationId: string;
    projectId: string;
    channel: string;
    status: "queued" | "sent" | "failed" | "skipped" | "capped";
    attemptCount: number;
    failureReason?: string;
    deliveredAt?: string;
  }): Promise<void> {
    try {
      // Store in notification metadata (JSON field approach)
      // delivery_logs table requires executionId FK — use notification update instead
      await this.prisma.notification.update({
        where: { id: params.notificationId },
        data: {
          // Append delivery status to channels array metadata
          emailSentAt:
            params.channel === "EMAIL" && params.status === "sent"
              ? new Date()
              : undefined,
        },
      });

      // Structured log for operational tracing
      console.info(
        `[DeliveryLog] ${JSON.stringify({
          notificationId: params.notificationId,
          projectId: params.projectId,
          channel: params.channel,
          status: params.status,
          attemptCount: params.attemptCount,
          failureReason: params.failureReason ?? null,
          deliveredAt: params.deliveredAt ?? null,
          loggedAt: new Date().toISOString(),
        })}`,
      );
    } catch (err) {
      console.warn("[DeliveryLog] Failed to persist:", err);
    }
  }

  // ─── P2-4: External Delivery Retry ──────────────────────────

  private static readonly RETRY_DELAYS = [
    5 * 60 * 1000, // 5 minutes
    15 * 60 * 1000, // 15 minutes
    60 * 60 * 1000, // 60 minutes
  ];
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  private async scheduleRetry(params: {
    notificationId: string;
    userId: string;
    channel: string;
    title: string;
    message: string;
    priority: string;
    actionUrl: string;
    sourceType: string;
    sourceId: string;
    projectId?: string;
    recipientEmail?: string;
    webhookUrl?: string;
    attemptCount: number;
  }): Promise<void> {
    if (params.attemptCount >= IntelligenceAlertService.MAX_RETRY_ATTEMPTS) {
      console.info(
        `[DeliveryRetry] Max attempts reached for ${params.channel} on ${params.notificationId} — giving up`,
      );
      await this.persistDeliveryLog({
        notificationId: params.notificationId,
        projectId: params.projectId ?? "",
        channel: params.channel,
        status: "failed",
        attemptCount: params.attemptCount,
        failureReason: "max_retry_attempts_reached",
      });
      return;
    }

    const delayMs =
      IntelligenceAlertService.RETRY_DELAYS[params.attemptCount - 1] ??
      IntelligenceAlertService.RETRY_DELAYS[
        IntelligenceAlertService.RETRY_DELAYS.length - 1
      ]!;

    console.info(
      `[DeliveryRetry] Scheduling BullMQ delayed retry ${params.attemptCount + 1}/${IntelligenceAlertService.MAX_RETRY_ATTEMPTS} ` +
        `for ${params.channel} in ${delayMs / 60000}min`,
    );

    // BullMQ delayed job — survives server restarts
    try {
      const { deliveryRetryQueue } = await import("@x2/queue");
      await deliveryRetryQueue.add(
        `retry:${params.notificationId}:${params.channel}:${params.attemptCount + 1}`,
        {
          notificationId: params.notificationId,
          userId: params.userId,
          channel: params.channel,
          title: params.title,
          message: params.message,
          priority: params.priority,
          actionUrl: params.actionUrl,
          sourceType: params.sourceType,
          sourceId: params.sourceId,
          projectId: params.projectId ?? "",
          recipientEmail: params.recipientEmail,
          webhookUrl: params.webhookUrl,
          attemptCount: params.attemptCount + 1,
        },
        { delay: delayMs },
      );
    } catch (err) {
      console.error(
        `[DeliveryRetry] Failed to enqueue BullMQ retry for ${params.channel}:`,
        err,
      );
    }
  }
}
