/**
 * Search Data Connector — 핵심 타입 정의
 *
 * 검색 데이터 수집/정규화/연결을 위한 공통 인터페이스.
 * 모든 외부 데이터 소스(Google Ads, Trends, Naver, SERP)가
 * 동일한 normalized payload로 변환된다.
 *
 * 원칙:
 * - 공식 API 우선, 합법적 수집만 허용
 * - real/mock 자동 전환 (env 기반)
 * - 각 adapter는 독립적으로 실패 가능 (graceful degradation)
 */

// ═══════════════════════════════════════════════════════════════
// 1. Connector Interface
// ═══════════════════════════════════════════════════════════════

/** 데이터 소스 식별자 */
export type SearchDataSource =
  | "google_ads"
  | "google_autocomplete"
  | "google_trends"
  | "google_related"
  | "naver_search"
  | "naver_datalab"
  | "serp_api"
  | "dataforseo"
  | "mock";

/** 어댑터 상태 */
export type AdapterStatus = "ready" | "unavailable" | "error" | "rate_limited";

/** 어댑터 capability */
export type AdapterCapability =
  | "seed_keyword_volume"
  | "related_keywords"
  | "trend_series"
  | "serp_documents"
  | "autocomplete"
  | "questions"           // People Also Ask
  | "demographic"         // 성별/연령 데이터
  | "competition";        // 경쟁 지표

/** 어댑터 건강 상태 */
export type HealthCheckResult = {
  source: SearchDataSource;
  status: AdapterStatus;
  latencyMs: number;
  message?: string;
  remainingQuota?: number;
  checkedAt: string;
};

/** 수집 옵션 */
export type CollectOptions = {
  locale?: string;            // 기본 "ko"
  country?: string;           // ISO 3166-1 alpha-2, 기본 "KR"
  language?: string;          // ISO 639-1, 기본 "ko"
  maxResults?: number;
  includeQuestions?: boolean;
  dateRange?: {
    start: string;            // "2025-01" (YYYY-MM)
    end: string;
  };
  timeout?: number;           // ms, 기본 30000
};

/** 지원 국가 목록 */
export type SupportedCountry =
  | "KR" | "US" | "JP" | "CN" | "GB" | "DE" | "FR"
  | "IN" | "BR" | "AU" | "CA" | "SG" | "TH" | "VN" | "ID";

/** 지원 언어 목록 */
export type SupportedLanguage =
  | "ko" | "en" | "ja" | "zh" | "de" | "fr"
  | "es" | "pt" | "th" | "vi" | "id";

/** 국가-언어 기본 매핑 */
export const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
  KR: "ko", US: "en", JP: "ja", CN: "zh", GB: "en", DE: "de",
  FR: "fr", IN: "en", BR: "pt", AU: "en", CA: "en", SG: "en",
  TH: "th", VN: "vi", ID: "id",
};

/**
 * 검색 데이터 어댑터 인터페이스
 *
 * 모든 외부 데이터 소스가 이 인터페이스를 구현한다.
 */
export interface ISearchDataAdapter {
  /** 어댑터 식별 */
  readonly source: SearchDataSource;
  readonly displayName: string;

  /** 건강 상태 확인 */
  healthCheck(): Promise<HealthCheckResult>;

  /** 시드 키워드의 검색량/메트릭 수집 */
  collectSeedKeywordData(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSearchKeyword | null>;

  /** 연관 키워드 수집 */
  collectRelatedKeywords(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedRelatedKeyword[]>;

  /** 트렌드 시계열 수집 */
  collectTrendSeries(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedTrendSeries | null>;

  /** SERP 문서 수집 */
  collectSerpDocuments(
    keyword: string,
    options?: CollectOptions,
  ): Promise<NormalizedSerpDocument | null>;

  /** 결과를 normalized 형태로 변환 (내부용) */
  normalize(rawData: unknown): NormalizedSearchAnalyticsPayload;

  /** 이 어댑터가 지원하는 기능 목록 */
  getCapabilities(): AdapterCapability[];
}

// ═══════════════════════════════════════════════════════════════
// 2. Normalized Payload Structures
// ═══════════════════════════════════════════════════════════════

/** 정규화된 검색 키워드 (시드) */
export type NormalizedSearchKeyword = {
  keyword: string;
  normalizedKeyword: string;       // lowercase, trimmed
  locale: string;
  country?: string;                // ISO 3166-1 alpha-2
  language?: string;               // ISO 639-1
  source: SearchDataSource;
  avgMonthlySearches: number;
  cpc?: number;                    // USD
  competitionIndex?: number;       // 0-1
  competitionLevel?: "low" | "medium" | "high";
  monthlyBreakdown?: { year: number; month: number; searches: number }[];
  collectedAt: string;
};

/** 정규화된 연관 키워드 */
export type NormalizedRelatedKeyword = {
  keyword: string;
  normalizedKeyword: string;
  parentKeyword: string;
  locale: string;
  country?: string;
  language?: string;
  source: SearchDataSource;
  sourceType: "autocomplete" | "related" | "question" | "suggestion" | "paa";
  avgMonthlySearches?: number;
  position?: number;               // 자동완성 순서 (1-based)
  collectedAt: string;
};

/** 정규화된 트렌드 시계열 */
export type NormalizedTrendSeries = {
  keyword: string;
  locale: string;
  country?: string;
  language?: string;
  source: SearchDataSource;
  timelineData: { date: string; value: number }[];  // "2025-01", 0-100
  relatedTopics?: { topic: string; score: number }[];
  relatedQueries?: { query: string; score: number }[];
  overallTrend: "rising" | "stable" | "declining" | "seasonal";
  trendScore: number;              // -1.0 ~ 1.0
  seasonality: number;             // 0-1
  yoyGrowth: number;               // %
  isBreakout: boolean;
  collectedAt: string;
};

/** 정규화된 SERP 문서 */
export type NormalizedSerpDocument = {
  keyword: string;
  locale: string;
  country?: string;
  language?: string;
  engine: "google" | "naver" | "bing";
  source: SearchDataSource;
  organicResults: SerpOrganicResult[];
  relatedSearches: string[];
  peopleAlsoAsk: string[];
  featuredSnippet?: {
    title: string;
    snippet: string;
    url: string;
  };
  totalResults?: number;
  collectedAt: string;
};

export type SerpOrganicResult = {
  position: number;
  url: string;
  domain: string;
  title: string;
  snippet: string;
  isAd?: boolean;
};

/** 정규화된 검색 의도 후보 */
export type NormalizedSearchIntentCandidate = {
  keyword: string;
  locale: string;
  sources: SearchDataSource[];
  intentSignals: {
    signal: string;
    type: "question" | "comparison" | "action" | "informational" | "navigational";
    confidence: number;
  }[];
  questionPatterns: string[];        // "어떻게", "왜", "how" 등
  comparisonSignals: string[];       // "vs", "비교", "차이"
  actionSignals: string[];           // "구매", "가입", "buy"
};

/** 통합 검색 분석 페이로드 (모든 소스의 결합) */
export type NormalizedSearchAnalyticsPayload = {
  seedKeyword: string;
  locale: string;
  collectedAt: string;

  // 시드 키워드 데이터
  seedData?: NormalizedSearchKeyword;

  // 연관 키워드
  relatedKeywords: NormalizedRelatedKeyword[];

  // 트렌드
  trendSeries: NormalizedTrendSeries[];

  // SERP
  serpDocuments: NormalizedSerpDocument[];

  // 의도 후보
  intentCandidates: NormalizedSearchIntentCandidate[];

  // 수집 메타
  sources: {
    source: SearchDataSource;
    status: AdapterStatus;
    itemCount: number;
    latencyMs: number;
  }[];
};

// ═══════════════════════════════════════════════════════════════
// 3. Registry / Resolver Types
// ═══════════════════════════════════════════════════════════════

/** 레지스트리 설정 */
export type SearchConnectorConfig = {
  /** 활성화할 소스 목록 (순서 = 우선순위) */
  enabledSources: SearchDataSource[];
  /** 기본 locale */
  defaultLocale: string;
  /** 기본 타임아웃 (ms) */
  defaultTimeout: number;
  /** mock fallback 활성화 */
  enableMockFallback: boolean;
  /** 환경 변수 기반 자동 감지 */
  autoDetect: boolean;
};

export const DEFAULT_CONNECTOR_CONFIG: SearchConnectorConfig = {
  enabledSources: [
    "google_autocomplete",
    "naver_search",
    "google_ads",
    "google_trends",
    "serp_api",
  ],
  defaultLocale: "ko",
  defaultTimeout: 30000,
  enableMockFallback: true,
  autoDetect: true,
};

// ═══════════════════════════════════════════════════════════════
// 4. Engine Input Types (엔진 연결용)
// ═══════════════════════════════════════════════════════════════

/** intent-engine 입력으로 변환 */
export type IntentEngineInput = {
  seedKeyword: string;
  expandedKeywords: {
    keyword: string;
    source: string;
    parentKeyword: string | null;
    depth: number;
    searchVolume: number;
    trend: "rising" | "stable" | "declining";
    trendScore: number;
    isRising: boolean;
  }[];
  trendData: {
    keyword: string;
    dataPoints: { period: string; volume: number }[];
    trendScore: number;
  }[];
};

/** cluster-engine 입력 (SERP 기반 유사도용) */
export type ClusterEngineInput = {
  seedKeyword: string;
  keywords: string[];
  serpOverlap: {
    keywordA: string;
    keywordB: string;
    sharedDomains: string[];
    similarity: number;          // 0-1, Jaccard similarity
  }[];
};

/** pathfinder/roadview 입력 */
export type JourneyEngineInput = {
  seedKeyword: string;
  relatedKeywords: NormalizedRelatedKeyword[];
  trendSeries: NormalizedTrendSeries[];
  serpDocuments: NormalizedSerpDocument[];
};

/** persona-engine 입력 (클러스터 기반 페르소나 생성용) */
export type PersonaEngineInput = {
  seedKeyword: string;
  /** 클러스터링된 키워드 그룹 */
  keywordGroups: {
    clusterId: string;
    keywords: string[];
    dominantIntent: string;
    avgSearchVolume: number;
  }[];
  /** 검색 행동 패턴 시그널 */
  behaviorSignals: {
    keyword: string;
    questionPatterns: string[];
    comparisonSignals: string[];
    actionSignals: string[];
    sourceTypes: string[];        // autocomplete, paa, related 등
  }[];
  /** 인구통계 데이터 (Naver DataLab 제공 시) */
  demographics?: {
    keyword: string;
    ageGroups?: { group: string; ratio: number }[];
    genderRatio?: { male: number; female: number };
  }[];
  /** 트렌드 기반 관심 변화 패턴 */
  trendPatterns: {
    keyword: string;
    overallTrend: "rising" | "stable" | "declining";
    seasonality: number;
    isBreakout: boolean;
  }[];
};

/** GEO/AEO 엔진 입력 (생성형 검색 최적화용) */
export type GeoAeoEngineInput = {
  seedKeyword: string;
  /** SERP 점유 분석 데이터 */
  serpAnalysis: {
    keyword: string;
    totalOrganicResults: number;
    featuredSnippet?: {
      domain: string;
      snippet: string;
    };
    topDomains: { domain: string; positions: number[] }[];
    paaQuestions: string[];
  }[];
  /** 콘텐츠 갭 시그널 */
  contentGaps: {
    keyword: string;
    gapType: "no_snippet" | "thin_content" | "no_paa" | "low_authority";
    opportunity: number;          // 0-1
    relatedQuestions: string[];
  }[];
  /** 키워드별 검색량/경쟁도 */
  keywordMetrics: {
    keyword: string;
    searchVolume: number;
    competitionIndex?: number;
    cpc?: number;
  }[];
};

// ═══════════════════════════════════════════════════════════════
// 5. Data Source Policy Constants
// ═══════════════════════════════════════════════════════════════

/** 데이터 소스별 메타 정보 */
export const DATA_SOURCE_META: Record<SearchDataSource, {
  displayName: string;
  envKeys: string[];
  capabilities: AdapterCapability[];
  rateLimit: string;
  cost: string;
  requiresAuth: boolean;
  status: "available" | "scaffold" | "planned";
  legalNote: string;
}> = {
  google_ads: {
    displayName: "Google Ads Keyword Planner",
    envKeys: ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_REFRESH_TOKEN"],
    capabilities: ["seed_keyword_volume", "related_keywords", "competition"],
    rateLimit: "15,000 operations/day (Standard Access)",
    cost: "무료 (API 호출), 단 광고 계정 + 최소 지출 필요",
    requiresAuth: true,
    status: "available",
    legalNote: "Google Ads API 이용약관 준수 필요. 광고 계정이 활성 상태여야 정확한 데이터 제공.",
  },
  google_autocomplete: {
    displayName: "Google Autocomplete",
    envKeys: [],
    capabilities: ["autocomplete", "related_keywords"],
    rateLimit: "비공식 — 과도한 호출 시 IP 차단 가능",
    cost: "무료 (공개 엔드포인트) 또는 SerpAPI $50/5000",
    requiresAuth: false,
    status: "available",
    legalNote: "비공식 API. 상업적 대량 수집 시 Google ToS 위반 가능. SerpAPI 경유 권장.",
  },
  google_trends: {
    displayName: "Google Trends",
    envKeys: ["GOOGLE_TRENDS_PROXY_URL"],
    capabilities: ["trend_series"],
    rateLimit: "비공식 — pytrends: 분당 ~5회 권장",
    cost: "무료 (pytrends) 또는 SerpAPI $50/5000",
    requiresAuth: false,
    status: "available",
    legalNote: "공식 API 없음. pytrends(비공식) 또는 SerpAPI/DataForSEO 경유 권장.",
  },
  google_related: {
    displayName: "Google Related Searches",
    envKeys: [],
    capabilities: ["related_keywords"],
    rateLimit: "SERP API 경유 시 해당 API의 제한 적용",
    cost: "SERP API 비용에 포함",
    requiresAuth: false,
    status: "available",
    legalNote: "SERP 결과의 일부로 수집. 별도 API 없음, SERP adapter 경유.",
  },
  naver_search: {
    displayName: "Naver Search API",
    envKeys: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
    capabilities: ["related_keywords", "autocomplete"],
    rateLimit: "25,000 calls/day",
    cost: "무료 (개발자 등록 필요)",
    requiresAuth: true,
    status: "available",
    legalNote: "네이버 개발자센터 등록 후 API 키 발급. 이용약관 준수.",
  },
  naver_datalab: {
    displayName: "Naver DataLab API",
    envKeys: ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET"],
    capabilities: ["trend_series", "demographic"],
    rateLimit: "1,000 calls/day",
    cost: "무료",
    requiresAuth: true,
    status: "available",
    legalNote: "네이버 DataLab API. 동일 네이버 개발자 키 사용.",
  },
  serp_api: {
    displayName: "SerpAPI",
    envKeys: ["SERP_API_KEY"],
    capabilities: ["serp_documents", "related_keywords", "questions", "autocomplete"],
    rateLimit: "플랜별 상이 (기본 5,000/월)",
    cost: "$50/5,000 searches (Startup plan)",
    requiresAuth: true,
    status: "available",
    legalNote: "공식 유료 API. Google/Naver/Bing SERP 데이터 합법적 수집.",
  },
  dataforseo: {
    displayName: "DataForSEO",
    envKeys: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"],
    capabilities: ["seed_keyword_volume", "related_keywords", "trend_series", "serp_documents", "questions", "competition"],
    rateLimit: "초당 2,000 요청",
    cost: "$0.002/task (종량제)",
    requiresAuth: true,
    status: "available",
    legalNote: "공식 유료 API. 가장 포괄적인 데이터. 대규모 운영 시 비용 효율적.",
  },
  mock: {
    displayName: "Mock Data (시뮬레이션)",
    envKeys: [],
    capabilities: ["seed_keyword_volume", "related_keywords", "trend_series", "autocomplete"],
    rateLimit: "제한 없음",
    cost: "무료",
    requiresAuth: false,
    status: "available",
    legalNote: "기존 시뮬레이션 데이터. 개발/테스트용.",
  },
};

// ═══════════════════════════════════════════════════════════════
// 6. Engine Capability Map (소스 → 엔진 기여도)
// ═══════════════════════════════════════════════════════════════

/**
 * 각 엔진이 필요로 하는 데이터 capability와 해당 데이터를 제공하는 소스 매핑.
 *
 * - required: 이 capability 없이는 엔진이 정상 동작 불가
 * - optional: 있으면 품질 향상, 없어도 동작
 */
export const ENGINE_CAPABILITY_MAP: Record<string, {
  required: AdapterCapability[];
  optional: AdapterCapability[];
  description: string;
}> = {
  "intent-engine": {
    required: ["related_keywords"],
    optional: ["seed_keyword_volume", "trend_series", "autocomplete"],
    description: "키워드 확장 + 의도 분류. 연관키워드 필수, 검색량/트렌드로 정확도 향상.",
  },
  "cluster-engine": {
    required: ["related_keywords", "serp_documents"],
    optional: ["seed_keyword_volume"],
    description: "SERP Jaccard 유사도 기반 클러스터링. SERP 도메인 겹침 데이터 필수.",
  },
  "persona-engine": {
    required: ["related_keywords", "questions"],
    optional: ["demographic", "trend_series", "autocomplete"],
    description: "클러스터 기반 페르소나 생성. 질문형 키워드 + 행동 시그널 필수.",
  },
  "pathfinder-engine": {
    required: ["related_keywords"],
    optional: ["trend_series", "serp_documents", "autocomplete"],
    description: "키워드 경로 탐색. 연관키워드 필수, SERP/트렌드로 경로 정확도 향상.",
  },
  "roadview-engine": {
    required: ["related_keywords"],
    optional: ["trend_series", "serp_documents", "questions"],
    description: "소비자 결정 여정 분석. 연관키워드 필수, PAA로 스테이지 정확도 향상.",
  },
  "geo-aeo-engine": {
    required: ["serp_documents", "questions"],
    optional: ["seed_keyword_volume", "competition", "autocomplete"],
    description: "생성형 검색 최적화. SERP 점유 + PAA 필수, 검색량/경쟁도로 우선순위 결정.",
  },
};
