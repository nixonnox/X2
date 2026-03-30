# Delivery Log Schema & Runtime

> Date: 2026-03-16
> Status: IMPLEMENTED (structured log + notification update)

## 현재 구현 방식

### 1차: Structured Console Log

모든 delivery 결과를 JSON 구조 로그로 출력:

```json
{
  "notificationId": "abc123",
  "projectId": "proj-001",
  "channel": "EMAIL",
  "status": "sent",
  "attemptCount": 1,
  "failureReason": null,
  "deliveredAt": "2026-03-16T10:00:00Z",
  "loggedAt": "2026-03-16T10:00:01Z"
}
```

### 2차: Notification 테이블 업데이트

- EMAIL 발송 성공 시 `emailSentAt` 타임스탬프 업데이트
- 기존 `channels` 배열에 발송 대상 채널 기록

### Status 값

| Status | 의미 |
|--------|------|
| queued | 발송 대기 |
| sent | 발송 성공 |
| failed | 발송 실패 |
| skipped | 채널 비활성/미설정으로 skip |
| capped | 일일 상한 도달로 skip |

## 향후 개선 (S2)

`delivery_logs` 테이블 직접 사용:
- 현재 `executionId` FK 제약으로 직접 INSERT 불가
- 해결: schema에서 `executionId`를 nullable로 변경 또는 lightweight execution 자동 생성
