# Verify: YouTube Provider E2E (Deduped)

> Date: 2026-03-16
> Status: **완전 구현 — Key 설정 시 즉시 동작**

## API 호출 코드 확인

| 메서드 | 실제 fetch | API |
|--------|-----------|-----|
| testConnection | `GET /search?q=test&maxResults=1` | YouTube Search |
| searchVideos | `GET /search?q={keyword}&type=video` | YouTube Search |
| fetchCommentThreads | `GET /commentThreads?videoId={id}` | YouTube Comments |

- Quota 추적: `dailyQuotaUsed` 인스턴스 변수
- 에러 처리: 403(quota), 400(bad key), network error 구분
- SocialMention 변환: text, authorName, publishedAt, url, engagement
