/**
 * Journey Frontend View Models
 *
 * 엔진 출력(PathfinderResult, RoadViewResult)을 UI 렌더링에 최적화한 형태.
 * UI 컴포넌트는 이 타입만 참조한다.
 */

// ═══════════════════════════════════════════════════════════════
// PathfinderNodeViewModel
// ═══════════════════════════════════════════════════════════════

export type PathfinderNodeViewModel = {
  id: string;
  label: string;
  nodeType: string;
  /** before / seed / after */
  direction: "before" | "seed" | "after";
  /** 시드로부터의 거리 */
  depth: number;
  /** 의도 카테고리 */
  intent: string;
  intentLabel: string;
  intentColor: string;
  /** 로드뷰 스테이지 (선택) */
  stage?: string;
  stageLabel?: string;
  stageColor?: string;
  /** 정량 */
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
  centrality: number;
  /** 시각화 */
  displaySize: number;
  confidenceLevel: "low" | "medium" | "high";
  lowConfidenceFlag: boolean;
  /** 시드 여부 */
  isSeed: boolean;
};

// ═══════════════════════════════════════════════════════════════
// PathfinderEdgeViewModel
// ═══════════════════════════════════════════════════════════════

export type PathfinderEdgeViewModel = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: string;
  relationLabel: string;
  transitionType: string;
  transitionLabel: string;
  direction: string;
  weight: number;
  confidence: number;
};

// ═══════════════════════════════════════════════════════════════
// PathfinderPathViewModel
// ═══════════════════════════════════════════════════════════════

export type PathfinderPathViewModel = {
  id: string;
  pathLabel: string;
  pathType: string;
  pathTypeLabel: string;
  pathScore: number;
  totalSteps: number;
  dominantIntent: string;
  dominantIntentLabel: string;
  intentFlow: string[];
  steps: {
    stepIndex: number;
    keyword: string;
    nodeId: string;
    direction: string;
    intent: string;
    intentLabel: string;
    transitionType: string;
    transitionLabel: string;
    transitionWeight: number;
  }[];
};

// ═══════════════════════════════════════════════════════════════
// PathfinderSummaryViewModel
// ═══════════════════════════════════════════════════════════════

export type PathfinderSummaryViewModel = {
  seedKeyword: string;
  totalNodes: number;
  totalEdges: number;
  totalPaths: number;
  totalClusters: number;
  maxDepth: number;
  avgGapScore: number;
  topBlueOceans: { keyword: string; gapScore: number }[];
  intentDistribution: { label: string; count: number; color: string }[];
  stageDistribution: { label: string; count: number; color: string }[];
};

// ═══════════════════════════════════════════════════════════════
// RoadStageViewModel
// ═══════════════════════════════════════════════════════════════

export type RoadStageViewModel = {
  id: string;
  stageType: string;
  label: string;
  description: string;
  order: number;
  color: string;
  /** 대표 키워드 */
  representativeKeywords: string[];
  /** 지배적 의도 */
  dominantIntent: string;
  dominantIntentLabel: string;
  /** 주요 질문 */
  majorQuestions: string[];
  /** 정량 */
  keywordCount: number;
  avgSearchVolume: number;
  avgGapScore: number;
  /** 다음 스테이지 전환 */
  nextTransition?: {
    toStageLabel: string;
    strength: number;
    reason: string;
    transitionKeywords: string[];
  };
  lowConfidenceFlag: boolean;
};

// ═══════════════════════════════════════════════════════════════
// RoadViewSummaryViewModel
// ═══════════════════════════════════════════════════════════════

export type RoadViewSummaryViewModel = {
  seedKeyword: string;
  endKeyword?: string;
  totalStages: number;
  totalKeywords: number;
  avgGapScore: number;
  dominantJourney: string[];
  topContentGaps: { stageLabel: string; keyword: string; gapScore: number }[];
  topQuestions: string[];
};

// ═══════════════════════════════════════════════════════════════
// BranchPointViewModel
// ═══════════════════════════════════════════════════════════════

export type BranchPointViewModel = {
  stepIndex: number;
  keyword: string;
  dropOffRate: number;
  alternatives: {
    keyword: string;
    weight: number;
    intentLabel: string;
  }[];
};

// ═══════════════════════════════════════════════════════════════
// JourneyScreenState
// ═══════════════════════════════════════════════════════════════

export type JourneyScreenState = {
  status: "idle" | "loading" | "success" | "error";
  isEmpty: boolean;
  isPartial: boolean;
  hasError: boolean;
  errorMessage?: string;
  lowConfidenceItems: number;
  staleData: boolean;
  lastUpdatedAt?: string;
  durationMs?: number;
  sourceCount?: number;
};
