# Search Normalized Payload Spec

> NormalizedSearchAnalyticsPayload 구조 명세 + 6개 엔진 입력 변환

## 1. 개요

`NormalizedSearchAnalyticsPayload`는 모든 검색 데이터 소스의 수집 결과를 통합하는
정규화된 구조체다. 어떤 소스에서 데이터가 왔든 동일한 형식으로 엔진에 전달된다.

## 2. 최상위 구조

```typescript
type NormalizedSearchAnalyticsPayload = {
  seedKeyword: string;         // 원본 시드 키워드
  locale: string;              // "ko", "en" 등
  collectedAt: string;         // ISO 8601 timestamp

  seedData?: NormalizedSearchKeyword;              // 시드 검색량/메트릭
  relatedKeywords: NormalizedRelatedKeyword[];     // 연관 키워드 (중복 제거됨)
  trendSeries: NormalizedTrendSeries[];            // 트렌드 시계열
  serpDocuments: NormalizedSerpDocument[];          // SERP 문서
  intentCandidates: NormalizedSearchIntentCandidate[];  // 의도 후보

  sources: {                   // 수집 메타 (어댑터별)
    source: SearchDataSource;
    status: AdapterStatus;
    itemCount: number;
    latencyMs: number;
  }[];
};
```

## 3. 하위 구조 상세

### 3.1 NormalizedSearchKeyword (시드 키워드 데이터)

```typescript
type NormalizedSearchKeyword = {
  keyword: string;
  normalizedKeyword: string;        // lowercase, trimmed, single-space
  locale: string;
  source: SearchDataSource;         // 데이터 출처
  avgMonthlySearches: number;       // 월평균 검색량
  cpc?: number;                     // Cost Per Click (USD)
  competitionIndex?: number;        // 0-1 경쟁 지표
  competitionLevel?: "low" | "medium" | "high";
  monthlyBreakdown?: {              // 월별 검색량 분해
    year: number;
    month: number;
    searches: number;
  }[];
  collectedAt: string;
};
```

**제공 소스**: Google Ads, DataForSEO, Mock

### 3.2 NormalizedRelatedKeyword (연관 키워드)

```typescript
type NormalizedRelatedKeyword = {
  keyword: string;
  normalizedKeyword: string;
  parentKeyword: string;            // 파생 원본 키워드
  locale: string;
  source: SearchDataSource;
  sourceType: "autocomplete" | "related" | "question" | "suggestion" | "paa";
  avgMonthlySearches?: number;      // 검색량 (있는 경우)
  position?: number;                // 자동완성/SERP 내 순서 (1-based)
  collectedAt: string;
};
```

**sourceType 구분**:
- `autocomplete`: Google/Naver 자동완성
- `related`: SERP 하단 연관 검색어
- `question`: 질문형 키워드
- `paa`: People Also Ask
- `suggestion`: 기타 제안

**중복 제거**: `normalizedKeyword` 기준. 같은 키워드가 여러 소스에서 올 경우 `avgMonthlySearches`가 높은 것 우선.

**제공 소스**: Google Autocomplete, Google Ads, Naver Search, SerpAPI, DataForSEO, Mock

### 3.3 NormalizedTrendSeries (트렌드 시계열)

```typescript
type NormalizedTrendSeries = {
  keyword: string;
  locale: string;
  source: SearchDataSource;
  timelineData: {
    date: string;               // "2025-01" (YYYY-MM)
    value: number;              // 0-100 상대 검색량
  }[];
  relatedTopics?: { topic: string; score: number }[];
  relatedQueries?: { query: string; score: number }[];
  overallTrend: "rising" | "stable" | "declining" | "seasonal";
  trendScore: number;           // -1.0 ~ 1.0
  seasonality: number;          // 0-1 (표준편차 기반)
  yoyGrowth: number;            // YoY 성장률 (%)
  isBreakout: boolean;          // 급등 여부 (trendScore > 0.5)
  collectedAt: string;
};
```

**트렌드 계산**:
- `trendScore`: (후반기 평균 - 전반기 평균) / 전반기 평균
- `seasonality`: 표준편차 / 평균 (높을수록 계절성 강함)
- `overallTrend`: trendScore > 0.1 → rising, < -0.1 → declining, else → stable

**제공 소스**: Google Trends, Naver DataLab, DataForSEO, Mock

### 3.4 NormalizedSerpDocument (SERP 문서)

```typescript
type NormalizedSerpDocument = {
  keyword: string;
  locale: string;
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

type SerpOrganicResult = {
  position: number;             // SERP 내 순위
  url: string;
  domain: string;               // 도메인명 (예: "namu.wiki")
  title: string;
  snippet: string;
  isAd?: boolean;
};
```

**제공 소스**: SerpAPI, DataForSEO

### 3.5 NormalizedSearchIntentCandidate (의도 후보)

```typescript
type NormalizedSearchIntentCandidate = {
  keyword: string;
  locale: string;
  sources: SearchDataSource[];
  intentSignals: {
    signal: string;             // "3개 질문형 키워드 발견"
    type: "question" | "comparison" | "action" | "informational" | "navigational";
    confidence: number;         // 0-1
  }[];
  questionPatterns: string[];   // 질문형 패턴
  comparisonSignals: string[];  // 비교형 시그널
  actionSignals: string[];      // 행동형 시그널
};
```

**파생 방식**: 수집된 연관 키워드 + PAA에서 패턴 매칭으로 자동 추출

## 4. 엔진 입력 변환 (6개)

### 4.1 IntentEngineInput

```
NormalizedRelatedKeyword[] → expandedKeywords[]
NormalizedTrendSeries[]    → trendData[]
```

intent-engine의 keyword-expander / trend-aggregator 시뮬레이션을 실데이터로 대체

### 4.2 ClusterEngineInput

```
NormalizedSerpDocument[] → serpOverlap[] (Jaccard similarity)
NormalizedRelatedKeyword[] → keywords[]
```

SERP 도메인 겹침 기반 키워드 유사도 행렬 생성

### 4.3 JourneyEngineInput

```
NormalizedRelatedKeyword[] → relatedKeywords (직접 전달)
NormalizedTrendSeries[]    → trendSeries (직접 전달)
NormalizedSerpDocument[]   → serpDocuments (직접 전달)
```

이미 정규화된 형태이므로 변환 최소화

### 4.4 PersonaEngineInput (신규)

```typescript
type PersonaEngineInput = {
  seedKeyword: string;
  keywordGroups: {              // cluster-engine 결과에서 주입
    clusterId: string;
    keywords: string[];
    dominantIntent: string;
    avgSearchVolume: number;
  }[];
  behaviorSignals: {            // 연관 키워드 + PAA에서 추출
    keyword: string;
    questionPatterns: string[];
    comparisonSignals: string[];
    actionSignals: string[];
    sourceTypes: string[];
  }[];
  demographics?: {              // Naver DataLab 제공 시
    keyword: string;
    ageGroups?: { group: string; ratio: number }[];
    genderRatio?: { male: number; female: number };
  }[];
  trendPatterns: {              // 트렌드에서 관심 변화 추출
    keyword: string;
    overallTrend: "rising" | "stable" | "declining";
    seasonality: number;
    isBreakout: boolean;
  }[];
};
```

- `keywordGroups`는 cluster-engine 출력에서 채워야 하므로 빈 배열로 초기화
- `behaviorSignals`: 질문형/비교형/행동형 패턴을 연관 키워드에서 자동 추출
- `demographics`: Naver DataLab demographic 데이터 연동 시 활성화

### 4.5 GeoAeoEngineInput (신규)

```typescript
type GeoAeoEngineInput = {
  seedKeyword: string;
  serpAnalysis: {               // SERP 점유 분석
    keyword: string;
    totalOrganicResults: number;
    featuredSnippet?: { domain: string; snippet: string };
    topDomains: { domain: string; positions: number[] }[];
    paaQuestions: string[];
  }[];
  contentGaps: {                // 콘텐츠 갭 기회
    keyword: string;
    gapType: "no_snippet" | "thin_content" | "no_paa" | "low_authority";
    opportunity: number;        // 0-1
    relatedQuestions: string[];
  }[];
  keywordMetrics: {             // 검색량/경쟁도
    keyword: string;
    searchVolume: number;
    competitionIndex?: number;
    cpc?: number;
  }[];
};
```

- `serpAnalysis`: SERP organic results에서 도메인별 점유 분석
- `contentGaps`: Featured snippet 부재, PAA 부재 등으로 자동 기회 감지
- `keywordMetrics`: seedData에서 검색량/경쟁도 추출

## 5. EngineInputBundle

```typescript
type EngineInputBundle = {
  payload: NormalizedSearchAnalyticsPayload;
  intentInput: IntentEngineInput;
  clusterInput: ClusterEngineInput;
  journeyInput: JourneyEngineInput;
  personaInput: PersonaEngineInput;
  geoAeoInput: GeoAeoEngineInput;
  meta: {
    seedKeyword: string;
    locale: string;
    totalSources: number;
    successfulSources: number;
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionData: boolean;
    collectedAt: string;
  };
};
```

## 6. SearchDataSource 식별자

| 값 | 설명 |
|----|------|
| `google_ads` | Google Ads Keyword Planner |
| `google_autocomplete` | Google 자동완성 |
| `google_trends` | Google Trends |
| `google_related` | Google 연관 검색 (SERP 경유) |
| `naver_search` | 네이버 검색 API |
| `naver_datalab` | 네이버 DataLab API |
| `serp_api` | SerpAPI |
| `dataforseo` | DataForSEO |
| `mock` | Mock 시뮬레이션 |
