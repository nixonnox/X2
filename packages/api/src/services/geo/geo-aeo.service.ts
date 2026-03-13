import type { Repositories } from "../../repositories";
import type { DateRange } from "../../repositories/base.repository";
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

export type AeoKeywordInput = {
  keyword: string;
  targetEngines: AeoEngine[];
  locale?: string;
  category?: string;
};

export type AeoEngine =
  | "PERPLEXITY"
  | "GOOGLE_AI_OVERVIEW"
  | "BING_COPILOT"
  | "CLAUDE";

export type AeoKeyword = {
  id: string;
  projectId: string;
  keyword: string;
  targetEngines: string[];
  locale: string | null;
  category: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionResult = {
  keywordCount: number;
  engineCount: number;
  snapshotsCreated: number;
  citationSourcesUpdated: number;
};

export type VisibilityDashboard = {
  overall: {
    averageVisibility: number;
    keywordsTracked: number;
    enginesTracked: number;
  };
  byKeyword: VisibilityByKeyword[];
  risingKeywords: string[];
  decliningKeywords: string[];
  competitorMentions: CompetitorMention[];
};

export type VisibilityByKeyword = {
  keyword: string;
  engines: {
    engine: string;
    currentScore: number;
    previousScore: number;
    trend: "RISING" | "STABLE" | "DECLINING";
  }[];
  averageScore: number;
};

export type CompetitorMention = {
  domain: string;
  mentionCount: number;
  keywords: string[];
};

export type CitationGap = {
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  primaryTopic: string | null;
  competingUrls: string[];
  missedKeywords: string[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GeoAeoService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Register AEO keywords for tracking.
   */
  async registerKeywords(
    projectId: string,
    keywords: AeoKeywordInput[],
  ): Promise<ServiceResult<AeoKeyword[]>> {
    try {
      if (keywords.length === 0) {
        return err("At least one keyword is required", "INVALID_INPUT");
      }

      const created: AeoKeyword[] = [];

      for (const input of keywords) {
        const keyword = await this.repositories.aeo.createKeyword({
          keyword: input.keyword,
          targetEngines: input.targetEngines,
          locale: input.locale ?? null,
          category: input.category ?? null,
          status: "ACTIVE",
          project: { connect: { id: projectId } },
        });

        created.push({
          id: keyword.id,
          projectId,
          keyword: keyword.keyword,
          targetEngines: keyword.targetEngines,
          locale: keyword.locale,
          category: keyword.category,
          status: keyword.status,
          createdAt: keyword.createdAt,
          updatedAt: keyword.updatedAt,
        });
      }

      this.logger.info("AEO keywords registered", {
        projectId,
        keywordCount: created.length,
      });

      return ok(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to register AEO keywords", {
        projectId,
        error: message,
      });
      return err(message, "AEO_REGISTER_FAILED");
    }
  }

  /**
   * Collect AEO snapshots for project keywords (called by scheduler).
   */
  async collectSnapshots(
    projectId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<CollectionResult>> {
    try {
      // 1. Get active AEO keywords
      const keywords = await this.repositories.aeo.findKeywordsByProject(
        projectId,
        "ACTIVE",
      );

      if (keywords.length === 0) {
        return ok({
          keywordCount: 0,
          engineCount: 0,
          snapshotsCreated: 0,
          citationSourcesUpdated: 0,
        });
      }

      let snapshotsCreated = 0;
      let citationSourcesUpdated = 0;
      const enginesUsed = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. For each keyword x engine combination
      for (const kw of keywords) {
        const engines = (kw.targetEngines ?? []) as string[];

        for (const engine of engines) {
          enginesUsed.add(engine);

          // TODO: [INTEGRATION] Call AI search engine API (Perplexity, Google AI Overview, etc.)
          // Expected: searchEngine.query(kw.keyword, engine) -> { visibilityScore, citedSources, brandMentioned, ... }
          // For now, create a placeholder snapshot

          const visibilityScore = 0;
          const citedSources: string[] = [];
          const brandMentioned = false;

          // Upsert AeoSnapshot
          await this.repositories.aeo.upsertSnapshot(
            kw.id,
            today,
            engine as any,
            {
              visibilityScore,
              citedSources,
              brandMentioned,
              rawResponse: null,
            },
          );
          snapshotsCreated++;

          // 3. Update CitationReadyReportSource.currentCitationCount if URL matches
          if (citedSources.length > 0) {
            const allSources =
              await this.repositories.citationSource.findByProject(projectId, {
                isActive: true,
              });

            for (const source of allSources) {
              const isCited = citedSources.some(
                (url) => url === source.sourceUrl,
              );
              if (isCited) {
                await this.repositories.citationSource.updateCitationCount(
                  source.id,
                  source.currentCitationCount + 1,
                  today,
                  engine as any,
                );
                citationSourcesUpdated++;
              }
            }
          }
        }
      }

      // 4. Log
      this.logger.info("AEO snapshots collected", {
        projectId,
        keywordCount: keywords.length,
        engineCount: enginesUsed.size,
        snapshotsCreated,
        citationSourcesUpdated,
        requestId: trace.requestId,
      });

      return ok({
        keywordCount: keywords.length,
        engineCount: enginesUsed.size,
        snapshotsCreated,
        citationSourcesUpdated,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to collect AEO snapshots", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "AEO_COLLECTION_FAILED");
    }
  }

  /**
   * Get visibility dashboard for project.
   */
  async getVisibilityDashboard(
    projectId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<VisibilityDashboard>> {
    try {
      // 1. Get all active keywords with their snapshots
      const keywordsWithSnapshots =
        await this.repositories.aeo.findLatestSnapshots(projectId);

      if (keywordsWithSnapshots.length === 0) {
        return ok({
          overall: {
            averageVisibility: 0,
            keywordsTracked: 0,
            enginesTracked: 0,
          },
          byKeyword: [],
          risingKeywords: [],
          decliningKeywords: [],
          competitorMentions: [],
        });
      }

      // 2. Aggregate visibility per keyword per engine
      const allEngines = new Set<string>();
      const byKeyword: VisibilityByKeyword[] = [];
      const risingKeywords: string[] = [];
      const decliningKeywords: string[] = [];
      const competitorDomains = new Map<
        string,
        { count: number; keywords: Set<string> }
      >();

      for (const kw of keywordsWithSnapshots) {
        const engines: VisibilityByKeyword["engines"] = [];

        // Fetch full date range snapshots for trend comparison
        const allSnapshots = await this.repositories.aeo.findSnapshots(
          kw.id,
          dateRange,
        );

        // Group by engine
        const engineMap = new Map<string, typeof allSnapshots>();
        for (const snap of allSnapshots) {
          const engineSnaps = engineMap.get(snap.engine) ?? [];
          engineSnaps.push(snap);
          engineMap.set(snap.engine, engineSnaps);
        }

        let totalScore = 0;
        let scoreCount = 0;

        for (const [engine, snaps] of engineMap) {
          allEngines.add(engine);

          const currentScore =
            snaps.length > 0 ? snaps[snaps.length - 1]!.visibilityScore : 0;
          const mid = Math.floor(snaps.length / 2);
          const previousScore =
            mid > 0 ? snaps[mid - 1]!.visibilityScore : currentScore;

          const diff = currentScore - previousScore;
          const trend: "RISING" | "STABLE" | "DECLINING" =
            diff > 5 ? "RISING" : diff < -5 ? "DECLINING" : "STABLE";

          engines.push({ engine, currentScore, previousScore, trend });
          totalScore += currentScore;
          scoreCount++;

          // Collect competitor mentions from cited sources
          for (const snap of snaps) {
            const cited = (snap.citedSources as string[]) ?? [];
            for (const url of cited) {
              try {
                const domain = new URL(url).hostname;
                const existing = competitorDomains.get(domain) ?? {
                  count: 0,
                  keywords: new Set<string>(),
                };
                existing.count++;
                existing.keywords.add(kw.keyword);
                competitorDomains.set(domain, existing);
              } catch {
                // skip invalid URLs
              }
            }
          }
        }

        const averageScore = scoreCount > 0 ? totalScore / scoreCount : 0;
        byKeyword.push({
          keyword: kw.keyword,
          engines,
          averageScore: Math.round(averageScore * 100) / 100,
        });

        // Identify rising / declining
        const hasRising = engines.some((e) => e.trend === "RISING");
        const hasDeclining = engines.some((e) => e.trend === "DECLINING");
        if (hasRising && !hasDeclining) risingKeywords.push(kw.keyword);
        if (hasDeclining && !hasRising) decliningKeywords.push(kw.keyword);
      }

      // Overall average
      const overallAvg =
        byKeyword.length > 0
          ? byKeyword.reduce((sum, k) => sum + k.averageScore, 0) /
            byKeyword.length
          : 0;

      // Build competitor mentions
      const competitorMentions: CompetitorMention[] = Array.from(
        competitorDomains.entries(),
      )
        .map(([domain, data]) => ({
          domain,
          mentionCount: data.count,
          keywords: Array.from(data.keywords),
        }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 20);

      return ok({
        overall: {
          averageVisibility: Math.round(overallAvg * 100) / 100,
          keywordsTracked: keywordsWithSnapshots.length,
          enginesTracked: allEngines.size,
        },
        byKeyword,
        risingKeywords,
        decliningKeywords,
        competitorMentions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get visibility dashboard", {
        projectId,
        error: message,
      });
      return err(message, "VISIBILITY_DASHBOARD_FAILED");
    }
  }

  /**
   * Get citation gaps (our sources not being cited).
   */
  async getCitationGaps(
    projectId: string,
  ): Promise<ServiceResult<CitationGap[]>> {
    try {
      // 1. Find CitationReadyReportSource with currentCitationCount = 0
      const allSources = await this.repositories.citationSource.findByProject(
        projectId,
        {
          isActive: true,
        },
      );
      const uncitedSources = allSources.filter(
        (s) => s.currentCitationCount === 0,
      );

      if (uncitedSources.length === 0) {
        return ok([]);
      }

      // 2. Get latest snapshots to find competing URLs
      const keywordsWithSnapshots =
        await this.repositories.aeo.findLatestSnapshots(projectId);

      const gaps: CitationGap[] = [];

      for (const source of uncitedSources) {
        const competingUrls = new Set<string>();
        const missedKeywords = new Set<string>();

        // Match against AeoSnapshot.citedSources to find competing URLs
        for (const kw of keywordsWithSnapshots) {
          const topicMatches =
            source.primaryTopic &&
            kw.keyword
              .toLowerCase()
              .includes(source.primaryTopic.toLowerCase());

          if (topicMatches) {
            missedKeywords.add(kw.keyword);

            for (const snap of kw.snapshots) {
              const cited = (snap.citedSources as string[]) ?? [];
              for (const url of cited) {
                if (url !== source.sourceUrl) {
                  competingUrls.add(url);
                }
              }
            }
          }
        }

        gaps.push({
          sourceId: source.id,
          sourceUrl: source.sourceUrl,
          sourceTitle: source.title,
          primaryTopic: source.primaryTopic,
          competingUrls: Array.from(competingUrls),
          missedKeywords: Array.from(missedKeywords),
        });
      }

      return ok(gaps);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get citation gaps", {
        projectId,
        error: message,
      });
      return err(message, "CITATION_GAPS_FAILED");
    }
  }
}
