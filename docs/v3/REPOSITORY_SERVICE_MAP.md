# Repository & Service Layer Map

> Defines every repository and service in the v3 backend architecture.
> All repositories live in `packages/api/src/repositories/`.
> All services live in `packages/api/src/services/`.

---

## 1. Repository Layer

Each repository wraps one or more Prisma models and exposes a consistent data-access API. Repositories never contain business logic — they translate between domain queries and Prisma calls.

### 1.1 Channel Domain

| #   | Repository          | File                    | Prisma Models                               | Key Methods                                                                                                                                                                                                                                                                                                           |
| --- | ------------------- | ----------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ChannelRepository` | `channel.repository.ts` | Channel, ChannelConnection, ChannelSnapshot | `findById`, `findByWorkspace(workspaceId, filters)`, `findByPlatform(platformId)`, `findWithLatestSnapshot(channelId)`, `createWithConnection(data)`, `updateMetadata(channelId, data)`, `upsertSnapshot(channelId, snapshot)`, `delete(channelId)`, `listConnections(channelId)`, `disconnectPlatform(connectionId)` |
| 2   | `ContentRepository` | `content.repository.ts` | Content, ContentMetricDaily                 | `findById`, `findByChannel(channelId, pagination, filters)`, `findTopPerforming(channelId, metric, limit)`, `create(data)`, `bulkUpsert(contents[])`, `upsertDailyMetric(contentId, date, metrics)`, `getMetricTimeSeries(contentId, dateRange)`, `delete(contentId)`                                                 |

### 1.2 Comment Domain

| #   | Repository               | File                          | Prisma Models            | Key Methods                                                                                                                                                                                                                                                                    |
| --- | ------------------------ | ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3   | `CommentRepository`      | `comment.repository.ts`       | Comment, CommentAnalysis | `findById`, `findByContent(contentId, pagination)`, `findByChannel(channelId, pagination, filters)`, `findUnanalyzed(limit)`, `create(data)`, `bulkCreate(comments[])`, `upsertAnalysis(commentId, analysis)`, `getAnalysisSummary(channelId, dateRange)`, `delete(commentId)` |
| 19  | `FAQCandidateRepository` | `faq-candidate.repository.ts` | FAQCandidate             | `findById`, `findByChannel(channelId, filters)`, `findByCluster(clusterId)`, `create(data)`, `bulkCreate(candidates[])`, `updateStatus(id, status)`, `mergeCandidates(sourceIds, targetId)`, `getTopByFrequency(channelId, limit)`, `delete(id)`                               |
| 20  | `RiskSignalRepository`   | `risk-signal.repository.ts`   | RiskSignal               | `findById`, `findByChannel(channelId, filters)`, `findByWorkspace(workspaceId, severity?, status?)`, `findUnresolved(workspaceId)`, `create(data)`, `updateSeverity(id, severity)`, `resolve(id, resolution)`, `escalate(id, notificationId)`, `delete(id)`                    |

### 1.3 Listening Domain

| #   | Repository                 | File                            | Prisma Models               | Key Methods                                                                                                                                                                                                                                                                     |
| --- | -------------------------- | ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | `KeywordRepository`        | `keyword.repository.ts`         | Keyword, KeywordMetricDaily | `findById`, `findByWorkspace(workspaceId, filters)`, `findTracked(workspaceId)`, `create(data)`, `bulkCreate(keywords[])`, `upsertDailyMetric(keywordId, date, metrics)`, `getMetricTimeSeries(keywordId, dateRange)`, `toggleTracking(keywordId, active)`, `delete(keywordId)` |
| 5   | `MentionRepository`        | `mention.repository.ts`         | RawSocialMention            | `findById`, `findByKeyword(keywordId, pagination, dateRange)`, `findByWorkspace(workspaceId, filters)`, `create(data)`, `bulkCreate(mentions[])`, `getVolumeTimeSeries(keywordId, dateRange)`, `getSentimentDistribution(keywordId, dateRange)`, `delete(mentionId)`            |
| 6   | `TrendAnalyticsRepository` | `trend-analytics.repository.ts` | TrendKeywordAnalytics       | `findById`, `findByWorkspace(workspaceId, dateRange)`, `findByKeyword(keywordId)`, `findTrending(workspaceId, limit)`, `create(data)`, `bulkUpsert(analytics[])`, `getVelocityRanking(workspaceId, dateRange)`, `delete(id)`                                                    |

### 1.4 Intent Domain

| #   | Repository         | File                   | Prisma Models                    | Key Methods                                                                                                                                                                                                                                |
| --- | ------------------ | ---------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7   | `IntentRepository` | `intent.repository.ts` | IntentQuery, IntentKeywordResult | `findById`, `findByWorkspace(workspaceId, filters)`, `findByKeyword(keywordId)`, `create(data)`, `upsertKeywordResult(queryId, keywordId, result)`, `getGapAnalysis(workspaceId)`, `getIntentDistribution(workspaceId)`, `delete(queryId)` |

### 1.5 GEO/AEO Domain

| #   | Repository                 | File                            | Prisma Models             | Key Methods                                                                                                                                                                                                                                                              |
| --- | -------------------------- | ------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8   | `AeoRepository`            | `aeo.repository.ts`             | AeoKeyword, AeoSnapshot   | `findById`, `findByWorkspace(workspaceId, filters)`, `findTracked(workspaceId)`, `create(data)`, `bulkCreate(keywords[])`, `upsertSnapshot(keywordId, snapshot)`, `getVisibilityTimeSeries(keywordId, dateRange)`, `getEngineComparison(keywordId)`, `delete(keywordId)` |
| 9   | `CitationSourceRepository` | `citation-source.repository.ts` | CitationReadyReportSource | `findById`, `findByWorkspace(workspaceId, filters)`, `findByDomain(domain)`, `create(data)`, `bulkCreate(sources[])`, `updateVisibilityScore(id, score)`, `getTopCited(workspaceId, limit)`, `delete(id)`                                                                |

### 1.6 Report Domain

| #   | Repository                | File                           | Prisma Models                                | Key Methods                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------- | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | `EvidenceAssetRepository` | `evidence-asset.repository.ts` | EvidenceAsset, ReportSection                 | `findById`, `findByReport(reportId)`, `findBySection(sectionId)`, `create(data)`, `linkToSection(assetId, sectionId)`, `unlinkFromSection(assetId, sectionId)`, `resolveDataSource(assetId)`, `delete(assetId)`                                                                                                                       |
| 13  | `InsightActionRepository` | `insight-action.repository.ts` | InsightAction                                | `findById`, `findByReport(reportId)`, `findByWorkspace(workspaceId, status?, priority?)`, `findPending(workspaceId)`, `create(data)`, `bulkCreate(actions[])`, `updateStatus(id, status)`, `assignTo(id, userId)`, `markComplete(id, result)`, `delete(id)`                                                                           |
| 14  | `ReportRepository`        | `report.repository.ts`         | InsightReport, ReportSection, ReportTemplate | `findById`, `findByWorkspace(workspaceId, pagination, filters)`, `findByChannel(channelId)`, `create(data)`, `createFromTemplate(templateId, params)`, `addSection(reportId, section)`, `updateSection(sectionId, data)`, `reorderSections(reportId, order[])`, `publish(reportId)`, `listTemplates(workspaceId)`, `delete(reportId)` |

### 1.7 Influencer / Campaign Domain

| #   | Repository             | File                       | Prisma Models                                                                               | Key Methods                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | `InfluencerRepository` | `influencer.repository.ts` | InfluencerProfile                                                                           | `findById`, `findByWorkspace(workspaceId, filters)`, `findByPlatform(platformId, filters)`, `search(workspaceId, query)`, `create(data)`, `update(id, data)`, `updateMetrics(id, metrics)`, `delete(id)`                                                                                                                                                                                                                                      |
| 12  | `CampaignRepository`   | `campaign.repository.ts`   | Campaign, CampaignCreator, CampaignContent, CampaignMetric, PostMeasurement, RoiCalculation | `findById`, `findByWorkspace(workspaceId, pagination, filters)`, `findActive(workspaceId)`, `create(data)`, `update(campaignId, data)`, `addCreator(campaignId, creatorData)`, `removeCreator(campaignId, creatorId)`, `addContent(campaignId, contentData)`, `upsertMetric(campaignId, date, metrics)`, `addPostMeasurement(campaignId, measurement)`, `calculateROI(campaignId)`, `getPerformanceSummary(campaignId)`, `delete(campaignId)` |

### 1.8 Workspace / Subscription Domain

| #   | Repository            | File                      | Prisma Models                       | Key Methods                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------- | ------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | `WorkspaceRepository` | `workspace.repository.ts` | Workspace, WorkspaceMember, Project | `findById`, `findByUser(userId)`, `findBySlug(slug)`, `create(data, ownerId)`, `update(workspaceId, data)`, `addMember(workspaceId, userId, role)`, `removeMember(workspaceId, userId)`, `updateMemberRole(workspaceId, userId, role)`, `listMembers(workspaceId)`, `createProject(workspaceId, data)`, `listProjects(workspaceId)`, `delete(workspaceId)` |
| 16  | `UsageRepository`     | `usage.repository.ts`     | UsageMetric, Subscription           | `findCurrentSubscription(workspaceId)`, `getUsageByPeriod(workspaceId, period)`, `getUsageByMetric(workspaceId, metricType, dateRange)`, `recordUsage(workspaceId, metricType, value)`, `createSubscription(workspaceId, plan)`, `updateSubscription(subscriptionId, data)`, `cancelSubscription(subscriptionId)`, `checkQuota(workspaceId, metricType)`   |

### 1.9 Ops / Admin Domain

| #   | Repository               | File                          | Prisma Models | Key Methods                                                                                                                                                                                                                                                                                       |
| --- | ------------------------ | ----------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | `ScheduledJobRepository` | `scheduled-job.repository.ts` | ScheduledJob  | `findById`, `findByStatus(status)`, `findDue(before?)`, `findByType(jobType)`, `create(data)`, `updateStatus(jobId, status, result?)`, `markRunning(jobId)`, `markComplete(jobId, result)`, `markFailed(jobId, error)`, `reschedule(jobId, nextRun)`, `getHistory(jobId, limit)`, `delete(jobId)` |
| 18  | `NotificationRepository` | `notification.repository.ts`  | Notification  | `findById`, `findByUser(userId, filters)`, `findUnread(userId)`, `create(data)`, `bulkCreate(notifications[])`, `markRead(notificationId)`, `markAllRead(userId)`, `getUnreadCount(userId)`, `delete(notificationId)`, `deleteOlderThan(days)`                                                    |

---

## 2. Service Layer

Services contain all business logic. They depend on repositories for data access and may call other services for cross-domain orchestration.

### 2.1 Channel Services

#### `channels/channel-analysis.service.ts`

| Property             | Value                                                                             |
| -------------------- | --------------------------------------------------------------------------------- |
| **Description**      | Channel metrics aggregation, snapshot comparison, performance scoring             |
| **Input Types**      | `{ channelId, dateRange?, metrics? }`, `{ workspaceId, filters? }`                |
| **Repositories**     | `ChannelRepository`, `ContentRepository`                                          |
| **Services Called**  | None                                                                              |
| **Output Types**     | `ChannelPerformanceReport`, `ChannelGrowthMetrics`, `SnapshotComparison`          |
| **Failure Handling** | Graceful degradation on missing snapshots; returns partial data with warnings     |
| **Trace/Log Points** | `channel.analysis.start`, `channel.snapshot.compare`, `channel.analysis.complete` |

#### `channels/competitor.service.ts`

| Property             | Value                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------- |
| **Description**      | Competitor channel comparison, gap analysis, benchmarking                             |
| **Input Types**      | `{ channelId, competitorIds[], metrics[] }`, `{ workspaceId, platformId? }`           |
| **Repositories**     | `ChannelRepository`, `ContentRepository`                                              |
| **Services Called**  | `ChannelAnalysisService`                                                              |
| **Output Types**     | `CompetitorComparison`, `GapAnalysisResult`, `BenchmarkReport`                        |
| **Failure Handling** | Skips unavailable competitors; logs missing data                                      |
| **Trace/Log Points** | `competitor.compare.start`, `competitor.gap.calculate`, `competitor.compare.complete` |

### 2.2 Comment Services

#### `comments/comment-analysis.service.ts`

| Property             | Value                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Orchestrates sentiment analysis, topic extraction, and risk/FAQ detection on comments                                                                             |
| **Input Types**      | `{ channelId, dateRange? }`, `{ contentId }`, `{ commentIds[] }`                                                                                                  |
| **Repositories**     | `CommentRepository`                                                                                                                                               |
| **Services Called**  | `FAQService`, `RiskSignalService`                                                                                                                                 |
| **Output Types**     | `CommentAnalysisSummary`, `SentimentDistribution`, `TopicCluster[]`                                                                                               |
| **Failure Handling** | Retries LLM calls up to 3x; falls back to keyword-based analysis on total failure                                                                                 |
| **Trace/Log Points** | `comment.analysis.batch.start`, `comment.analysis.llm.call`, `comment.analysis.faq.dispatch`, `comment.analysis.risk.dispatch`, `comment.analysis.batch.complete` |

#### `comments/faq.service.ts`

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| **Description**      | FAQ candidate CRUD, clustering trigger, answer suggestion                |
| **Input Types**      | `{ channelId, filters? }`, `{ candidateId }`, `{ candidates[] }`         |
| **Repositories**     | `FAQCandidateRepository`, `CommentRepository`                            |
| **Services Called**  | None                                                                     |
| **Output Types**     | `FAQCandidate`, `FAQCluster[]`, `FAQSummary`                             |
| **Failure Handling** | Idempotent upserts; clustering failures do not block CRUD                |
| **Trace/Log Points** | `faq.create`, `faq.cluster.trigger`, `faq.cluster.complete`, `faq.merge` |

#### `comments/risk-signal.service.ts`

| Property             | Value                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Description**      | Risk signal CRUD, severity classification, escalation to notifications                                             |
| **Input Types**      | `{ channelId, filters? }`, `{ signalId }`, `{ signal, severity }`                                                  |
| **Repositories**     | `RiskSignalRepository`, `NotificationRepository`                                                                   |
| **Services Called**  | None                                                                                                               |
| **Output Types**     | `RiskSignal`, `RiskDashboard`, `EscalationResult`                                                                  |
| **Failure Handling** | Critical signals always persisted first, then notification attempted; notification failure logged but not blocking |
| **Trace/Log Points** | `risk.detect`, `risk.classify`, `risk.escalate`, `risk.resolve`                                                    |

### 2.3 Listening Services

#### `listening/listening-analysis.service.ts`

| Property             | Value                                                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Keyword tracking setup, mention collection orchestration, volume/sentiment analysis                                        |
| **Input Types**      | `{ workspaceId, keywords[] }`, `{ keywordId, dateRange? }`                                                                 |
| **Repositories**     | `KeywordRepository`, `MentionRepository`                                                                                   |
| **Services Called**  | None                                                                                                                       |
| **Output Types**     | `KeywordTrackingStatus`, `MentionVolumeSeries`, `SentimentTrend`                                                           |
| **Failure Handling** | Partial collection results accepted; failed platforms logged and retried next cycle                                        |
| **Trace/Log Points** | `listening.keyword.track`, `listening.collect.start`, `listening.collect.platform.complete`, `listening.analysis.complete` |

#### `listening/trend.service.ts`

| Property             | Value                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Description**      | Trend keyword analytics, velocity scoring, emerging topic detection                                  |
| **Input Types**      | `{ workspaceId, dateRange? }`, `{ keywordId }`                                                       |
| **Repositories**     | `TrendAnalyticsRepository`, `KeywordRepository`                                                      |
| **Services Called**  | None                                                                                                 |
| **Output Types**     | `TrendRanking[]`, `VelocityScore`, `EmergingTopics`                                                  |
| **Failure Handling** | Stale data returned with TTL warning if fresh computation fails                                      |
| **Trace/Log Points** | `trend.compute.start`, `trend.velocity.calculate`, `trend.emerging.detect`, `trend.compute.complete` |

### 2.4 Intent Services

#### `intent/intent-analysis.service.ts`

| Property             | Value                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| **Description**      | Search intent classification, keyword-intent mapping, gap scoring                   |
| **Input Types**      | `{ workspaceId, queries[] }`, `{ queryId }`, `{ keywordId }`                        |
| **Repositories**     | `IntentRepository`, `KeywordRepository`                                             |
| **Services Called**  | `ListeningAnalysisService` (keyword data)                                           |
| **Output Types**     | `IntentClassification`, `IntentGapReport`, `IntentDistribution`                     |
| **Failure Handling** | LLM classification retry with exponential backoff; cached results served on failure |
| **Trace/Log Points** | `intent.classify.start`, `intent.gap.score`, `intent.classify.complete`             |

### 2.5 GEO/AEO Services

#### `geo/geo-aeo.service.ts`

| Property             | Value                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------- |
| **Description**      | AEO keyword management, AI engine snapshot collection, visibility scoring                 |
| **Input Types**      | `{ workspaceId, keywords[] }`, `{ keywordId, engines[]? }`                                |
| **Repositories**     | `AeoRepository`                                                                           |
| **Services Called**  | None                                                                                      |
| **Output Types**     | `AeoKeywordStatus`, `VisibilityTimeSeries`, `EngineComparison`                            |
| **Failure Handling** | Per-engine failure isolation; partial results with engine status flags                    |
| **Trace/Log Points** | `aeo.snapshot.start`, `aeo.engine.query`, `aeo.visibility.score`, `aeo.snapshot.complete` |

#### `geo/citation.service.ts`

| Property             | Value                                                                    |
| -------------------- | ------------------------------------------------------------------------ |
| **Description**      | Citation source management, citation tracking, visibility impact scoring |
| **Input Types**      | `{ workspaceId, filters? }`, `{ sourceId }`, `{ url, metadata }`         |
| **Repositories**     | `CitationSourceRepository`                                               |
| **Services Called**  | None                                                                     |
| **Output Types**     | `CitationSource`, `CitationRanking[]`, `VisibilityImpact`                |
| **Failure Handling** | URL validation before persist; dead link detection logged as warning     |
| **Trace/Log Points** | `citation.create`, `citation.score.update`, `citation.rank.compute`      |

### 2.6 Report Services

#### `reports/report.service.ts`

| Property             | Value                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Report generation, section management, template-based creation, publishing                                              |
| **Input Types**      | `{ workspaceId, templateId?, params }`, `{ reportId }`, `{ reportId, section }`                                         |
| **Repositories**     | `ReportRepository`                                                                                                      |
| **Services Called**  | `EvidenceService`, `ActionRecommendationService`                                                                        |
| **Output Types**     | `InsightReport`, `ReportSection[]`, `PublishedReport`                                                                   |
| **Failure Handling** | Section generation failures produce placeholder sections; report marked as partial                                      |
| **Trace/Log Points** | `report.generate.start`, `report.section.build`, `report.evidence.attach`, `report.publish`, `report.generate.complete` |

#### `reports/evidence.service.ts`

| Property             | Value                                                                              |
| -------------------- | ---------------------------------------------------------------------------------- |
| **Description**      | Evidence asset linking, data source resolution, chart/screenshot embedding         |
| **Input Types**      | `{ reportId, sectionId }`, `{ assetId }`, `{ sourceType, sourceId }`               |
| **Repositories**     | `EvidenceAssetRepository`                                                          |
| **Services Called**  | None                                                                               |
| **Output Types**     | `EvidenceAsset`, `ResolvedDataSource`, `AssetEmbed`                                |
| **Failure Handling** | Missing data sources return null with warning; broken references cleaned on access |
| **Trace/Log Points** | `evidence.link`, `evidence.resolve`, `evidence.embed`                              |

### 2.7 Action Services

#### `actions/action-recommendation.service.ts`

| Property             | Value                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **Description**      | Synthesizes actionable recommendations from all analysis engines                                        |
| **Input Types**      | `{ workspaceId, channelId?, reportId? }`, `{ analysisResults[] }`                                       |
| **Repositories**     | `InsightActionRepository`                                                                               |
| **Services Called**  | `ChannelAnalysisService`, `CommentAnalysisService`, `ListeningAnalysisService`, `IntentAnalysisService` |
| **Output Types**     | `InsightAction[]`, `ActionPriorityRanking`, `ActionSummary`                                             |
| **Failure Handling** | Partial engine failures produce subset of recommendations with source attribution                       |
| **Trace/Log Points** | `action.synthesize.start`, `action.engine.collect`, `action.rank`, `action.synthesize.complete`         |

### 2.8 Influencer / Campaign Services

#### `influencer/influencer-execution.service.ts`

| Property             | Value                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| **Description**      | Influencer profile management, search, metric refresh                          |
| **Input Types**      | `{ workspaceId, filters? }`, `{ profileId }`, `{ searchQuery }`                |
| **Repositories**     | `InfluencerRepository`                                                         |
| **Services Called**  | None                                                                           |
| **Output Types**     | `InfluencerProfile`, `InfluencerSearchResult[]`, `ProfileMetrics`              |
| **Failure Handling** | Stale metrics served with last-updated timestamp on refresh failure            |
| **Trace/Log Points** | `influencer.search`, `influencer.profile.refresh`, `influencer.metrics.update` |

#### `influencer/campaign.service.ts`

| Property             | Value                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Description**      | Campaign lifecycle management, creator assignment, content tracking                            |
| **Input Types**      | `{ workspaceId, campaign }`, `{ campaignId }`, `{ campaignId, creatorId }`                     |
| **Repositories**     | `CampaignRepository`                                                                           |
| **Services Called**  | `InfluencerExecutionService`                                                                   |
| **Output Types**     | `Campaign`, `CampaignDetail`, `CreatorAssignment`                                              |
| **Failure Handling** | Creator validation before assignment; rollback on partial failures                             |
| **Trace/Log Points** | `campaign.create`, `campaign.creator.assign`, `campaign.content.add`, `campaign.status.change` |

#### `influencer/campaign-performance.service.ts`

| Property             | Value                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Description**      | Post measurement collection, metric aggregation, ROI calculation                                             |
| **Input Types**      | `{ campaignId }`, `{ campaignId, measurement }`, `{ campaignId, costData }`                                  |
| **Repositories**     | `CampaignRepository`                                                                                         |
| **Services Called**  | `CampaignService`                                                                                            |
| **Output Types**     | `CampaignMetricSummary`, `PostMeasurement`, `RoiReport`                                                      |
| **Failure Handling** | ROI calculation requires minimum data threshold; returns "insufficient data" below threshold                 |
| **Trace/Log Points** | `campaign.measure.start`, `campaign.metric.aggregate`, `campaign.roi.calculate`, `campaign.measure.complete` |

### 2.9 Workspace Services

#### `workspace/workspace-access.service.ts`

| Property             | Value                                                                        |
| -------------------- | ---------------------------------------------------------------------------- |
| **Description**      | Plan-based access control, feature flags, capability checks                  |
| **Input Types**      | `{ workspaceId }`, `{ workspaceId, feature }`, `{ workspaceId, capability }` |
| **Repositories**     | `WorkspaceRepository`, `UsageRepository`                                     |
| **Services Called**  | None                                                                         |
| **Output Types**     | `AccessCheckResult`, `PlanCapabilities`, `FeatureFlags`                      |
| **Failure Handling** | Defaults to most restrictive plan on lookup failure; logs for manual review  |
| **Trace/Log Points** | `access.check`, `access.feature.evaluate`, `access.plan.resolve`             |

#### `workspace/usage.service.ts`

| Property             | Value                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Description**      | Usage tracking, quota management, overage alerts                                        |
| **Input Types**      | `{ workspaceId, metricType, value }`, `{ workspaceId, period }`                         |
| **Repositories**     | `UsageRepository`                                                                       |
| **Services Called**  | `WorkspaceAccessService`                                                                |
| **Output Types**     | `UsageReport`, `QuotaStatus`, `OverageAlert`                                            |
| **Failure Handling** | Usage recording is fire-and-forget with async retry; never blocks the calling operation |
| **Trace/Log Points** | `usage.record`, `usage.quota.check`, `usage.overage.alert`                              |

### 2.10 Ops Services

#### `ops/ops-monitoring.service.ts`

| Property             | Value                                                                             |
| -------------------- | --------------------------------------------------------------------------------- |
| **Description**      | Scheduled job monitoring, health checks, failure detection, retry management      |
| **Input Types**      | `{ jobId }`, `{ status? }`, `{ jobType, since? }`                                 |
| **Repositories**     | `ScheduledJobRepository`, `NotificationRepository`                                |
| **Services Called**  | None                                                                              |
| **Output Types**     | `JobHealthReport`, `SystemHealthStatus`, `FailureReport`                          |
| **Failure Handling** | Monitoring itself is self-healing; writes to fallback log on DB failure           |
| **Trace/Log Points** | `ops.health.check`, `ops.job.monitor`, `ops.failure.detect`, `ops.retry.schedule` |

#### `ops/collection-orchestration.service.ts`

| Property             | Value                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**      | Data collection pipeline scheduling, platform connector coordination, rate limiting                                                           |
| **Input Types**      | `{ workspaceId, platforms[]? }`, `{ jobId }`, `{ schedule }`                                                                                  |
| **Repositories**     | `ScheduledJobRepository`, `ChannelRepository`                                                                                                 |
| **Services Called**  | `OpsMonitoringService`, `ChannelAnalysisService`                                                                                              |
| **Output Types**     | `CollectionSchedule`, `PipelineStatus`, `CollectionResult`                                                                                    |
| **Failure Handling** | Per-platform isolation; failed platforms do not block others; exponential backoff on API rate limits                                          |
| **Trace/Log Points** | `collection.schedule`, `collection.pipeline.start`, `collection.platform.run`, `collection.platform.complete`, `collection.pipeline.complete` |

---

## 3. Service → Repository Dependency Matrix

| Service                 | Chan | Cont | Comm | FAQ | Risk | Kw  | Ment | Trend | Intent | Aeo | Cit | Evid | Action | Report | Infl | Camp | Wksp | Usage | Job | Notif |
| ----------------------- | :--: | :--: | :--: | :-: | :--: | :-: | :--: | :---: | :----: | :-: | :-: | :--: | :----: | :----: | :--: | :--: | :--: | :---: | :-: | :---: |
| ChannelAnalysis         |  x   |  x   |      |     |      |     |      |       |        |     |     |      |        |        |      |      |      |       |     |       |
| Competitor              |  x   |  x   |      |     |      |     |      |       |        |     |     |      |        |        |      |      |      |       |     |       |
| CommentAnalysis         |      |      |  x   |     |      |     |      |       |        |     |     |      |        |        |      |      |      |       |     |       |
| FAQ                     |      |      |  x   |  x  |      |     |      |       |        |     |     |      |        |        |      |      |      |       |     |       |
| RiskSignal              |      |      |      |     |  x   |     |      |       |        |     |     |      |        |        |      |      |      |       |     |   x   |
| ListeningAnalysis       |      |      |      |     |      |  x  |  x   |       |        |     |     |      |        |        |      |      |      |       |     |       |
| Trend                   |      |      |      |     |      |  x  |      |   x   |        |     |     |      |        |        |      |      |      |       |     |       |
| IntentAnalysis          |      |      |      |     |      |  x  |      |       |   x    |     |     |      |        |        |      |      |      |       |     |       |
| GeoAeo                  |      |      |      |     |      |     |      |       |        |  x  |     |      |        |        |      |      |      |       |     |       |
| Citation                |      |      |      |     |      |     |      |       |        |     |  x  |      |        |        |      |      |      |       |     |       |
| Report                  |      |      |      |     |      |     |      |       |        |     |     |      |        |   x    |      |      |      |       |     |       |
| Evidence                |      |      |      |     |      |     |      |       |        |     |     |  x   |        |        |      |      |      |       |     |       |
| ActionRecommendation    |      |      |      |     |      |     |      |       |        |     |     |      |   x    |        |      |      |      |       |     |       |
| InfluencerExecution     |      |      |      |     |      |     |      |       |        |     |     |      |        |        |  x   |      |      |       |     |       |
| Campaign                |      |      |      |     |      |     |      |       |        |     |     |      |        |        |      |  x   |      |       |     |       |
| CampaignPerformance     |      |      |      |     |      |     |      |       |        |     |     |      |        |        |      |  x   |      |       |     |       |
| WorkspaceAccess         |      |      |      |     |      |     |      |       |        |     |     |      |        |        |      |      |  x   |   x   |     |       |
| Usage                   |      |      |      |     |      |     |      |       |        |     |     |      |        |        |      |      |      |   x   |     |       |
| OpsMonitoring           |      |      |      |     |      |     |      |       |        |     |     |      |        |        |      |      |      |       |  x  |   x   |
| CollectionOrchestration |  x   |      |      |     |      |     |      |       |        |     |     |      |        |        |      |      |      |       |  x  |       |

**Legend:** Chan=ChannelRepository, Cont=ContentRepository, Comm=CommentRepository, FAQ=FAQCandidateRepository, Risk=RiskSignalRepository, Kw=KeywordRepository, Ment=MentionRepository, Trend=TrendAnalyticsRepository, Intent=IntentRepository, Aeo=AeoRepository, Cit=CitationSourceRepository, Evid=EvidenceAssetRepository, Action=InsightActionRepository, Report=ReportRepository, Infl=InfluencerRepository, Camp=CampaignRepository, Wksp=WorkspaceRepository, Usage=UsageRepository, Job=ScheduledJobRepository, Notif=NotificationRepository

---

## 4. Cross-Service Call Map

```
ChannelAnalysisService
  └── (no service dependencies)

CompetitorService
  └── ChannelAnalysisService

CommentAnalysisService
  ├── FAQService
  └── RiskSignalService

FAQService
  └── (no service dependencies)

RiskSignalService
  └── (no service dependencies)

ListeningAnalysisService
  └── (no service dependencies)

TrendService
  └── (no service dependencies)

IntentAnalysisService
  └── ListeningAnalysisService

GeoAeoService
  └── (no service dependencies)

CitationService
  └── (no service dependencies)

ReportService
  ├── EvidenceService
  └── ActionRecommendationService

EvidenceService
  └── (no service dependencies)

ActionRecommendationService
  ├── ChannelAnalysisService
  ├── CommentAnalysisService
  ├── ListeningAnalysisService
  └── IntentAnalysisService

InfluencerExecutionService
  └── (no service dependencies)

CampaignService
  └── InfluencerExecutionService

CampaignPerformanceService
  └── CampaignService

WorkspaceAccessService
  └── (no service dependencies)

UsageService
  └── WorkspaceAccessService

OpsMonitoringService
  └── (no service dependencies)

CollectionOrchestrationService
  ├── OpsMonitoringService
  └── ChannelAnalysisService
```

### Dependency Layers (no circular dependencies)

```
Layer 0 (leaf services - no service deps):
  ChannelAnalysisService, FAQService, RiskSignalService,
  ListeningAnalysisService, TrendService, GeoAeoService,
  CitationService, EvidenceService, InfluencerExecutionService,
  WorkspaceAccessService, OpsMonitoringService

Layer 1 (depends on Layer 0 only):
  CompetitorService, CommentAnalysisService,
  IntentAnalysisService, CampaignService,
  UsageService, CollectionOrchestrationService

Layer 2 (depends on Layer 0-1):
  ActionRecommendationService, CampaignPerformanceService

Layer 3 (depends on Layer 0-2):
  ReportService
```

---

## 5. tRPC Router → Service Mapping

| Router               | File              | Status             | Service(s)                                               | Key Procedures                                                            |
| -------------------- | ----------------- | ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| `channelRouter`      | `channel.ts`      | Exists (refactor)  | `ChannelAnalysisService`, `CompetitorService`            | `list`, `getById`, `getPerformance`, `getSnapshots`, `compareCompetitors` |
| `contentRouter`      | `content.ts`      | New                | `ChannelAnalysisService`                                 | `listByChannel`, `getById`, `getTopPerforming`, `getMetrics`              |
| `commentRouter`      | `comment.ts`      | New                | `CommentAnalysisService`                                 | `listByContent`, `listByChannel`, `getAnalysisSummary`, `triggerAnalysis` |
| `faqRouter`          | `faq.ts`          | New                | `FAQService`                                             | `list`, `getById`, `updateStatus`, `merge`, `triggerClustering`           |
| `riskRouter`         | `risk.ts`         | New                | `RiskSignalService`                                      | `list`, `getById`, `resolve`, `escalate`, `getDashboard`                  |
| `keywordRouter`      | `keyword.ts`      | New                | `ListeningAnalysisService`, `TrendService`               | `list`, `track`, `untrack`, `getMetrics`, `getTrends`                     |
| `mentionRouter`      | `mention.ts`      | New                | `ListeningAnalysisService`                               | `listByKeyword`, `getVolume`, `getSentiment`                              |
| `intentRouter`       | `intent.ts`       | New (replace REST) | `IntentAnalysisService`                                  | `analyze`, `getGaps`, `getDistribution`, `listQueries`                    |
| `aeoRouter`          | `aeo.ts`          | New                | `GeoAeoService`                                          | `list`, `track`, `getVisibility`, `getEngineComparison`                   |
| `citationRouter`     | `citation.ts`     | New                | `CitationService`                                        | `list`, `create`, `getTopCited`, `getVisibilityImpact`                    |
| `reportRouter`       | `report.ts`       | New                | `ReportService`, `EvidenceService`                       | `list`, `generate`, `getById`, `addSection`, `publish`, `listTemplates`   |
| `actionRouter`       | `action.ts`       | New                | `ActionRecommendationService`                            | `list`, `getById`, `updateStatus`, `synthesize`                           |
| `influencerRouter`   | `influencer.ts`   | New                | `InfluencerExecutionService`                             | `search`, `list`, `getById`, `refreshMetrics`                             |
| `campaignRouter`     | `campaign.ts`     | New                | `CampaignService`, `CampaignPerformanceService`          | `list`, `create`, `getById`, `addCreator`, `addMeasurement`, `getROI`     |
| `workspaceRouter`    | `workspace.ts`    | Extend             | `WorkspaceAccessService`, `UsageService`                 | `getCurrent`, `getMembers`, `checkFeature`, `getUsage`, `getQuota`        |
| `opsRouter`          | `ops.ts`          | New                | `OpsMonitoringService`, `CollectionOrchestrationService` | `getHealth`, `listJobs`, `retryJob`, `getSchedule`                        |
| `notificationRouter` | `notification.ts` | New                | `RiskSignalService` (via NotificationRepository)         | `list`, `markRead`, `markAllRead`, `getUnreadCount`                       |

### Router Registration (in `packages/api/src/root.ts`)

```typescript
export const appRouter = createTRPCRouter({
  channel: channelRouter, // refactored
  content: contentRouter, // new
  comment: commentRouter, // new
  faq: faqRouter, // new
  risk: riskRouter, // new
  keyword: keywordRouter, // new
  mention: mentionRouter, // new
  intent: intentRouter, // new
  aeo: aeoRouter, // new
  citation: citationRouter, // new
  report: reportRouter, // new
  action: actionRouter, // new
  influencer: influencerRouter, // new
  campaign: campaignRouter, // new
  workspace: workspaceRouter, // extended
  ops: opsRouter, // new
  notification: notificationRouter, // new
});
```
