# Verify: Context Preservation

> Date: 2026-03-16

| 맥락 | 보존 | 방법 |
|------|------|------|
| Keyword | PASS | `rawMentionsQuery` input에 `keyword` 포함 |
| 기간 | PASS | `days: 30` 파라미터 |
| 채널 | PASS | `platform` 필터 + 뱃지 표시 |
| 감성 | PASS | `sentiment` 필터 + 뱃지 표시 |
| 필터 변경 시 페이지 리셋 | PASS | `setRawMentionPage(1)` on filter change |
