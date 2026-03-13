import { PrismaClient } from "@x2/db";
import { type ServiceResult, type Logger, ok, err } from "../../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertType =
  | "RISK_DETECTED"
  | "SENTIMENT_SPIKE"
  | "FAQ_UNANSWERED"
  | "COLLECTION_FAILURE"
  | "GEO_VISIBILITY_DROP";

type AlertRecipient = {
  userId: string;
  role: string;
};

type AlertDispatchResult = {
  notificationId: string;
  deliveryCount: number;
};

type RiskAlertResult = {
  alertCount: number;
  notifications: string[];
};

type SentimentAlertResult = {
  notificationId: string;
  negativeRate: number;
};

type FaqAlertResult = {
  notificationId: string;
  unansweredCount: number;
};

type CollectionAlertResult = {
  notificationId: string;
  failedCount: number;
};

type GeoAlertResult = {
  alertCount: number;
  notifications: string[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AlertAutomationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  /**
   * 위험 신호가 감지되면 관리자에게 알림을 생성합니다.
   */
  async processRiskAlert(
    workspaceId: string,
    projectId: string,
    riskSignalIds: string[],
    executionId: string,
  ): Promise<ServiceResult<RiskAlertResult>> {
    try {
      if (!workspaceId || !projectId || !riskSignalIds.length) {
        return err(
          "workspaceId, projectId, riskSignalIds는 필수입니다",
          "INVALID_INPUT",
        );
      }

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      const risks = await this.prisma.riskSignal.findMany({
        where: { id: { in: riskSignalIds }, projectId },
      });

      const recipients = await this.getAlertRecipients(
        workspaceId,
        "RISK_DETECTED",
      );
      const notifications: string[] = [];

      for (const risk of risks) {
        const message = `\u26a0\ufe0f [${project.name}] 위험 신호 감지: ${risk.title} (심각도: ${risk.severity})`;

        for (const recipient of recipients) {
          const result = await this.dispatchAlert(
            workspaceId,
            {
              type: "RISK_DETECTED" as const,
              title: `위험 신호 감지 — ${risk.title}`,
              message,
              priority: risk.severity === "CRITICAL" ? "URGENT" : "HIGH",
              userId: recipient.userId,
              sourceType: "RISK_SIGNAL",
              sourceId: risk.id,
            },
            ["IN_APP"],
            executionId,
          );

          if (result.success) {
            notifications.push(result.data.notificationId);
          }
        }
      }

      this.logger.info("위험 신호 알림 처리 완료", {
        projectId,
        riskCount: risks.length,
        notificationCount: notifications.length,
        executionId,
      });

      return ok({ alertCount: risks.length, notifications });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("위험 신호 알림 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "RISK_ALERT_FAILED");
    }
  }

  /**
   * 부정 감성 비율이 임계값을 초과하면 알림을 생성합니다.
   */
  async processSentimentAlert(
    workspaceId: string,
    projectId: string,
    stats: { negativeRate: number; total: number },
    executionId: string,
  ): Promise<ServiceResult<SentimentAlertResult>> {
    try {
      if (!workspaceId || !projectId) {
        return err("workspaceId와 projectId는 필수입니다", "INVALID_INPUT");
      }

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      const rate = Math.round(stats.negativeRate * 100);
      const message = `\ud83d\udcca [${project.name}] 부정 감성 비율 ${rate}% \u2014 즉시 확인이 필요합니다`;

      const recipients = await this.getAlertRecipients(
        workspaceId,
        "SENTIMENT_SPIKE",
      );

      let notificationId = "";
      for (const recipient of recipients) {
        const result = await this.dispatchAlert(
          workspaceId,
          {
            type: "SENTIMENT_SPIKE" as const,
            title: `부정 감성 비율 경고 — ${project.name}`,
            message,
            priority: rate > 50 ? "URGENT" : "HIGH",
            userId: recipient.userId,
            sourceType: "PROJECT",
            sourceId: projectId,
          },
          ["IN_APP"],
          executionId,
        );
        if (result.success && !notificationId) {
          notificationId = result.data.notificationId;
        }
      }

      this.logger.info("부정 감성 알림 처리 완료", {
        projectId,
        negativeRate: rate,
        executionId,
      });

      return ok({ notificationId, negativeRate: rate });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("부정 감성 알림 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "SENTIMENT_ALERT_FAILED");
    }
  }

  /**
   * 미답변 FAQ가 일정 수를 초과하면 알림을 생성합니다.
   */
  async processFaqAlert(
    workspaceId: string,
    projectId: string,
    unansweredCount: number,
    executionId: string,
  ): Promise<ServiceResult<FaqAlertResult>> {
    try {
      if (!workspaceId || !projectId) {
        return err("workspaceId와 projectId는 필수입니다", "INVALID_INPUT");
      }

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      const message = `\u2753 [${project.name}] 미답변 FAQ ${unansweredCount}건 \u2014 고객 대응이 필요합니다`;

      const recipients = await this.getAlertRecipients(
        workspaceId,
        "FAQ_UNANSWERED",
      );

      let notificationId = "";
      for (const recipient of recipients) {
        const result = await this.dispatchAlert(
          workspaceId,
          {
            type: "SYSTEM_ALERT" as const,
            title: `미답변 FAQ 경고 — ${project.name}`,
            message,
            priority: unansweredCount > 10 ? "HIGH" : "NORMAL",
            userId: recipient.userId,
            sourceType: "PROJECT",
            sourceId: projectId,
          },
          ["IN_APP"],
          executionId,
        );
        if (result.success && !notificationId) {
          notificationId = result.data.notificationId;
        }
      }

      this.logger.info("FAQ 알림 처리 완료", {
        projectId,
        unansweredCount,
        executionId,
      });

      return ok({ notificationId, unansweredCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("FAQ 알림 처리 실패", { error: message, executionId });
      return err(message, "FAQ_ALERT_FAILED");
    }
  }

  /**
   * 데이터 수집 파이프라인 실패 시 관리자에게 알림을 생성합니다.
   */
  async processCollectionAlert(
    workspaceId: string,
    failedJobs: Array<{ id: string; type: string; lastError?: string }>,
    executionId: string,
  ): Promise<ServiceResult<CollectionAlertResult>> {
    try {
      if (!workspaceId || !failedJobs.length) {
        return err("workspaceId와 failedJobs는 필수입니다", "INVALID_INPUT");
      }

      const count = failedJobs.length;
      const message = `\ud83d\udd34 데이터 수집 실패: ${count}개 파이프라인 \u2014 관리자 확인 필요`;

      const recipients = await this.getAlertRecipients(
        workspaceId,
        "COLLECTION_FAILURE",
      );

      let notificationId = "";
      for (const recipient of recipients) {
        const result = await this.dispatchAlert(
          workspaceId,
          {
            type: "SYNC_FAILURE" as const,
            title: `데이터 수집 실패 — ${count}개 파이프라인`,
            message,
            priority: "URGENT",
            userId: recipient.userId,
            sourceType: "SCHEDULED_JOB",
            sourceId: failedJobs[0]?.id ?? null,
          },
          ["IN_APP"],
          executionId,
        );
        if (result.success && !notificationId) {
          notificationId = result.data.notificationId;
        }
      }

      this.logger.info("수집 실패 알림 처리 완료", {
        workspaceId,
        failedCount: count,
        executionId,
      });

      return ok({ notificationId, failedCount: count });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("수집 실패 알림 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "COLLECTION_ALERT_FAILED");
    }
  }

  /**
   * GEO/AEO 가시성 점수가 저하된 키워드에 대해 알림을 생성합니다.
   */
  async processGeoAlert(
    workspaceId: string,
    projectId: string,
    lowScoreKeywords: Array<{ keyword: string; score: number }>,
    executionId: string,
  ): Promise<ServiceResult<GeoAlertResult>> {
    try {
      if (!workspaceId || !projectId || !lowScoreKeywords.length) {
        return err(
          "workspaceId, projectId, lowScoreKeywords는 필수입니다",
          "INVALID_INPUT",
        );
      }

      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      const recipients = await this.getAlertRecipients(
        workspaceId,
        "GEO_VISIBILITY_DROP",
      );
      const notifications: string[] = [];

      for (const kw of lowScoreKeywords) {
        const message = `\ud83d\udcc9 GEO/AEO 가시성 저하: ${kw.keyword} (점수: ${kw.score})`;

        for (const recipient of recipients) {
          const result = await this.dispatchAlert(
            workspaceId,
            {
              type: "CITATION_CHANGE" as const,
              title: `GEO 가시성 저하 — ${kw.keyword}`,
              message,
              priority: kw.score < 20 ? "HIGH" : "NORMAL",
              userId: recipient.userId,
              sourceType: "PROJECT",
              sourceId: projectId,
            },
            ["IN_APP"],
            executionId,
          );
          if (result.success) {
            notifications.push(result.data.notificationId);
          }
        }
      }

      this.logger.info("GEO 가시성 알림 처리 완료", {
        projectId,
        keywordCount: lowScoreKeywords.length,
        executionId,
      });

      return ok({ alertCount: lowScoreKeywords.length, notifications });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("GEO 가시성 알림 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "GEO_ALERT_FAILED");
    }
  }

  /**
   * 알림을 생성하고 전달 로그를 기록합니다.
   */
  async dispatchAlert(
    workspaceId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      priority: string;
      userId: string;
      sourceType?: string | null;
      sourceId?: string | null;
    },
    channels: string[],
    executionId: string,
  ): Promise<ServiceResult<AlertDispatchResult>> {
    try {
      const notificationId = randomBytes(12).toString("hex");

      await this.prisma.notification.create({
        data: {
          id: notificationId,
          userId: notification.userId,
          workspaceId,
          type: notification.type as any,
          title: notification.title,
          message: notification.message,
          priority: notification.priority as any,
          sourceType: notification.sourceType ?? null,
          sourceId: notification.sourceId ?? null,
          channels,
          isRead: false,
        },
      });

      let deliveryCount = 0;
      for (const channel of channels) {
        try {
          await this.prisma.deliveryLog.create({
            data: {
              id: randomBytes(12).toString("hex"),
              executionId,
              channel: channel as any,
              recipientId: notification.userId,
              status: "PENDING",
              sourceType: notification.sourceType ?? null,
              sourceId: notification.sourceId ?? null,
              retryCount: 0,
            },
          });
          deliveryCount++;
        } catch {
          this.logger.warn("전달 로그 생성 실패", { notificationId, channel });
        }
      }

      return ok({ notificationId, deliveryCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("알림 디스패치 실패", { error: message, executionId });
      return err(message, "ALERT_DISPATCH_FAILED");
    }
  }

  /**
   * 알림 유형에 따른 수신자 목록을 반환합니다 (관리자/소유자).
   */
  async getAlertRecipients(
    workspaceId: string,
    alertType: AlertType,
  ): Promise<AlertRecipient[]> {
    try {
      // 모든 알림 유형에 대해 OWNER와 ADMIN 역할의 멤버를 반환
      const targetRoles =
        alertType === "COLLECTION_FAILURE"
          ? ["OWNER", "ADMIN"]
          : ["OWNER", "ADMIN", "MEMBER"];

      const members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: targetRoles as any[] },
        },
      });

      return members.map((m) => ({
        userId: m.userId,
        role: m.role,
      }));
    } catch (error) {
      this.logger.warn("알림 수신자 조회 실패", {
        workspaceId,
        alertType,
        error: error instanceof Error ? error.message : "unknown",
      });
      return [];
    }
  }
}
