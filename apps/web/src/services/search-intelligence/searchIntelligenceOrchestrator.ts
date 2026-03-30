/**
 * Search Intelligence Orchestrator
 *
 * 전체 파이프라인을 하나로 묶는 최상위 오케스트레이터.
 *
 * 파이프라인:
 * 1. SearchConnectorRegistry.initialize() — 어댑터 자동 감지
 * 2. resolveSearchData() — 모든 소스에서 데이터 수집
 * 3. 엔진별 서비스 병렬 실행
 *    - searchToCluster() → ClusterFinderResult
 *    - searchToPersona() → PersonaViewResult (cluster 결과 재사용)
 *    - searchToPathfinder() → PathfinderResult
 *    - searchToRoadView() → RoadViewResult
 * 4. 결과 통합 + traceability 첨부
 *
 * 실행 순서:
 * - cluster는 먼저 실행 (persona가 재사용)
 * - pathfinder와 roadview는 병렬 실행
 * - 각 엔진의 실패는 다른 엔진에 영향 없음 (독립 실패)
 */

import { SearchConnectorRegistry, resolveSearchData } from "@/lib/search-data";
import type { CollectOptions } from "@/lib/search-data/types";
import type { ClusterFinderResult } from "@/lib/persona-cluster-engine";
import { searchToPathfinder } from "./searchToPathfinderService";
import { searchToRoadView } from "./searchToRoadViewService";
import { searchToCluster } from "./searchToClusterService";
import { searchToPersona } from "./searchToPersonaService";
import { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";
import type {
  SearchIntelligenceRequest,
  SearchIntelligenceResult,
  EngineExecutionResult,
} from "./types";

/**
 * 전체 검색 인텔리전스 분석 실행.
 *
 * 사용 예:
 * ```ts
 * const result = await runSearchIntelligence({
 *   seedKeyword: "화장품 추천",
 *   engines: ["cluster", "persona", "pathfinder", "roadview"],
 * });
 * ```
 */
export async function runSearchIntelligence(
  request: SearchIntelligenceRequest,
): Promise<SearchIntelligenceResult> {
  const startTime = Date.now();
  const engines = request.engines ?? ["cluster", "persona", "pathfinder", "roadview"];

  // ── 1. Registry 초기화 ──
  await SearchConnectorRegistry.initialize();

  // ── 2. 데이터 수집 ──
  const collectOptions: CollectOptions = {
    locale: request.locale ?? "ko",
  };
  const payload = await resolveSearchData(request.seedKeyword, collectOptions);

  // ── 3. trace 생성 ──
  const trace = buildTraceFromPayload(payload, {
    batchId: request.batchId,
    engine: "orchestrator",
  });

  const results: Partial<SearchIntelligenceResult> = {};

  // ── 4. Cluster 먼저 실행 (Persona가 재사용) ──
  let clusterResult: ClusterFinderResult | undefined;
  if (engines.includes("cluster")) {
    const clusterExec = await searchToCluster(payload, {
      ...request.clusterOptions,
      batchId: request.batchId,
    });
    results.cluster = clusterExec;
    if (clusterExec.success && clusterExec.data) {
      clusterResult = clusterExec.data as ClusterFinderResult;
    }
  }

  // ── 5. 나머지 엔진 병렬 실행 ──
  const parallelTasks: Promise<void>[] = [];

  if (engines.includes("persona")) {
    parallelTasks.push(
      searchToPersona(payload, {
        ...request.personaOptions,
        batchId: request.batchId,
        existingClusters: clusterResult,
      }).then((r) => { results.persona = r; }),
    );
  }

  if (engines.includes("pathfinder")) {
    parallelTasks.push(
      searchToPathfinder(payload, {
        ...request.pathfinderOptions,
        batchId: request.batchId,
      }).then((r) => { results.pathfinder = r; }),
    );
  }

  if (engines.includes("roadview")) {
    parallelTasks.push(
      searchToRoadView(payload, {
        endKeyword: request.roadviewOptions?.endKeyword,
        batchId: request.batchId,
      }).then((r) => { results.roadview = r; }),
    );
  }

  await Promise.allSettled(parallelTasks);

  // ── 6. 최종 trace 완성 ──
  const allResults = [results.cluster, results.persona, results.pathfinder, results.roadview]
    .filter(Boolean) as EngineExecutionResult<unknown>[];
  const failedEngines = allResults.filter((r) => !r.success).map((r) => r.engine);
  const additionalWarnings = failedEngines.length > 0
    ? [`${failedEngines.join(", ")} 엔진 실패`]
    : [];

  const finalTrace = finalizeTrace(trace, {
    durationMs: Date.now() - startTime,
    evidenceRefs: allResults.flatMap((r) => r.trace.evidenceRefs),
    additionalWarnings,
  });

  return {
    seedKeyword: request.seedKeyword,
    analyzedAt: finalTrace.analyzedAt,
    completedAt: finalTrace.completedAt!,
    durationMs: Date.now() - startTime,
    payloadSummary: {
      totalRelatedKeywords: payload.relatedKeywords.length,
      hasSerpData: payload.serpDocuments.length > 0,
      hasTrendData: payload.trendSeries.length > 0,
      hasQuestionData:
        payload.serpDocuments.some((d) => d.peopleAlsoAsk.length > 0) ||
        payload.relatedKeywords.some((kw) => kw.sourceType === "paa" || kw.sourceType === "question"),
      sourcesUsed: payload.sources.map((s) => s.source),
    },
    cluster: results.cluster,
    persona: results.persona,
    pathfinder: results.pathfinder,
    roadview: results.roadview,
    trace: finalTrace,
  };
}
