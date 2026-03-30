/**
 * Journey Engine — 핵심 타입 정의
 *
 * 패스파인더(Pathfinder)와 로드뷰(Road View)의 공통 데이터 모델.
 * 기존 intent-engine 타입과 호환되면서, 방향성 있는 검색 여정 분석을 지원한다.
 *
 * Traceability: 모든 노드/엣지/스테이지에 출처(source)를 기록하여
 * "이 데이터가 어디서 왔는가?"를 항상 역추적할 수 있다.
 */

import type {
  IntentCategory,
  SubIntent,
  TemporalPhase,
  SearchJourneyStage,
  IntentGraphData,
} from "../intent-engine/types";

// ─── Re-export for convenience ───────────────────────────────────
export type {
  IntentCategory,
  SubIntent,
  TemporalPhase,
  SearchJourneyStage,
};

// ─── Enums ───────────────────────────────────────────────────────

/** 노드 유형 */
export type JourneyNodeType =
  | "seed" // 시드(중심) 키워드
  | "keyword" // 일반 연관 키워드
  | "question" // 질문형 검색어 (5W1H)
  | "brand" // 브랜드명
  | "topic" // 토픽/클러스터 대표
  | "stage_anchor"; // 스테이지 앵커 (로드뷰용)

/** 노드 데이터의 출처 */
export type NodeSourceType =
  | "google_autocomplete"
  | "google_related"
  | "google_paa" // People Also Ask
  | "naver_autocomplete"
  | "naver_related"
  | "serp_suggestion"
  | "intent_classifier"
  | "cluster_engine"
  | "manual"
  | "mock";

/** 엣지 관계 유형 */
export type EdgeRelationType =
  | "search_refinement" // 검색어 수정 (자동완성 기반)
  | "search_continuation" // 검색 이어하기 (연관 검색어 기반)
  | "topic_exploration" // 토픽 탐색 (PAA 기반)
  | "brand_comparison" // 브랜드 비교 (vs 키워드)
  | "problem_solution" // 문제→해결
  | "purchase_journey" // 구매 여정 전환
  | "serp_overlap" // SERP 결과 공유
  | "temporal_transition" // 시간적 전환 (before→after)
  | "co_search" // 함께 검색된 키워드
  | "semantic"; // 의미적 유사성

/** 엣지 방향 */
export type EdgeDirection = "forward" | "backward" | "bidirectional";

/** 전환 유형 (사용자 행동 관점) */
export type TransitionType =
  | "refinement" // 검색어 정제 (더 구체적으로)
  | "broadening" // 범위 확대 (더 넓게)
  | "pivot" // 방향 전환 (다른 주제로)
  | "deepening" // 심화 (같은 주제 더 깊이)
  | "comparison" // 비교 (대안 탐색)
  | "action" // 행동 전환 (정보→구매)
  | "unknown";

/** 로드뷰 스테이지 유형 */
export type RoadStageType =
  | "awareness" // 인지: "~이란", "~뜻"
  | "interest" // 관심: "~종류", "~추천"
  | "comparison" // 비교: "~vs", "~비교"
  | "decision" // 결정: "~가격", "~구매"
  | "action" // 실행: "~신청", "~주문"
  | "advocacy"; // 옹호: "~후기", "~리뷰"

// ─── Core Data Structures ────────────────────────────────────────

/** 노드 출처 기록 (Traceability) */
export interface NodeSourceRecord {
  type: NodeSourceType;
  parentKeyword: string | null; // 어떤 키워드에서 파생되었는지
  collectedAt: string; // ISO date
  confidence: number; // 0-1
  rawSnippet?: string; // 원본 텍스트 (디버깅용)
}

/** 엣지 출처 기록 */
export interface EdgeSourceRecord {
  type: NodeSourceType;
  confidence: number; // 0-1
  collectedAt: string;
  evidenceKeywords?: string[]; // 근거가 되는 키워드들
}

// ─── JourneyNode ─────────────────────────────────────────────────

export interface JourneyNode {
  /** 유니크 ID */
  id: string;
  /** 검색어 텍스트 */
  label: string;
  /** 소문자/공백 정규화된 키워드 */
  normalizedLabel: string;
  /** 노드 유형 */
  nodeType: JourneyNodeType;

  // === 위치 & 단계 ===
  /** 시드로부터의 거리 (0 = 시드) */
  depth: number;
  /** 시드 기준 방향 */
  direction: "before" | "seed" | "after";
  /** 단계 인덱스 (0~9, 패스파인더 최대 10단계) */
  stepIndex: number;
  /** 로드뷰 스테이지 (선택) */
  stage?: RoadStageType;
  /** 클러스터 ID (선택) */
  clusterId?: string;

  // === 분류 ===
  /** 검색 의도 */
  intent: IntentCategory;
  /** 세부 의도 */
  subIntent?: SubIntent;
  /** 시간적 위상 */
  temporalPhase: TemporalPhase;
  /** 여정 단계 */
  journeyStage?: SearchJourneyStage;

  // === 정량 지표 ===
  /** 월간 검색량 */
  searchVolume: number;
  /** 콘텐츠 갭 점수 (0-100) */
  gapScore: number;
  /** 상승 키워드 여부 */
  isRising: boolean;
  /** 그래프 중심성 (0-1) */
  centrality: number;
  /** 근거 데이터 수 */
  evidenceCount: number;

  // === 출처 추적 ===
  /** 이 노드가 발견된 출처들 */
  sources: NodeSourceRecord[];

  // === 시각화 힌트 ===
  /** 노드 크기 (로그 스케일, 시각화용) */
  displaySize: number;
  /** 신뢰도 수준 (low/medium/high) */
  confidenceLevel: "low" | "medium" | "high";

  // === 확장 메타데이터 ===
  metadata?: Record<string, unknown>;
}

// ─── JourneyEdge ─────────────────────────────────────────────────

export interface JourneyEdge {
  /** 유니크 ID */
  id: string;
  /** 출발 노드 ID */
  fromNodeId: string;
  /** 도착 노드 ID */
  toNodeId: string;

  // === 관계 ===
  /** 관계 유형 */
  relationType: EdgeRelationType;
  /** 방향 */
  direction: EdgeDirection;
  /** 전환 유형 (사용자 행동 관점) */
  transitionType: TransitionType;

  // === 강도 ===
  /** 연결 강도 (0-1) */
  weight: number;
  /** 추정 전환 빈도 */
  frequency?: number;
  /** 신뢰도 (0-1) */
  confidence: number;
  /** 근거 데이터 수 */
  evidenceCount: number;

  // === 출처 추적 ===
  source: EdgeSourceRecord;

  // === 확장 메타데이터 ===
  metadata?: Record<string, unknown>;
}

// ─── JourneyPath ─────────────────────────────────────────────────

/** 하나의 검색 경로 (시퀀스) */
export interface JourneyPath {
  /** 경로 ID */
  id: string;
  /** 시드(중심) 키워드 */
  seedKeyword: string;

  /** 경로를 구성하는 단계들 */
  steps: JourneyPathStep[];

  /** 경로 총 점수 (step weight 합) */
  pathScore: number;
  /** 경로 내 의도 흐름 */
  intentFlow: IntentCategory[];
  /** 경로 유형 */
  pathType: "linear" | "branching" | "circular" | "convergent";
  /** 경로 레이블 (요약) */
  pathLabel: string;
  /** 경로 내 dominant intent */
  dominantIntent: IntentCategory;
  /** 총 단계 수 */
  totalSteps: number;
}

export interface JourneyPathStep {
  /** 단계 인덱스 (0 = 시작) */
  stepIndex: number;
  /** 키워드 */
  keyword: string;
  /** 노드 ID */
  nodeId: string;
  /** 방향 */
  direction: "before" | "seed" | "after";
  /** 이전 단계에서 이 단계로의 전환 강도 */
  transitionWeight: number;
  /** 전환 유형 */
  transitionType: TransitionType;
  /** 이 단계의 의도 */
  intent: IntentCategory;
}

// ─── RoadStage (로드뷰 전용) ─────────────────────────────────────

/** 로드뷰의 하나의 스테이지 */
export interface RoadStage {
  /** 스테이지 ID */
  id: string;
  /** 스테이지 유형 */
  stageType: RoadStageType;
  /** 스테이지 라벨 (한국어) */
  label: string;
  /** 스테이지 설명 */
  description: string;
  /** 스테이지 순서 (0 = 첫 번째) */
  order: number;

  // === 콘텐츠 ===
  /** 대표 키워드 (상위 10개) */
  representativeKeywords: string[];
  /** 이 스테이지의 지배적 의도 */
  dominantIntent: IntentCategory;
  /** 이 스테이지의 주요 질문들 */
  majorQuestions: string[];
  /** 관련 클러스터 ID들 */
  relatedClusterIds: string[];

  // === 정량 ===
  /** 스테이지에 속한 키워드 수 */
  keywordCount: number;
  /** 평균 검색량 */
  avgSearchVolume: number;
  /** 평균 갭 점수 */
  avgGapScore: number;

  // === 전환 ===
  /** 다음 스테이지로의 전환 정보 */
  nextTransition?: StageTransition;

  // === 출처 추적 ===
  /** 이 스테이지의 근거 노드 ID들 */
  evidenceNodeIds: string[];
}

export interface StageTransition {
  /** 다음 스테이지 ID */
  toStageId: string;
  /** 전환 강도 (0-1) */
  strength: number;
  /** 전환 이유/맥락 */
  reason: string;
  /** 전환 시 dominant intent 변화 */
  intentShift: {
    from: IntentCategory;
    to: IntentCategory;
  };
  /** 전환에 관련된 키워드들 */
  transitionKeywords: string[];
}

// ─── 분기점 분석 (로드뷰 전용) ───────────────────────────────────

export interface BranchPoint {
  /** 분기가 발생하는 단계 인덱스 */
  stepIndex: number;
  /** 분기 키워드 */
  keyword: string;
  /** 대안 경로들 */
  alternatives: {
    keyword: string;
    weight: number;
    intent: IntentCategory;
  }[];
  /** 이탈률 추정 (0-1) */
  dropOffRate: number;
}

// ─── 엔진 입출력 타입 ────────────────────────────────────────────

/** 패스파인더 요청 */
export interface PathfinderRequest {
  seedKeyword: string;
  maxSteps: number; // 1~10, 기본 5
  maxNodes: number; // 최대 1000
  direction: "both" | "before" | "after";
  locale?: string;
  /** 기존 intent-engine 분석 결과 (있으면 재사용) */
  existingAnalysis?: IntentGraphData;
}

/** 패스파인더 결과 */
export interface PathfinderResult {
  seedKeyword: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  paths: JourneyPath[];
  clusters: PathfinderCluster[];
  summary: PathfinderSummary;
  /** 분석 추적 정보 */
  trace: AnalysisTrace;
}

export interface PathfinderCluster {
  id: string;
  label: string;
  keywords: string[];
  nodeIds: string[];
  dominantIntent: IntentCategory;
  avgGapScore: number;
  size: number;
}

export interface PathfinderSummary {
  totalNodes: number;
  totalEdges: number;
  totalPaths: number;
  totalClusters: number;
  maxDepth: number;
  avgGapScore: number;
  topBlueOceans: { keyword: string; gapScore: number }[];
  topBranchPoints: BranchPoint[];
  intentDistribution: Record<IntentCategory, number>;
  stageDistribution: Record<RoadStageType, number>;
  analyzedAt: string;
  durationMs: number;
}

/** 로드뷰 요청 */
export interface RoadViewRequest {
  seedKeyword: string;
  /** 종료 키워드 (선택 — 있으면 A→B 경로 분석) */
  endKeyword?: string;
  locale?: string;
  /** 기존 패스파인더 결과 (있으면 재사용) */
  existingPathfinder?: PathfinderResult;
  /** 기존 intent-engine 분석 결과 */
  existingAnalysis?: IntentGraphData;
}

/** 로드뷰 결과 */
export interface RoadViewResult {
  seedKeyword: string;
  endKeyword?: string;

  /** 스테이지 목록 (순서대로) */
  stages: RoadStage[];
  /** 주 경로 (A→B 모드일 때) */
  primaryPath?: JourneyPath;
  /** 대안 경로들 (최대 5개) */
  alternativePaths?: JourneyPath[];
  /** 분기점 분석 */
  branchPoints: BranchPoint[];
  /** 요약 */
  summary: RoadViewSummary;
  /** 분석 추적 정보 */
  trace: AnalysisTrace;
}

export interface RoadViewSummary {
  totalStages: number;
  totalKeywords: number;
  dominantJourney: RoadStageType[];
  avgGapScore: number;
  topContentGaps: { stage: RoadStageType; keyword: string; gapScore: number }[];
  topQuestions: string[];
  analyzedAt: string;
  durationMs: number;
}

// ─── 분석 추적 ───────────────────────────────────────────────────

export interface AnalysisTrace {
  analysisId: string;
  startedAt: string;
  completedAt: string;
  stages: AnalysisTraceStage[];
  dataSources: {
    source: string;
    callCount: number;
    cacheHitRate: number;
    avgLatencyMs: number;
  }[];
}

export interface AnalysisTraceStage {
  name: string;
  startedAt: string;
  completedAt: string;
  inputCount: number;
  outputCount: number;
  apiCallCount: number;
  cacheHitCount: number;
  errorCount: number;
}

// ─── 로드뷰 스테이지 상수 ────────────────────────────────────────

export const ROAD_STAGE_LABELS: Record<RoadStageType, string> = {
  awareness: "인지",
  interest: "관심",
  comparison: "비교",
  decision: "결정",
  action: "실행",
  advocacy: "옹호",
};

export const ROAD_STAGE_COLORS: Record<RoadStageType, string> = {
  awareness: "#8b5cf6", // purple
  interest: "#3b82f6", // blue
  comparison: "#f59e0b", // amber
  decision: "#10b981", // green
  action: "#ef4444", // red
  advocacy: "#06b6d4", // cyan
};

export const ROAD_STAGE_ORDER: RoadStageType[] = [
  "awareness",
  "interest",
  "comparison",
  "decision",
  "action",
  "advocacy",
];

/** 의도 카테고리 → 로드뷰 스테이지 매핑 */
export const INTENT_TO_STAGE: Record<IntentCategory, RoadStageType> = {
  discovery: "awareness",
  comparison: "comparison",
  action: "action",
  troubleshooting: "decision",
  unknown: "interest",
};

/** 서브인텐트 → 로드뷰 스테이지 (더 정밀한 매핑) */
export const SUBINTENT_TO_STAGE: Partial<Record<SubIntent, RoadStageType>> = {
  definition: "awareness",
  how_to: "interest",
  list: "interest",
  review: "comparison",
  versus: "comparison",
  price: "decision",
  purchase: "action",
  signup: "action",
  error_fix: "advocacy",
  refund: "advocacy",
  alternative: "comparison",
  trend: "awareness",
  experience: "advocacy",
  tutorial: "interest",
};
