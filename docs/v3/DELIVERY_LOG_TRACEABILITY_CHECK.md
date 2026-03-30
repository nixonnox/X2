# Delivery Log Traceability Check

> Date: 2026-03-16

## Traceability 경로

| 질문 | 추적 가능 | 방법 |
|------|----------|------|
| 이 알림이 어떤 채널로 발송됐나? | ✓ | `notification.channels` 배열 + structured log |
| 이메일이 성공했나? | ✓ | `notification.emailSentAt` (null이면 미발송/실패) |
| 웹훅이 성공했나? | △ | structured log에서만 확인 (DB 필드 없음) |
| 몇 번 재시도했나? | △ | structured log `attemptCount` (DB 미저장) |
| 왜 실패했나? | △ | structured log `failureReason` (DB 미저장) |
| 이 프로젝트의 발송 이력은? | △ | structured log `projectId` (DB 쿼리 불가) |

## Retry 판단 근거

| 정보 | 사용 가능 | 소스 |
|------|----------|------|
| 실패 채널 | ✓ | dispatch 결과의 `r.channel` + `r.status` |
| 시도 횟수 | ✓ | `attemptCount` 파라미터 (메모리 내 추적) |
| 최대 횟수 도달 | ✓ | `MAX_RETRY_ATTEMPTS = 3` |
| 이전 실패 이유 | ✓ | `r.error` |
| 재시도 간격 | ✓ | `RETRY_DELAYS[attemptCount - 1]` |

**현재 retry는 메모리 기반** (setTimeout) — 서버 재시작 시 진행 중인 retry 소실
