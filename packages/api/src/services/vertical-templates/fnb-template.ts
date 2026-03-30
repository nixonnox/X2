/**
 * F&B Industry Template
 *
 * F&B 업종: 메뉴, 맛, 가격, 가성비, 지역, 방문의도, 시즌성
 * - 방문/재방문 전환 포인트 중요
 * - 지역/시간/상황 맥락 강조
 * - 직관적이고 빠른 표현
 */

import type { VerticalTemplate, VerticalDocumentProfile } from "./types";

export const FNB_TEMPLATE: VerticalTemplate = {
  id: "vertical-fnb-v1",
  industryType: "FNB",
  label: "F&B",
  description: "메뉴·맛·가격·방문의도 기반 검색 인텔리전스 문서 템플릿",
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
      titleOverride: "핵심 발견: 메뉴/맛/방문 트렌드",
    },
    {
      blockType: "CLUSTER",
      emphasis: "EMPHASIZED",
      titleOverride: "메뉴/카테고리 관심 영역",
    },
    {
      blockType: "ROAD_STAGE",
      emphasis: "EMPHASIZED",
      titleOverride: "탐색 → 비교 → 방문 여정",
    },
    {
      blockType: "PERSONA",
      emphasis: "OPTIONAL",
      titleOverride: "방문 고객 유형",
    },
    {
      blockType: "PATH",
      emphasis: "OPTIONAL",
      titleOverride: "메뉴 탐색 경로",
    },
    {
      blockType: "COMPARISON",
      emphasis: "EMPHASIZED",
      titleOverride: "메뉴/가격/경쟁 비교",
    },
    {
      blockType: "FAQ",
      emphasis: "OPTIONAL",
      titleOverride: "자주 묻는 메뉴/매장 질문",
    },
    {
      blockType: "ACTION",
      emphasis: "REQUIRED",
      titleOverride: "메뉴/프로모션 대응 액션",
    },
    { blockType: "RISK_NOTE", emphasis: "OPTIONAL" },
    { blockType: "EVIDENCE", emphasis: "REQUIRED" },
  ],

  toneGuideline: {
    defaultTone: "REPORT",
    forbiddenPatterns: ["반드시 방문해야", "최고의 맛", "압도적인"],
    preferredPatterns: [
      "~메뉴에 대한 검색이 증가",
      "~지역에서 방문 의도 검색 활발",
      "~시간대/시즌 검색 패턴이 뚜렷",
      "가성비/맛 비교 검색이 주를 이룸",
    ],
    uncertaintyHandling: "NEUTRAL",
    lowConfidencePrefix: "[참고] 데이터 제한적 — ",
  },

  insightPriority: {
    priorityTypes: [
      "MENU_INTEREST",
      "VISIT_INTENT",
      "LOCATION_CONTEXT",
      "SEASONAL_PATTERN",
      "PRICE_COMPARISON",
      "TREND_CHANGE",
      "KEY_FINDING",
    ],
    interpretationKeywords: [
      "메뉴",
      "맛",
      "가격",
      "가성비",
      "지역",
      "방문",
      "배달",
      "포장",
      "프로모션",
      "시즌",
      "신메뉴",
      "후기",
    ],
    framingTemplate:
      "F&B 고객의 검색 행동에서 {insight}가 발견되었습니다. {context} 맥락에서 메뉴/매장 전략에 반영이 필요합니다.",
  },

  evidencePolicy: {
    priorityCategories: [
      "search_cluster_distribution",
      "search_roadview_stages",
      "search_cluster_detail",
      "search_pathfinder_graph",
    ],
    minEvidenceCount: 3,
    maxEvidenceCount: 10,
    minConfidenceThreshold: 0.4,
    allowStaleData: true,
    staleWarningTemplate:
      "[주의] F&B 트렌드는 시즌/이벤트에 민감합니다. 최신 데이터로 재분석을 권장합니다.",
    mockWarningTemplate:
      "[검증 필요] 샘플 데이터 기반입니다. 실제 검색 데이터로 검증이 필요합니다.",
    partialWarningTemplate:
      "[참고] 일부 데이터만 수집되어 지역별/시간대별 분석이 불완전할 수 있습니다.",
  },

  actionPolicy: {
    priorityActionTypes: [
      "MENU_PROMOTION",
      "LOCAL_SEO_OPTIMIZE",
      "SEASONAL_CONTENT",
      "REVIEW_RESPONSE",
      "DELIVERY_VISIBILITY",
    ],
    actionFramingTemplate:
      "고객의 {concern} 검색 패턴에 대응하여 {action}을 권장합니다.",
    defaultOwners: ["마케팅팀", "매장운영팀", "메뉴개발팀"],
    actionToneStyle: "DIRECTIVE",
  },

  riskPolicy: {
    riskToneLevel: "STANDARD",
    additionalRiskChecks: [
      "가격 정보 정확성",
      "매장 운영 시간 변동 반영 여부",
      "시즌 메뉴 종료 시점 반영 여부",
    ],
    regulatoryNotes: [
      "가격 표시 시 부가세 포함 여부 명시",
      "식품 알레르기 정보 누락 주의",
    ],
  },
};

export const FNB_PROFILE: VerticalDocumentProfile = {
  industryType: "FNB",
  keyInsightFocus: [
    "메뉴 카테고리별 관심도",
    "방문/재방문 전환 포인트",
    "지역/시간대별 검색 패턴",
    "가격/가성비 비교 검색 비중",
    "시즌/이벤트별 메뉴 관심 변화",
  ],
  keyEvidenceFocus: [
    "search_cluster_distribution",
    "search_roadview_stages",
    "search_cluster_detail",
    "search_pathfinder_graph",
  ],
  keyActionFocus: [
    "메뉴/프로모션 콘텐츠 제작",
    "지역 SEO 최적화",
    "시즌 메뉴 콘텐츠 사전 배포",
    "후기 대응 및 콘텐츠 활용",
    "배달/포장 가시성 확보",
  ],
  toneGuidelines: "직관적이고 빠른 표현. 메뉴/경험 중심. 지역/시간 맥락 강조.",
  riskGuidelines:
    "가격 정확성 확인. 시즌 메뉴 종료 시점 반영. 알레르기 정보 주의.",
  topicTaxonomy: [
    "메뉴/음식",
    "가격/가성비",
    "배달/포장",
    "매장방문",
    "지역맛집",
    "시즌메뉴",
    "프로모션",
    "후기/리뷰",
    "건강/다이어트",
    "카페/디저트",
  ],
  benchmarkBaseline: {
    menuSearchShare: 0.3,
    locationSearchRatio: 0.25,
    seasonalVariation: 0.35,
    deliverySearchRate: 0.2,
    priceComparisonRate: 0.18,
    visitIntentRatio: 0.22,
    reviewInfluenceRate: 0.28,
    avgClusterCount: 5,
  },
};
