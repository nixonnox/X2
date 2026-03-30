# Delivery Log Gap List

> Date: 2026-03-16
> Total: 0 S0, 1 S1, 2 S2, 2 S3

## S0 — Delivery 결과 persistence 불성립

**없음** — 최소 2가지 경로(notification.emailSentAt + structured log)로 기록됨.

## S1 — 출시 전 수정 필요

### S1-1. delivery_logs 테이블 직접 사용 불가

- **현상:** `delivery_logs.executionId` FK가 NOT NULL — automation execution 없이 INSERT 불가
- **영향:** 발송 이력을 delivery_logs 테이블에서 쿼리할 수 없음. 운영자가 DB에서 발송 이력 조회 불가
- **현재 보완:** structured console log + notification.emailSentAt
- **수정 방안:**
  - A) `executionId`를 nullable로 schema 변경 → `prisma migrate dev`
  - B) intelligence alert용 lightweight execution record 자동 생성
  - C) 별도 `alert_delivery_logs` 테이블 추가
- **권장:** 방안 A (가장 간단, 기존 테이블 재사용)

## S2 — 제한 오픈 가능

### S2-1. WEBHOOK 성공 DB 기록 없음

- **현상:** EMAIL은 `emailSentAt` 필드가 있지만 WEBHOOK은 대응 필드 없음
- **영향:** webhook 발송 성공 시점을 DB에서 확인 불가 (structured log에만)
- **수정:** notification 테이블에 `webhookSentAt` 추가 또는 delivery_logs 사용

### S2-2. Retry 상태 메모리 기반

- **현상:** setTimeout으로 재시도 → 서버 재시작 시 진행 중인 retry 소실
- **영향:** 재시작 후 실패한 발송의 재시도가 사라짐
- **수정:** BullMQ delayed job으로 전환

## S3 — 개선 권장

### S3-1. Skipped/capped 상태 로그 없음

- **현상:** 채널이 비활성이라 skip된 경우, daily cap으로 알림 미생성된 경우의 delivery log 없음
- **수정:** 채널 결정 시점에서 skip 로그 추가

### S3-2. Retry 시 projectId 빈 문자열

- **현상:** `persistDeliveryLog({ projectId: "" })` — retry 경로에서 projectId 미전달
- **수정:** retry params에 projectId 포함
