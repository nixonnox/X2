/**
 * Finance Industry Template
 *
 * 금융 업종: 정확성, 조건비교, 신뢰, 위험, 혜택, 금리, 절차
 * - 표현 안정성, 과장 금지
 * - low confidence / 근거 부족은 매우 보수적으로 처리
 * - FAQ와 비교 기준표가 매우 중요
 * - GEO/AEO에서 출처/신뢰도/인용 구조 특히 중요
 */

import type { VerticalTemplate, VerticalDocumentProfile } from "./types";

export const FINANCE_TEMPLATE: VerticalTemplate = {
  id: "vertical-finance-v1",
  industryType: "FINANCE",
  label: "금융",
  description: "조건비교·금리·절차·신뢰 기반 검색 인텔리전스 문서 템플릿",
  supportedOutputTypes: [
    "WORKDOC",
    "PT_DECK",
    "EXECUTIVE",
    "GEO_AEO",
    "ISSUE_FAQ",
    "STRATEGY_MEMO",
  ],

  blockConfigs: [
    { blockType: "QUICK_SUMMARY", emphasis: "REQUIRED" },
    {
      blockType: "KEY_FINDING",
      emphasis: "REQUIRED",
      titleOverride: "핵심 발견: 금리/조건/절차 관심",
    },
    {
      blockType: "COMPARISON",
      emphasis: "EMPHASIZED",
      titleOverride: "조건/금리/혜택 비교",
    },
    {
      blockType: "FAQ",
      emphasis: "EMPHASIZED",
      titleOverride: "자주 묻는 금융 상품/절차 질문",
    },
    {
      blockType: "CLUSTER",
      emphasis: "REQUIRED",
      titleOverride: "금융 관심 영역 분류",
    },
    {
      blockType: "PERSONA",
      emphasis: "OPTIONAL",
      titleOverride: "금융 상품 탐색 고객 유형",
    },
    {
      blockType: "ROAD_STAGE",
      emphasis: "OPTIONAL",
      titleOverride: "상품 탐색 → 비교 → 가입 여정",
    },
    { blockType: "PATH", emphasis: "OPTIONAL" },
    {
      blockType: "EVIDENCE",
      emphasis: "EMPHASIZED",
      titleOverride: "분석 근거 및 출처 (신뢰도 포함)",
    },
    {
      blockType: "RISK_NOTE",
      emphasis: "REQUIRED",
      titleOverride: "주의 사항 및 규제 가이드",
    },
    {
      blockType: "ACTION",
      emphasis: "REQUIRED",
      titleOverride: "콘텐츠/상품 대응 액션",
    },
  ],

  toneGuideline: {
    defaultTone: "FORMAL",
    forbiddenPatterns: [
      "확실한 수익",
      "반드시 가입",
      "무조건 유리",
      "손해 없는",
      "보장된 수익률",
      "최고의 상품",
      "가장 좋은",
      "추천 상품",
    ],
    preferredPatterns: [
      "~조건에서 ~로 분석됨",
      "~기준으로 비교한 결과",
      "~절차에 대한 검색이 증가",
      "고객이 ~조건을 중요하게 검토하는 것으로 나타남",
    ],
    uncertaintyHandling: "CONSERVATIVE",
    lowConfidencePrefix: "[주의: 데이터 불충분] ",
  },

  insightPriority: {
    priorityTypes: [
      "RATE_COMPARISON",
      "CONDITION_ANALYSIS",
      "PROCEDURE_INTEREST",
      "TRUST_SIGNAL",
      "RISK_AWARENESS",
      "KEY_FINDING",
    ],
    interpretationKeywords: [
      "금리",
      "이자율",
      "조건",
      "한도",
      "수수료",
      "절차",
      "가입",
      "해지",
      "비교",
      "혜택",
      "신용",
      "대출",
      "보험",
      "투자",
      "예적금",
      "카드",
    ],
    framingTemplate:
      "금융 고객의 검색 행동에서 {insight}가 확인되었습니다. {context} 관점에서 정확한 정보 제공이 필요합니다.",
  },

  evidencePolicy: {
    priorityCategories: [
      "search_cluster_detail",
      "search_cluster_distribution",
      "search_roadview_stages",
      "search_intelligence_quality",
      "search_quality_warnings",
    ],
    minEvidenceCount: 4,
    maxEvidenceCount: 12,
    minConfidenceThreshold: 0.6,
    allowStaleData: false,
    staleWarningTemplate:
      "[경고] 금융 정보는 최신성이 매우 중요합니다. 이 데이터는 오래되어 금리/조건이 변경되었을 수 있습니다. 반드시 최신 데이터로 재분석하세요.",
    mockWarningTemplate:
      "[경고] 샘플 데이터 기반 분석입니다. 금융 문서에서 샘플 데이터를 근거로 사용하면 안 됩니다. 반드시 실제 데이터로 검증하세요.",
    partialWarningTemplate:
      "[경고] 일부 데이터만 수집되었습니다. 금융 상품 비교 시 누락된 데이터가 결과를 왜곡할 수 있습니다.",
  },

  actionPolicy: {
    priorityActionTypes: [
      "CONTENT_CREATE_COMPARISON",
      "CONTENT_CREATE_FAQ",
      "CONTENT_OPTIMIZE_TRUST",
      "SEO_SCHEMA_FINANCIAL",
      "CITATION_ACCURACY_CHECK",
    ],
    actionFramingTemplate:
      "고객의 {concern} 검색에 대응하여 {action}을 검토하시기 바랍니다.",
    defaultOwners: ["콘텐츠팀", "상품기획팀", "컴플라이언스팀"],
    actionToneStyle: "CONSERVATIVE",
  },

  riskPolicy: {
    riskToneLevel: "STRICT",
    additionalRiskChecks: [
      "금리/수수료 정보의 최신성",
      "상품 조건 변경 반영 여부",
      "투자 권유 표현 혼동 여부",
      "보험 보장 범위 과장 여부",
      "원금 손실 가능성 미고지 여부",
    ],
    regulatoryNotes: [
      "금융 상품 정보 제공 시 투자 권유로 오해될 수 있는 표현 금지",
      "금리/조건은 변동 가능성을 반드시 명시",
      "원금 손실 가능 상품은 위험 고지 필수",
      "보험 상품은 보장 범위와 면책 사항을 함께 안내",
    ],
  },
};

export const FINANCE_PROFILE: VerticalDocumentProfile = {
  industryType: "FINANCE",
  keyInsightFocus: [
    "상품 조건 비교 검색 패턴",
    "금리/수수료 민감도",
    "가입 절차/조건 문의 비중",
    "신뢰/안전 관련 검색 비중",
    "경쟁사 상품 비교 검색",
  ],
  keyEvidenceFocus: [
    "search_cluster_detail",
    "search_cluster_distribution",
    "search_roadview_stages",
    "search_intelligence_quality",
    "search_quality_warnings",
  ],
  keyActionFocus: [
    "조건 비교표 콘텐츠 제작",
    "절차 안내 FAQ 구조화",
    "신뢰 기반 콘텐츠 (출처 명시)",
    "GEO/AEO용 금융 스키마 최적화",
    "컴플라이언스 검토 후 게시",
  ],
  toneGuidelines:
    "정확/보수적 표현. 추정 문장은 명확히 표시. 혜택/조건/절차 구분. 과장 금지.",
  riskGuidelines:
    "투자 권유 표현 금지. 금리 변동 가능성 명시. 원금 손실 위험 고지. 컴플라이언스 검토 필수.",
  topicTaxonomy: [
    "예적금",
    "대출",
    "카드",
    "보험",
    "투자",
    "금리비교",
    "수수료",
    "가입절차",
    "해지",
    "신용관리",
    "재테크",
    "연금",
  ],
  benchmarkBaseline: {
    comparisonSearchRate: 0.35,
    procedureQueryRate: 0.2,
    trustSignalPresence: 0.15,
    rateComparisonFrequency: 0.25,
    riskAwarenessRate: 0.12,
    faqFrequency: 0.28,
    regulatoryMentionRate: 0.08,
    avgClusterCount: 7,
  },
};
