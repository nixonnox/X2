# External Retry Runtime Verification

> Date: 2026-03-16
> Status: PASS (setTimeout 기반, 서버 재시작 시 소실 주의)

## 1. Backoff 정책

| 항목 | 상태 | 근거 |
|------|------|------|
| 1차 지연: 5분 | PASS | `RETRY_DELAYS[0] = 5 * 60 * 1000` — line 528 |
| 2차 지연: 15분 | PASS | `RETRY_DELAYS[1] = 15 * 60 * 1000` — line 529 |
| 3차 지연: 60분 | PASS | `RETRY_DELAYS[2] = 60 * 60 * 1000` — line 530 |
| 지연 선택 | PASS | `RETRY_DELAYS[attemptCount - 1]` — line 563 |
| 초과 시 fallback | PASS | `?? RETRY_DELAYS[last]` — 인덱스 초과 방지 |

## 2. 최대 3회 제한

| 항목 | 상태 | 근거 |
|------|------|------|
| MAX_RETRY_ATTEMPTS = 3 | PASS | line 532 |
| 초과 시 즉시 return | PASS | `attemptCount >= 3 → return` — line 548-561 |
| 포기 로그 | PASS | `"Max attempts reached... giving up"` — line 549-550 |
| 포기 delivery log | PASS | `persistDeliveryLog({ status: "failed", failureReason: "max_retry_attempts_reached" })` |

## 3. Runtime 스케줄링

| 항목 | 상태 | 근거 |
|------|------|------|
| 실제 예약 | PASS | `setTimeout(async () => { ... }, delayMs)` — line 572 |
| 재시도 실행 | PASS | `dispatcher.dispatch({ channels: [params.channel] })` — line 575-587 |
| 재귀 재시도 | PASS | 실패 시 `scheduleRetry({ attemptCount + 1 })` — line 601-604 |
| 성공 시 중단 | PASS | `r.status !== "SUCCESS"` 조건 — line 600 |

## 4. 호출 흐름

```
createAlertNotification()
  └─ dispatcher.dispatch({ channels: externalChannels })
       └─ .then(results => {
            for (r of results) {
              persistDeliveryLog(r)          ← 1차 결과 기록
              if (r.status === "FAILED") {
                scheduleRetry(attemptCount: 1)  ← retry 예약
              }
            }
          })

scheduleRetry(attemptCount: 1)
  └─ attemptCount < 3? YES
  └─ delayMs = RETRY_DELAYS[0] = 300000 (5분)
  └─ setTimeout(5분 후 => {
       dispatcher.dispatch({ channels: [channel] })
       persistDeliveryLog(result)           ← 2차 결과 기록
       if (FAILED) scheduleRetry(attemptCount: 2)
     })

scheduleRetry(attemptCount: 2)
  └─ delayMs = RETRY_DELAYS[1] = 900000 (15분)
  └─ setTimeout(15분 후 => {
       dispatch + persistDeliveryLog
       if (FAILED) scheduleRetry(attemptCount: 3)
     })

scheduleRetry(attemptCount: 3)
  └─ attemptCount >= 3 → persistDeliveryLog("max_retry_reached") → return
```
