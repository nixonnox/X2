import type { Repositories } from "../../repositories";
import type { PaginatedResult } from "../../repositories/base.repository";
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

export type InsightAction = {
  id: string;
  reportId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  sourceModule: string;
  sourceEntityId: string | null;
  outcome: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ActionFilters = {
  status?: string;
  priority?: string;
  sourceModule?: string;
  pagination?: { page?: number; pageSize?: number };
};

export type Campaign = {
  id: string;
  projectId: string;
  name: string;
  status: string;
};

export type CampaignInput = {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency?: string;
};

type SignalSource = {
  module: string;
  title: string;
  description: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  sourceEntityId: string | null;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ActionRecommendationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate action recommendations from report data.
   */
  async generateActions(
    reportId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<InsightAction[]>> {
    try {
      // 1. Fetch report with all evidence
      const report = await this.repositories.report.findById(reportId);
      if (!report) {
        return err("Report not found", "REPORT_NOT_FOUND");
      }

      const projectId = report.projectId;
      const signals: SignalSource[] = [];

      // 2. Collect signals from each engine

      // Comment sentiment trends -> COMMENT_INTELLIGENCE
      const sentimentDistribution =
        await this.repositories.comment.countBySentiment(projectId);
      const negativeCount =
        sentimentDistribution.find((s) => s.sentiment === "NEGATIVE")?.count ??
        0;
      const totalSentiment = sentimentDistribution.reduce(
        (sum, s) => sum + s.count,
        0,
      );
      if (totalSentiment > 0 && negativeCount / totalSentiment > 0.3) {
        signals.push({
          module: "COMMENT_INTELLIGENCE",
          title: "High negative sentiment detected",
          description: `${Math.round((negativeCount / totalSentiment) * 100)}% of comments are negative. Review comment themes and consider addressing concerns.`,
          priority: negativeCount / totalSentiment > 0.5 ? "CRITICAL" : "HIGH",
          sourceEntityId: null,
        });
      }

      // FAQ candidates unanswered -> FAQ_ENGINE
      const unansweredFaqs =
        await this.repositories.faqCandidate.findUnanswered(projectId);
      const topUnanswered = unansweredFaqs.slice(0, 5);
      if (topUnanswered.length > 0) {
        signals.push({
          module: "FAQ_ENGINE",
          title: `${topUnanswered.length} unanswered FAQ(s) detected`,
          description: `Top question: "${topUnanswered[0]!.question}". Create FAQ content or address in upcoming videos.`,
          priority: topUnanswered.length > 3 ? "HIGH" : "MEDIUM",
          sourceEntityId: topUnanswered[0]!.id,
        });
      }

      // Risk signals active -> RISK_ENGINE
      const activeRisks =
        await this.repositories.riskSignal.findActive(projectId);
      for (const risk of activeRisks.slice(0, 3)) {
        signals.push({
          module: "RISK_ENGINE",
          title: `Risk: ${risk.title}`,
          description:
            risk.description ??
            "Active risk signal detected — investigate and mitigate.",
          priority: risk.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
          sourceEntityId: risk.id,
        });
      }

      // Intent gaps (BLUE_OCEAN) -> SEARCH_INTENT
      const gapOpportunities =
        await this.repositories.intent.findGapOpportunities(projectId);
      if (gapOpportunities.length > 0) {
        const topGap = gapOpportunities[0]!;
        signals.push({
          module: "SEARCH_INTENT",
          title: `Blue ocean keyword opportunity: "${topGap.keyword}"`,
          description: `Gap score ${topGap.gapScore} — low competition with search volume potential. Create content targeting this keyword.`,
          priority: "MEDIUM",
          sourceEntityId: topGap.id,
        });
      }

      // AEO visibility drops -> GEO_AEO
      const aeoKeywords =
        await this.repositories.aeo.findLatestSnapshots(projectId);
      for (const kw of aeoKeywords) {
        for (const snap of kw.snapshots) {
          if (
            snap.visibilityScore != null &&
            snap.visibilityScore < 20 &&
            snap.visibilityScore > 0
          ) {
            signals.push({
              module: "GEO_AEO",
              title: `Low AEO visibility for "${kw.keyword}" on ${snap.engine}`,
              description: `Visibility score is ${snap.visibilityScore}. Optimize content for AI search engine citation.`,
              priority: "MEDIUM",
              sourceEntityId: kw.id,
            });
            break; // one signal per keyword
          }
        }
      }

      // 3. TODO: [INTEGRATION] @x2/ai — Synthesize and prioritize actions
      // Expected: aiClient.synthesizeActions(signals) -> prioritized action list
      // For now, use signals directly

      // 4. Create InsightAction records with sourceModule + sourceEntityId
      const createdActions: InsightAction[] = [];
      const priorityDistribution: Record<string, number> = {};

      for (const signal of signals) {
        const action = await this.repositories.insightAction.create({
          title: signal.title,
          description: signal.description,
          priority: signal.priority as any,
          status: "PENDING",
          sourceModule: signal.module as any,
          sourceEntityId: signal.sourceEntityId,
          report: { connect: { id: reportId } },
        });

        createdActions.push(action as unknown as InsightAction);
        priorityDistribution[signal.priority] =
          (priorityDistribution[signal.priority] ?? 0) + 1;
      }

      // 5. Log
      this.logger.info("Actions generated", {
        reportId,
        actionCount: createdActions.length,
        priorityDistribution,
        requestId: trace.requestId,
      });

      return ok(createdActions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate actions", {
        reportId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ACTION_GENERATION_FAILED");
    }
  }

  /**
   * List actions for project with filters.
   */
  async listActions(
    projectId: string,
    filters?: ActionFilters,
  ): Promise<ServiceResult<PaginatedResult<InsightAction>>> {
    try {
      const result = await this.repositories.insightAction.findByProject(
        projectId,
        filters?.pagination,
        filters?.status as any,
        filters?.priority as any,
      );

      return ok(result as unknown as PaginatedResult<InsightAction>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list actions", {
        projectId,
        error: message,
      });
      return err(message, "ACTION_LIST_FAILED");
    }
  }

  /**
   * Update action status (PENDING -> IN_PROGRESS -> COMPLETED | DISMISSED).
   */
  async updateActionStatus(
    actionId: string,
    status: string,
    outcome?: string,
  ): Promise<ServiceResult<InsightAction>> {
    try {
      const action = await this.repositories.insightAction.findById(actionId);
      if (!action) {
        return err("Action not found", "ACTION_NOT_FOUND");
      }

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        PENDING: ["IN_PROGRESS", "DISMISSED"],
        IN_PROGRESS: ["COMPLETED", "DISMISSED", "PENDING"],
        COMPLETED: ["PENDING"], // reopen
        DISMISSED: ["PENDING"], // reopen
      };

      const allowed = validTransitions[action.status] ?? [];
      if (!allowed.includes(status)) {
        return err(
          `Invalid status transition from ${action.status} to ${status}`,
          "INVALID_STATUS_TRANSITION",
        );
      }

      const updated = await this.repositories.insightAction.updateStatus(
        actionId,
        status as any,
        outcome,
      );

      this.logger.info("Action status updated", {
        actionId,
        from: action.status,
        to: status,
      });

      return ok(updated as unknown as InsightAction);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to update action status", {
        actionId,
        error: message,
      });
      return err(message, "ACTION_UPDATE_FAILED");
    }
  }

  /**
   * Convert action to campaign.
   */
  async convertToCampaign(
    actionId: string,
    campaignData: CampaignInput,
  ): Promise<ServiceResult<Campaign>> {
    try {
      const action = await this.repositories.insightAction.findById(actionId);
      if (!action) {
        return err("Action not found", "ACTION_NOT_FOUND");
      }

      // Get the project ID from the report
      const report = (action as any).report;
      if (!report) {
        return err("Cannot determine project from action", "ACTION_NO_PROJECT");
      }

      // TODO: [CROSS-SERVICE] CampaignService.create
      // For now, create the campaign directly
      const campaign = await this.repositories.campaign.create({
        name: campaignData.name,
        objective: campaignData.description ?? action.description ?? null,
        campaignType: "BRAND_AWARENESS" as any,
        startDate: campaignData.startDate ?? null,
        endDate: campaignData.endDate ?? null,
        totalBudget: campaignData.budget ?? null,
        currency: campaignData.currency ?? "USD",
        status: "DRAFT",
        project: { connect: { id: report.id } },
      });

      // Mark action as completed
      await this.repositories.insightAction.updateStatus(
        actionId,
        "COMPLETED" as any,
        `Converted to campaign: ${campaign.id}`,
      );

      this.logger.info("Action converted to campaign", {
        actionId,
        campaignId: campaign.id,
      });

      return ok(campaign as unknown as Campaign);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to convert action to campaign", {
        actionId,
        error: message,
      });
      return err(message, "ACTION_CONVERT_FAILED");
    }
  }
}
