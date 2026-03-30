# Verify: Channel Prefs Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 1 S2, 1 S3

## S0
**없음**

## S1
**없음**

## S2

### S2-1. 비-intelligence 알림에 channel prefs 미적용
- risk-signal, automation 등의 알림 생성 경로는 loadUserChannelPrefs 미호출
- 현재 영향도 LOW — 이들은 대부분 IN_APP만 사용

## S3

### S3-1. AlertType별 채널 세분화 미구현
- 모든 intelligence alert이 같은 채널로 발송
- 향후: WARNING_SPIKE만 email, BENCHMARK_DECLINE은 IN_APP만 등 세분화
