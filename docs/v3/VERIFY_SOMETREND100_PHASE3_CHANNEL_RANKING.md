# Verify: Channel Ranking

> Date: 2026-03-16
> Status: 완료

| 항목 | 상태 | 근거 |
|------|------|------|
| `channelRanking` endpoint | PASS | router:1500, 4가지 sortBy |
| Virality score 산식 | PASS | views×0.4+engagement×0.3+growth×0.2+subs×0.1 |
| Growth 계산 | PASS | latest vs previous snapshot subscriber diff |
| 정렬 4종 | PASS | views/engagement/growth/virality |
| days 파라미터 | PASS | 1~90일 (기간 전환 가능) |
| Empty state | PASS | "등록된 채널이 아직 없어요" |
| DB 소스 | Channel + ChannelSnapshot | Mock 아님 |
