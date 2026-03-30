/**
 * Beauty Industry Template
 *
 * 뷰티 업종: 성분, 효능, 사용법, 피부타입, 후기, 비교
 * - FAQ와 비교표 중요도 높음
 * - "추천"보다 "근거 있는 선택 기준" 중심
 * - 입문형/비교형/문제해결형 persona 강조
 */

import type { VerticalTemplate, VerticalDocumentProfile } from "./types";

export const BEAUTY_TEMPLATE: VerticalTemplate = {
  id: "vertical-beauty-v1",
  industryType: "BEAUTY",
  label: "뷰티",
  description: "성분·효능·피부타입 기반 검색 인텔리전스 문서 템플릿",
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
      titleOverride: "핵심 발견: 성분/효능/피부 고민",
    },
    {
      blockType: "FAQ",
      emphasis: "EMPHASIZED",
      titleOverride: "자주 묻는 성분/효능 질문",
    },
    {
      blockType: "COMPARISON",
      emphasis: "EMPHASIZED",
      titleOverride: "제품/성분 비교",
    },
    {
      blockType: "PERSONA",
      emphasis: "EMPHASIZED",
      titleOverride: "고객 피부 고민 유형",
    },
    {
      blockType: "CLUSTER",
      emphasis: "REQUIRED",
      titleOverride: "관심 성분/효능 영역",
    },
    {
      blockType: "ROAD_STAGE",
      emphasis: "OPTIONAL",
      titleOverride: "구매 여정: 탐색 → 비교 → 선택",
    },
    { blockType: "PATH", emphasis: "OPTIONAL" },
    {
      blockType: "ACTION",
      emphasis: "REQUIRED",
      titleOverride: "콘텐츠/제품 대응 액션",
    },
    {
      blockType: "RISK_NOTE",
      emphasis: "OPTIONAL",
      titleOverride: "주의 사항 및 표현 가이드",
    },
    { blockType: "EVIDENCE", emphasis: "REQUIRED" },
  ],

  toneGuideline: {
    defaultTone: "REPORT",
    forbiddenPatterns: [
      "확실히 효과가 있는",
      "반드시 ~해야",
      "모든 피부에 적합",
      "즉시 효과",
      "기적의",
      "완벽한",
    ],
    preferredPatterns: [
      "~에 관심이 높은 것으로 나타남",
      "~를 비교 검토하는 검색이 증가",
      "~성분에 대한 탐색이 활발",
      "~타입 고객이 주로 검색",
    ],
    uncertaintyHandling: "NEUTRAL",
    lowConfidencePrefix: "[참고] 데이터 제한적 — ",
  },

  insightPriority: {
    priorityTypes: [
      "INGREDIENT_INTEREST",
      "SKIN_CONCERN",
      "COMPARISON_INTENT",
      "REVIEW_PATTERN",
      "TREND_CHANGE",
      "KEY_FINDING",
    ],
    interpretationKeywords: [
      "성분",
      "효능",
      "피부타입",
      "비교",
      "후기",
      "사용법",
      "트러블",
      "보습",
      "미백",
      "주름",
      "자외선",
      "클렌징",
    ],
    framingTemplate:
      "뷰티 고객의 검색 행동에서 {insight}가 발견되었습니다. 이는 {context} 맥락에서 중요합니다.",
  },

  evidencePolicy: {
    priorityCategories: [
      "search_cluster_distribution",
      "search_cluster_detail",
      "search_persona_profiles",
      "search_roadview_stages",
    ],
    minEvidenceCount: 3,
    maxEvidenceCount: 10,
    minConfidenceThreshold: 0.4,
    allowStaleData: true,
    staleWarningTemplate:
      "[주의] 뷰티 트렌드는 변화가 빠릅니다. 이 데이터는 갱신이 필요할 수 있습니다.",
    mockWarningTemplate:
      "[검증 필요] 샘플 데이터 기반 분석입니다. 실제 검색 데이터로 검증이 필요합니다.",
    partialWarningTemplate:
      "[참고] 일부 검색 엔진 데이터만 수집되어 결과가 불완전할 수 있습니다.",
  },

  actionPolicy: {
    priorityActionTypes: [
      "CONTENT_CREATE_FAQ",
      "CONTENT_CREATE_COMPARISON",
      "CONTENT_OPTIMIZE_INGREDIENT",
      "SEO_SCHEMA_PRODUCT",
      "REVIEW_CONTENT_STRATEGY",
    ],
    actionFramingTemplate:
      "뷰티 고객의 {concern} 검색 흐름에 대응하여 {action}을 권장합니다.",
    defaultOwners: ["콘텐츠팀", "마케팅팀", "제품팀"],
    actionToneStyle: "SUGGESTIVE",
  },

  riskPolicy: {
    riskToneLevel: "STANDARD",
    additionalRiskChecks: [
      "과장 광고 표현 여부",
      "의약품/의료기기 표현 혼동 여부",
      "개인 피부 반응 차이 미고지 여부",
    ],
    regulatoryNotes: [
      "화장품 광고 시 '치료', '완치' 등 의약품 표현 사용 금지",
      "개인차에 따른 효과 차이를 명시해야 함",
    ],
  },
};

export const BEAUTY_PROFILE: VerticalDocumentProfile = {
  industryType: "BEAUTY",
  keyInsightFocus: [
    "성분 관심도 변화",
    "피부 고민별 검색 패턴",
    "비교/리뷰 검색 비중",
    "효능 탐색 → 구매 전환 흐름",
    "시즌별 관심 성분 변화",
  ],
  keyEvidenceFocus: [
    "search_cluster_distribution",
    "search_cluster_detail",
    "search_persona_profiles",
    "search_roadview_stages",
  ],
  keyActionFocus: [
    "성분 비교 콘텐츠 제작",
    "피부 고민별 FAQ 구조화",
    "비교표/선택 가이드 콘텐츠",
    "리뷰 기반 신뢰 콘텐츠",
    "GEO/AEO용 제품 스키마 최적화",
  ],
  toneGuidelines: "근거 기반 선택 기준 제시. 과장 금지. 비교/검토 맥락 강조.",
  riskGuidelines: "의약품 표현 혼동 주의. 개인차 명시. 과대광고 금지.",
  topicTaxonomy: [
    "스킨케어",
    "메이크업",
    "헤어케어",
    "바디케어",
    "성분분석",
    "피부타입",
    "트러블케어",
    "안티에이징",
    "클렌징",
    "선케어",
    "리뷰/후기",
  ],
  benchmarkBaseline: {
    faqFrequency: 0.22,
    comparisonClusterRatio: 0.28,
    ingredientSearchShare: 0.35,
    reviewMentionRate: 0.18,
    skinTypeMentionRate: 0.15,
    seasonalVariation: 0.25,
    purchaseIntentRatio: 0.3,
    avgClusterCount: 6,
  },
};
