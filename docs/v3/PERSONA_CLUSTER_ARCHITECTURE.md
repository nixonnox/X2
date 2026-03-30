# Persona View & Cluster Finder 아키텍처

> persona-cluster-engine의 전체 구조, 데이터 모델, 처리 흐름, 시각화 설계를 정리한 문서.

---

## 1. 기능 정의

### 1-1. 클러스터 파인더 (Cluster Finder)

시드 키워드를 입력하면 관련 검색어를 **의도(intent) + 시간축(phase) + 여정 단계(stage)** 기준으로 클러스터링하여, 검색 수요의 덩어리를 시각적으로 보여준다.

| 항목 | 설명 |
|------|------|
| 입력 | 시드 키워드 (예: "에어프라이어") |
| 출력 | IntentCluster 배열 + ClusterMembership 배열 + 요약 |
| 핵심 질문 | "이 키워드 주변에 어떤 검색 수요 덩어리가 있는가?" |

**출력 예시:**

```
클러스터 #1: "에어프라이어 추천 클러스터"
  카테고리: recommendation
  대표 키워드: 에어프라이어 추천, 에어프라이어 순위, 에어프라이어 best
  대표 질문: "에어프라이어 어떤 거 사야 돼?"
  규모: 28개 키워드 | 평균 검색량: 12,400 | 점수: 78

클러스터 #2: "에어프라이어 가격 클러스터"
  카테고리: price_sensitive
  대표 키워드: 에어프라이어 가격, 에어프라이어 비교, 에어프라이어 할인
  규모: 15개 키워드 | 평균 검색량: 8,200 | 점수: 65
```

### 1-2. 페르소나 뷰 (Persona View)

클러스터 파인더 결과를 기반으로, **검색 행동 기반 소비자 아키타입(persona archetype)**을 추론하고, 각 페르소나별 콘텐츠 전략과 메시지 각도를 제공한다.

| 항목 | 설명 |
|------|------|
| 입력 | 시드 키워드 (또는 기존 클러스터 결과) |
| 출력 | PersonaProfile 배열 + PersonaClusterLink + PersonaJourneyLink + 요약 |
| 핵심 질문 | "이 키워드를 검색하는 사람들은 어떤 유형인가?" |

**출력 예시:**

```
페르소나 #1: "정보 탐색 입문형" (35%)
  마인드셋: 궁금한 | 여정 단계: awareness
  대표 질문: "에어프라이어 뭐가 좋아?", "에어프라이어 원리"
  콘텐츠 전략: 초보자 가이드, 개념 설명 콘텐츠, FAQ 시리즈
  메시지 각도: "에어프라이어, 처음이라면 이것부터 알아보세요"

페르소나 #2: "가격 비교 신중형" (25%)
  마인드셋: 신중한 | 여정 단계: comparison
  콘텐츠 전략: 가격 비교표, VS 콘텐츠, 가성비 가이드
```

---

## 2. 데이터 구조

### 2-1. IntentCluster

검색 수요의 한 덩어리. intent-engine의 KeywordCluster를 강화한 구조.

```typescript
type IntentCluster = {
  id: string;                             // "ic-0", "ic-1", ...
  label: string;                          // 자동 생성 또는 LLM 생성 라벨
  description: string;                    // 클러스터 설명
  category: ClusterCategory;              // 8종: exploratory | comparative | price_sensitive | ...
  dominantIntent: IntentCategory;         // discovery | comparison | action | troubleshooting
  dominantPhase: TemporalPhase;           // before | current | after
  dominantStage: RoadStageType;           // 6단계 여정 스테이지
  memberCount: number;
  representativeKeywords: string[];       // 상위 10개 대표 키워드
  representativeQuestions: string[];       // 상위 5개 대표 질문
  allKeywords: string[];                  // 전체 멤버 키워드
  centroid: string;                       // 중심 키워드
  avgGapScore: number;
  avgSearchVolume: number;
  avgDifficultyScore: number;
  risingCount: number;                    // 급상승 키워드 수
  score: number;                          // 종합 점수 (0-100)
  clusterMethod: ClusterMethod;           // intent_phase | semantic | question | behavior | hybrid
  themes: string[];                       // 주요 테마 (최대 5개)
  metadata: {
    intentDistribution: Record<IntentCategory, number>;
    phaseDistribution: Record<TemporalPhase, number>;
    stageDistribution: Partial<Record<RoadStageType, number>>;
    topSubIntents: { subIntent: SubIntent; count: number }[];
    createdAt: string;
  };
};
```

**ClusterCategory (8종):**

| 카테고리 | 한국어 | 설명 |
|----------|--------|------|
| `exploratory` | 입문형 탐색 | 기초 정보를 탐색하는 검색 그룹 |
| `comparative` | 비교/검토형 | 옵션을 비교하고 평가하는 검색 그룹 |
| `price_sensitive` | 가격 민감형 | 가격과 비용 중심 검색 그룹 |
| `problem_solving` | 문제 해결형 | 문제 해결을 위한 검색 그룹 |
| `recommendation` | 추천 탐색형 | 추천과 순위를 탐색하는 검색 그룹 |
| `action_oriented` | 행동/실행형 | 구매/가입 등 행동 목적 검색 그룹 |
| `experience` | 경험/후기형 | 사용 경험과 후기 검색 그룹 |
| `general` | 일반 | 분류 불가 일반 검색 그룹 |

### 2-2. PersonaProfile

검색 행동 기반으로 추론한 소비자 아키타입.

```typescript
type PersonaProfile = {
  id: string;                             // "persona-0", ...
  label: string;                          // 한국어 라벨 ("정보 탐색 입문형")
  description: string;                    // 1-2문장 설명
  archetype: PersonaArchetype;            // 8종 아키타입
  mindset: PersonaMindset;                // 7종 마인드셋
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  dominantStage: RoadStageType;
  dominantTopics: string[];               // 핵심 관심 주제 (최대 5개)
  typicalQuestions: string[];             // 대표 질문 (최대 5개)
  representativeKeywords: string[];       // 대표 키워드 (최대 15개)
  likelyStage: RoadStageType;            // 여정에서의 위치
  traits: PersonaTrait[];                 // 6축 레이더 차트 데이터
  relatedClusterIds: string[];            // 연관 클러스터 ID
  contentStrategy: string;                // 추천 콘텐츠 전략
  messagingAngle: string;                 // 추천 메시지 각도
  percentage: number;                     // 전체 중 비중 (0-100)
  confidence: number;                     // 추론 신뢰도 (0-1)
  summary: string;                        // 규칙 또는 LLM 기반 요약
  metadata: {
    sourceClusterCount: number;
    totalKeywordCount: number;
    avgGapScore: number;
    avgSearchVolume: number;
    createdAt: string;
  };
};
```

**PersonaArchetype (8종):**

| 아키타입 | 한국어 | 마인드셋 | 색상 |
|----------|--------|----------|------|
| `information_seeker` | 정보 탐색 입문형 | 궁금한 | #3b82f6 |
| `price_comparator` | 가격 비교 신중형 | 신중한 | #f59e0b |
| `review_validator` | 후기 검증 실속형 | 분석적인 | #10b981 |
| `problem_solver` | 문제 해결 긴급형 | 급한 | #ef4444 |
| `recommendation_seeker` | 추천 탐색 확신형 | 열정적인 | #8b5cf6 |
| `trend_follower` | 트렌드 추종형 | 열정적인 | #ec4899 |
| `action_taker` | 즉시 실행형 | 결단력 있는 | #06b6d4 |
| `experience_sharer` | 경험 공유형 | 열정적인 | #84cc16 |

**PersonaTrait (6축 레이더 차트):**

| 축 | 한국어 | 설명 |
|----|--------|------|
| `information_need` | 정보 니즈 | 정보 수집 욕구 강도 |
| `comparison_tendency` | 비교 성향 | 옵션 비교 성향 |
| `action_willingness` | 행동 의지 | 즉각 행동 의지 |
| `problem_awareness` | 문제 의식 | 문제 인식/해결 욕구 |
| `price_sensitivity` | 가격 민감도 | 가격 민감도 |
| `trend_interest` | 트렌드 관심 | 최신 트렌드 관심도 |

### 2-3. ClusterMembership

개별 키워드/질문이 어느 클러스터에 소속되는지를 나타내는 관계 레코드.

```typescript
type ClusterMembership = {
  itemId: string;            // 키워드 또는 노드 ID
  itemLabel: string;         // 키워드 텍스트
  itemType: ClusterMemberType; // "keyword" | "question" | "topic" | "brand"
  clusterId: string;
  membershipScore: number;   // 소속 강도 (0-1), centrality + 검색량 가중 평균
  intent: IntentCategory;
  phase: TemporalPhase;
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
};
```

### 2-4. PersonaClusterLink

페르소나와 클러스터 간의 N:M 연결 관계.

```typescript
type PersonaClusterLink = {
  personaId: string;
  clusterId: string;
  relevanceScore: number;    // 연관 강도 (0-1)
  sharedKeywordCount: number;
  sharedIntentMatch: boolean;
  sharedPhaseMatch: boolean;
};
```

관련성 점수 산출 공식:
- 키워드 중복률 = 공유 키워드 수 / 페르소나 대표 키워드 수
- intent 일치 시 +0.3
- phase 일치 시 +0.2
- 최종값 = min(1.0, 합산)

### 2-5. PersonaJourneyLink

페르소나와 여정 6단계 간의 연결 관계.

```typescript
type PersonaJourneyLink = {
  personaId: string;
  stage: RoadStageType;      // awareness | interest | comparison | decision | action | advocacy
  relevanceScore: number;    // 0-1
  keywordCount: number;      // 해당 스테이지의 키워드 수
  dominantIntent: IntentCategory;
};
```

---

## 3. 엔진 구조

### 3-1. 전체 파이프라인 개요

```
+---------------------------------------------------------------------+
| persona-cluster-engine                                              |
|                                                                     |
|  [1] intent-engine (외부)                                           |
|       입력: seedKeyword                                             |
|       출력: IntentGraphData (nodes, edges, clusters)                |
|                                                                     |
|  [2] cluster-builder                                                |
|       입력: IntentGraphData                                         |
|       출력: IntentCluster[] + ClusterMembership[]                   |
|                                                                     |
|  [3] cluster-labeler (규칙 기반)                                    |
|       입력: IntentCluster[]                                         |
|       출력: IntentCluster[] (라벨/설명 정제)                        |
|                                                                     |
|  [4] cluster-labeler (LLM 기반, 선택적)                             |
|       입력: IntentCluster[] + seedKeyword                           |
|       출력: IntentCluster[] (자연어 라벨/설명)                      |
|       LLM: GPT-4o                                                   |
|                                                                     |
|  [5] persona-archetype-builder                                      |
|       입력: IntentCluster[] + seedKeyword                           |
|       출력: PersonaProfile[] + PersonaClusterLink[]                 |
|              + PersonaJourneyLink[]                                 |
|                                                                     |
|  [6] persona summary LLM (선택적)                                   |
|       입력: PersonaProfile[] + seedKeyword                          |
|       출력: PersonaProfile[] (summary/messagingAngle 강화)          |
|       LLM: GPT-4o                                                   |
+---------------------------------------------------------------------+
```

### 3-2. 개별 엔진 상세

#### (A) Semantic Clustering — intent-engine 위임

| 항목 | 내용 |
|------|------|
| **위치** | intent-engine (외부) |
| **입력** | seedKeyword, maxDepth, maxKeywords |
| **처리** | Louvain 알고리즘으로 의미적 그래프 클러스터링 |
| **출력** | KeywordCluster[] (raw clusters) |
| **저장** | IntentGraphData 내부에 포함 |
| **LLM** | 미사용 (그래프 알고리즘) |

#### (B) Intent-Based Regrouping — cluster-builder

| 항목 | 내용 |
|------|------|
| **위치** | `builders/cluster-builder.ts` > `buildIntentClusters()` |
| **입력** | IntentGraphData, seedKeyword, minClusterSize |
| **처리** | KeywordCluster -> IntentCluster 변환. intent + phase + stage 분포 계산, 카테고리 추론, 점수 산출 |
| **출력** | IntentCluster[] + ClusterMembership[] |
| **LLM** | 미사용 |
| **low confidence 처리** | minClusterSize 미만 클러스터는 자동 폐기 |

카테고리 추론 로직:
1. `INTENT_PHASE_TO_CLUSTER_CATEGORY` 매핑 테이블로 기본 카테고리 결정
2. 키워드 패턴 매칭으로 보정 (추천/가격/후기/에러 등 한국어 패턴)

클러스터 점수 산출 공식:
```
score = sizeScore * 0.25 + gapScore * 0.30 + volumeScore * 0.25 + trendScore * 0.20

  sizeScore  = min(100, memberCount * 5)
  gapScore   = avgGapScore (0-100)
  volumeScore = min(100, log2(avgSearchVolume) * 8)
  trendScore = min(100, risingCount * 20)
```

#### (C) Question Clustering — cluster-builder

| 항목 | 내용 |
|------|------|
| **위치** | `builders/cluster-builder.ts` > `buildQuestionCluster()` |
| **입력** | IntentGraphData의 질문형 키워드 (정규식 패턴 매칭) |
| **처리** | `?`, `어떻`, `왜`, `어디`, `how`, `what`, `방법`, `하는 법` 등의 패턴으로 질문형 키워드를 필터링하여 별도 클러스터 생성 |
| **출력** | 1개의 질문형 IntentCluster |
| **LLM** | 미사용 |
| **low confidence 처리** | minClusterSize 미만이면 질문 클러스터 미생성 |

#### (D) Cluster Labeling (규칙 기반) — cluster-labeler

| 항목 | 내용 |
|------|------|
| **위치** | `builders/cluster-labeler.ts` > `labelClusters()` |
| **입력** | IntentCluster[] |
| **처리** | (1) 테마 기반 라벨 생성 (2) 대표 키워드 공통 패턴 추출 (3) 설명 보강 |
| **출력** | IntentCluster[] (label/description 갱신) |
| **LLM** | 미사용 |

라벨 우선순위:
1. 테마가 존재하면 `"{centroid} {theme[0]}"` 형식
2. 대표 키워드에서 공통 패턴(추천/비교/가격/후기 등) 추출 -> `"{centroid} {패턴}"`
3. 둘 다 없으면 기존 라벨 유지

#### (E) Cluster Labeling (LLM 기반) — cluster-labeler

| 항목 | 내용 |
|------|------|
| **위치** | `builders/cluster-labeler.ts` > `labelWithLLM()` |
| **입력** | IntentCluster[] (최대 10개) + seedKeyword |
| **처리** | GPT-4o API 호출, JSON 응답 파싱, 라벨/설명 적용 |
| **출력** | `{ clusterLabels, personaSuggestions }` 또는 `null` |
| **LLM** | GPT-4o (temperature=0.3, max_tokens=2000, json_object 응답) |
| **low confidence 처리** | API 키 미설정이면 `null` 반환 -> 규칙 기반 결과 유지. API 오류 시에도 `null` -> graceful fallback |

LLM 프롬프트 구조:
- system: "검색 의도 분석 전문가. 라벨 10자 이내, 설명 30자 이내, 마케팅 관점"
- user: 시드 키워드 + 클러스터별 카테고리/대표 키워드/질문

#### (F) Persona Archetype Inference — persona-archetype-builder

| 항목 | 내용 |
|------|------|
| **위치** | `builders/persona-archetype-builder.ts` > `buildPersonaProfiles()` |
| **입력** | IntentCluster[] + seedKeyword + maxPersonas (기본 6) |
| **처리** | (1) 클러스터를 archetype별로 그룹핑 (2) 그룹별 PersonaProfile 생성 (3) trait 계산 (4) link 생성 |
| **출력** | PersonaProfile[] + PersonaClusterLink[] + PersonaJourneyLink[] |
| **LLM** | 미사용 (순수 규칙 기반 추론) |
| **low confidence 처리** | confidence = clusterFactor(0.4) + keywordFactor(0.6). 클러스터 3개 미만 또는 키워드 20개 미만이면 신뢰도 < 1.0 |

Archetype 추론 우선순위:
```
1. topSubIntent 기반     (가장 정밀) -> SUBINTENT_TO_ARCHETYPE 매핑
2. 클러스터 카테고리 기반  -> categoryMap 매핑
3. 키워드 패턴 기반       -> 한국어 정규식 매칭
4. intent 기본 매핑       -> INTENT_TO_ARCHETYPE 매핑 (fallback)
```

Trait 계산:
- archetype별 기본 trait 템플릿 (6축 각 0-100 기본값)
- 데이터 기반 보정: avgGapScore > 50이면 가격 민감도 +10, risingRatio > 0.3이면 트렌드 관심 +15, avgSearchVolume > 5000이면 행동 의지 +10

#### (G) Persona Summary Generation — persona-view-service

| 항목 | 내용 |
|------|------|
| **위치** | `services/persona-view-service.ts` > `enhanceWithLLM()` |
| **입력** | PersonaProfile[] (최대 6개) + seedKeyword |
| **처리** | GPT-4o 호출하여 각 페르소나의 summary와 messagingAngle을 자연어로 강화 |
| **출력** | PersonaProfile[] (summary/messagingAngle 필드 갱신, in-place) |
| **LLM** | GPT-4o (temperature=0.3, max_tokens=2000, json_object 응답) |
| **low confidence 처리** | API 키 미설정/API 오류 시 기존 규칙 기반 요약 유지 (try-catch 전체 래핑) |

#### (H) Cluster-to-Journey Linking — persona-archetype-builder

| 항목 | 내용 |
|------|------|
| **위치** | `builders/persona-archetype-builder.ts` > `buildPersonaJourneyLinks()` |
| **입력** | PersonaProfile[] + IntentCluster[] |
| **처리** | 페르소나에 연결된 클러스터의 stageDistribution을 집계하여 6단계 여정별 연결 생성 |
| **출력** | PersonaJourneyLink[] |
| **LLM** | 미사용 |

스테이지 추론 경로:
```
IntentGraphNode.subIntent -> SUBINTENT_TO_STAGE 매핑 (우선)
IntentGraphNode.intentCategory -> INTENT_TO_STAGE 매핑 (fallback)
```

#### (I) Cluster-to-Action / Cluster-to-GPT-Analysis Linking

현재 코드에서는 `contentStrategy`와 `messagingAngle` 필드를 통해 행동 전략을 직접 생성하며, 별도의 action/gpt-analysis 링킹 서비스는 구현되어 있지 않다. persona-archetype-builder가 아키타입별 콘텐츠 전략과 메시지 각도를 규칙 기반으로 생성하고, LLM 강화(선택적)를 통해 보강한다.

---

## 4. 시각화 구조

### 4-1. 클러스터 파인더 UI

```
+-------------------------------------------------------------------+
| Cluster Finder: "에어프라이어"                                     |
+-------------------------------------------------------------------+
| [필터 바] 카테고리 | intent | phase | 정렬(점수/규모/갭) | 검색   |
+-------------------------------------------------------------------+
|                                                                   |
|  +------------------+  +------------------+  +------------------+ |
|  | 추천 탐색형       |  | 가격 민감형       |  | 입문형 탐색       | |
|  | ================ |  | ================ |  | ================ | |
|  | 규모: 28개        |  | 규모: 15개        |  | 규모: 22개        | |
|  | 점수: 78         |  | 점수: 65         |  | 점수: 62         | |
|  | 검색량: 12,400   |  | 검색량: 8,200    |  | 검색량: 9,100    | |
|  |                  |  |                  |  |                  | |
|  | 대표 쿼리:        |  | 대표 쿼리:        |  | 대표 쿼리:        | |
|  | - 에어프라이어 추천|  | - 에어프라이어 가격|  | - 에어프라이어 원리| |
|  | - 에어프라이어 순위|  | - 에어프라이어 비교|  | - 에어프라이어 뭐  | |
|  |                  |  |                  |  |                  | |
|  | [상세 보기 >]     |  | [상세 보기 >]     |  | [상세 보기 >]     | |
|  +------------------+  +------------------+  +------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
```

**카드 구성 요소:**
- 클러스터 카테고리 라벨 + 색상 배지
- 규모(memberCount), 종합 점수(score), 평균 검색량
- 대표 키워드/질문 미리보기 (상위 3-5개)
- 급상승 키워드 수 (risingCount > 0이면 배지 표시)

**Drill-down (상세 보기):**
- 전체 멤버 키워드 목록 (검색량/갭 스코어 포함)
- intent 분포 차트 (파이 또는 도넛)
- phase 분포 차트
- stage 분포 차트
- 연관 페르소나 표시

### 4-2. 페르소나 뷰 UI

```
+-------------------------------------------------------------------+
| Persona View: "에어프라이어"                                       |
+-------------------------------------------------------------------+
| [보드 뷰] [카드 뷰] [비교 뷰]                                     |
+-------------------------------------------------------------------+
|                                                                   |
|  +-----------------------------+  +-----------------------------+ |
|  | 정보 탐색 입문형 (35%)       |  | 가격 비교 신중형 (25%)       | |
|  | 마인드셋: 궁금한             |  | 마인드셋: 신중한             | |
|  | 여정: awareness             |  | 여정: comparison            | |
|  |                             |  |                             | |
|  |  [레이더 차트]               |  |  [레이더 차트]               | |
|  |    정보니즈 ████████ 90     |  |    정보니즈 █████ 50        | |
|  |    비교성향 ████ 40         |  |    비교성향 █████████ 90    | |
|  |    행동의지 ███ 25          |  |    행동의지 ██████ 55       | |
|  |    문제의식 ███ 30          |  |    문제의식 ████ 35         | |
|  |    가격민감 ████ 35         |  |    가격민감 ██████████ 95   | |
|  |    트렌드  █████ 55         |  |    트렌드  ████ 40          | |
|  |                             |  |                             | |
|  | 추천 콘텐츠:                 |  | 추천 콘텐츠:                 | |
|  | - 초보자 가이드              |  | - 가격 비교표                | |
|  | - FAQ 시리즈                |  | - VS 콘텐츠                 | |
|  | - 인포그래픽                 |  | - 가성비 가이드              | |
|  |                             |  |                             | |
|  | 메시지: "처음이라면 이것부터" |  | 메시지: "합리적 선택을 도와"  | |
|  +-----------------------------+  +-----------------------------+ |
|                                                                   |
+-------------------------------------------------------------------+
```

**카드 구성 요소:**
- 아키타입 라벨 + 아이콘 + 색상
- 비중(percentage) 표시
- 마인드셋, 여정 단계
- 6축 레이더 차트 (PersonaTrait[])
- 대표 질문 (typicalQuestions)
- 콘텐츠 전략 (contentStrategy)
- 메시지 각도 (messagingAngle)

**레이더 차트:**
- 6축: 정보 니즈 / 비교 성향 / 행동 의지 / 문제 의식 / 가격 민감도 / 트렌드 관심
- 각 축 0-100 스케일
- archetype별 기본 프로파일에 데이터 기반 보정 적용

### 4-3. 공통 UX

**필터:**
- 카테고리 필터 (ClusterCategory)
- intent 필터 (IntentCategory)
- phase 필터 (TemporalPhase)
- stage 필터 (RoadStageType)
- 검색량 범위 필터

**연결:**
- 클러스터 카드 -> 페르소나 카드 (PersonaClusterLink로 연결)
- 페르소나 카드 -> 여정 스테이지 (PersonaJourneyLink로 연결)
- 클러스터 drill-down에서 해당 클러스터에 관련된 페르소나 표시
- 페르소나 카드에서 relatedClusterIds를 통해 관련 클러스터로 이동

---

## 5. 데이터 흐름도

```
seedKeyword
    |
    v
+------------------+
| intent-engine    |  키워드 확장 + 의도 분류 + 그래프 빌드
| (외부 엔진)      |  Louvain 클러스터링
+------------------+
    |
    | IntentGraphData
    |   .nodes: IntentGraphNode[]
    |   .edges: IntentGraphEdge[]
    |   .clusters: KeywordCluster[]
    v
+------------------+
| cluster-builder  |  KeywordCluster -> IntentCluster 변환
|                  |  카테고리 추론, 점수 계산, 질문 클러스터 분리
+------------------+
    |
    | IntentCluster[] (raw) + ClusterMembership[]
    v
+------------------+
| cluster-labeler  |  규칙 기반 라벨/설명 정제
| (규칙 기반)      |  테마 기반 또는 키워드 패턴 기반
+------------------+
    |
    | IntentCluster[] (라벨 정제)
    v
+------------------+       +------------------+
| cluster-labeler  | ----> | GPT-4o           |  (선택적, useLLM=true)
| (LLM 기반)      | <---- | API 호출          |
+------------------+       +------------------+
    |
    | IntentCluster[] (최종)
    |
    +--------> ClusterFinderResult (여기서 분기)
    |              .clusters
    |              .memberships
    |              .summary
    |              .trace
    v
+------------------------+
| persona-archetype-     |  클러스터 -> archetype 그룹핑 -> PersonaProfile 생성
| builder                |  trait 계산, link 생성, 콘텐츠 전략 생성
+------------------------+
    |
    | PersonaProfile[] + PersonaClusterLink[] + PersonaJourneyLink[]
    v
+------------------+       +------------------+
| enhanceWithLLM   | ----> | GPT-4o           |  (선택적, useLLM=true)
| (persona summary)| <---- | API 호출          |
+------------------+       +------------------+
    |
    v
PersonaViewResult (최종)
    .personas
    .personaClusterLinks
    .personaJourneyLinks
    .summary
    .trace
```

**서비스 진입점 2개:**

```
analyzeClusterFinder(ClusterFinderRequest)
    -> intent-engine -> cluster-builder -> cluster-labeler
    -> ClusterFinderResult

analyzePersonaView(PersonaViewRequest)
    -> analyzeClusterFinder (내부 호출 또는 기존 결과 재사용)
    -> persona-archetype-builder -> (LLM 강화)
    -> PersonaViewResult
```

---

## 6. 입력 데이터

### 6-1. 입력 데이터가 페르소나/클러스터에 기여하는 방식

```
+-------------------+     +-------------------+     +-------------------+
| keywords          |     | questions         |     | intent outputs    |
| (검색어 원본)      |     | (질문형 키워드)    |     | (의도 분류 결과)   |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
  +-------------------------------------------------------------+
  |              IntentGraphNode                                |
  |  .name, .searchVolume, .gapScore, .isRising                |
  |  .intentCategory, .subIntent, .temporalPhase, .centrality  |
  +-------------------------------------------------------------+
        |                         |                         |
        v                         v                         v
  +-----------------+    +------------------+    +-------------------+
  | 클러스터 멤버    |    | 질문형 클러스터   |    | 카테고리/아키타입  |
  | (memberCount,   |    | (별도 분리)       |    | 추론 근거         |
  |  allKeywords)   |    |                  |    |                   |
  +-----------------+    +------------------+    +-------------------+
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                                  v
                    +----------------------------+
                    | IntentCluster              |
                    | .category (8종)             |
                    | .dominantIntent/Phase/Stage |
                    | .score (가중 합산)           |
                    +----------------------------+
                                  |
                                  v
                    +----------------------------+
                    | PersonaProfile             |
                    | .archetype (8종)            |
                    | .traits (6축 레이더)         |
                    | .contentStrategy           |
                    | .messagingAngle            |
                    +----------------------------+
```

### 6-2. 각 입력 소스의 역할

| 입력 소스 | 클러스터에 기여 | 페르소나에 기여 |
|-----------|-----------------|-----------------|
| **keywords (검색어)** | memberCount, allKeywords, representativeKeywords, avgSearchVolume, avgGapScore | representativeKeywords, dominantTopics, percentage (비중) |
| **questions (질문형)** | representativeQuestions, 별도 question 클러스터 | typicalQuestions (대표 질문) |
| **intentCategory** | dominantIntent, category 추론, intentDistribution | dominantIntent, archetype 추론 (4순위 fallback) |
| **subIntent** | topSubIntents, category 보정 | archetype 추론 (1순위, 가장 정밀) |
| **temporalPhase** | dominantPhase, phaseDistribution, category 추론 키 | dominantPhase, 설명 생성 |
| **journey stage** | dominantStage, stageDistribution | dominantStage, likelyStage, PersonaJourneyLink |
| **searchVolume** | avgSearchVolume, score 산출 (25%), 대표 키워드 정렬 | avgSearchVolume, trait 보정 (행동 의지) |
| **gapScore** | avgGapScore, score 산출 (30%) | avgGapScore, trait 보정 (가격 민감도) |
| **isRising** | risingCount, score 산출 (20%) | trait 보정 (트렌드 관심) |
| **centrality** | membershipScore 산출 | (간접적, ClusterMembership 경유) |

---

## 7. 페르소나 추론 원칙

### 7-1. 핵심 원칙: 검색 맥락 기반 Archetype

이 엔진은 **실제 개인을 식별하지 않는다**. 검색 행동 패턴을 분석하여 **"이런 검색을 하는 사람은 어떤 유형일 가능성이 높은가?"**를 추론한다.

```
실제 사용자 식별 (X)              검색 행동 기반 아키타입 (O)
-----------------------------    ---------------------------------
이름: 김철수                     아키타입: 가격 비교 신중형
나이: 35세                       마인드셋: 신중한
직업: 회사원                     여정 단계: comparison
                                 대표 검색어: "에어프라이어 가격 비교"
                                 대표 질문: "가성비 좋은 건 뭐야?"
```

**추론 근거 체계:**
1. **SubIntent 기반** (가장 정밀): `review` -> `review_validator`, `price` -> `price_comparator` 등
2. **클러스터 카테고리 기반**: `recommendation` -> `recommendation_seeker` 등
3. **키워드 패턴 기반**: 한국어 정규식 매칭 (`트렌드|동향|최신` -> `trend_follower`)
4. **Intent 기본 매핑** (fallback): `discovery` -> `information_seeker` 등

### 7-2. 신뢰도 체계

```
confidence = clusterFactor * 0.4 + keywordFactor * 0.6

  clusterFactor = min(1.0, sourceClusterCount / 3)
  keywordFactor = min(1.0, totalKeywordCount / 20)
```

- 클러스터 3개 이상 + 키워드 20개 이상이면 confidence = 1.0 (최대)
- 클러스터 1개 + 키워드 5개이면 confidence ~= 0.28 (낮음)
- 낮은 신뢰도의 페르소나도 폐기하지 않고, confidence 값과 함께 제공하여 UI에서 표시 여부를 결정

### 7-3. 마케팅 활용 가능성

각 페르소나에는 즉시 활용 가능한 마케팅 요소가 포함된다:

| 필드 | 활용 |
|------|------|
| `contentStrategy` | 아키타입에 맞는 콘텐츠 형식 제안 (가이드/비교표/리뷰/FAQ 등) |
| `messagingAngle` | 구체적인 메시지 톤과 CTA 제안 |
| `typicalQuestions` | FAQ 콘텐츠, 검색 광고 키워드 소재 |
| `traits` (레이더) | 마케팅 채널/메시지 톤 결정 근거 |
| `likelyStage` | 퍼널 단계별 콘텐츠 전략 수립 |
| `percentage` | 예산 배분, 우선순위 결정 |

**활용 시나리오 예시:**

1. "정보 탐색 입문형"이 35%로 가장 큰 비중 -> 초보자 가이드 콘텐츠를 최우선 제작
2. "가격 비교 신중형"의 여정 단계가 comparison -> 비교 페이지에 가격표/할인 정보 배치
3. "문제 해결 긴급형"의 마인드셋이 "급한" -> 빠르게 답을 제공하는 FAQ/트러블슈팅 콘텐츠

### 7-4. LLM 강화의 역할

LLM(GPT-4o)은 두 곳에서 **선택적으로** 사용된다:

1. **클러스터 라벨링**: 규칙 기반 라벨이 단조로울 때 자연스러운 한국어 라벨 생성
2. **페르소나 요약**: 규칙 기반 요약을 마케팅에 바로 활용 가능한 자연어로 강화

두 경우 모두 LLM 실패 시 규칙 기반 결과가 유지되므로, LLM은 품질 향상 수단이지 필수 의존성이 아니다.

---

## 파일 위치

```
apps/web/src/lib/persona-cluster-engine/
  types.ts                              -- 타입 정의 + 상수 + 매핑 테이블
  index.ts                              -- Public API (re-export)
  builders/
    cluster-builder.ts                  -- IntentGraphData -> IntentCluster 변환
    cluster-labeler.ts                  -- 규칙 기반 + LLM 기반 라벨링
    persona-archetype-builder.ts        -- IntentCluster -> PersonaProfile 추론
  services/
    cluster-finder-service.ts           -- ClusterFinder 진입점
    persona-view-service.ts             -- PersonaView 진입점
```
