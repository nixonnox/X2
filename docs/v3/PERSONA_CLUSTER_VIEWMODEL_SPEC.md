# Persona/Cluster ViewModel Spec

> 프론트엔드 View Model, Screen State, Metadata 구조 명세

## 1. PersonaViewModel

```typescript
type PersonaViewModel = {
  id: string;                      // "persona-0"
  label: string;                   // "정보 탐색 입문형"
  description: string;             // 1-2문장 설명
  archetype: string;               // "information_seeker"
  mindset: string;                 // "curious"
  dominantIntent: string;          // "discovery"
  dominantIntentLabel: string;     // "정보 탐색"
  dominantTopics: string[];        // ["추천", "비교", "가격"]
  typicalQuestions: string[];      // ["~란 무엇인가요?", ...]
  representativeKeywords: string[];// ["화장품 추천", ...]
  likelyStage: string;            // "research"
  likelyStageLabel: string;       // "탐색"
  traits: {                        // 레이더 차트 데이터
    axis: string;                  // "information_need"
    label: string;                 // "정보 니즈"
    value: number;                 // 0-100
  }[];
  contentStrategy: string;         // 추천 콘텐츠 전략
  messagingAngle: string;          // 추천 메시지 각도
  summary: string;                 // LLM 또는 규칙 기반 요약
  percentage: number;              // 전체 중 비중 (0-100)
  confidence: number;              // 추론 신뢰도 (0-1)
  relatedClusterCount: number;     // 연관 클러스터 수
  lowConfidenceFlag: boolean;      // confidence < 0.4
};
```

### 매핑 규칙
- `label`, `description`, `summary` — 엔진 출력 그대로
- `dominantIntentLabel` — `INTENT_CATEGORY_LABELS[intent].label`
- `likelyStageLabel` — `{interest:"관심", research:"탐색", ...}`
- `traits[].label` — `PERSONA_TRAIT_LABELS[axis]`
- `lowConfidenceFlag` — `confidence < 0.4`

## 2. ClusterViewModel

```typescript
type ClusterViewModel = {
  id: string;
  label: string;                   // 클러스터 라벨
  description: string;
  category: string;                // "exploratory"
  categoryLabel: string;           // "입문형 탐색"
  dominantIntent: string;
  dominantIntentLabel: string;
  dominantPhase: string;
  dominantStage: string;
  representativeKeywords: string[];
  representativeQuestions: string[];
  themes: string[];
  memberCount: number;
  score: number;                   // 0-100
  avgGapScore: number;
  avgSearchVolume: number;
  risingCount: number;
  relatedPersonaCount: number;
  lowConfidenceFlag: boolean;      // score < 20
  members: ClusterMemberViewModel[];
};

type ClusterMemberViewModel = {
  id: string;
  label: string;
  type: string;                    // "keyword" | "question"
  intent: string;
  searchVolume: number;
  gapScore: number;
  isRising: boolean;
  membershipScore: number;
};
```

## 3. PersonaClusterScreenState

```typescript
type PersonaClusterScreenState = {
  status: "idle" | "loading" | "success" | "error";
  isEmpty: boolean;
  isPartial: boolean;
  hasError: boolean;
  errorMessage?: string;
  lowConfidenceItems: number;
  staleData: boolean;              // 24시간 이상 경과
  lastUpdatedAt?: string;
  durationMs?: number;
  sourceCount?: number;
};
```

### 상태 전환 규칙

| 이전 | 이벤트 | 다음 |
|------|--------|------|
| idle | 분석 시작 | loading |
| loading | 성공 (결과 있음) | success, isEmpty=false |
| loading | 성공 (결과 없음) | success, isEmpty=true |
| loading | 실패 | error |
| success/error | 재분석 | loading |
| any | reset | idle |

## 4. Summary View Models

### ClusterSummaryViewModel
```typescript
{
  seedKeyword: string;
  totalClusters: number;
  totalKeywords: number;
  avgClusterSize: number;
  avgGapScore: number;
  topCategories: { label: string; count: number }[];
  intentDistribution: { label: string; count: number; color: string }[];
}
```

### PersonaSummaryViewModel
```typescript
{
  seedKeyword: string;
  totalPersonas: number;
  totalClusters: number;
  totalKeywords: number;
  dominantArchetypeLabel: string;
  archetypeDistribution: { label: string; count: number }[];
  stageDistribution: { label: string; count: number }[];
}
```

## 5. 변환 레이어 구조

```
Engine Output          Mapper                    View Model
─────────────        ──────────                ───────────
PersonaViewResult  → mapPersonaViewResult()  → PersonaViewModel[]
                                               PersonaSummaryViewModel
                                               Partial<ScreenState>

ClusterFinderResult → mapClusterFinderResult() → ClusterViewModel[]
                                                 ClusterSummaryViewModel
                                                 Partial<ScreenState>

Partial<ScreenState> → buildScreenState()      → PersonaClusterScreenState
```
