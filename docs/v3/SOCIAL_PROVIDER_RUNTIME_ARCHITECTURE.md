# Social Provider Runtime Architecture

> Last updated based on actual source code analysis.
> Source files referenced in this document are relative to the repository root.

## Overview

The social provider system collects real-time mentions from external social platforms
(YouTube, Instagram, TikTok, X/Twitter) through a unified adapter pattern. A central
registry manages adapter lifecycle, connection testing, and status caching, while the
`LiveSocialMentionBridgeService` orchestrates collection across all registered providers.

---

## Core Components

| Component | File | Role |
|-----------|------|------|
| `SocialProviderRegistryService` | `packages/api/src/services/intelligence/social-provider-registry.service.ts` | Central registry for adapter registration, status queries, and bulk fetching |
| `LiveSocialMentionBridgeService` | `packages/api/src/services/intelligence/live-social-mention-bridge.service.ts` | Orchestrates all adapters, computes buzz/topic signals, provides coverage info |
| `YouTubeDataApiAdapter` | `packages/api/src/services/intelligence/youtube-data-api.adapter.ts` | YouTube Data API v3 adapter (CONNECTED) |
| `InstagramGraphApiAdapter` | `packages/api/src/services/intelligence/instagram-graph-api.adapter.ts` | Instagram Graph API adapter (SCAFFOLD) |
| `TikTokResearchApiAdapter` | `packages/api/src/services/intelligence/tiktok-research-api.adapter.ts` | TikTok Research API adapter (SCAFFOLD) |
| `XApiAdapter` | `packages/api/src/services/intelligence/x-api.adapter.ts` | X API v2 adapter (CONNECTED) |

---

## SocialProviderAdapter Interface

Every adapter implements this interface:

```typescript
export interface SocialProviderAdapter {
  readonly config: ProviderConfig;
  isConfigured(): boolean;
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  fetchMentions(keyword: string, options?: {
    maxResults?: number;
    since?: Date;
  }): Promise<ProviderFetchResult>;
}
```

### ProviderConfig

```typescript
export type ProviderConfig = {
  name: string;           // e.g. "youtube", "instagram", "tiktok", "x"
  platform: string;       // e.g. "YOUTUBE", "INSTAGRAM", "TIKTOK", "X"
  requiresApiKey: boolean;
  envKeyName: string;     // Environment variable name for credentials
  authType: "API_KEY" | "OAUTH2" | "BEARER_TOKEN";
  rateLimitPerDay?: number;
  documentation: string;  // URL to official API docs
};
```

### ProviderFetchResult

```typescript
export type ProviderFetchResult = {
  mentions: SocialMention[];
  fetchedAt: string;
  quotaUsed?: number;
  quotaRemaining?: number;
  error?: string;
};
```

### SocialMention

```typescript
export type SocialMention = {
  id: string;
  platform: string;
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  sentiment: string | null;    // null at collection time; filled downstream
  topics: string[];
  publishedAt: string;
  url: string | null;
  engagement: { likes: number; comments: number; shares: number };
};
```

---

## ProviderConnectionStatus

```typescript
export type ProviderConnectionStatus =
  | "CONNECTED"       // Credentials valid, API responding
  | "NOT_CONNECTED"   // No credentials configured
  | "ERROR"           // Credentials set but API call failed
  | "RATE_LIMITED"    // Error message contains "quota" or "rate"
  | "AUTH_EXPIRED";   // Error message contains "auth", "token", or "401"
```

Status classification happens in the `fetchAllMentions` catch block via keyword matching
on the error message string.

---

## Adapter Status Summary

| Adapter | Status | Auth Type | Env Var | Rate Limit |
|---------|--------|-----------|---------|------------|
| YouTube | **CONNECTED** (full API implementation) | API_KEY | `YOUTUBE_API_KEY` | 10,000 units/day |
| Instagram | **SCAFFOLD** (full code, requires Business account + OAuth token) | OAUTH2 | `INSTAGRAM_ACCESS_TOKEN` | 4,800 calls/day |
| TikTok | **SCAFFOLD** (full code, requires Research API approval) | BEARER_TOKEN | `TIKTOK_ACCESS_TOKEN` | 144,000 req/day |
| X | **CONNECTED** (full API implementation, requires Basic tier $100/mo) | BEARER_TOKEN | `X_API_BEARER_TOKEN` | ~28,800 req/day |

**Note:** "CONNECTED" means the adapter code is complete and will work when the correct
API key is provided. "SCAFFOLD" means the code is complete but the external prerequisite
(account approval, business account setup) is more involved.

---

## SocialProviderRegistryService

### Registration

The registry uses a `Map<string, SocialProviderAdapter>`. Adapters are registered by name:

```typescript
registry.register(new YouTubeDataApiAdapter());
// Internally: this.adapters.set(adapter.config.name, adapter);
```

### Status Caching (5-Minute TTL)

```typescript
private statusCache = new Map<string, {
  status: ProviderConnectionStatus;
  lastChecked: Date;
  error?: string;
}>();

const staleThreshold = 5 * 60 * 1000; // 5 minutes
```

When `getAllStatuses()` is called:
1. If `!adapter.isConfigured()` => return `NOT_CONNECTED` immediately (no cache).
2. If cache entry exists and is less than 5 minutes old => return cached status.
3. Otherwise => call `adapter.testConnection()`, cache the result.

### fetchAllMentions (Sequential)

```typescript
async fetchAllMentions(keyword, options): Promise<{
  mentions: SocialMention[];
  statuses: ProviderStatus[];
  warnings: string[];
}>
```

Key behaviors:
- Iterates adapters **sequentially** with a `for...of` loop (not `Promise.allSettled`).
- Skips unconfigured adapters with `NOT_CONNECTED` status.
- Catches errors per adapter and classifies them into `RATE_LIMITED`, `AUTH_EXPIRED`, or `ERROR`.
- Sorts all collected mentions by `publishedAt` descending.
- Caps output at **100 mentions** (`allMentions.slice(0, 100)`).

---

## LiveSocialMentionBridgeService

### Constructor

Instantiates a fresh `SocialProviderRegistryService` and registers all four adapters:

```typescript
constructor() {
  this.registry = new SocialProviderRegistryService();
  this.registry.register(new YouTubeDataApiAdapter());
  this.registry.register(new InstagramGraphApiAdapter());
  this.registry.register(new TikTokResearchApiAdapter());
  this.registry.register(new XApiAdapter());
}
```

### collectLiveMentions Flow

```
1. registry.fetchAllMentions(keyword, { maxResults: 20 })
2. Convert registry mentions to LiveMention[]
3. Integrate existingComments as pseudo-mentions (platform: "COMMENT")
4. computeTopicSignals(allMentions) -> TopicSignal[]
5. computeBuzzLevel(count) -> "HIGH" | "MODERATE" | "LOW" | "NONE"
6. Compute coverage { connectedProviders, totalProviders, isPartial }
7. Sort by publishedAt desc, cap at 100
8. Return LiveMentionResult
```

### Coverage Tracking

```typescript
coverage: {
  connectedProviders: number;   // count of adapters with isAvailable=true + comments
  totalProviders: number;       // registry.getProviderNames().length + 1 (for comments)
  isPartial: boolean;           // connectedCount < totalProviders && connectedCount > 0
}
```

The `+1` accounts for the "comments" pseudo-provider that integrates existing comment data.

### Buzz Level Thresholds

| Mention Count | Buzz Level |
|---------------|------------|
| >= 50 | HIGH |
| >= 20 | MODERATE |
| >= 1 | LOW |
| 0 | NONE |

### Topic Signals

Topic signals are computed by aggregating `mention.topics` across all mentions.
Each topic gets a `sentimentBreakdown` (positive/neutral/negative counts). The `trend`
field is always `"STABLE"` and `isNew` is always `false` in the current implementation
(no historical comparison yet).

### toSocialCommentData

Converts `LiveMentionResult` into the `SocialCommentData` shape expected by the
signal fusion pipeline. Extracts:
- `sentiment` aggregate with top negative/positive topics
- `commentTopics` from topic signals
- `recentMentions` (first 10, truncated to 200 chars)

---

## Environment Variables

| Variable | Used By | Required For |
|----------|---------|-------------|
| `YOUTUBE_API_KEY` | YouTubeDataApiAdapter | YouTube Data API v3 access |
| `INSTAGRAM_ACCESS_TOKEN` | InstagramGraphApiAdapter | Instagram Graph API (Meta Business Suite) |
| `TIKTOK_ACCESS_TOKEN` | TikTokResearchApiAdapter | TikTok Research API |
| `X_API_BEARER_TOKEN` | XApiAdapter | X API v2 (Basic tier+) |

Each adapter reads its env var in the constructor and checks for placeholder values
(e.g., `"your-youtube-api-key"`) in `isConfigured()`.

---

## Router Integration

The `intelligenceRouter` in `packages/api/src/routers/intelligence.ts` exposes:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `intelligence.liveMentions` | query | Collects live mentions, saves daily snapshot |
| `intelligence.providerStatuses` | query | Returns status of all 4 providers |

The `liveMentionService` is instantiated as a module-level singleton:

```typescript
const liveMentionService = new LiveSocialMentionBridgeService();
```

---

## Data Flow Diagram

```
User Request (keyword)
  |
  v
intelligenceRouter.liveMentions
  |
  v
LiveSocialMentionBridgeService.collectLiveMentions()
  |
  v
SocialProviderRegistryService.fetchAllMentions()
  |
  +---> YouTubeDataApiAdapter.fetchMentions()    (if configured)
  +---> InstagramGraphApiAdapter.fetchMentions()  (if configured)
  +---> TikTokResearchApiAdapter.fetchMentions()  (if configured)
  +---> XApiAdapter.fetchMentions()               (if configured)
  |
  v
Merge + Sort + Cap at 100
  |
  v
Integrate existing comments as pseudo-mentions
  |
  v
Compute topicSignals, buzzLevel, coverage
  |
  v
Save SocialMentionSnapshot (daily, non-blocking try-catch)
  |
  v
Return LiveMentionResult
```
