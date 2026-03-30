/**
 * Entertainment Industry Template
 *
 * 엔터 업종: 팬덤반응, 이슈타이밍, 콘텐츠확산, 참여, 공연, 컴백, 굿즈
 * - 확산 흐름과 반응 강도 중요
 * - persona보다 fan archetype/참여 유형 강조
 * - timing/buzz/amplification 포인트 중요
 * - 소셜/댓글/검색 흐름의 결합 특히 중요
 */

import type { VerticalTemplate, VerticalDocumentProfile } from "./types";

export const ENTERTAINMENT_TEMPLATE: VerticalTemplate = {
  id: "vertical-entertainment-v1",
  industryType: "ENTERTAINMENT",
  label: "엔터테인먼트",
  description: "팬덤반응·이슈타이밍·확산·참여 기반 검색 인텔리전스 문서 템플릿",
  supportedOutputTypes: [
    "WORKDOC",
    "PT_DECK",
    "EXECUTIVE",
    "GEO_AEO",
    "ISSUE_FAQ",
    "STRATEGY_MEMO",
  ],

  blockConfigs: [
    {
      blockType: "QUICK_SUMMARY",
      emphasis: "REQUIRED",
      oneLinerPrefix: "[엔터] ",
    },
    {
      blockType: "KEY_FINDING",
      emphasis: "REQUIRED",
      titleOverride: "핵심 발견: 반응/확산/타이밍",
    },
    {
      blockType: "CLUSTER",
      emphasis: "EMPHASIZED",
      titleOverride: "팬 반응 관심 영역",
    },
    {
      blockType: "PATH",
      emphasis: "EMPHASIZED",
      titleOverride: "콘텐츠 확산 경로",
    },
    {
      blockType: "PERSONA",
      emphasis: "OPTIONAL",
      titleOverride: "팬 참여 유형",
    },
    {
      blockType: "ROAD_STAGE",
      emphasis: "OPTIONAL",
      titleOverride: "이슈 확산 단계",
    },
    {
      blockType: "COMPARISON",
      emphasis: "OPTIONAL",
      titleOverride: "콘텐츠/IP 반응 비교",
    },
    { blockType: "FAQ", emphasis: "OPTIONAL" },
    {
      blockType: "ACTION",
      emphasis: "REQUIRED",
      titleOverride: "콘텐츠/캠페인 액션",
    },
    { blockType: "RISK_NOTE", emphasis: "OPTIONAL" },
    { blockType: "EVIDENCE", emphasis: "REQUIRED" },
  ],

  toneGuideline: {
    defaultTone: "REPORT",
    forbiddenPatterns: ["확정된 일정", "반드시 성공", "역대급"],
    preferredPatterns: [
      "~에 대한 팬 반응이 활발",
      "~시점 이후 검색량이 급증",
      "~콘텐츠의 확산 속도가 빠름",
      "~참여 유형의 팬이 주도적으로 검색",
      "~IP/콘텐츠에 대한 관심이 집중",
    ],
    uncertaintyHandling: "NEUTRAL",
    lowConfidencePrefix: "[참고] 데이터 제한적 — ",
  },

  insightPriority: {
    priorityTypes: [
      "BUZZ_TIMING",
      "FAN_REACTION",
      "CONTENT_SPREAD",
      "ENGAGEMENT_PATTERN",
      "IP_INTEREST",
      "TREND_CHANGE",
      "KEY_FINDING",
    ],
    interpretationKeywords: [
      "팬덤",
      "반응",
      "확산",
      "타이밍",
      "컴백",
      "공연",
      "굿즈",
      "콘텐츠",
      "참여",
      "이슈",
      "바이럴",
      "IP",
      "스트리밍",
      "차트",
      "예매",
      "팬미팅",
    ],
    framingTemplate:
      "엔터 콘텐츠의 검색/소셜 흐름에서 {insight}가 감지되었습니다. {context} 관점에서 타이밍 대응이 중요합니다.",
  },

  evidencePolicy: {
    priorityCategories: [
      "search_cluster_distribution",
      "search_pathfinder_graph",
      "search_cluster_detail",
      "search_roadview_stages",
    ],
    minEvidenceCount: 3,
    maxEvidenceCount: 10,
    minConfidenceThreshold: 0.35,
    allowStaleData: false,
    staleWarningTemplate:
      "[주의] 엔터 이슈는 시간에 매우 민감합니다. 이 데이터는 이미 유효하지 않을 수 있습니다. 즉시 재분석을 권장합니다.",
    mockWarningTemplate:
      "[검증 필요] 샘플 데이터 기반입니다. 실제 팬 반응/검색 데이터로 검증이 필요합니다.",
    partialWarningTemplate:
      "[참고] 일부 플랫폼 데이터만 수집되어 확산 범위가 과소평가될 수 있습니다.",
  },

  actionPolicy: {
    priorityActionTypes: [
      "CONTENT_TIMING_ACTION",
      "CAMPAIGN_AMPLIFICATION",
      "FAN_ENGAGEMENT_CONTENT",
      "IP_MERCHANDISE_PROMOTION",
      "SOCIAL_RESPONSE_ACTION",
    ],
    actionFramingTemplate:
      "{concern} 이슈의 확산 흐름에 맞춰 {action}을 권장합니다. 타이밍이 핵심입니다.",
    defaultOwners: ["콘텐츠팀", "마케팅팀", "소셜미디어팀", "IP사업팀"],
    actionToneStyle: "DIRECTIVE",
  },

  riskPolicy: {
    riskToneLevel: "STANDARD",
    additionalRiskChecks: [
      "미확정 일정/루머 기반 콘텐츠 여부",
      "팬덤 갈등 이슈 민감도",
      "아티스트/IP 관련 논란 리스크",
    ],
    regulatoryNotes: [
      "미확인 일정은 '예상', '루머' 등으로 명확히 구분",
      "팬덤 간 갈등을 조장하는 표현 사용 금지",
    ],
  },
};

export const ENTERTAINMENT_PROFILE: VerticalDocumentProfile = {
  industryType: "ENTERTAINMENT",
  keyInsightFocus: [
    "이슈 발생 후 검색 반응 속도",
    "팬 참여 유형별 검색 패턴",
    "콘텐츠 확산 경로",
    "IP/굿즈/공연 관련 검색 비중",
    "소셜-검색 교차 반응",
  ],
  keyEvidenceFocus: [
    "search_cluster_distribution",
    "search_pathfinder_graph",
    "search_cluster_detail",
    "search_roadview_stages",
  ],
  keyActionFocus: [
    "이슈 타이밍에 맞춘 콘텐츠 배포",
    "팬 참여 유도 캠페인",
    "IP/굿즈/공연 연결 콘텐츠",
    "소셜 반응 대응 콘텐츠",
    "확산 경로 기반 플랫폼 전략",
  ],
  toneGuidelines:
    "반응/확산/타이밍 중심. 팬 참여 맥락 반영. 캠페인/콘텐츠 확산 가능성 강조.",
  riskGuidelines:
    "미확인 정보 구분 필수. 팬덤 갈등 표현 주의. 아티스트 관련 논란 리스크 고려.",
  topicTaxonomy: [
    "컴백/릴리즈",
    "공연/콘서트",
    "팬미팅",
    "굿즈/MD",
    "스트리밍/차트",
    "예능/드라마",
    "영화",
    "웹툰/웹소설",
    "팬덤활동",
    "바이럴/밈",
    "IP사업",
  ],
  benchmarkBaseline: {
    buzzDecayHours: 48,
    fanEngagementRate: 0.4,
    spreadVelocity: 0.65,
    socialSearchCrossover: 0.35,
    merchandiseSearchRate: 0.15,
    contentTypeVariety: 0.7,
    viralPotentialScore: 0.55,
    avgClusterCount: 5,
  },
};
