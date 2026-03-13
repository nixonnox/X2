# Domain Implementation Plan

> Per-domain breakdown of models, reusable code, new code, routers, priorities, and dependencies.
> Reference: [REPOSITORY_SERVICE_MAP.md](./REPOSITORY_SERVICE_MAP.md) for detailed method signatures and service specs.

---

## Domain 1: Channel Domain

**Priority: HIGH (foundation for all analysis paths)**

### Models

- `Channel` — Core entity, linked to workspace and platform
- `ChannelConnection` — OAuth/API connection state per platform
- `ChannelSnapshot` — Point-in-time metrics capture
- `Content` — Individual posts/videos across platforms
- `ContentMetricDaily` — Daily metric rollups per content
- `CompetitorChannel` — Competitor tracking relationships

### Existing Reusable Code

| Location                         | What It Does                    | Reuse Strategy                                                   |
| -------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `packages/social/src/youtube/`   | YouTube Data API connector      | Direct import — wrap in collection orchestration                 |
| `packages/social/src/instagram/` | Instagram Graph API connector   | Direct import — wrap in collection orchestration                 |
| `packages/social/src/tiktok/`    | TikTok API connector            | Direct import — wrap in collection orchestration                 |
| `packages/social/src/x/`         | X/Twitter API connector         | Direct import — wrap in collection orchestration                 |
| `apps/web/src/lib/channels/url/` | URL parsing, platform detection | Move to `packages/social/src/utils/url-parser.ts` for shared use |

### New Code Needed

| Component                | Path                                                             | Notes                                             |
| ------------------------ | ---------------------------------------------------------------- | ------------------------------------------------- |
| `ChannelRepository`      | `packages/api/src/repositories/channel.repository.ts`            | Wraps Channel, ChannelConnection, ChannelSnapshot |
| `ContentRepository`      | `packages/api/src/repositories/content.repository.ts`            | Wraps Content, ContentMetricDaily                 |
| `ChannelAnalysisService` | `packages/api/src/services/channels/channel-analysis.service.ts` | Metrics aggregation, snapshot comparison          |
| `CompetitorService`      | `packages/api/src/services/channels/competitor.service.ts`       | Gap analysis, benchmarking                        |

### tRPC Routers

| Router       | Status | Action                                                          |
| ------------ | ------ | --------------------------------------------------------------- |
| `channel.ts` | Exists | Refactor to use ChannelRepository + ChannelAnalysisService      |
| `content.ts` | New    | Create with ContentRepository access via ChannelAnalysisService |

### Dependencies

- None (this is a foundational domain)

---

## Domain 2: Comment Domain

**Priority: HIGH (Path 3 — Comment Intelligence core)**

### Models

- `Comment` — Raw comment data linked to Content
- `CommentAnalysis` — LLM-generated sentiment, topics, intent per comment
- `FAQCandidate` — Frequently asked questions extracted from comments
- `RiskSignal` — Brand risk / crisis signals detected from comments

### Existing Reusable Code

| Location        | What It Does                              | Reuse Strategy                                         |
| --------------- | ----------------------------------------- | ------------------------------------------------------ |
| None applicable | Current analyzers are keyword-based stubs | Full rebuild required with LLM-based analysis pipeline |

### New Code Needed

| Component                | Path                                                             | Notes                                               |
| ------------------------ | ---------------------------------------------------------------- | --------------------------------------------------- |
| `CommentRepository`      | `packages/api/src/repositories/comment.repository.ts`            | Wraps Comment, CommentAnalysis                      |
| `FAQCandidateRepository` | `packages/api/src/repositories/faq-candidate.repository.ts`      | Wraps FAQCandidate                                  |
| `RiskSignalRepository`   | `packages/api/src/repositories/risk-signal.repository.ts`        | Wraps RiskSignal                                    |
| `CommentAnalysisService` | `packages/api/src/services/comments/comment-analysis.service.ts` | Orchestrates LLM analysis, dispatches to FAQ + Risk |
| `FAQService`             | `packages/api/src/services/comments/faq.service.ts`              | FAQ CRUD, clustering, answer suggestions            |
| `RiskSignalService`      | `packages/api/src/services/comments/risk-signal.service.ts`      | Risk CRUD, severity classification, escalation      |

### tRPC Routers

| Router       | Status | Action                                                    |
| ------------ | ------ | --------------------------------------------------------- |
| `comment.ts` | New    | Comment listing, analysis summary, trigger batch analysis |
| `faq.ts`     | New    | FAQ candidate CRUD, clustering trigger                    |
| `risk.ts`    | New    | Risk signal CRUD, dashboard, escalation                   |

### Dependencies

- **Channel Domain** — Comments belong to Content, which belongs to Channel

---

## Domain 3: Listening Domain

**Priority: MEDIUM (Path 2 — Social Listening core)**

### Models

- `Keyword` — Tracked keywords per workspace
- `KeywordMetricDaily` — Daily volume, sentiment, reach metrics per keyword
- `RawSocialMention` — Individual mentions found across platforms
- `TrendKeywordAnalytics` — Trend velocity, emerging topic scores

### Existing Reusable Code

| Location                          | What It Does                                     | Reuse Strategy                                                                            |
| --------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `apps/web/src/lib/intent-engine/` | Keyword analysis structure, mock data generators | Extract interfaces and type definitions; replace mock implementations with real API calls |

### New Code Needed

| Component                  | Path                                                                | Notes                                |
| -------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `KeywordRepository`        | `packages/api/src/repositories/keyword.repository.ts`               | Wraps Keyword, KeywordMetricDaily    |
| `MentionRepository`        | `packages/api/src/repositories/mention.repository.ts`               | Wraps RawSocialMention               |
| `TrendAnalyticsRepository` | `packages/api/src/repositories/trend-analytics.repository.ts`       | Wraps TrendKeywordAnalytics          |
| `ListeningAnalysisService` | `packages/api/src/services/listening/listening-analysis.service.ts` | Keyword tracking, mention collection |
| `TrendService`             | `packages/api/src/services/listening/trend.service.ts`              | Velocity scoring, emerging topics    |

### tRPC Routers

| Router       | Status | Action                                   |
| ------------ | ------ | ---------------------------------------- |
| `keyword.ts` | New    | Keyword CRUD, tracking toggle, metrics   |
| `mention.ts` | New    | Mention listing, volume/sentiment charts |

### Dependencies

- None (independent entry point — Path 2 starts here)

---

## Domain 4: Intent Domain

**Priority: MEDIUM**

### Models

- `IntentQuery` — Search queries analyzed for intent
- `IntentKeywordResult` — Intent classification results per keyword

### Existing Reusable Code

| Location                          | What It Does                                         | Reuse Strategy                                                                           |
| --------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `apps/web/src/lib/intent-engine/` | Intent classification types, UI integration patterns | Reuse type definitions and interfaces; replace mock API with real LLM + search API calls |
| `apps/web/src/app/api/intent/`    | REST API route for intent analysis                   | Replace with tRPC `intentRouter`; migrate endpoint logic to `IntentAnalysisService`      |

### New Code Needed

| Component               | Path                                                          | Notes                                     |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------------- |
| `IntentRepository`      | `packages/api/src/repositories/intent.repository.ts`          | Wraps IntentQuery, IntentKeywordResult    |
| `IntentAnalysisService` | `packages/api/src/services/intent/intent-analysis.service.ts` | Classification, gap scoring, distribution |

### tRPC Routers

| Router      | Status              | Action                                      |
| ----------- | ------------------- | ------------------------------------------- |
| `intent.ts` | New (replaces REST) | Analyze queries, get gaps, get distribution |

### Dependencies

- **Listening Domain** — Keywords from Listening feed into Intent analysis

---

## Domain 5: GEO/AEO Domain

**Priority: MEDIUM-LOW (Phase 4 feature)**

### Models

- `AeoKeyword` — Keywords tracked for AI engine optimization
- `AeoSnapshot` — Point-in-time visibility scores across AI engines
- `CitationReadyReportSource` — Sources optimized for AI citation

### Existing Reusable Code

| Location        | What It Does                       | Reuse Strategy                                                                  |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| None applicable | No existing GEO/AEO implementation | Build from scratch per [GEO_AEO_EXTENSION_PLAN.md](./GEO_AEO_EXTENSION_PLAN.md) |

### New Code Needed

| Component                  | Path                                                          | Notes                                   |
| -------------------------- | ------------------------------------------------------------- | --------------------------------------- |
| `AeoRepository`            | `packages/api/src/repositories/aeo.repository.ts`             | Wraps AeoKeyword, AeoSnapshot           |
| `CitationSourceRepository` | `packages/api/src/repositories/citation-source.repository.ts` | Wraps CitationReadyReportSource         |
| `GeoAeoService`            | `packages/api/src/services/geo/geo-aeo.service.ts`            | Keyword management, snapshot collection |
| `CitationService`          | `packages/api/src/services/geo/citation.service.ts`           | Source management, visibility tracking  |

### tRPC Routers

| Router        | Status | Action                                  |
| ------------- | ------ | --------------------------------------- |
| `aeo.ts`      | New    | AEO keyword tracking, visibility charts |
| `citation.ts` | New    | Citation source CRUD, ranking           |

### Dependencies

- **Intent Domain** — Keywords and intent data feed into AEO keyword selection

---

## Domain 6: Action / Report Domain

**Priority: HIGH (core output — all analysis paths converge here)**

### Models

- `InsightReport` — Generated insight reports
- `InsightAction` — Actionable recommendations
- `ReportSection` — Individual report sections
- `EvidenceAsset` — Charts, screenshots, data references
- `ReportTemplate` — Reusable report structures

### Existing Reusable Code

| Location                     | What It Does                                | Reuse Strategy                                                                                       |
| ---------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/insights/` | Insight card rendering, action status types | Reuse UI component structure and status enums; replace hardcoded content with service-generated data |

### New Code Needed

| Component                     | Path                                                                 | Notes                                              |
| ----------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `ReportRepository`            | `packages/api/src/repositories/report.repository.ts`                 | Wraps InsightReport, ReportSection, ReportTemplate |
| `InsightActionRepository`     | `packages/api/src/repositories/insight-action.repository.ts`         | Wraps InsightAction                                |
| `EvidenceAssetRepository`     | `packages/api/src/repositories/evidence-asset.repository.ts`         | Wraps EvidenceAsset                                |
| `ReportService`               | `packages/api/src/services/reports/report.service.ts`                | Generation, section management, publishing         |
| `EvidenceService`             | `packages/api/src/services/reports/evidence.service.ts`              | Asset linking, data source resolution              |
| `ActionRecommendationService` | `packages/api/src/services/actions/action-recommendation.service.ts` | Cross-engine synthesis                             |

### tRPC Routers

| Router      | Status | Action                                            |
| ----------- | ------ | ------------------------------------------------- |
| `report.ts` | New    | Report CRUD, section management, publish          |
| `action.ts` | New    | Action listing, status updates, synthesis trigger |

### Dependencies

- **All analysis domains** — Channel, Comment, Listening, Intent feed data into reports and actions

---

## Domain 7: Influencer / Campaign Domain

**Priority: LOW (Execute stage — after Insight generation)**

### Models

- `InfluencerProfile` — Influencer profiles with audience metrics
- `Campaign` — Marketing campaigns
- `CampaignCreator` — Creator assignments to campaigns
- `CampaignContent` — Content pieces within campaigns
- `CampaignMetric` — Aggregated campaign metrics
- `PostMeasurement` — Individual post performance measurements
- `RoiCalculation` — ROI computation results

### Existing Reusable Code

| Location    | What It Does               | Reuse Strategy                             |
| ----------- | -------------------------- | ------------------------------------------ |
| Schema only | Prisma models are complete | No service code exists; build from scratch |

### New Code Needed

| Component                    | Path                                                                   | Notes                                  |
| ---------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `InfluencerRepository`       | `packages/api/src/repositories/influencer.repository.ts`               | Wraps InfluencerProfile                |
| `CampaignRepository`         | `packages/api/src/repositories/campaign.repository.ts`                 | Wraps Campaign + 4 related models      |
| `InfluencerExecutionService` | `packages/api/src/services/influencer/influencer-execution.service.ts` | Profile management, search             |
| `CampaignService`            | `packages/api/src/services/influencer/campaign.service.ts`             | Campaign lifecycle, creator assignment |
| `CampaignPerformanceService` | `packages/api/src/services/influencer/campaign-performance.service.ts` | Measurement, ROI calculation           |

### tRPC Routers

| Router          | Status | Action                                 |
| --------------- | ------ | -------------------------------------- |
| `influencer.ts` | New    | Profile search, CRUD, metric refresh   |
| `campaign.ts`   | New    | Campaign CRUD, creator management, ROI |

### Dependencies

- **Report Domain** — Actions from reports trigger campaign creation

---

## Domain 8: Workspace / Subscription / Usage Domain

**Priority: HIGH (foundational — all operations require workspace context)**

### Models

- `Workspace` — Tenant container
- `WorkspaceMember` — User-workspace membership with roles
- `Project` — Workspace sub-grouping
- `Subscription` — Plan and billing state
- `UsageMetric` — Metered usage tracking

### Existing Reusable Code

| Location                 | What It Does                                              | Reuse Strategy                                                                         |
| ------------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| tRPC `channel.ts` router | Workspace-scoped query pattern (`where: { workspaceId }`) | Extract pattern into repository base class; apply to all workspace-scoped repositories |
| `packages/auth/`         | Auth.js v5 session with user ID                           | Session → workspace resolution needed in middleware                                    |

### New Code Needed

| Component                | Path                                                              | Notes                                     |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------- |
| `WorkspaceRepository`    | `packages/api/src/repositories/workspace.repository.ts`           | Wraps Workspace, WorkspaceMember, Project |
| `UsageRepository`        | `packages/api/src/repositories/usage.repository.ts`               | Wraps UsageMetric, Subscription           |
| `WorkspaceAccessService` | `packages/api/src/services/workspace/workspace-access.service.ts` | Plan limits, feature flags                |
| `UsageService`           | `packages/api/src/services/workspace/usage.service.ts`            | Usage tracking, quota checks              |

### tRPC Routers

| Router         | Status | Action                                              |
| -------------- | ------ | --------------------------------------------------- |
| `workspace.ts` | Extend | Add member management, plan checks, usage dashboard |

### Dependencies

- None (this is a foundational domain)

### Notes

- Every protected tRPC procedure must resolve `workspaceId` from session context
- Consider a `workspaceScoped` middleware that injects `workspaceId` into context
- Quota checks should be non-blocking for read operations, blocking for write/create operations

---

## Domain 9: Ops / Admin Domain

**Priority: MEDIUM (needed for production operation)**

### Models

- `ScheduledJob` — Cron/recurring job definitions and execution history
- `Notification` — In-app notifications (risk escalations, job failures, quota warnings)
- `Platform` — Platform registry (YouTube, Instagram, TikTok, X)

### Existing Reusable Code

| Location                       | What It Does                | Reuse Strategy                                                     |
| ------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| `apps/web/src/app/api/health/` | Basic health check endpoint | Extend with DB connectivity, job queue health, platform API status |

### New Code Needed

| Component                        | Path                                                                | Notes                                      |
| -------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `ScheduledJobRepository`         | `packages/api/src/repositories/scheduled-job.repository.ts`         | Wraps ScheduledJob                         |
| `NotificationRepository`         | `packages/api/src/repositories/notification.repository.ts`          | Wraps Notification                         |
| `OpsMonitoringService`           | `packages/api/src/services/ops/ops-monitoring.service.ts`           | Job monitoring, health, retries            |
| `CollectionOrchestrationService` | `packages/api/src/services/ops/collection-orchestration.service.ts` | Pipeline scheduling, platform coordination |

### tRPC Routers

| Router            | Status | Action                                        |
| ----------------- | ------ | --------------------------------------------- |
| `ops.ts`          | New    | System health, job listing, retry trigger     |
| `notification.ts` | New    | Notification listing, mark read, unread count |

### Dependencies

- **All domains** — Monitors jobs and health across the entire system

### Notes

- `CollectionOrchestrationService` is the main entry point for all data collection
- It coordinates `packages/social/*` connectors via `ScheduledJob` records
- Platform API rate limits are managed here, not in individual services

---

## Implementation Order Summary

```
Phase 1 ─ Foundation
├── Workspace Domain (tenant context, access control)
└── Channel Domain (Path 1 core, connector integration)

Phase 2 ─ Analysis Cores
├── Comment Domain (Path 3 — Comment Intelligence)
└── Listening Domain (Path 2 — Social Listening)

Phase 3 ─ Output + Operations
├── Report Domain (all paths converge here)
└── Ops Domain (production readiness, job scheduling)

Phase 4 ─ Advanced Analysis
├── Intent Domain (search intent from listening data)
└── GEO/AEO Domain (AI engine visibility)

Phase 5 ─ Execution
└── Influencer / Campaign Domain (action execution)
```

### Phase Dependency Graph

```
Phase 1: Workspace + Channel
    │
    ├──────────────────┐
    ▼                  ▼
Phase 2a: Comment    Phase 2b: Listening
    │                  │
    │    ┌─────────────┤
    │    │             ▼
    │    │         Phase 4a: Intent
    │    │             │
    │    │             ▼
    │    │         Phase 4b: GEO/AEO
    │    │
    ▼    ▼
Phase 3a: Report ◄── (all analysis domains feed in)
    │
    ▼
Phase 3b: Ops (can start in parallel with Phase 3a)
    │
    ▼
Phase 5: Influencer / Campaign
```

### Estimated Scope Per Phase

| Phase     | Repositories | Services | Routers | Estimated Files |
| --------- | :----------: | :------: | :-----: | :-------------: |
| 1         |      4       |    4     |    2    |       ~12       |
| 2         |      5       |    5     |    5    |       ~16       |
| 3         |      5       |    5     |    4    |       ~16       |
| 4         |      3       |    3     |    3    |       ~10       |
| 5         |      3       |    3     |    2    |       ~10       |
| **Total** |    **20**    |  **20**  | **16**  |     **~64**     |

### Shared Infrastructure (build before Phase 1)

Before implementing any domain, create these shared building blocks:

1. **Repository base class** — `packages/api/src/repositories/base.repository.ts`
   - Common CRUD methods, pagination helper, workspace scoping
   - Transaction support via `prisma.$transaction`

2. **Service base class** — `packages/api/src/services/base.service.ts`
   - Logger injection, trace ID propagation
   - Error wrapping with domain-specific error types

3. **tRPC middleware** — `packages/api/src/middleware/workspace.ts`
   - Session → workspace resolution
   - Workspace-scoped context injection

4. **Shared types** — `packages/api/src/types/`
   - `pagination.ts` — Cursor/offset pagination input/output
   - `date-range.ts` — Date range filter type
   - `sort.ts` — Sort field/direction type
