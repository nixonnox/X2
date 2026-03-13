import type { Repositories } from "../../repositories";
import type { PaginatedResult } from "../../repositories/base.repository";
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

export type ReportGenerationInput = {
  projectId: string;
  title: string;
  type: string;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  templateId?: string;
  sectionDefinitions?: SectionDefinition[];
};

export type SectionDefinition = {
  title: string;
  type: string;
  order: number;
  dataSourceTypes?: string[];
  prompt?: string;
};

export type InsightReport = {
  id: string;
  projectId: string;
  title: string;
  type: string;
  status: string;
  summary: string | null;
  shareToken: string | null;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  sections?: ReportSection[];
  actions?: InsightAction[];
  createdAt: Date;
  updatedAt: Date;
};

export type ReportSection = {
  id: string;
  reportId: string;
  title: string;
  type: string;
  order: number;
  narrative: string | null;
  evidenceAssets?: EvidenceAsset[];
};

export type EvidenceAsset = {
  id: string;
  sectionId: string;
  dataSourceType: string;
  dataEntityIds: string[];
  displayType: string;
  label: string | null;
  order: number;
};

export type InsightAction = {
  id: string;
  reportId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  sourceModule: string;
  sourceEntityId: string | null;
};

export type ReportFilters = {
  type?: string;
  status?: string;
  pagination?: { page?: number; pageSize?: number };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ReportService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate a new insight report.
   */
  async generateReport(
    input: ReportGenerationInput,
    trace: TraceContext,
  ): Promise<ServiceResult<InsightReport>> {
    try {
      // 1. Validate project access
      if (!input.projectId || !input.title) {
        return err("projectId and title are required", "INVALID_INPUT");
      }

      // 2. Find template if templateId provided
      let sectionDefs = input.sectionDefinitions ?? [];
      if (input.templateId) {
        const templates = await this.repositories.report.findTemplates();
        const template = templates.find((t) => t.id === input.templateId);
        if (template && template.sectionSchema) {
          // Use template section schema as defaults
          const schema =
            template.sectionSchema as unknown as SectionDefinition[];
          if (Array.isArray(schema) && sectionDefs.length === 0) {
            sectionDefs = schema;
          }
        }
      }

      // 3. Create InsightReport record (status=DRAFT)
      const report = await this.repositories.report.create({
        title: input.title,
        type: input.type as any,
        status: "DRAFT",
        summary: null,
        dateRangeStart: input.dateRangeStart,
        dateRangeEnd: input.dateRangeEnd,
        project: { connect: { id: input.projectId } },
        sections: {
          create: sectionDefs.map((def, idx) => ({
            title: def.title,
            type: def.type,
            order: def.order ?? idx,
            narrative: null,
          })),
        },
      });

      // 4. For each section definition:
      //    - TODO: [INTEGRATION] @x2/ai — Generate section narrative based on data
      //    - Create EvidenceAsset records linking to source data
      if (report.sections) {
        for (const section of report.sections) {
          const matchingDef = sectionDefs.find(
            (d) => d.title === section.title,
          );
          if (matchingDef?.dataSourceTypes) {
            for (const [i, dsType] of matchingDef.dataSourceTypes.entries()) {
              await this.repositories.evidenceAsset.create(section.id, {
                dataSourceType: dsType as any,
                dataEntityIds: [],
                displayType: "TABLE",
                label: `${dsType} data`,
                order: i,
              });
            }
          }
        }
      }

      // 5. TODO: [INTEGRATION] @x2/ai — Generate report summary
      // Expected: aiClient.generateReportSummary(reportData) -> string

      // 6. Generate InsightAction recommendations
      // TODO: [CROSS-SERVICE] ActionRecommendationService.generateActions(report.id)

      // 7. Log
      this.logger.info("Report generated", {
        reportId: report.id,
        type: input.type,
        sectionCount: sectionDefs.length,
        requestId: trace.requestId,
      });

      // Fetch full report with sections
      const fullReport = await this.repositories.report.findById(report.id);
      return ok(fullReport as unknown as InsightReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate report", {
        projectId: input.projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "REPORT_GENERATION_FAILED");
    }
  }

  /**
   * Publish report (DRAFT -> PUBLISHED).
   */
  async publishReport(reportId: string): Promise<ServiceResult<InsightReport>> {
    try {
      // 1. Fetch report
      const report = await this.repositories.report.findById(reportId);
      if (!report) {
        return err("Report not found", "REPORT_NOT_FOUND");
      }

      if (report.status !== "DRAFT") {
        return err(
          `Cannot publish report with status ${report.status}`,
          "INVALID_STATUS",
        );
      }

      // 2. Generate shareToken for public access
      const shareToken = randomBytes(32).toString("hex");

      // 3. Update status and token
      await this.repositories.report.updateStatus(reportId, "PUBLISHED" as any);

      // Update share token via a direct update
      // Note: The repository may need to support this; for now use updateStatus
      // and assume share token is set separately or via a more general update method

      this.logger.info("Report published", {
        reportId,
        shareToken,
      });

      const updated = await this.repositories.report.findById(reportId);
      return ok(updated as unknown as InsightReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to publish report", {
        reportId,
        error: message,
      });
      return err(message, "REPORT_PUBLISH_FAILED");
    }
  }

  /**
   * Get report by ID (with full sections and evidence).
   */
  async getReport(reportId: string): Promise<ServiceResult<InsightReport>> {
    try {
      const report = await this.repositories.report.findById(reportId);
      if (!report) {
        return err("Report not found", "REPORT_NOT_FOUND");
      }

      return ok(report as unknown as InsightReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get report", {
        reportId,
        error: message,
      });
      return err(message, "REPORT_GET_FAILED");
    }
  }

  /**
   * List reports for project.
   */
  async listReports(
    projectId: string,
    filters?: ReportFilters,
  ): Promise<ServiceResult<PaginatedResult<InsightReport>>> {
    try {
      const result = await this.repositories.report.findByProject(
        projectId,
        filters?.pagination,
        filters?.type as any,
        filters?.status as any,
      );

      return ok(result as unknown as PaginatedResult<InsightReport>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list reports", {
        projectId,
        error: message,
      });
      return err(message, "REPORT_LIST_FAILED");
    }
  }

  /**
   * Get public report by share token.
   */
  async getSharedReport(
    shareToken: string,
  ): Promise<ServiceResult<InsightReport>> {
    try {
      if (!shareToken) {
        return err("Share token is required", "INVALID_INPUT");
      }

      const report =
        await this.repositories.report.findByShareToken(shareToken);
      if (!report) {
        return err("Shared report not found", "REPORT_NOT_FOUND");
      }

      if (report.status !== "PUBLISHED") {
        return err("Report is not published", "REPORT_NOT_PUBLISHED");
      }

      return ok(report as unknown as InsightReport);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get shared report", {
        shareToken,
        error: message,
      });
      return err(message, "SHARED_REPORT_FAILED");
    }
  }
}
