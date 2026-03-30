# Verify: Spike Detection Runtime

> Date: 2026-03-16
> Status: 완료

## 정책

| 항목 | 값 | 근거 |
|------|-----|------|
| Algorithm | mean + 2σ | router:1449-1450 |
| Min count | 3 (noise filter) | router:1453 |
| Spike label | `{hour}시 — 평균 대비 {ratio}%` | router:1456 |
| isSpike flag | per dataPoint | router:1469 |
| ReferenceLine | spikeThreshold | HourlyTrendChart |
| Spike color | amber (#f59e0b) | Cell fill |
| Stats | mean, spikeThreshold, totalMentions, peakHour | router:1472-1477 |

## False positive 제어

- `count > 3` — 극소량 데이터 노이즈 방지
- `2σ` — 통계적 유의미성 (약 95% 신뢰구간 밖)
- 시간별 집계 → 일별보다 세밀하지만 분 단위 노이즈는 흡수
