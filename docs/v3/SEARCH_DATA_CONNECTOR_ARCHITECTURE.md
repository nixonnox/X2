# Search Data Connector Architecture

> 검색 데이터 수집 → 정규화 → 엔진 연결 아키텍처

## 1. 개요

Search Data Connector는 외부 검색 데이터 소스(Google Ads, Google Trends, Naver, SerpAPI, DataForSEO)를
통합 수집하고, 정규화된 페이로드(NormalizedSearchAnalyticsPayload)로 변환하여
6개 분석 엔진(intent, cluster, persona, pathfinder, roadview, GEO/AEO)에 공급하는 데이터 계층이다.

### 핵심 원칙

1. **공식 API 우선**: 합법적 수집만 허용. 스크래핑/비공식 접근 금지
2. **Graceful Degradation**: 어댑터 독립 실패 허용. partial result 반환
3. **Real/Mock 투명 전환**: 환경 변수 기반 자동 감지. API 키 없으면 mock fallback
4. **Adapter Pattern**: 새 데이터 소스 추가 시 어댑터만 구현하면 즉시 연결
5. **6-Engine Coverage**: 모든 엔진에 대한 입력 변환 함수 내장

## 2. 아키텍처 다이어그램

```
┌──────────────────────────────────────────────────────┐
│  Frontend / API Layer                                │
│  buildFullAnalysisInput("화장품 추천")                 │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  search-analytics-input-builder.ts                   │
│  ┌──────────────┐   ┌──────────────────────────────┐│
│  │ resolveSearch │──▶│ buildEngineInputs()           ││
│  │ Data()       │   │ ├─ toIntentEngineInput()      ││
│  └──────┬───────┘   │ ├─ toClusterEngineInput()     ││
│         │           │ ├─ toJourneyEngineInput()      ││
│         ▼           │ ├─ toPersonaEngineInput()      ││
│  ┌──────────────┐   │ └─ toGeoAeoEngineInput()      ││
│  │ Registry     │   └──────────────────────────────┘│
│  │ (Singleton)  │                                    │
│  │ ├─ findByCapability()                             │
│  │ ├─ getCapabilityMap()                             │
│  │ └─ getEngineReadiness()                           │
│  └──────┬───────┘                                    │
│         │                                            │
│         ▼  Promise.allSettled (병렬 수집)             │
│  ┌──────────────────────────────────────────────┐   │
│  │  Adapters                                     │   │
│  │  ├─ GoogleAutocomplete (무료/SerpAPI)          │   │
│  │  ├─ NaverSearch (NAVER_CLIENT_ID)             │   │
│  │  ├─ NaverDatalab (NAVER_CLIENT_ID)            │   │
│  │  ├─ GoogleAds (OAuth2 REST API v17)           │   │
│  │  ├─ GoogleTrends (SerpAPI/proxy)              │   │
│  │  ├─ SerpAPI (SERP_API_KEY)                    │   │
│  │  ├─ DataForSEO (Basic Auth)                   │   │
│  │  └─ Mock (항상 가용)                            │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────┐
│  Engine Layer (6 engines)                            │
│  ├─ intent-engine    ← IntentEngineInput             │
│  ├─ cluster-finder   ← ClusterEngineInput            │
│  ├─ persona-engine   ← PersonaEngineInput            │
│  ├─ pathfinder       ← JourneyEngineInput            │
│  ├─ roadview         ← JourneyEngineInput            │
│  └─ geo-aeo-engine   ← GeoAeoEngineInput             │
└──────────────────────────────────────────────────────┘
```

## 3. 핵심 컴포넌트

### 3.1 Registry (`registry.ts`)

- **역할**: 어댑터 등록/조회/생명주기 관리
- **패턴**: Singleton (`SearchConnectorRegistry`)
- **주요 메서드**:
  - `register(adapter)` / `unregister(source)`: 어댑터 등록/해제
  - `findByCapability(cap)`: 특정 기능 지원 어댑터 검색
  - `getCapabilityMap()`: 전체 capability → 소스 목록 매핑
  - `getEngineReadiness()`: 각 엔진의 데이터 준비 상태 (ready/partial/unavailable)
  - `initialize()`: 환경 변수 기반 자동 감지 + 동적 어댑터 로딩
  - `healthCheckAll()`: 전체 어댑터 건강 상태 확인
  - `detectAvailableSources()`: API 키 존재 여부로 가용 소스 판별

### 3.2 Resolver (`resolver.ts`)

- **역할**: 모든 활성 어댑터에서 데이터를 수집하고 통합
- **함수**: `resolveSearchData(seedKeyword, options)`
- **수집 전략**:
  - **Fallback**: seed_keyword_volume, serp_documents → 첫 성공 어댑터 결과 사용
  - **Parallel**: related_keywords, trend_series → 모든 어댑터 병렬 실행, 결과 병합
- **후처리**: 연관 키워드 중복 제거, 의도 후보 추출

### 3.3 Adapters (`adapters/`)

| 어댑터 | 상태 | 기능 | 인증 |
|--------|------|------|------|
| MockSearchAdapter | ✅ 가용 | 전체 시뮬레이션 | 불필요 |
| GoogleAutocompleteAdapter | ✅ 가용 | autocomplete, related | SerpAPI 선택 |
| NaverSearchAdapter | ✅ 구현 | related, autocomplete | NAVER_CLIENT_* |
| NaverDatalabAdapter | ✅ 구현 | trend, demographic | NAVER_CLIENT_* |
| GoogleAdsAdapter | ✅ 구현 | volume, related, competition | GOOGLE_ADS_* (OAuth2) |
| GoogleTrendsAdapter | ✅ 구현 | trend_series | SerpAPI/Proxy |
| SerpApiAdapter | ✅ 구현 | serp, related, questions | SERP_API_KEY |
| DataForSeoAdapter | ✅ 구현 | 전체 | DATAFORSEO_* |

### 3.4 Services (`services/`)

- **search-normalization-service.ts**: Payload → 엔진별 입력 변환
  - `toIntentEngineInput()`: ExpandedKeyword + trendData 형식
  - `toClusterEngineInput()`: SERP Jaccard similarity 계산
  - `toJourneyEngineInput()`: 관련 데이터 직접 전달
  - `toPersonaEngineInput()`: 행동 시그널 + 트렌드 패턴 추출
  - `toGeoAeoEngineInput()`: SERP 점유 분석 + 콘텐츠 갭 추출
- **search-analytics-input-builder.ts**: 수집 + 변환 파이프라인
  - `buildFullAnalysisInput()`: 메인 진입점 (수집 → 변환 → EngineInputBundle)
  - `buildEngineInputs()`: 이미 수집된 데이터에서 변환만 수행
  - `EngineInputBundle`: intentInput + clusterInput + journeyInput + personaInput + geoAeoInput

## 4. 데이터 흐름

```
Seed Keyword
    │
    ▼
resolveSearchData()
    ├─ [1] collectSeedKeywordData()  ─→ NormalizedSearchKeyword
    ├─ [2] collectRelatedKeywords()  ─→ NormalizedRelatedKeyword[]
    ├─ [3] collectTrendSeries()      ─→ NormalizedTrendSeries[]
    ├─ [4] collectSerpDocuments()    ─→ NormalizedSerpDocument[]
    └─ [5] extractIntentCandidates() ─→ NormalizedSearchIntentCandidate[]
    │
    ▼
NormalizedSearchAnalyticsPayload
    │
    ├─ toIntentEngineInput()    → intent-engine.analyze()
    ├─ toClusterEngineInput()   → cluster-finder.analyzeClusterFinder()
    ├─ toPersonaEngineInput()   → persona-engine.generatePersonas()
    ├─ toJourneyEngineInput()   → pathfinder/roadview.analyze*()
    └─ toGeoAeoEngineInput()    → geo-aeo-engine.analyze()
```

## 5. Engine Capability Map

각 엔진이 필요로 하는 데이터와 소스 매핑:

| 엔진 | 필수 Capability | 선택 Capability |
|------|----------------|----------------|
| intent-engine | related_keywords | seed_keyword_volume, trend_series, autocomplete |
| cluster-engine | related_keywords, serp_documents | seed_keyword_volume |
| persona-engine | related_keywords, questions | demographic, trend_series, autocomplete |
| pathfinder-engine | related_keywords | trend_series, serp_documents, autocomplete |
| roadview-engine | related_keywords | trend_series, serp_documents, questions |
| geo-aeo-engine | serp_documents, questions | seed_keyword_volume, competition, autocomplete |

`SearchConnectorRegistry.getEngineReadiness()` 메서드로 현재 환경에서 각 엔진의 데이터 준비 상태를 실시간 확인 가능.

## 6. 환경 변수 기반 자동 감지

```
SERP_API_KEY        → GoogleAutocomplete(SerpAPI경유), SerpAPI, GoogleTrends
NAVER_CLIENT_ID     → NaverSearch, NaverDatalab
NAVER_CLIENT_SECRET → NaverSearch, NaverDatalab
GOOGLE_ADS_*        → GoogleAds (5개 키: CLIENT_ID, CLIENT_SECRET, DEVELOPER_TOKEN, REFRESH_TOKEN, CUSTOMER_ID)
DATAFORSEO_*        → DataForSEO (login + password)
GOOGLE_TRENDS_PROXY → GoogleTrends(자체프록시)
없음                → Mock fallback
```

## 7. 에러 처리 전략

1. **어댑터 수준**: try/catch로 개별 실패 격리 → null/[] 반환
2. **리졸버 수준**: Promise.allSettled로 부분 실패 허용
3. **서비스 수준**: sourceMeta에 상태/지연시간 기록
4. **Mock Fallback**: 모든 어댑터 실패 시 mock 데이터로 graceful degradation
5. **Engine Readiness**: 필수 capability 미충족 시 엔진별 partial/unavailable 상태 감지

## 8. 파일 구조

```
apps/web/src/lib/search-data/
├── types.ts                              # 핵심 타입 + DATA_SOURCE_META + ENGINE_CAPABILITY_MAP
├── registry.ts                           # SearchConnectorRegistry (싱글턴)
├── resolver.ts                           # resolveSearchData()
├── index.ts                              # Public API
├── adapters/
│   ├── base-adapter.ts                   # BaseSearchAdapter (추상)
│   ├── mock-adapter.ts                   # Mock 시뮬레이션
│   ├── google-autocomplete-adapter.ts    # Google 자동완성
│   ├── google-ads-adapter.ts             # Google Ads (OAuth2 REST v17)
│   ├── google-trends-adapter.ts          # Google Trends
│   ├── naver-search-adapter.ts           # Naver 검색
│   ├── naver-datalab-adapter.ts          # Naver DataLab
│   ├── serp-adapter.ts                   # SerpAPI
│   └── dataforseo-adapter.ts             # DataForSEO
└── services/
    ├── search-normalization-service.ts   # Payload → Engine Input 변환 (6개 엔진)
    └── search-analytics-input-builder.ts # 수집+변환 파이프라인
```
