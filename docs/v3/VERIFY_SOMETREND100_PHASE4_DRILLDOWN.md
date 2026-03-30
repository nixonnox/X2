# Verify: Drill-down

> Date: 2026-03-16
> Status: 완료

## 상태 판정

| 항목 | 상태 | 조치 |
|------|------|------|
| EvidenceSidePanel (노드→증거) | **완료+검증** | 건너뛰기 — 669줄, 기존 |
| LiveMentionStatusPanel (요약) | **완료+검증** | 건너뛰기 |
| `rawMentions` endpoint | **완료** | 이번 검증 |
| `RawMentionList` UI | **완료** | 이번 검증 |
| 차트→근거→원문 흐름 | **완료** | 이번 검증 |

## Drill-down 흐름

```
[1] 요약 탭 → IntelligenceSummaryCards
[2] 연결 그래프 탭 → RadialGraph → 노드 클릭 → EvidenceSidePanel (기존)
[3] 실시간 반응 탭 → LiveMentionStatusPanel(요약) → RawMentionList(전체 원문) (신규)
```

## rawMentions endpoint 검증

| 항목 | 상태 |
|------|------|
| DB 소스 | rawSocialMention 직접 조회 — Mock 아님 |
| 필터: platform | PASS — `where.platform = input.platform` |
| 필터: sentiment | PASS — `where.sentiment = input.sentiment` |
| 필터: days | PASS — `publishedAt >= startDate` |
| 페이지네이션 | PASS — limit/offset, total/totalPages |
| 원문 필드 | text, authorName, postUrl, sentiment, topics, engagement |

## RawMentionList UI 검증

| 항목 | 상태 |
|------|------|
| 필터 토글 | PASS — 플랫폼/감성 select |
| 페이지네이션 | PASS — prev/next + page indicator |
| 감성 뱃지 | PASS — POSITIVE/NEGATIVE/NEUTRAL 색상 |
| 플랫폼 뱃지 | PASS — YOUTUBE/IG/TIKTOK/X 색상 |
| 외부 링크 | PASS — `postUrl → ExternalLink` |
| Empty state | PASS — "원문 데이터가 아직 없어요" |
