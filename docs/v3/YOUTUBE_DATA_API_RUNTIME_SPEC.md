# YouTube Data API Runtime Spec

> Last updated based on actual source code analysis.
> Source: `packages/api/src/services/intelligence/youtube-data-api.adapter.ts`

## Overview

The `YouTubeDataApiAdapter` collects keyword-related YouTube comments by first searching
for relevant videos, then fetching comment threads from each video. It implements the
`SocialProviderAdapter` interface and is the primary fully-functional social provider
in the intelligence pipeline.

---

## Adapter Configuration

```typescript
readonly config: ProviderConfig = {
  name: "youtube",
  platform: "YOUTUBE",
  requiresApiKey: true,
  envKeyName: "YOUTUBE_API_KEY",
  authType: "API_KEY",
  rateLimitPerDay: 10000,
  documentation: "https://developers.google.com/youtube/v3/docs",
};
```

---

## Authentication

- **Type:** API Key (server key, no OAuth required)
- **Env Var:** `YOUTUBE_API_KEY`
- **Validation:** `isConfigured()` checks that the env var is set and is not the
  placeholder value `"your-youtube-api-key"`.

```typescript
isConfigured(): boolean {
  return !!this.apiKey && this.apiKey !== "your-youtube-api-key";
}
```

---

## API Endpoints Used

| Endpoint | Quota Cost | Purpose |
|----------|-----------|---------|
| `GET /youtube/v3/search?part=snippet&type=video` | **100 units** per call | Find videos matching keyword |
| `GET /youtube/v3/commentThreads?part=snippet` | **1 unit** per call | Fetch comment threads for a video |

Base URL: `https://www.googleapis.com/youtube/v3`

---

## Quota Management

### Daily Quota

- **Default allocation:** 10,000 units/day
- **Reset time:** Midnight Pacific Time (UTC-8)

### Quota Tracking

The adapter tracks quota usage in-memory:

```typescript
private dailyQuotaUsed = 0;
private lastQuotaReset: Date = new Date();
```

### Quota Reset Logic

```typescript
private resetQuotaIfNewDay(): void {
  // Convert current time and last reset time to Pacific Time
  // Compare dates; if different day, reset dailyQuotaUsed to 0
}
```

The reset uses a manual UTC-8 offset calculation (not timezone-aware library). It
compares year, month, and date components after applying the Pacific offset.

### Quota Per fetchMentions Call

| Step | Cost | Notes |
|------|------|-------|
| `searchVideos()` | 100 units | 1 call regardless of maxResults |
| `fetchCommentThreads()` x N | 1 unit each | Up to 5 videos processed |
| **Typical total** | **105 units** | 1 search + 5 comment thread calls |

With 10,000 units/day, approximately **95 full fetchMentions calls** are possible per day.

---

## fetchMentions Flow

```
1. Check isConfigured() -> return empty if false
2. resetQuotaIfNewDay()
3. searchVideos(keyword, min(maxResults, 10))
   - 100 quota units consumed
   - Returns array of videoId strings
4. For each videoId (up to 5):
   - fetchCommentThreads(videoId, keyword, 10)
   - 1 quota unit consumed per call
   - Returns SocialMention[] for that video
5. Collect all mentions, slice to maxResults
6. Return ProviderFetchResult with quota info
```

### searchVideos

```typescript
private async searchVideos(keyword: string, maxResults: number): Promise<string[]>
```

Parameters sent to YouTube API:
- `part`: `snippet`
- `q`: keyword
- `maxResults`: capped at 10 within fetchMentions
- `type`: `video`
- `order`: `relevance`
- `relevanceLanguage`: `ko` (Korean relevance bias)
- `key`: API key

Returns an array of `videoId` strings extracted from `response.items[].id.videoId`.

### fetchCommentThreads

```typescript
private async fetchCommentThreads(
  videoId: string,
  keyword: string,
  maxResults: number,
): Promise<SocialMention[]>
```

Parameters sent to YouTube API:
- `part`: `snippet`
- `videoId`: target video
- `maxResults`: 10 per video
- `order`: `relevance`
- `searchTerms`: keyword (filters comments by relevance)
- `key`: API key

**Comments disabled handling:** If the API returns 403 for a video (comments disabled),
the method returns an empty array silently without throwing.

---

## Data Transformation: toMention

Each `YouTubeCommentThread` is converted to a `SocialMention`:

```typescript
private toMention(thread: YouTubeCommentThread, videoId: string): SocialMention {
  return {
    id: `yt-${thread.id}`,
    platform: "YOUTUBE",
    text: this.stripHtml(comment.textDisplay),
    authorName: comment.authorDisplayName,
    authorHandle: // last segment of authorChannelUrl, or null
    sentiment: null,       // Filled by downstream analysis
    topics: [],            // Filled by downstream analysis
    publishedAt: comment.publishedAt,
    url: `https://www.youtube.com/watch?v=${videoId}&lc=${thread.id}`,
    engagement: {
      likes: comment.likeCount,
      comments: thread.snippet.totalReplyCount,
      shares: 0,           // YouTube API does not expose share count for comments
    },
  };
}
```

### HTML Stripping

YouTube comment text comes as HTML. The `stripHtml` method:

1. Converts `<br>` tags to newlines
2. Removes all other HTML tags
3. Decodes HTML entities: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`
4. Trims whitespace

```typescript
private stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
```

---

## Error Handling

### handleApiError

Parses the YouTube API error response and throws descriptive errors:

| HTTP Status | Condition | Error Message |
|-------------|-----------|---------------|
| 403 | `reason === "quotaExceeded"` | `YouTube quota 초과 (일일 10000 units)` |
| 403 | Other | `YouTube API 접근 거부: {message}` |
| Other | Any | Raw error message from API |

### testConnection Errors

| HTTP Status | Error |
|-------------|-------|
| 403 | `Quota 초과 또는 API 비활성: {message}` |
| 400 | `잘못된 API 키: {message}` |
| Network error | `연결 실패: {message}` |
| Not configured | `YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다` |

### Error Classification by Registry

When `fetchMentions` throws, the `SocialProviderRegistryService` classifies the error:

| Error message contains | Status set to |
|------------------------|---------------|
| `quota` or `rate` | `RATE_LIMITED` |
| `auth`, `token`, or `401` | `AUTH_EXPIRED` |
| Anything else | `ERROR` |

---

## YouTube API Response Types

### YouTubeSearchItem

```typescript
type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
  };
};
```

### YouTubeCommentThread

```typescript
type YouTubeCommentThread = {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        textDisplay: string;
        authorDisplayName: string;
        authorChannelUrl?: string;
        likeCount: number;
        publishedAt: string;
        updatedAt: string;
      };
    };
    totalReplyCount: number;
  };
};
```

### YouTubeApiResponse<T>

```typescript
type YouTubeApiResponse<T> = {
  items?: T[];
  pageInfo?: { totalResults: number; resultsPerPage: number };
  nextPageToken?: string;
  error?: {
    code: number;
    message: string;
    errors: Array<{ reason: string; domain: string; message: string }>;
  };
};
```

---

## Constraints and Limitations

| Constraint | Detail |
|-----------|--------|
| maxResults per search | Capped at 10 videos internally |
| Videos processed for comments | Up to 5 per call |
| Comments per video | Up to 10 per call |
| Total mention cap | `maxResults` param, max 50 |
| Relevance language | Hardcoded to `ko` (Korean) |
| Pagination | Not implemented (no `nextPageToken` usage) |
| Quota persistence | In-memory only; resets on process restart |
| Reply comments | Not fetched (only top-level comments) |
| Sentiment/topics | Always `null`/`[]` at collection time |

---

## Setup Instructions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable the **YouTube Data API v3**
3. Create an **API Key** (no OAuth needed for public data)
4. Set the environment variable:
   ```
   YOUTUBE_API_KEY=your-actual-api-key
   ```
5. The adapter will automatically detect the key on next request
