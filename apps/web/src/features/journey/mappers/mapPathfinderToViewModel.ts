/**
 * Pathfinder Engine Output → ViewModel Mapper
 *
 * journey-engine의 PathfinderResult를 프론트엔드 view model로 변환한다.
 * UI 컴포넌트는 엔진 타입을 직접 참조하지 않는다.
 */

import type {
  PathfinderResult,
  JourneyNode,
  JourneyEdge,
  JourneyPath,
} from "@/lib/journey-engine";
import {
  ROAD_STAGE_LABELS,
  ROAD_STAGE_COLORS,
} from "@/lib/journey-engine";
import { INTENT_CATEGORY_LABELS } from "@/lib/intent-engine";
import type {
  PathfinderNodeViewModel,
  PathfinderEdgeViewModel,
  PathfinderPathViewModel,
  PathfinderSummaryViewModel,
  JourneyScreenState,
} from "../types/viewModel";

// ─── 신뢰도 임계값 ──────────────────────────────────────────
const STALE_DATA_HOURS = 24;

// ─── 전환 유형 라벨 ──────────────────────────────────────────
const TRANSITION_LABELS: Record<string, string> = {
  refinement: "정제",
  broadening: "확장",
  pivot: "전환",
  deepening: "심화",
  comparison: "비교",
  action: "행동",
  unknown: "기타",
};

const RELATION_LABELS: Record<string, string> = {
  search_refinement: "검색어 수정",
  search_continuation: "검색 이어하기",
  topic_exploration: "토픽 탐색",
  brand_comparison: "브랜드 비교",
  problem_solution: "문제→해결",
  purchase_journey: "구매 여정",
  serp_overlap: "SERP 공유",
  temporal_transition: "시간적 전환",
  co_search: "함께 검색",
  semantic: "의미적 유사",
};

const PATH_TYPE_LABELS: Record<string, string> = {
  linear: "직선",
  branching: "분기",
  circular: "순환",
  convergent: "수렴",
};

// ═══════════════════════════════════════════════════════════════
// Node Mapping
// ═══════════════════════════════════════════════════════════════

export function mapNodeToViewModel(node: JourneyNode): PathfinderNodeViewModel {
  const intentInfo = INTENT_CATEGORY_LABELS[node.intent];
  const stageLabel = node.stage ? ROAD_STAGE_LABELS[node.stage] : undefined;
  const stageColor = node.stage ? ROAD_STAGE_COLORS[node.stage] : undefined;

  return {
    id: node.id,
    label: node.label,
    nodeType: node.nodeType,
    direction: node.direction,
    depth: node.depth,
    intent: node.intent,
    intentLabel: intentInfo?.label ?? node.intent,
    intentColor: intentInfo?.color ?? "#6b7280",
    stage: node.stage,
    stageLabel,
    stageColor,
    searchVolume: node.searchVolume,
    gapScore: node.gapScore,
    isRising: node.isRising,
    centrality: node.centrality,
    displaySize: node.displaySize,
    confidenceLevel: node.confidenceLevel,
    lowConfidenceFlag: node.confidenceLevel === "low",
    isSeed: node.nodeType === "seed",
  };
}

// ═══════════════════════════════════════════════════════════════
// Edge Mapping
// ═══════════════════════════════════════════════════════════════

export function mapEdgeToViewModel(edge: JourneyEdge): PathfinderEdgeViewModel {
  return {
    id: edge.id,
    fromNodeId: edge.fromNodeId,
    toNodeId: edge.toNodeId,
    relationType: edge.relationType,
    relationLabel: RELATION_LABELS[edge.relationType] ?? edge.relationType,
    transitionType: edge.transitionType,
    transitionLabel: TRANSITION_LABELS[edge.transitionType] ?? edge.transitionType,
    direction: edge.direction,
    weight: edge.weight,
    confidence: edge.confidence,
  };
}

// ═══════════════════════════════════════════════════════════════
// Path Mapping
// ═══════════════════════════════════════════════════════════════

export function mapPathToViewModel(path: JourneyPath): PathfinderPathViewModel {
  const dominantIntentInfo = INTENT_CATEGORY_LABELS[path.dominantIntent];

  return {
    id: path.id,
    pathLabel: path.pathLabel,
    pathType: path.pathType,
    pathTypeLabel: PATH_TYPE_LABELS[path.pathType] ?? path.pathType,
    pathScore: path.pathScore,
    totalSteps: path.totalSteps,
    dominantIntent: path.dominantIntent,
    dominantIntentLabel: dominantIntentInfo?.label ?? path.dominantIntent,
    intentFlow: path.intentFlow,
    steps: path.steps.map((s) => {
      const stepIntentInfo = INTENT_CATEGORY_LABELS[s.intent];
      return {
        stepIndex: s.stepIndex,
        keyword: s.keyword,
        nodeId: s.nodeId,
        direction: s.direction,
        intent: s.intent,
        intentLabel: stepIntentInfo?.label ?? s.intent,
        transitionType: s.transitionType,
        transitionLabel: TRANSITION_LABELS[s.transitionType] ?? s.transitionType,
        transitionWeight: s.transitionWeight,
      };
    }),
  };
}

// ═══════════════════════════════════════════════════════════════
// Full Result Mapping
// ═══════════════════════════════════════════════════════════════

export function mapPathfinderResult(result: PathfinderResult): {
  nodes: PathfinderNodeViewModel[];
  edges: PathfinderEdgeViewModel[];
  paths: PathfinderPathViewModel[];
  summary: PathfinderSummaryViewModel;
  screenState: Partial<JourneyScreenState>;
} {
  const nodes = result.nodes.map(mapNodeToViewModel);
  const edges = result.edges.map(mapEdgeToViewModel);
  const paths = result.paths.map(mapPathToViewModel);

  const lowConfidenceItems = nodes.filter((n) => n.lowConfidenceFlag).length;

  const summary: PathfinderSummaryViewModel = {
    seedKeyword: result.seedKeyword,
    totalNodes: result.summary.totalNodes,
    totalEdges: result.summary.totalEdges,
    totalPaths: result.summary.totalPaths,
    totalClusters: result.summary.totalClusters,
    maxDepth: result.summary.maxDepth,
    avgGapScore: result.summary.avgGapScore,
    topBlueOceans: result.summary.topBlueOceans,
    intentDistribution: Object.entries(result.summary.intentDistribution)
      .filter(([key]) => key !== "unknown")
      .map(([key, count]) => ({
        label: INTENT_CATEGORY_LABELS[key as keyof typeof INTENT_CATEGORY_LABELS]?.label ?? key,
        count,
        color: INTENT_CATEGORY_LABELS[key as keyof typeof INTENT_CATEGORY_LABELS]?.color ?? "#6b7280",
      })),
    stageDistribution: Object.entries(result.summary.stageDistribution)
      .map(([key, count]) => ({
        label: ROAD_STAGE_LABELS[key as keyof typeof ROAD_STAGE_LABELS] ?? key,
        count,
        color: ROAD_STAGE_COLORS[key as keyof typeof ROAD_STAGE_COLORS] ?? "#6b7280",
      })),
  };

  return {
    nodes,
    edges,
    paths,
    summary,
    screenState: {
      isEmpty: nodes.length === 0,
      lowConfidenceItems,
      lastUpdatedAt: result.summary.analyzedAt,
      durationMs: result.summary.durationMs,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Screen State Builder
// ═══════════════════════════════════════════════════════════════

export function buildJourneyScreenState(
  partial: Partial<JourneyScreenState>,
  status: JourneyScreenState["status"],
  errorMessage?: string,
): JourneyScreenState {
  const lastUpdatedAt = partial.lastUpdatedAt;
  const isStale = lastUpdatedAt
    ? Date.now() - new Date(lastUpdatedAt).getTime() > STALE_DATA_HOURS * 60 * 60 * 1000
    : false;

  return {
    status,
    isEmpty: partial.isEmpty ?? false,
    isPartial: partial.isPartial ?? false,
    hasError: status === "error",
    errorMessage,
    lowConfidenceItems: partial.lowConfidenceItems ?? 0,
    staleData: isStale,
    lastUpdatedAt,
    durationMs: partial.durationMs,
    sourceCount: partial.sourceCount,
  };
}
