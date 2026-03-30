/**
 * Work Document Generation Types
 *
 * 검색 인텔리전스 결과를 실무자가 바로 복붙/정리/보고에 쓸 수 있는 문서로 변환.
 * PT(설득)도 보고서(분석)도 아닌, "실무 현장에서 쓰는 문서" 전용 구조.
 *
 * 핵심 차이점:
 * - documents/: GEO/AEO + 보고서 (분석 중심)
 * - pt/: 광고주 설득 PT (메시지 중심)
 * - workdocs/: 실무 복붙/정리/보고 (즉시 사용 중심)
 */

// ─── 문서 유형 (8종) ────────────────────────────────────────────────

export type WorkDocType =
  | "WEEKLY_REPORT" // 주간 보고서
  | "MONTHLY_REPORT" // 월간 보고서
  | "SI_SUMMARY" // 검색 인텔리전스 요약
  | "COMMENT_ISSUE_REPORT" // 댓글/이슈 보고서
  | "MEETING_MATERIAL" // 회의 자료 (1-2장)
  | "DECISION_MEMO" // 의사결정 메모
  | "EVIDENCE_BUNDLE_DOC" // 근거 모음 문서
  | "GEO_AEO_OPS_MEMO"; // GEO/AEO 운영 메모

// ─── 대상 역할 (4종) ────────────────────────────────────────────────

export type WorkDocAudience =
  | "PRACTITIONER" // 일반 실무자 — 복붙해서 바로 쓰는 사람
  | "TEAM_LEAD" // 팀장/리더 — 요약 + 판단 근거
  | "EXECUTIVE" // 대표/임원 — 핵심만 1장
  | "OPS_MANAGER"; // 운영 담당자 — 세부 데이터 + 실행 항목

// ─── 복붙 톤 (4종) ──────────────────────────────────────────────────

export type SentenceTone =
  | "REPORT" // 보고서 문장체 ("~했습니다", "~로 분석됩니다")
  | "MESSENGER" // 메신저 공유용 ("~입니다. 확인 부탁드립니다")
  | "MEETING_BULLET" // 회의 불릿 ("• ~", "- ~")
  | "FORMAL"; // 공식 보고 ("~하였으며, ~할 것으로 사료됩니다")

// ─── 블록 유형 (7종) ────────────────────────────────────────────────

export type WorkDocBlockType =
  | "QUICK_SUMMARY" // 한 줄/한 문단 요약
  | "KEY_FINDING" // 핵심 발견 사항
  | "EVIDENCE" // 근거 블록
  | "ACTION" // 실행 항목
  | "RISK_NOTE" // 리스크/주의 사항
  | "FAQ" // FAQ 정리
  | "COMPARISON"; // 비교 표/리스트

// ─── Evidence / Source (documents 타입과 호환) ───────────────────────

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

// ─── Quality Metadata ─────────────────────────────────────────────

export type WorkDocQualityMeta = {
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// ─── 1. WorkDocSentenceBlock (문장 단위 복붙 블록) ──────────────────

export type WorkDocSentenceBlock = {
  /** 원본 데이터 기반 문장 */
  sentence: string;
  /** 적용된 톤 */
  tone: SentenceTone;
  /** 근거 연결 — "이 문장이 어디서 나왔는지" */
  evidenceRef?: EvidenceRef;
  /** 품질 경고 (stale/partial/mock) */
  qualityNote?: string;
};

// ─── 2. WorkDocSection (섹션 단위) ──────────────────────────────────

export type WorkDocSection = {
  id: string;
  blockType: WorkDocBlockType;
  /** 섹션 제목 */
  title: string;
  /** 한 줄 요약 (복붙용) */
  oneLiner: string;
  /** 본문 문장들 */
  sentences: WorkDocSentenceBlock[];
  /** 구조화 데이터 (FAQ → questions[], COMPARISON → rows[] 등) */
  structuredData?: Record<string, unknown>;
  /** 근거 연결 */
  evidenceRefs: EvidenceRef[];
  /** 출처 연결 */
  sourceRefs: SourceRef[];
  /** 품질 메타 */
  quality: WorkDocQualityMeta;
  /** 순서 */
  order: number;
};

// ─── 3. WorkDoc (문서 전체) ─────────────────────────────────────────

export type WorkDoc = {
  id: string;
  /** 문서 제목 */
  title: string;
  /** 문서 유형 */
  docType: WorkDocType;
  /** 대상 역할 */
  audience: WorkDocAudience;
  /** 분석 키워드 */
  seedKeyword: string;
  /** 한 줄 요약 (슬랙/메신저 공유용) */
  quickSummary: string;
  /** 섹션 목록 */
  sections: WorkDocSection[];
  /** 생성 시각 */
  generatedAt: string;
  /** 품질 메타데이터 */
  quality: WorkDocQualityMeta;
  /** 전체 사용된 evidence */
  allEvidenceRefs: EvidenceRef[];
  /** 전체 사용된 source */
  allSourceRefs: SourceRef[];
};

// ─── 문서 유형별 섹션 구성 ──────────────────────────────────────────

export const WORKDOC_SECTION_MAP: Record<WorkDocType, WorkDocBlockType[]> = {
  WEEKLY_REPORT: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "COMPARISON",
    "ACTION",
    "RISK_NOTE",
    "EVIDENCE",
  ],
  MONTHLY_REPORT: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "COMPARISON",
    "FAQ",
    "ACTION",
    "RISK_NOTE",
    "EVIDENCE",
  ],
  SI_SUMMARY: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "COMPARISON",
    "ACTION",
    "EVIDENCE",
  ],
  COMMENT_ISSUE_REPORT: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "FAQ",
    "RISK_NOTE",
    "ACTION",
    "EVIDENCE",
  ],
  MEETING_MATERIAL: ["QUICK_SUMMARY", "KEY_FINDING", "ACTION"],
  DECISION_MEMO: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "COMPARISON",
    "ACTION",
    "EVIDENCE",
  ],
  EVIDENCE_BUNDLE_DOC: ["QUICK_SUMMARY", "EVIDENCE", "COMPARISON", "FAQ"],
  GEO_AEO_OPS_MEMO: [
    "QUICK_SUMMARY",
    "KEY_FINDING",
    "FAQ",
    "ACTION",
    "EVIDENCE",
  ],
};

// ─── Audience별 문서 설정 ───────────────────────────────────────────

export type WorkDocAudienceConfig = {
  maxSections: number;
  includeQualityWarnings: boolean;
  includeRawEvidence: boolean;
  includeSourceDetail: boolean;
  defaultTone: SentenceTone;
  showRiskNotes: boolean;
};

export const WORKDOC_AUDIENCE_CONFIG: Record<
  WorkDocAudience,
  WorkDocAudienceConfig
> = {
  PRACTITIONER: {
    maxSections: 10,
    includeQualityWarnings: true,
    includeRawEvidence: true,
    includeSourceDetail: true,
    defaultTone: "REPORT",
    showRiskNotes: true,
  },
  TEAM_LEAD: {
    maxSections: 7,
    includeQualityWarnings: true,
    includeRawEvidence: false,
    includeSourceDetail: false,
    defaultTone: "REPORT",
    showRiskNotes: true,
  },
  EXECUTIVE: {
    maxSections: 4,
    includeQualityWarnings: false,
    includeRawEvidence: false,
    includeSourceDetail: false,
    defaultTone: "FORMAL",
    showRiskNotes: false,
  },
  OPS_MANAGER: {
    maxSections: 10,
    includeQualityWarnings: true,
    includeRawEvidence: true,
    includeSourceDetail: true,
    defaultTone: "MEETING_BULLET",
    showRiskNotes: true,
  },
};

// ─── 문서 유형별 제목/설명 ──────────────────────────────────────────

export const WORKDOC_TITLES: Record<WorkDocType, string> = {
  WEEKLY_REPORT: "주간 검색 인텔리전스 보고",
  MONTHLY_REPORT: "월간 검색 인텔리전스 보고",
  SI_SUMMARY: "검색 인텔리전스 요약",
  COMMENT_ISSUE_REPORT: "댓글/이슈 분석 보고",
  MEETING_MATERIAL: "회의 자료",
  DECISION_MEMO: "의사결정 메모",
  EVIDENCE_BUNDLE_DOC: "근거 자료 모음",
  GEO_AEO_OPS_MEMO: "GEO/AEO 운영 메모",
};

export const WORKDOC_OBJECTIVES: Record<WorkDocType, string> = {
  WEEKLY_REPORT: "이번 주 검색 흐름 변화와 대응 필요 항목을 정리합니다",
  MONTHLY_REPORT: "이번 달 검색 인텔리전스 주요 변화와 전략 방향을 정리합니다",
  SI_SUMMARY: "검색 인텔리전스 분석 결과를 한 페이지로 요약합니다",
  COMMENT_ISSUE_REPORT: "댓글/소셜에서 감지된 이슈와 FAQ를 정리합니다",
  MEETING_MATERIAL: "회의에서 공유할 핵심 사항을 1-2장으로 정리합니다",
  DECISION_MEMO: "의사결정에 필요한 근거와 비교를 정리합니다",
  EVIDENCE_BUNDLE_DOC: "분석에 사용된 근거 자료를 체계적으로 정리합니다",
  GEO_AEO_OPS_MEMO: "AI 검색 최적화 운영에 필요한 실행 항목을 정리합니다",
};
