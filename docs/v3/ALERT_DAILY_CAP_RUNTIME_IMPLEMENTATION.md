# Alert Daily Cap Runtime Implementation

> Date: 2026-03-16
> Status: IMPLEMENTED + S2/S3 개선 적용

## 적용 위치

`intelligence-alert.service.ts` — `evaluateAndAlert()` 메서드 내부, **2곳**:

### 1. 조건 평가 전 — 전체 cap (line 137-160)
```
dailyAlertCount = notification.count({ userId, "intelligence_alert", today UTC })
dailyAlertCount >= maxAlertsPerDay → return { dailyCapped: true }
```

### 2. 반복문 내 — per-iteration cap (line 174-179)
```
remainingDailyCap = maxAlertsPerDay - dailyAlertCount
if (remainingDailyCap <= 0) break
remainingDailyCap-- (생성할 때마다)
```

## 집계 기준

| 기준 | 값 | 근거 |
|------|-----|------|
| 범위 | userId 단위 (모든 프로젝트 합산) | line 144 |
| 대상 | sourceType = "intelligence_alert" | line 145 |
| 시간 | 오늘 00:00 UTC 이후 | line 141 — `setUTCHours(0,0,0,0)` |
| 한도 | `prefs.maxAlertsPerDay` (기본 20, 사용자 설정 가능) | line 107 |

## 이번 수정 내용

### S2-1: Count 실패 시 보수적 cap 적용
- **이전:** count 실패 → `dailyAlertCount = 0` → cap 미적용 (위험)
- **이후:** count 실패 → `dailyAlertCount = maxAlertsPerDay` → 전체 차단 (안전)
- **로그:** `"Daily cap count query failed — applying conservative cap"`

### S3-1: UTC 기준 통일
- **이전:** `setHours(0,0,0,0)` — 서버 로컬 시간
- **이후:** `setUTCHours(0,0,0,0)` — UTC 기준

## cap 초과 시 trace

| 정보 | 기록 |
|------|------|
| console.info 로그 | `"Daily cap reached for user {userId}: {count}/{max} — skipping all alerts"` |
| conservative 경고 | `"(conservative — count query failed)"` 표시 |
| mid-eval 로그 | `"Daily cap reached mid-evaluation — skipping remaining conditions"` |
| 반환값 | `{ alertsTriggered: [], dailyCapped: true }` |
| analyze response | `metadata.alertsTriggered` + `metadata.dailyCapped` |
