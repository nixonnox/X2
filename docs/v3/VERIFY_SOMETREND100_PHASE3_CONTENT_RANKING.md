# Verify: Content Ranking

> Date: 2026-03-16
> Status: 완료

| 항목 | 상태 | 근거 |
|------|------|------|
| `contentRanking` endpoint | PASS | 4가지 sortBy |
| Engagement score | PASS | (likes+comments×2+shares×3)/views×100 |
| 기간 필터 | PASS | publishedAt >= startDate |
| 정렬 4종 | PASS | views/likes/comments/engagement |
| Channel 정보 포함 | PASS | channel.name, channel.platform |
| Empty state | PASS | "이 기간에 콘텐츠가 아직 없어요" |
| DB 소스 | Content + ContentMetricDaily | Mock 아님 |
