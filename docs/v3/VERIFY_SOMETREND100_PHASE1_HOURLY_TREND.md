# Verify: Hourly Trend

> Date: 2026-03-16
> Status: 완료 (코드 검증)

## 상태 판정

| 항목 | 상태 |
|------|------|
| `hourlyTrend` tRPC endpoint | **완료** — router:1383, hours 1~168 |
| Hour bucket 집계 | **완료** — `d.toISOString().slice(0,13)` 기준 |
| 채널별 분리 | **완료** — `platforms: Record<string,number>` 집계 |
| 감성 분리 | **완료** — positive/negative per hour |
| `HourlyTrendChart` UI | **완료** — Bar chart + spike Cell 색상 |
| Query 연결 | **완료** — page.tsx:161 `hourlyTrendQuery` |
| 트렌드 탭 배치 | **완료** — 최상단 |
| Empty state | **완료** — "시간별 데이터가 아직 없어요" |
| Mock 데이터 | **아님** — rawSocialMention.publishedAt 실제 집계 |
