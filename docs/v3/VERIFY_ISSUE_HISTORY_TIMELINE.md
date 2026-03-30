# Verify: Issue History Timeline

> Date: 2026-03-16
> Status: 완료

## 이벤트 유형

| Type | 조건 | Severity |
|------|------|----------|
| spike | 전일 대비 100%+ 증가 | high (3배+) / medium |
| drop | 전일 대비 50%+ 감소 | high (75%+) / medium |
| sentiment_shift | 부정 비율 20%p+ 변화 | high (30%p+) / low |
| new_peak | 기간 최고치 갱신 (10건+) | medium |

## 데이터 소스

- `socialMentionSnapshot` (일별) — day-over-day 비교
- 최소 2일 데이터 필요
- Mock: **아님** — 실제 snapshot 기반

## UI

| 항목 | 구현 |
|------|------|
| 타임라인 카드 | 유형별 아이콘+색상+제목+설명+날짜 |
| Severity 뱃지 | high → "주의" 빨강 뱃지 |
| 최대 10건 표시 | newest first |
| Empty state | "특별한 이슈가 감지되지 않았어요" |
