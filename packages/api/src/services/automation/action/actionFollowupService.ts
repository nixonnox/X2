import { PrismaClient } from "@x2/db";
import { type ServiceResult, type Logger, ok, err } from "../../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionsByPriority = {
  high: ActionRecord[];
  medium: ActionRecord[];
  low: ActionRecord[];
};

type ActionRecord = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  actionType: string | null;
  sourceModule: string | null;
  sourceEntityId: string | null;
  assigneeId: string | null;
  createdAt: Date;
};

type ProcessResult = {
  processed: number;
  highPriority: number;
  faqActions: number;
  contentActions: number;
  riskActions: number;
  geoActions: number;
};

type FollowupNotificationResult = {
  notificationId: string;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ActionFollowupService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  /**
   * PENDING 상태의 액션을 스캔하고 카테고리별로 후속 처리를 수행합니다.
   */
  async processNewActions(
    workspaceId: string,
    projectId: string,
    executionId: string,
  ): Promise<ServiceResult<ProcessResult>> {
    try {
      if (!workspaceId || !projectId) {
        return err("workspaceId와 projectId는 필수입니다", "INVALID_INPUT");
      }

      const actions = await this.prisma.insightAction.findMany({
        where: {
          status: "PENDING",
          report: { projectId },
        },
        orderBy: { createdAt: "desc" },
      });

      let highPriority = 0;
      let faqActions = 0;
      let contentActions = 0;
      let riskActions = 0;
      let geoActions = 0;

      for (const action of actions) {
        const actionRecord: ActionRecord = {
          id: action.id,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: action.status,
          actionType: action.actionType,
          sourceModule: action.sourceModule,
          sourceEntityId: action.sourceEntityId ?? null,
          assigneeId: action.assigneeId ?? null,
          createdAt: action.createdAt,
        };

        // 높은 우선순위 처리
        if (action.priority === "HIGH") {
          await this.handleHighPriorityAction(actionRecord, executionId);
          highPriority++;
        }

        // 카테고리별 라우팅
        switch (action.actionType) {
          case "COMMENT_REPLY":
            await this.handleFaqAction(actionRecord, executionId);
            faqActions++;
            break;
          case "CONTENT_CREATE":
          case "CONTENT_OPTIMIZE":
            await this.handleContentAction(actionRecord, executionId);
            contentActions++;
            break;
          case "RISK_MITIGATE":
            await this.handleRiskAction(actionRecord, executionId);
            riskActions++;
            break;
          case "SEO_UPDATE":
            await this.handleGeoAction(actionRecord, executionId);
            geoActions++;
            break;
          default:
            break;
        }
      }

      this.logger.info("액션 후속 처리 완료", {
        projectId,
        processed: actions.length,
        highPriority,
        faqActions,
        contentActions,
        riskActions,
        geoActions,
        executionId,
      });

      return ok({
        processed: actions.length,
        highPriority,
        faqActions,
        contentActions,
        riskActions,
        geoActions,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("액션 후속 처리 실패", { error: message, executionId });
      return err(message, "ACTION_FOLLOWUP_FAILED");
    }
  }

  /**
   * 높은 우선순위 액션에 대해 관리자 알림을 생성하고 리뷰 큐에 등록합니다.
   */
  async handleHighPriorityAction(
    action: ActionRecord,
    executionId: string,
  ): Promise<ServiceResult<FollowupNotificationResult>> {
    try {
      const owner = action.assigneeId ?? "미지정";
      const message = `\ud83d\udd25 [높은 우선순위 액션] ${action.title} \u2014 담당: ${owner}`;

      // 액션을 IN_PROGRESS로 변경 (리뷰 큐 등록)
      await this.prisma.insightAction.update({
        where: { id: action.id },
        data: { status: "IN_PROGRESS" },
      });

      // 담당자가 있으면 알림 전송
      if (action.assigneeId) {
        const result = await this.createFollowupNotification(
          null,
          action,
          "ADMIN",
          message,
        );
        return result;
      }

      this.logger.info("높은 우선순위 액션 처리 완료", {
        actionId: action.id,
        executionId,
      });

      return ok({ notificationId: "" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("높은 우선순위 액션 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "HIGH_PRIORITY_ACTION_FAILED");
    }
  }

  /**
   * FAQ 관련 액션을 처리하고 관련 FAQ 후보를 REVIEWING 상태로 변경합니다.
   */
  async handleFaqAction(
    action: ActionRecord,
    executionId: string,
  ): Promise<ServiceResult<{ updatedFaqCount: number }>> {
    try {
      let updatedFaqCount = 0;

      // 관련 FAQ 후보를 REVIEWING으로 전환
      if (action.sourceEntityId) {
        const result = await this.prisma.fAQCandidate.updateMany({
          where: {
            id: action.sourceEntityId,
            status: "DETECTED",
          },
          data: { status: "REVIEWING" },
        });
        updatedFaqCount = result.count;
      }

      const message = `\u2753 [FAQ 대응 필요] ${action.title}`;

      await this.createFollowupNotification(
        null,
        action,
        "PRACTITIONER",
        message,
      );

      this.logger.info("FAQ 액션 처리 완료", {
        actionId: action.id,
        updatedFaqCount,
        executionId,
      });

      return ok({ updatedFaqCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("FAQ 액션 처리 실패", { error: message, executionId });
      return err(message, "FAQ_ACTION_FAILED");
    }
  }

  /**
   * 콘텐츠 관련 액션을 처리하고 콘텐츠 팀에 알림을 전송합니다.
   */
  async handleContentAction(
    action: ActionRecord,
    executionId: string,
  ): Promise<ServiceResult<FollowupNotificationResult>> {
    try {
      const message = `\ud83d\udcdd [콘텐츠 액션] ${action.title} \u2014 ${action.description}`;

      const result = await this.createFollowupNotification(
        null,
        action,
        "MARKETER",
        message,
      );

      this.logger.info("콘텐츠 액션 알림 전송 완료", {
        actionId: action.id,
        executionId,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("콘텐츠 액션 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "CONTENT_ACTION_FAILED");
    }
  }

  /**
   * 위험 관련 액션을 처리하고 긴급 알림을 생성합니다.
   */
  async handleRiskAction(
    action: ActionRecord,
    executionId: string,
  ): Promise<ServiceResult<FollowupNotificationResult>> {
    try {
      const message = `\u26a0\ufe0f [위험 대응 필요] ${action.title} \u2014 위험 신호에 대한 즉각 대응이 필요합니다`;

      const result = await this.createFollowupNotification(
        null,
        action,
        "ADMIN",
        message,
      );

      // 위험 신호 연결이 있는 경우 상태 업데이트
      if (action.sourceModule === "RISK_ENGINE" && action.sourceEntityId) {
        try {
          await this.prisma.riskSignal.update({
            where: { id: action.sourceEntityId },
            data: { status: "INVESTIGATING" },
          });
        } catch {
          // 위험 신호가 존재하지 않을 수 있음
        }
      }

      this.logger.info("위험 액션 알림 전송 완료", {
        actionId: action.id,
        executionId,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("위험 액션 처리 실패", { error: message, executionId });
      return err(message, "RISK_ACTION_FAILED");
    }
  }

  /**
   * GEO/AEO 관련 액션을 처리하고 인용 최적화가 필요한 소스를 식별합니다.
   */
  async handleGeoAction(
    action: ActionRecord,
    executionId: string,
  ): Promise<ServiceResult<FollowupNotificationResult>> {
    try {
      const message = `\ud83c\udf10 [GEO 최적화 필요] ${action.title} \u2014 AI 검색 가시성 개선이 필요합니다`;

      const result = await this.createFollowupNotification(
        null,
        action,
        "PRACTITIONER",
        message,
      );

      this.logger.info("GEO 액션 알림 전송 완료", {
        actionId: action.id,
        executionId,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("GEO 액션 처리 실패", { error: message, executionId });
      return err(message, "GEO_ACTION_FAILED");
    }
  }

  /**
   * 우선순위별로 그룹화된 최근 액션 목록을 반환합니다.
   */
  async getActionsByPriority(
    projectId: string,
    since: Date,
  ): Promise<ServiceResult<ActionsByPriority>> {
    try {
      const actions = await this.prisma.insightAction.findMany({
        where: {
          report: { projectId },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
      });

      const result: ActionsByPriority = {
        high: [],
        medium: [],
        low: [],
      };

      for (const action of actions) {
        const record: ActionRecord = {
          id: action.id,
          title: action.title,
          description: action.description,
          priority: action.priority,
          status: action.status,
          actionType: action.actionType,
          sourceModule: action.sourceModule,
          sourceEntityId: action.sourceEntityId ?? null,
          assigneeId: action.assigneeId ?? null,
          createdAt: action.createdAt,
        };

        switch (action.priority) {
          case "HIGH":
            result.high.push(record);
            break;
          case "MEDIUM":
            result.medium.push(record);
            break;
          case "LOW":
            result.low.push(record);
            break;
        }
      }

      return ok(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("우선순위별 액션 조회 실패", {
        error: message,
        projectId,
      });
      return err(message, "GET_ACTIONS_FAILED");
    }
  }

  /**
   * 후속 알림을 생성하는 헬퍼 메서드입니다.
   */
  async createFollowupNotification(
    workspaceId: string | null,
    action: ActionRecord,
    targetRole: string,
    message: string,
  ): Promise<ServiceResult<FollowupNotificationResult>> {
    try {
      // 담당자가 있으면 해당 사용자에게, 없으면 스킵
      const userId = action.assigneeId;
      if (!userId) {
        this.logger.info("담당자 미지정으로 알림 생략", {
          actionId: action.id,
          targetRole,
        });
        return ok({ notificationId: "" });
      }

      const notificationId = randomBytes(12).toString("hex");

      await this.prisma.notification.create({
        data: {
          id: notificationId,
          userId,
          workspaceId,
          type: "SYSTEM_ALERT",
          title: `액션 후속 조치 — ${targetRole}`,
          message,
          priority: action.priority === "HIGH" ? "URGENT" : "NORMAL",
          sourceType: "INSIGHT_ACTION",
          sourceId: action.id,
          channels: ["IN_APP"],
          isRead: false,
        },
      });

      return ok({ notificationId });
    } catch (error) {
      const message2 =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("후속 알림 생성 실패", {
        error: message2,
        actionId: action.id,
      });
      return err(message2, "FOLLOWUP_NOTIFICATION_FAILED");
    }
  }
}
