import type { Repositories } from "../../repositories";
import type { DateRange } from "../../repositories/base.repository";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";
import { TextAnalyzer } from "../engines/text-analyzer";
import { EngineLogger } from "../engines/engine-logger";
import type { CommentAnalysisEngineResult } from "../engines/types";
import type { FAQService } from "./faq.service";
import type {
  RiskSignalService,
  RiskCommentInput,
} from "./risk-signal.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SentimentBreakdown = {
  positive: number;
  neutral: number;
  negative: number;
};

export type AnalysisResult = {
  contentId: string;
  analyzedCount: number;
  skippedCount: number;
  sentimentDistribution: SentimentBreakdown;
  questionsDetected: number;
  risksDetected: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  engineVersion: string;
};

export type SentimentDistribution = {
  projectId: string;
  dateRange: DateRange;
  total: number;
  breakdown: SentimentBreakdown;
  breakdownPercent: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topNegativeTopics: string[];
};

/** Shape of a comment returned from the repository's unanalyzed query */
type UnanalyzedComment = {
  id: string;
  text: string;
  authorName: string;
  publishedAt: Date;
  likeCount: number;
};

/** Shape expected from AI analysis per comment */
type AICommentAnalysis = {
  commentId: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;
  sentimentReason: string | null;
  topics: string[];
  topicConfidence: number | null;
  language: string | null;
  isSpam: boolean;
  isQuestion: boolean;
  questionType: string | null;
  isRisk: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  suggestedReply: string | null;
};

const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CommentAnalysisService {
  private readonly textAnalyzer = new TextAnalyzer();
  private readonly engineLogger: EngineLogger;
  private faqService?: FAQService;
  private riskSignalService?: RiskSignalService;

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {
    this.engineLogger = new EngineLogger(logger);
  }

  /**
   * Inject downstream services for cross-service flow.
   * Called once at startup from createServices().
   */
  setDownstreamServices(services: {
    faqService?: FAQService;
    riskSignalService?: RiskSignalService;
  }): void {
    this.faqService = services.faqService;
    this.riskSignalService = services.riskSignalService;
  }

  /**
   * Analyze unprocessed comments for a content piece.
   * Uses TextAnalyzer engine for real sentiment/topic/risk analysis.
   */
  async analyzeComments(
    contentId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<AnalysisResult>> {
    const logBuilder = this.engineLogger
      .createBuilder("comment-analysis", "text-analyzer-v1.0.0")
      .setTrace(trace.requestId);

    try {
      // 1. Fetch unanalyzed comments
      const unanalyzed =
        await this.repositories.comment.findUnanalyzed(BATCH_SIZE);

      // 2. If none, return early
      if (unanalyzed.length === 0) {
        this.logger.info("No unanalyzed comments found", {
          contentId,
          requestId: trace.requestId,
        });
        logBuilder.setInput(0).finish();
        return ok({
          contentId,
          analyzedCount: 0,
          skippedCount: 0,
          sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
          questionsDetected: 0,
          risksDetected: 0,
          avgConfidence: 0,
          lowConfidenceCount: 0,
          engineVersion: "text-analyzer-v1.0.0",
        });
      }

      logBuilder.setInput(unanalyzed.length);

      // 3. Run real analysis via TextAnalyzer engine
      const batches = this.chunkArray(unanalyzed, BATCH_SIZE);
      const allResults: AICommentAnalysis[] = [];
      const skippedCount = 0;

      for (const batch of batches) {
        // Real engine analysis — not a placeholder
        const engineResults = this.textAnalyzer.analyzeBatch(
          batch.map((c) => ({ id: c.id, text: c.text })),
        );

        // Convert engine results to the AICommentAnalysis shape
        for (const engineResult of engineResults) {
          const converted = this.engineResultToAnalysis(engineResult);
          allResults.push(converted);

          // Record quality metrics
          logBuilder.recordSuccess(engineResult.sentiment.confidence);
        }
      }

      // 4. Resolve projectId for downstream services
      let projectId: string | null = null;
      try {
        const content = await this.repositories.content.findById(contentId);
        if (content) {
          const channel = await this.repositories.channel.findById(
            (content as any).channelId,
          );
          if (channel) {
            projectId = channel.projectId;
          }
        }
      } catch {
        // Non-fatal — downstream FAQ/Risk dispatch will be skipped
      }

      // 5. Save CommentAnalysis records
      const questionCommentIds: string[] = [];
      const riskComments: RiskCommentInput[] = [];

      for (const result of allResults) {
        await this.repositories.comment.createAnalysis(result.commentId, {
          sentiment: result.sentiment,
          sentimentScore: result.sentimentScore,
          sentimentReason: result.sentimentReason,
          topics: result.topics,
          topicConfidence: result.topicConfidence,
          language: result.language,
          isSpam: result.isSpam,
          isQuestion: result.isQuestion,
          questionType: result.questionType,
          isRisk: result.isRisk,
          riskLevel: result.riskLevel,
          suggestedReply: result.suggestedReply,
          analyzerModel: "text-analyzer-v1.0.0",
        });

        // 6. Track question and risk comments for downstream processing
        if (result.isQuestion) {
          questionCommentIds.push(result.commentId);
        }
        if (result.isRisk && result.riskLevel) {
          const original = unanalyzed.find((c) => c.id === result.commentId);
          if (original) {
            riskComments.push({
              commentId: result.commentId,
              text: original.text,
              riskLevel: result.riskLevel,
              topics: result.topics,
              authorName: original.authorName,
              publishedAt: original.publishedAt,
            });
          }
        }
      }

      // 7. Dispatch to FAQ service for question comments
      if (questionCommentIds.length > 0 && projectId && this.faqService) {
        try {
          await this.faqService.processQuestionComments(
            projectId,
            questionCommentIds,
            trace,
          );
          this.logger.info("FAQ processing dispatched", {
            contentId,
            questionCount: questionCommentIds.length,
            requestId: trace.requestId,
          });
        } catch (faqError) {
          this.logger.error("FAQ processing dispatch failed", {
            contentId,
            error: faqError instanceof Error ? faqError.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      } else if (questionCommentIds.length > 0) {
        this.logger.info("Question comments detected (FAQ service not wired)", {
          contentId,
          count: questionCommentIds.length,
          requestId: trace.requestId,
        });
      }

      // 8. Dispatch to risk signal service for risk comments
      if (riskComments.length > 0 && projectId && this.riskSignalService) {
        try {
          await this.riskSignalService.detectRisks(
            projectId,
            riskComments,
            trace,
          );
          this.logger.info("Risk detection dispatched", {
            contentId,
            riskCount: riskComments.length,
            requestId: trace.requestId,
          });
        } catch (riskError) {
          this.logger.error("Risk detection dispatch failed", {
            contentId,
            error: riskError instanceof Error ? riskError.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      } else if (riskComments.length > 0) {
        this.logger.info(
          "Risk comments detected (RiskSignal service not wired)",
          {
            contentId,
            count: riskComments.length,
            requestId: trace.requestId,
          },
        );
      }

      // Calculate sentiment distribution
      const sentimentDistribution: SentimentBreakdown = {
        positive: allResults.filter((r) => r.sentiment === "POSITIVE").length,
        neutral: allResults.filter((r) => r.sentiment === "NEUTRAL").length,
        negative: allResults.filter((r) => r.sentiment === "NEGATIVE").length,
      };

      // Finalize engine log
      const engineLog = logBuilder.finish();

      // 9. Log summary
      this.logger.info("Comments analyzed", {
        contentId,
        count: allResults.length,
        sentimentDistribution,
        questionsDetected: questionCommentIds.length,
        risksDetected: riskComments.length,
        avgConfidence: engineLog.avgConfidence,
        lowConfidenceCount: engineLog.lowConfidenceCount,
        engineVersion: "text-analyzer-v1.0.0",
        requestId: trace.requestId,
      });

      return ok({
        contentId,
        analyzedCount: allResults.length,
        skippedCount,
        sentimentDistribution,
        questionsDetected: questionCommentIds.length,
        risksDetected: riskComments.length,
        avgConfidence: engineLog.avgConfidence,
        lowConfidenceCount: engineLog.lowConfidenceCount,
        engineVersion: "text-analyzer-v1.0.0",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logBuilder.recordFailure(message);
      logBuilder.finish();
      this.logger.error("Failed to analyze comments", {
        contentId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "COMMENT_ANALYSIS_FAILED");
    }
  }

  /**
   * Re-analyze high-risk comments with deeper analysis.
   * Currently re-runs TextAnalyzer; upgrade path: use Claude Sonnet.
   */
  async reanalyzeRiskComments(
    commentIds: string[],
    trace: TraceContext,
  ): Promise<ServiceResult<void>> {
    try {
      if (commentIds.length === 0) {
        return ok(undefined);
      }

      // Fetch comments and re-analyze
      let reanalyzedCount = 0;
      for (const commentId of commentIds) {
        const comment = await this.repositories.comment.findById(commentId);
        if (!comment) continue;

        const result = this.textAnalyzer.analyze(commentId, comment.text);
        const converted = this.engineResultToAnalysis(result);

        // Update existing CommentAnalysis record
        await this.repositories.comment.createAnalysis(commentId, {
          sentiment: converted.sentiment,
          sentimentScore: converted.sentimentScore,
          sentimentReason: converted.sentimentReason,
          topics: converted.topics,
          topicConfidence: converted.topicConfidence,
          language: converted.language,
          isSpam: converted.isSpam,
          isQuestion: converted.isQuestion,
          questionType: converted.questionType,
          isRisk: converted.isRisk,
          riskLevel: converted.riskLevel,
          suggestedReply: converted.suggestedReply,
          analyzerModel: "text-analyzer-v1.0.0-reanalysis",
        });
        reanalyzedCount++;
      }

      this.logger.info("Risk comments re-analyzed", {
        requested: commentIds.length,
        reanalyzed: reanalyzedCount,
        requestId: trace.requestId,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to re-analyze risk comments", {
        count: commentIds.length,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "REANALYSIS_FAILED");
    }
  }

  /**
   * Get sentiment distribution for a project within a date range.
   */
  async getSentimentDistribution(
    projectId: string,
    dateRange: DateRange,
  ): Promise<ServiceResult<SentimentDistribution>> {
    try {
      const sentimentCounts = await this.repositories.comment.countBySentiment(
        projectId,
        dateRange,
      );

      const aggregation: SentimentBreakdown = {
        positive:
          sentimentCounts.find((s) => s.sentiment === "POSITIVE")?.count ?? 0,
        neutral:
          sentimentCounts.find((s) => s.sentiment === "NEUTRAL")?.count ?? 0,
        negative:
          sentimentCounts.find((s) => s.sentiment === "NEGATIVE")?.count ?? 0,
      };

      const total =
        aggregation.positive + aggregation.neutral + aggregation.negative;

      const breakdownPercent =
        total > 0
          ? {
              positive:
                Math.round((aggregation.positive / total) * 10000) / 100,
              neutral: Math.round((aggregation.neutral / total) * 10000) / 100,
              negative:
                Math.round((aggregation.negative / total) * 10000) / 100,
            }
          : { positive: 0, neutral: 0, negative: 0 };

      // Extract top negative topics from recent analysis
      const topNegativeTopics = await this.extractTopNegativeTopics(projectId);

      return ok({
        projectId,
        dateRange,
        total,
        breakdown: aggregation,
        breakdownPercent,
        topNegativeTopics,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get sentiment distribution", {
        projectId,
        error: message,
      });
      return err(message, "SENTIMENT_DISTRIBUTION_FAILED");
    }
  }

  /**
   * Get engine execution logs for monitoring.
   */
  getEngineExecutionLogs(limit?: number) {
    return this.engineLogger.getRecentLogs("comment-analysis", limit);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Convert engine result to the AICommentAnalysis shape for DB storage.
   */
  private engineResultToAnalysis(
    result: CommentAnalysisEngineResult,
  ): AICommentAnalysis {
    return {
      commentId: result.commentId,
      sentiment: result.sentiment.sentiment,
      sentimentScore: result.sentiment.sentimentScore,
      sentimentReason: result.sentiment.reason,
      topics: [result.topics.primaryTopic, ...result.topics.secondaryTopics],
      topicConfidence: result.topics.confidence,
      language: result.sentiment.language,
      isSpam: result.isSpam,
      isQuestion: result.question.isQuestion,
      questionType: result.question.questionType,
      isRisk: result.risk.isRisk,
      riskLevel: result.risk.riskLevel,
      suggestedReply: result.suggestedReply,
    };
  }

  /**
   * Extract top negative topics from recent negative comment analyses.
   */
  private async extractTopNegativeTopics(projectId: string): Promise<string[]> {
    try {
      const negativeAnalyses =
        await this.repositories.comment.findAnalysisByFilters(
          projectId,
          { sentiment: "NEGATIVE" as any },
          { page: 1, pageSize: 50 },
        );

      // Count topics across negative comments
      const topicCounts = new Map<string, number>();
      for (const analysis of negativeAnalyses.data) {
        const topics = (analysis as any).topics as string[] | undefined;
        if (topics) {
          for (const topic of topics) {
            if (topic && topic !== "기타") {
              topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
            }
          }
        }
      }

      return Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic);
    } catch {
      return [];
    }
  }
}
