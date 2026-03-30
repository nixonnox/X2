/**
 * PT Deck Generation Types
 *
 * 광고주/PT 발표용 출력 모델.
 * "데이터 설명 문서"가 아니라 "의사결정을 설득하는 문서"를 위한 구조.
 *
 * 기존 documents/types.ts의 PtSlideBlock과 달리:
 * - keyMessage 필수 (장표마다 "한 줄 메시지")
 * - recommendedVisualType (시각화 힌트 확장)
 * - 소셜/댓글/GEO/인플루언서 결합 포인트
 * - 문제 정의 → 기회 → 전략 → 실행 → 기대효과 흐름
 */

// ─── PT Deck 유형 ────────────────────────────────────────────────────

export type PtDeckType =
  | "ADVERTISER_PROPOSAL" // 광고주 제안 PT
  | "CAMPAIGN_STRATEGY" // 캠페인 전략 PT
  | "COMPETITIVE_ANALYSIS" // 경쟁 분석 PT
  | "GEO_AEO_STRATEGY" // GEO/AEO 전략 PT
  | "INFLUENCER_COLLABORATION" // 인플루언서 연계 PT
  | "INTERNAL_STRATEGY"; // 내부 전략 보고

export type PtAudience = "ADVERTISER" | "EXECUTIVE" | "INTERNAL" | "MARKETER";

// ─── 장표 유형 (10종 + 확장) ──────────────────────────────────────────

export type PtSlideType =
  | "EXECUTIVE_SUMMARY" // 한 장 요약
  | "PROBLEM_DEFINITION" // 문제/과제 정의
  | "OPPORTUNITY" // 기회 발견
  | "PATHFINDER" // 탐색 경로 분석
  | "ROADVIEW" // 여정 단계 분석
  | "PERSONA" // 고객 archetype
  | "CLUSTER" // 주요 관심/질문 묶음
  | "SOCIAL_INSIGHT" // 소셜/댓글 연결 인사이트
  | "COMPETITIVE_GAP" // 경쟁 분석/갭
  | "GEO_AEO" // AI 검색 최적화
  | "STRATEGY" // 전략 제안
  | "ACTION" // 실행 액션
  | "EXPECTED_IMPACT" // 기대 효과
  | "EVIDENCE" // 근거/부록
  | "TITLE" // 표지
  | "CLOSING"; // 마무리

// ─── 시각화 유형 ──────────────────────────────────────────────────────

export type RecommendedVisualType =
  | "line_chart"
  | "trend_bar"
  | "path_graph"
  | "stage_flow"
  | "persona_cards"
  | "cluster_board"
  | "comparison_table"
  | "evidence_panel"
  | "executive_summary_card"
  | "funnel_chart"
  | "heatmap"
  | "quote_highlight"
  | "metric_dashboard"
  | "none";

// ─── Evidence / Source Refs (documents 타입과 호환) ────────────────────

export type EvidenceRef = {
  evidenceId: string;
  category: string;
  label: string;
  snippet?: string;
  dataSourceType?: string;
  entityIds?: string[];
};

export type SourceRef = {
  sourceId: string;
  sourceName: string;
  sourceType:
    | "SEARCH_ENGINE"
    | "ANALYTICS"
    | "SOCIAL"
    | "AEO_SNAPSHOT"
    | "INTERNAL"
    | "CITATION";
  url?: string;
  domain?: string;
  trustScore?: number;
  citationReady?: boolean;
};

// ─── Quality Metadata ─────────────────────────────────────────────────

export type PtQualityMeta = {
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// ─── 1. PtSlideBlock (장표 단위) ──────────────────────────────────────

export type PtSlideBlock = {
  id: string;
  slideType: PtSlideType;
  /** 짧고 명확한 헤드라인 */
  headline: string;
  /** 보조 설명 (1줄) */
  subHeadline?: string;
  /** 이 장표의 핵심 메시지 — "그래서 무엇이 중요한가" */
  keyMessage: string;
  /** 핵심 포인트 (3~5개 이내) */
  supportingPoints: string[];
  /** 근거 연결 */
  evidenceRefs: EvidenceRef[];
  /** 출처 연결 */
  sourceRefs: SourceRef[];
  /** 시각화 추천 유형 */
  recommendedVisualType: RecommendedVisualType;
  /** 발표자 노트 */
  speakerNote?: string;
  /** 품질 메타데이터 */
  quality: PtQualityMeta;
  /** 순서 */
  order: number;
};

// ─── 2. PtNarrative (전체 스토리라인) ─────────────────────────────────

export type PtNarrative = {
  /** 전체 프레젠테이션의 스토리라인 요약 */
  overallStoryline: string;
  /** 핵심 전략 메시지 (1~2줄) */
  strategicMessage: string;
  /** 상위 인사이트 (3~5개) */
  topInsights: {
    insightId?: string;
    message: string;
    evidenceCategory?: string;
  }[];
  /** 추천 액션 (3~5개) */
  recommendedActions: {
    actionId?: string;
    action: string;
    owner?: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
  }[];
};

// ─── 3. PtDeck (프레젠테이션 전체) ───────────────────────────────────

export type PtDeck = {
  id: string;
  /** 프레젠테이션 제목 */
  title: string;
  /** PT 목적/의도 */
  objective: string;
  /** 대상 청중 */
  audience: PtAudience;
  /** PT 유형 */
  deckType: PtDeckType;
  /** 분석 키워드 */
  seedKeyword: string;
  /** 전체 내러티브 */
  narrative: PtNarrative;
  /** 장표 목록 */
  slides: PtSlideBlock[];
  /** 생성 시각 */
  generatedAt: string;
  /** 품질 메타데이터 */
  quality: PtQualityMeta;
  /** 전체 사용된 evidence */
  allEvidenceRefs: EvidenceRef[];
  /** 전체 사용된 source */
  allSourceRefs: SourceRef[];
};

// ─── PT Deck 유형별 장표 구성 ─────────────────────────────────────────

export const PT_DECK_SLIDE_MAP: Record<PtDeckType, PtSlideType[]> = {
  ADVERTISER_PROPOSAL: [
    "TITLE",
    "EXECUTIVE_SUMMARY",
    "PROBLEM_DEFINITION",
    "OPPORTUNITY",
    "PATHFINDER",
    "PERSONA",
    "CLUSTER",
    "STRATEGY",
    "ACTION",
    "EXPECTED_IMPACT",
    "EVIDENCE",
    "CLOSING",
  ],
  CAMPAIGN_STRATEGY: [
    "TITLE",
    "PROBLEM_DEFINITION",
    "PERSONA",
    "ROADVIEW",
    "CLUSTER",
    "SOCIAL_INSIGHT",
    "STRATEGY",
    "ACTION",
    "EXPECTED_IMPACT",
    "EVIDENCE",
    "CLOSING",
  ],
  COMPETITIVE_ANALYSIS: [
    "TITLE",
    "EXECUTIVE_SUMMARY",
    "PROBLEM_DEFINITION",
    "COMPETITIVE_GAP",
    "PATHFINDER",
    "CLUSTER",
    "OPPORTUNITY",
    "STRATEGY",
    "ACTION",
    "EVIDENCE",
    "CLOSING",
  ],
  GEO_AEO_STRATEGY: [
    "TITLE",
    "EXECUTIVE_SUMMARY",
    "PROBLEM_DEFINITION",
    "ROADVIEW",
    "CLUSTER",
    "GEO_AEO",
    "STRATEGY",
    "ACTION",
    "EXPECTED_IMPACT",
    "EVIDENCE",
    "CLOSING",
  ],
  INFLUENCER_COLLABORATION: [
    "TITLE",
    "PROBLEM_DEFINITION",
    "PERSONA",
    "CLUSTER",
    "SOCIAL_INSIGHT",
    "STRATEGY",
    "ACTION",
    "EXPECTED_IMPACT",
    "EVIDENCE",
    "CLOSING",
  ],
  INTERNAL_STRATEGY: [
    "TITLE",
    "EXECUTIVE_SUMMARY",
    "PROBLEM_DEFINITION",
    "OPPORTUNITY",
    "PATHFINDER",
    "ROADVIEW",
    "PERSONA",
    "CLUSTER",
    "COMPETITIVE_GAP",
    "GEO_AEO",
    "STRATEGY",
    "ACTION",
    "EVIDENCE",
    "CLOSING",
  ],
};

// ─── Audience별 PT 설정 ───────────────────────────────────────────────

export type PtAudienceConfig = {
  maxSlides: number;
  includeQualityWarnings: boolean;
  includeRawEvidence: boolean;
  includeSourceDetail: boolean;
  toneStyle: "persuasive" | "analytical" | "strategic" | "executive";
};

export const PT_AUDIENCE_CONFIG: Record<PtAudience, PtAudienceConfig> = {
  ADVERTISER: {
    maxSlides: 15,
    includeQualityWarnings: false,
    includeRawEvidence: false,
    includeSourceDetail: false,
    toneStyle: "persuasive",
  },
  EXECUTIVE: {
    maxSlides: 10,
    includeQualityWarnings: false,
    includeRawEvidence: false,
    includeSourceDetail: false,
    toneStyle: "executive",
  },
  INTERNAL: {
    maxSlides: 20,
    includeQualityWarnings: true,
    includeRawEvidence: true,
    includeSourceDetail: true,
    toneStyle: "analytical",
  },
  MARKETER: {
    maxSlides: 15,
    includeQualityWarnings: true,
    includeRawEvidence: false,
    includeSourceDetail: false,
    toneStyle: "persuasive",
  },
};
