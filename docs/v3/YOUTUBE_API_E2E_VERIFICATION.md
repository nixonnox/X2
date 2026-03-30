# YouTube API End-to-End Verification

**Date:** 2026-03-15
**Status:** CODE CORRECT, E2E NOT VERIFIED

---

## 1. API Key Status

### Current State: NOT SET
- `YOUTUBE_API_KEY` is not present in any `.env` file in the project
- `.env.example` references the variable name but contains no value
- No API key was provided during this session
- Without a key, no actual API calls to YouTube Data API v3 can be made

---

## 2. Code Verification (Source Review)

### File: `packages/api/src/services/intelligence/youtube-data-api.adapter.ts`

#### Constructor
- Reads `process.env.YOUTUBE_API_KEY` at instantiation
- Stores in private `apiKey` field

#### isConfigured() — VERIFIED CORRECT
- Returns `true` only when:
  - `this.apiKey` is truthy (not undefined, not empty string)
  - `this.apiKey !== "your-youtube-api-key"` (rejects common placeholder)
- Returns `false` otherwise

#### testConnection() — VERIFIED CORRECT (code review only)
- Short-circuits with error message if `isConfigured()` is false
- When configured: makes a lightweight `search?q=test&maxResults=1` call (100 quota units)
- Handles HTTP 403 (quota exceeded / API disabled)
- Handles HTTP 400 (invalid API key)
- Catches network errors with descriptive message

#### fetchMentions() — VERIFIED CORRECT (code review only)
- When unconfigured: returns `{ mentions: [], error: "YOUTUBE_API_KEY 미설정" }` immediately
- When configured:
  1. Resets daily quota counter if Pacific Time day has changed
  2. Calls `searchVideos()` — `search.list` endpoint (100 quota units)
  3. For up to 5 video results, calls `fetchCommentThreads()` — `commentThreads.list` (1 unit each)
  4. Maps YouTube comment threads to `SocialMention` format via `toMention()`
  5. Returns mentions with quota tracking metadata

#### Quota Management — VERIFIED CORRECT (code review only)
- Tracks `dailyQuotaUsed` counter
- `resetQuotaIfNewDay()` resets at midnight Pacific Time (YouTube's quota boundary)
- Reports `quotaUsed` and `quotaRemaining` in every response
- Default daily limit: 10,000 units (matches YouTube's free tier)

#### Error Handling — VERIFIED CORRECT (code review only)
- `handleApiError()` parses YouTube API error response format
- Special case for `quotaExceeded` reason on 403 responses
- HTTP 403 on commentThreads silently returns empty array (comments may be disabled)
- All errors include the original YouTube API error message

#### HTML Stripping — VERIFIED CORRECT (code review only)
- `stripHtml()` handles: `<br>`, HTML tags, `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`
- Applied to comment text before returning as SocialMention

---

## 3. Provider Coverage Impact

### When Key Is Missing
- `isConfigured()` returns `false`
- Intelligence analysis proceeds without YouTube data
- `providerCoverage` in analysis results would show YouTube as NOT_CONNECTED
- `isPartial` flag would be `true` in analysis results
- This can trigger `PROVIDER_COVERAGE_LOW` alert if confidence < 0.5

### When Key Is Present (theoretical)
- `isConfigured()` returns `true`
- `testConnection()` makes a real API call to verify the key works
- `fetchMentions()` collects real YouTube comments for analysis
- YouTube would appear as CONNECTED in provider coverage

---

## 4. API Endpoints Used

| Endpoint                | Quota Cost | Purpose                         |
| ----------------------- | ---------- | ------------------------------- |
| `search.list`           | 100 units  | Find relevant videos by keyword |
| `commentThreads.list`   | 1 unit     | Fetch comments on a video       |

### Request Parameters
- `search.list`: `part=snippet`, `type=video`, `order=relevance`, `relevanceLanguage=ko`
- `commentThreads.list`: `part=snippet`, `order=relevance`, `searchTerms=<keyword>`

---

## 5. Data Mapping

YouTube comment thread is mapped to `SocialMention`:

| SocialMention Field | YouTube Source                              |
| ------------------- | ------------------------------------------- |
| id                  | `"yt-" + thread.id`                         |
| platform            | `"YOUTUBE"`                                 |
| text                | `topLevelComment.snippet.textDisplay` (HTML stripped) |
| authorName          | `topLevelComment.snippet.authorDisplayName` |
| authorHandle        | Last segment of `authorChannelUrl`          |
| sentiment           | `null` (analyzed downstream)                |
| topics              | `[]` (analyzed downstream)                  |
| publishedAt         | `topLevelComment.snippet.publishedAt`       |
| url                 | `youtube.com/watch?v={videoId}&lc={threadId}` |
| engagement.likes    | `topLevelComment.snippet.likeCount`         |
| engagement.comments | `thread.snippet.totalReplyCount`            |
| engagement.shares   | `0` (not available via API)                 |

---

## 6. What Would Be Needed for E2E Verification

1. Obtain a YouTube Data API v3 key from Google Cloud Console
2. Enable "YouTube Data API v3" in the GCP project
3. Add to environment: `YOUTUBE_API_KEY=<real-key>`
4. Run `testConnection()` and verify `{ ok: true }`
5. Run `fetchMentions("test keyword")` and verify:
   - `mentions.length > 0`
   - Each mention has valid `id`, `platform`, `text`, `url`
   - `quotaUsed` and `quotaRemaining` are correct
6. Verify quota exhaustion handling (would need near-limit quota usage)

---

## 7. Honesty Statement

### Verified (by reading source code)
- Constructor reads the correct environment variable
- `isConfigured()` logic correctly rejects missing/placeholder keys
- `fetchMentions()` returns empty array with error message when unconfigured
- `testConnection()` returns `{ ok: false }` when unconfigured
- Quota tracking logic exists and follows YouTube's Pacific Time reset
- Error handling covers 400, 403, and network errors
- HTML stripping handles standard HTML entities

### NOT Verified (would require running code with a real API key)
- Actual HTTP requests to `googleapis.com`
- Real YouTube API response parsing
- Quota counter accuracy against real API usage
- Rate limiting behavior under load
- Comment thread pagination (nextPageToken handling — notably absent in current code)
- Edge cases: videos with disabled comments, private videos, age-restricted content
- `relevanceLanguage=ko` parameter effect on search results

### Potential Issues Found During Review
- No `nextPageToken` pagination: only first page of results is fetched
- `engagement.shares` is hardcoded to 0 — YouTube API does not expose share counts
- Quota tracking is in-memory only — resets on process restart, not on actual quota usage
