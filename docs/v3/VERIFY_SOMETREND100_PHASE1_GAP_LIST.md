# Verify: Sometrend100 Phase1 Gap List

> Date: 2026-03-16
> S0: 0, S1: 0, S2: 0, S3: 2

## S0/S1/S2
**없음**

## S3

### S3-1. 시간별 채널 분리 UI 미표시
- `platforms` 데이터는 집계되지만 HourlyTrendChart에서 채널별 분리 차트 미표시
- 현재: 전체 count만 Bar 표시
- 수정: platform별 stacked bar 또는 별도 차트

### S3-2. 이슈 히스토리 → 알림 연동 없음
- issue event 감지 시 자동 알림 생성 없음
- 수정: issueTimeline 이벤트를 alert 조건으로 연동
