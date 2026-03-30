# External Retry Policy Evidence

> Date: 2026-03-16

## 대상 채널 범위

| 채널 | Retry 대상 | 근거 |
|------|-----------|------|
| IN_APP | **NO** | `externalChannels = channels.filter(c => c !== "IN_APP")` — line 374. IN_APP은 DB 저장이므로 실패 없음 |
| EMAIL | **YES** | externalChannels에 포함 시 dispatch → 실패 시 retry |
| WEBHOOK | **YES** | externalChannels에 포함 시 dispatch → 실패 시 retry |

## Retry가 IN_APP을 건드리지 않는 증거

```
line 372-374:
  if (channels.length > 1) {   ← 외부 채널이 있을 때만
    const externalChannels = channels.filter((c) => c !== "IN_APP");
    ...
    scheduleRetry({ channel: r.channel })  ← r.channel은 externalChannels에서 온 것
  }
```

`scheduleRetry`의 `params.channel`은 항상 "EMAIL" 또는 "WEBHOOK" — "IN_APP"이 전달될 경로 없음.

## 정책 정합성

### Daily Cap과 충돌 없음
- Retry는 **이미 생성된 알림**의 외부 채널 재발송
- 새 알림을 생성하지 않음 → `notification.count`에 영향 없음
- Daily cap은 `evaluateAndAlert` 시작 시 체크 → retry 경로와 무관

### Cooldown과 충돌 없음
- Cooldown은 **같은 sourceId의 새 알림 생성** 방지
- Retry는 기존 알림의 발송 재시도 → sourceId 체크 안 함
- 독립 경로

### Dedup과 충돌 없음
- Retry는 같은 `notificationId`의 같은 `channel`에 대한 재발송
- 새 notification record 생성 안 함
- dispatch 자체에 dedup 로직 없음 (idempotent)

### Duplicate delivery 가능성
- **있음 (극히 드묾):** 1차 dispatch가 실제로는 전달됐지만 응답이 늦어 FAILED로 판정 → retry로 2번 전달
- **영향:** 사용자가 같은 이메일/webhook을 2번 받을 수 있음
- **수준:** S3 — 실제 발생 확률 매우 낮음, 이메일 자체가 idempotent하지 않아 완전 방지 어려움
