/**
 * Cluster Finder Service
 *
 * 클러스터 파인더의 진입점.
 * 기존 intent-engine과 연동하여 강화된 IntentCluster를 생성한다.
 *
 * 동작 흐름:
 * 1. intent-engine으로 키워드 확장 + 의도 분류 + 그래프 빌드
 * 2. cluster-builder로 IntentCluster 변환
 * 3. cluster-labeler로 라벨 정제
 * 4. (선택) LLM으로 라벨 강화
 */

import type { IntentGraphData } from "../../intent-engine/types";
import type {
  ClusterFinderRequest,
  ClusterFinderResult,
  ClusterFinderSummary,
  ClusterCategory,
  AnalysisTrace,
} from "../types";
import { buildIntentClusters } from "../builders/cluster-builder";
import { labelClusters, labelWithLLM, applyLLMLabels } from "../builders/cluster-labeler";

/**
 * 클러스터 파인더 분석 실행
 */
export async function analyzeClusterFinder(
  request: ClusterFinderRequest,
): Promise<ClusterFinderResult> {
  const startTime = Date.now();

  // 1. 기존 intent-engine 결과 얻기
  let igData = request.existingAnalysis;

  if (!igData) {
    const { intentAnalysisService } = await import(
      "../../intent-engine/service"
    );
    igData = await intentAnalysisService.analyze({
      seedKeyword: request.seedKeyword,
      maxDepth: 2,
      maxKeywords: request.maxClusters ? request.maxClusters * 15 : 200,
      platforms: [],
    });
  }

  // 2. IntentCluster 변환
  const { clusters: rawClusters, memberships } = buildIntentClusters(
    igData,
    request.seedKeyword,
    {
      minClusterSize: request.minClusterSize ?? 3,
      includeQuestions: request.includeQuestions ?? true,
    },
  );

  // 3. 규칙 기반 라벨 정제
  let clusters = labelClusters(rawClusters);

  // 4. (선택) LLM 라벨링
  if (request.useLLM) {
    const llmResult = await labelWithLLM(clusters, request.seedKeyword);
    if (llmResult) {
      clusters = applyLLMLabels(clusters, llmResult);
    }
  }

  // 5. 최대 클러스터 수 제한
  const maxClusters = request.maxClusters ?? 20;
  clusters = clusters.slice(0, maxClusters);

  // 6. 요약 생성
  const summary = buildClusterSummary(clusters, startTime);

  // 7. Trace 생성
  const trace = buildTrace(igData, clusters, startTime);

  return {
    seedKeyword: request.seedKeyword,
    clusters,
    memberships: memberships.filter((m) =>
      clusters.some((c) => c.id === m.clusterId),
    ),
    summary,
    trace,
  };
}

// ─── Summary ──────────────────────────────────────────────────

function buildClusterSummary(
  clusters: import("../types").IntentCluster[],
  startTime: number,
): ClusterFinderSummary {
  const totalKeywords = clusters.reduce((s: number, c: import("../types").IntentCluster) => s + c.memberCount, 0);

  // 카테고리 분포
  const categoryCounts = new Map<ClusterCategory, number>();
  for (const cluster of clusters) {
    categoryCounts.set(
      cluster.category,
      (categoryCounts.get(cluster.category) || 0) + 1,
    );
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // Intent 분포
  const intentDist: Record<string, number> = {};
  for (const cluster of clusters) {
    for (const [intent, count] of Object.entries(cluster.metadata.intentDistribution)) {
      intentDist[intent] = (intentDist[intent] || 0) + (count as number);
    }
  }

  return {
    totalClusters: clusters.length,
    totalKeywords,
    avgClusterSize: clusters.length > 0
      ? Math.round(totalKeywords / clusters.length)
      : 0,
    topCategories,
    intentDistribution: intentDist as Record<import("../../intent-engine/types").IntentCategory, number>,
    avgGapScore: clusters.length > 0
      ? Math.round(
          (clusters.reduce((s: number, c: import("../types").IntentCluster) => s + c.avgGapScore, 0) / clusters.length) * 100,
        ) / 100
      : 0,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

// ─── Trace ────────────────────────────────────────────────────

function buildTrace(
  igData: IntentGraphData,
  clusters: import("../types").IntentCluster[],
  startTime: number,
): AnalysisTrace {
  return {
    analysisId: `cf-${Date.now()}`,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    stages: [
      {
        name: "intent_engine",
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        inputCount: 1,
        outputCount: igData.nodes.length,
        apiCallCount: 0,
        cacheHitCount: 0,
        errorCount: 0,
      },
      {
        name: "cluster_building",
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        inputCount: igData.clusters.length,
        outputCount: clusters.length,
        apiCallCount: 0,
        cacheHitCount: 0,
        errorCount: 0,
      },
    ],
    dataSources: [
      {
        source: "intent_engine",
        callCount: 1,
        cacheHitRate: 0,
        avgLatencyMs: Date.now() - startTime,
      },
    ],
  };
}
