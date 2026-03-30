# Search Adapter Implementation Notes

> 어댑터 구현 세부사항 · 결정 근거 · 향후 작업

## 1. 어댑터별 구현 상태

### 1.1 MockSearchAdapter ✅ 완전 구현

- 기존 intent-engine의 시뮬레이션 로직(seededRandom, estimateSearchVolume) 재사용
- collectSeedKeywordData: 키워드 해시 기반 검색량/CPC/경쟁도 생성
- collectRelatedKeywords: 30개 한국어 접미사 기반 파생 (추천, 비교, 가격 등)
- collectTrendSeries: 12개월 사인파 기반 계절성 시뮬레이션
- 모든 capability 지원 → 개발/테스트에서 전체 파이프라인 검증 가능

### 1.2 GoogleAutocompleteAdapter ✅ 완전 구현

- **듀얼 경로**: SerpAPI (SERP_API_KEY 존재 시) / 공개 엔드포인트
- SerpAPI: `engine=google_autocomplete` → `suggestions[].value` 추출
- 공개 엔드포인트: `client=firefox` → Firefox JSON 형식 `[query, [suggestions]]`
- healthCheck: SerpAPI 키 확인 또는 공개 엔드포인트 연결 테스트

### 1.3 NaverSearchAdapter ✅ 완전 구현

- **API**: `openapi.naver.com/v1/search/webkr.json`
- 웹 검색 결과의 제목에서 키워드 변형 추출 (HTML 태그 제거)
- 네이버 연관 검색어 전용 API가 없으므로 간접 추출 방식 사용
- 향후: 네이버 자동완성 비공식 엔드포인트 추가 고려

### 1.4 NaverDatalabAdapter ✅ 완전 구현

- **API**: `openapi.naver.com/v1/datalab/search` (POST)
- 12개월 월별 검색 트렌드 (ratio 0-100)
- 트렌드 분석: 전반기/후반기 비교, 표준편차 기반 계절성
- buildDatalabBody(): startDate/endDate 자동 계산

### 1.5 GoogleTrendsAdapter ✅ 구현 (SerpAPI/Proxy)

- **경로 1**: SerpAPI `engine=google_trends` — 안정적, 유료
  - interest_over_time, related_queries, related_topics 추출
- **경로 2**: 자체 pytrends 프록시 서버 (GOOGLE_TRENDS_PROXY_URL)
  - POST `/trends` → interest_over_time + related 데이터
  - 프록시 서버는 별도 구축 필요 (Python + pytrends)
- 공통 buildTrendResult()로 결과 정규화

### 1.6 SerpApiAdapter ✅ 완전 구현

- **API**: `serpapi.com/search.json`
- collectSerpDocuments: organic_results, related_searches, related_questions, answer_box 추출
- collectRelatedKeywords: SERP의 related_searches + PAA를 NormalizedRelatedKeyword로 변환
- healthCheck: account.json으로 잔여 크레딧 확인

### 1.7 DataForSeoAdapter ✅ 구현 (전체 endpoint)

- **인증**: Basic Auth (login:password base64)
- collectSeedKeywordData: `/v3/keywords_data/google_ads/search_volume/live`
- collectRelatedKeywords: `/v3/keywords_data/google_ads/keywords_for_keywords/live`
- collectSerpDocuments: `/v3/serp/google/organic/live/advanced` — organic, PAA, related, featured snippet 분류
- collectTrendSeries: `/v3/keywords_data/google_trends/explore/live`
- Sandbox 모드 지원 (`DATAFORSEO_SANDBOX=true`)
- location_code: 2410 (South Korea), language_code: "ko"

### 1.8 GoogleAdsAdapter ✅ 구현 (OAuth2 REST v17)

- **인증**: OAuth2 refresh token → access token 자동 갱신
  - 토큰 캐시: `cachedAccessToken` + `tokenExpiresAt` (만료 5분 전 갱신)
  - MCC 경유 시 `login-customer-id` 헤더 지원
- **API**: Google Ads API v17 REST
  - `customers:listAccessibleCustomers` — healthCheck용
  - `customers/{id}:generateKeywordIdeas` — 검색량/CPC/경쟁도/연관 키워드
- **환경 변수** (5개 필수 + 1개 선택):
  - `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`
  - `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REFRESH_TOKEN`
  - `GOOGLE_ADS_CUSTOMER_ID` (필수)
  - `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC 경유 시 선택)
- **Korean 설정**: languageConstants/1012, geoTargetConstants/2410
- **결과 매핑**:
  - avgMonthlySearches → 월평균 검색량
  - highTopOfPageBidMicros → CPC (micros → USD 변환)
  - competition enum → LOW/MEDIUM/HIGH → 0.2/0.5/0.8 index
  - monthlySearchVolumes → 월별 분해 (MONTH enum → number)

## 2. 설계 결정 근거

### 2.1 BaseSearchAdapter 추상 클래스 사용 이유

- **기본 null/[] 반환**: 모든 capability를 구현하지 않아도 안전
- **공통 유틸리티**: normalizeKeyword(), fetchWithTimeout(), buildHealthResult()
- **일관된 인터페이스**: ISearchDataAdapter implements 보장

### 2.2 Registry Singleton 패턴

- 앱 전체에서 하나의 어댑터 집합 관리
- `initialize()` 시 환경 변수 기반 동적 어댑터 로딩 (dynamic import)
- 테스트 시 `register()`/`unregister()`로 어댑터 교체 가능
- `getEngineReadiness()`로 현재 환경에서 각 엔진의 데이터 지원 수준 확인

### 2.3 Resolver의 Fallback vs Parallel 전략

- **Fallback** (seed_keyword_volume, serp_documents): 하나의 정답이면 충분 → 첫 성공 사용
- **Parallel** (related_keywords, trend_series): 다양한 소스의 병합이 가치 → 모두 실행
- Promise.allSettled로 개별 실패 격리

### 2.4 SERP Jaccard Similarity 현재 한계

- 현재는 시드 키워드의 SERP만 수집 → 키워드 쌍별 정확한 비교 불가
- 시드 SERP 내 제목/스니펫 매칭으로 기초 추정
- **향후**: 배치로 상위 N개 연관 키워드의 SERP도 수집 → 정확한 Jaccard 계산

### 2.5 ENGINE_CAPABILITY_MAP 도입

- 각 엔진의 필수/선택 capability를 선언적으로 정의
- `getEngineReadiness()`가 이 맵을 참조하여 엔진별 데이터 준비 상태 계산
- 새 엔진 추가 시 맵에 항목만 추가하면 자동으로 상태 추적

### 2.6 PersonaEngineInput의 keywordGroups 분리

- persona-engine은 cluster-engine의 출력(클러스터링 결과)에 의존
- `toPersonaEngineInput()`은 `keywordGroups`를 빈 배열로 초기화
- 호출자(API route 등)가 cluster 결과를 별도로 주입하는 구조
- 이유: normalization service는 단일 payload → 단일 input 변환에 집중

### 2.7 GeoAeoEngineInput의 콘텐츠 갭 자동 감지

- Featured snippet 부재 → `no_snippet` 갭 (opportunity 0.8)
- PAA 부재 → `no_paa` 갭 (opportunity 0.5)
- 자동 감지이므로 SERP 데이터만 있으면 바로 기회 분석 가능
- 향후: thin_content, low_authority 등은 SERP snippet 길이 / 도메인 authority 분석 필요

## 3. 엔진 연결 포인트 (6개)

### 3.1 Intent Engine 연결

```typescript
const bundle = await buildFullAnalysisInput("화장품 추천");
// bundle.intentInput.expandedKeywords → ExpandedKeyword[] 호환 형식
// bundle.intentInput.trendData → TrendData[] 호환 형식
```

### 3.2 Cluster Finder 연결

```typescript
const bundle = await buildFullAnalysisInput("화장품 추천");
// bundle.clusterInput.serpOverlap → Jaccard similarity 행렬
// → Louvain 클러스터링의 edge weight로 활용
```

### 3.3 Persona Engine 연결

```typescript
const bundle = await buildFullAnalysisInput("화장품 추천");
// bundle.personaInput.behaviorSignals → 검색 행동 패턴
// bundle.personaInput.trendPatterns → 관심 변화 패턴
// personaInput.keywordGroups = clusterResult.clusters; // cluster 결과 주입
```

### 3.4 Pathfinder / RoadView 연결

```typescript
const bundle = await buildFullAnalysisInput("화장품 추천");
// bundle.journeyInput.relatedKeywords → 노드/엣지 생성 원본
// bundle.journeyInput.serpDocuments → SERP overlap 기반 엣지 가중치
```

### 3.5 GEO/AEO Engine 연결

```typescript
const bundle = await buildFullAnalysisInput("화장품 추천");
// bundle.geoAeoInput.serpAnalysis → SERP 점유 분석 (도메인/위치)
// bundle.geoAeoInput.contentGaps → 콘텐츠 갭 기회 (snippet/PAA 부재)
// bundle.geoAeoInput.keywordMetrics → 검색량/경쟁도
```

## 4. 향후 작업 (TODO)

### 단기 (Sprint 1-2)

1. [ ] Naver 자동완성 비공식 엔드포인트 추가 (선택)
2. [ ] 어댑터별 rate limiter 구현 (Redis sliding window)
3. [ ] 수집 결과 캐싱 (기존 cache-manager.ts 연동)
4. [ ] Google Ads 실환경 테스트 (광고 계정 연결)

### 중기 (Sprint 3-4)

5. [ ] 배치 SERP 수집 → 키워드 쌍별 Jaccard similarity 정확 계산
6. [ ] DataForSEO Sandbox 테스트 → Production 전환
7. [ ] 수집 작업 큐잉 (기존 analysis-queue.ts 연동)
8. [ ] 어댑터 메트릭 대시보드 (소스별 성공률, 지연시간, 비용)
9. [ ] Naver DataLab demographic API → PersonaEngineInput.demographics 연동

### 장기

10. [ ] Bing SERP 어댑터 추가
11. [ ] YouTube Data API 어댑터 (소셜 볼륨 실데이터)
12. [ ] 네이버 쇼핑 인사이트 API 연동
13. [ ] 자동 소스 우선순위 최적화 (비용/품질 밸런싱)
14. [ ] GEO/AEO: thin_content / low_authority 갭 감지 고도화
