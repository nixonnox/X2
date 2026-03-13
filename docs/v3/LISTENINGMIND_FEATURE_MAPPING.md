# ListeningMind ↔ X2 기능 매핑 및 재사용 분석

> 작성일: 2026-03-13
> 목적: X2 기존 코드 중 재사용 가능한 것과 새로 만들어야 하는 것을 분리

---

## 1. 기능 매핑 총괄

| 리스닝마인드 기능 | X2 매핑 위치                              | 매핑 상태                      |
| ----------------- | ----------------------------------------- | ------------------------------ |
| 인텐트 파인더     | `app/(dashboard)/intent/page.tsx`         | 페이지 존재, 데이터 시뮬레이션 |
| 패스파인더        | `app/(dashboard)/pathfinder/page.tsx`     | 페이지 존재, 데이터 시뮬레이션 |
| 페르소나 뷰       | `app/(dashboard)/persona/page.tsx`        | 페이지 존재, 로직 하드코딩     |
| 클러스터 파인더   | `app/(dashboard)/cluster-finder/page.tsx` | 페이지 존재, GPT 연동됨        |
| 로드 뷰           | `app/(dashboard)/road-view/page.tsx`      | 페이지 존재, 구조적 차이 있음  |
| GPT 분석          | `api/intent/gpt-analyze/route.ts`         | 클러스터 분석만 구현           |
| 저니 파인더       | 없음                                      | 미구현                         |

---

## 2. 재사용 가능한 기존 모듈

### A. 즉시 재사용 가능 (수정 없이)

| 모듈           | 파일                                        | 용도                                                 |
| -------------- | ------------------------------------------- | ---------------------------------------------------- |
| 타입 정의      | `lib/intent-engine/types.ts`                | 의도 카테고리, 시간구간, 키워드 구조체 등 핵심 타입  |
| 라벨/색상 상수 | `lib/intent-engine/types.ts`                | `INTENT_CATEGORY_LABELS`, `TEMPORAL_PHASE_LABELS` 등 |
| 캐시 매니저    | `lib/intent-engine/cache/cache-manager.ts`  | LRU + Redis 이중 캐시                                |
| 작업 큐        | `lib/intent-engine/queue/analysis-queue.ts` | 비동기 작업 + SSE 이벤트                             |
| 공유 컴포넌트  | `components/shared/`                        | PageHeader, ChartCard, EmptyState                    |
| Prisma 모델    | `packages/db/prisma/schema.prisma`          | 7개 모델 정의 완료                                   |
| tRPC 라우터    | `packages/api/src/routers/intent.ts`        | 7개 프로시저 뼈대                                    |
| 네비게이션     | `lib/constants.ts`                          | 사이드바 메뉴 구성                                   |
| i18n           | `messages/ko.json`, `messages/en.json`      | 번역 키                                              |

### B. 수정 후 재사용 가능

| 모듈          | 파일                               | 필요한 수정                                              |
| ------------- | ---------------------------------- | -------------------------------------------------------- |
| 의도 분류기   | `classifier/intent-classifier.ts`  | 4분류(I/N/C/T)로 재분류, 정규식 패턴 보강                |
| 갭 계산기     | `classifier/gap-calculator.ts`     | 실제 검색량 데이터 기반으로 공식 조정                    |
| LLM 어댑터    | `classifier/llm-adapter.ts`        | 프롬프트 개선, 배치 처리 최적화                          |
| 그래프 빌더   | `graph/graph-builder.ts`           | 실제 데이터 입력 시 클러스터링/중심성 알고리즘 활용 가능 |
| Canvas 그래프 | `pathfinder/page.tsx` 내 PathGraph | 노드/엣지 렌더링 로직 재사용, 데이터 소스만 교체         |

### C. 구조만 재사용 (대부분 재작성 필요)

| 모듈             | 파일                                         | 이유                                            |
| ---------------- | -------------------------------------------- | ----------------------------------------------- |
| 키워드 확장기    | `pipeline/keyword-expander.ts`               | 전체가 시뮬레이션 — 실제 API 연동으로 교체      |
| 소셜 볼륨 수집기 | `pipeline/social-volume-collector.ts`        | 전체가 시뮬레이션 — 실제 API 연동으로 교체      |
| 트렌드 집계기    | `pipeline/trend-aggregator.ts`               | 전체가 시뮬레이션 — 실제 API 연동으로 교체      |
| 페르소나 생성    | `persona/page.tsx` 내 generatePersonas       | 5개 템플릿 하드코딩 — 행동 패턴 기반으로 재작성 |
| 브랜드 추출      | `road-view/page.tsx` 내 extractBrandMentions | 단순 휴리스틱 — NER/사전 기반으로 재작성        |

---

## 3. 새로 만들어야 하는 모듈

### 우선순위 높음 (핵심 엔진)

| 모듈                          | 설명                                                           | 난이도 |
| ----------------------------- | -------------------------------------------------------------- | ------ |
| **Google Ads API 연동**       | 실제 월간 검색량, CPC, 광고 경쟁도 수집                        | 중     |
| **Naver 검색 API 연동**       | Naver 검색량, 자동완성, 연관 검색어 수집                       | 중     |
| **SERP 수집기**               | Google SERP에서 연관 검색어, 추천 검색어, People Also Ask 수집 | 상     |
| **SERP 기반 클러스터링 엔진** | 검색 결과 공유도 기반 키워드 그룹핑                            | 상     |
| **검색 경로 그래프 빌더**     | SERP 데이터로 before/after 검색 경로 구축                      | 상     |

### 우선순위 중간 (기능 확장)

| 모듈                             | 설명                                               | 난이도 |
| -------------------------------- | -------------------------------------------------- | ------ |
| **복수 키워드 입력 UI**          | 최대 100개 키워드 동시 입력/관리                   | 하     |
| **트렌드 스파크라인**            | 3~4년 시계열 미니 차트 컴포넌트                    | 하     |
| **방향성 경로 분석 엔진**        | 시작→끝 키워드 사이 경로 추적 (로드 뷰 핵심)       | 상     |
| **행동 패턴 기반 페르소나 엔진** | 검색 여정 데이터에서 행동 군집 추출                | 상     |
| **도메인 경쟁 분석기**           | SERP에서 도메인별 노출 점유율 계산                 | 중     |
| **CDJ 자동 생성 엔진**           | 5단계 소비자 의사결정 여정 자동 매핑 (저니 파인더) | 상     |

### 우선순위 낮음 (부가 기능)

| 모듈                     | 설명                           | 난이도 |
| ------------------------ | ------------------------------ | ------ |
| **데이터 내보내기**      | CSV/Excel 다운로드             | 하     |
| **인구통계 데이터 연동** | Naver 성별/연령 데이터         | 중     |
| **기간별 비교**          | 3~12개월 검색 경로 변화 추적   | 중     |
| **대화형 AI 에이전트**   | ChatGPT/Claude 연동 마케팅 Q&A | 상     |
| **브랜드 NER 엔진**      | 키워드에서 브랜드명 자동 인식  | 중     |

---

## 4. 리스닝마인드 관련 기능 vs X2 확장 기능 분리

### 리스닝마인드 관련 (이 분석의 대상)

모든 검색 인텐트 분석 기능:

- 인텐트 파인더, 패스파인더, 페르소나 뷰, 클러스터 파인더, 로드 뷰, GPT 분석
- `lib/intent-engine/` 전체
- `api/intent/` 전체
- `packages/api/src/routers/intent.ts`
- `packages/api/src/services/intent/`

### X2 고유 기능 (별도 영역, 이 분석과 무관)

| 기능                    | 위치                                    |
| ----------------------- | --------------------------------------- |
| 소셜 채널 관리          | `packages/social/`                      |
| 댓글 수집/분석          | `app/(dashboard)/comments/`             |
| 경쟁사 모니터링         | `app/(dashboard)/competitors/`          |
| 자동화 (보고서, 스케줄) | `packages/api/src/services/automation/` |
| 대시보드 (KPI)          | `app/(dashboard)/dashboard/`            |
| 동기화/크론             | `app/api/sync/`                         |
| AI 실행/로그            | `app/api/ai/`                           |

---

## 5. 이중 구현 문제

현재 X2에는 **두 개의 독립적인 분석 시스템**이 존재:

| 시스템                           | 경로                                        | 데이터 저장              |
| -------------------------------- | ------------------------------------------- | ------------------------ |
| Path A: REST API + intent-engine | `api/intent/analyze` → `lib/intent-engine/` | 메모리만 (DB 저장 안 함) |
| Path B: tRPC + API 서비스        | `routers/intent.ts` → `services/intent/`    | Prisma DB에 저장         |

**문제점:**

- 프론트엔드 5개 페이지는 모두 Path A (REST API)를 사용
- Path B (tRPC)는 구현되어 있지만 프론트엔드에서 호출하지 않음
- 두 시스템 간 데이터가 공유되지 않음

**권장사항:**

- Path A를 주 경로로 유지하되, 분석 결과를 DB에 저장하도록 개선
- 또는 프론트엔드를 tRPC 클라이언트로 전환하여 Path B로 통일
