# Verify: Notifications Filters & Pagination (Deduped)

> Date: 2026-03-16

## Filters (완료)

| 필터 | 구현 | Backend | UI |
|------|------|---------|-----|
| 읽음/안읽음 | DONE | `unreadOnly` param | 버튼 토글 |
| 중요도 | DONE | `priority` enum | select |
| sourceType | DONE | `sourceType` string | select (Intelligence/시스템) |
| 기간 | DONE | `since` ISO date | select (오늘/7일/30일) |
| 검색 | DONE | `search` title+message | input |

## Pagination (완료)

| 항목 | 구현 |
|------|------|
| pageSize | 20 |
| prev/next | ChevronLeft/Right 버튼 |
| page indicator | `{page} / {totalPages}` |
| total count | `총 {total}건 중 {start}-{end}건` |
| disabled on edge | DONE |
