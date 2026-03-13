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

export type CitationSourceInput = {
  sourceUrl: string;
  title: string;
  sourceType: string;
  primaryTopic?: string;
  targetKeywords?: string[];
  geoOptimized?: boolean;
};

export type CitationReadyReportSource = {
  id: string;
  projectId: string;
  sourceUrl: string;
  title: string;
  sourceType: string;
  primaryTopic: string | null;
  targetKeywords: string[];
  geoOptimized: boolean;
  isActive: boolean;
  currentCitationCount: number;
  lastCitedDate: Date | null;
  lastCitedEngine: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SyncResult = {
  totalSources: number;
  updatedCount: number;
  newlyCited: number;
  newlyUncited: number;
};

export type CitationHealthReport = {
  totalSources: number;
  citedCount: number;
  uncitedCount: number;
  citationRate: number;
  mostCitedSources: {
    sourceUrl: string;
    title: string;
    citationCount: number;
    lastCitedEngine: string | null;
  }[];
  needsOptimization: {
    sourceUrl: string;
    title: string;
    reason: string;
  }[];
};

export type CitationSourceFilters = {
  sourceType?: string;
  isActive?: boolean;
  geoOptimized?: boolean;
  primaryTopic?: string;
  pagination?: { page?: number; pageSize?: number };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CitationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Register a citation-ready source.
   */
  async registerSource(
    projectId: string,
    input: CitationSourceInput,
  ): Promise<ServiceResult<CitationReadyReportSource>> {
    try {
      if (!input.sourceUrl || !input.title) {
        return err("sourceUrl and title are required", "INVALID_INPUT");
      }

      const source = await this.repositories.citationSource.create({
        sourceUrl: input.sourceUrl,
        title: input.title,
        sourceType: input.sourceType as any,
        primaryTopic: input.primaryTopic ?? null,
        targetKeywords: input.targetKeywords ?? [],
        geoOptimized: input.geoOptimized ?? false,
        isActive: true,
        currentCitationCount: 0,
        project: { connect: { id: projectId } },
      });

      this.logger.info("Citation source registered", {
        projectId,
        sourceId: source.id,
        sourceUrl: input.sourceUrl,
      });

      return ok(source as unknown as CitationReadyReportSource);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to register citation source", {
        projectId,
        error: message,
      });
      return err(message, "CITATION_REGISTER_FAILED");
    }
  }

  /**
   * Update source citation metrics (called after AEO snapshot collection).
   */
  async syncCitationMetrics(
    projectId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<SyncResult>> {
    try {
      // 1. Get all CitationReadyReportSources for project
      const sources = await this.repositories.citationSource.findByProject(
        projectId,
        { isActive: true },
      );

      if (sources.length === 0) {
        return ok({
          totalSources: 0,
          updatedCount: 0,
          newlyCited: 0,
          newlyUncited: 0,
        });
      }

      // 2. Get latest AeoSnapshots
      const keywordsWithSnapshots =
        await this.repositories.aeo.findLatestSnapshots(projectId);

      // Build a set of all currently cited URLs
      const citedUrlMap = new Map<
        string,
        { count: number; engine: string; date: Date }
      >();

      for (const kw of keywordsWithSnapshots) {
        for (const snap of kw.snapshots) {
          const cited = (snap.citedSources as string[]) ?? [];
          for (const url of cited) {
            const existing = citedUrlMap.get(url);
            const newCount = (existing?.count ?? 0) + 1;
            citedUrlMap.set(url, {
              count: newCount,
              engine: snap.engine,
              date: snap.date,
            });
          }
        }
      }

      // 3. For each source URL, check if cited in any snapshot
      let updatedCount = 0;
      let newlyCited = 0;
      let newlyUncited = 0;

      for (const source of sources) {
        const citationInfo = citedUrlMap.get(source.sourceUrl);
        const previousCount = source.currentCitationCount;

        if (citationInfo) {
          // 4. Update currentCitationCount, lastCitedDate, lastCitedEngine
          await this.repositories.citationSource.updateCitationCount(
            source.id,
            citationInfo.count,
            citationInfo.date,
            citationInfo.engine as any,
          );
          updatedCount++;

          if (previousCount === 0) {
            newlyCited++;
          }
        } else if (previousCount > 0) {
          // Source was cited before but no longer appears
          await this.repositories.citationSource.update(source.id, {
            currentCitationCount: 0,
          });
          updatedCount++;
          newlyUncited++;
        }
      }

      // 5. Log
      this.logger.info("Citation metrics synced", {
        projectId,
        totalSources: sources.length,
        updatedCount,
        newlyCited,
        newlyUncited,
        requestId: trace.requestId,
      });

      return ok({
        totalSources: sources.length,
        updatedCount,
        newlyCited,
        newlyUncited,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to sync citation metrics", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "CITATION_SYNC_FAILED");
    }
  }

  /**
   * Get citation health report.
   */
  async getCitationHealth(
    projectId: string,
  ): Promise<ServiceResult<CitationHealthReport>> {
    try {
      // Get all active sources
      const allSources = await this.repositories.citationSource.findByProject(
        projectId,
        { isActive: true },
      );

      if (allSources.length === 0) {
        return ok({
          totalSources: 0,
          citedCount: 0,
          uncitedCount: 0,
          citationRate: 0,
          mostCitedSources: [],
          needsOptimization: [],
        });
      }

      // Cited vs uncited sources
      const citedSources = allSources.filter((s) => s.currentCitationCount > 0);
      const uncitedSources = allSources.filter(
        (s) => s.currentCitationCount === 0,
      );
      const citationRate =
        allSources.length > 0
          ? (citedSources.length / allSources.length) * 100
          : 0;

      // Most cited sources (top 10)
      const mostCitedSources = citedSources
        .sort((a, b) => b.currentCitationCount - a.currentCitationCount)
        .slice(0, 10)
        .map((s) => ({
          sourceUrl: s.sourceUrl,
          title: s.title,
          citationCount: s.currentCitationCount,
          lastCitedEngine: s.lastCitedEngine,
        }));

      // Sources needing optimization (geoOptimized=false, or uncited with high-value keywords)
      const needsOptimization: CitationHealthReport["needsOptimization"] = [];

      for (const source of allSources) {
        if (!source.geoOptimized) {
          needsOptimization.push({
            sourceUrl: source.sourceUrl,
            title: source.title,
            reason:
              "Not GEO-optimized — add structured data, citations, and entity markup",
          });
        } else if (source.currentCitationCount === 0) {
          needsOptimization.push({
            sourceUrl: source.sourceUrl,
            title: source.title,
            reason:
              "GEO-optimized but not yet cited — review content freshness and authority signals",
          });
        }
      }

      return ok({
        totalSources: allSources.length,
        citedCount: citedSources.length,
        uncitedCount: uncitedSources.length,
        citationRate: Math.round(citationRate * 100) / 100,
        mostCitedSources,
        needsOptimization: needsOptimization.slice(0, 20),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get citation health", {
        projectId,
        error: message,
      });
      return err(message, "CITATION_HEALTH_FAILED");
    }
  }

  /**
   * List sources with filters.
   */
  async listSources(
    projectId: string,
    filters?: CitationSourceFilters,
  ): Promise<ServiceResult<PaginatedResult<CitationReadyReportSource>>> {
    try {
      const sources = await this.repositories.citationSource.findByProject(
        projectId,
        {
          sourceType: filters?.sourceType as any,
          isActive: filters?.isActive,
          geoOptimized: filters?.geoOptimized,
          primaryTopic: filters?.primaryTopic,
        },
      );

      // Manual pagination since repository returns all
      const page = filters?.pagination?.page ?? 1;
      const pageSize = filters?.pagination?.pageSize ?? 20;
      const start = (page - 1) * pageSize;
      const paginatedData = sources.slice(start, start + pageSize);

      const result: PaginatedResult<CitationReadyReportSource> = {
        data: paginatedData as unknown as CitationReadyReportSource[],
        total: sources.length,
        page,
        pageSize,
        totalPages: Math.ceil(sources.length / pageSize),
      };

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list citation sources", {
        projectId,
        error: message,
      });
      return err(message, "CITATION_LIST_FAILED");
    }
  }
}
