# Phase 5 Implementation Notes

> Phase 5 산출물 4/4 — 구현 결정 사항 및 기술 노트

## 1. Architecture Decisions

### 1.1 Code Placement

**Decision**: `packages/api/src/services/collection/` (inside the api package)

**Rationale**:

- Collection pipeline is a service-layer concern that orchestrates between `@x2/social` providers and Phase 4 repositories
- Keeps the same DI pattern (Repositories + Logger injection) as all other services
- No need for a separate package — the collection pipeline is consumed only by services/routers within `@x2/api`

### 1.2 @x2/types Dependency

**Decision**: Define local type aliases in `collection/types.ts` instead of importing from `@x2/types`

**Rationale**:

- `@x2/api` package.json does not list `@x2/types` as a dependency
- Local `SupportedPlatform` type is identical to `SocialPlatform` — cast with `as any` at the bridge point
- Avoids adding new cross-package dependency for 1 type alias

### 1.3 Existing Code Reuse

| Existing Code                                  | Decision               | Rationale                                                                                                           |
| ---------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/collection/types.ts`         | **Reference only**     | Frontend-specific (display labels, Korean UI text). Our types are Prisma-aligned                                    |
| `apps/web/src/lib/collection/normalization.ts` | **Rewritten**          | Original handles raw YouTube JSON; ours normalizes `@x2/social` provider output (typed `ChannelInfo`/`ContentInfo`) |
| `apps/web/src/lib/collection/registry.ts`      | **Not used**           | ConnectorRegistry pattern replaced by `createProvider()` factory from `@x2/social`                                  |
| `apps/web/src/lib/collection/logs.ts`          | **Pattern referenced** | In-memory log tracking concept adopted in `CollectionRunner`                                                        |
| `packages/social/src/`                         | **Directly consumed**  | `createProvider()`, error classes, `SocialProvider` interface                                                       |

### 1.4 Analytics Engine Connection

**Decision**: Dual-mode `AnalyticsInputBuilder` — direct dispatch + queue input building

**Rationale**:

- Phase 4 분석 서비스들 (`CommentAnalysisService`, `ListeningAnalysisService`, etc.)은 각각 자체적으로 repository를 조회하는 self-contained 구조
- Builder가 typed input을 만들어도 서비스가 그 타입을 소비하는 인터페이스가 없음
- 해결: `setServices()`로 서비스를 주입받아 직접 호출하는 dispatch 모드 추가
- BullMQ 연동 시에는 input building 모드로 큐 페이로드 생성 가능 (dual-mode)

### 1.5 In-Memory State

| State            | Storage                             | Reset On Restart | Migration Path |
| ---------------- | ----------------------------------- | ---------------- | -------------- |
| Circuit breaker  | `CollectionHealthTracker` (Map)     | Yes              | Redis or DB    |
| Channel failures | `CollectionRunner` (Map)            | Yes              | DB counter     |
| Collection logs  | `CollectionRunner` (Array, max 500) | Yes              | DB table       |

## 2. Implementation Details

### 2.1 File Structure

```
packages/api/src/services/collection/
├── types.ts                    # Pipeline type definitions + retry policy
├── normalization.ts            # Platform → Prisma normalization (pure functions)
├── platform-adapter.ts         # @x2/social → repository bridge + withRetry()
├── collection-runner.ts        # Orchestrator + channel tracking + log storage
├── analytics-input-builder.ts  # Dual-mode: direct dispatch + queue input builder
├── collection-health.ts        # Circuit breaker + health tracking + retry delay calc
└── index.ts                    # Barrel exports
```

### 2.2 Dependency Graph

```
CollectionRunner
  ├── PlatformAdapter
  │     ├── @x2/social (createProvider, error classes)
  │     ├── normalization (normalizeChannel, normalizeContent)
  │     ├── CollectionHealthTracker (retry delay calculation)
  │     └── Repositories (channel, content, comment)
  ├── CollectionHealthTracker (circuit breaker state)
  ├── channelFailures Map (per-channel failure tracking)
  ├── logs Array (CollectionLogEntry[])
  └── triggerAnalytics() → comment.findUnanalyzed()

AnalyticsInputBuilder (separate, optional)
  ├── Injected services (CommentAnalysis, Listening, Intent, GeoAeo)
  └── Repositories (comment, mention, intent, aeo)
```

### 2.3 Service Factory Integration

```typescript
// createServices() in packages/api/src/services/index.ts
const commentAnalysis = new CommentAnalysisService(repositories, logger);
const listeningAnalysis = new ListeningAnalysisService(repositories, logger);
const intentAnalysis = new IntentAnalysisService(repositories, logger);
const geoAeo = new GeoAeoService(repositories, logger);

const analyticsInputBuilder = new AnalyticsInputBuilder(repositories, logger);
analyticsInputBuilder.setServices({
  commentAnalyzer: commentAnalysis,
  listeningCollector: listeningAnalysis,
  intentProcessor: intentAnalysis,
  geoAeoCollector: geoAeo,
});
```

## 3. What Works End-to-End (YouTube)

```
1. CollectionRunner.runWorkspaceCollection(workspaceId, "CONTENT_SYNC")
2. → workspace.findProjects() → channel.findByProject({status: "ACTIVE"})
3. → For each channel:
   a. Check circuit breaker → skip if open
   b. PlatformAdapter.collectChannel():
      Phase 1: syncChannelInfo() [with retry]
        → YouTubeProvider.getChannelInfo() → normalizeChannel() → channel.update()
      Phase 2: syncContents() [with retry]
        → YouTubeProvider.getContents() → normalizeContent() → content.upsert()
        → Returns DB IDs for metric recording (no double upsert)
      Phase 3: Record daily metrics
        → content.upsertDailyMetric() using DB ID from Phase 2
      Phase 4: syncComments() [with retry] — currently logs "skipped"
      Phase 5: channel.upsertSnapshot()
      Phase 6: channel.update({ lastSyncedAt })
   c. Record health: platform success/failure + channel failure count
   d. Record CollectionLogEntry (success/partial/failed)
4. → triggerAnalytics(): comment.findUnanalyzed() → log count
5. → Return CollectionRunResult with per-channel metrics + totals
```

## 4. What's Stubbed / TODO

| Item                          | Status         | Blocker                                          |
| ----------------------------- | -------------- | ------------------------------------------------ |
| YouTube channel info sync     | **Working**    | None                                             |
| YouTube content sync          | **Working**    | `YOUTUBE_API_KEY` required                       |
| YouTube content daily metrics | **Working**    | Reuses upsert DB ID (no double call)             |
| YouTube comment collection    | **Scaffolded** | `SocialProvider` interface lacks `getComments()` |
| Instagram/TikTok/X collection | **Scaffolded** | Providers not implemented in @x2/social          |
| Retry logic                   | **Working**    | Exponential backoff in `withRetry()`             |
| Circuit breaker               | **Working**    | In-memory, resets on restart                     |
| Channel failure tracking      | **Working**    | In-memory, logs at 3/5 threshold                 |
| Collection logging            | **Working**    | In-memory, max 500 entries                       |
| Direct analytics dispatch     | **Working**    | Services injected via `setServices()`            |
| BullMQ queue integration      | **TODO**       | `@x2/queue` package is empty                     |
| Persistent health tracking    | **TODO**       | Currently in-memory only                         |

## 5. Review Fixes Applied

문서-코드 정합성 리뷰 후 수정된 항목:

| Issue                                                       | Fix                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| P1: `normalizeContent()` + `content.upsert()` 이중 호출     | `syncContents()`에서 단일 upsert 후 DB ID 보존, 별도 루프에서 `upsertDailyMetric()`                |
| P2: 댓글 수집 분기 없음                                     | `syncComments()` 메서드 추가, `"comments"` type 처리 분기 추가 (TODO: getComments API)             |
| P3: 재시도 로직 미구현                                      | `withRetry()` 메서드 구현, 각 수집 phase를 retry로 래핑, `isRetryable()` 판정                      |
| P4: `CollectionLogEntry` 미사용                             | `CollectionRunner.recordLog()`에서 생성·저장, `getRecentLogs()`/`getLogsByFilter()` 조회           |
| P5: `runSingleChannel()` circuit breaker bypass 의도 불명확 | 코드 주석 추가: "Intentionally bypasses circuit breaker — used for manual recovery"                |
| P6: 채널 레벨 실패 추적 없음                                | `channelFailures` Map 추가, 3회/5회 연속 실패 시 WARN/ERROR 로그                                   |
| P7: Builder 출력과 Service 입력 미연결                      | `setServices()` 주입 + `dispatchXxx()` 직접 호출 모드 추가, `buildXxx()` 는 큐 페이로드용으로 유지 |
| P8: partial 상태 판정 없음                                  | `channelUpdated \|\| newContentCount > 0 \|\| newCommentCount > 0` 조건으로 partial 분류           |

## 6. Known Bugs in Dependencies

| Bug                            | Location                                       | Impact                                                          | Fix                              |
| ------------------------------ | ---------------------------------------------- | --------------------------------------------------------------- | -------------------------------- |
| TikTok DateRange               | `packages/social/src/tiktok.ts:171-172`        | `period.start`/`period.end` should be `period.from`/`period.to` | Change to match `DateRange` type |
| Instagram ChannelNotFoundError | `packages/social/src/instagram.ts:210`         | Wrong constructor args (3 instead of 2)                         | Fix constructor call             |
| Instagram errors               | `packages/social/src/instagram.ts:339,344,353` | Various argument count mismatches                               | Fix constructor/method calls     |

## 7. Migration Path

### Phase 5.1 (Current) — YouTube End-to-End ✅

- [x] Collection pipeline architecture
- [x] Normalization layer (single upsert, no duplication)
- [x] Platform adapter with retry logic
- [x] Health tracking + circuit breaker
- [x] Channel-level failure tracking + collection logging
- [x] Analytics direct dispatch via service injection
- [x] Comment collection phase scaffolded
- [x] TypeScript compilation clean (0 collection errors)

### Phase 5.2 (Next) — Comment Pipeline

- [ ] Add `getComments()` to `SocialProvider` interface
- [ ] Implement YouTube commentThreads API in `YouTubeProvider`
- [ ] Wire `normalizeYouTubeComment()` through `PlatformAdapter.syncComments()`
- [ ] Connect to `CommentRepository.bulkCreate()`

### Phase 5.3 (Future) — Multi-Platform

- [ ] Complete Instagram provider (fix ChannelNotFoundError bug first)
- [ ] Complete TikTok provider (fix DateRange bug first)
- [ ] Complete X provider
- [ ] Add platform-specific normalization for each

### Phase 5.4 (Future) — Queue & Scheduling

- [ ] Implement BullMQ in `@x2/queue`
- [ ] Replace direct dispatch with queue-based processing for scale
- [ ] Connect ScheduledJob → CollectionRunner
- [ ] Add persistent health tracking (Redis or DB)
