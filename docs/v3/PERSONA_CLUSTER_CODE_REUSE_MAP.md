# Persona-Cluster Engine — 코드 재사용 매핑

> persona-cluster-engine 구현 시 intent-engine에서 재사용/확장/신규 작성해야 하는 코드 분류.
>
> 작성일: 2026-03-13

---

## 1. 그대로 재사용 가능 (As-Is Reuse)

intent-engine에서 **변경 없이** import하여 사용하는 코드.

| # | 원본 파일 | 함수/타입 | 사용처 (persona-cluster-engine) | 비고 |
|---|----------|----------|-------------------------------|------|
| 1 | `intent-engine/types.ts:10-15` | `IntentCategory` 타입 | `types.ts:14,22` — re-export | 5개 카테고리 (discovery, comparison, action, troubleshooting, unknown) |
| 2 | `intent-engine/types.ts:18-33` | `SubIntent` 타입 | `types.ts:15,22` — re-export | 15개 서브인텐트 |
| 3 | `intent-engine/types.ts:8` | `TemporalPhase` 타입 | `types.ts:16,22` — re-export | before/current/after 3단계 |
| 4 | `intent-engine/types.ts:267-275` | `IntentGraphData` 구조체 | `cluster-builder.ts:42` — `buildIntentClusters()` 입력 | nodes, links, clusters, journey, gapMatrix 전체 구조 |
| 5 | `intent-engine/types.ts:236-253` | `IntentGraphNode` 타입 | `cluster-builder.ts:17,53` — 노드 맵 구축 | 노드별 intent, subIntent, phase, gapScore 등 활용 |
| 6 | `intent-engine/types.ts:182-192` | `KeywordCluster` 타입 | `cluster-builder.ts:19,61` — 원본 클러스터 입력 | id, name, keywords, centroid, dominantIntent 등 |
| 7 | `intent-engine/graph/graph-builder.ts:114-253` | `detectClusters()` Louvain 알고리즘 | persona-cluster-engine이 `IntentGraphData.clusters`를 통해 간접 소비 | 탐욕적 병합 기반 클러스터링, 변경 없이 결과 수신 |
| 8 | `intent-engine/classifier/intent-classifier.ts:22-50+` | 175+ regex 규칙 (`INTENT_PATTERNS`) | persona-cluster-engine이 분류 결과를 간접 소비 | 1차 규칙 기반 분류, 결과가 노드에 반영된 상태로 수신 |
| 9 | `intent-engine/classifier/llm-adapter.ts:1-50` | `classifyWithLLM()` GPT-4o 통합 | persona-cluster-engine이 LLM 분류 결과를 간접 소비 | 3차원 분류 (intent + subIntent + phase), 배치 30건 |
| 10 | `intent-engine/classifier/gap-calculator.ts:31,75` | `calculateGapScore()`, `calculateDifficultyScore()` | cluster-builder에서 `avgGapScore` 계산 시 원본 갭 점수 활용 | Social Gap Index (0-100) |
| 11 | `intent-engine/types.ts:381-413` | `INTENT_CATEGORY_LABELS`, `TEMPORAL_PHASE_LABELS`, `GAP_LEVEL_LABELS` | 시각화 라벨 참조 | 색상·한/영 라벨 상수 |
| 12 | `intent-engine/types.ts:415-442` | `JOURNEY_STAGE_LABELS`, `SUB_INTENT_LABELS` | 시각화 라벨 참조 | 여정 단계·서브인텐트 한국어 라벨 |
| 13 | `api/intent/gpt-analyze/route.ts:1-50` | GPT 클러스터 분석 API (`POST`) | cluster-finder 페이지에서 GPT 분석 호출 | summary, topKeywords, personas, topics 반환 |

### 재사용 패턴

```
intent-engine (upstream)
  ├── types.ts        ──import──→  persona-cluster-engine/types.ts (re-export)
  ├── graph-builder    ──결과──→   IntentGraphData.clusters → cluster-builder 입력
  ├── intent-classifier ──결과──→  IntentGraphNode.intentCategory/subIntent
  ├── llm-adapter      ──결과──→  IntentGraphNode.confidence/reasoning
  └── gap-calculator   ──결과──→  IntentGraphNode.gapScore
```

---

## 2. 수정 후 재사용 가능 (Extend & Reuse)

기존 코드를 확장/수정하여 사용하는 부분.

### 2-1. KeywordCluster → IntentCluster 확장

| 필드 | KeywordCluster (원본) | IntentCluster (확장) | 변경 내용 |
|------|----------------------|---------------------|----------|
| `id` | `cluster-${idx}` | `ic-${idx}` | ID 접두사 변경 |
| `name` | centroid 키워드 | `label` (규칙 기반 자동 생성) | 라벨링 로직 추가 |
| — | 없음 | `description` | 클러스터 설명 자동 생성 |
| — | 없음 | `category: ClusterCategory` | 8종 카테고리 추론 (exploratory, comparative 등) |
| `dominantIntent` | ✅ 동일 | ✅ 동일 | 그대로 유지 |
| `dominantPhase` | ✅ 동일 | ✅ 동일 | 그대로 유지 |
| — | 없음 | `dominantStage: RoadStageType` | 6단계 여정 스테이지 추가 |
| `size` | 단순 count | `memberCount` | 필드명 변경 |
| `keywords` | string[] | `allKeywords` + `representativeKeywords` + `representativeQuestions` | 3종 분리 |
| `avgGapScore` | ✅ 동일 | ✅ 동일 | 그대로 유지 |
| `avgSearchVolume` | ✅ 동일 | ✅ 동일 | 그대로 유지 |
| — | 없음 | `avgDifficultyScore` | 난이도 점수 추가 (Phase 3 예정) |
| — | 없음 | `risingCount` | 급상승 키워드 수 |
| — | 없음 | `score` (0-100) | 클러스터 종합 점수 (규모 25% + 갭 30% + 볼륨 25% + 트렌드 20%) |
| — | 없음 | `clusterMethod` | 클러스터링 방법 태그 |
| — | 없음 | `themes[]` | 주요 테마/토픽 (패턴 기반 추출, 최대 5개) |
| — | 없음 | `metadata` | intentDist, phaseDist, stageDist, topSubIntents, createdAt |

> **구현 위치**: `cluster-builder.ts:41-107` — `buildIntentClusters()`
> **원본 참조**: `graph-builder.ts:114-253` — `detectClusters()`의 결과인 `KeywordCluster[]`를 입력으로 받음

### 2-2. generatePersonas() → buildPersonaProfiles() 확장

| 항목 | persona/page.tsx `generatePersonas()` (원본) | persona-archetype-builder.ts `buildPersonaProfiles()` (확장) |
|------|----------------------------------------------|-------------------------------------------------------------|
| **위치** | `persona/page.tsx:67-182` | `persona-archetype-builder.ts:47-95` |
| **입력** | `IntentGraphData` + `seedKeyword` | `IntentCluster[]` + `seedKeyword` + `maxPersonas` |
| **그룹핑** | `intent:phase` 문자열 키 그룹핑 | `archetype`별 그룹핑 (8종 PersonaArchetype) |
| **페르소나 수** | 최대 6개 (하드코딩) | 최대 6개 (파라미터) |
| **라벨** | 하드코딩 5종 템플릿 | `PERSONA_ARCHETYPE_LABELS` 8종 상수 |
| **Archetype** | 없음 | `PersonaArchetype` 8종 (information_seeker, price_comparator 등) |
| **Mindset** | 없음 | `PersonaMindset` 7종 (curious, cautious, urgent 등) |
| **Traits** | 하드코딩 6축 (`{ axis: string, value: number }`) | 타입 안전 6축 (`PersonaTraitAxis` enum + 데이터 보정) |
| **Questions** | 하드코딩 3개 | 클러스터 멤버에서 동적 추출 (최대 5개) |
| **Strategy** | 하드코딩 문자열 | archetype별 자동 생성 + 테마 반영 |
| **Links** | 없음 | `PersonaClusterLink[]` + `PersonaJourneyLink[]` 생성 |
| **Confidence** | 없음 | 클러스터 수·키워드 수 기반 신뢰도 (0-1) |
| **Summary** | 없음 | LLM 또는 규칙 기반 요약 텍스트 |
| **dominantStage** | 없음 | `RoadStageType` 6단계 여정 위치 |
| **messagingAngle** | 없음 | archetype별 마케팅 메시지 각도 |

### 2-3. deriveJourneyStage → RoadStageType 6단계 매핑

| 원본 (intent-engine) | 확장 (persona-cluster-engine) | 변경 내용 |
|---------------------|------------------------------|----------|
| `SearchJourneyStage` 5단계 | `RoadStageType` 6단계 | awareness→awareness, consideration→comparison, decision→decision, retention→**분리**, advocacy→advocacy + **interest/action** 추가 |
| `journey-engine/types.ts:467` `INTENT_TO_STAGE` | `cluster-builder.ts:322-327` `inferNodeStage()` | IntentCategory → RoadStageType 매핑 |
| `journey-engine/types.ts:476` `SUBINTENT_TO_STAGE` | `cluster-builder.ts:323-324` | SubIntent → RoadStageType 세밀 매핑 |

**5단계 → 6단계 매핑 테이블**:

| SearchJourneyStage (5단계) | RoadStageType (6단계) | 비고 |
|---------------------------|----------------------|------|
| `awareness` | `awareness` | 인지 → 인지 |
| — | `interest` (신규) | 관심 단계 추가 |
| `consideration` | `comparison` | 고려 → 비교 |
| `decision` | `decision` | 결정 → 결정 |
| — | `action` (신규) | 행동 단계 추가 |
| `retention` + `advocacy` | `advocacy` | 유지+옹호 → 옹호 통합 |

### 2-4. link strength → cluster score 계산

| 원본 | 확장 | 변경 내용 |
|------|------|----------|
| `IntentGraphLink.strength` (0-1) | `IntentCluster.score` (0-100) | 가중 합산 공식으로 변환 |
| `graph-builder.ts` — 링크 강도 | `cluster-builder.ts:383-398` — `calculateClusterScore()` | 규모(25%) + 갭(30%) + 볼륨(25%) + 트렌드(20%) |

### 2-5. persona/page.tsx UI 패턴 → 강화된 persona card/board

| 원본 UI | 확장 UI | 변경 내용 |
|---------|---------|----------|
| `PersonaProfile` 카드 (6축 레이더) | archetype 아이콘 + 색상 + 레이더 차트 | `PERSONA_ARCHETYPE_LABELS`의 icon/color 반영 |
| 하드코딩 질문 3개 | 동적 질문 5개 | 클러스터 멤버에서 추출 |
| 단일 전략 텍스트 | `contentStrategy` + `messagingAngle` | 2종 전략 텍스트 |
| 퍼센티지 바 | 퍼센티지 + `confidence` 배지 | 신뢰도 표시 추가 |
| — | `PersonaClusterLink` 시각화 | 페르소나-클러스터 연결 관계 표시 |

---

## 3. 새로 만들어야 함 (New Code)

완전히 새로 작성해야 하는 코드.

| # | 파일 | 주요 함수/클래스 | 기능 설명 | 예상 LOC |
|---|------|-----------------|----------|---------|
| 1 | `builders/cluster-builder.ts` | `buildIntentClusters()`, `buildSingleCluster()`, `buildQuestionCluster()`, `buildMemberships()` | KeywordCluster → IntentCluster 변환, 카테고리 추론, 테마 추출, 점수 계산, Membership 생성 | ~436 |
| 2 | `builders/persona-archetype-builder.ts` | `buildPersonaProfiles()`, `groupClustersByArchetype()`, `inferArchetypeFromCluster()`, `buildSinglePersona()`, `calculateTraits()` | IntentCluster → PersonaProfile 추론, archetype/mindset 결정, traits 계산, 전략·메시지 생성 | ~520 |
| 3 | `labelers/cluster-labeler.ts` (예정) | `labelCluster()`, `labelWithRules()`, `labelWithLLM()` | 규칙 기반 라벨 + LLM 이중 라벨링, 현재 `cluster-builder.ts`에 규칙 기반만 내장 | ~150 |
| 4 | `services/cluster-finder-service.ts` (예정) | `runClusterFinder()` | IntentGraphData 수신 → cluster-builder 호출 → ClusterFinderResult 반환 오케스트레이션 | ~120 |
| 5 | `services/persona-view-service.ts` (예정) | `runPersonaView()` | ClusterFinderResult 수신 → persona-archetype-builder 호출 → PersonaViewResult 반환 오케스트레이션 | ~120 |
| 6 | `persona-archetype-builder.ts:336-370` | `buildPersonaClusterLinks()` | 페르소나-클러스터 연관도 계산 (키워드 중복 + intent 매칭 + phase 매칭) | 내장 (~35) |
| 7 | `persona-archetype-builder.ts:372-412` | `buildPersonaJourneyLinks()` | 페르소나-여정 스테이지 연결 (6단계 RoadStageType별 키워드 수/관련도) | 내장 (~40) |
| 8 | `cluster-builder.ts:277-302` | `buildMemberships()` | ClusterMembership 생성 (노드별 소속 강도 = centrality + volume 정규화) | 내장 (~25) |

### 신규 타입 (types.ts에 정의 완료)

| # | 타입명 | 위치 | 설명 |
|---|--------|------|------|
| 1 | `IntentCluster` | `types.ts:47-74` | 강화된 클러스터 구조 (category, themes, questions, score, metadata) |
| 2 | `PersonaProfile` | `types.ts:116-143` | 검색 행동 기반 페르소나 (archetype, mindset, traits, strategy, confidence) |
| 3 | `ClusterMembership` | `types.ts:151-162` | 클러스터 소속 관계 (itemId, membershipScore, intent, phase) |
| 4 | `PersonaClusterLink` | `types.ts:168-175` | 페르소나-클러스터 연결 (relevanceScore, sharedKeywordCount) |
| 5 | `PersonaJourneyLink` | `types.ts:181-187` | 페르소나-여정 연결 (stage, relevanceScore, keywordCount) |
| 6 | `ClusterFinderRequest` / `ClusterFinderResult` | `types.ts:193-209` | 클러스터 파인더 요청/응답 |
| 7 | `PersonaViewRequest` / `PersonaViewResult` | `types.ts:222-237` | 페르소나 뷰 요청/응답 |
| 8 | `AnalysisTrace` / `AnalysisTraceStage` | `types.ts:254-276` | 분석 추적 (단계별 소요 시간, API 호출 수, 캐시 히트율) |
| 9 | `PersonaArchetype` (8종) | `types.ts:81-89` | information_seeker, price_comparator, review_validator 등 |
| 10 | `PersonaMindset` (7종) | `types.ts:92-99` | curious, cautious, urgent, analytical 등 |
| 11 | `PersonaTraitAxis` (6축) | `types.ts:102-108` | information_need, comparison_tendency 등 |
| 12 | `ClusterCategory` (8종) | `types.ts:37-45` | exploratory, comparative, price_sensitive 등 |
| 13 | `ClusterMethod` (5종) | `types.ts:29-34` | intent_phase, semantic, question, behavior, hybrid |

### 신규 상수 (types.ts에 정의 완료)

| # | 상수명 | 위치 | 설명 |
|---|--------|------|------|
| 1 | `PERSONA_ARCHETYPE_LABELS` | `types.ts:283-295` | 8종 archetype의 한/영 라벨, 색상, 아이콘 |
| 2 | `CLUSTER_CATEGORY_LABELS` | `types.ts:298-310` | 8종 클러스터 카테고리 라벨 |
| 3 | `PERSONA_TRAIT_LABELS` | `types.ts:313-320` | 6축 특성 한국어 라벨 |
| 4 | `PERSONA_MINDSET_LABELS` | `types.ts:323-331` | 7종 마인드셋 한국어 라벨 |
| 5 | `INTENT_TO_ARCHETYPE` | `types.ts:334-340` | IntentCategory → PersonaArchetype 기본 매핑 |
| 6 | `SUBINTENT_TO_ARCHETYPE` | `types.ts:343-358` | SubIntent → PersonaArchetype 세밀 매핑 |
| 7 | `ARCHETYPE_TO_MINDSET` | `types.ts:361-370` | PersonaArchetype → PersonaMindset 매핑 |
| 8 | `INTENT_PHASE_TO_CLUSTER_CATEGORY` | `types.ts:373-389` | `intent:phase` 문자열 → ClusterCategory 매핑 (15종) |

---

## 4. 타입 매핑 테이블 — intent-engine ↔ persona-cluster-engine

### 4-1. 핵심 타입 대응

| intent-engine | persona-cluster-engine | 관계 | 비고 |
|---------------|----------------------|------|------|
| `IntentCategory` | `IntentCategory` (re-export) | **동일** | 변경 없이 재사용 |
| `SubIntent` | `SubIntent` (re-export) | **동일** | 변경 없이 재사용 |
| `TemporalPhase` | `TemporalPhase` (re-export) | **동일** | 변경 없이 재사용 |
| `SearchJourneyStage` (5단계) | `RoadStageType` (6단계, journey-engine) | **확장** | interest/action 단계 추가 |
| `KeywordCluster` | `IntentCluster` | **확장** | category, themes, questions, score 등 추가 |
| `IntentGraphNode` | (직접 대응 없음, cluster-builder가 소비) | **입력** | 노드 데이터를 클러스터/페르소나로 변환 |
| `IntentGraphLink` | `PersonaClusterLink` / `PersonaJourneyLink` | **신규** | 링크 개념을 페르소나-클러스터/여정 관계로 재구성 |
| `IntentGraphData` | `ClusterFinderResult` / `PersonaViewResult` | **확장** | 분석 결과 구조 강화 |
| `ClassifiedKeyword` | `ClusterMembership` | **확장** | 키워드의 클러스터 소속 정보 추가 |
| `GapAnalysis` | `IntentCluster.avgGapScore` | **집계** | 키워드별 갭 → 클러스터별 평균 갭 |
| `AnalysisJob` | `AnalysisTrace` | **신규** | 작업 상태 대신 추적 로그 |

### 4-2. 페르소나 타입 대응

| persona/page.tsx (원본) | persona-cluster-engine (확장) | 변경 내용 |
|------------------------|------------------------------|----------|
| `PersonaProfile` (page 내 로컬 타입) | `PersonaProfile` (공유 타입) | archetype, mindset, dominantStage, confidence, summary, messagingAngle 등 추가 |
| `traits: { axis: string; value: number }[]` | `traits: PersonaTrait[]` (`PersonaTraitAxis` enum) | 타입 안전 6축 + label 필드 추가 |
| `topQuestions: string[]` (하드코딩 3개) | `typicalQuestions: string[]` (동적 추출 5개) | 필드명 변경 + 동적 추출 |
| `contentStrategy: string` | `contentStrategy` + `messagingAngle` | 2종 분리 |
| — | `relatedClusterIds: string[]` | 클러스터 연결 정보 추가 |
| — | `metadata: { sourceClusterCount, totalKeywordCount, avgGapScore, avgSearchVolume, createdAt }` | 메타데이터 추가 |

### 4-3. 상수 매핑 대응

| intent-engine 상수 | persona-cluster-engine 상수 | 관계 |
|-------------------|---------------------------|------|
| `INTENT_CATEGORY_LABELS` (5종) | `CLUSTER_CATEGORY_LABELS` (8종) | **확장** — intent 5개 → cluster category 8개 |
| `TEMPORAL_PHASE_LABELS` (3종) | (그대로 참조) | **동일** |
| `JOURNEY_STAGE_LABELS` (5종) | `ROAD_STAGE_LABELS` (6종, journey-engine) | **확장** — 5단계 → 6단계 |
| `SUB_INTENT_LABELS` (15종) | `SUBINTENT_TO_ARCHETYPE` (13종 매핑) | **변환** — 서브인텐트 → 아키타입 |
| — | `PERSONA_ARCHETYPE_LABELS` (8종) | **신규** |
| — | `PERSONA_TRAIT_LABELS` (6축) | **신규** |
| — | `PERSONA_MINDSET_LABELS` (7종) | **신규** |
| — | `INTENT_TO_ARCHETYPE` (5종) | **신규** |
| — | `ARCHETYPE_TO_MINDSET` (8종) | **신규** |
| — | `INTENT_PHASE_TO_CLUSTER_CATEGORY` (15종) | **신규** |

### 4-4. 데이터 흐름 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                     intent-engine (upstream)                     │
│                                                                 │
│  intent-classifier ──→ ClassifiedKeyword                        │
│  llm-adapter       ──→ LLMClassificationResult                  │
│  gap-calculator    ──→ GapAnalysis                              │
│  graph-builder     ──→ IntentGraphData                          │
│    └── detectClusters() ──→ KeywordCluster[]                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ IntentGraphData (전체 결과)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               persona-cluster-engine (downstream)               │
│                                                                 │
│  cluster-builder                                                │
│    └── buildIntentClusters(IntentGraphData)                     │
│         ├── KeywordCluster → IntentCluster 변환                  │
│         ├── ClusterCategory 추론                                 │
│         ├── RoadStageType 매핑                                   │
│         ├── 테마/질문 추출                                        │
│         ├── 클러스터 점수 계산                                    │
│         └── ClusterMembership 생성                               │
│                             │                                   │
│                             ▼ IntentCluster[]                   │
│  persona-archetype-builder                                      │
│    └── buildPersonaProfiles(IntentCluster[])                    │
│         ├── archetype별 그룹핑                                   │
│         ├── PersonaProfile 생성 (archetype, mindset, traits)     │
│         ├── PersonaClusterLink 생성                              │
│         └── PersonaJourneyLink 생성                              │
│                             │                                   │
│                             ▼                                   │
│  ClusterFinderResult + PersonaViewResult                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 참조 파일 경로

| 구분 | 파일 경로 |
|------|----------|
| intent-engine 타입 | `apps/web/src/lib/intent-engine/types.ts` |
| 그래프 빌더 (detectClusters) | `apps/web/src/lib/intent-engine/graph/graph-builder.ts` |
| 의도 분류기 (regex 규칙) | `apps/web/src/lib/intent-engine/classifier/intent-classifier.ts` |
| LLM 어댑터 (GPT-4o) | `apps/web/src/lib/intent-engine/classifier/llm-adapter.ts` |
| 갭 계산기 | `apps/web/src/lib/intent-engine/classifier/gap-calculator.ts` |
| GPT 분석 API | `apps/web/src/app/api/intent/gpt-analyze/route.ts` |
| 페르소나 페이지 (원본) | `apps/web/src/app/(dashboard)/persona/page.tsx` |
| 클러스터 파인더 페이지 (원본) | `apps/web/src/app/(dashboard)/cluster-finder/page.tsx` |
| persona-cluster-engine 타입 | `apps/web/src/lib/persona-cluster-engine/types.ts` |
| 클러스터 빌더 (신규) | `apps/web/src/lib/persona-cluster-engine/builders/cluster-builder.ts` |
| 페르소나 빌더 (신규) | `apps/web/src/lib/persona-cluster-engine/builders/persona-archetype-builder.ts` |
| 여정 엔진 타입 (RoadStageType) | `apps/web/src/lib/journey-engine/types.ts` |
