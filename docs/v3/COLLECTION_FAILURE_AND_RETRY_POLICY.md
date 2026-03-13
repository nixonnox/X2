# Collection Failure & Retry Policy

> Phase 5 산출물 3/4 — 수집 실패 처리 및 재시도 정책

## 1. Error Classification

### 1.1 Error Hierarchy

```
PlatformApiError (base)
  ├── RateLimitError     (429) — Retryable with backoff
  ├── AuthenticationError (401) — Not retryable (config issue)
  └── ChannelNotFoundError(404) — Not retryable (data issue)
```

### 1.2 Error Categories

| Category       | HTTP Status       | Retryable | Action                                |
| -------------- | ----------------- | --------- | ------------------------------------- |
| Rate Limit     | 429               | YES       | Exponential backoff via `withRetry()` |
| Auth Failure   | 401               | NO        | Log + skip (not retryable)            |
| Not Found      | 404               | NO        | Log, mark channel for review          |
| Server Error   | 500-599           | YES       | Exponential backoff via `withRetry()` |
| Network Error  | TypeError (fetch) | YES       | Exponential backoff via `withRetry()` |
| Quota Exceeded | 403 (YouTube)     | NO        | Skip until next day                   |
| Unknown        | Other             | NO        | Log full error, skip                  |

### 1.3 Retryability Check (code)

```typescript
// PlatformAdapter.isRetryable()
RateLimitError          → true
PlatformApiError 5xx    → true
TypeError (fetch fail)  → true
Everything else         → false (immediate fail)
```

## 2. Retry Policy

### 2.1 Implementation: `PlatformAdapter.withRetry()`

Each collection phase (channel_info, contents, comments) is wrapped in `withRetry()`:

```typescript
withRetry(operation, phase, scope, policy?)
```

- Retries only retryable errors (see §1.3)
- Non-retryable errors return immediately without retry
- Each attempt logs WARN with attempt count and delay

### 2.2 Default Policy

```typescript
DEFAULT_RETRY_POLICY = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  backoffMultiplier: 2,
};
```

### 2.3 Retry Delay Calculation

```
delay = min(baseDelay × multiplier^attempt + jitter, maxDelay)

Attempt 0: 1000ms + jitter (0-250ms)
Attempt 1: 2000ms + jitter (0-500ms)
Attempt 2: 4000ms + jitter (0-1000ms)
```

Jitter: 0–25% of calculated delay (random, prevents thundering herd)

Returns -1 when maxRetries exceeded → stops retrying.

### 2.4 Per-Phase Retry

Each phase within `collectChannel()` retries independently:

| Phase                 | Retried? | On Final Failure                      |
| --------------------- | -------- | ------------------------------------- |
| `syncChannelInfo()`   | YES      | Error added, continues to contents    |
| `syncContents()`      | YES      | Error added, continues to comments    |
| `syncComments()`      | YES      | Error added, continues to snapshot    |
| Snapshot recording    | NO       | Error added (single attempt, non-API) |
| `lastSyncedAt` update | NO       | Logged as WARN, not added to errors   |

## 3. Circuit Breaker

### 3.1 Configuration

| Parameter   | Value     | Description                               |
| ----------- | --------- | ----------------------------------------- |
| Threshold   | 5         | Consecutive failures to open circuit      |
| Cooldown    | 5 minutes | Time before half-open attempt             |
| Window Size | 20        | Recent results for error rate calculation |

### 3.2 State Machine

```
CLOSED ──(5 consecutive failures)──→ OPEN
   ▲                                    │
   │                              (5 min cooldown)
   │                                    │
   │                                    ▼
   └────(success)────── HALF-OPEN ──(failure)──→ OPEN
```

- **CLOSED**: Normal operation, all requests allowed
- **OPEN**: All requests for this platform skipped with `"Platform circuit breaker open — skipped"` error
- **HALF-OPEN**: One probe request allowed after cooldown
  - Success → CLOSED (reset consecutive failures)
  - Failure → OPEN (restart cooldown)

### 3.3 Per-Platform Health Tracking

```typescript
PlatformHealthStatus {
  platform: string;
  healthy: boolean;            // consecutiveFailures < threshold
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  errorRate: number;           // failures / total in last 20 attempts
}
```

## 4. Channel-Level Failure Tracking

### 4.1 Implementation

`CollectionRunner` tracks per-channel consecutive failures separately from platform-level circuit breaker:

```typescript
private channelFailures = new Map<string, number>();
```

| Threshold              | Action                                                                    |
| ---------------------- | ------------------------------------------------------------------------- |
| 3 consecutive failures | `logger.warn("Channel has 3 consecutive failures")`                       |
| 5 consecutive failures | `logger.error("Channel has 5 consecutive failures — consider disabling")` |
| Success                | Reset to 0                                                                |

### 4.2 Partial vs Failed Classification

| Result Status | Condition                                                                                              | Health Action                                       |
| ------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `success`     | `errors.length === 0`                                                                                  | Reset channel failures, record platform success     |
| `partial`     | Has errors BUT some data collected (`channelUpdated`, `newContentCount > 0`, or `newCommentCount > 0`) | Record platform failure, increment channel failures |
| `failed`      | Has errors AND no data collected                                                                       | Record platform failure, increment channel failures |

## 5. Collection Logging

### 5.1 Log Entry Structure

```typescript
CollectionLogEntry {
  channelId: string;
  platform: string;
  jobType: string;
  status: "success" | "partial" | "failed";
  message: string;
  itemCount: number;
  durationMs: number;
  errorDetail?: string;
  timestamp: Date;
}
```

### 5.2 Storage

- **In-memory array** in `CollectionRunner` (max 500 entries, most recent first)
- Accessible via `getRecentLogs(limit)` and `getLogsByFilter({platform, status, limit})`
- Trimmed FIFO when exceeding 500 entries

### 5.3 Logging Points (code-verified)

| Event                      | Log Level | Code Location                               | Logged Fields                       |
| -------------------------- | --------- | ------------------------------------------- | ----------------------------------- |
| Phase retry                | WARN      | `PlatformAdapter.withRetry()`               | channelId, platform, attempt, delay |
| Phase not retryable        | WARN      | `PlatformAdapter.withRetry()`               | channelId, platform, error          |
| Phase failed after retries | ERROR     | `PlatformAdapter.withRetry()`               | channelId, platform, retryCount     |
| Comment sync skipped       | INFO      | `PlatformAdapter.syncComments()`            | channelId, platform, contentCount   |
| lastSyncedAt update failed | WARN      | `PlatformAdapter.collectChannel()`          | channelId, error                    |
| Content metric failed      | WARN      | `PlatformAdapter.collectChannel()`          | contentId, error                    |
| Circuit breaker opened     | WARN      | `CollectionHealthTracker.recordFailure()`   | platform, consecutiveFailures       |
| Circuit breaker half-open  | INFO      | `CollectionHealthTracker.isCircuitOpen()`   | platform                            |
| Platform circuit skip      | WARN      | `CollectionRunner.runWorkspaceCollection()` | channelId, platform                 |
| Channel 3 failures         | WARN      | `CollectionRunner.trackChannelFailure()`    | channelId, channelName              |
| Channel 5 failures         | ERROR     | `CollectionRunner.trackChannelFailure()`    | channelId, channelName              |
| Collection completed       | INFO      | `CollectionRunner.runWorkspaceCollection()` | workspaceId, totals, durationMs     |
| Collection run failed      | ERROR     | `CollectionRunner.runWorkspaceCollection()` | workspaceId, error, requestId       |

## 6. Manual Recovery

| Action                  | When                                 | How                                                           |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------- |
| Force retry             | Circuit breaker incorrectly blocking | `runSingleChannel()` — intentionally bypasses circuit breaker |
| Reset API key           | Auth error                           | Update env variable, restart                                  |
| Check quota             | YouTube 403                          | Google Cloud Console → Quotas                                 |
| Review channel          | 404 error / 5 consecutive failures   | Mark channel inactive or update platformChannelId             |
| View recent logs        | Diagnose failures                    | `collectionRunner.getRecentLogs(50)`                          |
| Filter logs by platform | Platform-specific issues             | `collectionRunner.getLogsByFilter({platform: "youtube"})`     |
| Check platform health   | Dashboard                            | `collectionRunner.getHealthStatus()`                          |

## 7. Monitoring Integration

- `CollectionRunner.getHealthStatus()` → `PlatformHealthStatus[]` for all 4 platforms
- `CollectionRunner.getRecentLogs()` → `CollectionLogEntry[]` for ops dashboard
- `CollectionRunner.getLogsByFilter()` → filtered logs for specific platform/status
- Feeds into `OpsMonitoringService.getPipelineHealth()` for dashboard data
