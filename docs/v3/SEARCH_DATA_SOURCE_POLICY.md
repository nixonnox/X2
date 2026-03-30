# Search Data Source Policy

> 데이터 소스별 정책 · 비용 · 제약 · 법적 고려사항

## 1. 데이터 소스 총괄

| 소스 | 비용 | 일일 한도 | 인증 | 현재 상태 | 우선순위 |
|------|------|----------|------|-----------|----------|
| Google Autocomplete | 무료 / $50/5K(SerpAPI) | IP 기반 | 불필요 | ✅ 가용 | 1 |
| Naver Search API | 무료 | 25,000 | API 키 | ✅ 가용 | 1 |
| Naver DataLab API | 무료 | 1,000 | API 키 | ✅ 가용 | 1 |
| SerpAPI | $50/5,000건 | 플랜별 | API 키 | ✅ 구현 | 2 |
| Google Trends | 무료(proxy) / SerpAPI | ~5/분(proxy) | 선택 | ✅ 구현 | 2 |
| DataForSEO | $0.002/task | 2,000/초 | Login/PW | ✅ 구현 | 3 |
| Google Ads | 무료(API) | 15,000 ops | OAuth2 | ✅ 구현 | 3 |
| Mock | 무료 | 무제한 | 불필요 | ✅ 가용 | Fallback |

## 2. 소스별 상세 정책

### 2.1 Google Autocomplete

- **엔드포인트**: `suggestqueries.google.com/complete/search` (비공식) 또는 SerpAPI
- **수집 데이터**: 자동완성 키워드 (최대 10개/쿼리)
- **비용**: 무료 (공개 엔드포인트), SerpAPI 경유 시 $50/5,000
- **제약**: 비공식 API — 과도한 호출 시 IP 차단 가능
- **권장**: 상업적 운영 시 SerpAPI 경유 (`SERP_API_KEY` 설정)
- **법적 고려**: Google ToS에 자동화 수집 제한. SerpAPI는 합법적 중개 서비스

### 2.2 Naver Search API

- **엔드포인트**: `openapi.naver.com/v1/search/webkr.json`
- **수집 데이터**: 웹 검색 결과 (제목/설명에서 연관 키워드 추출)
- **비용**: 무료 (네이버 개발자센터 가입 필요)
- **제약**: 일 25,000건. 연관 검색어 전용 API 없음 → 검색 결과 간접 추출
- **설정**: `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
- **법적 고려**: 공식 API, 이용약관 준수

### 2.3 Naver DataLab API

- **엔드포인트**: `openapi.naver.com/v1/datalab/search`
- **수집 데이터**: 검색 트렌드 시계열 (상대적 검색량 0-100)
- **비용**: 무료
- **제약**: 일 1,000건. 최대 5개 키워드 동시 비교. 상대적 수치만 제공
- **설정**: 동일 네이버 개발자 키 사용
- **법적 고려**: 공식 API, 이용약관 준수

### 2.4 SerpAPI

- **엔드포인트**: `serpapi.com/search.json`
- **수집 데이터**: SERP 결과, Related Searches, People Also Ask, Featured Snippet
- **비용**: $50/5,000 searches (Startup), $130/15,000 (Business)
- **제약**: 플랜별 동시 요청 수 제한
- **설정**: `SERP_API_KEY`
- **법적 고려**: 공식 유료 API. Google/Naver/Bing SERP 합법적 수집

### 2.5 Google Trends

- **연결 방식**:
  1. SerpAPI Google Trends Engine (안정적, 유료)
  2. 자체 pytrends 프록시 서버 (무료, 불안정)
- **수집 데이터**: 검색 관심도 시계열, 관련 토픽/쿼리
- **비용**: SerpAPI 경유 시 검색 건수에 포함, pytrends는 무료
- **제약**: 공식 API 없음. pytrends 분당 ~5회 권장
- **설정**: `SERP_API_KEY` 또는 `GOOGLE_TRENDS_PROXY_URL`
- **법적 고려**: 비공식 접근. SerpAPI 경유 권장

### 2.6 DataForSEO

- **엔드포인트**: `api.dataforseo.com/v3/` (Sandbox: `sandbox.dataforseo.com`)
- **수집 데이터**: 검색량, 연관 키워드, SERP, 트렌드, PAA, 경쟁도
- **비용**: $0.002/task (종량제). Sandbox 무료 테스트 가능
- **제약**: 초당 2,000 요청. 가장 포괄적인 데이터
- **설정**: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, `DATAFORSEO_SANDBOX=true` (선택)
- **법적 고려**: 공식 유료 API. 대규모 운영 시 비용 효율적

### 2.7 Google Ads Keyword Planner

- **엔드포인트**: Google Ads API v17 REST
- **수집 데이터**: 정확한 월별 검색량, CPC, 경쟁 지표, 연관 키워드
- **비용**: API 호출 무료. 단, 활성 광고 계정 + 최소 지출 필요
- **제약**:
  - Basic Access: 범위형 검색량 (1K-10K 등)
  - Standard Access: 정확한 수치 (광고 지출 중인 계정만)
  - 일 15,000 operations
- **설정**: `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CUSTOMER_ID`
- **선택**: `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (MCC 경유 시)
- **인증**: OAuth2 refresh token → access token 자동 갱신 (만료 5분 전)
- **법적 고려**: 공식 API, Google Ads 이용약관 준수 필수

## 3. 소스별 엔진 기여도

| 소스 | intent | cluster | persona | pathfinder | roadview | GEO/AEO |
|------|--------|---------|---------|------------|----------|---------|
| Google Ads | ◑ volume | | | | | ◑ metrics |
| Google Autocomplete | ● related | | ◑ signals | ◑ keywords | | |
| Google Trends | ◑ trend | | ◑ patterns | ◑ trend | ◑ trend | |
| Naver Search | ● related | | | ◑ keywords | | |
| Naver DataLab | ◑ trend | | ◑ demo | | | |
| SerpAPI | ◑ related | ● SERP | ● questions | ◑ SERP | ● questions | ● SERP+PAA |
| DataForSEO | ● 전체 | ● SERP | ● 전체 | ● 전체 | ● 전체 | ● 전체 |
| Mock | ● fallback | ● fallback | ● fallback | ● fallback | ● fallback | ◑ partial |

● = 핵심 기여, ◑ = 보조 기여

## 4. 우선순위 연결 전략

### Phase 1 — 즉시 사용 가능 (API 키만 설정)
1. **Naver Search + DataLab**: 네이버 개발자센터 가입 → 키 발급 → 바로 연결
2. **Google Autocomplete**: 키 없이 공개 엔드포인트 사용 가능

### Phase 2 — 유료 API 연결 ($50~)
3. **SerpAPI**: SERP + PAA + Related + Google Trends 일괄 수집
4. **DataForSEO**: 대규모 운영 시 비용 효율적 대안

### Phase 3 — 고급 연결
5. **Google Ads**: 광고 계정 설정 후 정밀 검색량 수집

## 5. 비용 시뮬레이션

| 시나리오 | 월 분석 건수 | 예상 비용 |
|---------|------------|----------|
| 개발/테스트 | - | $0 (Mock) |
| MVP (Naver만) | 500건 | $0 |
| 기본 운영 | 1,000건 | $50 (SerpAPI Startup) |
| 적극 운영 | 5,000건 | $130 (SerpAPI Business) |
| 대규모 운영 | 10,000건+ | ~$20 (DataForSEO) |

## 6. Rate Limiting 전략

- 어댑터별 `fetchWithTimeout()` 내장 (기본 30초)
- Google Ads: OAuth2 토큰 캐싱 + 만료 5분 전 자동 갱신
- Rate limit 응답(429) 시 `rate_limited` 상태 반환
- 향후: Redis 기반 sliding window rate limiter 추가 가능
- 향후: 어댑터별 retry with exponential backoff 추가 가능
