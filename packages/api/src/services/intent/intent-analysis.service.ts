import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";
import { IntentClassifier } from "../engines/intent-classifier";
import { ClusterEngine } from "../engines/cluster-engine";
import { JourneyEngine } from "../engines/journey-engine";
import { EngineLogger } from "../engines/engine-logger";
import type { ClusterInput } from "../engines/cluster-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntentQuery = {
  id: string;
  projectId: string;
  seedKeyword: string;
  locale: string;
  maxDepth: number;
  maxKeywords: number;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress: number;
  statusMessage: string | null;
  resultSummary: unknown;
  resultGraph: unknown;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMs: number | null;
  tokenUsage: number | null;
  estimatedCostUsd: number | null;
  createdAt: Date;
};

export type IntentKeywordResult = {
  id: string;
  queryId: string;
  keyword: string;
  searchVolume: number | null;
  socialVolume: number | null;
  trend: "RISING" | "STABLE" | "DECLINING" | null;
  intentCategory:
    | "DISCOVERY"
    | "COMPARISON"
    | "ACTION"
    | "TROUBLESHOOTING"
    | "NAVIGATION"
    | "UNKNOWN";
  subIntent: string | null;
  confidence: number;
  gapScore: number | null;
  gapType: "BLUE_OCEAN" | "OPPORTUNITY" | "COMPETITIVE" | "SATURATED" | null;
  monthlyVolumes: unknown;
  socialBreakdown: unknown;
};

export type IntentAnalysisOptions = {
  locale?: string;
  maxDepth?: number;
  maxKeywords?: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class IntentAnalysisService {
  private readonly intentClassifier = new IntentClassifier();
  private readonly clusterEngine = new ClusterEngine();
  private readonly journeyEngine = new JourneyEngine();
  private readonly engineLogger: EngineLogger;

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {
    this.engineLogger = new EngineLogger(logger);
  }

  /**
   * Start intent analysis for a seed keyword.
   * Creates an IntentQuery record and queues an async analysis job.
   */
  async analyzeIntent(
    projectId: string,
    seedKeyword: string,
    trace: TraceContext,
    options?: IntentAnalysisOptions,
  ): Promise<ServiceResult<IntentQuery>> {
    try {
      if (!seedKeyword.trim()) {
        return err("Seed keyword cannot be empty", "INVALID_INPUT");
      }

      // 1. Create IntentQuery record with status=QUEUED
      const query = await this.repositories.intent.createQuery({
        project: { connect: { id: projectId } },
        seedKeyword: seedKeyword.trim(),
        locale: options?.locale ?? "ko",
        maxDepth: options?.maxDepth ?? 2,
        maxKeywords: options?.maxKeywords ?? 150,
        status: "QUEUED",
        progress: 0,
        statusMessage: "Queued for analysis",
      });

      // 2. Log
      this.logger.info("Intent analysis queued", {
        queryId: query.id,
        projectId,
        keyword: seedKeyword,
        requestId: trace.requestId,
      });

      return ok(query as IntentQuery);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to queue intent analysis", {
        projectId,
        seedKeyword,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "INTENT_ANALYSIS_QUEUE_FAILED");
    }
  }

  /**
   * Process intent analysis (called by job handler after dequeue).
   * Uses IntentClassifier, ClusterEngine, and JourneyEngine for real analysis.
   */
  async processIntentAnalysis(
    queryId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<void>> {
    const startTime = Date.now();
    const logBuilder = this.engineLogger
      .createBuilder("intent-analysis", "intent-classifier-v1.0.0")
      .setTrace(trace.requestId);

    try {
      // 1. Fetch IntentQuery
      const query = await this.repositories.intent.findQueryById(queryId);
      if (!query) {
        return err("Intent query not found", "QUERY_NOT_FOUND");
      }

      if (query.status !== "QUEUED" && query.status !== "PROCESSING") {
        return err(
          `Cannot process query in status: ${query.status}`,
          "INVALID_QUERY_STATUS",
        );
      }

      // Update status to PROCESSING
      await this.repositories.intent.updateQueryStatus(queryId, "PROCESSING");

      // 2. Run real intent classification via IntentClassifier engine
      const classificationResults = this.intentClassifier.expandAndClassify(
        query.seedKeyword,
      );

      logBuilder.setInput(classificationResults.length);

      // 3. Create IntentKeywordResult records
      for (const result of classificationResults) {
        await this.repositories.intent.createKeywordResult({
          query: { connect: { id: queryId } },
          keyword: result.keyword,
          searchVolume: null, // TODO: Google Ads API integration
          socialVolume: null,
          trend: null,
          intentCategory: result.intentCategory,
          subIntent: result.subIntent,
          confidence: result.confidence,
          gapScore: result.gapScore,
          gapType: result.gapType,
          monthlyVolumes: undefined,
          socialBreakdown: undefined,
        });

        logBuilder.recordSuccess(result.confidence);
      }

      // 4. Generate cluster graph via ClusterEngine
      const clusterInputs: ClusterInput[] = classificationResults.map((r) => ({
        id: r.keyword,
        text: r.keyword,
        type: "keyword" as const,
      }));
      const clusters = this.clusterEngine.cluster(clusterInputs);

      // 5. Generate journey map via JourneyEngine
      const journeyMap = this.journeyEngine.buildJourneyMap(
        classificationResults,
      );

      // 6. Build result graph and summary
      const resultGraph = {
        clusters: clusters.map((c) => ({
          id: c.clusterId,
          label: c.label,
          members: c.memberItems.map((m) => m.text),
          score: c.clusterScore,
        })),
        journey: {
          nodes: journeyMap.nodes.map((n) => ({
            id: n.id,
            stage: n.stage,
            label: n.label,
            keywords: n.keywords,
          })),
          edges: journeyMap.edges.map((e) => ({
            from: e.fromNodeId,
            to: e.toNodeId,
            score: e.transitionScore,
          })),
          dominantPath: journeyMap.dominantPath,
        },
      };

      const resultSummary = {
        totalKeywords: classificationResults.length,
        intentDistribution: this.getIntentDistribution(classificationResults),
        gapDistribution: this.getGapDistribution(classificationResults),
        topOpportunities: classificationResults
          .filter(
            (k) => k.gapType === "BLUE_OCEAN" || k.gapType === "OPPORTUNITY",
          )
          .sort((a, b) => b.gapScore - a.gapScore)
          .slice(0, 5)
          .map((k) => k.keyword),
        clusterCount: clusters.length,
        journeyStages: journeyMap.nodes.map((n) => n.stage),
        engineVersion: "intent-classifier-v1.0.0",
      };

      // 7. Update IntentQuery as completed
      const durationMs = Date.now() - startTime;

      await this.repositories.intent.updateQueryStatus(
        queryId,
        "COMPLETED",
        resultGraph as any,
        resultSummary as any,
      );

      // Finalize engine log
      const engineLog = logBuilder.finish();

      // 8. Log completion
      this.logger.info("Intent analysis completed", {
        queryId,
        keywordCount: classificationResults.length,
        clusterCount: clusters.length,
        journeyStages: journeyMap.nodes.length,
        gapDistribution: resultSummary.gapDistribution,
        avgConfidence: engineLog.avgConfidence,
        durationMs,
        requestId: trace.requestId,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";

      logBuilder.recordFailure(message);
      logBuilder.finish();

      // Mark query as FAILED
      await this.repositories.intent
        .updateQueryStatus(queryId, "FAILED")
        .catch((updateErr: unknown) => {
          this.logger.error("Failed to update query status to FAILED", {
            queryId,
            error:
              updateErr instanceof Error ? updateErr.message : "Unknown error",
          });
        });

      this.logger.error("Intent analysis failed", {
        queryId,
        error: message,
        requestId: trace.requestId,
      });

      return err(message, "INTENT_ANALYSIS_FAILED");
    }
  }

  /**
   * Get gap opportunities (BLUE_OCEAN + OPPORTUNITY keywords) for a project.
   */
  async getGapOpportunities(
    projectId: string,
  ): Promise<ServiceResult<IntentKeywordResult[]>> {
    try {
      const results =
        await this.repositories.intent.findGapOpportunities(projectId);

      // Sort by gapScore descending (highest opportunity first)
      const sorted = (results as IntentKeywordResult[]).sort(
        (a, b) => (b.gapScore ?? 0) - (a.gapScore ?? 0),
      );

      return ok(sorted);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get gap opportunities", {
        projectId,
        error: message,
      });
      return err(message, "GAP_OPPORTUNITIES_FAILED");
    }
  }

  /**
   * Get engine execution logs for monitoring.
   */
  getEngineExecutionLogs(limit?: number) {
    return this.engineLogger.getRecentLogs("intent-analysis", limit);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getIntentDistribution(
    keywords: Array<{ intentCategory: string }>,
  ): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const kw of keywords) {
      dist[kw.intentCategory] = (dist[kw.intentCategory] ?? 0) + 1;
    }
    return dist;
  }

  private getGapDistribution(
    keywords: Array<{ gapType: string | null }>,
  ): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const kw of keywords) {
      const type = kw.gapType ?? "UNKNOWN";
      dist[type] = (dist[type] ?? 0) + 1;
    }
    return dist;
  }
}
