# Real Collection Connection Status

> Phase 5 산출물 1/4 — 실데이터 수집 파이프라인 연결 현황

## 1. Platform Provider Status

| Platform    | Provider            | API Ready  | Rate Limiter           | Comments                                                               |
| ----------- | ------------------- | ---------- | ---------------------- | ---------------------------------------------------------------------- |
| YouTube     | `YouTubeProvider`   | **YES**    | Token bucket (10k/day) | Fully functional. channels.list, search.list, videos.list              |
| Instagram   | `InstagramProvider` | Scaffolded | No                     | Constructor + stubs only. Needs Instagram Graph API credentials        |
| TikTok      | `TikTokProvider`    | Scaffolded | No                     | Constructor + stubs only. DateRange bug (`start`/`end` vs `from`/`to`) |
| X (Twitter) | `XProvider`         | Scaffolded | No                     | Constructor + stubs only. Needs X API v2 credentials                   |

## 2. Collection Pipeline Architecture

```
┌──────────────────────────────────────────────────────────┐
│ CollectionRunner (orchestrator)                            │
│   ├── PlatformAdapter (bridges @x2/social → repos)        │
│   │     └── withRetry() (exponential backoff per phase)   │
│   ├── CollectionHealthTracker (circuit breaker)            │
│   │     ├── platform-level: 5 failures → open circuit     │
│   │     └── channel-level: 3/5 failures → warn/error log  │
│   ├── CollectionLogEntry[] (in-memory log, max 500)        │
│   └── triggerAnalytics() → direct service dispatch         │
└──────────────────┬───────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │ @x2/social        │
         │ createProvider()   │
         │   → YouTubeProvider│
         │   → Instagram...   │
         │   → TikTok...      │
         │   → X...           │
         └─────────┬─────────┘
                   │
         ┌─────────┴─────────┐
         │ Normalization      │
         │   normalizeChannel │
         │   normalizeContent │
         │   normalizeComment │  (ready, SocialProvider.getComments() 대기)
         │   normalizeMention │
         └─────────┬─────────┘
                   │
         ┌─────────┴─────────┐
         │ Repository Layer   │
         │   channel.update   │
         │   content.upsert   │  (single upsert, DB ID reused for metrics)
         │   content.upsertDailyMetric │
         │   channel.upsertSnapshot    │
         │   comment.bulkCreate        │  (ready, needs getComments())
         │   mention.bulkCreate        │
         └────────────────────┘
```

## 3. Integration Points

### 3.1 CollectionRunner → Phase 4 Repositories

| Runner Method                       | Calls                                                    | Repository                           |
| ----------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| `runWorkspaceCollection()`          | `workspace.findById()`, `workspace.findProjects()`       | WorkspaceRepository                  |
| `buildScopes()`                     | `channel.findByProject({status: "ACTIVE"})`              | ChannelRepository                    |
| `PlatformAdapter.syncChannelInfo()` | `channel.update()`                                       | ChannelRepository                    |
| `PlatformAdapter.syncContents()`    | `content.upsert()` (single call per content)             | ContentRepository                    |
| `PlatformAdapter.collectChannel()`  | `content.upsertDailyMetric()` (reuses DB ID from upsert) | ContentRepository                    |
| `PlatformAdapter.syncComments()`    | `content.findByChannel()`, `comment.bulkCreate()` (TODO) | ContentRepository, CommentRepository |
| `triggerAnalytics()`                | `comment.findUnanalyzed()`                               | CommentRepository                    |

### 3.2 AnalyticsInputBuilder → Analysis Engines

**Direct dispatch mode** (서비스 직접 호출 — `setServices()`로 주입):

| Dispatch Method               | Target Service                                  | How                                    |
| ----------------------------- | ----------------------------------------------- | -------------------------------------- |
| `dispatchCommentAnalysis()`   | `CommentAnalysisService.analyzeComments()`      | Groups by contentId, calls per content |
| `dispatchListeningAnalysis()` | `ListeningAnalysisService.collectMentions()`    | Calls with projectId                   |
| `dispatchIntentAnalysis()`    | `IntentAnalysisService.processIntentAnalysis()` | Iterates pending queries               |
| `dispatchGeoAeoCollection()`  | `GeoAeoService.collectSnapshots()`              | Calls with projectId                   |

**Input building mode** (BullMQ 큐 페이로드 생성):

| Builder Method                 | Output Type                | Source Repository                                 |
| ------------------------------ | -------------------------- | ------------------------------------------------- |
| `buildCommentAnalysisInputs()` | `CommentAnalysisInput[]`   | CommentRepository.findUnanalyzed()                |
| `buildListeningInputs()`       | `ListeningAnalysisInput[]` | MentionRepository.findByProject()                 |
| `buildIntentInputs()`          | `IntentAnalysisInput[]`    | IntentRepository.findQueriesByProject()           |
| `buildGeoAeoInputs()`          | `GeoAeoInput[]`            | AeoRepository.findKeywordsByProject() × 4 engines |

### 3.3 Service Injection Wiring (in `createServices()`)

```typescript
const analyticsInputBuilder = new AnalyticsInputBuilder(repositories, logger);
analyticsInputBuilder.setServices({
  commentAnalyzer: commentAnalysis, // CommentAnalysisService
  listeningCollector: listeningAnalysis, // ListeningAnalysisService
  intentProcessor: intentAnalysis, // IntentAnalysisService
  geoAeoCollector: geoAeo, // GeoAeoService
});
```

## 4. Environment Requirements

| Variable                 | Required For              | Status                             |
| ------------------------ | ------------------------- | ---------------------------------- |
| `YOUTUBE_API_KEY`        | YouTube Data API v3       | Must be set for YouTube collection |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API       | Not yet implemented                |
| `TIKTOK_API_KEY`         | TikTok for Developers API | Not yet implemented                |
| `X_BEARER_TOKEN`         | X API v2                  | Not yet implemented                |

## 5. Files Created/Modified (Phase 5)

| File                                                              | Purpose                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/api/src/services/collection/types.ts`                   | Collection pipeline type definitions                  |
| `packages/api/src/services/collection/normalization.ts`           | Platform data → Prisma-ready normalization            |
| `packages/api/src/services/collection/platform-adapter.ts`        | @x2/social → repository bridge + retry logic          |
| `packages/api/src/services/collection/collection-runner.ts`       | Orchestrator + channel failure tracking + log storage |
| `packages/api/src/services/collection/analytics-input-builder.ts` | Direct dispatch + queue input builder (dual mode)     |
| `packages/api/src/services/collection/collection-health.ts`       | Circuit breaker + health tracking                     |
| `packages/api/src/services/collection/index.ts`                   | Barrel exports                                        |
| `packages/api/src/services/index.ts`                              | Updated factory with service injection wiring         |

## 6. Known Issues & Blockers

1. **YouTube only**: Only YouTube has a complete provider implementation
2. **No BullMQ integration**: Queue payloads can be built but not yet dispatched to BullMQ
3. **Comment collection**: `SocialProvider` interface lacks `getComments()` — `syncComments()` is scaffolded with TODO
4. **`@prisma/client` not generated**: Repository types depend on `prisma generate` being run
5. **Instagram ChannelNotFoundError bug**: Wrong constructor arguments in `packages/social/src/instagram.ts`
6. **TikTok DateRange bug**: Uses `period.start`/`period.end` instead of `period.from`/`period.to`
