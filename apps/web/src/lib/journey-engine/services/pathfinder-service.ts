/**
 * Pathfinder Service
 *
 * 패스파인더 분석의 진입점.
 * 기존 intent-engine과 연동하여 검색 여정 그래프를 생성한다.
 *
 * 동작 흐름:
 * 1. 기존 intent-engine으로 키워드 확장 + 의도 분류 + 그래프 빌드
 * 2. journey-graph-builder로 JourneyNode/Edge 변환
 * 3. stage-inference로 로드뷰 스테이지 추론
 * 4. transition-builder로 전환 분석
 *
 * Phase 3(SERP 엔진) 이후에는 SERP 데이터를 직접 활용하는
 * 별도 파이프라인이 추가될 예정.
 */

import type {
  PathfinderRequest,
  PathfinderResult,
  RoadViewRequest,
  RoadViewResult,
  JourneyPath,
  BranchPoint,
} from "../types";
import type { IntentGraphData } from "../../intent-engine/types";
import { buildPathfinderFromIntentGraph } from "../graph/journey-graph-builder";
import { buildRoadStages } from "../builders/stage-inference";

// ─── Pathfinder ──────────────────────────────────────────────────

/**
 * 패스파인더 분석 실행
 *
 * @param request - 분석 요청 (seedKeyword, maxSteps, maxNodes, direction)
 * @param intentData - 기존 intent-engine 분석 결과 (없으면 내부에서 호출)
 */
export async function analyzePathfinder(
  request: PathfinderRequest,
  intentData?: IntentGraphData,
): Promise<PathfinderResult> {
  // 1. 기존 intent-engine 결과가 없으면 호출
  let igData = intentData || request.existingAnalysis;

  if (!igData) {
    // intent-engine 직접 호출 (동적 import로 순환 참조 방지)
    const { intentAnalysisService } = await import(
      "../../intent-engine/service"
    );
    igData = await intentAnalysisService.analyze({
      seedKeyword: request.seedKeyword,
      maxDepth: Math.min(request.maxSteps, 3), // intent-engine은 최대 3
      maxKeywords: request.maxNodes,
      platforms: [],
    });
  }

  // 2. IntentGraphData → PathfinderResult 변환
  const result = buildPathfinderFromIntentGraph(igData, request);

  return result;
}

// ─── Road View ───────────────────────────────────────────────────

/**
 * 로드뷰 분석 실행
 *
 * 패스파인더 결과를 기반으로 6단계 소비자 결정 여정을 구성한다.
 * endKeyword가 있으면 A→B 방향성 경로 분석도 수행한다.
 */
export async function analyzeRoadView(
  request: RoadViewRequest,
): Promise<RoadViewResult> {
  const startTime = Date.now();

  // 1. 패스파인더 결과 얻기
  let pfResult = request.existingPathfinder;

  if (!pfResult) {
    pfResult = await analyzePathfinder(
      {
        seedKeyword: request.seedKeyword,
        maxSteps: 5,
        maxNodes: 300,
        direction: "both",
        existingAnalysis: request.existingAnalysis,
      },
      request.existingAnalysis,
    );
  }

  // 2. 로드 스테이지 구축
  const stages = buildRoadStages(pfResult.nodes, pfResult.edges);

  // 3. A→B 경로 분석 (endKeyword가 있을 때)
  let primaryPath: JourneyPath | undefined;
  let alternativePaths: JourneyPath[] | undefined;
  let branchPoints: BranchPoint[] = pfResult.summary.topBranchPoints;

  if (request.endKeyword) {
    const directed = findDirectedPaths(
      request.seedKeyword,
      request.endKeyword,
      pfResult,
    );
    primaryPath = directed.primary;
    alternativePaths = directed.alternatives;
    branchPoints = directed.branchPoints;
  }

  // 4. 요약 생성
  const allKeywords = stages.flatMap((s) => s.representativeKeywords);
  const topQuestions = stages.flatMap((s) => s.majorQuestions).slice(0, 10);
  const topContentGaps = stages
    .filter((s) => s.avgGapScore > 50)
    .flatMap((s) =>
      s.representativeKeywords.slice(0, 2).map((kw) => ({
        stage: s.stageType,
        keyword: kw,
        gapScore: s.avgGapScore,
      })),
    )
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 5);

  return {
    seedKeyword: request.seedKeyword,
    endKeyword: request.endKeyword,
    stages,
    primaryPath,
    alternativePaths,
    branchPoints,
    summary: {
      totalStages: stages.length,
      totalKeywords: allKeywords.length,
      dominantJourney: stages.map((s) => s.stageType),
      avgGapScore: pfResult.summary.avgGapScore,
      topContentGaps,
      topQuestions,
      analyzedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
    trace: {
      ...pfResult.trace,
      analysisId: `rv-${Date.now()}`,
    },
  };
}

// ─── A→B 방향성 경로 탐색 ────────────────────────────────────────

/**
 * 시작 키워드에서 끝 키워드로의 방향성 경로를 탐색한다.
 *
 * 현재 구현: 패스파인더 경로 중 endKeyword를 포함하는 경로 필터링
 * Phase 3 이후: SERP 데이터 기반 BFS + K-shortest paths
 */
function findDirectedPaths(
  startKeyword: string,
  endKeyword: string,
  pfResult: PathfinderResult,
): {
  primary: JourneyPath | undefined;
  alternatives: JourneyPath[];
  branchPoints: BranchPoint[];
} {
  const endNorm = endKeyword.toLowerCase().trim();

  // endKeyword를 포함하는 경로 찾기
  const matchingPaths = pfResult.paths.filter((path) =>
    path.steps.some((step) =>
      step.keyword.toLowerCase().trim().includes(endNorm) ||
      endNorm.includes(step.keyword.toLowerCase().trim()),
    ),
  );

  if (matchingPaths.length > 0) {
    return {
      primary: matchingPaths[0],
      alternatives: matchingPaths.slice(1, 5),
      branchPoints: pfResult.summary.topBranchPoints,
    };
  }

  // 직접 매칭이 없으면, 가장 점수 높은 경로를 primary로
  return {
    primary: pfResult.paths[0],
    alternatives: pfResult.paths.slice(1, 5),
    branchPoints: pfResult.summary.topBranchPoints,
  };
}
