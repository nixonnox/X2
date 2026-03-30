# 페르소나 뷰 & 클러스터 파인더 엔진 설계

> 작성일: 2026-03-13
> 목적: 행동 패턴 기반 페르소나 자동 분류 + SERP 기반 클러스터링 엔진 설계

---

## 1. 현재 구현 상태

### 1.1 페르소나 뷰 (persona/page.tsx)

**현재 방식: 하드코딩 템플릿 매핑**

```
clusters[] → (dominantIntent + dominantPhase) 조합 → 5개 템플릿 중 매칭
```

| 조합 | 레이블 | 문제점 |
|------|--------|--------|
| discovery:before | "탐색 입문자" | 고정 텍스트, 데이터 무관 |
| discovery:current | "정보 수집가" | 고정 텍스트 |
| comparison:current | "비교 분석가" | 고정 텍스트 |
| action:current | "즉시 실행자" | 고정 텍스트 |
| troubleshooting:after | "문제 해결사" | 고정 텍스트 |
| 그 외 | `${intentLabel} ${phaseLabel} 사용자` | 폴백 |

**레이더 차트 값도 하드코딩:**
```typescript
// intent가 "discovery"면 정보 니즈=90, 아니면=50 (고정값)
traits = [
  { axis: "정보 니즈", value: intent === "discovery" ? 90 : 50 },
  { axis: "비교 성향", value: intent === "comparison" ? 85 : 40 },
  // ...
];
```

**핵심 질문, 콘텐츠 전략:** 모두 하드코딩된 한국어 문구.

### 1.2 클러스터 파인더 (cluster-finder/page.tsx)

**현재 방식: Louvain 변형 알고리즘 (graph-builder.ts)**

```
classifiedKeywords[]
  → (intentCategory + temporalPhase) 기준 초기 그룹핑
  → Greedy modularity maximization (inter-edge 최대 클러스터 병합)
  → KeywordCluster[] 출력
```

| 항목 | 현재 | 리스닝마인드 목표 |
|------|------|------------------|
| 클러스터링 기준 | 의도+시간구간 유사성 | **SERP 결과 공유도** |
| 키워드 규모 | 최대 200개 | 최대 20,000개 |
| 시각화 | 바 차트만 | 네트워크 맵 (버블/포스 그래프) |
| 상위 URL/도메인 | 없음 | 클러스터별 SERP 상위 도메인 |
| CEP/TPO | 없음 | 카테고리 진입점 / 시간·장소·상황 |
| GPT 분석 | 구현됨 (OpenAI GPT-4o) | 유지 + 확장 |

---

## 2. 페르소나 엔진 설계

### 2.1 행동 패턴 기반 페르소나 생성 파이프라인

```
[입력]
  SearchJourneyGraph (패스파인더 결과)
  + KeywordCluster[] (클러스터 파인더 결과)
  + ClassifiedKeyword[] (의도 분류 결과)

[파이프라인]
  1. 검색 경로 패턴 추출 (Behavioral Pattern Extraction)
  2. 패턴 군집화 (Pattern Clustering)
  3. 페르소나 프로파일 생성 (Profile Generation)
  4. LLM 기반 레이블링 + 인사이트 (AI Enhancement)
  5. 트레이트 점수 산출 (Trait Scoring)

[출력]
  PersonaGroup[] — 데이터 기반 페르소나 그룹
```

### 2.2 행동 패턴 추출

```typescript
// Step 1: 검색 경로에서 행동 패턴 추출
interface BehavioralPattern {
  id: string;
  type: BehaviorType;

  // 패턴 특성
  intentSequence: IntentCategory[];    // 의도 전환 시퀀스 [discovery → comparison → action]
  phaseFlow: TemporalPhase[];          // 시간 흐름 [before → current → after]
  keywordThemes: string[];             // 대표 키워드 테마
  avgPathLength: number;               // 평균 경로 길이

  // 정량 지표
  frequency: number;                   // 이 패턴을 따르는 경로 수
  avgSearchVolume: number;
  avgGapScore: number;

  // 출처 경로
  representativePaths: SearchPathSequence[];  // 이 패턴의 대표 경로 (최대 5개)
}

type BehaviorType =
  | "information_seeker"        // 정보→정보→정보 (discovery 반복)
  | "comparison_shopper"        // 정보→비교→비교→구매
  | "direct_buyer"              // 구매 의도 키워드 직행
  | "problem_solver"            // 문제→해결→후기
  | "brand_explorer"            // 브랜드A→비교→브랜드B
  | "trend_follower"            // 트렌드→정보→구매
  | "deep_researcher"           // 다단계 정보 탐색 (5+ 단계)
  | "price_hunter"              // 가격/할인 중심 검색
  | "experience_seeker";        // 후기/경험 중심 검색
```

**패턴 추출 알고리즘:**

```typescript
function extractBehavioralPatterns(
  graph: SearchJourneyGraph,
  clusters: KeywordCluster[]
): BehavioralPattern[] {

  // 1. 모든 검색 경로를 의도 시퀀스로 변환
  const intentSequences = graph.paths.map(path => ({
    path,
    sequence: path.steps.map(s => graph.getNode(s.nodeId).intentCategory),
    phases: path.steps.map(s => graph.getNode(s.nodeId).temporalPhase),
  }));

  // 2. 의도 시퀀스 유사도 기반 군집화
  //    편집 거리 (Levenshtein) 기반 시퀀스 유사도
  const similarityMatrix = computeSequenceSimilarity(intentSequences);

  // 3. DBSCAN으로 유사한 시퀀스 그룹핑
  //    (K-means보다 DBSCAN이 적합 — 군집 수를 사전에 모름)
  const patternGroups = dbscan(similarityMatrix, {
    epsilon: 0.3,
    minPoints: 3,
  });

  // 4. 각 그룹의 대표 패턴 추출
  return patternGroups.map(group => ({
    type: classifyBehaviorType(group),
    intentSequence: getMostCommonSequence(group),
    frequency: group.length,
    representativePaths: getTopPaths(group, 5),
    // ...
  }));
}
```

### 2.3 페르소나 프로파일 생성

```typescript
interface PersonaProfile {
  id: string;
  label: string;                       // LLM 생성 레이블 (예: "꼼꼼한 비교 쇼퍼")
  description: string;                 // LLM 생성 설명

  // === 행동 기반 (데이터에서 산출) ===
  behaviorType: BehaviorType;
  intentDistribution: Record<IntentCategory, number>;  // 의도별 비율
  avgPathLength: number;               // 평균 검색 경로 길이
  primaryJourneyStage: SearchJourneyStage;
  keywordCount: number;                // 이 페르소나에 속한 키워드 수
  percentage: number;                  // 전체 대비 비율

  // === 대표 데이터 ===
  representativeKeywords: string[];    // 상위 20개 키워드
  representativePaths: SearchPathSequence[];  // 대표 검색 경로 3개
  topQuestions: string[];              // 이 페르소나가 검색하는 질문형 키워드

  // === 트레이트 점수 (레이더 차트용) ===
  traits: PersonaTrait[];              // 6~8축, 0-100

  // === AI 인사이트 ===
  jtbd: string[];                      // Jobs To Be Done (해결하려는 과업)
  contentStrategy: string;             // LLM 생성 콘텐츠 전략
  painPoints: string[];                // 핵심 고충점
  motivations: string[];               // 핵심 동기

  // === 출처 추적 ===
  sourcePatterns: BehavioralPattern[]; // 이 페르소나를 구성하는 패턴들
  sourceClusters: string[];            // 관련 클러스터 ID
}

interface PersonaTrait {
  axis: string;
  value: number;      // 0-100, 실제 데이터에서 산출
  dataSource: string; // 어떤 데이터로 산출했는지
}
```

### 2.4 트레이트 점수 산출 (하드코딩 → 데이터 기반)

```typescript
function calculateTraits(pattern: BehavioralPattern, keywords: ClassifiedKeyword[]): PersonaTrait[] {
  return [
    {
      axis: "정보 탐색 강도",
      value: normalize(pattern.intentSequence.filter(i => i === "discovery").length / pattern.intentSequence.length),
      dataSource: "의도 시퀀스 내 discovery 비율"
    },
    {
      axis: "비교 성향",
      value: normalize(keywords.filter(k => k.subIntent === "versus" || k.subIntent === "review").length / keywords.length),
      dataSource: "versus/review 서브인텐트 키워드 비율"
    },
    {
      axis: "행동 의지",
      value: normalize(pattern.intentSequence.filter(i => i === "action").length / pattern.intentSequence.length),
      dataSource: "의도 시퀀스 내 action 비율"
    },
    {
      axis: "문제 의식",
      value: normalize(keywords.filter(k => k.intentCategory === "troubleshooting").length / keywords.length),
      dataSource: "troubleshooting 키워드 비율"
    },
    {
      axis: "가격 민감도",
      value: normalize(keywords.filter(k => k.subIntent === "price" || k.keyword.includes("가격") || k.keyword.includes("할인")).length / keywords.length),
      dataSource: "가격/할인 관련 키워드 비율"
    },
    {
      axis: "트렌드 민감도",
      value: normalize(keywords.filter(k => k.isRising).length / keywords.length),
      dataSource: "상승 트렌드 키워드 비율"
    },
  ];
}

function normalize(ratio: number): number {
  // 0-1 비율을 0-100 점수로 변환 (시그모이드 스케일링)
  return Math.round(100 / (1 + Math.exp(-10 * (ratio - 0.3))));
}
```

### 2.5 LLM 기반 레이블링 + 인사이트

```typescript
// GPT-4o를 활용한 페르소나 레이블링
async function enhanceWithLLM(persona: PersonaProfile): Promise<PersonaProfile> {
  const prompt = `
다음 검색 행동 데이터를 분석하여 소비자 페르소나를 정의하세요.

행동 유형: ${persona.behaviorType}
의도 분포: ${JSON.stringify(persona.intentDistribution)}
대표 키워드: ${persona.representativeKeywords.slice(0, 15).join(", ")}
대표 검색 경로: ${persona.representativePaths.map(p => p.steps.map(s => s.keyword).join(" → ")).join("\n")}
평균 검색 경로 길이: ${persona.avgPathLength}단계

JSON으로 응답:
{
  "label": "2~4단어 페르소나 이름",
  "description": "1~2문장 설명",
  "jtbd": ["해결하려는 과업 3개"],
  "contentStrategy": "이 페르소나에게 효과적인 콘텐츠 전략",
  "painPoints": ["핵심 고충점 3개"],
  "motivations": ["핵심 동기 3개"]
}`;

  const result = await llmAdapter.classify(prompt);
  return { ...persona, ...result };
}
```

---

## 3. 클러스터 엔진 설계

### 3.1 SERP 기반 클러스터링

리스닝마인드의 핵심 차별점: **키워드 유사성이 아닌 SERP 결과 공유도** 기반 클러스터링.

```
"화장품 추천"과 "스킨케어 순위"가 같은 클러스터에 들어가는 이유:
→ Google 검색 결과 상위 10개 URL 중 7개가 동일한 도메인
→ SERP 유사도 = 7/10 = 0.7
```

### 3.2 SERP 유사도 행렬 계산

```typescript
interface SerpSimilarityMatrix {
  keywords: string[];
  matrix: number[][];    // keywords.length × keywords.length, 각 값 0-1
}

function computeSerpSimilarity(
  serpResults: Map<string, SerpResult>
): SerpSimilarityMatrix {

  const keywords = [...serpResults.keys()];
  const matrix: number[][] = [];

  for (let i = 0; i < keywords.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < keywords.length; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
        continue;
      }

      const serpA = serpResults.get(keywords[i])!;
      const serpB = serpResults.get(keywords[j])!;

      // 도메인 기반 자카드 유사도
      const domainsA = new Set(serpA.organicResults.map(r => extractDomain(r.url)));
      const domainsB = new Set(serpB.organicResults.map(r => extractDomain(r.url)));

      const intersection = new Set([...domainsA].filter(d => domainsB.has(d)));
      const union = new Set([...domainsA, ...domainsB]);

      // 순위 가중 자카드 (상위 결과에 더 높은 가중치)
      const weightedOverlap = computeWeightedOverlap(serpA, serpB);

      matrix[i][j] = weightedOverlap;
    }
  }

  return { keywords, matrix };
}

function computeWeightedOverlap(serpA: SerpResult, serpB: SerpResult): number {
  // 순위별 가중치: 1위=1.0, 2위=0.9, ..., 10위=0.1
  let score = 0;
  let maxScore = 0;

  for (let posA = 0; posA < serpA.organicResults.length; posA++) {
    const domainA = extractDomain(serpA.organicResults[posA].url);
    const weightA = 1.0 - posA * 0.1;

    for (let posB = 0; posB < serpB.organicResults.length; posB++) {
      const domainB = extractDomain(serpB.organicResults[posB].url);
      const weightB = 1.0 - posB * 0.1;

      if (domainA === domainB) {
        score += weightA * weightB;
      }
    }
    maxScore += weightA * weightA;  // 완벽 매칭 시 최대 점수
  }

  return maxScore > 0 ? score / maxScore : 0;
}
```

### 3.3 클러스터링 알고리즘

```typescript
// SERP 유사도 행렬 기반 클러스터링
function clusterBySerpSimilarity(
  similarityMatrix: SerpSimilarityMatrix,
  threshold: number = 0.3     // 유사도 임계값
): SerpCluster[] {

  // 1. 유사도 행렬을 그래프로 변환 (threshold 이상만 엣지)
  const graph = matrixToGraph(similarityMatrix, threshold);

  // 2. Louvain 알고리즘으로 커뮤니티 검출
  //    (기존 graph-builder.ts의 Louvain 변형 재사용)
  const communities = louvainClustering(graph);

  // 3. 각 커뮤니티를 SerpCluster로 변환
  return communities.map(community => ({
    id: generateClusterId(),
    keywords: community.nodes,
    centroid: findCentroid(community, similarityMatrix),
    avgSerpSimilarity: computeAvgIntraClusterSimilarity(community, similarityMatrix),
    topDomains: extractTopDomains(community, serpResults),
    size: community.nodes.length,
  }));
}
```

### 3.4 확장된 클러스터 모델

```typescript
interface SerpCluster {
  id: string;
  name: string;                        // LLM 생성 클러스터 이름
  centroid: string;                    // 대표 키워드
  keywords: string[];

  // === SERP 기반 데이터 (신규) ===
  avgSerpSimilarity: number;           // 클러스터 내 평균 SERP 유사도
  topDomains: DomainVisibility[];      // 이 클러스터의 상위 도메인
  serpOverlapScore: number;            // 클러스터 응집도

  // === 기존 데이터 (유지) ===
  avgGapScore: number;
  avgSearchVolume: number;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  size: number;

  // === CEP/TPO 프레임 (신규) ===
  cep?: CategoryEntryPoint;
  tpo?: TimePlaceOccasion;

  // === GPT 분석 (기존 확장) ===
  gptAnalysis?: {
    summary: string;
    topKeywords: string[];
    personas: { label: string; situation: string; questions: string[] }[];
    topics: { question: string; evidence: string }[];
    // 신규 추가:
    cepLabel?: string;                 // 카테고리 진입점 라벨
    tpoLabel?: string;                 // 시간·장소·상황 라벨
    actionBrief?: string;              // 실행 가이드
  };
}

interface DomainVisibility {
  domain: string;
  avgPosition: number;                 // 평균 순위 (1~10)
  coverage: number;                    // 이 클러스터 키워드 중 몇 %에서 노출되는지
  keywordCount: number;
}

interface CategoryEntryPoint {
  label: string;                       // "건강 관리", "뷰티 루틴" 등
  keywords: string[];                  // CEP 관련 키워드
  confidence: number;
}

interface TimePlaceOccasion {
  time?: string;                       // "아침", "겨울", "주말"
  place?: string;                      // "집", "사무실", "여행"
  occasion?: string;                   // "선물", "다이어트", "이사"
  keywords: string[];
  confidence: number;
}
```

---

## 4. 페르소나 엔진과 클러스터 엔진의 관계

```
[데이터 흐름]

                     ┌─────────────────┐
                     │  SERP 수집기     │
                     │  (Phase 3)       │
                     └────────┬────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │ 검색 경로    │  │ SERP 유사도   │  │ 검색량/트렌드 │
    │ 그래프 빌더  │  │ 행렬 계산     │  │ 수집          │
    │ (패스파인더) │  │              │  │              │
    └──────┬──────┘  └──────┬───────┘  └──────┬───────┘
           │                │                 │
           ▼                ▼                 │
    ┌─────────────┐  ┌──────────────┐         │
    │ 검색 경로    │  │ SERP 기반     │         │
    │ 패턴 추출    │  │ 클러스터링    │◄────────┘
    │              │  │              │
    └──────┬──────┘  └──────┬───────┘
           │                │
           │    ┌───────────┘
           ▼    ▼
    ┌─────────────────┐
    │ 행동 패턴 기반    │
    │ 페르소나 엔진     │
    │                   │
    │ 입력:             │
    │ - 검색 경로 패턴   │  ← 패스파인더에서
    │ - 클러스터 데이터   │  ← 클러스터 파인더에서
    │ - 의도 분류 결과   │  ← 기존 분류기에서
    │                   │
    │ 출력:             │
    │ - PersonaProfile[] │
    └───────────────────┘
```

**핵심 관계:**
1. **클러스터 → 페르소나:** 클러스터는 키워드의 의미 그룹, 페르소나는 행동 그룹. 하나의 페르소나가 여러 클러스터에 걸칠 수 있음.
2. **패스파인더 → 페르소나:** 검색 경로 패턴이 페르소나의 핵심 입력. "어떤 순서로 검색하는가"가 페르소나를 구분하는 기준.
3. **클러스터 → 클러스터:** SERP 유사도 기반 클러스터 간 관계가 네트워크 맵의 엣지.

---

## 5. 기존 코드 재사용 가능성

### 즉시 재사용

| 기존 모듈 | 재사용 위치 | 비고 |
|-----------|------------|------|
| `graph-builder.ts` Louvain 클러스터링 | SERP 클러스터링의 커뮤니티 검출 | 입력만 의도→SERP 유사도로 변경 |
| `graph-builder.ts` 중심성 계산 | 클러스터 대표 키워드(centroid) 선정 | 그대로 사용 |
| `gap-calculator.ts` | 클러스터별 갭 점수 | 그대로 사용 |
| `intent-classifier.ts` | 클러스터/페르소나의 의도 분류 | 그대로 사용 |
| `llm-adapter.ts` | 페르소나 레이블링, 클러스터 GPT 분석 | 프롬프트만 추가 |
| GPT 분석 API (`/api/intent/gpt-analyze`) | 클러스터 GPT 분석 | 확장하여 페르소나 분석도 추가 |
| `cache-manager.ts` | SERP 유사도 행렬 캐시 | 그대로 사용 |
| 레이더 차트 컴포넌트 | 페르소나 트레이트 시각화 | 데이터 소스만 변경 |
| 페르소나 카드 UI | 레이아웃 재사용 | 내용만 동적으로 변경 |

### 수정 후 재사용

| 기존 모듈 | 수정 내용 |
|-----------|----------|
| `persona/page.tsx` generatePersonas() | 하드코딩 템플릿 → BehavioralPattern 기반 생성으로 교체 |
| `persona/page.tsx` 트레이트 계산 | 고정값 → 실제 데이터 비율 기반 산출 |
| `cluster-finder/page.tsx` | 바 차트 + 네트워크 맵 시각화 추가 |
| `graph-builder.ts` 클러스터 생성 | 의도 기반 → SERP 유사도 기반으로 입력 변경 |

### 신규 구현 필요

| 모듈 | 설명 | 난이도 |
|------|------|--------|
| SERP 유사도 행렬 계산기 | 순위 가중 자카드 유사도 | 중 |
| 행동 패턴 추출기 | 의도 시퀀스 + DBSCAN | 상 |
| 페르소나 LLM 레이블러 | GPT-4o 기반 자동 레이블링 | 중 |
| 트레이트 점수 산출기 | 데이터 비율 기반 정규화 | 하 |
| CEP/TPO 분류기 | 클러스터 키워드에서 패턴 추출 | 중 |
| 도메인 가시성 분석기 | SERP에서 도메인별 노출 점유율 | 중 |
| 클러스터 네트워크 맵 | 포스 그래프 / 버블 차트 | 중 |

---

## 6. 20,000 키워드 규모 대응

### 현재 한계: 200개 키워드

**병목:** `graph-builder.ts`의 O(n²) 링크 생성 + 클러스터링

### 확장 전략

| 규모 | 전략 |
|------|------|
| ~1,000 | 현재 Louvain + 프론트엔드 가상화 |
| 1,000~5,000 | SERP 유사도 행렬을 DB에 캐시 + 배치 처리 |
| 5,000~20,000 | 2단계 클러스터링: (1) 임베딩 기반 사전 그룹핑 → (2) 그룹 내 SERP 클러스터링 |

**2단계 클러스터링:**
```
20,000 키워드
  → Step 1: 텍스트 임베딩 기반 사전 그룹핑 (50~100개 매크로 그룹)
  → Step 2: 각 매크로 그룹 내에서 SERP 유사도 기반 세부 클러스터링
  → 결과: 200~500개 마이크로 클러스터
```

---

## 7. 구현 순서

| 순서 | 작업 | 의존성 | 소요 |
|------|------|--------|------|
| 1 | SERP 유사도 행렬 계산기 구현 | Phase 3 SERP 수집기 | 3일 |
| 2 | 기존 Louvain을 SERP 유사도 입력으로 전환 | 1 | 2일 |
| 3 | 도메인 가시성 분석기 | 1 | 2일 |
| 4 | 클러스터 네트워크 맵 시각화 | 2 | 3일 |
| 5 | 행동 패턴 추출기 (DBSCAN) | 패스파인더 엔진 | 3일 |
| 6 | 트레이트 점수 산출기 (하드코딩 제거) | 5 | 1일 |
| 7 | 페르소나 LLM 레이블러 | 5, 6 | 2일 |
| 8 | CEP/TPO 분류기 | 2 | 2일 |
| 9 | GPT 분석 확장 (페르소나 분석 추가) | 7 | 1일 |

**총 소요: ~3주 (일부 병렬 가능)**
