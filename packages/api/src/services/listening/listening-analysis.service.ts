import type { Repositories } from "../../repositories";
import type {
  DateRange,
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

export type Keyword = {
  id: string;
  projectId: string;
  keyword: string;
  category: string | null;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionResult = {
  totalMentionsCollected: number;
  byPlatform: Record<string, number>;
  duplicatesSkipped: number;
  keywordsProcessed: number;
};

export type MentionFilters = {
  platform?: string;
  keyword?: string;
  sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  dateRange?: DateRange;
  search?: string;
  pagination?: PaginationParams;
};

export type RawSocialMention = {
  id: string;
  projectId: string;
  platform: string;
  platformPostId: string;
  postUrl: string | null;
  authorName: string | null;
  authorHandle: string | null;
  authorFollowers: number | null;
  text: string;
  mediaType: string | null;
  publishedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  matchedKeyword: string;
  matchType: string;
  sentiment: string | null;
  topics: string[];
  isSpam: boolean;
  createdAt: Date;
};

export type KeywordPerformance = {
  keywordId: string;
  keyword: string;
  category: string | null;
  totalMentions: number;
  avgEngagement: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  volumeTrend: "RISING" | "STABLE" | "DECLINING";
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ListeningAnalysisService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Register keywords for tracking in a project.
   */
  async registerKeywords(
    projectId: string,
    keywords: string[],
    categories?: string[],
  ): Promise<ServiceResult<Keyword[]>> {
    try {
      if (keywords.length === 0) {
        return err("At least one keyword is required", "INVALID_INPUT");
      }

      // De-duplicate and normalize
      const uniqueKeywords = [
        ...new Set(keywords.map((k) => k.trim().toLowerCase())),
      ];

      const created: Keyword[] = [];

      // Pre-fetch all project keywords once (N+1 방지)
      const existingKeywords =
        await this.repositories.keyword.findByProject(projectId);

      for (let i = 0; i < uniqueKeywords.length; i++) {
        const keyword = uniqueKeywords[i]!;
        const category = categories?.[i] ?? null;

        // Check if keyword already exists
        const existing = existingKeywords.find((k) => k.keyword === keyword);

        if (existing) {
          // If archived, reactivate
          if (existing.status === "ARCHIVED") {
            const reactivated = await this.repositories.keyword.updateStatus(
              existing.id,
              "ACTIVE",
            );
            created.push(reactivated as Keyword);
          } else {
            created.push(existing as Keyword);
          }
          continue;
        }

        const newKeyword = await this.repositories.keyword.create(
          projectId,
          keyword,
          category ?? undefined,
        );
        created.push(newKeyword as Keyword);
      }

      this.logger.info("Keywords registered", {
        projectId,
        count: created.length,
      });

      return ok(created);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to register keywords", {
        projectId,
        error: message,
      });
      return err(message, "KEYWORD_REGISTRATION_FAILED");
    }
  }

  /**
   * Collect mentions for project keywords across platforms.
   */
  async collectMentions(
    projectId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<CollectionResult>> {
    try {
      // 1. Get active keywords for project
      const keywords = await this.repositories.keyword.findByProject(
        projectId,
        "ACTIVE",
      );

      if (keywords.length === 0) {
        this.logger.info("No active keywords to collect mentions for", {
          projectId,
          requestId: trace.requestId,
        });
        return ok({
          totalMentionsCollected: 0,
          byPlatform: {},
          duplicatesSkipped: 0,
          keywordsProcessed: 0,
        });
      }

      const byPlatform: Record<string, number> = {};
      const totalMentionsCollected = 0;
      const duplicatesSkipped = 0;

      // 2. For each platform, search mentions
      const platforms = ["YOUTUBE", "INSTAGRAM", "TIKTOK", "X"] as const;

      for (const platform of platforms) {
        for (const keyword of keywords) {
          // TODO: [INTEGRATION] @x2/social -- Call platform-specific provider to search mentions
          // Expected: socialClient[platform].searchMentions(keyword.keyword, { since: lastCollectionDate })
          // Returns: Array<{ platformPostId, text, authorName, authorHandle, ... }>
          // 3. For now, skip collection (no social providers connected)
          // When implemented:
          // const mentions = await socialClient.search(platform, keyword.keyword);
          // const normalized = mentions.map(m => normalizeMention(m, projectId, keyword));
          // const { created, skipped } = await this.repositories.mention.bulkCreate(normalized, { skipDuplicates: true });
          // totalMentionsCollected += created;
          // duplicatesSkipped += skipped;
          // byPlatform[platform] = (byPlatform[platform] ?? 0) + created;
        }
      }

      // TODO: [INTEGRATION] @x2/queue -- Queue sentiment analysis for new mentions
      // if (totalMentionsCollected > 0) {
      //   await queueClient.add('COMMENT_ANALYZE', { projectId, type: 'mentions', requestId: trace.requestId });
      // }

      // 5. Log collection results
      this.logger.info("Mentions collected", {
        projectId,
        totalMentionsCollected,
        byPlatform,
        duplicatesSkipped,
        keywordsProcessed: keywords.length,
        requestId: trace.requestId,
      });

      return ok({
        totalMentionsCollected,
        byPlatform,
        duplicatesSkipped,
        keywordsProcessed: keywords.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to collect mentions", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "MENTION_COLLECTION_FAILED");
    }
  }

  /**
   * Get mention feed with filters.
   */
  async getMentionFeed(
    projectId: string,
    filters?: MentionFilters,
  ): Promise<ServiceResult<PaginatedResult<RawSocialMention>>> {
    try {
      const result = await this.repositories.mention.findByProject(
        projectId,
        filters?.pagination,
        {
          platform: filters?.platform as any,
          keyword: filters?.keyword,
          sentiment: filters?.sentiment as any,
          dateRange: filters?.dateRange,
        },
      );

      return ok(result as PaginatedResult<RawSocialMention>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get mention feed", {
        projectId,
        error: message,
      });
      return err(message, "MENTION_FEED_FAILED");
    }
  }

  /**
   * Get keyword performance summary within a date range.
   */
  async getKeywordPerformance(
    projectId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<KeywordPerformance[]>> {
    try {
      const keywords = await this.repositories.keyword.findByProject(
        projectId,
        "ACTIVE",
      );

      if (keywords.length === 0) {
        return ok([]);
      }

      const performances: KeywordPerformance[] = [];

      for (const keyword of keywords) {
        // Get mentions for this keyword to compute stats
        const mentionResult = await this.repositories.mention.findByProject(
          projectId,
          undefined,
          { keyword: keyword.keyword, dateRange },
        );
        const mentions = mentionResult.data;
        const totalMentions = mentionResult.total;
        const avgEngagement =
          mentions.length > 0
            ? mentions.reduce((sum, m) => sum + (m.engagementRate ?? 0), 0) /
              mentions.length
            : 0;
        const sentimentBreakdown = {
          positive: mentions.filter((m) => m.sentiment === "POSITIVE").length,
          neutral: mentions.filter((m) => m.sentiment === "NEUTRAL").length,
          negative: mentions.filter((m) => m.sentiment === "NEGATIVE").length,
        };

        // Get keyword metric trend
        const metrics = await this.repositories.keyword.findMetrics(
          keyword.id,
          dateRange,
        );

        // Determine volume trend from metrics
        let volumeTrend: "RISING" | "STABLE" | "DECLINING" = "STABLE";
        if (metrics.length >= 2) {
          const mid = Math.floor(metrics.length / 2);
          const firstHalfAvg =
            metrics
              .slice(0, mid)
              .reduce((sum, m) => sum + (m.searchVolume ?? 0), 0) / mid;
          const secondHalfAvg =
            metrics
              .slice(mid)
              .reduce((sum, m) => sum + (m.searchVolume ?? 0), 0) /
            (metrics.length - mid);
          const change =
            firstHalfAvg > 0
              ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg
              : 0;
          volumeTrend =
            change > 0.1 ? "RISING" : change < -0.1 ? "DECLINING" : "STABLE";
        }

        performances.push({
          keywordId: keyword.id,
          keyword: keyword.keyword,
          category: keyword.category,
          totalMentions,
          avgEngagement,
          sentimentBreakdown,
          volumeTrend,
        });
      }

      return ok(performances);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get keyword performance", {
        projectId,
        error: message,
      });
      return err(message, "KEYWORD_PERFORMANCE_FAILED");
    }
  }
}
