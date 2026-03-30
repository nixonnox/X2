# YouTube Provider E2E Status

> Date: 2026-03-16
> Status: **완전 구현 — API Key 설정 시 즉시 동작**

## Adapter 구현

| 메서드 | 구현 | API 호출 |
|--------|------|---------|
| `isConfigured()` | DONE | env 체크 |
| `testConnection()` | DONE | `GET /search?q=test&maxResults=1` (100 quota) |
| `fetchMentions(keyword)` | DONE | `GET /search` → `GET /commentThreads` |
| `searchVideos(keyword, max)` | DONE | YouTube Search API |
| `fetchCommentThreads(videoId)` | DONE | YouTube CommentThreads API |

## Quota 관리

| 항목 | 값 |
|------|-----|
| 일일 쿼터 | 10,000 units |
| search 호출 | 100 units |
| commentThreads 호출 | 1 unit |
| 1회 수집 예상 | ~105 units (search + 5 videos) |
| 일일 가능 횟수 | ~95회 |
| dailyQuotaUsed 추적 | DONE (인스턴스 레벨) |

## 설정 방법

```bash
# .env.local에 추가
YOUTUBE_API_KEY="AIzaSy..."
```

1. Google Cloud Console → API & Services → Credentials
2. "Create Credentials" → API Key
3. YouTube Data API v3 활성화
4. Key 복사 → `.env.local`
