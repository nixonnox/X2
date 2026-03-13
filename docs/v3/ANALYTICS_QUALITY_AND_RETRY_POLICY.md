# Analytics Quality & Retry Policy

> Phase 6 산출물 3/4 — 분석 품질 관리, 실패 처리, 재시도 전략

## 1. Quality Framework

### 1.1 Confidence Scoring

All engine outputs include a `confidence` score (0.0 to 1.0).

| Threshold  | Level    | Action                                                      |
| ---------- | -------- | ----------------------------------------------------------- |
| >= 0.8     | HIGH     | Auto-accept, no review needed                               |
| 0.5 - 0.79 | MEDIUM   | Accept, flag for periodic review                            |
| 0.3 - 0.49 | LOW      | Accept with `lowConfidence` flag, queue for human review    |
| < 0.3      | VERY_LOW | Mark as `needsHumanReview`, do not use in automated actions |

```typescript
CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
};
```

### 1.2 Quality Flags

Each analysis result carries `QualityFlags`:

```typescript
QualityFlags {
  lowConfidence: boolean;      // confidence < MEDIUM threshold
  needsHumanReview: boolean;   // negative sentiment with low confidence
  noisyData: boolean;          // text too short or empty
  usedFallback: boolean;       // fallback engine was used instead of primary
}
```

| Flag               | Trigger Condition                       | Recommended Action                          |
| ------------------ | --------------------------------------- | ------------------------------------------- |
| `lowConfidence`    | `confidence < 0.5`                      | Log warning, include in reports with caveat |
| `needsHumanReview` | Negative sentiment + `confidence < 0.8` | Queue for human validation                  |
| `noisyData`        | Text < 5 chars or only punctuation      | Skip from aggregate statistics              |
| `usedFallback`     | Primary engine failed, fallback used    | Log, monitor fallback rate                  |

### 1.3 Engine Version Tracking

Every result includes `EngineVersion`:

```typescript
EngineVersion {
  engine: string;    // "text-analyzer", "intent-classifier", etc.
  version: string;   // "1.0.0"
  model: string;     // "rule-based-ko-en-v1", "claude-haiku-20250301"
}
```

Stored in `CommentAnalysis.analyzerModel` and `IntentQuery.resultSummary.engineVersion`.

## 2. Engine Execution Logging

### 2.1 Log Entry Structure

```typescript
EngineExecutionLog {
  engineName: string;
  engineVersion: string;
  status: "success" | "partial" | "failed" | "skipped";
  inputCount: number;
  outputCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  durationMs: number;
  retryCount: number;
  usedFallback: boolean;
  errorDetail?: string;
  timestamp: Date;
  traceId?: string;
  batchId?: string;
}
```

### 2.2 Status Classification

| Status    | Condition                            |
| --------- | ------------------------------------ |
| `success` | All items analyzed, no failures      |
| `partial` | Some items succeeded, some failed    |
| `failed`  | No items succeeded (inputCount > 0)  |
| `skipped` | No input to process (inputCount = 0) |

### 2.3 Storage & Access

- **In-memory**: `EngineLogger` stores up to 1000 entries (FIFO)
- **Access**: `engineLogger.getRecentLogs(engineName?, limit?)`, `getLogsByStatus(status, limit)`, `getHealthSummary()`
- **Per-service access**: `commentAnalysis.getEngineExecutionLogs()`, `intentAnalysis.getEngineExecutionLogs()`

### 2.4 Health Summary

```typescript
engineLogger.getHealthSummary() → {
  [engineName: string]: {
    totalRuns: number;
    successRate: number;      // 0.0 to 1.0
    avgConfidence: number;
    avgDurationMs: number;
    lastRun: Date | null;
    lastStatus: EngineStatus | null;
  }
}
```

### 2.5 Logging Points (code-verified)

| Event                      | Log Level | Location                                        | Fields                                                              |
| -------------------------- | --------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Engine execution completed | INFO      | `EngineLogger.record()`                         | engineName, version, status, inputCount, outputCount, avgConfidence |
| Engine execution partial   | WARN      | `EngineLogger.record()`                         | + failedCount                                                       |
| Engine execution failed    | ERROR     | `EngineLogger.record()`                         | + errorDetail                                                       |
| Comment analysis completed | INFO      | `CommentAnalysisService.analyzeComments()`      | contentId, count, sentimentDistribution, avgConfidence              |
| Intent analysis completed  | INFO      | `IntentAnalysisService.processIntentAnalysis()` | queryId, keywordCount, clusterCount, avgConfidence                  |
| FAQ processing dispatched  | INFO      | `CommentAnalysisService.analyzeComments()`      | contentId, questionCount                                            |
| Risk detection dispatched  | INFO      | `CommentAnalysisService.analyzeComments()`      | contentId, riskCount                                                |
| FAQ dispatch failed        | ERROR     | `CommentAnalysisService.analyzeComments()`      | contentId, error                                                    |
| Risk dispatch failed       | ERROR     | `CommentAnalysisService.analyzeComments()`      | contentId, error                                                    |

## 3. Failure Handling

### 3.1 Engine-Level Failures

| Engine              | Failure Mode            | Handling                                           |
| ------------------- | ----------------------- | -------------------------------------------------- |
| TextAnalyzer        | Unexpected input format | Catch per-comment, record failure, continue batch  |
| IntentClassifier    | No pattern match        | Return UNKNOWN category with low confidence        |
| ClusterEngine       | Empty input             | Return empty cluster array                         |
| JourneyEngine       | No intents              | Return empty journey map                           |
| CompetitorGapEngine | No competitor data      | Return descriptive message, empty opportunity list |
| GeoAeoScorer        | Empty content           | Return low scores with improvement suggestions     |
| ActionSynthesizer   | Empty signals           | Return empty action list                           |

### 3.2 Service-Level Failures

| Service                     | Failure Mode              | Handling                                    |
| --------------------------- | ------------------------- | ------------------------------------------- |
| CommentAnalysisService      | DB write failure          | Log error, continue with remaining comments |
| CommentAnalysisService      | FAQ dispatch failure      | Log error, do not block main analysis       |
| CommentAnalysisService      | Risk dispatch failure     | Log error, do not block main analysis       |
| IntentAnalysisService       | DB write failure          | Mark IntentQuery as FAILED                  |
| ActionRecommendationService | Signal collection failure | Skip that signal source, continue           |

### 3.3 Cross-Service Failure Isolation

```
CommentAnalysis → FAQ dispatch failure:
  - Log ERROR with contentId and error message
  - Main analysis result still returned as success
  - FAQ processing can be retried independently

CommentAnalysis → Risk dispatch failure:
  - Log ERROR with contentId and error message
  - Main analysis result still returned as success
  - Risk detection can be retried independently

Intent → Cluster/Journey failure:
  - Log WARN
  - IntentKeywordResult records still saved
  - resultGraph may have empty clusters/journey
```

## 4. Retry Strategy

### 4.1 Engine Retry (within service)

현재 규칙 기반 엔진은 동기 실행이므로 내부 retry는 불필요.
LLM 연동 시 아래 정책 적용:

```typescript
ENGINE_RETRY_POLICY = {
  maxRetries: 2,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};
```

### 4.2 Service Retry (via Collection Pipeline)

Phase 5의 `withRetry()` 패턴이 Collection → Analytics 전체 경로에 적용:

| Retry Point                                    | Policy                         | On Final Failure          |
| ---------------------------------------------- | ------------------------------ | ------------------------- |
| Collection Pipeline → CommentAnalysis dispatch | 3 retries, exponential backoff | Log error, skip analytics |
| CommentAnalysis → per-comment DB write         | No retry (single attempt)      | Log error, continue batch |
| IntentAnalysis → processIntentAnalysis         | No retry (called by scheduler) | Mark query FAILED         |

### 4.3 Manual Retry

| Scenario                      | How                                                                 |
| ----------------------------- | ------------------------------------------------------------------- |
| Comment analysis batch failed | `dispatchCommentAnalysis(trace)` — re-fetches unanalyzed comments   |
| Intent analysis failed        | Update query status to QUEUED, call `processIntentAnalysis()` again |
| FAQ processing missed         | `faqService.processQuestionComments(projectId, commentIds, trace)`  |
| Risk signals missed           | `riskSignalService.detectRisks(projectId, riskComments, trace)`     |

## 5. Noisy Data Handling

### 5.1 Detection

| Signal           | Condition              | Action                                  |
| ---------------- | ---------------------- | --------------------------------------- |
| Very short text  | `text.length < 5`      | Mark `noisyData=true`, lower confidence |
| Only punctuation | `/^[.\s!?]+$/` test    | Mark `noisyData=true`                   |
| Spam detected    | Spam pattern match     | `isSpam=true`, skip from aggregates     |
| Emoji-only       | Emoticons without text | Lower confidence, topic = "기타"        |

### 5.2 Aggregate Exclusion

Noisy data items are:

- Included in total count for completeness
- Excluded from sentiment distribution percentage calculation
- Excluded from topic trend analysis
- Excluded from FAQ candidate extraction

## 6. Low Confidence Handling

### 6.1 Current Strategy

```
lowConfidence (< 0.5):
  → Results are saved with lowConfidence flag
  → Included in aggregates but weighted lower
  → Available for human review via ops dashboard

needsHumanReview (negative + < 0.8):
  → Results are saved with needsHumanReview flag
  → Excluded from auto-generated risk signals
  → Queued for manual review
```

### 6.2 Future: LLM Re-analysis

```
lowConfidence items → batch for Claude Sonnet re-analysis
needsHumanReview items → priority queue for review
  → If confirmed → update analysis, increase confidence
  → If rejected → mark as false positive, train patterns
```

## 7. Fallback Strategy

### 7.1 Engine Fallback Chain

```
Primary: Rule-based engine (TextAnalyzer, IntentClassifier, etc.)
  ↓ (failure or unavailable)
Fallback: Minimal analysis (sentiment=NEUTRAL, topic=기타, confidence=0.1)
  ↓
Flag: usedFallback=true in QualityFlags
```

### 7.2 LLM Fallback (Future)

```
Primary: Claude Haiku (batch analysis)
  ↓ (API error / rate limit)
Secondary: Rule-based engine (current implementation)
  ↓ (unexpected failure)
Tertiary: Minimal defaults (usedFallback=true)
```

Rule-based engines remain as permanent fallback, never removed.
