import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TriggerType =
  | "SCHEDULED_REPORT"
  | "RISK_ALERT"
  | "FAQ_UPDATE"
  | "GEO_CONTENT_RECOMMENDATION"
  | "CAMPAIGN_FOLLOWUP"
  | "SENTIMENT_SPIKE";

export type PreparedTrigger = {
  id: string;
  type: TriggerType;
  condition: TriggerCondition;
  payload: Record<string, unknown>;
  targetRecipients: string[];
  channel: "IN_APP" | "EMAIL" | "BOTH";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  createdAt: Date;
};

export type TriggerCondition = {
  field: string;
  operator: "GT" | "LT" | "EQ" | "CHANGE_GT" | "THRESHOLD";
  value: number | string;
  description: string;
};

export type TriggerScanResult = {
  projectId: string;
  triggeredAlerts: PreparedTrigger[];
  scannedConditions: number;
  scanDurationMs: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AlertTriggerPreparationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Scan all trigger conditions against current data for a project.
   * Does NOT send notifications — the caller decides what to do with triggered alerts.
   */
  async scanForTriggers(
    projectId: string,
    workspaceId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerScanResult>> {
    try {
      if (!projectId || !workspaceId) {
        return err("projectId and workspaceId are required", "INVALID_INPUT");
      }

      const startTime = Date.now();
      const triggeredAlerts: PreparedTrigger[] = [];
      let scannedConditions = 0;

      // 1. RISK_ALERT: Any CRITICAL/HIGH severity risk signal active
      scannedConditions++;
      const risks = await this.repositories.riskSignal.findActive(projectId);
      const criticalRisks = risks.filter((r: any) => r.severity === "CRITICAL");
      const highRisks = risks.filter((r: any) => r.severity === "HIGH");

      if (criticalRisks.length > 0) {
        triggeredAlerts.push({
          id: randomBytes(16).toString("hex"),
          type: "RISK_ALERT",
          condition: {
            field: "riskSignal.severity",
            operator: "EQ",
            value: "CRITICAL",
            description: `${criticalRisks.length}건의 심각 수준 리스크 시그널이 감지되었습니다.`,
          },
          payload: {
            riskCount: criticalRisks.length,
            riskIds: criticalRisks.map((r: any) => r.id),
            severity: "CRITICAL",
          },
          targetRecipients: ["all_admins"],
          channel: "BOTH",
          priority: "CRITICAL",
          createdAt: new Date(),
        });
      }

      if (highRisks.length > 0) {
        triggeredAlerts.push({
          id: randomBytes(16).toString("hex"),
          type: "RISK_ALERT",
          condition: {
            field: "riskSignal.severity",
            operator: "EQ",
            value: "HIGH",
            description: `${highRisks.length}건의 높음 수준 리스크 시그널이 감지되었습니다.`,
          },
          payload: {
            riskCount: highRisks.length,
            riskIds: highRisks.map((r: any) => r.id),
            severity: "HIGH",
          },
          targetRecipients: ["all_admins"],
          channel: "IN_APP",
          priority: "HIGH",
          createdAt: new Date(),
        });
      }

      // 2. FAQ_UPDATE: More than 5 unanswered FAQs
      scannedConditions++;
      const unansweredFaqs =
        await this.repositories.faqCandidate.findUnanswered(projectId);
      if (unansweredFaqs.length > 5) {
        triggeredAlerts.push({
          id: randomBytes(16).toString("hex"),
          type: "FAQ_UPDATE",
          condition: {
            field: "faqCandidate.unansweredCount",
            operator: "GT",
            value: 5,
            description: `미답변 FAQ가 ${unansweredFaqs.length}건으로 기준치(5건)를 초과했습니다.`,
          },
          payload: {
            unansweredCount: unansweredFaqs.length,
            faqIds: unansweredFaqs.slice(0, 10).map((f: any) => f.id),
          },
          targetRecipients: ["all_admins"],
          channel: "IN_APP",
          priority: "MEDIUM",
          createdAt: new Date(),
        });
      }

      // 3. SENTIMENT_SPIKE: Negative sentiment > 40%
      scannedConditions++;
      const sentimentDist =
        await this.repositories.comment.countBySentiment(projectId);
      const pos = (sentimentDist as any).positive ?? 0;
      const neu = (sentimentDist as any).neutral ?? 0;
      const neg = (sentimentDist as any).negative ?? 0;
      const totalComments = pos + neu + neg;

      if (totalComments > 0) {
        const negRate = Math.round((neg / totalComments) * 100);
        if (negRate > 40) {
          triggeredAlerts.push({
            id: randomBytes(16).toString("hex"),
            type: "SENTIMENT_SPIKE",
            condition: {
              field: "comment.negativeRate",
              operator: "GT",
              value: 40,
              description: `부정 댓글 비율이 ${negRate}%로 기준치(40%)를 초과했습니다.`,
            },
            payload: {
              negativeRate: negRate,
              negativeCount: neg,
              totalCount: totalComments,
              positiveRate: Math.round((pos / totalComments) * 100),
            },
            targetRecipients: ["all_admins"],
            channel: "BOTH",
            priority: "HIGH",
            createdAt: new Date(),
          });
        }
      }

      // 4. CAMPAIGN_FOLLOWUP: Active campaigns past end date
      scannedConditions++;
      const campaignResult =
        await this.repositories.campaign.findByProject(projectId);
      const now = new Date();
      const overdueCampaigns = campaignResult.data.filter((c: any) => {
        const endDate = c.endDate ? new Date(c.endDate) : null;
        return endDate && endDate < now && c.status === "ACTIVE";
      });

      if (overdueCampaigns.length > 0) {
        triggeredAlerts.push({
          id: randomBytes(16).toString("hex"),
          type: "CAMPAIGN_FOLLOWUP",
          condition: {
            field: "campaign.endDate",
            operator: "LT",
            value: now.toISOString(),
            description: `${overdueCampaigns.length}건의 캠페인이 종료일을 경과했습니다.`,
          },
          payload: {
            overdueCount: overdueCampaigns.length,
            campaignIds: overdueCampaigns.map((c: any) => c.id),
          },
          targetRecipients: ["all_admins"],
          channel: "IN_APP",
          priority: "MEDIUM",
          createdAt: new Date(),
        });
      }

      // 5. GEO_CONTENT_RECOMMENDATION: AEO visibility < 20 for tracked keywords
      scannedConditions++;
      const aeoSnapshots =
        await this.repositories.aeo.findLatestSnapshots(projectId);
      const lowVisibility = aeoSnapshots.filter(
        (s: any) => s.visibilityScore != null && s.visibilityScore < 20,
      );

      if (lowVisibility.length > 0) {
        triggeredAlerts.push({
          id: randomBytes(16).toString("hex"),
          type: "GEO_CONTENT_RECOMMENDATION",
          condition: {
            field: "aeoSnapshot.visibilityScore",
            operator: "LT",
            value: 20,
            description: `${lowVisibility.length}개 키워드의 AEO 가시성이 기준치(20) 미만입니다.`,
          },
          payload: {
            lowVisibilityCount: lowVisibility.length,
            snapshotIds: lowVisibility.slice(0, 10).map((s: any) => s.id),
          },
          targetRecipients: ["all_admins"],
          channel: "IN_APP",
          priority: "LOW",
          createdAt: new Date(),
        });
      }

      const scanDurationMs = Date.now() - startTime;

      this.logger.info("Trigger scan completed", {
        projectId,
        scannedConditions,
        triggeredCount: triggeredAlerts.length,
        scanDurationMs,
        requestId: trace.requestId,
      });

      return ok({
        projectId,
        triggeredAlerts,
        scannedConditions,
        scanDurationMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to scan for triggers", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "TRIGGER_SCAN_FAILED");
    }
  }

  /**
   * Execute a prepared trigger by creating notifications for recipients.
   */
  async executeTrigger(
    trigger: PreparedTrigger,
    workspaceId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<void>> {
    try {
      let recipientIds: string[] = [];

      if (trigger.targetRecipients.includes("all_admins")) {
        // Fetch workspace members with OWNER/ADMIN role
        const members =
          await this.repositories.workspace.findMembers(workspaceId);
        recipientIds = members
          .filter((m: any) => m.role === "OWNER" || m.role === "ADMIN")
          .map((m: any) => m.userId);
      } else {
        recipientIds = trigger.targetRecipients;
      }

      if (recipientIds.length === 0) {
        this.logger.warn("No recipients found for trigger", {
          triggerId: trigger.id,
          type: trigger.type,
          requestId: trace.requestId,
        });
        return ok(undefined as unknown as void);
      }

      // Create notification for each recipient
      for (const userId of recipientIds) {
        await this.repositories.notification.create({
          userId,
          type: this.mapTriggerToNotificationType(trigger.type),
          title: this.generateNotificationTitle(trigger),
          body: trigger.condition.description,
          data: {
            triggerId: trigger.id,
            triggerType: trigger.type,
            priority: trigger.priority,
            ...trigger.payload,
          },
          read: false,
        });
      }

      this.logger.info("Trigger executed", {
        triggerId: trigger.id,
        type: trigger.type,
        recipientCount: recipientIds.length,
        requestId: trace.requestId,
      });

      return ok(undefined as unknown as void);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to execute trigger", {
        triggerId: trigger.id,
        type: trigger.type,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "TRIGGER_EXECUTE_FAILED");
    }
  }

  /**
   * Create a trigger definition for scheduled report generation.
   * Does not persist — returns the trigger structure for the caller to use.
   */
  getScheduledReportTrigger(
    projectId: string,
    reportType: string,
    cronExpr: string,
  ): PreparedTrigger {
    return {
      id: randomBytes(16).toString("hex"),
      type: "SCHEDULED_REPORT",
      condition: {
        field: "schedule.cron",
        operator: "EQ",
        value: cronExpr,
        description: `정기 리포트 생성 (${reportType}, cron: ${cronExpr})`,
      },
      payload: {
        projectId,
        reportType,
        cronExpression: cronExpr,
      },
      targetRecipients: ["all_admins"],
      channel: "IN_APP",
      priority: "LOW",
      createdAt: new Date(),
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private mapTriggerToNotificationType(triggerType: TriggerType): string {
    const typeMap: Record<TriggerType, string> = {
      SCHEDULED_REPORT: "REPORT_READY",
      RISK_ALERT: "RISK_DETECTED",
      FAQ_UPDATE: "FAQ_THRESHOLD",
      GEO_CONTENT_RECOMMENDATION: "GEO_LOW_VISIBILITY",
      CAMPAIGN_FOLLOWUP: "CAMPAIGN_OVERDUE",
      SENTIMENT_SPIKE: "SENTIMENT_ALERT",
    };
    return typeMap[triggerType] ?? "GENERAL";
  }

  private generateNotificationTitle(trigger: PreparedTrigger): string {
    const titleMap: Record<TriggerType, string> = {
      SCHEDULED_REPORT: "정기 리포트가 생성되었습니다",
      RISK_ALERT: "리스크 시그널이 감지되었습니다",
      FAQ_UPDATE: "미답변 FAQ가 누적되었습니다",
      GEO_CONTENT_RECOMMENDATION: "AEO 가시성 개선이 필요합니다",
      CAMPAIGN_FOLLOWUP: "캠페인 종료 후 후속 조치가 필요합니다",
      SENTIMENT_SPIKE: "부정 댓글 비율이 급증했습니다",
    };
    return titleMap[trigger.type] ?? "알림";
  }
}
