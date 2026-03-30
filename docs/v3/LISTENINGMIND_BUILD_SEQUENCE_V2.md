# ListeningMind 구현 순서 V2

> 작성일: 2026-03-13
> 목적: 정확한 구현 순서, 우선순위별 작업 정의, 바로 착수할 작업 명시

---

## 전체 구조

```
Phase 1 ─── 데이터 기반 확보 ──────────────── 반영률 25% → 45%  (~2주)
Phase 2 ─── 인텐트 파인더 완성 + UX ─────── 반영률 45% → 55%  (~1.5주)
Phase 3 ─── SERP 엔진 구축 ───────────────── 반영률 55% → 75%  (~3주)
Phase 4 ─── 고급 엔진 (경로/페르소나/클러스터) ─ 반영률 75% → 90%  (~4주)
Phase 5 ─── 완성도 (저니 파인더 + 부가) ──── 반영률 90% → 100% (~3주)
                                              총 ~13-14주
```

---

## 1차 우선순위: 지금 바로 착수

### Phase 1-A: 인프라 + 패키지 구조 (Day 1~2)

| # | 작업 | 파일/위치 | 상세 |
|---|------|-----------|------|
| 1 | `@x2/search-data` 패키지 생성 | `packages/search-data/` | 워크스페이스에 추가, base-adapter 인터페이스 정의 |
| 2 | `package.json`에 `"type": "module"` 추가 | 루트 `package.json` | lint-staged/eslint ES module 경고 해결 |
| 3 | Docker Compose 작성 + PostgreSQL 시작 | `docker-compose.yml` | PostgreSQL 15 + Redis 7 |
| 4 | DB 마이그레이션 적용 | `pnpm db:push` | 기존 7개 + 신규 3개 테이블 (KeywordVolume, TrendData, SerpResult) |
| 5 | `.env` 파일 정리 | `.env.example` 확장 | 모든 API 키 환경변수 목록화 |

### Phase 1-B: 기존 시뮬레이션 → Mock 어댑터 분리 (Day 2~3)

| # | 작업 | 파일 | 상세 |
|---|------|------|------|
| 6 | `keyword-expander.ts` 시뮬레이션 로직 → `google-autocomplete.mock.ts`로 이동 | `packages/search-data/src/mock/` | 인터페이스는 동일, 구현만 분리 |
| 7 | `trend-aggregator.ts` 시뮬레이션 로직 → `google-trends.mock.ts`로 이동 | 위와 동일 | seededRandom 로직 보존 |
| 8 | `social-volume-collector.ts` 시뮬레이션 로직 → `social-volume.mock.ts`로 이동 | 위와 동일 | 플랫폼별 seededRange 보존 |
| 9 | `service.ts` 파이프라인을 어댑터 패턴으로 리팩터링 | `lib/intent-engine/service.ts` | 직접 호출 → adapter.fetch()로 변경 |

### Phase 1-C: 실제 API 연동 (Day 3~10)

| # | 작업 | 소요 | 선행 |
|---|------|------|------|
| 10 | Google Autocomplete 어댑터 | 1일 | #6 |
| 11 | Naver Search API 어댑터 | 1일 | #6 |
| 12 | Google Ads Keyword Planner 어댑터 | 3일 | API 키 |
| 13 | Google Trends 어댑터 (SerpAPI 또는 pytrends) | 2일 | API 키 |
| 14 | Naver DataLab 어댑터 | 1일 | Naver 키 |
| 15 | `service.ts`에 실제 어댑터 연결 | 2일 | #10~14 |
| 16 | REST 경로에 DB 저장 레이어 추가 | 1일 | #4 |

**#10, #11, #12, #13, #14는 병렬 진행 가능**

---

## 2차 우선순위: Phase 1 완료 후 착수

### Phase 2: 인텐트 파인더 UX 완성 (Week 3~4)

| # | 작업 | 소요 | 상세 |
|---|------|------|------|
| 17 | 복수 키워드 입력 UI (태그 입력, 최대 100개) | 1일 | 쉼표/엔터 구분, 태그 삭제 |
| 18 | 트렌드 스파크라인 (SVG inline, 테이블 내) | 1일 | 12~48개월 미니 라인 차트 |
| 19 | 테이블 정렬 (검색량/CPC/갭점수) + 페이지네이션 | 1일 | 헤더 클릭 정렬 |
| 20 | CSV/Excel 다운로드 | 0.5일 | UTF-8 BOM |
| 21 | 검색 의도 4분류 (I/N/C/T) 추가 | 2일 | 기존 5분류와 병행 |
| 22 | 분석 히스토리 DB 저장 + 재열람 | 2일 | IntentQuery 활용 |
| 23 | 기능 간 네비게이션 (키워드 → 패스파인더/클러스터) | 1일 | ContextMenu 컴포넌트 |
| 24 | 로딩 프로그레스 바 (SSE 12단계) | 1일 | 기존 SSE 스트림 활용 |

---

## 3차 우선순위: 핵심 엔진 구축

### Phase 3: SERP 엔진 (Week 5~7)

| # | 작업 | 소요 | 의존성 |
|---|------|------|--------|
| 25 | SerpAPI/DataForSEO 어댑터 구현 | 3일 | API 키 결정 |
| 26 | SERP 결과 캐시 (SerpResult 테이블 + 7일 TTL) | 2일 | #4, #25 |
| 27 | SERP 유사도 행렬 계산기 (순위 가중 자카드) | 3일 | #25 |
| 28 | SERP 기반 키워드 확장 (연관 검색어 + PAA) | 2일 | #25 |
| 29 | SERP 기반 클러스터링 엔진 (기존 Louvain 재사용) | 3일 | #27 |
| 30 | 도메인 경쟁 분석기 (도메인별 SERP 점유율) | 2일 | #25 |
| 31 | 검색 경로 그래프 빌더 (SERP 연관 검색어 기반) | 5일 | #25, #28 |

### Phase 4-A: 패스파인더/로드뷰 고도화 (Week 8~10)

| # | 작업 | 소요 | 의존성 |
|---|------|------|--------|
| 32 | 다단계 BFS 확장기 (최대 10단계) | 3일 | #31 |
| 33 | 패스파인더 다단계 Canvas 레이아웃 | 3일 | #32 |
| 34 | 1000 노드 성능 최적화 (쿼드트리 + LOD) | 3일 | #33 |
| 35 | 유사 키워드 슈퍼노드 그룹핑 | 2일 | #33 |
| 36 | 로드뷰 2-키워드 입력 UI + 방향성 경로 엔진 | 5일 | #31 |
| 37 | 로드뷰 방향성 플로우 차트 (SVG) | 2일 | #36 |
| 38 | 이탈 포인트 분석 + 시각화 | 2일 | #36 |
| 39 | 브랜드 NER 엔진 (사전 + 패턴) | 3일 | — |

### Phase 4-B: 페르소나/클러스터 고도화 (Week 10~12)

| # | 작업 | 소요 | 의존성 |
|---|------|------|--------|
| 40 | 행동 패턴 추출기 (의도 시퀀스 + DBSCAN) | 3일 | #32 |
| 41 | 트레이트 점수 산출기 (하드코딩 제거) | 1일 | #40 |
| 42 | 페르소나 LLM 레이블러 (GPT-4o) | 2일 | #40 |
| 43 | 페르소나 행동 여정 미니맵 (SVG) | 2일 | #40 |
| 44 | 클러스터 네트워크 맵 (d3-force + SVG) | 3일 | #29 |
| 45 | 클러스터 도메인 점유율 차트 | 1일 | #30 |
| 46 | CEP/TPO 자동 라벨링 | 2일 | #29 |
| 47 | GPT 분석 전체 확장 (패스파인더/페르소나/로드뷰) | 3일 | #32, #40 |

---

## Phase 5: 완성도 (Week 13~15)

| # | 작업 | 소요 | 의존성 |
|---|------|------|--------|
| 48 | 저니 파인더 (10개 시드 → 5단계 CDJ) | 7일 | #31, #29 |
| 49 | 경쟁 도메인 비교 (최대 5개, CDJ 점유율) | 3일 | #30 |
| 50 | 기간별 비교 (3~12개월 스냅샷) | 3일 | #31 |
| 51 | 인구통계 (Naver 성별/연령) | 2일 | #14 |
| 52 | 대화형 AI 에이전트 | 5일 | #47 |
| 53 | CEP/TPO 프레임 완성 | 3일 | #46 |

---

## 의사결정 필요 사항 (착수 전 확정 필요)

| # | 결정 사항 | 선택지 | 추천 | 이유 |
|---|-----------|--------|------|------|
| D1 | SERP 데이터 소스 | SerpAPI vs DataForSEO | **DataForSEO** | 종량제, 비용 효율, 풍부한 데이터 |
| D2 | Google Ads 계정 | 기존 계정 vs 신규 vs DataForSEO 대체 | **DataForSEO 대체** | Google Ads OAuth 복잡도 회피 |
| D3 | Google Trends 방식 | pytrends vs SerpAPI vs DataForSEO | **DataForSEO** | 단일 소스로 통일 |
| D4 | 분석 시스템 | REST 유지 vs tRPC 전환 | **REST 유지 + DB 저장 추가** | 프론트엔드 변경 최소화 |
| D5 | 저니 파인더 포함 | 6대 기능 vs 7대 기능 | **7대 기능** | 리스닝마인드 완전 매칭 |

### DataForSEO 통합 전략 (D1~D3 모두 DataForSEO 선택 시)

```
DataForSEO 하나로 해결 가능한 데이터:
✅ 월간 검색량 + CPC + 경쟁도  (Google Ads Keyword Planner 대체)
✅ SERP 결과 (상위 URL, 연관 검색어, PAA)
✅ Google Trends 시계열
✅ Google Autocomplete
✅ Naver 검색 결과 (SERP)

비용: $0.002/task — 1,000 키워드 분석 시 ~$2
월간 예상: 10,000 키워드 분석 시 ~$20/월

장점: API 키 1개로 모든 검색 데이터 커버
단점: 외부 서비스 단일 의존
```

---

## 바로 다음 구현 프롬프트 (복사해서 사용)

### 프롬프트 1: 인프라 셋업

```
X2 프로젝트에서 다음 작업을 수행해줘:

1. 루트 package.json에 "type": "module" 추가
2. docker-compose.yml 생성 (PostgreSQL 15 + Redis 7)
3. @x2/search-data 패키지 생성:
   - packages/search-data/package.json
   - packages/search-data/src/index.ts
   - packages/search-data/src/types.ts (SearchDataAdapter 인터페이스)
   - packages/search-data/src/adapters/base-adapter.ts
4. pnpm-workspace.yaml에 등록
5. .env.example에 필요한 환경변수 추가:
   - DATABASE_URL, REDIS_URL
   - DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
   - NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
   - OPENAI_API_KEY (이미 있을 수 있음)
```

### 프롬프트 2: Mock 분리

```
X2 프로젝트 intent-engine의 시뮬레이션 로직을 mock 어댑터로 분리해줘:

1. apps/web/src/lib/intent-engine/pipeline/keyword-expander.ts에서
   시뮬레이션 로직(접미사 사전, 카테고리 패턴)을
   packages/search-data/src/mock/keyword-expansion.mock.ts로 이동

2. trend-aggregator.ts의 seededRandom 로직을
   packages/search-data/src/mock/trends.mock.ts로 이동

3. social-volume-collector.ts의 seededRange 로직을
   packages/search-data/src/mock/social-volume.mock.ts로 이동

4. 원본 파일들은 SearchDataAdapter 인터페이스를 호출하도록 변경

5. 환경변수에 따라 real/mock 자동 전환:
   DATAFORSEO_LOGIN이 있으면 real, 없으면 mock
```

### 프롬프트 3: 첫 번째 실제 API 연동

```
X2 프로젝트에 Google Autocomplete 실제 연동을 구현해줘:

1. packages/search-data/src/adapters/google-autocomplete.adapter.ts
   - suggestqueries.google.com/complete/search 호출
   - 한글 자음 + 알파벳 prefix 확장 전략
   - Rate limit: 100 req/min
   - 결과 캐시 (24시간)

2. keyword-expander.ts의 generateAutocompletePatterns()을
   실제 API 호출로 교체

3. 테스트: "화장품"으로 키워드 확장 시 실제 자동완성 결과 반환 확인
```

---

## 리스닝마인드 비핵심 영역 (별도 구분)

아래 기능은 리스닝마인드 핵심 6대 기능과 무관하며, 별도 트랙으로 관리:

| 기능 | 위치 | 상태 |
|------|------|------|
| 소셜 채널 관리 | `packages/social/` | 기존 유지 |
| 댓글 수집/분석 | `app/(dashboard)/comments/` | 기존 유지 |
| 경쟁사 모니터링 | `app/(dashboard)/competitors/` | 기존 유지 |
| 자동화 (보고서, 스케줄) | `packages/api/src/services/automation/` | 기존 유지 |
| 대시보드 (KPI) | `app/(dashboard)/dashboard/` | 기존 유지 |
| 동기화/크론 | `app/api/sync/` | 기존 유지 |

이 기능들은 X2 고유의 소셜 인텔리전스 확장 기능으로, 리스닝마인드 구현과 독립적으로 유지보수한다.
