# Search Intelligence Traceability Spec

> seed keyword / batch / source / confidence / freshness / evidence 추적 구조

## 1. 추적 목표

모든 엔진 실행 결과에서 아래를 역추적할 수 있어야 한다:

1. **어떤 키워드**로 분석했는가 (`seedKeyword`)
2. **어떤 배치**에서 실행되었는가 (`batchId`)
3. **어떤 소스**에서 데이터를 수집했는가 (`sourceSummary`)
4. **언제** 수집/분석했는가 (`analyzedAt`, `completedAt`)
5. **얼마나 믿을 수 있는가** (`confidence`, `freshness`)
6. **부분 데이터인가** (`isPartial`, `partialDataFlags`)
7. **어떤 증거**를 기반으로 결론을 내렸는가 (`evidenceRefs`)
8. **무슨 경고**가 있는가 (`warnings`, `lowConfidenceReasons`)

## 2. SearchTraceMetadata 구조

```typescript
type SearchTraceMetadata = {
  // ── 식별 ──
  analysisId: string;        // "si-1710345600000-a1b2c3"
  batchId?: string;          // 배치 분석 시

  // ── 키워드 ──
  seedKeyword: string;
  locale: string;

  // ── 타이밍 ──
  analyzedAt: string;        // ISO 8601
  completedAt?: string;
  durationMs?: number;

  // ── 소스 추적 ──
  sourceSummary: {
    totalSources: number;
    successfulSources: number;
    sources: {
      name: string;          // "google_ads", "serp_api", "mock" 등
      status: "ready" | "unavailable" | "error" | "rate_limited";
      itemCount: number;
      latencyMs: number;
    }[];
  };

  // ── 품질 지표 ──
  confidence: number;        // 0-1, 입력 데이터 품질 기반
  freshness: "fresh" | "recent" | "stale";
  isPartial: boolean;
  engineVersion: string;     // "0.3.0"

  // ── 경고/증거 ──
  warnings: string[];
  lowConfidenceReasons: string[];
  partialDataFlags: string[];
  evidenceRefs: string[];    // "node:n-0", "cluster:c-1:label", "stage:awareness"
};
```

## 3. Confidence 계산 로직

### 3.1 데이터 수집 단계 (traceBuilder)

```
confidence = sourceRatio × 0.4 + dataRichness × 0.6

sourceRatio = successfulSources / totalSources
dataRichness = sum of:
  relatedKeywords > 0 → 0.3
  serpDocuments > 0 → 0.25
  trendSeries > 0 → 0.2
  seedData exists → 0.15
  intentCandidates > 0 → 0.1
```

### 3.2 엔진 입력 단계 (input builders)

각 빌더가 엔진별 confidence를 별도 계산 (ENGINE_INPUT_BUILDER_SPEC.md 참고).
confidence < 0.3이면 `lowConfidenceReasons`에 기록.

## 4. Freshness 판단

| 경과 시간 | freshness | 의미 |
|-----------|-----------|------|
| < 1시간 | `fresh` | 최신 데이터 |
| 1-24시간 | `recent` | 사용 가능 |
| > 24시간 | `stale` | 재수집 권장 |

## 5. Evidence Refs 형식

| 접두사 | 대상 | 예시 |
|--------|------|------|
| `node:` | Journey 노드 | `node:n-0`, `node:n-12` |
| `path:` | 경로 시작 키워드 | `path:화장품 추천` |
| `stage:` | RoadView 스테이지 | `stage:awareness` |
| `cluster:` | 클러스터 ID+라벨 | `cluster:c-1:가격 비교형` |
| `persona:` | 페르소나 ID+타입 | `persona:p-0:information_seeker` |
| `pathstep:` | 경로 단계 키워드 | `pathstep:화장품 비교` |
| `reused:` | 재사용된 이전 결과 | `reused:cluster_result:5_clusters` |

## 6. 저장 구조

```typescript
type PersistableAnalysisResult = {
  id: string;               // = analysisId
  seedKeyword: string;
  engine: string;            // "pathfinder" | "roadview" | "cluster" | "persona"
  analyzedAt: string;
  resultJson: unknown;       // 엔진 결과 전체
  traceJson: SearchTraceMetadata;
  expiresAt?: string;        // 캐시 만료 (기본 24시간)
};
```

### 현재: In-Memory Map

```typescript
const store = new Map<string, PersistableAnalysisResult>();
```

### 향후: Prisma DB

```sql
-- TODO: 아래 테이블 생성
CREATE TABLE analysis_results (
  id TEXT PRIMARY KEY,
  seed_keyword TEXT NOT NULL,
  engine TEXT NOT NULL,
  analyzed_at TIMESTAMP NOT NULL,
  result_json JSONB NOT NULL,
  trace_json JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analysis_results_keyword ON analysis_results(seed_keyword);
CREATE INDEX idx_analysis_results_engine ON analysis_results(engine);
```

## 7. Orchestrator 레벨 추적

```typescript
SearchIntelligenceResult = {
  seedKeyword: string;
  analyzedAt: string;
  completedAt: string;
  durationMs: number;

  payloadSummary: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionData: boolean;
    sourcesUsed: string[];
  };

  // 개별 엔진 결과 (각각 trace 포함)
  pathfinder?: EngineExecutionResult<PathfinderResult>;
  roadview?: EngineExecutionResult<RoadViewResult>;
  persona?: EngineExecutionResult<PersonaViewResult>;
  cluster?: EngineExecutionResult<ClusterFinderResult>;

  // 전체 추적
  trace: SearchTraceMetadata;
};
```

## 8. 경고 체계

| 레벨 | 소스 | 예시 |
|------|------|------|
| `warnings` | 운영 주의 | "모든 데이터가 Mock 소스에서 제공됨" |
| `lowConfidenceReasons` | 품질 경고 | "연관 키워드 부족 (< 5개)" |
| `partialDataFlags` | 부분 실패 | "2/5 소스 실패" |

경고는 UI의 `JourneyScreenStatePanel` / `ScreenStatePanel`에서 사용자에게 표시.
