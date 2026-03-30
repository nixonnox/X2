# Alert Guardrail & Delivery Gap Register

> Date: 2026-03-16
> Total: 0 S0, 2 S1, 3 S2, 4 S3

## S0 — 핵심 흐름 불성립

**없음**

## S1 — 출시 전 반드시 수정

### S1-1. delivery_logs 테이블 직접 사용 불가

- **현상:** executionId FK NOT NULL → intelligence alert에서 직접 INSERT 불가
- **영향:** 발송 이력 DB 쿼리 불가, structured console log에만 의존
- **수정:** executionId nullable 변경 (schema migration)
- **우선순위:** HIGH

### S1-2. setTimeout 기반 retry — 서버 재시작 시 소실

- **현상:** 외부 채널 retry가 setTimeout으로 예약 → 배포/재시작 시 소실
- **영향:** 실패한 이메일/웹훅이 영구적으로 재시도되지 않을 수 있음
- **수정:** BullMQ delayed job으로 전환
- **우선순위:** HIGH (운영 안정성)

## S2 — 제한 오픈 가능

### S2-1. Daily cap count 실패 시 보수적 처리 없음

- **현상:** notification.count 쿼리 실패 → dailyAlertCount=0으로 진행
- **수정:** 실패 시 maxAlertsPerDay로 설정 (보수적)

### S2-2. WEBHOOK 성공 DB 필드 없음

- **현상:** emailSentAt은 있지만 webhookSentAt 없음
- **수정:** 필드 추가 또는 delivery_logs 사용

### S2-3. Retry catch 블록에서 delivery log 미기록

- **현상:** setTimeout 내부 catch에서 persistDeliveryLog 미호출
- **수정:** catch 블록에 persistDeliveryLog 추가

## S3 — 개선 권장

### S3-1. 하루 기준이 로컬 시간
- setHours(0,0,0,0) → UTC 통일 필요

### S3-2. Retry 시 projectId 빈 문자열
- params에 projectId 전달 필요

### S3-3. Skipped/capped 상태 delivery log 없음
- 채널 비활성으로 skip된 경우 로그 없음

### S3-4. 비-intelligence 알림에 guardrail 미적용
- risk-signal, automation 등은 별도 cap/channel prefs 없음
