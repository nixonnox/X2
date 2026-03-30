/**
 * Vertical Template Types
 *
 * 업종별 문서 템플릿 엔진의 타입 정의.
 * "같은 데이터라도 업종에 따라 다르게 해석하고 다르게 문서화한다"
 *
 * 공통 문서 엔진(workdocs/, pt/, documents/) 위에 얹는 vertical layer.
 * 완전히 별도 시스템이 아니라, 공통 block을 업종별로 재조립하는 구조.
 */

// ─── 업종 유형 ──────────────────────────────────────────────────────

export type IndustryType =
  | "BEAUTY" // 뷰티: 성분, 효능, 피부타입, 비교, 후기
  | "FNB" // F&B: 메뉴, 맛, 가성비, 지역, 방문의도
  | "FINANCE" // 금융: 조건비교, 신뢰, 위험, 금리, 절차
  | "ENTERTAINMENT"; // 엔터: 팬덤반응, 이슈타이밍, 확산, 참여

// ─── 지원 출력 유형 ─────────────────────────────────────────────────

export type SupportedOutputType =
  | "WORKDOC" // 실무형 보고서
  | "PT_DECK" // 광고주/PT
  | "EXECUTIVE" // Executive summary
  | "GEO_AEO" // GEO/AEO 문서
  | "ISSUE_FAQ" // 이슈/FAQ 문서
  | "STRATEGY_MEMO"; // 전략 메모

// ─── 문서 블록 유형 (공통 + 업종 확장) ──────────────────────────────

export type VerticalBlockType =
  // 공통 블록 (workdocs/와 호환)
  | "QUICK_SUMMARY"
  | "KEY_FINDING"
  | "EVIDENCE"
  | "ACTION"
  | "RISK_NOTE"
  | "FAQ"
  | "COMPARISON"
  // 데이터 기반 블록
  | "PERSONA"
  | "CLUSTER"
  | "PATH"
  | "ROAD_STAGE";

// ─── 블록 강조 수준 ────────────────────────────────────────────────

export type BlockEmphasis = "REQUIRED" | "EMPHASIZED" | "OPTIONAL" | "HIDDEN";

// ─── 업종별 블록 구성 ───────────────────────────────────────────────

export type VerticalBlockConfig = {
  blockType: VerticalBlockType;
  emphasis: BlockEmphasis;
  /** 업종별 블록 제목 오버라이드 */
  titleOverride?: string;
  /** 업종별 oneLiner 접두어 */
  oneLinerPrefix?: string;
};

// ─── 업종별 톤 가이드라인 ───────────────────────────────────────────

export type ToneGuideline = {
  /** 기본 문장 톤 */
  defaultTone: "REPORT" | "MESSENGER" | "MEETING_BULLET" | "FORMAL";
  /** 금지 표현 패턴 */
  forbiddenPatterns: string[];
  /** 권장 표현 패턴 */
  preferredPatterns: string[];
  /** 추정/불확실 문장 처리 */
  uncertaintyHandling: "CONSERVATIVE" | "NEUTRAL" | "OPTIMISTIC";
  /** low confidence 문장 접두어 */
  lowConfidencePrefix: string;
};

// ─── 업종별 인사이트 우선순위 ───────────────────────────────────────

export type InsightPriority = {
  /** 우선 인사이트 유형 (insight.type 매칭) */
  priorityTypes: string[];
  /** 업종별 인사이트 해석 키워드 */
  interpretationKeywords: string[];
  /** 인사이트를 업종 맥락으로 변환할 때 쓰는 프레이밍 */
  framingTemplate: string;
};

// ─── 업종별 Evidence 정책 ───────────────────────────────────────────

export type EvidencePolicyConfig = {
  /** 우선 evidence 카테고리 (상위에 배치) */
  priorityCategories: string[];
  /** 최소 포함 evidence 수 */
  minEvidenceCount: number;
  /** 최대 포함 evidence 수 */
  maxEvidenceCount: number;
  /** 신뢰도 최소 기준 (이하는 경고 표시) */
  minConfidenceThreshold: number;
  /** stale 데이터 허용 여부 */
  allowStaleData: boolean;
  /** stale 데이터 사용 시 경고 문구 */
  staleWarningTemplate: string;
  /** mock 데이터 경고 문구 */
  mockWarningTemplate: string;
  /** partial 데이터 경고 문구 */
  partialWarningTemplate: string;
};

// ─── 업종별 Action 정책 ─────────────────────────────────────────────

export type ActionPolicyConfig = {
  /** 우선 액션 유형 */
  priorityActionTypes: string[];
  /** 액션 프레이밍 템플릿 */
  actionFramingTemplate: string;
  /** 업종별 기본 액션 담당자 */
  defaultOwners: string[];
  /** 업종별 액션 표현 스타일 */
  actionToneStyle: "DIRECTIVE" | "SUGGESTIVE" | "CONSERVATIVE";
};

// ─── 업종별 리스크 정책 ─────────────────────────────────────────────

export type RiskPolicyConfig = {
  /** 리스크 표현 강도 */
  riskToneLevel: "SOFT" | "STANDARD" | "STRICT";
  /** 업종별 추가 리스크 체크 포인트 */
  additionalRiskChecks: string[];
  /** 규제/법적 주의 문구 */
  regulatoryNotes: string[];
};

// ─── 1. VerticalTemplate (업종 템플릿 정의) ─────────────────────────

export type VerticalTemplate = {
  id: string;
  industryType: IndustryType;
  label: string;
  description: string;
  supportedOutputTypes: SupportedOutputType[];
  /** 업종별 블록 구성 */
  blockConfigs: VerticalBlockConfig[];
  /** 톤 가이드라인 */
  toneGuideline: ToneGuideline;
  /** 인사이트 우선순위 */
  insightPriority: InsightPriority;
  /** Evidence 정책 */
  evidencePolicy: EvidencePolicyConfig;
  /** Action 정책 */
  actionPolicy: ActionPolicyConfig;
  /** 리스크 정책 */
  riskPolicy: RiskPolicyConfig;
};

// ─── 2. VerticalDocumentProfile (업종 문서 프로파일) ─────────────────

export type VerticalDocumentProfile = {
  industryType: IndustryType;
  /** 핵심 인사이트 포커스 (예: 뷰티→성분/효능, 금융→조건/금리) */
  keyInsightFocus: string[];
  /** 핵심 evidence 포커스 */
  keyEvidenceFocus: string[];
  /** 핵심 action 포커스 */
  keyActionFocus: string[];
  /** 톤 가이드라인 요약 */
  toneGuidelines: string;
  /** 리스크 가이드라인 요약 */
  riskGuidelines: string;
  /** 업종별 키워드 분류 체계 (topicTaxonomy) */
  topicTaxonomy: string[];
  /** 업종 벤치마크 기준 */
  benchmarkBaseline?: Record<string, number>;
};

// ─── 업종별 문장 변환 결과 ──────────────────────────────────────────

export type VerticalSentenceModification = {
  /** 원본 문장 */
  original: string;
  /** 업종 맥락 적용 문장 */
  modified: string;
  /** 적용된 규칙 */
  appliedRule: string;
  /** 경고 (있으면) */
  warning?: string;
};

// ─── 업종별 인사이트 변환 결과 ──────────────────────────────────────

export type VerticalInsightMapping = {
  /** 원본 인사이트 */
  originalInsight: {
    id?: string;
    type: string;
    title: string;
    description: string;
  };
  /** 업종 맥락 해석 */
  verticalInterpretation: string;
  /** 업종별 중요도 (0-1) */
  verticalRelevance: number;
  /** 업종별 프레이밍 */
  framing: string;
};

// ─── 업종별 액션 변환 결과 ──────────────────────────────────────────

export type VerticalActionMapping = {
  /** 원본 액션 */
  originalAction: {
    id?: string;
    action: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    owner?: string;
  };
  /** 업종 맥락 액션 */
  verticalAction: string;
  /** 업종별 우선순위 조정 */
  adjustedPriority: "HIGH" | "MEDIUM" | "LOW";
  /** 업종별 담당자 */
  suggestedOwner: string;
  /** 업종별 프레이밍 */
  framing: string;
};
