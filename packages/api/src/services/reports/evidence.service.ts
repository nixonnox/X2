import type { Repositories } from "../../repositories";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EvidenceAsset = {
  id: string;
  sectionId: string;
  dataSourceType: string;
  dataEntityIds: string[];
  displayType: string;
  label: string | null;
  order: number;
};

export type EvidenceInput = {
  dataSourceType: string;
  dataEntityIds: string[];
  displayType: string;
  label?: string;
  order?: number;
};

export type ResolvedEvidence = {
  asset: EvidenceAsset;
  dataSourceType: string;
  data: unknown[];
  visualizationHint: string;
};

export type InsightReport = {
  id: string;
  title: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class EvidenceService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Resolve evidence asset to actual data.
   */
  async resolveEvidence(
    asset: EvidenceAsset,
  ): Promise<ServiceResult<ResolvedEvidence>> {
    try {
      const entityIds = asset.dataEntityIds;
      let data: unknown[] = [];
      let visualizationHint = "table";

      switch (asset.dataSourceType) {
        case "CHANNEL_SNAPSHOT": {
          // Fetch ChannelSnapshot by IDs
          const results = [];
          for (const id of entityIds) {
            const channel = await this.repositories.channel.findById(id);
            if (channel) {
              const snapshots =
                await this.repositories.channel.findSnapshots(id);
              results.push(...snapshots);
            }
          }
          data = results;
          visualizationHint = "line_chart";
          break;
        }

        case "CONTENT_METRIC": {
          // Fetch ContentMetricDaily by content IDs
          const results = [];
          for (const id of entityIds) {
            const metrics = await this.repositories.content.findMetrics(id);
            results.push(...metrics);
          }
          data = results;
          visualizationHint = "bar_chart";
          break;
        }

        case "COMMENT_ANALYSIS": {
          // Fetch CommentAnalysis by comment IDs
          const results = [];
          for (const id of entityIds) {
            const comment = await this.repositories.comment.findById(id);
            if (comment) {
              results.push(comment);
            }
          }
          data = results;
          visualizationHint = "table";
          break;
        }

        case "INTENT_RESULT": {
          // Fetch IntentKeywordResult by query IDs
          const results = [];
          for (const id of entityIds) {
            const query = await this.repositories.intent.findQueryById(id);
            if (query) {
              results.push(query);
            }
          }
          data = results;
          visualizationHint = "scatter_chart";
          break;
        }

        case "AEO_SNAPSHOT": {
          // Fetch AeoSnapshot by keyword IDs
          const results = [];
          for (const id of entityIds) {
            const snapshots = await this.repositories.aeo.findSnapshots(id);
            results.push(...snapshots);
          }
          data = results;
          visualizationHint = "line_chart";
          break;
        }

        case "CAMPAIGN_METRIC": {
          // Fetch campaign with metrics by ID
          const results = [];
          for (const id of entityIds) {
            const campaign = await this.repositories.campaign.findById(id);
            if (campaign) {
              results.push(campaign);
            }
          }
          data = results;
          visualizationHint = "bar_chart";
          break;
        }

        case "KEYWORD_METRIC": {
          // Fetch KeywordMetricDaily by keyword IDs
          const results = [];
          for (const id of entityIds) {
            const metrics = await this.repositories.keyword.findMetrics(id);
            results.push(...metrics);
          }
          data = results;
          visualizationHint = "line_chart";
          break;
        }

        case "RAW_MENTION": {
          // Fetch RawSocialMention by IDs
          const results = [];
          for (const id of entityIds) {
            const mention = await this.repositories.mention.findById(id);
            if (mention) {
              results.push(mention);
            }
          }
          data = results;
          visualizationHint = "table";
          break;
        }

        case "FAQ_CANDIDATE": {
          // Fetch FAQCandidate by IDs
          const results = [];
          for (const id of entityIds) {
            const faq = await this.repositories.faqCandidate.findById(id);
            if (faq) {
              results.push(faq);
            }
          }
          data = results;
          visualizationHint = "table";
          break;
        }

        case "RISK_SIGNAL": {
          // Fetch RiskSignal by IDs
          const results = [];
          for (const id of entityIds) {
            const signal = await this.repositories.riskSignal.findById(id);
            if (signal) {
              results.push(signal);
            }
          }
          data = results;
          visualizationHint = "table";
          break;
        }

        default:
          return err(
            `Unknown data source type: ${asset.dataSourceType}`,
            "UNKNOWN_DATA_SOURCE",
          );
      }

      return ok({
        asset,
        dataSourceType: asset.dataSourceType,
        data,
        visualizationHint,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to resolve evidence", {
        assetId: asset.id,
        dataSourceType: asset.dataSourceType,
        error: message,
      });
      return err(message, "EVIDENCE_RESOLVE_FAILED");
    }
  }

  /**
   * Create evidence asset for a report section.
   */
  async addEvidence(
    sectionId: string,
    input: EvidenceInput,
  ): Promise<ServiceResult<EvidenceAsset>> {
    try {
      if (!input.dataSourceType || input.dataEntityIds.length === 0) {
        return err(
          "dataSourceType and at least one dataEntityId are required",
          "INVALID_INPUT",
        );
      }

      // Validate that referenced entities exist (spot check first ID)
      const firstId = input.dataEntityIds[0];
      if (firstId) {
        const exists = await this.verifyEntityExists(
          input.dataSourceType,
          firstId,
        );
        if (!exists) {
          return err(
            `Referenced entity ${firstId} of type ${input.dataSourceType} not found`,
            "ENTITY_NOT_FOUND",
          );
        }
      }

      // Create EvidenceAsset record
      const asset = await this.repositories.evidenceAsset.create(sectionId, {
        dataSourceType: input.dataSourceType as any,
        dataEntityIds: input.dataEntityIds,
        displayType: input.displayType,
        label: input.label ?? null,
        order: input.order ?? 0,
      });

      this.logger.info("Evidence asset added", {
        sectionId,
        assetId: asset.id,
        dataSourceType: input.dataSourceType,
        entityCount: input.dataEntityIds.length,
      });

      return ok(asset as unknown as EvidenceAsset);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to add evidence", {
        sectionId,
        error: message,
      });
      return err(message, "EVIDENCE_ADD_FAILED");
    }
  }

  /**
   * Find which reports reference a specific data entity.
   */
  async findReportsUsingData(
    dataSourceType: string,
    entityId: string,
  ): Promise<ServiceResult<InsightReport[]>> {
    try {
      const assets = await this.repositories.evidenceAsset.findByDataSource(
        dataSourceType as any,
        entityId,
      );

      // Extract unique reports from the evidence assets
      const reportMap = new Map<string, InsightReport>();
      for (const asset of assets) {
        const section = (asset as any).section;
        if (section?.report) {
          const report = section.report;
          if (!reportMap.has(report.id)) {
            reportMap.set(report.id, {
              id: report.id,
              title: report.title,
              status: report.status,
            });
          }
        }
      }

      return ok(Array.from(reportMap.values()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to find reports using data", {
        dataSourceType,
        entityId,
        error: message,
      });
      return err(message, "REPORTS_LOOKUP_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async verifyEntityExists(
    dataSourceType: string,
    entityId: string,
  ): Promise<boolean> {
    try {
      switch (dataSourceType) {
        case "CHANNEL_SNAPSHOT":
          return !!(await this.repositories.channel.findById(entityId));
        case "CONTENT_METRIC":
          return !!(await this.repositories.content.findById(entityId));
        case "COMMENT_ANALYSIS":
          return !!(await this.repositories.comment.findById(entityId));
        case "INTENT_RESULT":
          return !!(await this.repositories.intent.findQueryById(entityId));
        case "AEO_SNAPSHOT":
          return !!(await this.repositories.aeo.findKeywordById(entityId));
        case "CAMPAIGN_METRIC":
          return !!(await this.repositories.campaign.findById(entityId));
        case "KEYWORD_METRIC":
          return !!(await this.repositories.keyword.findById(entityId));
        case "RAW_MENTION":
          return !!(await this.repositories.mention.findById(entityId));
        case "FAQ_CANDIDATE":
          return !!(await this.repositories.faqCandidate.findById(entityId));
        case "RISK_SIGNAL":
          return !!(await this.repositories.riskSignal.findById(entityId));
        default:
          return false;
      }
    } catch {
      return false;
    }
  }
}
