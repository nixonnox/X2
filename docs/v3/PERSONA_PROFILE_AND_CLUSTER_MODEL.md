# Persona Profile & Cluster 데이터 모델

> **범위**: persona-cluster-engine의 핵심 데이터 구조, 추론 로직, 저장/조회 패턴, 추적 가능성, 확장 계획
> **소스 코드**: `apps/web/src/lib/persona-cluster-engine/`
> **최종 수정**: 2026-03-13

---

## 목차

1. [PersonaProfile 구조](#1-personaprofile-구조)
2. [IntentCluster 구조](#2-intentcluster-구조)
3. [ClusterMembership 구조](#3-clustermembership-구조)
4. [PersonaClusterLink 구조](#4-personaclusterlink-구조)
5. [PersonaJourneyLink 구조](#5-personajourneylink-구조)
6. [저장/조회 구조](#6-저장조회-구조)
7. [Traceability](#7-traceability)
8. [확장 계획](#8-확장-계획)

---

## 1. PersonaProfile 구조

검색 행동 기반으로 추론된 **가상의 사용자 아키타입**. 실제 개인을 식별하는 것이 아니라, 검색/탐색 맥락에서 반복적으로 나타나는 행동 패턴을 유형화한 것이다.

### 1.1 타입 정의

```typescript
type PersonaProfile = {
  id: string;
  label: string;                            // 한국어 라벨 ("정보 탐색 입문형")
  description: string;                      // 1-2문장 설명
  archetype: PersonaArchetype;
  mindset: PersonaMindset;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  dominantStage: RoadStageType;
  dominantTopics: string[];                 // 핵심 관심 주제 (최대 5개)
  typicalQuestions: string[];               // 대표 질문 (최대 5개)
  representativeKeywords: string[];         // 대표 키워드 (최대 15개)
  likelyStage: RoadStageType;              // 여정에서의 위치
  traits: PersonaTrait[];                   // 6축 레이더 차트 데이터
  relatedClusterIds: string[];             // 연관 클러스터 ID
  contentStrategy: string;                  // 추천 콘텐츠 전략
  messagingAngle: string;                   // 추천 메시지 각도
  percentage: number;                       // 전체 중 비중 (0-100)
  confidence: number;                       // 추론 신뢰도 (0-1)
  summary: string;                          // LLM 또는 규칙 기반 요약
  metadata: {
    sourceClusterCount: number;
    totalKeywordCount: number;
    avgGapScore: number;
    avgSearchVolume: number;
    createdAt: string;
  };
};
```

### 1.2 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 고유 식별자 (`persona-{index}`) |
| `label` | `string` | 한국어 라벨. archetype에 따라 자동 매핑 |
| `description` | `string` | archetype + seedKeyword + phase 조합으로 생성된 1-2문장 설명 |
| `archetype` | `PersonaArchetype` | 8종 아키타입 중 하나 |
| `mindset` | `PersonaMindset` | 7종 마인드셋 중 하나. archetype에서 자동 매핑 |
| `dominantIntent` | `IntentCategory` | 소속 클러스터의 intent 분포에서 최빈값 |
| `dominantPhase` | `TemporalPhase` | 소속 클러스터의 phase 분포에서 최빈값 |
| `dominantStage` | `RoadStageType` | 소속 클러스터의 stage 분포에서 최빈값 |
| `dominantTopics` | `string[]` | 클러스터 themes를 합산 후 중복 제거, 최대 5개 |
| `typicalQuestions` | `string[]` | 소속 클러스터의 대표 질문 합산, 중복 제거 후 최대 5개 |
| `representativeKeywords` | `string[]` | 소속 클러스터의 대표 키워드 합산, 중복 제거 후 최대 15개 |
| `likelyStage` | `RoadStageType` | `dominantStage`와 동일 (여정 내 위치 강조 용도) |
| `traits` | `PersonaTrait[]` | 6축 레이더 차트 데이터. archetype 기본값 + 데이터 보정 |
| `relatedClusterIds` | `string[]` | 해당 archetype으로 그룹핑된 클러스터의 ID 목록 |
| `contentStrategy` | `string` | archetype별 추천 콘텐츠 전략 텍스트 |
| `messagingAngle` | `string` | archetype별 추천 마케팅 메시지 각도 |
| `percentage` | `number` | 전체 키워드 대비 해당 페르소나 소속 키워드 비율 (0-100) |
| `confidence` | `number` | 추론 신뢰도. `클러스터수 기여(40%) + 키워드수 기여(60%)` |
| `summary` | `string` | 규칙 기반 종합 요약문 (LLM 고도화 대비) |
| `metadata` | `object` | 소스 클러스터 수, 총 키워드 수, 평균 갭 점수, 평균 검색량, 생성 시각 |

### 1.3 PersonaArchetype (8종)

| 값 | 한국어 라벨 | 영문 라벨 | 색상 | 아이콘 |
|----|------------|-----------|------|--------|
| `information_seeker` | 정보 탐색 입문형 | Information Seeker | `#3b82f6` | Search |
| `price_comparator` | 가격 비교 신중형 | Price Comparator | `#f59e0b` | Scale |
| `review_validator` | 후기 검증 실속형 | Review Validator | `#10b981` | CheckCircle |
| `problem_solver` | 문제 해결 긴급형 | Problem Solver | `#ef4444` | Wrench |
| `recommendation_seeker` | 추천 탐색 확신형 | Recommendation Seeker | `#8b5cf6` | ThumbsUp |
| `trend_follower` | 트렌드 추종형 | Trend Follower | `#ec4899` | TrendingUp |
| `action_taker` | 즉시 실행형 | Action Taker | `#06b6d4` | Zap |
| `experience_sharer` | 경험 공유형 | Experience Sharer | `#84cc16` | MessageCircle |

### 1.4 PersonaMindset (7종)

archetype으로부터 자동 매핑된다.

| 값 | 한국어 | 매핑되는 archetype |
|----|--------|-------------------|
| `curious` | 궁금한 | information_seeker |
| `cautious` | 신중한 | price_comparator |
| `urgent` | 급한 | problem_solver |
| `analytical` | 분석적인 | review_validator |
| `decisive` | 결단력 있는 | action_taker |
| `frustrated` | 불만족한 | (현재 기본 매핑 없음, 데이터 보정용) |
| `enthusiastic` | 열정적인 | recommendation_seeker, trend_follower, experience_sharer |

### 1.5 PersonaTrait (6축)

레이더 차트 표시용. archetype별 기본 템플릿 값에 데이터 기반 보정을 적용한다.

```typescript
type PersonaTrait = {
  axis: PersonaTraitAxis;
  label: string;
  value: number;  // 0-100
};
```

| 축 (`PersonaTraitAxis`) | 한국어 | 설명 |
|--------------------------|--------|------|
| `information_need` | 정보 니즈 | 정보 수집/탐색 강도 |
| `comparison_tendency` | 비교 성향 | 옵션 비교/검토 경향 |
| `action_willingness` | 행동 의지 | 구매/가입 등 행동 전환 의지 |
| `problem_awareness` | 문제 의식 | 문제 인식/해결 욕구 |
| `price_sensitivity` | 가격 민감도 | 가격/비용에 대한 민감도 |
| `trend_interest` | 트렌드 관심 | 최신 트렌드/동향 관심도 |

**데이터 기반 보정 규칙:**

| 조건 | 보정 |
|------|------|
| `avgGapScore > 50` | `price_sensitivity += 10` |
| `avgGapScore <= 50` | `price_sensitivity -= 5` |
| `risingRatio > 0.3` | `trend_interest += 15` |
| `avgSearchVolume > 5000` | `action_willingness += 10` |

모든 값은 최종적으로 `0-100` 범위로 클램핑된다.

### 1.6 Archetype 추론 우선순위

클러스터에서 archetype을 추론할 때, 다음 우선순위를 따른다.

```
1. subIntent 기반 (가장 정밀)
   → cluster.metadata.topSubIntents[0]을 SUBINTENT_TO_ARCHETYPE에서 조회

2. 클러스터 카테고리 기반
   → cluster.category를 categoryMap에서 조회

3. 키워드 패턴 기반
   → cluster.allKeywords를 정규식으로 매칭

4. intent 기본 매핑 (fallback)
   → cluster.dominantIntent를 INTENT_TO_ARCHETYPE에서 조회
```

**SubIntent → Archetype 매핑:**

| SubIntent | Archetype |
|-----------|-----------|
| `definition`, `how_to`, `tutorial` | `information_seeker` |
| `list`, `alternative` | `recommendation_seeker` |
| `review` | `review_validator` |
| `versus`, `price` | `price_comparator` |
| `purchase`, `signup` | `action_taker` |
| `error_fix`, `refund` | `problem_solver` |
| `trend` | `trend_follower` |
| `experience` | `experience_sharer` |

**Intent → Archetype 기본 매핑:**

| IntentCategory | Archetype |
|---------------|-----------|
| `discovery` | `information_seeker` |
| `comparison` | `price_comparator` |
| `action` | `action_taker` |
| `troubleshooting` | `problem_solver` |
| `unknown` | `information_seeker` |

---

## 2. IntentCluster 구조

의도(intent) + 시간적 맥락(phase) 기반으로 키워드를 그룹핑한 **강화된 클러스터**. 기존 intent-engine의 `KeywordCluster`를 변환하여 생성한다.

### 2.1 타입 정의

```typescript
type IntentCluster = {
  id: string;
  label: string;
  description: string;
  category: ClusterCategory;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  dominantStage: RoadStageType;
  memberCount: number;
  representativeKeywords: string[];
  representativeQuestions: string[];
  allKeywords: string[];
  centroid: string;
  avgGapScore: number;
  avgSearchVolume: number;
  avgDifficultyScore: number;
  risingCount: number;
  score: number;
  clusterMethod: ClusterMethod;
  themes: string[];
  metadata: {
    intentDistribution: Record<IntentCategory, number>;
    phaseDistribution: Record<TemporalPhase, number>;
    stageDistribution: Partial<Record<RoadStageType, number>>;
    topSubIntents: { subIntent: SubIntent; count: number }[];
    createdAt: string;
  };
};
```

### 2.2 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | 고유 식별자 (`ic-{index}`) |
| `label` | `string` | `{centroid} {카테고리 한글} 클러스터` 형식 자동 생성 |
| `description` | `string` | 카테고리 + 대표 키워드 기반 자동 생성 설명 |
| `category` | `ClusterCategory` | 8종 카테고리 중 하나 |
| `dominantIntent` | `IntentCategory` | 멤버 노드 intent 분포 최빈값 |
| `dominantPhase` | `TemporalPhase` | 멤버 노드 phase 분포 최빈값 |
| `dominantStage` | `RoadStageType` | 멤버 노드 stage 추론 최빈값 |
| `memberCount` | `number` | 클러스터 소속 키워드 수 |
| `representativeKeywords` | `string[]` | 검색량 상위 10개 키워드 |
| `representativeQuestions` | `string[]` | 질문형 키워드 중 검색량 상위 5개 |
| `allKeywords` | `string[]` | 전체 멤버 키워드 |
| `centroid` | `string` | 클러스터 중심 키워드 |
| `avgGapScore` | `number` | 멤버 평균 갭 점수 |
| `avgSearchVolume` | `number` | 멤버 평균 검색량 |
| `avgDifficultyScore` | `number` | 현재 미사용 (`0`). Phase 3에서 추가 예정 |
| `risingCount` | `number` | 급상승(`isRising`) 키워드 수 |
| `score` | `number` | 클러스터 종합 점수 (0-100) |
| `clusterMethod` | `ClusterMethod` | 클러스터링 방법 |
| `themes` | `string[]` | 패턴 매칭으로 추출한 주제 (최대 5개) |
| `metadata` | `object` | intent/phase/stage 분포, topSubIntents, 생성 시각 |

### 2.3 ClusterCategory (8종)

| 값 | 한국어 | 설명 |
|----|--------|------|
| `exploratory` | 입문형 탐색 | 기초 정보 수집 목적 |
| `comparative` | 비교/검토형 | 옵션 비교, 평가 목적 |
| `price_sensitive` | 가격 민감형 | 가격/비용 중심 검색 |
| `problem_solving` | 문제 해결형 | 오류/문제 해결 목적 |
| `recommendation` | 추천 탐색형 | 추천/순위 탐색 |
| `action_oriented` | 행동/실행형 | 구매/가입 등 행동 전환 |
| `experience` | 경험/후기형 | 사용 경험, 후기 검색 |
| `general` | 일반 | 위 분류에 해당하지 않는 일반 검색 |

**카테고리 추론 로직:**

```
1. Intent+Phase 조합 매핑 (INTENT_PHASE_TO_CLUSTER_CATEGORY)
   예: "discovery:before" → "exploratory"
       "action:current"  → "action_oriented"

2. 키워드 패턴 보정 (우선 적용)
   - /추천|순위|best|top|ranking/     → "recommendation"
   - /가격|비용|비교|vs|versus/        → "price_sensitive"
   - /후기|리뷰|경험|사용기/            → "experience"
   - /에러|오류|문제|해결|fix/          → "problem_solving"
```

### 2.4 ClusterMethod (5종)

| 값 | 설명 |
|----|------|
| `intent_phase` | intent + temporalPhase 기반 (기존 Louvain 알고리즘). 현재 기본값 |
| `semantic` | 의미적 유사도 기반 (확장 예정) |
| `question` | 질문형 키워드 전용 클러스터 |
| `behavior` | 검색 행동 패턴 기반 (확장 예정) |
| `hybrid` | 복합 방식 (확장 예정) |

### 2.5 Score 계산 공식

```
score = sizeScore × 0.25 + gapScore × 0.30 + volumeScore × 0.25 + trendScore × 0.20
```

| 항목 | 가중치 | 산식 |
|------|--------|------|
| `sizeScore` (규모) | 25% | `min(100, memberCount × 5)` |
| `gapScore` (갭) | 30% | `avgGapScore` (0-100 그대로 사용) |
| `volumeScore` (검색량) | 25% | `min(100, log2(max(1, avgSearchVolume)) × 8)` |
| `trendScore` (트렌드) | 20% | `min(100, risingCount × 20)` |

최종 값은 반올림하여 0-100 정수.

### 2.6 metadata 구조

```typescript
metadata: {
  intentDistribution: Record<IntentCategory, number>;
  // 예: { discovery: 12, comparison: 5, action: 3, troubleshooting: 1, unknown: 0 }

  phaseDistribution: Record<TemporalPhase, number>;
  // 예: { before: 8, current: 10, after: 3 }

  stageDistribution: Partial<Record<RoadStageType, number>>;
  // 예: { awareness: 5, interest: 8, comparison: 4 }

  topSubIntents: { subIntent: SubIntent; count: number }[];
  // 예: [{ subIntent: "how_to", count: 7 }, { subIntent: "review", count: 3 }]

  createdAt: string;  // ISO 8601
}
```

---

## 3. ClusterMembership 구조

개별 키워드/질문이 어떤 클러스터에 소속되는지를 나타내는 **소속 관계**.

### 3.1 타입 정의

```typescript
type ClusterMemberType = "keyword" | "question" | "topic" | "brand";

type ClusterMembership = {
  itemId: string;
  itemLabel: string;
  itemType: ClusterMemberType;
  clusterId: string;
  membershipScore: number;   // 0-1
  intent: IntentCategory;
  phase: TemporalPhase;
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
};
```

### 3.2 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `itemId` | `string` | IntentGraphNode의 id |
| `itemLabel` | `string` | 키워드 텍스트 (node.name) |
| `itemType` | `ClusterMemberType` | 멤버 유형. 질문형 정규식 매칭 시 `question`, 그 외 `keyword` |
| `clusterId` | `string` | 소속 클러스터 ID |
| `membershipScore` | `number` | 소속 강도 (0-1) |
| `intent` | `IntentCategory` | 해당 키워드의 intent 분류 |
| `phase` | `TemporalPhase` | 해당 키워드의 시간적 맥락 |
| `searchVolume` | `number` | 월간 검색량 |
| `gapScore` | `number` | 갭 점수 |
| `isRising` | `boolean` | 급상승 키워드 여부 |

### 3.3 itemType 분류 기준

| 값 | 판별 기준 |
|----|----------|
| `question` | 키워드가 `/\?|어떻|왜|어디|언제|how|what|why/` 패턴에 매칭 |
| `keyword` | 위 패턴에 매칭되지 않는 경우 |
| `topic` | (현재 미사용, 확장 예정) |
| `brand` | (현재 미사용, 확장 예정) |

### 3.4 membershipScore 계산

```
membershipScore = (centrality + searchVolume / maxVolume) / 2
```

- `centrality`: IntentGraphNode의 중심성 값 (0-1)
- `searchVolume / maxVolume`: 클러스터 내 최대 검색량 대비 정규화 (0-1)
- 최종 값은 소수점 셋째 자리까지 반올림

### 3.5 소속 관계

```
IntentCluster (1) ──── (N) ClusterMembership ──── (1) IntentGraphNode
```

- 한 키워드는 하나의 클러스터에만 소속된다 (현재 구현).
- 질문형 키워드 별도 클러스터 옵션이 켜져 있으면, 기존 클러스터에 미소속된 질문형 키워드가 별도 클러스터로 분리된다.

---

## 4. PersonaClusterLink 구조

페르소나와 클러스터 사이의 **다대다 연결 관계**.

### 4.1 타입 정의

```typescript
type PersonaClusterLink = {
  personaId: string;
  clusterId: string;
  relevanceScore: number;    // 0-1
  sharedKeywordCount: number;
  sharedIntentMatch: boolean;
  sharedPhaseMatch: boolean;
};
```

### 4.2 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `personaId` | `string` | PersonaProfile.id |
| `clusterId` | `string` | IntentCluster.id |
| `relevanceScore` | `number` | 연관 강도 (0-1) |
| `sharedKeywordCount` | `number` | 페르소나 대표 키워드 중 클러스터에 포함된 키워드 수 |
| `sharedIntentMatch` | `boolean` | dominant intent가 일치하는지 |
| `sharedPhaseMatch` | `boolean` | dominant phase가 일치하는지 |

### 4.3 relevanceScore 계산

```
relevance = keywordOverlap + intentBonus + phaseBonus

keywordOverlap = sharedKeywordCount / max(1, persona.representativeKeywords.length)
intentBonus    = persona.dominantIntent === cluster.dominantIntent ? 0.3 : 0
phaseBonus     = persona.dominantPhase  === cluster.dominantPhase  ? 0.2 : 0

relevance = min(1.0, relevance)
```

### 4.4 연결 기준

링크가 생성되려면 다음 중 하나를 만족해야 한다:
- `relevanceScore > 0.1`
- 해당 클러스터가 페르소나의 `relatedClusterIds`에 이미 포함되어 있음

---

## 5. PersonaJourneyLink 구조

페르소나가 **6단계 여정(Road View)** 의 어느 단계에 위치하는지를 나타낸다.

### 5.1 타입 정의

```typescript
type PersonaJourneyLink = {
  personaId: string;
  stage: RoadStageType;
  relevanceScore: number;    // 0-1
  keywordCount: number;
  dominantIntent: IntentCategory;
};
```

### 5.2 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `personaId` | `string` | PersonaProfile.id |
| `stage` | `RoadStageType` | 6단계 중 하나 |
| `relevanceScore` | `number` | 해당 stage의 키워드 비중 (0-1) |
| `keywordCount` | `number` | 해당 stage에 소속된 키워드 수 |
| `dominantIntent` | `IntentCategory` | 페르소나의 dominant intent |

### 5.3 Stage 종류 (6단계)

```
awareness → interest → comparison → decision → action → advocacy
```

### 5.4 relevanceScore 계산

```
relevanceScore = stageKeywordCount / totalKeywordCount
```

- `stageKeywordCount`: 페르소나에 연결된 클러스터들의 `stageDistribution`에서 해당 stage의 합산 키워드 수
- `totalKeywordCount`: 해당 페르소나에 연결된 클러스터들의 전체 stage 키워드 합산
- `keywordCount`가 0인 stage는 링크가 생성되지 않는다

---

## 6. 저장/조회 구조

### 6.1 Prisma 모델 매핑

현재 DB에 저장되는 모델은 3개이며, 런타임 타입과 다음과 같이 매핑된다.

#### Persona (DB) ↔ PersonaProfile (Runtime)

```prisma
model Persona {
  id              String         @id @default(cuid())
  queryId         String
  query           IntentQuery    @relation(...)
  label           String
  description     String
  dominantIntent  IntentCategory
  dominantPhase   TemporalPhase
  percentage      Float          @default(0)
  traits          Json?          // PersonaTrait[] 직렬화
  topQuestions    String[]
  contentStrategy String?
  keywords        PersonaKeyword[]
  createdAt       DateTime       @default(now())
}
```

| Runtime 필드 | DB 필드 | 저장 방식 |
|-------------|---------|----------|
| `id` | `id` | cuid 자동 생성 |
| `label` | `label` | 직접 저장 |
| `description` | `description` | 직접 저장 |
| `archetype` | (미저장) | label에서 역추론 가능 |
| `mindset` | (미저장) | archetype에서 자동 매핑 |
| `dominantIntent` | `dominantIntent` | enum 저장 |
| `dominantPhase` | `dominantPhase` | enum 저장 |
| `dominantStage` | (미저장) | 런타임 재계산 |
| `traits` | `traits` | **JSON 직렬화** |
| `typicalQuestions` | `topQuestions` | 배열 직접 저장 |
| `representativeKeywords` | → `PersonaKeyword[]` | **관계형 테이블** |
| `contentStrategy` | `contentStrategy` | 직접 저장 |
| `percentage` | `percentage` | 직접 저장 |
| `confidence` | (미저장) | 런타임 재계산 |
| `summary` | (미저장) | 런타임 재생성 |
| `metadata` | (미저장) | 런타임 재계산 |

#### PersonaKeyword (DB)

```prisma
model PersonaKeyword {
  id        String  @id @default(cuid())
  personaId String
  persona   Persona @relation(...)
  keyword   String
  weight    Float   @default(1)

  @@unique([personaId, keyword])
}
```

| 필드 | 설명 |
|------|------|
| `keyword` | 대표 키워드 텍스트 |
| `weight` | 키워드 가중치 (기본 1). membershipScore 등으로 활용 가능 |

#### KeywordClusterResult (DB) ↔ IntentCluster (Runtime)

```prisma
model KeywordClusterResult {
  id             String         @id @default(cuid())
  queryId        String
  query          IntentQuery    @relation(...)
  clusterIndex   Int
  name           String
  centroid       String
  dominantIntent IntentCategory
  dominantPhase  TemporalPhase
  avgGapScore    Float          @default(0)
  avgVolume      Float          @default(0)
  size           Int            @default(0)
  keywords       String[]
  gptAnalysis    Json?
  createdAt      DateTime       @default(now())
}
```

| Runtime 필드 | DB 필드 | 저장 방식 |
|-------------|---------|----------|
| `id` | `id` | cuid 자동 생성 |
| `label` | `name` | 직접 저장 |
| `centroid` | `centroid` | 직접 저장 |
| `dominantIntent` | `dominantIntent` | enum 저장 |
| `dominantPhase` | `dominantPhase` | enum 저장 |
| `avgGapScore` | `avgGapScore` | 직접 저장 |
| `avgSearchVolume` | `avgVolume` | 직접 저장 |
| `memberCount` | `size` | 직접 저장 |
| `allKeywords` | `keywords` | 배열 직접 저장 |
| `category` | (미저장) | 런타임 재추론 |
| `score` | (미저장) | 런타임 재계산 |
| `metadata` | `gptAnalysis` | **JSON 직렬화 (GPT 분석 결과 캐시)** |
| `themes` | (미저장) | 런타임 재추출 |

### 6.2 하이브리드 저장 전략

현재 시스템은 **JSON + 관계형**의 하이브리드 저장 전략을 사용한다.

| 저장 방식 | 대상 | 이유 |
|----------|------|------|
| **관계형 (정규화)** | PersonaKeyword (keyword, weight) | 키워드 단위 조회/필터링 필요 |
| **관계형 (정규화)** | Persona 기본 필드 (label, intent, phase 등) | enum 기반 필터링, 인덱싱 |
| **관계형 (정규화)** | KeywordClusterResult 기본 필드 | queryId 기반 조회 |
| **JSON (비정규화)** | Persona.traits | 레이더 차트용 구조화 데이터, 조회 전용 |
| **JSON (비정규화)** | KeywordClusterResult.gptAnalysis | LLM 분석 결과 캐시, 스키마 변경 유연성 |
| **미저장 (런타임)** | ClusterMembership, PersonaClusterLink, PersonaJourneyLink | 분석 시 재계산. 캐시는 resultGraph에 포함 |

### 6.3 조회 패턴

| 패턴 | 쿼리 |
|------|------|
| 특정 분석의 전체 페르소나 | `Persona.findMany({ where: { queryId } })` |
| 페르소나의 키워드 목록 | `PersonaKeyword.findMany({ where: { personaId } })` |
| 특정 분석의 클러스터 목록 | `KeywordClusterResult.findMany({ where: { queryId } })` |
| IntentQuery 기준 전체 조회 | `IntentQuery.findUnique({ include: { personas: { include: { keywords: true } }, clusterResults: true } })` |
| 런타임 전체 분석 결과 | `IntentQuery.resultGraph` (JSON) 에서 역직렬화하여 PersonaViewResult 재구성 |

---

## 7. Traceability

분석 과정의 각 단계를 추적할 수 있는 구조.

### 7.1 AnalysisTrace 타입

```typescript
type AnalysisTrace = {
  analysisId: string;
  startedAt: string;
  completedAt: string;
  stages: AnalysisTraceStage[];
  dataSources: {
    source: string;
    callCount: number;
    cacheHitRate: number;
    avgLatencyMs: number;
  }[];
};

type AnalysisTraceStage = {
  name: string;
  startedAt: string;
  completedAt: string;
  inputCount: number;
  outputCount: number;
  apiCallCount: number;
  cacheHitCount: number;
  errorCount: number;
};
```

### 7.2 추적 가능한 데이터 항목

| 항목 | 설명 |
|------|------|
| `analysisId` | 분석 실행 고유 ID |
| `stages[].name` | 파이프라인 단계명 (예: "cluster_build", "persona_build") |
| `stages[].inputCount / outputCount` | 각 단계의 입력/출력 아이템 수 |
| `stages[].apiCallCount` | 외부 API 호출 횟수 |
| `stages[].cacheHitCount` | 캐시 히트 횟수 |
| `stages[].errorCount` | 에러 발생 횟수 |
| `dataSources[].source` | 데이터 소스 이름 (예: "naver_datalab", "gpt-4o") |
| `dataSources[].cacheHitRate` | 해당 소스의 캐시 히트율 (0-1) |
| `dataSources[].avgLatencyMs` | 해당 소스의 평균 응답 시간 |

### 7.3 역추적 경로

특정 페르소나가 왜 그렇게 추론되었는지를 역으로 추적하는 경로:

```
PersonaProfile
  ├── archetype ← inferArchetypeFromCluster()
  │     ├── 1차: topSubIntents[0] → SUBINTENT_TO_ARCHETYPE
  │     ├── 2차: cluster.category → categoryMap
  │     ├── 3차: allKeywords 패턴 매칭
  │     └── 4차: dominantIntent → INTENT_TO_ARCHETYPE
  │
  ├── relatedClusterIds → IntentCluster[]
  │     ├── memberNodes → IntentGraphNode[]
  │     │     ├── intentCategory (API 분류 결과)
  │     │     ├── subIntent (API 분류 결과)
  │     │     ├── temporalPhase (API 분류 결과)
  │     │     └── searchVolume, gapScore (수집 데이터)
  │     └── rawCluster → KeywordCluster (Louvain 클러스터링 결과)
  │
  ├── traits ← calculateTraits()
  │     ├── 기본 템플릿 (archetype별 고정값)
  │     └── 데이터 보정 (avgGapScore, risingRatio, avgSearchVolume)
  │
  ├── percentage ← clusterKeywordCount / totalKeywords
  │
  └── confidence ← calculateConfidence()
        ├── clusterFactor: min(1.0, clusterCount / 3) × 0.4
        └── keywordFactor: min(1.0, keywordCount / 20) × 0.6
```

---

## 8. 확장 계획

### 8.1 SERP 기반 클러스터링 (weighted Jaccard)

현재 `intent_phase` 방식(Louvain)에 SERP 유사도 기반 클러스터링을 추가한다.

- **원리**: 두 키워드의 검색 결과 페이지(SERP) 상위 10개 URL을 비교하여 유사도를 측정
- **알고리즘**: Weighted Jaccard Similarity
  ```
  sim(A, B) = Σ min(wA_i, wB_i) / Σ max(wA_i, wB_i)
  ```
  - 각 URL의 순위(rank)에 따른 가중치: `w = 1 / rank`
- **ClusterMethod**: `semantic` 또는 `hybrid` 사용
- **기대 효과**: intent 분류가 어려운 키워드도 SERP 겹침으로 그룹핑 가능

### 8.2 행동 기반 페르소나 (DBSCAN)

검색 행동 패턴을 벡터화하여 밀도 기반 클러스터링(DBSCAN)을 적용한다.

- **입력 벡터**: `[searchVolume_norm, gapScore_norm, intentCategory_onehot, temporalPhase_onehot, isRising]`
- **알고리즘**: DBSCAN (eps, minPts 자동 탐색)
- **ClusterMethod**: `behavior`
- **기대 효과**: 규칙 기반으로 포착되지 않는 새로운 행동 패턴 발견

### 8.3 LLM 라벨링 고도화

현재 규칙 기반 라벨/설명 생성을 LLM으로 대체하여 품질을 향상한다.

| 대상 | 현재 | 목표 |
|------|------|------|
| `IntentCluster.label` | 패턴 기반 자동 생성 | LLM이 대표 키워드/질문을 읽고 자연어 라벨 생성 |
| `IntentCluster.description` | 템플릿 기반 | LLM이 클러스터 특성 요약 |
| `PersonaProfile.summary` | 템플릿 조합 | LLM이 페르소나 서사(narrative) 생성 |
| `PersonaProfile.contentStrategy` | archetype별 고정 텍스트 | LLM이 클러스터 데이터 기반 맞춤 전략 제안 |
| `PersonaProfile.messagingAngle` | archetype별 고정 텍스트 | LLM이 실제 키워드/질문 반영한 메시지 생성 |

- `useLLM: true` 옵션으로 활성화 (Request 타입에 이미 정의됨)
- `KeywordClusterResult.gptAnalysis` JSON 필드에 결과 캐싱
- 비용 최적화: 클러스터 수준에서만 LLM 호출, 페르소나는 클러스터 결과 재활용
