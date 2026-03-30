/**
 * Persona-Cluster Engine — 핵심 타입 정의
 *
 * 페르소나 뷰(Persona View)와 클러스터 파인더(Cluster Finder)의 공통 데이터 모델.
 * 기존 intent-engine/journey-engine 타입과 호환되며,
 * "검색/탐색 맥락 기반 persona archetype"을 추론한다.
 *
 * 핵심 원칙:
 * - 실제 개인 식별이 아닌, 검색 행동 기반 archetype
 * - stage / intent / question / topic / cluster를 조합
 * - 마케팅 메시지/콘텐츠 전략에 바로 활용 가능
 */

import type {
  IntentCategory,
  SubIntent,
  TemporalPhase,
} from "../intent-engine/types";
import type { RoadStageType } from "../journey-engine/types";

// ─── Re-export ──────────────────────────────────────────────
export type { IntentCategory, SubIntent, TemporalPhase, RoadStageType };

// ═══════════════════════════════════════════════════════════════
// 1. IntentCluster — 강화된 클러스터 구조
// ═══════════════════════════════════════════════════════════════

/** 클러스터링 방법 */
export type ClusterMethod =
  | "intent_phase"       // intent + temporalPhase 기반 (기존 Louvain)
  | "semantic"           // 의미적 유사도 기반
  | "question"           // 질문형 키워드 클러스터
  | "behavior"           // 검색 행동 패턴 기반
  | "hybrid";            // 복합

/** 클러스터 유형 */
export type ClusterCategory =
  | "exploratory"        // 입문형 탐색
  | "comparative"        // 비교/검토형
  | "price_sensitive"    // 가격 민감형
  | "problem_solving"    // 문제 해결형
  | "recommendation"     // 추천 탐색형
  | "action_oriented"    // 행동/실행형
  | "experience"         // 경험/후기형
  | "general";           // 일반

export type IntentCluster = {
  id: string;
  label: string;                          // 자동 생성 또는 LLM 생성 라벨
  description: string;                    // 클러스터 설명
  category: ClusterCategory;              // 클러스터 유형
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  dominantStage: RoadStageType;           // 6단계 여정 스테이지
  memberCount: number;
  representativeKeywords: string[];       // 상위 10개 대표 키워드
  representativeQuestions: string[];       // 상위 5개 대표 질문
  allKeywords: string[];                  // 전체 멤버 키워드
  centroid: string;                       // 중심 키워드
  avgGapScore: number;
  avgSearchVolume: number;
  avgDifficultyScore: number;
  risingCount: number;                    // 급상승 키워드 수
  score: number;                          // 클러스터 종합 점수 (0-100)
  clusterMethod: ClusterMethod;
  themes: string[];                       // 주요 테마/토픽 (최대 5개)
  metadata: {
    intentDistribution: Record<IntentCategory, number>;
    phaseDistribution: Record<TemporalPhase, number>;
    stageDistribution: Partial<Record<RoadStageType, number>>;
    topSubIntents: { subIntent: SubIntent; count: number }[];
    createdAt: string;
  };
};

// ═══════════════════════════════════════════════════════════════
// 2. PersonaProfile — 검색 행동 기반 페르소나
// ═══════════════════════════════════════════════════════════════

/** 페르소나 아키타입 */
export type PersonaArchetype =
  | "information_seeker"     // 정보 탐색 입문형
  | "price_comparator"       // 가격 비교 신중형
  | "review_validator"       // 후기 검증 실속형
  | "problem_solver"         // 문제 해결 긴급형
  | "recommendation_seeker"  // 추천 탐색 확신형
  | "trend_follower"         // 트렌드 추종형
  | "action_taker"           // 즉시 실행형
  | "experience_sharer";     // 경험 공유형

/** 페르소나 마인드셋 */
export type PersonaMindset =
  | "curious"          // 궁금한
  | "cautious"         // 신중한
  | "urgent"           // 급한
  | "analytical"       // 분석적인
  | "decisive"         // 결단력 있는
  | "frustrated"       // 불만족한
  | "enthusiastic";    // 열정적인

/** 페르소나 특성 축 (레이더 차트용) */
export type PersonaTraitAxis =
  | "information_need"     // 정보 니즈
  | "comparison_tendency"  // 비교 성향
  | "action_willingness"   // 행동 의지
  | "problem_awareness"    // 문제 의식
  | "price_sensitivity"    // 가격 민감도
  | "trend_interest";      // 트렌드 관심

export type PersonaTrait = {
  axis: PersonaTraitAxis;
  label: string;
  value: number;  // 0-100
};

export type PersonaProfile = {
  id: string;
  label: string;                            // 한국어 라벨 ("정보 탐색 입문형")
  description: string;                      // 1-2문장 설명
  archetype: PersonaArchetype;
  mindset: PersonaMindset;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  dominantStage: RoadStageType;
  dominantTopics: string[];                 // 핵심 관심 주제 (최대 5개)
  typicalQuestions: string[];               // 대표 질문 (최대 5개)
  representativeKeywords: string[];         // 대표 키워드 (최대 15개)
  likelyStage: RoadStageType;              // 여정에서의 위치
  traits: PersonaTrait[];                   // 6축 레이더 차트 데이터
  relatedClusterIds: string[];             // 연관 클러스터 ID
  contentStrategy: string;                  // 추천 콘텐츠 전략
  messagingAngle: string;                   // 추천 메시지 각도
  percentage: number;                       // 전체 중 비중 (0-100)
  confidence: number;                       // 추론 신뢰도 (0-1)
  summary: string;                          // LLM 또는 규칙 기반 요약
  metadata: {
    sourceClusterCount: number;
    totalKeywordCount: number;
    avgGapScore: number;
    avgSearchVolume: number;
    createdAt: string;
  };
};

// ═══════════════════════════════════════════════════════════════
// 3. ClusterMembership — 클러스터 소속 관계
// ═══════════════════════════════════════════════════════════════

export type ClusterMemberType = "keyword" | "question" | "topic" | "brand";

export type ClusterMembership = {
  itemId: string;            // 키워드 또는 노드 ID
  itemLabel: string;         // 키워드 텍스트
  itemType: ClusterMemberType;
  clusterId: string;
  membershipScore: number;   // 소속 강도 (0-1)
  intent: IntentCategory;
  phase: TemporalPhase;
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
};

// ═══════════════════════════════════════════════════════════════
// 4. PersonaClusterLink — 페르소나-클러스터 연결
// ═══════════════════════════════════════════════════════════════

export type PersonaClusterLink = {
  personaId: string;
  clusterId: string;
  relevanceScore: number;    // 연관 강도 (0-1)
  sharedKeywordCount: number;
  sharedIntentMatch: boolean;
  sharedPhaseMatch: boolean;
};

// ═══════════════════════════════════════════════════════════════
// 5. PersonaJourneyLink — 페르소나-여정 연결
// ═══════════════════════════════════════════════════════════════

export type PersonaJourneyLink = {
  personaId: string;
  stage: RoadStageType;
  relevanceScore: number;    // 0-1
  keywordCount: number;      // 해당 스테이지의 키워드 수
  dominantIntent: IntentCategory;
};

// ═══════════════════════════════════════════════════════════════
// 6. Request / Response 타입
// ═══════════════════════════════════════════════════════════════

export type ClusterFinderRequest = {
  seedKeyword: string;
  maxClusters?: number;          // 기본 20
  minClusterSize?: number;       // 기본 3
  clusterMethod?: ClusterMethod; // 기본 "intent_phase"
  includeQuestions?: boolean;    // 질문형 분리 여부
  useLLM?: boolean;              // LLM 라벨링 사용 여부
  existingAnalysis?: import("../intent-engine/types").IntentGraphData;
};

export type ClusterFinderResult = {
  seedKeyword: string;
  clusters: IntentCluster[];
  memberships: ClusterMembership[];
  summary: ClusterFinderSummary;
  trace: AnalysisTrace;
};

export type ClusterFinderSummary = {
  totalClusters: number;
  totalKeywords: number;
  avgClusterSize: number;
  topCategories: { category: ClusterCategory; count: number }[];
  intentDistribution: Record<IntentCategory, number>;
  avgGapScore: number;
  analyzedAt: string;
  durationMs: number;
};

export type PersonaViewRequest = {
  seedKeyword: string;
  maxPersonas?: number;          // 기본 6
  useLLM?: boolean;              // LLM 요약 사용 여부
  existingAnalysis?: import("../intent-engine/types").IntentGraphData;
  existingClusters?: ClusterFinderResult;
};

export type PersonaViewResult = {
  seedKeyword: string;
  personas: PersonaProfile[];
  personaClusterLinks: PersonaClusterLink[];
  personaJourneyLinks: PersonaJourneyLink[];
  summary: PersonaViewSummary;
  trace: AnalysisTrace;
};

export type PersonaViewSummary = {
  totalPersonas: number;
  totalClusters: number;
  totalKeywords: number;
  dominantArchetype: PersonaArchetype;
  archetypeDistribution: Partial<Record<PersonaArchetype, number>>;
  stageDistribution: Partial<Record<RoadStageType, number>>;
  analyzedAt: string;
  durationMs: number;
};

// ═══════════════════════════════════════════════════════════════
// 7. Traceability
// ═══════════════════════════════════════════════════════════════

export type AnalysisTrace = {
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
};

export type AnalysisTraceStage = {
  name: string;
  startedAt: string;
  completedAt: string;
  inputCount: number;
  outputCount: number;
  apiCallCount: number;
  cacheHitCount: number;
  errorCount: number;
};

// ═══════════════════════════════════════════════════════════════
// 8. Constants
// ═══════════════════════════════════════════════════════════════

/** 페르소나 아키타입 라벨 */
export const PERSONA_ARCHETYPE_LABELS: Record<
  PersonaArchetype,
  { label: string; labelEn: string; color: string; icon: string }
> = {
  information_seeker:    { label: "정보 탐색 입문형",  labelEn: "Information Seeker",    color: "#3b82f6", icon: "Search" },
  price_comparator:      { label: "가격 비교 신중형",  labelEn: "Price Comparator",      color: "#f59e0b", icon: "Scale" },
  review_validator:      { label: "후기 검증 실속형",  labelEn: "Review Validator",      color: "#10b981", icon: "CheckCircle" },
  problem_solver:        { label: "문제 해결 긴급형",  labelEn: "Problem Solver",        color: "#ef4444", icon: "Wrench" },
  recommendation_seeker: { label: "추천 탐색 확신형",  labelEn: "Recommendation Seeker", color: "#8b5cf6", icon: "ThumbsUp" },
  trend_follower:        { label: "트렌드 추종형",    labelEn: "Trend Follower",        color: "#ec4899", icon: "TrendingUp" },
  action_taker:          { label: "즉시 실행형",      labelEn: "Action Taker",          color: "#06b6d4", icon: "Zap" },
  experience_sharer:     { label: "경험 공유형",      labelEn: "Experience Sharer",     color: "#84cc16", icon: "MessageCircle" },
};

/** 클러스터 카테고리 라벨 */
export const CLUSTER_CATEGORY_LABELS: Record<
  ClusterCategory,
  { label: string; labelEn: string; color: string }
> = {
  exploratory:      { label: "입문형 탐색",    labelEn: "Exploratory",      color: "#3b82f6" },
  comparative:      { label: "비교/검토형",    labelEn: "Comparative",      color: "#f59e0b" },
  price_sensitive:  { label: "가격 민감형",    labelEn: "Price Sensitive",  color: "#ef4444" },
  problem_solving:  { label: "문제 해결형",    labelEn: "Problem Solving",  color: "#dc2626" },
  recommendation:   { label: "추천 탐색형",    labelEn: "Recommendation",   color: "#8b5cf6" },
  action_oriented:  { label: "행동/실행형",    labelEn: "Action Oriented",  color: "#10b981" },
  experience:       { label: "경험/후기형",    labelEn: "Experience",       color: "#84cc16" },
  general:          { label: "일반",          labelEn: "General",          color: "#6b7280" },
};

/** 페르소나 특성 라벨 */
export const PERSONA_TRAIT_LABELS: Record<PersonaTraitAxis, string> = {
  information_need:     "정보 니즈",
  comparison_tendency:  "비교 성향",
  action_willingness:   "행동 의지",
  problem_awareness:    "문제 의식",
  price_sensitivity:    "가격 민감도",
  trend_interest:       "트렌드 관심",
};

/** 페르소나 마인드셋 라벨 */
export const PERSONA_MINDSET_LABELS: Record<PersonaMindset, string> = {
  curious:       "궁금한",
  cautious:      "신중한",
  urgent:        "급한",
  analytical:    "분석적인",
  decisive:      "결단력 있는",
  frustrated:    "불만족한",
  enthusiastic:  "열정적인",
};

/** Intent → 기본 Archetype 매핑 */
export const INTENT_TO_ARCHETYPE: Record<IntentCategory, PersonaArchetype> = {
  discovery:        "information_seeker",
  comparison:       "price_comparator",
  action:           "action_taker",
  troubleshooting:  "problem_solver",
  unknown:          "information_seeker",
};

/** SubIntent → 세밀한 Archetype 매핑 */
export const SUBINTENT_TO_ARCHETYPE: Partial<Record<SubIntent, PersonaArchetype>> = {
  definition:   "information_seeker",
  how_to:       "information_seeker",
  tutorial:     "information_seeker",
  list:         "recommendation_seeker",
  review:       "review_validator",
  versus:       "price_comparator",
  price:        "price_comparator",
  purchase:     "action_taker",
  signup:       "action_taker",
  error_fix:    "problem_solver",
  refund:       "problem_solver",
  alternative:  "recommendation_seeker",
  trend:        "trend_follower",
  experience:   "experience_sharer",
};

/** Archetype → 기본 Mindset */
export const ARCHETYPE_TO_MINDSET: Record<PersonaArchetype, PersonaMindset> = {
  information_seeker:    "curious",
  price_comparator:      "cautious",
  review_validator:      "analytical",
  problem_solver:        "urgent",
  recommendation_seeker: "enthusiastic",
  trend_follower:        "enthusiastic",
  action_taker:          "decisive",
  experience_sharer:     "enthusiastic",
};

/** Intent+Phase → ClusterCategory 매핑 */
export const INTENT_PHASE_TO_CLUSTER_CATEGORY: Record<string, ClusterCategory> = {
  "discovery:before":        "exploratory",
  "discovery:current":       "exploratory",
  "discovery:after":         "experience",
  "comparison:before":       "comparative",
  "comparison:current":      "comparative",
  "comparison:after":        "experience",
  "action:before":           "price_sensitive",
  "action:current":          "action_oriented",
  "action:after":            "experience",
  "troubleshooting:before":  "problem_solving",
  "troubleshooting:current": "problem_solving",
  "troubleshooting:after":   "problem_solving",
  "unknown:before":          "general",
  "unknown:current":         "general",
  "unknown:after":           "general",
};
