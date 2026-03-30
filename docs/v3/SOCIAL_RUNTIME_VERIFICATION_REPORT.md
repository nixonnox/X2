# Social Runtime Verification Report

> Generated: 2026-03-15
> Scope: Social provider adapters, registry, and bridge layer runtime verification

---

## Summary

| Provider    | Classification | Adapter Status       | Issue Count | Highest Severity |
|-------------|----------------|----------------------|-------------|------------------|
| YouTube     | REAL_API       | Working              | 4           | S2               |
| Instagram   | REAL_API       | Needs token          | 4           | S1               |
| TikTok      | SCAFFOLD       | Requires API approval| 3           | S1               |
| X (Twitter) | REAL_API       | Requires paid tier   | 4           | S1               |
| Registry    | —              | Functional           | 3           | S2               |
| Bridge      | —              | Functional           | 4           | S1               |

---

## YouTube — Classification: REAL_API

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Quota tracking is per-instance, no cross-request persistence | S2 | YouTube quota counter lives in the adapter instance memory. Each new request creates a fresh instance, resetting the counter. There is no shared or persisted quota state. | Quota limits are never enforced across requests. A burst of concurrent requests can silently exceed the daily 10,000-unit quota, causing all subsequent requests to fail with 403 until the next day. | N | Y — Requires a shared quota store (Redis or DB row) that all adapter instances read/write atomically. |
| 2 | DST bug in quota reset logic | S3 | Quota reset time is hardcoded to UTC-8 instead of using a proper Pacific Time timezone that accounts for daylight saving time. | During PDT (UTC-7), the quota reset check is off by one hour. This can cause either premature reset (losing tracking) or delayed reset (blocking requests for an extra hour). Edge case that occurs ~7 months per year. | Y — Replace hardcoded offset with `America/Los_Angeles` timezone via `Intl.DateTimeFormat` or a date library. | N |
| 3 | testConnection burns 100 quota units | S3 | The `testConnection` method performs a real `search.list` API call that costs 100 quota units. | Every health check or connection validation consumes 1% of the daily quota. Automated monitoring or frequent reconnection attempts can drain quota before any real work is done. | Y — Replace with a zero-cost endpoint such as `youtube.channels.list` for the authenticated channel (1 unit). | N |
| 4 | Sequential adapter calls in registry | S2 | When the registry invokes multiple adapters (e.g., YouTube + Instagram + X), calls are made sequentially with `for...of` + `await`. | Total latency equals the sum of all adapter response times. For 3 adapters each taking 2s, the user waits 6s instead of ~2s. Directly degrades UX on multi-provider queries. | Y — Replace sequential loop with `Promise.allSettled()`. | N |

---

## Instagram — Classification: REAL_API (implemented, needs token)

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Graph API v19.0 may be outdated | S1 | The adapter targets Instagram Graph API v19.0. Meta deprecates API versions on a rolling 2-year cycle, and newer versions may have breaking changes or required migrations. | If v19.0 is deprecated, all Instagram API calls will return errors. No data collection is possible until the version is updated and any breaking changes are addressed. | Y — Update the version constant and verify endpoint compatibility. | N |
| 2 | No author info from hashtag search | S2 | The hashtag search endpoint (`/ig_hashtag_search` + `/recent_media`) does not return author/username metadata due to Instagram API limitations. | Mentions collected via hashtag search have no attribution. The UI cannot display who posted the content, and deduplication across sources is unreliable. | N | Y — Requires a secondary lookup per media ID to fetch owner info, adding API calls and rate limit pressure. |
| 3 | No token refresh logic (60-day expiry) | S2 | Instagram long-lived tokens expire after 60 days. The adapter has no mechanism to detect expiration or refresh the token. | After 60 days, all Instagram data collection silently fails. The user must manually regenerate and reconfigure the token. No warning is given before expiry. | N | Y — Implement a token refresh cron job that exchanges the token before expiry (tokens can be refreshed after day 1 and before day 60). |
| 4 | No pagination in media fetch | S3 | The media fetch endpoint does not follow pagination cursors. Only the first page of results is returned. | For active hashtags, only the 25 most recent posts are retrieved. Older posts within the analysis window are missed, leading to incomplete data and skewed metrics. | Y — Add cursor-based pagination loop with a configurable max-page limit. | N |

---

## TikTok — Classification: SCAFFOLD (requires Research API approval)

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Research API requires approval, not publicly available | S1 | TikTok's Research API is access-gated. Applications must be submitted and approved by TikTok, with restrictions on commercial use and data retention. | The TikTok adapter cannot function at all without approved API credentials. This is a business blocker, not a code issue. No TikTok data collection is possible until approval is granted. | N | Y — Submit Research API application; alternatively, evaluate third-party data providers as a fallback. |
| 2 | Video query syntax may not match current API version | S2 | The query construction for video search may use field names or filter syntax from a draft or older API specification. | If the syntax is wrong, queries return errors or empty results even with valid credentials. Requires testing against the live API once access is granted. | N | Y — Validate query format against current Research API documentation after approval. |
| 3 | No rate limiting for comment fetches | S3 | Comment fetch requests are not throttled or rate-limited on the client side. | If the Research API has per-endpoint rate limits (likely), burst comment fetches will trigger 429 responses and potential temporary bans. | Y — Add a simple request-per-second limiter using a token bucket or delay between calls. | N |

---

## X (Twitter) — Classification: REAL_API (requires paid Basic tier $100/mo)

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Free tier cannot search, requires Basic tier | S1 | The X API free tier does not include the search endpoint (`/2/tweets/search/recent`). The Basic tier ($100/mo) or higher is required for search access. | The X adapter is non-functional on the free tier. All search-based data collection fails with 403. This is a cost/business decision, not a code bug. | N | Y — Upgrade to Basic tier or implement a non-search fallback (e.g., filtered stream on free tier, if available). |
| 2 | author_id returned instead of @handle | S2 | The X API returns `author_id` (numeric) in tweet objects. The adapter does not perform user lookup to resolve the display username (@handle). | Mentions show numeric IDs instead of human-readable usernames. The UI cannot display or link to the author's profile. Cross-referencing with other platforms is impossible. | Y — Add `expansions=author_id` and `user.fields=username` to the search request to get handles in the `includes.users` response. | N |
| 3 | Korean lang filter hardcoded | S3 | The search query appends `lang:ko` as a hardcoded filter, restricting results to Korean-language tweets only. | Non-Korean tweets mentioning the keyword are excluded. International brands or multi-language campaigns get incomplete coverage. | Y — Make the language filter configurable via adapter options, defaulting to the project's locale setting. | N |
| 4 | No pagination | S3 | The search endpoint returns a single page of results (max 100 tweets per request on Basic tier). The `next_token` cursor is not followed. | Only the most recent ~100 tweets are analyzed. For high-volume keywords, this represents a fraction of the actual conversation, leading to incomplete trend and sentiment data. | Y — Add a pagination loop following `next_token` with a configurable max-results cap. | N |

---

## Registry — Cross-Adapter Issues

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Sequential not parallel adapter calls | S2 | The registry iterates over enabled adapters sequentially (`for...of` with `await`), waiting for each to complete before starting the next. | Multi-provider queries take N times longer than necessary. A 3-adapter query with 2s per adapter takes 6s instead of ~2s. | Y — Use `Promise.allSettled()` to run all adapter calls concurrently. | N |
| 2 | String-matching error classification fragile | S3 | Error types are determined by checking error message substrings (e.g., `includes("quota")`, `includes("rate")`). | API providers can change error message text at any time, breaking classification. Errors may be misclassified (e.g., a quota error not recognized, leading to retries that worsen the situation). | N | Y — Classify errors by HTTP status code and error code fields instead of message text. |
| 3 | No global quota enforcement | S3 | Each adapter tracks its own quota independently. There is no registry-level quota budget or circuit breaker across all providers. | A single runaway query can exhaust one provider's entire daily quota. No way to set organization-wide API spend limits. | N | Y — Implement a quota manager service that allocates and tracks budgets across all adapters. |

---

## Bridge — Social-to-Intelligence Translation Issues

| # | Title | Severity | Description | Actual Impact | Quick Fix | Structural Fix |
|---|-------|----------|-------------|---------------|-----------|----------------|
| 1 | Sentiment always null for social mentions | S1 | The bridge maps social adapter output to the intelligence schema, but no sentiment analysis is performed. The `sentiment` field is always `null`. | The intelligence layer receives mentions with no sentiment data. Downstream analytics (sentiment distribution, trend sentiment) are empty or misleading. This is a core feature gap. | N | Y — Integrate an LLM-based or lexicon-based sentiment classifier in the bridge layer. Requires model selection, prompt design, and cost estimation. |
| 2 | Topics only from Instagram hashtags, other adapters return empty | S2 | Topic extraction relies on Instagram hashtags. YouTube, TikTok, and X adapters return an empty topics array. | Topic analysis is heavily skewed toward Instagram. Multi-provider topic trends are meaningless because 3 of 4 providers contribute zero topics. | N | Y — Implement keyword/NLP-based topic extraction for non-Instagram adapters. |
| 3 | Freshness hardcoded to "fresh" regardless of mention age | S2 | The `freshness` field on every bridge output is set to the literal string `"fresh"`, ignoring the actual publication timestamp of the mention. | Freshness-based filtering and sorting are non-functional. A 6-month-old post is treated identically to one published 5 minutes ago. | Y — Compare `publishedAt` against `Date.now()` and assign freshness buckets (e.g., "fresh" < 24h, "recent" < 7d, "stale" > 7d). | N |
| 4 | Coverage count inconsistent (+1 for comments) | S3 | When counting coverage (total mentions), comments on a post are counted as additional coverage items (+1 each), inflating the total. | Coverage metrics are overstated for posts with many comments. A single viral post with 500 comments reports as 501 coverage items, misleading the user about true reach. | Y — Separate comment counts from mention counts; report them as distinct metrics. | N |
