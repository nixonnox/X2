# Persona-Cluster Engine 구현 노트

> 작성일: 2026-03-13
> 대상 코드: `apps/web/src/lib/persona-cluster-engine/`

---

## 1. 구현 완료 항목

### [x] `types.ts` — 핵심 타입 및 상수 정의

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/types.ts`
- 8개 **PersonaArchetype**: `information_seeker`, `price_comparator`, `review_validator`, `problem_solver`, `recommendation_seeker`, `trend_follower`, `action_taker`, `experience_sharer`
- 8개 **ClusterCategory**: `exploratory`, `comparative`, `price_sensitive`, `problem_solving`, `recommendation`, `action_oriented`, `experience`, `general`
- 5개 **ClusterMethod**: `intent_phase`, `semantic`, `question`, `behavior`, `hybrid`
- 7개 **PersonaMindset**: `curious`, `cautious`, `urgent`, `analytical`, `decisive`, `frustrated`, `enthusiastic`
- 6축 **PersonaTraitAxis**: `information_need`, `comparison_tendency`, `action_willingness`, `problem_awareness`, `price_sensitivity`, `trend_interest`
- **주요 타입**: `IntentCluster`, `PersonaProfile`, `ClusterMembership`, `PersonaClusterLink`, `PersonaJourneyLink`, `ClusterFinderRequest/Result`, `PersonaViewRequest/Result`, `AnalysisTrace`
- **상수 매핑 테이블**:
  - `INTENT_TO_ARCHETYPE` — IntentCategory(5개) -> PersonaArchetype 기본 매핑
  - `SUBINTENT_TO_ARCHETYPE` — SubIntent(13개) -> PersonaArchetype 세밀 매핑
  - `ARCHETYPE_TO_MINDSET` — PersonaArchetype -> PersonaMindset 기본 매핑
  - `INTENT_PHASE_TO_CLUSTER_CATEGORY` — `"intent:phase"` 키 조합(15개) -> ClusterCategory 매핑
  - `PERSONA_ARCHETYPE_LABELS` — archetype별 한국어 라벨, 영어 라벨, 색상, 아이콘
  - `CLUSTER_CATEGORY_LABELS` — category별 한국어/영어 라벨, 색상
  - `PERSONA_TRAIT_LABELS` — 6축 한국어 라벨
  - `PERSONA_MINDSET_LABELS` — 7개 마인드셋 한국어 라벨

### [x] `builders/cluster-builder.ts` — 클러스터 빌드

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/builders/cluster-builder.ts`
- **핵심 함수**: `buildIntentClusters(igData, seedKeyword, options)`
  - `IntentGraphData` -> `{ clusters: IntentCluster[], memberships: ClusterMembership[] }` 변환
  - 기존 intent-engine의 `KeywordCluster`를 강화된 `IntentCluster`로 변환
- **내부 동작**:
  - `buildSingleCluster()` — intent/phase 분포 계산, dominant 값 추론, 카테고리 추론, 대표 키워드/질문 추출, 테마 추출, 점수 계산, 스테이지 분포 계산
  - `buildQuestionCluster()` — 질문형 키워드(`?`, `어떻`, `왜`, `how`, `방법` 등) 정규식으로 분리 후 별도 클러스터 생성 (`clusterMethod: "question"`)
  - `buildMemberships()` — `centrality + searchVolume` 기반 `membershipScore` 계산
  - `inferClusterCategory()` — `INTENT_PHASE_TO_CLUSTER_CATEGORY` 매핑 + 키워드 패턴 기반 보정 (추천/가격/후기/에러 패턴)
  - `calculateClusterScore()` — 가중 합산: 규모(25%) + 갭(30%) + 볼륨(25%) + 트렌드(20%)
  - `extractThemes()` — 키워드 패턴 기반 테마 추출 (최대 5개)
  - `inferDominantStage()` — `SUBINTENT_TO_STAGE` -> `INTENT_TO_STAGE` 순으로 여정 스테이지 추론

### [x] `builders/persona-archetype-builder.ts` — 페르소나 프로필 빌드

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/builders/persona-archetype-builder.ts`
- **핵심 함수**: `buildPersonaProfiles(clusters, seedKeyword, maxPersonas)`
  - `IntentCluster[]` -> `{ personas, personaClusterLinks, personaJourneyLinks }` 추론
- **내부 동작**:
  - `groupClustersByArchetype()` — 클러스터를 archetype별로 그룹핑 (크기 순 정렬)
  - `inferArchetypeFromCluster()` — 4단계 우선순위 추론:
    1. `topSubIntent` 기반 (가장 정밀)
    2. 클러스터 카테고리 기반
    3. 키워드 패턴 기반 (트렌드/후기/추천/가격/에러/구매)
    4. `INTENT_TO_ARCHETYPE` 기본 매핑 (폴백)
  - `calculateTraits()` — archetype별 기본 trait 템플릿 (6축 값) + 데이터 기반 보정:
    - `price_sensitivity`: avgGapScore > 50이면 +10, 아니면 -5
    - `trend_interest`: risingRatio > 0.3이면 +15
    - `action_willingness`: avgSearchVolume > 5000이면 +10
  - `buildPersonaClusterLinks()` — 키워드 중복 + intent 매칭(+0.3) + phase 매칭(+0.2) 기반 relevance 계산
  - `buildPersonaJourneyLinks()` — 연관 클러스터의 스테이지 분포에서 relevance 비율 계산
  - `calculateConfidence()` — 클러스터 수(가중 40%) + 키워드 수(가중 60%) 기반 신뢰도
  - 텍스트 생성: `generatePersonaDescription()`, `generateContentStrategy()`, `generateMessagingAngle()`, `generatePersonaSummary()`

### [x] `builders/cluster-labeler.ts` — 클러스터 라벨링

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/builders/cluster-labeler.ts`
- **규칙 기반**: `labelClusters(clusters)` — 테마 기반 라벨 정제 + 키워드 공통 패턴 추출 (30% 이상 매칭 시)
- **LLM 기반**: `labelWithLLM(clusters, seedKeyword)` — GPT-4o 호출, JSON 응답 (`clusterLabels` + `personaSuggestions`), temperature 0.3
- **적용 함수**: `applyLLMLabels(clusters, llmResult)` — LLM 결과를 클러스터에 병합
- `OPENAI_API_KEY` 없으면 null 반환 (graceful fallback)

### [x] `services/cluster-finder-service.ts` — 클러스터 파인더 진입점

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/services/cluster-finder-service.ts`
- **핵심 함수**: `analyzeClusterFinder(request: ClusterFinderRequest)`
- **동작 흐름**:
  1. 기존 분석 결과 있으면 재사용, 없으면 `intentAnalysisService.analyze()` 동적 import 호출
  2. `buildIntentClusters()` 호출
  3. `labelClusters()` 규칙 기반 라벨 정제
  4. (선택) `labelWithLLM()` + `applyLLMLabels()` LLM 라벨링
  5. `maxClusters` 제한 적용 (기본 20)
  6. `buildClusterSummary()` — 카테고리 분포, intent 분포, avgGapScore 집계
  7. `buildTrace()` — 분석 추적 정보 생성

### [x] `services/persona-view-service.ts` — 페르소나 뷰 진입점

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/services/persona-view-service.ts`
- **핵심 함수**: `analyzePersonaView(request: PersonaViewRequest)`
- **동작 흐름**:
  1. 기존 클러스터 결과 있으면 재사용, 없으면 `analyzeClusterFinder()` 내부 호출
  2. `buildPersonaProfiles()` 호출 (기본 maxPersonas: 6)
  3. (선택) `enhanceWithLLM()` — GPT-4o로 페르소나 summary + messagingAngle 강화
  4. `buildPersonaSummary()` — archetype/stage 분포, dominant archetype 집계
  5. `buildTrace()` — 클러스터 trace에 persona_inference 스테이지 추가

### [x] `index.ts` — 퍼블릭 API

- **파일 경로**: `apps/web/src/lib/persona-cluster-engine/index.ts`
- 모든 타입, 상수, 서비스 함수, 빌더 함수를 re-export
- 외부 모듈에서 `@/lib/persona-cluster-engine` 하나로 접근 가능

---

## 2. 남은 작업

### 프론트엔드 연동

- [ ] `persona/page.tsx`가 아직 기존 `intent-engine` 직접 호출 (`/api/intent/analyze`) + 로컬 `generatePersonas()` 함수로 페르소나 생성
  - **파일 경로**: `apps/web/src/app/(dashboard)/persona/page.tsx`
  - 로컬 `PersonaProfile` 타입이 persona-cluster-engine의 타입과 다름 (필드 부족)
  - traits가 하드코딩된 intent 매칭 기반 (engine의 archetype별 base template + 보정 방식 미적용)
- [ ] `cluster-finder/page.tsx`가 아직 기존 `intent-engine` 직접 호출 (`/api/intent/analyze`) + `KeywordCluster` 타입 사용
  - **파일 경로**: `apps/web/src/app/(dashboard)/cluster-finder/page.tsx`
  - 강화된 `IntentCluster` 타입 미사용 (category, score, themes, clusterMethod 등 누락)
  - GPT 분석이 `/api/intent/gpt-analyze` 별도 엔드포인트 호출 (engine의 통합 LLM 파이프라인 미사용)

### API 계층

- [ ] tRPC 라우터: persona-cluster-engine용 프로시저 미구현
- [ ] REST API: `/api/persona/`, `/api/cluster/` 엔드포인트 미구현

### 데이터 및 저장

- [ ] 실데이터 연동: 현재 intent-engine의 시뮬레이션 데이터 기반으로 동작
- [ ] DB 저장: `ClusterFinderResult` / `PersonaViewResult`를 Prisma 모델로 저장하는 로직 미구현

### 테스트

- [ ] 단위 테스트 미작성 (빌더, 서비스, 라벨러 모두)
- [ ] 통합 테스트 미작성

### 고급 기능

- [ ] SERP 기반 클러스터링 (weighted Jaccard 유사도) 미구현 — `ClusterMethod: "semantic"` 구현체 없음
- [ ] DBSCAN 행동 기반 페르소나 미구현 — `ClusterMethod: "behavior"` 구현체 없음
- [ ] Persona radar chart 데이터 기반 보정 강화 필요 — 현재 3개 축만 보정 (`price_sensitivity`, `trend_interest`, `action_willingness`)
- [ ] `ClusterMembership.membershipScore` 계산 정밀화 필요 — 현재 `(centrality + volume비율) / 2`로 단순 계산
- [ ] `avgDifficultyScore`가 항상 0으로 설정됨 — "Phase 3에서 추가" 주석 존재

---

## 3. 다음 단계 준비 사항

| 우선순위 | 항목 | 설명 |
|---------|------|------|
| **P1** | 프론트엔드 전환 | `persona/page.tsx`, `cluster-finder/page.tsx`에서 `persona-cluster-engine` 서비스 함수 호출로 전환. 로컬 `generatePersonas()` 제거, `IntentCluster`/`PersonaProfile` 타입 적용 |
| **P2** | tRPC/REST API 연동 | `analyzeClusterFinder()`, `analyzePersonaView()` 호출하는 tRPC 프로시저 또는 REST 엔드포인트 구현 |
| **P3** | 실데이터 어댑터 | intent-engine의 실데이터 수집 파이프라인과 연결. SERP/자동완성 API 어댑터 |
| **P4** | DB 저장 구현 | Prisma 모델 정의 + `ClusterFinderResult`/`PersonaViewResult` 저장/조회 로직 |
| **P5** | 테스트 작성 | 빌더 단위 테스트 (cluster-builder, persona-archetype-builder, cluster-labeler) + 서비스 통합 테스트 |
| **P6** | SERP/DBSCAN 고급 기능 | weighted Jaccard 기반 semantic 클러스터링, DBSCAN 행동 기반 페르소나 추론 |

---

## 4. 기술적 메모

### 동적 import로 intent-engine 호출

`cluster-finder-service.ts`에서 `intentAnalysisService`를 **동적 import**(`await import(...)`)로 호출한다.

```typescript
const { intentAnalysisService } = await import("../../intent-engine/service");
```

**이유**: persona-cluster-engine과 intent-engine 사이의 순환 참조를 방지하기 위함. types.ts는 intent-engine/types를 정적 import하지만, 실행 로직은 런타임에만 로드하여 빌드 타임 순환 의존을 끊는다.

### Archetype 추론 4단계 우선순위

`inferArchetypeFromCluster()`는 다음 순서로 archetype을 결정한다:

1. **topSubIntent 기반** — 가장 정밀. `SUBINTENT_TO_ARCHETYPE` 매핑 (13개 SubIntent 지원)
2. **클러스터 카테고리 기반** — `exploratory -> information_seeker`, `comparative -> price_comparator` 등
3. **키워드 패턴 기반** — 정규식으로 트렌드/후기/추천/가격/에러/구매 패턴 탐지
4. **intent 기본 매핑** — `INTENT_TO_ARCHETYPE` 폴백 (5개 IntentCategory)

**이유**: SubIntent가 가장 세밀한 의도 구분을 제공하므로 1순위로 사용하고, 데이터가 부족할 때 점진적으로 넓은 기준으로 폴백한다. 키워드 패턴은 분류 누락을 보완하는 안전장치 역할이다.

### Trait 계산: base template + data 보정 방식

`calculateTraits()`는 archetype별 **고정 기본 템플릿** (6축 값)에 **실제 데이터 기반 보정**을 적용한다.

- 기본 템플릿: archetype 특성을 반영한 고정 값 (예: `information_seeker`의 `information_need: 90`, `action_willingness: 25`)
- 데이터 보정: `avgGapScore`, `risingRatio`, `avgSearchVolume` 기반으로 3개 축 조정

**이유**: 순수 데이터 기반만으로는 클러스터 크기가 작을 때 레이더 차트가 불안정해진다. 기본 템플릿이 archetype 특성의 "기대값"을 제공하고, 실제 데이터가 이를 미세 조정하는 방식으로 안정성과 반응성을 모두 확보한다. 현재 3개 축만 보정하는 것은 향후 확장 예정이다.

### 클러스터 score 가중치 설계

`calculateClusterScore()`의 가중치 배분:

| 요소 | 가중치 | 계산 방식 |
|------|--------|----------|
| 규모 (memberCount) | 25% | `min(100, memberCount * 5)` |
| 갭 스코어 (avgGapScore) | 30% | 원본 그대로 사용 (0-100) |
| 검색량 (avgSearchVolume) | 25% | `min(100, log2(max(1, volume)) * 8)` |
| 트렌드 (risingCount) | 20% | `min(100, risingCount * 20)` |

**이유**: 갭 스코어가 가장 높은 가중치(30%)를 가지는 것은 "블루오션 기회"가 클러스터 우선순위의 핵심 기준이기 때문이다. 검색량은 log 스케일로 변환하여 극단값의 영향을 완화한다. 트렌드(급상승 키워드)는 시의성을 반영하되, 일시적 현상에 과도하게 반응하지 않도록 20%로 제한했다.

### 질문형 키워드 별도 클러스터링

`buildIntentClusters()`에서 `includeQuestions: true`일 때, 기존 클러스터에 포함되지 않은 질문형 키워드(`?`, `어떻`, `왜`, `how`, `방법`, `하는 법` 등)를 별도 클러스터로 분리한다.

**이유**: 질문형 키워드는 사용자의 명시적 정보 니즈를 가장 직접적으로 드러내지만, intent+phase 기반 클러스터링에서는 여러 클러스터에 분산되거나 소규모로 누락될 수 있다. 별도 클러스터로 모아두면 FAQ 콘텐츠 전략, People Also Ask 최적화 등에 바로 활용할 수 있다.

### LLM 라벨링을 선택적으로 한 이유

`useLLM` 옵션이 `false`(기본)이면 규칙 기반 라벨링만 수행하고, `true`일 때만 GPT-4o를 호출한다.

**트레이드오프**:

| 항목 | 규칙 기반 | LLM 기반 |
|------|----------|---------|
| 속도 | 즉시 (0ms) | 1-3초 (API 호출) |
| 비용 | 무료 | GPT-4o 토큰 비용 |
| 품질 | 패턴 기반 (기계적) | 자연스러운 한국어, 맥락 반영 |
| 안정성 | 100% 성공 | API 장애/키 부재 시 실패 가능 |

**설계 결정**: 기본은 규칙 기반으로 빠르고 안정적으로 동작하되, 사용자가 원할 때 LLM으로 품질을 높일 수 있게 했다. LLM 실패 시 규칙 기반 결과가 유지되므로 (`try-catch` + `if (!result) return null`), graceful degradation이 보장된다. persona-view-service의 `enhanceWithLLM()`도 동일한 원칙을 따른다.
