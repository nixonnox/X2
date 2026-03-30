/**
 * Analytics Input Builder.
 *
 * Provides two modes of operation:
 *
 * 1. **Direct dispatch** (preferred): Calls downstream analysis services directly
 *    after collection runs. Used when services are injected at construction time.
 *
 * 2. **Input building** (for async queuing): Builds typed input arrays that can be
 *    pushed to BullMQ queues for deferred processing.
 *
 * Each analytics engine's service is self-contained (fetches its own data from
 * repositories), so the "dispatch" mode simply invokes the right service method
 * with the correct parameters. The "build" mode prepares serializable payloads
 * for queue-based processing.
 */

import type { Repositories } from "../../repositories";
import type { Logger, TraceContext } from "../types";
import type {
  ChannelCollectionResult,
  CommentAnalysisInput,
  ListeningAnalysisInput,
  IntentAnalysisInput,
  GeoAeoInput,
} from "./types";

// ---------------------------------------------------------------------------
// Service interface types (for optional injection)
// ---------------------------------------------------------------------------

/** Minimal interface for CommentAnalysisService. */
export type CommentAnalyzer = {
  analyzeComments(contentId: string, trace: TraceContext): Promise<unknown>;
};

/** Minimal interface for ListeningAnalysisService. */
export type ListeningCollector = {
  collectMentions(projectId: string, trace: TraceContext): Promise<unknown>;
};

/** Minimal interface for IntentAnalysisService. */
export type IntentProcessor = {
  processIntentAnalysis(queryId: string, trace: TraceContext): Promise<unknown>;
};

/** Minimal interface for GeoAeoService. */
export type GeoAeoCollector = {
  collectSnapshots(projectId: string, trace: TraceContext): Promise<unknown>;
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export class AnalyticsInputBuilder {
  private commentAnalyzer?: CommentAnalyzer;
  private listeningCollector?: ListeningCollector;
  private intentProcessor?: IntentProcessor;
  private geoAeoCollector?: GeoAeoCollector;

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Inject downstream services for direct dispatch mode.
   * Called once at application startup after all services are created.
   */
  setServices(services: {
    commentAnalyzer?: CommentAnalyzer;
    listeningCollector?: ListeningCollector;
    intentProcessor?: IntentProcessor;
    geoAeoCollector?: GeoAeoCollector;
  }): void {
    this.commentAnalyzer = services.commentAnalyzer;
    this.listeningCollector = services.listeningCollector;
    this.intentProcessor = services.intentProcessor;
    this.geoAeoCollector = services.geoAeoCollector;
  }

  // ---------------------------------------------------------------------------
  // Direct dispatch mode
  // ---------------------------------------------------------------------------

  /**
   * Dispatch comment analysis for unanalyzed comments.
   * If CommentAnalysisService is injected, calls it directly.
   * Otherwise, builds input array for queue-based processing.
   */
  async dispatchCommentAnalysis(
    trace: TraceContext,
  ): Promise<{ dispatched: boolean; count: number }> {
    const unanalyzed = await this.repositories.comment.findUnanalyzed(100);
    if (unanalyzed.length === 0) {
      return { dispatched: false, count: 0 };
    }

    if (this.commentAnalyzer) {
      // Direct dispatch: group by contentId and call service
      const contentIds = [...new Set(unanalyzed.map((c) => c.contentId))];
      for (const contentId of contentIds) {
        try {
          await this.commentAnalyzer.analyzeComments(contentId, trace);
        } catch (error) {
          this.logger.error("Comment analysis dispatch failed", {
            contentId,
            error: error instanceof Error ? error.message : "Unknown",
          });
        }
      }
      this.logger.info("Comment analysis dispatched", {
        contentIds: contentIds.length,
        commentCount: unanalyzed.length,
      });
      return { dispatched: true, count: unanalyzed.length };
    }

    // Fallback: log for queue-based processing
    this.logger.info("Comment analysis inputs ready for queue", {
      count: unanalyzed.length,
    });
    return { dispatched: false, count: unanalyzed.length };
  }

  /**
   * Dispatch listening analysis for a project.
   */
  async dispatchListeningAnalysis(
    projectId: string,
    trace: TraceContext,
  ): Promise<{ dispatched: boolean }> {
    if (this.listeningCollector) {
      try {
        await this.listeningCollector.collectMentions(projectId, trace);
        this.logger.info("Listening analysis dispatched", { projectId });
        return { dispatched: true };
      } catch (error) {
        this.logger.error("Listening analysis dispatch failed", {
          projectId,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
    return { dispatched: false };
  }

  /**
   * Dispatch intent analysis for pending queries in a project.
   */
  async dispatchIntentAnalysis(
    projectId: string,
    trace: TraceContext,
  ): Promise<{ dispatched: boolean; queryCount: number }> {
    const queryResult = await this.repositories.intent.findQueriesByProject(
      projectId,
      {
        page: 1,
        pageSize: 50,
      },
    );

    const pendingQueries = queryResult.data.filter(
      (q) => q.status === "QUEUED" || q.status === "PROCESSING",
    );

    if (pendingQueries.length === 0) {
      return { dispatched: false, queryCount: 0 };
    }

    if (this.intentProcessor) {
      for (const query of pendingQueries) {
        try {
          await this.intentProcessor.processIntentAnalysis(query.id, trace);
        } catch (error) {
          this.logger.error("Intent analysis dispatch failed", {
            queryId: query.id,
            error: error instanceof Error ? error.message : "Unknown",
          });
        }
      }
      this.logger.info("Intent analysis dispatched", {
        projectId,
        queryCount: pendingQueries.length,
      });
      return { dispatched: true, queryCount: pendingQueries.length };
    }

    return { dispatched: false, queryCount: pendingQueries.length };
  }

  /**
   * Dispatch GEO/AEO snapshot collection for a project.
   */
  async dispatchGeoAeoCollection(
    projectId: string,
    trace: TraceContext,
  ): Promise<{ dispatched: boolean }> {
    if (this.geoAeoCollector) {
      try {
        await this.geoAeoCollector.collectSnapshots(projectId, trace);
        this.logger.info("GEO/AEO collection dispatched", { projectId });
        return { dispatched: true };
      } catch (error) {
        this.logger.error("GEO/AEO collection dispatch failed", {
          projectId,
          error: error instanceof Error ? error.message : "Unknown",
        });
      }
    }
    return { dispatched: false };
  }

  // ---------------------------------------------------------------------------
  // Input building mode (for BullMQ queue payloads)
  // ---------------------------------------------------------------------------

  /**
   * Build comment analysis inputs for queue-based processing.
   */
  async buildCommentAnalysisInputs(
    limit: number = 100,
  ): Promise<CommentAnalysisInput[]> {
    const unanalyzed = await this.repositories.comment.findUnanalyzed(limit);

    return unanalyzed.map((comment) => ({
      commentId: comment.id,
      text: comment.text,
      authorName: comment.authorName,
      publishedAt: comment.publishedAt,
      contentId: comment.contentId,
      channelId: "", // Resolved by consumer via content→channel join
      platform: "", // Resolved by consumer via content→channel join
    }));
  }

  /**
   * Build listening analysis inputs for queue-based processing.
   */
  async buildListeningInputs(
    projectId: string,
    keywords: string[],
    limit: number = 200,
  ): Promise<ListeningAnalysisInput[]> {
    const mentionResult = await this.repositories.mention.findByProject(
      projectId,
      { page: 1, pageSize: limit },
    );

    return mentionResult.data.map((mention) => ({
      mentionId: mention.id,
      text: mention.text,
      platform: mention.platform,
      sourceUrl: mention.postUrl ?? "",
      mentionedAt: mention.publishedAt,
      projectId,
      matchedKeywords: keywords.filter((kw) =>
        mention.text.toLowerCase().includes(kw.toLowerCase()),
      ),
    }));
  }

  /**
   * Build intent analysis inputs for queue-based processing.
   */
  async buildIntentInputs(projectId: string): Promise<IntentAnalysisInput[]> {
    const queryResult = await this.repositories.intent.findQueriesByProject(
      projectId,
      {
        page: 1,
        pageSize: 50,
      },
    );

    return queryResult.data
      .filter((q) => q.status === "QUEUED" || q.status === "PROCESSING")
      .map((query) => ({
        queryId: query.id,
        queryText: query.seedKeyword,
        platform: "search",
        volume: 0,
        projectId,
      }));
  }

  /**
   * Build GEO/AEO tracking inputs for queue-based processing.
   */
  async buildGeoAeoInputs(projectId: string): Promise<GeoAeoInput[]> {
    const keywords = await this.repositories.aeo.findKeywordsByProject(
      projectId,
      "ACTIVE" as any,
    );

    const engines = ["GOOGLE", "BING", "CHATGPT", "PERPLEXITY"];
    const inputs: GeoAeoInput[] = [];

    for (const keyword of keywords) {
      for (const engine of engines) {
        inputs.push({
          keywordId: keyword.id,
          keyword: keyword.keyword,
          engine,
          position: null,
          cited: false,
          snippetText: null,
          checkedAt: new Date(),
        });
      }
    }

    return inputs;
  }
}
