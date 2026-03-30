# Delivery Log Persistence Verification

> Date: 2026-03-16
> Status: PARTIAL — DB persistence 제한적, structured log 기반 추적

## 1. Persistence 구조

### 현재 구현 (2단계)

**1차: Notification 테이블 업데이트**
| 항목 | 상태 | 근거 |
|------|------|------|
| DB persistence | PARTIAL | `notification.update({ emailSentAt })` — EMAIL 성공 시만 |
| channels 배열 | PASS | 생성 시 `channels` 필드에 발송 대상 채널 기록 |
| WEBHOOK 성공 기록 | **MISSING** | emailSentAt만 있고 webhookSentAt 필드 없음 |

**2차: Structured Console Log**
| 항목 | 상태 | 근거 |
|------|------|------|
| 구조화 JSON | PASS | `[DeliveryLog] { notificationId, channel, status, attemptCount, ... }` |
| 모든 상태 기록 | PASS | sent, failed, skipped, capped 모두 로그 |
| 쿼리 가능 | **NO** | console.info만 — DB 쿼리 불가 |

### delivery_logs 테이블 (미사용)
| 항목 | 상태 | 이유 |
|------|------|------|
| 테이블 존재 | PASS | Prisma schema에 `DeliveryLog` 모델 있음 |
| 직접 INSERT | **불가** | `executionId` FK가 NOT NULL — automation execution 없이 사용 불가 |
| 필드 구조 | 완전 | channel, status, sentAt, deliveredAt, failedAt, errorMessage, retryCount, sourceType, sourceId |

## 2. 필수 필드 매핑

| 필수 필드 | Structured Log | Notification Table | delivery_logs |
|-----------|---------------|-------------------|---------------|
| notificationId | ✓ | ✓ (id) | sourceId 가능 |
| projectId | ✓ | — (미저장) | — |
| channelType | ✓ | channels[] | channel |
| deliveryStatus | ✓ (sent/failed/skipped/capped) | — | status |
| attemptCount | ✓ | — | retryCount |
| failureReason | ✓ | — | errorMessage |
| createdAt | ✓ (loggedAt) | createdAt | createdAt |
| deliveredAt | ✓ | emailSentAt (EMAIL만) | deliveredAt |

## 3. 호출 위치

| 호출 위치 | 상태 | 상황 |
|-----------|------|------|
| dispatch 성공 후 | PASS | line 406 — `status: "sent"` |
| dispatch 실패 후 | PASS | line 406 — `status: "failed"` |
| retry 최대 도달 | PASS | line 552 — `status: "failed"`, `failureReason: "max_retry_reached"` |
| retry 성공/실패 | PASS | line 590 — 재시도 결과 기록 |
| skipped (채널 비활성) | **MISSING** | 채널 미포함 시 persistDeliveryLog 호출 안 됨 |
| capped (daily cap) | **MISSING** | daily cap 도달 시 알림 자체가 미생성 → 로그 없음 |
