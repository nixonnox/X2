# Verify: Related Keyword Timeseries

> Date: 2026-03-16
> Status: 완료

| 항목 | 상태 | 근거 |
|------|------|------|
| `relatedKeywordChange` endpoint | PASS | router:1302, currentDays+previousDays |
| 기간 A vs B 비교 | PASS | countTopics(start,end) × 2 periods |
| new/rising/declining/stable/gone | PASS | prev==0→new, cur>prev×1.5→rising 등 |
| Summary counts | PASS | new/rising/declining/stable/gone 건수 |
| `RelatedKeywordChangePanel` UI | PASS | 변화 유형별 아이콘+색상+건수 |
| Query 연결 | PASS | page.tsx:176 |
| 데이터 소스 | rawSocialMention.topics | Mock 아님 |
| 정적 비교 아닌지 | **아님** — 실제 2기간 DB 집계 |
