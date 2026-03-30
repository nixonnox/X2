# Verify: Virality & Engagement Score

> Date: 2026-03-16

## 채널 Virality Score (0-100)
```
viewScore    = min(100, totalViews/10000)  × 0.4
engScore     = min(100, avgEngagement×100) × 0.3
growthScore  = min(100, max(0, growth×5+50)) × 0.2
subScore     = min(100, subscribers/10000)  × 0.1
```
- **종합 지표** — 단순 합산 아님, 가중 종합
- **설명 가능** — 각 요소의 기여 비율 명확

## 콘텐츠 Engagement Score (%)
```
(likes + comments×2 + shares×3) / views × 100
```
- **comments ×2** — 깊은 참여 반영
- **shares ×3** — 확산 가치 반영
- **단순 합산 아님** — view 대비 비율
