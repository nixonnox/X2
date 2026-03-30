# External Retry Gap List

> Date: 2026-03-16
> Total: 0 S0, 1 S1, 1 S2, 2 S3

## S0 — Retry 핵심 흐름 불성립

**없음** — 5분/15분/60분 backoff, 최대 3회, delivery log 연동 확인.

## S1 — 출시 전 수정 필요

### S1-1. setTimeout 기반 — 서버 재시작 시 소실

- **현상:** retry가 `setTimeout`으로 예약됨. 서버 재시작/배포 시 진행 중인 retry 소실
- **영향:** 실패한 외부 발송이 영구적으로 재시도되지 않을 수 있음
- **수정:** BullMQ delayed job으로 전환 (`backoff` 옵션 또는 `delay` 파라미터)
- **긴급도:** MEDIUM — 외부 발송 자체가 선택 기능이므로 핵심 흐름은 아님

## S2 — 제한 오픈 가능

### S2-1. Retry catch block에서 delivery log 미기록

- **현상:** `setTimeout` 내부 `catch(err)` 블록에서 `console.error`만 — `persistDeliveryLog` 미호출
- **영향:** dispatch + persistDeliveryLog 모두 실패하는 극단적 경우 추적 안 됨
- **수정:** catch 블록에 `persistDeliveryLog({ status: "failed" })` 추가

## S3 — 개선 권장

### S3-1. Duplicate delivery 가능성

- **현상:** 1차 dispatch가 실제 전달됐지만 응답 지연으로 FAILED 판정 → retry로 중복 전달
- **영향:** 극히 드묾, 이메일 특성상 완전 방지 어려움
- **수정:** dispatch 시 idempotency key 포함 (webhook에만 적용 가능)

### S3-2. Retry 시 projectId 빈 문자열

- **현상:** `scheduleRetry` params에서 `persistDeliveryLog({ projectId: "" })`
- **영향:** retry 로그에서 프로젝트 추적 불가
- **수정:** params에 projectId 포함
