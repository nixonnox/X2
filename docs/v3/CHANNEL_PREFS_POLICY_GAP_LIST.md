# Channel Prefs Policy Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 1 S2, 2 S3

## S0 — User preference가 dispatch에 반영되지 않음

**없음** — `loadUserChannelPrefs()` → 채널 결정 → dispatch 전달 경로 확인.

## S1 — 출시 전 수정 필요

**없음**

## S2 — 제한 오픈 가능

### S2-1. 비-intelligence 알림의 channel prefs 미반영

- **현상:** `risk-signal`, `automation`, `ops-monitoring` 등의 알림 생성 경로는 `loadUserChannelPrefs`를 호출하지 않음
- **영향:** 이들 알림은 사용자 채널 설정과 무관하게 IN_APP으로만 생성
- **수정:** 범용 NotificationDispatchDecisionService 도입
- **현재 영향도:** LOW — 이들 서비스는 대부분 IN_APP만 사용

## S3 — 개선 권장

### S3-1. Dispatch 전 채널 설정 확인 시점

- **현상:** 알림 생성 시점에 channel prefs를 읽음. 생성과 dispatch 사이에 설정이 바뀌면 불일치
- **영향:** 매우 드문 경우 — 알림 생성→dispatch가 동기적으로 발생
- **수정:** dispatch 직전에 한번 더 확인 (현재 구조에서는 거의 동시)

### S3-2. 채널별 상세 설정 미구현

- **현상:** 알림 유형별(WARNING_SPIKE만 이메일, BENCHMARK_DECLINE은 IN_APP만 등) 세분화 설정 없음
- **영향:** 모든 intelligence alert이 같은 채널로 발송
- **수정:** AlertType × Channel 매트릭스 설정 UI
