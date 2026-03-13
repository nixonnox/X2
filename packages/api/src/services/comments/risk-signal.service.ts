import type { Repositories } from "../../repositories";
import type {
  PaginatedResult,
  PaginationParams,
} from "../../repositories/base.repository";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RiskSignalStatus =
  | "ACTIVE"
  | "INVESTIGATING"
  | "RESPONDING"
  | "RESOLVED"
  | "DISMISSED";

export type RiskCommentInput = {
  commentId: string;
  text: string;
  riskLevel: RiskLevel;
  topics: string[];
  authorName: string;
  publishedAt: Date;
};

export type DetectionResult = {
  newSignals: number;
  updatedSignals: number;
  notificationsCreated: number;
  totalProcessed: number;
};

export type RiskSignal = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  riskType: string;
  severity: RiskLevel;
  sourceCommentIds: string[];
  sourceMentionIds: string[];
  sampleTexts: string[];
  signalCount: number;
  detectedAt: Date;
  firstOccurrence: Date;
  lastOccurrence: Date;
  status: RiskSignalStatus;
  assigneeId: string | null;
  responseNote: string | null;
  resolvedAt: Date | null;
  rootCauseAnalysis: string | null;
  recommendedAction: string | null;
  estimatedImpact: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RiskFilters = {
  status?: RiskSignalStatus;
  severity?: RiskLevel;
  riskType?: string;
  assigneeId?: string;
  pagination?: PaginationParams;
};

export type RiskDashboardSummary = {
  projectId: string;
  byStatus: Record<RiskSignalStatus, number>;
  bySeverity: Record<RiskLevel, number>;
  totalActive: number;
  recentActiveRisks: RiskSignal[];
};

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<RiskSignalStatus, RiskSignalStatus[]> = {
  ACTIVE: ["INVESTIGATING", "RESPONDING", "DISMISSED"],
  INVESTIGATING: ["RESPONDING", "RESOLVED", "DISMISSED", "ACTIVE"],
  RESPONDING: ["RESOLVED", "DISMISSED", "INVESTIGATING"],
  RESOLVED: ["ACTIVE"], // reopen
  DISMISSED: ["ACTIVE"], // reopen
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RiskSignalService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Detect and create risk signals from analyzed comments.
   */
  async detectRisks(
    projectId: string,
    riskComments: RiskCommentInput[],
    trace: TraceContext,
  ): Promise<ServiceResult<DetectionResult>> {
    try {
      if (riskComments.length === 0) {
        return ok({
          newSignals: 0,
          updatedSignals: 0,
          notificationsCreated: 0,
          totalProcessed: 0,
        });
      }

      // 1. Group risk comments by topic/theme
      const groupedByTopic = this.groupByPrimaryTopic(riskComments);

      // 2. Classify risk type and severity per group
      // TODO: [INTEGRATION] @x2/ai -- Call Claude Haiku to classify risk type, title, and severity
      // For now, use first topic as riskType and max severity in group

      let newSignals = 0;
      let updatedSignals = 0;
      let notificationsCreated = 0;
      const now = new Date();

      // 3. Pre-fetch all active signals once (N+1 방지)
      const activeSignals =
        await this.repositories.riskSignal.findActive(projectId);

      for (const [topic, comments] of Object.entries(groupedByTopic)) {
        const maxSeverity = this.getMaxSeverity(
          comments.map((c) => c.riskLevel),
        );

        // Check if similar active RiskSignal exists
        const existingSignal = activeSignals.find((s) => s.riskType === topic);

        if (existingSignal) {
          // Update existing signal
          const newSourceIds = Array.from(
            new Set([
              ...existingSignal.sourceCommentIds,
              ...comments.map((c) => c.commentId),
            ]),
          );

          const newSampleTexts = Array.from(
            new Set([
              ...existingSignal.sampleTexts,
              ...comments.map((c) => c.text),
            ]),
          ).slice(0, 10); // Keep max 10 sample texts

          // Update status (and escalate severity if needed)
          const newSeverity =
            this.severityRank(maxSeverity) >
            this.severityRank(existingSignal.severity as RiskLevel)
              ? maxSeverity
              : (existingSignal.severity as RiskSignalStatus);
          await this.repositories.riskSignal.updateStatus(
            existingSignal.id,
            existingSignal.status as RiskSignalStatus,
            `Updated: ${newSourceIds.length} signals, severity=${newSeverity}`,
          );
          updatedSignals++;
        } else {
          // Create new RiskSignal
          await this.repositories.riskSignal.create({
            projectId,
            title: `Risk detected: ${topic}`,
            description: `${comments.length} risk comment(s) detected related to "${topic}"`,
            riskType: topic,
            severity: maxSeverity,
            sourceCommentIds: comments.map((c) => c.commentId),
            sourceMentionIds: [],
            sampleTexts: comments.map((c) => c.text).slice(0, 10),
            signalCount: comments.length,
            detectedAt: now,
            firstOccurrence: comments.reduce(
              (earliest, c) =>
                c.publishedAt < earliest ? c.publishedAt : earliest,
              comments[0]!.publishedAt,
            ),
            lastOccurrence: now,
            status: "ACTIVE",
          });
          newSignals++;
        }

        // 4. For severity HIGH or CRITICAL: create Notification
        if (maxSeverity === "HIGH" || maxSeverity === "CRITICAL") {
          // TODO: [INTEGRATION] @x2/queue -- Queue notification dispatch
          await this.repositories.notification.create({
            type: "RISK_DETECTED",
            title: `${maxSeverity} risk: ${topic}`,
            message: `${comments.length} risk signals detected for "${topic}" in project`,
            priority: maxSeverity === "CRITICAL" ? "URGENT" : "HIGH",
            sourceType: "RiskSignal",
            sourceId: projectId,
          });
          notificationsCreated++;
        }
      }

      // 5. Log results
      this.logger.info("Risk signals detected", {
        projectId,
        newSignals,
        updatedSignals,
        notificationsCreated,
        totalProcessed: riskComments.length,
        severityDistribution: this.getSeverityDistribution(riskComments),
        requestId: trace.requestId,
      });

      return ok({
        newSignals,
        updatedSignals,
        notificationsCreated,
        totalProcessed: riskComments.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to detect risks", {
        projectId,
        count: riskComments.length,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RISK_DETECTION_FAILED");
    }
  }

  /**
   * List risk signals with filters.
   */
  async listRiskSignals(
    projectId: string,
    filters?: RiskFilters,
  ): Promise<ServiceResult<PaginatedResult<RiskSignal>>> {
    try {
      const result = await this.repositories.riskSignal.findByProject(
        projectId,
        filters?.pagination,
        filters?.status,
        filters?.severity,
      );

      return ok(result as PaginatedResult<RiskSignal>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list risk signals", {
        projectId,
        error: message,
      });
      return err(message, "RISK_LIST_FAILED");
    }
  }

  /**
   * Update risk signal status with workflow transition validation.
   */
  async updateStatus(
    id: string,
    status: RiskSignalStatus,
    note?: string,
  ): Promise<ServiceResult<RiskSignal>> {
    try {
      const signal = await this.repositories.riskSignal.findById(id);
      if (!signal) {
        return err("Risk signal not found", "RISK_SIGNAL_NOT_FOUND");
      }

      // Validate transition
      const currentStatus = signal.status as RiskSignalStatus;
      const allowed = VALID_TRANSITIONS[currentStatus];
      if (!allowed?.includes(status)) {
        return err(
          `Invalid status transition from ${currentStatus} to ${status}`,
          "INVALID_STATUS_TRANSITION",
        );
      }

      const resolvedAt = status === "RESOLVED" ? new Date() : undefined;

      const updated = await this.repositories.riskSignal.updateStatus(
        id,
        status,
        note,
        resolvedAt,
      );

      this.logger.info("Risk signal status updated", {
        riskSignalId: id,
        from: currentStatus,
        to: status,
      });

      return ok(updated as RiskSignal);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to update risk signal status", {
        riskSignalId: id,
        error: message,
      });
      return err(message, "RISK_UPDATE_FAILED");
    }
  }

  /**
   * Assign risk signal to a team member.
   */
  async assign(
    id: string,
    assigneeId: string,
  ): Promise<ServiceResult<RiskSignal>> {
    try {
      const signal = await this.repositories.riskSignal.findById(id);
      if (!signal) {
        return err("Risk signal not found", "RISK_SIGNAL_NOT_FOUND");
      }

      const updated = await this.repositories.riskSignal.assignTo(
        id,
        assigneeId,
      );

      this.logger.info("Risk signal assigned", {
        riskSignalId: id,
        assigneeId,
      });

      return ok(updated as RiskSignal);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to assign risk signal", {
        riskSignalId: id,
        error: message,
      });
      return err(message, "RISK_ASSIGN_FAILED");
    }
  }

  /**
   * Get active risks dashboard summary.
   */
  async getDashboardSummary(
    projectId: string,
  ): Promise<ServiceResult<RiskDashboardSummary>> {
    try {
      // Count by status (returns RiskStatusCount[])
      const statusCounts =
        await this.repositories.riskSignal.countByStatus(projectId);

      // Transform array to record
      const statusMap: Record<string, number> = {};
      for (const sc of statusCounts) {
        statusMap[sc.status] = sc.count;
      }

      // Count by severity using findByProject to get all signals and group manually
      const allSignals =
        await this.repositories.riskSignal.findByProject(projectId);
      const severityMap: Record<string, number> = {};
      for (const sig of allSignals.data) {
        const sev = sig.severity as string;
        severityMap[sev] = (severityMap[sev] ?? 0) + 1;
      }

      const totalActive =
        (statusMap["ACTIVE"] ?? 0) +
        (statusMap["INVESTIGATING"] ?? 0) +
        (statusMap["RESPONDING"] ?? 0);

      // Top 5 most recent active risks
      const activeRisks =
        await this.repositories.riskSignal.findActive(projectId);
      const recentActiveRisks = activeRisks.slice(0, 5);

      return ok({
        projectId,
        byStatus: {
          ACTIVE: statusMap["ACTIVE"] ?? 0,
          INVESTIGATING: statusMap["INVESTIGATING"] ?? 0,
          RESPONDING: statusMap["RESPONDING"] ?? 0,
          RESOLVED: statusMap["RESOLVED"] ?? 0,
          DISMISSED: statusMap["DISMISSED"] ?? 0,
        },
        bySeverity: {
          LOW: severityMap["LOW"] ?? 0,
          MEDIUM: severityMap["MEDIUM"] ?? 0,
          HIGH: severityMap["HIGH"] ?? 0,
          CRITICAL: severityMap["CRITICAL"] ?? 0,
        },
        totalActive,
        recentActiveRisks: recentActiveRisks as RiskSignal[],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get risk dashboard summary", {
        projectId,
        error: message,
      });
      return err(message, "RISK_DASHBOARD_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private groupByPrimaryTopic(
    comments: RiskCommentInput[],
  ): Record<string, RiskCommentInput[]> {
    const groups: Record<string, RiskCommentInput[]> = {};

    for (const comment of comments) {
      const primaryTopic = comment.topics[0] ?? "uncategorized";
      if (!groups[primaryTopic]) {
        groups[primaryTopic] = [];
      }
      groups[primaryTopic]!.push(comment);
    }

    return groups;
  }

  private getMaxSeverity(levels: RiskLevel[]): RiskLevel {
    const ranked = levels.sort(
      (a, b) => this.severityRank(b) - this.severityRank(a),
    );
    return ranked[0] ?? "LOW";
  }

  private severityRank(level: RiskLevel): number {
    const ranks: Record<RiskLevel, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      CRITICAL: 4,
    };
    return ranks[level];
  }

  private getSeverityDistribution(
    comments: RiskCommentInput[],
  ): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const c of comments) {
      dist[c.riskLevel] = (dist[c.riskLevel] ?? 0) + 1;
    }
    return dist;
  }
}
