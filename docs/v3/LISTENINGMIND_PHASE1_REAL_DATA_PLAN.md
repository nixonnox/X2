# Phase 1: 실제 검색 데이터 기반 확보 방안

> 작성일: 2026-03-13
> 목적: X2의 시뮬레이션 데이터를 실제 검색 데이터로 교체하기 위한 구체적 설계

---

## 1. 현재 상태 진단

### 시뮬레이션 데이터 위치 (교체 대상)

| 파일 | 역할 | 시뮬레이션 방식 |
|------|------|-----------------|
| `lib/intent-engine/pipeline/keyword-expander.ts` (656줄) | 키워드 확장 | BFS + 카테고리별 접미사 사전(14~44개), 템플릿 기반 확장 |
| `lib/intent-engine/pipeline/trend-aggregator.ts` (285줄) | 트렌드 수집 | `seededRandom(keyword, index)` — 12개월 가짜 데이터 생성 |
| `lib/intent-engine/pipeline/social-volume-collector.ts` (424줄) | 소셜 볼륨 수집 | 플랫폼별 `seededRange()` — 결정론적 가짜 볼륨 |

### 이미 실제 연동 가능한 부분

| 모듈 | 현재 상태 | 실제 연동 준비도 |
|------|-----------|-----------------|
| LLM 어댑터 (`classifier/llm-adapter.ts`) | OpenAI GPT-4o 연동 완료 | **즉시 사용 가능** (OPENAI_API_KEY만 설정) |
| 캐시 매니저 (`cache/cache-manager.ts`) | InMemory + Redis 이중 구조 | **즉시 사용 가능** (REDIS_URL 설정 시 Redis 활성화) |
| 작업 큐 (`queue/analysis-queue.ts`) | InMemory + BullMQ 폴백 | **즉시 사용 가능** |
| 의도 분류기 (`classifier/intent-classifier.ts`) | 175+ 정규식 패턴 + LLM 보조 | **즉시 사용 가능** (입력 데이터만 실제로 바꾸면 됨) |
| 갭 계산기 (`classifier/gap-calculator.ts`) | 로그 스케일 공식 | **즉시 사용 가능** (실제 검색량/소셜볼륨 입력 시) |

---

## 2. 필요한 외부 데이터 소스와 커넥터 설계

### 2.1 커넥터/어댑터 아키텍처

기존 코드에 `PlatformAdapter` 패턴이 있음 (`packages/api/src/services/collection/platform-adapter.ts`).
이 패턴을 검색 데이터 커넥터에도 동일하게 적용한다.

```
packages/search-data/
├── src/
│   ├── index.ts                     # Public exports
│   ├── types.ts                     # 공통 타입 정의
│   ├── adapters/
│   │   ├── base-adapter.ts          # 추상 어댑터 (인터페이스 + 공통 로직)
│   │   ├── google-ads.adapter.ts    # Google Ads Keyword Planner
│   │   ├── google-autocomplete.adapter.ts  # Google Autocomplete
│   │   ├── google-trends.adapter.ts # Google Trends (pytrends proxy 또는 SerpAPI)
│   │   ├── naver-search.adapter.ts  # Naver Search API
│   │   ├── naver-datalab.adapter.ts # Naver DataLab API
│   │   └── serp.adapter.ts         # SerpAPI 또는 DataForSEO
│   ├── cache/
│   │   └── search-data-cache.ts     # SERP/검색량 결과 캐시 (기존 CacheManager 확장)
│   └── mock/
│       ├── google-ads.mock.ts       # 개발용 mock (기존 시뮬레이션 로직 이동)
│       ├── google-autocomplete.mock.ts
│       ├── google-trends.mock.ts
│       ├── naver-search.mock.ts
│       └── serp.mock.ts
└── package.json                     # @x2/search-data
```

### 2.2 Base Adapter 인터페이스

```typescript
// packages/search-data/src/adapters/base-adapter.ts

interface SearchDataAdapter<TInput, TOutput> {
  readonly name: string;
  readonly isAvailable: boolean;       // API 키/설정 존재 여부

  fetch(input: TInput): Promise<TOutput>;
  fetchBatch(inputs: TInput[]): Promise<Map<string, TOutput>>;

  // Rate limit 관리
  readonly rateLimit: { maxPerSecond: number; maxPerDay: number };
  readonly currentUsage: { today: number; lastRequestAt: number };
}

// 환경변수로 real/mock 자동 전환
function createAdapter<T extends SearchDataAdapter>(
  realAdapter: T,
  mockAdapter: T
): T {
  return realAdapter.isAvailable ? realAdapter : mockAdapter;
}
```

### 2.3 Mock/Real 경로 분리 전략

```
환경변수 기반 자동 전환:

GOOGLE_ADS_CLIENT_ID    → 있으면 Real, 없으면 Mock
GOOGLE_ADS_DEVELOPER_TOKEN
NAVER_CLIENT_ID         → 있으면 Real, 없으면 Mock
NAVER_CLIENT_SECRET
SERP_API_KEY            → 있으면 Real, 없으면 Mock
GOOGLE_TRENDS_PROXY_URL → 있으면 Real, 없으면 Mock

전환 코드:
  const keywordExpansionAdapter = createAdapter(
    new GoogleAutocompleteAdapter(env.GOOGLE_AUTOCOMPLETE_PROXY),
    new GoogleAutocompleteMock()  // 기존 keyword-expander.ts 시뮬레이션 로직
  );
```

---

## 3. 커넥터별 상세 설계

### 3.1 Google Ads Keyword Planner API

| 항목 | 내용 |
|------|------|
| **제공 데이터** | 월간 검색량 (정확값은 광고 지출 시), CPC, 광고 경쟁도(0~1), 시즌성 |
| **교체 대상** | `keyword-expander.ts`의 `estimateSearchVolume()` (depth 기반 가짜 볼륨) |
| **API** | `googleads.googleapis.com/v17` — `KeywordPlanService.GenerateKeywordIdeas` |
| **인증** | OAuth 2.0 + Developer Token + Customer ID |
| **Rate Limit** | 15,000 operations/day (Standard Access) |
| **비용** | 무료 (API 사용료 없음, 단 Google Ads 계정 필요) |
| **구현 난이도** | 중 — OAuth 2.0 플로우 + protobuf 응답 파싱 |

**입력/출력:**
```typescript
// Input
interface GoogleAdsKeywordRequest {
  seedKeywords: string[];        // 최대 10개/요청
  language: "ko" | "en" | "ja";
  geoTarget: string;             // "2410" (South Korea)
  dateRange?: { startMonth: string; endMonth: string };
}

// Output
interface GoogleAdsKeywordResult {
  keyword: string;
  avgMonthlySearches: number;    // → searchVolume 필드에 매핑
  competitionIndex: number;      // 0-100 → 신규 필드
  topOfPageBidLow: number;       // CPC 하한 → 신규 필드
  topOfPageBidHigh: number;      // CPC 상한 → 신규 필드
  monthlySearchVolumes: { year: number; month: number; searches: number }[];
}
```

### 3.2 Google Autocomplete API

| 항목 | 내용 |
|------|------|
| **제공 데이터** | 실시간 자동완성 추천 검색어 (최대 10개/요청) |
| **교체 대상** | `keyword-expander.ts`의 `generateAutocompletePatterns()` (접미사 사전) |
| **API** | `suggestqueries.google.com/complete/search` (비공식) 또는 SerpAPI Autocomplete |
| **Rate Limit** | 비공식 API는 IP당 ~100 req/min, SerpAPI는 플랜에 따름 |
| **비용** | 비공식 무료, SerpAPI $50/5000 searches |
| **구현 난이도** | 하 — GET 요청 + JSON 파싱 |

**확장 전략:**
```
시드 키워드 "화장품"에 대해:
1. "화장품" → 10개 자동완성
2. "화장품 a", "화장품 b", ... "화장품 z" → 260개 자동완성 (alphabet prefix)
3. "화장품 ㄱ", "화장품 ㄴ", ... → 140개 자동완성 (한글 자음 prefix)
총 ~400개 연관 키워드 수집 가능
```

### 3.3 Naver Search API

| 항목 | 내용 |
|------|------|
| **제공 데이터** | 네이버 검색량 (상대값), 자동완성, 연관 검색어 |
| **교체 대상** | `keyword-expander.ts`의 `generateNaverAutocomplete()` (12개 한국어 패턴) |
| **API** | `openapi.naver.com` — 검색어 트렌드, 자동완성 |
| **Rate Limit** | 25,000 calls/day |
| **비용** | 무료 (네이버 개발자 센터 등록) |
| **구현 난이도** | 중 |

### 3.4 Google Trends (트렌드 시계열)

| 항목 | 내용 |
|------|------|
| **제공 데이터** | 12~60개월 검색 관심도 (0-100), 지역별, 관련 검색어/토픽 |
| **교체 대상** | `trend-aggregator.ts` 전체 (seededRandom 12개월 데이터) |
| **API** | pytrends (Python 비공식) 또는 SerpAPI Google Trends |
| **Rate Limit** | pytrends: IP당 ~100 req/day, SerpAPI: 플랜에 따름 |
| **비용** | pytrends 무료, SerpAPI $50/5000 |
| **구현 난이도** | 중 — pytrends는 Python 프록시 서버 필요 |

**pytrends 프록시 구조:**
```
[X2 Node.js] → HTTP → [Python Flask/FastAPI 프록시] → pytrends → Google Trends
                         workers/trends-proxy/
```

### 3.5 Naver DataLab API

| 항목 | 내용 |
|------|------|
| **제공 데이터** | 네이버 검색 트렌드, 성별/연령별 관심도 |
| **교체 대상** | 인구통계 데이터 (현재 없음) |
| **API** | `openapi.naver.com/v1/datalab/search` |
| **Rate Limit** | 1,000 calls/day |
| **비용** | 무료 |
| **구현 난이도** | 하 |

### 3.6 SerpAPI / DataForSEO (SERP 수집)

| 항목 | 내용 |
|------|------|
| **제공 데이터** | SERP 상위 10 URL, 연관 검색어, People Also Ask, 스니펫 |
| **교체 대상** | 없음 (신규) — 클러스터 파인더/패스파인더의 핵심 데이터 |
| **API** | SerpAPI: `serpapi.com/search` / DataForSEO: `api.dataforseo.com` |
| **비용** | SerpAPI $50/5000, DataForSEO $0.002/task |
| **구현 난이도** | 상 — 대량 수집 + 캐시 + 결과 정규화 |

**SerpAPI vs DataForSEO 비교:**

| 기준 | SerpAPI | DataForSEO |
|------|---------|------------|
| 가격 | $50/5000건 | $0.002/건 (종량제) |
| 데이터 범위 | Google, Naver, YouTube | Google, Naver, YouTube + 40개 엔진 |
| 연관 검색어 | O | O |
| People Also Ask | O | O |
| 도메인 순위 | O | O + 추가 SEO 지표 |
| SDK | Node.js 공식 | Node.js 공식 |
| **추천** | **MVP 단계** (간편) | **확장 단계** (비용 효율) |

---

## 4. 기존 파이프라인 교체 계획

### 현재 파이프라인 → 목표 파이프라인

```
[현재]
expandKeywords()          → 접미사 사전 기반 가짜 키워드
  ↓
aggregateTrends()         → seededRandom 12개월 가짜 트렌드
  ↓
collectSocialVolumes()    → seededRange 가짜 소셜 볼륨
  ↓
classifyKeywords()        → 정규식 + LLM (이 부분은 유지)
  ↓
buildIntentGraph()        → 그래프 빌더 (이 부분은 유지)


[목표]
expandKeywords()          → Google Autocomplete + Naver 자동완성 + Related Searches (실제 API)
  ↓
fetchSearchVolumes()      → Google Ads Keyword Planner (실제 월간 검색량 + CPC)
  ↓
fetchTrends()             → Google Trends + Naver DataLab (실제 시계열 트렌드)
  ↓
collectSocialVolumes()    → 기존 유지 (소셜 볼륨은 별도 영역)
  ↓
fetchSerpData()           → SerpAPI (신규 — SERP 상위 URL, 연관 검색어, PAA)
  ↓
classifyKeywords()        → 기존 유지 (정규식 + LLM)
  ↓
buildIntentGraph()        → 기존 유지 + SERP 데이터 반영
```

### service.ts 수정 포인트

```typescript
// 현재 service.ts의 analyze() 내부 (11단계)
// 변경이 필요한 단계:

// Stage 2: expandKeywords → 실제 API 호출로 교체
// Stage 3: aggregateTrends → Google Trends API로 교체
// Stage 4: collectSocialVolumes → 유지 (mock/real 자동 전환)
// Stage 5~8: 유지

// 신규 추가 단계:
// Stage 2.5: fetchSearchVolumes (Google Ads)
// Stage 4.5: fetchSerpData (SerpAPI) — Phase 3에서 구현
```

---

## 5. DB 스키마 추가

### 필요한 새 테이블

```prisma
// 1. 검색량 히스토리 캐시
model KeywordVolume {
  id            String   @id @default(cuid())
  keyword       String
  locale        String   @default("ko")
  source        String   // "google_ads" | "naver"
  avgMonthlySearches Int
  cpc           Float?
  competitionIndex   Float?   // 0-1
  monthlyData   Json?    // [{year, month, searches}]
  collectedAt   DateTime @default(now())
  expiresAt     DateTime // 7일 후

  @@unique([keyword, locale, source])
  @@index([keyword])
  @@index([expiresAt])
}

// 2. 트렌드 데이터 캐시
model TrendData {
  id            String   @id @default(cuid())
  keyword       String
  locale        String   @default("ko")
  source        String   // "google_trends" | "naver_datalab"
  timelineData  Json     // [{date, value}] — 최대 60개월
  relatedTopics Json?    // [{topic, value}]
  relatedQueries Json?   // [{query, value}]
  collectedAt   DateTime @default(now())
  expiresAt     DateTime // 24시간 후

  @@unique([keyword, locale, source])
  @@index([keyword])
}

// 3. SERP 결과 캐시 (Phase 3에서 사용)
model SerpResult {
  id            String   @id @default(cuid())
  keyword       String
  locale        String   @default("ko")
  engine        String   @default("google")
  organicResults Json    // [{position, url, domain, title, snippet}]
  relatedSearches Json?  // [{query}]
  peopleAlsoAsk  Json?   // [{question, snippet}]
  collectedAt   DateTime @default(now())
  expiresAt     DateTime // 7일 후

  @@unique([keyword, locale, engine])
  @@index([keyword])
  @@index([expiresAt])
}
```

---

## 6. 가장 큰 Blocker

### Blocker 1: Google Ads API 접근 권한 (심각도: 최상)

- Google Ads 계정이 필요하며, **광고 지출이 있어야 정확한 검색량**을 받을 수 있음
- 광고 지출 없는 계정은 범위값만 제공 (예: "1K~10K")
- **해결 방안:**
  - (A) 기존 Google Ads 계정 활용 — 즉시 가능
  - (B) 신규 계정 생성 + 소액 광고 집행 — 1~2주 소요
  - (C) DataForSEO를 대안으로 사용 — Google Ads 없이도 검색량 제공 ($0.002/건)

### Blocker 2: Google Trends 접근 방식 결정 (심각도: 중)

- 공식 API 없음. 3가지 선택지:
  - (A) pytrends Python 프록시 서버 구축 — 안정성 낮음 (IP 차단 위험)
  - (B) SerpAPI Google Trends 엔드포인트 — 안정적이지만 유료
  - (C) DataForSEO Google Trends — 가장 안정적이고 비용 효율적

### Blocker 3: DB 미가동 (심각도: 중)

- PostgreSQL이 아직 실행되지 않음
- 기존 5개 테이블 + 신규 3개 테이블 모두 마이그레이션 필요
- **해결:** Docker Compose로 PostgreSQL 시작 → `pnpm db:push`

### Blocker 4: 이중 분석 시스템 통일 (심각도: 중)

- REST (`/api/intent/analyze`) vs tRPC (`routers/intent.ts`) 병존
- 프론트엔드 5개 페이지는 모두 REST만 사용
- **권장:** REST 경로를 주 경로로 유지하되, 결과를 Prisma DB에 저장하는 레이어 추가

---

## 7. 구현 순서 (Phase 1 내부)

| 순서 | 작업 | 소요 | 선행 조건 |
|------|------|------|-----------|
| 1-1 | `@x2/search-data` 패키지 생성 + base-adapter 인터페이스 | 0.5일 | 없음 |
| 1-2 | 기존 시뮬레이션 로직을 mock 어댑터로 이동 | 1일 | 1-1 |
| 1-3 | Google Autocomplete 어댑터 구현 | 1일 | 1-1 |
| 1-4 | Naver Search API 어댑터 구현 | 1일 | 1-1 |
| 1-5 | Google Ads API 어댑터 구현 | 3일 | API 키 확보 |
| 1-6 | Google Trends 어댑터 구현 (SerpAPI 또는 pytrends) | 2일 | API 키 확보 |
| 1-7 | Naver DataLab 어댑터 구현 | 1일 | 1-1 |
| 1-8 | PostgreSQL 시작 + DB 마이그레이션 | 0.5일 | Docker |
| 1-9 | KeywordVolume/TrendData 캐시 테이블 구현 | 1일 | 1-8 |
| 1-10 | `service.ts` 파이프라인에 실제 어댑터 연결 | 2일 | 1-3~1-7 |
| 1-11 | REST 경로에 DB 저장 레이어 추가 | 1일 | 1-8 |

**총 소요: ~2주 (1-3, 1-4, 1-5, 1-6, 1-7은 병렬 진행 가능)**

---

## 8. Phase 1 완료 기준

- [ ] Google Autocomplete에서 실제 추천 검색어를 받아와 키워드 확장에 사용
- [ ] Google Ads API에서 실제 월간 검색량 + CPC를 받아와 표시
- [ ] Google Trends에서 실제 12~48개월 트렌드 시계열 데이터를 받아옴
- [ ] Naver에서 실제 검색량 + 자동완성을 받아옴
- [ ] 환경변수 없을 시 기존 mock 데이터로 자동 폴백
- [ ] 분석 결과가 PostgreSQL DB에 영속 저장됨
- [ ] 예상 반영률: 25% → **~45%**
