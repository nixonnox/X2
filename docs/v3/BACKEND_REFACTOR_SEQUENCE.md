# BACKEND_REFACTOR_SEQUENCE — Phased Backend Restructuring Plan

> Created: 2026-03-10
> Scope: Transition from direct Prisma calls in tRPC routers to repository/service architecture
> Current state: Direct `prisma.xxx.findMany()` in tRPC routers, in-memory mock services in `apps/web/src/lib/`
> Target state: `packages/api/src/repositories/` + `packages/api/src/services/` layered architecture

---

## Architecture Overview

```
tRPC Router (thin controller)
  │
  ├─→ Service (business logic, orchestration)
  │     │
  │     ├─→ Repository (data access, Prisma calls)
  │     ├─→ External Provider (packages/social, packages/ai)
  │     └─→ Queue (packages/queue — BullMQ)
  │
  └─→ Middleware (auth, workspace limits, rate limiting)
```

**Principles:**

- Routers stay thin — validation + delegation only
- Services own business logic and cross-repository orchestration
- Repositories are the only layer that touches Prisma
- Each layer returns typed results (never raw Prisma types to routers)

---

## Phase R-1: Foundation Layer (Do First)

> Establish the patterns that all subsequent phases build on. No business logic yet — just infrastructure.

### What to build

#### 1.1 Repository base class

**File:** `packages/api/src/repositories/base.repository.ts`

```typescript
// Abstract base with common CRUD patterns
// - findById, findMany (with pagination), create, update, delete
// - Transaction support (accept PrismaClient or tx)
// - Consistent error wrapping
```

#### 1.2 Service result types

**File:** `packages/api/src/types/service-result.ts`

```typescript
// ServiceResult<T> = { success: true, data: T } | { success: false, error: ServiceError }
// ServiceError = { code: string, message: string, details?: unknown }
// Pagination types: PaginatedResult<T>, PaginationInput
```

#### 1.3 Logger utility

**File:** `packages/api/src/utils/logger.ts`

```typescript
// Structured logger wrapping console or pino
// - Context-aware (service name, request ID)
// - Log levels: debug, info, warn, error
```

#### 1.4 Core model repositories

| File                                   | Model                     | Key Methods                                                 |
| -------------------------------------- | ------------------------- | ----------------------------------------------------------- |
| `repositories/channel.repository.ts`   | Channel                   | findByWorkspace, findByPlatform, findWithSnapshots, upsert  |
| `repositories/content.repository.ts`   | Content                   | findByChannel, findRecent, findWithAnalysis, bulkUpsert     |
| `repositories/comment.repository.ts`   | Comment (CommentAnalysis) | findByContent, findByChannel, findRisky, aggregateSentiment |
| `repositories/workspace.repository.ts` | Workspace                 | findById, findByUser, getCapabilities, updatePlanLimits     |

### What existing code to reuse

- `packages/api/src/trpc.ts` — keep the tRPC infrastructure (context, middleware) as-is
- `packages/api/src/routers/channel.ts` — extract Prisma queries into `channel.repository.ts`
- `packages/db/` — Prisma client and generated types (import from `@x2/db`)

### Dependencies on previous phases

- None. This is the foundation.

### Estimated scope

- 6-8 files, ~500-700 lines total
- 2-3 days for one developer

### Parallelization

- Repository files (channel, content, comment, workspace) can be written in parallel
- Base class and types must be done first (1-2 hours)
- Can be parallelized with M-1 migration (no DB dependency for writing repository code)

---

## Phase R-2: Core Domain Services (Do Second)

> Wrap repositories in domain services. Refactor the main tRPC router to use them.

### What to build

#### 2.1 ChannelAnalysisService

**File:** `packages/api/src/services/channel-analysis.service.ts`

- Wraps: `ChannelRepository`, `ContentRepository`, `ChannelSnapshotRepository`
- Methods: `getChannelOverview()`, `getChannelTimeline()`, `getContentPerformance()`, `compareChannels()`
- Replaces: Direct Prisma calls in `channel.ts` router for analytics queries

#### 2.2 CommentAnalysisService

**File:** `packages/api/src/services/comment-analysis.service.ts`

- Wraps: `CommentRepository`, `CommentAnalysisRepository`
- Methods: `getSentimentBreakdown()`, `getTopComments()`, `getRiskyComments()`, `getQuestionComments()`
- Replaces: In-memory analysis in `apps/web/src/lib/comments/analyzers/*`

#### 2.3 WorkspaceAccessService

**File:** `packages/api/src/services/workspace-access.service.ts`

- Wraps: `WorkspaceRepository`
- Methods: `checkChannelLimit()`, `checkMemberLimit()`, `checkAiTokenLimit()`, `getCapabilities()`
- Uses the new Workspace plan limit fields from M-1 migration
- Intended for use in tRPC middleware (guard procedures)

#### 2.4 Refactor channel.ts router

- Replace all `ctx.prisma.channel.findMany(...)` with `channelRepository.findByWorkspace(...)`
- Replace inline analytics logic with `channelAnalysisService.getChannelOverview(...)`
- Router becomes: input validation + service call + output mapping

### What existing code to reuse

- `packages/api/src/routers/channel.ts` — existing procedure definitions (keep inputs/outputs, replace implementation)
- `apps/web/src/lib/channels/metric-resolver.ts` — metric calculation logic (extract and move to ChannelAnalysisService)
- `apps/web/src/lib/channels/basic-analysis.ts` — basic stats (move to CommentAnalysisService)

### Dependencies on previous phases

- **R-1** — requires base repository class, service result types
- **M-1** — WorkspaceAccessService needs the 12 new Workspace fields

### Estimated scope

- 4-5 files, ~800-1000 lines total
- 3-4 days for one developer

### Parallelization

- ChannelAnalysisService and CommentAnalysisService can be built in parallel
- WorkspaceAccessService can be built in parallel (different domain)
- Router refactor depends on all three services being ready

---

## Phase R-3: Collection Pipeline (Do Third)

> Connect the data collection pipeline to the database through proper services. Replace mock schedulers.

### What to build

#### 3.1 CollectionOrchestrationService

**File:** `packages/api/src/services/collection-orchestration.service.ts`

- Coordinates `@x2/social` platform providers (YouTube, Instagram, TikTok, X)
- Methods: `collectChannel()`, `collectContent()`, `collectComments()`, `runFullSync()`
- Manages the flow: fetch from platform -> normalize -> persist via repositories
- Error handling: per-platform retry, partial failure recovery

#### 3.2 ScheduledJob integration

**File:** `packages/api/src/services/scheduler.service.ts`

- Wraps: `ScheduledJobRepository`
- Methods: `createJob()`, `updateJobStatus()`, `recordDuration()`, `getJobsByGroup()`
- Uses new `durationMs` and `jobGroup` fields from M-1

#### 3.3 OpsMonitoringService

**File:** `packages/api/src/services/ops-monitoring.service.ts`

- Methods: `getJobHealth()`, `getRetryStats()`, `getFailedJobs()`, `getCollectionStatus()`
- Aggregates ScheduledJob + UsageMetric data for admin dashboard

### What existing code to reuse

- **`packages/social/src/youtube.ts`** — YouTube connector (Tier 1, production-ready)
- **`packages/social/src/instagram.ts`** — Instagram connector
- **`packages/social/src/tiktok.ts`** — TikTok connector
- **`packages/social/src/x.ts`** — X/Twitter connector
- **`packages/social/src/provider-factory.ts`** — Platform provider factory
- **`packages/social/src/rate-limiter.ts`** — Rate limiting (reuse directly)
- `apps/web/src/lib/collection/connectors/*` — YouTube connector patterns (extract, do not copy)
- `apps/web/src/lib/collection/normalization.ts` — Data normalization (move to service)
- `apps/web/src/lib/collection/scheduler.ts` — Scheduling logic (replace with ScheduledJob-based)

### Dependencies on previous phases

- **R-1** — repositories for Channel, Content
- **R-2** — not strictly required, but WorkspaceAccessService needed for limit checks during collection
- **M-1** — ScheduledJob fields for duration tracking

### Estimated scope

- 3-4 files, ~600-800 lines total
- 3-4 days for one developer

### Parallelization

- Can start in parallel with R-2 (different domain)
- SchedulerService and OpsMonitoringService can be built in parallel
- CollectionOrchestrationService depends on repositories from R-1

---

## Phase R-4: Intelligence Services (Do Fourth)

> Build services for the new FAQ, Risk, and Notification models. Requires M-2 migration.

### What to build

#### 4.1 FAQService

**File:** `packages/api/src/services/faq.service.ts`

- Wraps: `FAQCandidateRepository`
- Methods: `extractFAQs()`, `clusterQuestions()`, `updateStatus()`, `getTopFAQs()`, `dismissFAQ()`
- Integrates with `packages/ai` for LLM-based question clustering
- Triggered by: `FAQ_EXTRACT` BullMQ job after comment analysis completes

#### 4.2 RiskSignalService

**File:** `packages/api/src/services/risk-signal.service.ts`

- Wraps: `RiskSignalRepository`
- Methods: `detectRisks()`, `escalate()`, `assignResponder()`, `resolve()`, `getRiskTimeline()`
- Auto-triggers Notification creation for HIGH/CRITICAL severity
- Triggered by: `RISK_DETECT` BullMQ job after comment analysis completes

#### 4.3 NotificationService

**File:** `packages/api/src/services/notification.service.ts`

- Wraps: `NotificationRepository`
- Methods: `send()`, `markRead()`, `markAllRead()`, `getUnreadCount()`, `getUserNotifications()`
- Supports multiple trigger sources: RiskSignal, ScheduledJob failure, token limits, OAuth expiry
- Triggered by: `NOTIFICATION_SEND` BullMQ job or direct service call

#### 4.4 ListeningAnalysisService

**File:** `packages/api/src/services/listening-analysis.service.ts`

- Wraps: `RawSocialMentionRepository`, `ListeningKeywordRepository`
- Methods: `analyzeMentions()`, `getSentimentTrend()`, `getKeywordPerformance()`
- Cross-references with RiskSignalService for mention-based risk detection

#### 4.5 TrendService

**File:** `packages/api/src/services/trend.service.ts`

- Wraps: `ChannelSnapshotRepository`, `ContentRepository`
- Methods: `calculateGrowthRate()`, `detectAnomalies()`, `getPerformanceTrend()`
- Used by ChannelAnalysisService and RiskSignalService

### What existing code to reuse

- `apps/web/src/lib/channels/insight-generator.ts` — pattern extraction concepts (rewrite with LLM, do not copy logic)
- `apps/web/src/lib/ai/prompts/` — existing AI prompt templates (evaluate and adapt)
- `apps/web/src/lib/ai/providers/` — AI provider abstraction (move to `packages/ai`)

### Dependencies on previous phases

- **R-1** — base repositories
- **R-2** — CommentAnalysisService feeds into FAQ/Risk detection
- **M-2** — FAQCandidate, RiskSignal, Notification tables must exist
- **packages/queue** — BullMQ must be set up for job handlers
- **packages/ai** — LLM integration must be scaffolded

### Estimated scope

- 5-6 files + 3 BullMQ job handlers, ~1200-1500 lines total
- 5-7 days for one developer

### Parallelization

- FAQService and RiskSignalService can be built in parallel (different models)
- NotificationService can be built in parallel (independent model)
- ListeningAnalysisService and TrendService can be built in parallel
- All depend on R-1 repositories being ready

---

## Phase R-5: Analytics & Report Services (Do Fifth)

> Higher-level analytics services that compose lower-level services.

### What to build

#### 5.1 IntentAnalysisService

**File:** `packages/api/src/services/intent-analysis.service.ts`

- Wraps: `IntentQueryRepository`, `IntentResultRepository`
- Methods: `analyzeIntent()`, `getJourney()`, `getCompetitorComparison()`
- Heavy LLM usage — delegates to `packages/ai`

#### 5.2 GeoAeoService

**File:** `packages/api/src/services/geo-aeo.service.ts`

- Wraps: `AeoSnapshotRepository`, `CitationReadyReportSourceRepository`
- Methods: `trackCitations()`, `getAeoTimeline()`, `getCitationSources()`
- Feature-gated: requires `workspace.geoAeoEnabled = true`

#### 5.3 CitationService

**File:** `packages/api/src/services/citation.service.ts`

- Wraps: `CitationReadyReportSourceRepository`
- Methods: `getSources()`, `updatePriority()`, `getSourcePerformance()`

#### 5.4 ReportService

**File:** `packages/api/src/services/report.service.ts`

- Wraps: `ReportRepository`, `ReportTemplateRepository`, `EvidenceAssetRepository`
- Methods: `generateReport()`, `getReportHistory()`, `exportReport()`
- Composes: ChannelAnalysisService, CommentAnalysisService, TrendService
- Feature-gated: `workspace.maxReportsPerMonth` limit check

#### 5.5 EvidenceService

**File:** `packages/api/src/services/evidence.service.ts`

- Wraps: `EvidenceAssetRepository`
- Methods: `collectEvidence()`, `attachToReport()`, `getEvidenceChain()`
- Sources: CommentAnalysis, FAQCandidate, RiskSignal, AeoSnapshot

#### 5.6 ActionRecommendationService

**File:** `packages/api/src/services/action-recommendation.service.ts`

- Wraps: `InsightActionRepository`
- Methods: `generateActions()`, `prioritize()`, `getActionsByModule()`
- Composes insights from FAQ, Risk, Trend, Comment services

### What existing code to reuse

- `apps/web/src/lib/ai/execution/` — AI execution patterns (move to `packages/ai`)
- `apps/web/src/lib/reports/` — report generation concepts (rewrite with proper data layer)

### Dependencies on previous phases

- **R-2** — ChannelAnalysisService, CommentAnalysisService
- **R-4** — FAQService, RiskSignalService, TrendService (for evidence and action generation)
- **M-1** — Workspace feature flags for gating
- **M-2** — FAQ/Risk models for evidence sources

### Estimated scope

- 6 files, ~1000-1200 lines total
- 5-6 days for one developer

### Parallelization

- IntentAnalysisService and GeoAeoService can be built in parallel (independent domains)
- ReportService and EvidenceService should be built together (tightly coupled)
- ActionRecommendationService depends on R-4 services

---

## Phase R-6: Campaign & Influencer (Do Sixth)

> Campaign management and influencer execution services.

### What to build

#### 6.1 InfluencerExecutionService

**File:** `packages/api/src/services/influencer-execution.service.ts`

- Wraps: `InfluencerProfileRepository`, `CampaignCreatorRepository`
- Methods: `discoverInfluencers()`, `evaluateInfluencer()`, `getInfluencerMetrics()`
- Feature-gated: `workspace.influencerExecutionEnabled = true`

#### 6.2 CampaignService

**File:** `packages/api/src/services/campaign.service.ts`

- Wraps: `CampaignRepository`, `CampaignCreatorRepository`
- Methods: `createCampaign()`, `addCreators()`, `updateStatus()`, `getCampaignTimeline()`
- Lifecycle: DRAFT -> ACTIVE -> COMPLETED / CANCELLED

#### 6.3 CampaignPerformanceService

**File:** `packages/api/src/services/campaign-performance.service.ts`

- Wraps: `CampaignMetricRepository`, `PostMeasurementRepository`
- Methods: `trackPerformance()`, `calculateROI()`, `getPerformanceDashboard()`
- Composes: ChannelAnalysisService for creator channel data

### What existing code to reuse

- No existing campaign/influencer implementation — build from scratch
- Channel analysis patterns from R-2 can be adapted for influencer metrics

### Dependencies on previous phases

- **R-1** — base repositories
- **R-2** — ChannelAnalysisService for creator channel data
- **M-1** — Workspace feature flags for gating

### Estimated scope

- 3 files, ~600-800 lines total
- 3-4 days for one developer

### Parallelization

- InfluencerExecutionService and CampaignService can be built in parallel
- CampaignPerformanceService depends on CampaignService
- Entire phase can be deferred — campaigns are a secondary feature

---

## Key Reuse Points from Existing Code

### Tier 1: Reuse directly (production-ready)

| Source                                    | What                     | Reuse how                                           |
| ----------------------------------------- | ------------------------ | --------------------------------------------------- |
| `packages/social/src/youtube.ts`          | YouTube API connector    | Import and call from CollectionOrchestrationService |
| `packages/social/src/instagram.ts`        | Instagram connector      | Import and call from CollectionOrchestrationService |
| `packages/social/src/tiktok.ts`           | TikTok connector         | Import and call from CollectionOrchestrationService |
| `packages/social/src/x.ts`                | X/Twitter connector      | Import and call from CollectionOrchestrationService |
| `packages/social/src/provider-factory.ts` | Platform factory         | Use for dynamic provider selection                  |
| `packages/social/src/rate-limiter.ts`     | Rate limiting            | Use directly in collection pipeline                 |
| `packages/api/src/trpc.ts`                | tRPC context, middleware | Keep as-is, add new middleware for workspace limits |

### Tier 2: Extract patterns, rewrite implementation

| Source                                         | What                                 | Action                                                       |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| `apps/web/src/lib/channels/url/*`              | URL parsing/validation               | Move to `packages/social/src/url/` or keep in web if UI-only |
| `apps/web/src/lib/collection/connectors/*`     | YouTube collection flow              | Extract the orchestration pattern, rewrite with repositories |
| `apps/web/src/lib/collection/normalization.ts` | Data normalization                   | Move normalization logic to CollectionOrchestrationService   |
| `apps/web/src/lib/ai/*`                        | AI orchestration, prompts, providers | Move to `packages/ai/src/`, restructure for service layer    |
| `apps/web/src/lib/channels/metric-resolver.ts` | Metric calculations                  | Move to ChannelAnalysisService                               |
| `apps/web/src/lib/channels/basic-analysis.ts`  | Basic statistics                     | Move to CommentAnalysisService                               |

### Tier 3: Concept only (rewrite completely)

| Source                                           | What               | Action                                                |
| ------------------------------------------------ | ------------------ | ----------------------------------------------------- |
| `apps/web/src/lib/channels/insight-generator.ts` | Insight generation | Rewrite — currently hardcoded rules, replace with LLM |
| `apps/web/src/lib/reports/`                      | Report generation  | Rewrite — needs proper data layer and evidence chain  |

---

## What NOT to Reuse (Delete After DB Migration)

These files are in-memory mocks or keyword-based implementations that should be replaced entirely:

| File                                             | Reason                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `apps/web/src/lib/channels/channel-service.ts`   | In-memory mock — all data from hardcoded arrays              |
| `apps/web/src/lib/comments/analyzers/*`          | Keyword-based sentiment — replace with LLM via `packages/ai` |
| `apps/web/src/lib/insights/insight-generator.ts` | Hardcoded insight rules — replace with data-driven + LLM     |
| `apps/web/src/lib/channels/mock-data.ts`         | Mock data                                                    |
| `apps/web/src/lib/collection/mock-data.ts`       | Mock data                                                    |
| `apps/web/src/lib/mock-data.ts`                  | Mock data                                                    |

**Do not delete these files until the corresponding repository/service replacement is deployed and verified.** Delete in the same PR that removes the last reference.

---

## Full Dependency Graph

```
R-1: Foundation Layer
 ├── base.repository.ts
 ├── service-result types
 ├── logger
 └── 4 core repositories (Channel, Content, Comment, Workspace)
      │
      ├──→ R-2: Core Domain Services
      │     ├── ChannelAnalysisService
      │     ├── CommentAnalysisService
      │     ├── WorkspaceAccessService (needs M-1)
      │     └── channel.ts router refactor
      │          │
      │          ├──→ R-3: Collection Pipeline
      │          │     ├── CollectionOrchestrationService
      │          │     ├── SchedulerService (needs M-1)
      │          │     └── OpsMonitoringService
      │          │
      │          ├──→ R-4: Intelligence Services (needs M-2)
      │          │     ├── FAQService
      │          │     ├── RiskSignalService
      │          │     ├── NotificationService
      │          │     ├── ListeningAnalysisService
      │          │     └── TrendService
      │          │          │
      │          │          ├──→ R-5: Analytics & Report Services
      │          │          │     ├── IntentAnalysisService
      │          │          │     ├── GeoAeoService
      │          │          │     ├── CitationService
      │          │          │     ├── ReportService
      │          │          │     ├── EvidenceService
      │          │          │     └── ActionRecommendationService
      │          │          │
      │          │          └──→ R-6: Campaign & Influencer
      │          │                ├── InfluencerExecutionService
      │          │                ├── CampaignService
      │          │                └── CampaignPerformanceService
      │          │
      │          └── (R-3 and R-4 can run in parallel)
      │
      └── (R-2 repositories can be built alongside M-1 migration)
```

---

## Summary Table

| Phase     | What                            | Depends on       | Parallel with | Est. days | Migration needed           |
| --------- | ------------------------------- | ---------------- | ------------- | --------- | -------------------------- |
| R-1       | Foundation (repos + types)      | Nothing          | M-1           | 2-3       | None                       |
| R-2       | Core services + router refactor | R-1              | M-1           | 3-4       | M-1 (for workspace limits) |
| R-3       | Collection pipeline             | R-1, R-2 partial | R-4           | 3-4       | M-1                        |
| R-4       | FAQ/Risk/Notification services  | R-1, R-2, M-2    | R-3           | 5-7       | M-2                        |
| R-5       | Analytics/Reports               | R-2, R-4         | R-6           | 5-6       | M-1, M-2                   |
| R-6       | Campaign/Influencer             | R-1, R-2         | R-5           | 3-4       | M-1                        |
| **Total** |                                 |                  |               | **21-28** |                            |
