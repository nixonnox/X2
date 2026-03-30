/**
 * Persona / Cluster Frontend View Models
 *
 * 엔진 출력(PersonaProfile, IntentCluster)을 UI 렌더링에 최적화한 형태.
 * UI 컴포넌트는 이 타입만 참조한다.
 */

// ═══════════════════════════════════════════════════════════════
// PersonaViewModel
// ═══════════════════════════════════════════════════════════════

export type PersonaViewModel = {
  id: string;
  label: string;
  description: string;
  archetype: string;
  mindset: string;
  dominantIntent: string;
  dominantIntentLabel: string;
  dominantTopics: string[];
  typicalQuestions: string[];
  representativeKeywords: string[];
  likelyStage: string;
  likelyStageLabel: string;
  traits: { axis: string; label: string; value: number }[];
  contentStrategy: string;
  messagingAngle: string;
  summary: string;
  percentage: number;
  confidence: number;
  relatedClusterCount: number;
  lowConfidenceFlag: boolean;
};

// ═══════════════════════════════════════════════════════════════
// ClusterViewModel
// ═══════════════════════════════════════════════════════════════

export type ClusterViewModel = {
  id: string;
  label: string;
  description: string;
  category: string;
  categoryLabel: string;
  dominantIntent: string;
  dominantIntentLabel: string;
  dominantPhase: string;
  dominantStage: string;
  representativeKeywords: string[];
  representativeQuestions: string[];
  themes: string[];
  memberCount: number;
  score: number;
  avgGapScore: number;
  avgSearchVolume: number;
  risingCount: number;
  relatedPersonaCount: number;
  lowConfidenceFlag: boolean;
  members: ClusterMemberViewModel[];
};

export type ClusterMemberViewModel = {
  id: string;
  label: string;
  type: string;
  intent: string;
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
  membershipScore: number;
};

// ═══════════════════════════════════════════════════════════════
// Screen State
// ═══════════════════════════════════════════════════════════════

export type PersonaClusterScreenState = {
  status: "idle" | "loading" | "success" | "error";
  /** 결과는 있지만 비어있음 */
  isEmpty: boolean;
  /** 일부 데이터만 수집됨 (어댑터 부분 실패) */
  isPartial: boolean;
  /** 에러 발생 */
  hasError: boolean;
  errorMessage?: string;
  /** 신뢰도 낮은 항목 존재 */
  lowConfidenceItems: number;
  /** 데이터가 오래됨 */
  staleData: boolean;
  /** 마지막 분석 시점 */
  lastUpdatedAt?: string;
  /** 분석 소요 시간 */
  durationMs?: number;
  /** 사용된 데이터 소스 수 */
  sourceCount?: number;
};

// ═══════════════════════════════════════════════════════════════
// Summary View Models
// ═══════════════════════════════════════════════════════════════

export type ClusterSummaryViewModel = {
  seedKeyword: string;
  totalClusters: number;
  totalKeywords: number;
  avgClusterSize: number;
  avgGapScore: number;
  topCategories: { label: string; count: number }[];
  intentDistribution: { label: string; count: number; color: string }[];
};

export type PersonaSummaryViewModel = {
  seedKeyword: string;
  totalPersonas: number;
  totalClusters: number;
  totalKeywords: number;
  dominantArchetypeLabel: string;
  archetypeDistribution: { label: string; count: number }[];
  stageDistribution: { label: string; count: number }[];
};
