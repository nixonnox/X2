-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('YOUTUBE', 'INSTAGRAM', 'TIKTOK', 'X');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('BASIC', 'CONNECTED');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('PENDING', 'ACTIVE', 'SYNCING', 'ERROR', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'SHORT', 'REEL', 'POST', 'STORY', 'LIVE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('ACTIVE', 'DELETED', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SentimentType" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "KeywordStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "KeywordTrend" AS ENUM ('RISING', 'STABLE', 'DECLINING');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('SHORT_TERM', 'MID_TERM', 'LONG_TERM', 'WEEKLY_REPORT', 'MONTHLY_REPORT', 'CAMPAIGN_REPORT', 'COMPETITOR_REPORT', 'INTENT_REPORT', 'AEO_REPORT', 'FAQ_EXTRACTION', 'RISK_REPORT', 'FAQ_REPORT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CHANNEL_SYNC', 'CONTENT_SYNC', 'COMMENT_SYNC', 'KEYWORD_TRACK', 'COMPETITOR_SYNC', 'INSIGHT_GENERATE', 'USAGE_AGGREGATE', 'COMMENT_ANALYZE', 'AEO_CRAWL', 'INTENT_ANALYZE', 'CAMPAIGN_METRIC_SYNC', 'DATA_EXPORT', 'REPORT_GENERATE', 'FAQ_EXTRACT', 'RISK_DETECT', 'NOTIFICATION_SEND');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('ACTIVE', 'PAUSED', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STANDARD', 'VERTICAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "IndustryType" AS ENUM ('BEAUTY', 'FOOD_BEVERAGE', 'FASHION', 'TECH_SAAS', 'TRAVEL', 'FINANCE', 'GAMING', 'EDUCATION', 'HEALTHCARE', 'OTHER');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('OWNED', 'COMPETITOR', 'MONITORING', 'INFLUENCER');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InsightActionType" AS ENUM ('CONTENT_CREATE', 'CONTENT_OPTIMIZE', 'SEO_UPDATE', 'COMMENT_REPLY', 'COMPETITOR_WATCH', 'KEYWORD_TARGET', 'STRATEGY_ADJUST', 'RISK_MITIGATE', 'INFLUENCER_OUTREACH', 'CAMPAIGN_LAUNCH');

-- CreateEnum
CREATE TYPE "SourceModule" AS ENUM ('SEARCH_INTENT', 'SOCIAL_INTELLIGENCE', 'COMMENT_INTELLIGENCE', 'GEO_AEO', 'CAMPAIGN_MEASURE', 'MANUAL', 'FAQ_ENGINE', 'RISK_ENGINE');

-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntentCategory" AS ENUM ('DISCOVERY', 'COMPARISON', 'ACTION', 'TROUBLESHOOTING', 'NAVIGATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "GapType" AS ENUM ('BLUE_OCEAN', 'OPPORTUNITY', 'COMPETITIVE', 'SATURATED');

-- CreateEnum
CREATE TYPE "MentionMediaType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'LIVE');

-- CreateEnum
CREATE TYPE "MentionMatchType" AS ENUM ('EXACT', 'HASHTAG', 'CONTEXT');

-- CreateEnum
CREATE TYPE "InfluencerTier" AS ENUM ('NANO', 'MICRO', 'MID', 'MACRO', 'MEGA');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('INFLUENCER', 'CONTENT', 'PAID', 'ORGANIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('PROPOSED', 'NEGOTIATING', 'CONTRACTED', 'CREATING', 'PUBLISHED', 'COMPLETED', 'DECLINED');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('FIXED', 'REVENUE_SHARE', 'PRODUCT_GIFTING', 'HYBRID');

-- CreateEnum
CREATE TYPE "CampaignContentStatus" AS ENUM ('PLANNED', 'DRAFT_REVIEW', 'PUBLISHED', 'TRACKING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AeoEngine" AS ENUM ('GOOGLE_AI_OVERVIEW', 'PERPLEXITY', 'BING_COPILOT', 'CHATGPT_SEARCH');

-- CreateEnum
CREATE TYPE "CitationSourceType" AS ENUM ('BLOG_POST', 'LANDING_PAGE', 'PRODUCT_PAGE', 'FAQ_PAGE', 'VIDEO', 'RESEARCH_REPORT', 'PRESS_RELEASE', 'SOCIAL_POST');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('METRIC', 'CHART', 'TABLE', 'QUOTE', 'COMPARISON', 'RANKING', 'HEATMAP', 'DISTRIBUTION');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('CHANNEL_SNAPSHOT', 'CONTENT_METRIC', 'COMMENT_ANALYSIS', 'INTENT_RESULT', 'AEO_SNAPSHOT', 'CAMPAIGN_METRIC', 'KEYWORD_METRIC', 'RAW_MENTION', 'FAQ_CANDIDATE', 'RISK_SIGNAL');

-- CreateEnum
CREATE TYPE "ExplorerDataType" AS ENUM ('CONTENT', 'COMMENT', 'CHANNEL_METRIC', 'KEYWORD_METRIC', 'INTENT_RESULT', 'AEO_SNAPSHOT', 'RAW_MENTION', 'CAMPAIGN_METRIC', 'FAQ', 'RISK_SIGNAL');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'EXCEL', 'JSON');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "FAQStatus" AS ENUM ('DETECTED', 'REVIEWING', 'ANSWERED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RiskSignalStatus" AS ENUM ('ACTIVE', 'INVESTIGATING', 'RESPONDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SYNC_FAILURE', 'TOKEN_LIMIT_WARNING', 'RISK_DETECTED', 'OAUTH_EXPIRED', 'REPORT_READY', 'CAMPAIGN_UPDATE', 'PLAN_LIMIT_WARNING', 'SENTIMENT_SPIKE', 'CITATION_CHANGE', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('SCHEDULED_CRON', 'RISK_SPIKE', 'SENTIMENT_SPIKE', 'FAQ_SURGE', 'KEYWORD_TREND_CHANGE', 'CAMPAIGN_ANOMALY', 'GEO_SCORE_CHANGE', 'COLLECTION_FAILURE', 'REPORT_READY', 'ACTION_CREATED', 'COLLECTION_COMPLETE', 'ANALYSIS_COMPLETE', 'CAMPAIGN_ENDED');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('GENERATE_REPORT', 'DELIVER_REPORT', 'SEND_ALERT', 'CREATE_ACTION', 'ESCALATE_RISK', 'UPDATE_FAQ_QUEUE', 'RECOMMEND_GEO_FIX', 'CAMPAIGN_FOLLOWUP', 'NOTIFY_TEAM', 'PAUSE_COLLECTION');

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('IN_APP', 'EMAIL', 'SLACK_WEBHOOK', 'CUSTOM_WEBHOOK');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "TemporalPhase" AS ENUM ('BEFORE', 'CURRENT', 'AFTER');

-- CreateEnum
CREATE TYPE "SearchPathType" AS ENUM ('DIRECT', 'AUTOCOMPLETE', 'RELATED', 'TEMPORAL', 'CO_SEARCH');

-- CreateEnum
CREATE TYPE "BrandContext" AS ENUM ('DIRECT', 'COMPARISON', 'ALTERNATIVE', 'RELATED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "planTier" "PlanTier" NOT NULL DEFAULT 'STANDARD',
    "industryType" "IndustryType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxChannels" INTEGER NOT NULL DEFAULT 3,
    "maxContentsPerMonth" INTEGER NOT NULL DEFAULT 500,
    "maxCommentsPerMonth" INTEGER NOT NULL DEFAULT 1000,
    "maxAiTokensPerDay" INTEGER NOT NULL DEFAULT 5000,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "maxReportsPerMonth" INTEGER NOT NULL DEFAULT 3,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "canAccessApi" BOOLEAN NOT NULL DEFAULT false,
    "maxVerticalPacks" INTEGER NOT NULL DEFAULT 0,
    "geoAeoEnabled" BOOLEAN NOT NULL DEFAULT false,
    "influencerExecutionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "evidenceReportingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "automationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxAutomationRulesPerMonth" INTEGER NOT NULL DEFAULT 0,
    "maxReportAutomationsPerMonth" INTEGER NOT NULL DEFAULT 0,
    "alertAutomationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platforms" (
    "id" TEXT NOT NULL,
    "type" "SocialPlatform" NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "apiBaseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformChannelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "connectionType" "ConnectionType" NOT NULL DEFAULT 'BASIC',
    "status" "ChannelStatus" NOT NULL DEFAULT 'ACTIVE',
    "channelType" "ChannelType" NOT NULL DEFAULT 'OWNED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncStatus" "SyncStatus",
    "syncErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_connections" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "scopes" TEXT[],
    "status" "ConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "channel_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_snapshots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "totalViews" BIGINT NOT NULL DEFAULT 0,
    "avgEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgViewsPerContent" INTEGER,
    "followerGrowth" INTEGER,
    "followerGrowthRate" DOUBLE PRECISION,
    "estimatedReach" INTEGER,
    "rawMetrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "channel_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformContentId" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metrics_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "content_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformCommentId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorProfileUrl" TEXT,
    "text" TEXT NOT NULL,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "isReply" BOOLEAN NOT NULL DEFAULT false,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentId" TEXT NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_analysis" (
    "id" TEXT NOT NULL,
    "sentiment" "SentimentType" NOT NULL,
    "sentimentScore" DOUBLE PRECISION NOT NULL,
    "sentimentReason" TEXT,
    "topics" TEXT[],
    "topicConfidence" DOUBLE PRECISION,
    "language" TEXT,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isQuestion" BOOLEAN NOT NULL DEFAULT false,
    "questionType" TEXT,
    "isRisk" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" "RiskLevel",
    "suggestedReply" TEXT,
    "analyzerModel" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "comment_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "category" TEXT,
    "status" "KeywordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_metrics_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "trend" "KeywordTrend" NOT NULL DEFAULT 'STABLE',
    "changeRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "relatedTerms" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keywordId" TEXT NOT NULL,

    CONSTRAINT "keyword_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_channels" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformChannelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "competitor_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_reports" (
    "id" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "period" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "shareToken" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "generatedBy" TEXT,

    CONSTRAINT "insight_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insight_actions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionType" "InsightActionType",
    "priority" "ActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assigneeId" TEXT,
    "sourceModule" "SourceModule",
    "sourceEntityId" TEXT,
    "sourceReason" TEXT,
    "outcome" TEXT,
    "impactMetric" JSONB,
    "campaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT,

    CONSTRAINT "insight_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "cronExpr" TEXT NOT NULL,
    "payload" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastError" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "jobGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_metrics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "channelCount" INTEGER NOT NULL DEFAULT 0,
    "contentCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "apiCallCount" INTEGER NOT NULL DEFAULT 0,
    "aiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "aiCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "exportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "usage_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_queries" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "seedKeyword" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "maxDepth" INTEGER NOT NULL DEFAULT 2,
    "maxKeywords" INTEGER NOT NULL DEFAULT 150,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "statusMessage" TEXT,
    "resultSummary" JSONB,
    "resultGraph" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "tokenUsage" INTEGER,
    "estimatedCostUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intent_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intent_keyword_results" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "searchVolume" INTEGER,
    "socialVolume" INTEGER,
    "trend" "KeywordTrend",
    "intentCategory" "IntentCategory" NOT NULL,
    "subIntent" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gapScore" DOUBLE PRECISION,
    "gapType" "GapType",
    "monthlyVolumes" JSONB,
    "socialBreakdown" JSONB,

    CONSTRAINT "intent_keyword_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trend_keyword_analytics" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "period" TEXT NOT NULL,
    "avgSearchVolume" INTEGER,
    "peakSearchVolume" INTEGER,
    "searchTrend" "KeywordTrend" NOT NULL DEFAULT 'STABLE',
    "seasonalityScore" DOUBLE PRECISION,
    "socialContentCount" INTEGER NOT NULL DEFAULT 0,
    "socialAvgViews" INTEGER,
    "socialAvgEngagement" DOUBLE PRECISION,
    "gapScore" DOUBLE PRECISION,
    "relatedKeywords" JSONB,
    "topContents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trend_keyword_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_social_mentions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "postUrl" TEXT,
    "authorName" TEXT,
    "authorHandle" TEXT,
    "authorFollowers" INTEGER,
    "text" TEXT NOT NULL,
    "mediaType" "MentionMediaType",
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchedKeyword" TEXT NOT NULL,
    "matchType" "MentionMatchType" NOT NULL,
    "sentiment" "SentimentType",
    "topics" TEXT[],
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_social_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_profiles" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "categories" TEXT[],
    "tierLevel" "InfluencerTier" NOT NULL,
    "contentStyle" TEXT[],
    "targetAudience" TEXT,
    "country" TEXT,
    "avgViewsRecent" INTEGER,
    "avgEngagementRecent" DOUBLE PRECISION,
    "estimatedReach" INTEGER,
    "growthRate30d" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "totalCampaigns" INTEGER NOT NULL DEFAULT 0,
    "avgCampaignRoi" DOUBLE PRECISION,
    "contactEmail" TEXT,
    "contactNote" TEXT,
    "managementCompany" TEXT,
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "campaignType" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "totalBudget" DOUBLE PRECISION,
    "spentBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "kpiTargets" JSONB,
    "sourceInsightId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_creators" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channelId" TEXT,
    "influencerProfileId" TEXT,
    "outreachStatus" "OutreachStatus" NOT NULL DEFAULT 'PROPOSED',
    "compensationType" "CompensationType",
    "compensationAmount" DOUBLE PRECISION,
    "compensationNote" TEXT,
    "deliverables" JSONB,
    "contactLog" JSONB,
    "contractUrl" TEXT,
    "performanceSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_contents" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignCreatorId" TEXT,
    "contentId" TEXT,
    "platformContentUrl" TEXT,
    "platform" "SocialPlatform",
    "status" "CampaignContentStatus" NOT NULL DEFAULT 'PLANNED',
    "publishedAt" TIMESTAMP(3),
    "trackingStartedAt" TIMESTAMP(3),
    "trackingEndedAt" TIMESTAMP(3),
    "contentRequirements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalReach" INTEGER NOT NULL DEFAULT 0,
    "totalEngagement" INTEGER NOT NULL DEFAULT 0,
    "totalNewFollowers" INTEGER NOT NULL DEFAULT 0,
    "spentBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contentMetrics" JSONB,
    "derivedMetrics" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_measurements" (
    "id" TEXT NOT NULL,
    "campaignContentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedReach" INTEGER,
    "brandMentionCount" INTEGER,
    "sentimentSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roi_calculations" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costBreakdown" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "totalReach" INTEGER NOT NULL,
    "totalEngagement" INTEGER NOT NULL,
    "estimatedMediaValue" DOUBLE PRECISION,
    "newFollowers" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "cpv" DOUBLE PRECISION,
    "cpe" DOUBLE PRECISION,
    "costPerFollower" DOUBLE PRECISION,
    "benchmarkComparison" JSONB,
    "aiSummary" TEXT,

    CONSTRAINT "roi_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_keywords" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "targetBrand" TEXT,
    "competitorBrands" TEXT[],
    "status" "KeywordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aeo_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aeo_snapshots" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "engine" "AeoEngine" NOT NULL,
    "aiResponse" TEXT,
    "citedSources" JSONB,
    "brandMentioned" BOOLEAN NOT NULL DEFAULT false,
    "brandCitedRank" INTEGER,
    "competitorMentions" JSONB,
    "visibilityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aeo_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citation_ready_sources" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "sourceType" "CitationSourceType" NOT NULL,
    "contentSummary" TEXT,
    "targetKeywords" TEXT[],
    "primaryTopic" TEXT,
    "currentCitationCount" INTEGER NOT NULL DEFAULT 0,
    "lastCitedDate" TIMESTAMP(3),
    "lastCitedEngine" "AeoEngine",
    "citationHistory" JSONB,
    "geoOptimized" BOOLEAN NOT NULL DEFAULT false,
    "lastOptimizedAt" TIMESTAMP(3),
    "optimizationNotes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citation_ready_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vertical_packs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" "IndustryType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "seedKeywords" JSONB,
    "benchmarkBaseline" JSONB,
    "topicTaxonomy" JSONB,
    "competitorPresets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vertical_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_vertical_packs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "verticalPackId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_vertical_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_sections" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "narrative" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_assets" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "narrative" TEXT,
    "dataSourceType" "DataSourceType" NOT NULL,
    "dataEntityIds" TEXT[],
    "dataQuery" JSONB,
    "snapshotDate" TIMESTAMP(3),
    "visualization" JSONB,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sectionDefinitions" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "verticalPackId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataType" "ExplorerDataType" NOT NULL,
    "filterConfig" JSONB NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_jobs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "dataType" "ExplorerDataType" NOT NULL,
    "filterConfig" JSONB NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'QUEUED',
    "rowCount" INTEGER,
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_candidates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionVariants" TEXT[],
    "category" TEXT,
    "sourceCommentIds" TEXT[],
    "mentionCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "hasAnswer" BOOLEAN NOT NULL DEFAULT false,
    "answerUrl" TEXT,
    "answerContentId" TEXT,
    "urgencyScore" DOUBLE PRECISION,
    "businessImpact" TEXT,
    "suggestedAction" TEXT,
    "status" "FAQStatus" NOT NULL DEFAULT 'DETECTED',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_signals" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "riskType" TEXT NOT NULL,
    "severity" "RiskLevel" NOT NULL,
    "sourceCommentIds" TEXT[],
    "sourceMentionIds" TEXT[],
    "sampleTexts" TEXT[],
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "firstOccurrence" TIMESTAMP(3) NOT NULL,
    "lastOccurrence" TIMESTAMP(3) NOT NULL,
    "status" "RiskSignalStatus" NOT NULL DEFAULT 'ACTIVE',
    "assigneeId" TEXT,
    "responseNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "rootCauseAnalysis" TEXT,
    "recommendedAction" TEXT,
    "estimatedImpact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "channels" TEXT[],
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerCondition" JSONB NOT NULL,
    "cronExpr" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "actionType" "AutomationActionType" NOT NULL,
    "actionConfig" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "requiredPlan" "Plan",
    "allowedRoles" TEXT[],
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastTriggeredAt" TIMESTAMP(3),
    "totalExecutions" INTEGER NOT NULL DEFAULT 0,
    "successfulExecutions" INTEGER NOT NULL DEFAULT 0,
    "failedExecutions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_executions" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "triggerPayload" JSONB,
    "actionType" "AutomationActionType" NOT NULL,
    "actionResult" JSONB,
    "errorMessage" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "channel" "DeliveryChannel" NOT NULL,
    "recipientId" TEXT,
    "recipientEmail" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_paths" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "fromKeyword" TEXT NOT NULL,
    "toKeyword" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "phase" "TemporalPhase" NOT NULL,
    "intent" "IntentCategory" NOT NULL,
    "pathType" "SearchPathType" NOT NULL DEFAULT 'DIRECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personas" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dominantIntent" "IntentCategory" NOT NULL,
    "dominantPhase" "TemporalPhase" NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "traits" JSONB,
    "topQuestions" TEXT[],
    "contentStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona_keywords" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "persona_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_cluster_results" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "clusterIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "centroid" TEXT NOT NULL,
    "dominantIntent" "IntentCategory" NOT NULL,
    "dominantPhase" "TemporalPhase" NOT NULL,
    "avgGapScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "gptAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_cluster_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_journeys" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "fromBrand" TEXT NOT NULL,
    "toBrand" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "phase" "TemporalPhase" NOT NULL,
    "intent" "IntentCategory" NOT NULL,
    "context" "BrandContext" NOT NULL DEFAULT 'RELATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_analysis_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "seedKeyword" TEXT NOT NULL,
    "industryType" TEXT NOT NULL,
    "industryLabel" TEXT NOT NULL,
    "signalQuality" JSONB NOT NULL,
    "fusionResult" JSONB NOT NULL,
    "taxonomyMapping" JSONB,
    "benchmarkComparison" JSONB,
    "benchmarkBaseline" JSONB,
    "socialIntegration" JSONB,
    "additionalInsights" JSONB,
    "additionalWarnings" JSONB,
    "additionalEvidence" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshness" TEXT NOT NULL DEFAULT 'fresh',
    "isPartial" BOOLEAN NOT NULL DEFAULT false,
    "isMockOnly" BOOLEAN NOT NULL DEFAULT false,
    "isStaleBased" BOOLEAN NOT NULL DEFAULT false,
    "providerCoverage" JSONB,
    "socialMentionSnapshot" JSONB,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_analysis_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_comparison_runs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "comparisonType" TEXT NOT NULL,
    "leftLabel" TEXT NOT NULL,
    "leftKeyword" TEXT NOT NULL,
    "leftIndustry" TEXT NOT NULL,
    "leftRunId" TEXT,
    "rightLabel" TEXT NOT NULL,
    "rightKeyword" TEXT NOT NULL,
    "rightIndustry" TEXT NOT NULL,
    "rightRunId" TEXT,
    "comparisonResult" JSONB NOT NULL,
    "overallDifferenceScore" INTEGER NOT NULL DEFAULT 0,
    "leftPeriodStart" TIMESTAMP(3),
    "leftPeriodEnd" TIMESTAMP(3),
    "rightPeriodStart" TIMESTAMP(3),
    "rightPeriodEnd" TIMESTAMP(3),
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_comparison_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_mention_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "keyword" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "buzzLevel" TEXT NOT NULL DEFAULT 'NONE',
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "neutralCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "unclassifiedCount" INTEGER NOT NULL DEFAULT 0,
    "providerStatuses" JSONB NOT NULL,
    "topicSignals" JSONB,
    "sampleMentions" JSONB,
    "freshness" TEXT NOT NULL DEFAULT 'fresh',
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_mention_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "benchmark_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "keyword" TEXT NOT NULL,
    "industryType" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "comparisons" JSONB NOT NULL,
    "highlights" JSONB,
    "warnings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intelligence_keywords" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "industryType" TEXT,
    "industryLabel" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "analysisCount" INTEGER NOT NULL DEFAULT 1,
    "lastConfidence" DOUBLE PRECISION,
    "lastFreshness" TEXT,
    "lastSignalHint" TEXT,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "intelligence_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_alert_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelInApp" BOOLEAN NOT NULL DEFAULT true,
    "channelEmail" BOOLEAN NOT NULL DEFAULT false,
    "channelWebhook" BOOLEAN NOT NULL DEFAULT false,
    "webhookUrl" TEXT,
    "enableWarningSpike" BOOLEAN NOT NULL DEFAULT true,
    "enableLowConfidence" BOOLEAN NOT NULL DEFAULT true,
    "enableBenchmarkDecline" BOOLEAN NOT NULL DEFAULT true,
    "enableProviderCoverage" BOOLEAN NOT NULL DEFAULT true,
    "warningSpike_minCount" INTEGER NOT NULL DEFAULT 3,
    "lowConfidence_threshold" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "benchmarkDecline_threshold" INTEGER NOT NULL DEFAULT 15,
    "globalCooldownMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxAlertsPerDay" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_alert_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_userId_workspaceId_key" ON "workspace_members"("userId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_type_key" ON "platforms"("type");

-- CreateIndex
CREATE INDEX "channels_platform_idx" ON "channels"("platform");

-- CreateIndex
CREATE INDEX "channels_channelType_idx" ON "channels"("channelType");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE UNIQUE INDEX "channels_projectId_platform_platformChannelId_key" ON "channels"("projectId", "platform", "platformChannelId");

-- CreateIndex
CREATE INDEX "channel_connections_channelId_idx" ON "channel_connections"("channelId");

-- CreateIndex
CREATE INDEX "channel_snapshots_channelId_date_idx" ON "channel_snapshots"("channelId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "channel_snapshots_channelId_date_key" ON "channel_snapshots"("channelId", "date");

-- CreateIndex
CREATE INDEX "contents_platform_idx" ON "contents"("platform");

-- CreateIndex
CREATE INDEX "contents_publishedAt_idx" ON "contents"("publishedAt");

-- CreateIndex
CREATE INDEX "contents_channelId_publishedAt_idx" ON "contents"("channelId", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "contents_channelId_platformContentId_key" ON "contents"("channelId", "platformContentId");

-- CreateIndex
CREATE INDEX "content_metrics_daily_date_idx" ON "content_metrics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "content_metrics_daily_contentId_date_key" ON "content_metrics_daily"("contentId", "date");

-- CreateIndex
CREATE INDEX "comments_contentId_publishedAt_idx" ON "comments"("contentId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "comments_publishedAt_idx" ON "comments"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "comments_contentId_platformCommentId_key" ON "comments"("contentId", "platformCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "comment_analysis_commentId_key" ON "comment_analysis"("commentId");

-- CreateIndex
CREATE INDEX "comment_analysis_isRisk_idx" ON "comment_analysis"("isRisk");

-- CreateIndex
CREATE INDEX "comment_analysis_isQuestion_idx" ON "comment_analysis"("isQuestion");

-- CreateIndex
CREATE INDEX "comment_analysis_sentiment_idx" ON "comment_analysis"("sentiment");

-- CreateIndex
CREATE INDEX "comment_analysis_sentiment_isRisk_idx" ON "comment_analysis"("sentiment", "isRisk");

-- CreateIndex
CREATE UNIQUE INDEX "keywords_projectId_keyword_key" ON "keywords"("projectId", "keyword");

-- CreateIndex
CREATE INDEX "keyword_metrics_daily_date_idx" ON "keyword_metrics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_metrics_daily_keywordId_date_key" ON "keyword_metrics_daily"("keywordId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_channels_projectId_platform_platformChannelId_key" ON "competitor_channels"("projectId", "platform", "platformChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "insight_reports_shareToken_key" ON "insight_reports"("shareToken");

-- CreateIndex
CREATE INDEX "insight_reports_type_idx" ON "insight_reports"("type");

-- CreateIndex
CREATE INDEX "insight_reports_createdAt_idx" ON "insight_reports"("createdAt");

-- CreateIndex
CREATE INDEX "insight_actions_status_idx" ON "insight_actions"("status");

-- CreateIndex
CREATE INDEX "insight_actions_priority_status_idx" ON "insight_actions"("priority", "status");

-- CreateIndex
CREATE INDEX "insight_actions_sourceModule_idx" ON "insight_actions"("sourceModule");

-- CreateIndex
CREATE INDEX "scheduled_jobs_status_nextRunAt_idx" ON "scheduled_jobs"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "scheduled_jobs_jobGroup_idx" ON "scheduled_jobs"("jobGroup");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "usage_metrics_date_idx" ON "usage_metrics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "usage_metrics_workspaceId_date_key" ON "usage_metrics"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "intent_queries_projectId_createdAt_idx" ON "intent_queries"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "intent_keyword_results_queryId_idx" ON "intent_keyword_results"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "intent_keyword_results_queryId_keyword_key" ON "intent_keyword_results"("queryId", "keyword");

-- CreateIndex
CREATE INDEX "trend_keyword_analytics_projectId_period_idx" ON "trend_keyword_analytics"("projectId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "trend_keyword_analytics_projectId_keyword_locale_period_key" ON "trend_keyword_analytics"("projectId", "keyword", "locale", "period");

-- CreateIndex
CREATE INDEX "raw_social_mentions_projectId_publishedAt_idx" ON "raw_social_mentions"("projectId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "raw_social_mentions_matchedKeyword_idx" ON "raw_social_mentions"("matchedKeyword");

-- CreateIndex
CREATE INDEX "raw_social_mentions_platform_idx" ON "raw_social_mentions"("platform");

-- CreateIndex
CREATE INDEX "raw_social_mentions_sentiment_idx" ON "raw_social_mentions"("sentiment");

-- CreateIndex
CREATE UNIQUE INDEX "raw_social_mentions_projectId_platform_platformPostId_key" ON "raw_social_mentions"("projectId", "platform", "platformPostId");

-- CreateIndex
CREATE UNIQUE INDEX "influencer_profiles_channelId_key" ON "influencer_profiles"("channelId");

-- CreateIndex
CREATE INDEX "influencer_profiles_tierLevel_idx" ON "influencer_profiles"("tierLevel");

-- CreateIndex
CREATE INDEX "influencer_profiles_overallScore_idx" ON "influencer_profiles"("overallScore" DESC);

-- CreateIndex
CREATE INDEX "campaigns_projectId_status_idx" ON "campaigns"("projectId", "status");

-- CreateIndex
CREATE INDEX "campaigns_startDate_endDate_idx" ON "campaigns"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_creators_campaignId_channelId_key" ON "campaign_creators"("campaignId", "channelId");

-- CreateIndex
CREATE INDEX "campaign_contents_campaignId_idx" ON "campaign_contents"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_contents_campaignCreatorId_idx" ON "campaign_contents"("campaignCreatorId");

-- CreateIndex
CREATE INDEX "campaign_contents_status_idx" ON "campaign_contents"("status");

-- CreateIndex
CREATE INDEX "campaign_metrics_campaignId_date_idx" ON "campaign_metrics"("campaignId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaignId_date_key" ON "campaign_metrics"("campaignId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "post_measurements_campaignContentId_date_key" ON "post_measurements"("campaignContentId", "date");

-- CreateIndex
CREATE INDEX "roi_calculations_campaignId_idx" ON "roi_calculations"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "aeo_keywords_projectId_keyword_locale_key" ON "aeo_keywords"("projectId", "keyword", "locale");

-- CreateIndex
CREATE INDEX "aeo_snapshots_keywordId_date_idx" ON "aeo_snapshots"("keywordId", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "aeo_snapshots_keywordId_date_engine_key" ON "aeo_snapshots"("keywordId", "date", "engine");

-- CreateIndex
CREATE INDEX "citation_ready_sources_projectId_isActive_idx" ON "citation_ready_sources"("projectId", "isActive");

-- CreateIndex
CREATE INDEX "citation_ready_sources_currentCitationCount_idx" ON "citation_ready_sources"("currentCitationCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "citation_ready_sources_projectId_url_key" ON "citation_ready_sources"("projectId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "vertical_packs_slug_key" ON "vertical_packs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_vertical_packs_workspaceId_verticalPackId_key" ON "workspace_vertical_packs"("workspaceId", "verticalPackId");

-- CreateIndex
CREATE INDEX "report_sections_reportId_order_idx" ON "report_sections"("reportId", "order");

-- CreateIndex
CREATE INDEX "evidence_assets_sectionId_order_idx" ON "evidence_assets"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "report_templates_slug_key" ON "report_templates"("slug");

-- CreateIndex
CREATE INDEX "report_templates_verticalPackId_idx" ON "report_templates"("verticalPackId");

-- CreateIndex
CREATE INDEX "saved_filters_projectId_idx" ON "saved_filters"("projectId");

-- CreateIndex
CREATE INDEX "saved_filters_createdBy_idx" ON "saved_filters"("createdBy");

-- CreateIndex
CREATE INDEX "data_export_jobs_projectId_status_idx" ON "data_export_jobs"("projectId", "status");

-- CreateIndex
CREATE INDEX "faq_candidates_projectId_status_idx" ON "faq_candidates"("projectId", "status");

-- CreateIndex
CREATE INDEX "faq_candidates_mentionCount_idx" ON "faq_candidates"("mentionCount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "faq_candidates_projectId_question_key" ON "faq_candidates"("projectId", "question");

-- CreateIndex
CREATE INDEX "risk_signals_projectId_status_idx" ON "risk_signals"("projectId", "status");

-- CreateIndex
CREATE INDEX "risk_signals_severity_idx" ON "risk_signals"("severity");

-- CreateIndex
CREATE INDEX "risk_signals_detectedAt_idx" ON "risk_signals"("detectedAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_workspaceId_createdAt_idx" ON "notifications"("workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "automation_rules_workspaceId_isEnabled_idx" ON "automation_rules"("workspaceId", "isEnabled");

-- CreateIndex
CREATE INDEX "automation_rules_triggerType_idx" ON "automation_rules"("triggerType");

-- CreateIndex
CREATE UNIQUE INDEX "automation_executions_idempotencyKey_key" ON "automation_executions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "automation_executions_workspaceId_status_idx" ON "automation_executions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "automation_executions_ruleId_createdAt_idx" ON "automation_executions"("ruleId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "automation_executions_status_nextRetryAt_idx" ON "automation_executions"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "automation_executions_idempotencyKey_idx" ON "automation_executions"("idempotencyKey");

-- CreateIndex
CREATE INDEX "delivery_logs_executionId_idx" ON "delivery_logs"("executionId");

-- CreateIndex
CREATE INDEX "delivery_logs_status_nextRetryAt_idx" ON "delivery_logs"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "delivery_logs_channel_status_idx" ON "delivery_logs"("channel", "status");

-- CreateIndex
CREATE INDEX "search_paths_queryId_idx" ON "search_paths"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "search_paths_queryId_fromKeyword_toKeyword_key" ON "search_paths"("queryId", "fromKeyword", "toKeyword");

-- CreateIndex
CREATE INDEX "personas_queryId_idx" ON "personas"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "persona_keywords_personaId_keyword_key" ON "persona_keywords"("personaId", "keyword");

-- CreateIndex
CREATE INDEX "keyword_cluster_results_queryId_idx" ON "keyword_cluster_results"("queryId");

-- CreateIndex
CREATE INDEX "brand_journeys_queryId_idx" ON "brand_journeys"("queryId");

-- CreateIndex
CREATE UNIQUE INDEX "brand_journeys_queryId_fromBrand_toBrand_key" ON "brand_journeys"("queryId", "fromBrand", "toBrand");

-- CreateIndex
CREATE INDEX "intelligence_analysis_runs_projectId_seedKeyword_idx" ON "intelligence_analysis_runs"("projectId", "seedKeyword");

-- CreateIndex
CREATE INDEX "intelligence_analysis_runs_projectId_analyzedAt_idx" ON "intelligence_analysis_runs"("projectId", "analyzedAt" DESC);

-- CreateIndex
CREATE INDEX "intelligence_analysis_runs_seedKeyword_industryType_analyze_idx" ON "intelligence_analysis_runs"("seedKeyword", "industryType", "analyzedAt" DESC);

-- CreateIndex
CREATE INDEX "intelligence_comparison_runs_projectId_analyzedAt_idx" ON "intelligence_comparison_runs"("projectId", "analyzedAt" DESC);

-- CreateIndex
CREATE INDEX "intelligence_comparison_runs_projectId_comparisonType_idx" ON "intelligence_comparison_runs"("projectId", "comparisonType");

-- CreateIndex
CREATE INDEX "social_mention_snapshots_projectId_keyword_date_idx" ON "social_mention_snapshots"("projectId", "keyword", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "social_mention_snapshots_projectId_keyword_date_key" ON "social_mention_snapshots"("projectId", "keyword", "date");

-- CreateIndex
CREATE INDEX "benchmark_snapshots_projectId_keyword_date_idx" ON "benchmark_snapshots"("projectId", "keyword", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "benchmark_snapshots_projectId_keyword_industryType_date_key" ON "benchmark_snapshots"("projectId", "keyword", "industryType", "date");

-- CreateIndex
CREATE INDEX "intelligence_keywords_projectId_userId_lastAnalyzedAt_idx" ON "intelligence_keywords"("projectId", "userId", "lastAnalyzedAt" DESC);

-- CreateIndex
CREATE INDEX "intelligence_keywords_projectId_userId_isSaved_idx" ON "intelligence_keywords"("projectId", "userId", "isSaved");

-- CreateIndex
CREATE UNIQUE INDEX "intelligence_keywords_projectId_userId_keyword_key" ON "intelligence_keywords"("projectId", "userId", "keyword");

-- CreateIndex
CREATE UNIQUE INDEX "user_alert_preferences_userId_key" ON "user_alert_preferences"("userId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_connections" ADD CONSTRAINT "channel_connections_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_snapshots" ADD CONSTRAINT "channel_snapshots_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metrics_daily" ADD CONSTRAINT "content_metrics_daily_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_analysis" ADD CONSTRAINT "comment_analysis_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_metrics_daily" ADD CONSTRAINT "keyword_metrics_daily_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitor_channels" ADD CONSTRAINT "competitor_channels_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_reports" ADD CONSTRAINT "insight_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_reports" ADD CONSTRAINT "insight_reports_generatedBy_fkey" FOREIGN KEY ("generatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_actions" ADD CONSTRAINT "insight_actions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insight_actions" ADD CONSTRAINT "insight_actions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "insight_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_metrics" ADD CONSTRAINT "usage_metrics_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_queries" ADD CONSTRAINT "intent_queries_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intent_keyword_results" ADD CONSTRAINT "intent_keyword_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trend_keyword_analytics" ADD CONSTRAINT "trend_keyword_analytics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_social_mentions" ADD CONSTRAINT "raw_social_mentions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_profiles" ADD CONSTRAINT "influencer_profiles_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_creators" ADD CONSTRAINT "campaign_creators_influencerProfileId_fkey" FOREIGN KEY ("influencerProfileId") REFERENCES "influencer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contents" ADD CONSTRAINT "campaign_contents_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_contents" ADD CONSTRAINT "campaign_contents_campaignCreatorId_fkey" FOREIGN KEY ("campaignCreatorId") REFERENCES "campaign_creators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_measurements" ADD CONSTRAINT "post_measurements_campaignContentId_fkey" FOREIGN KEY ("campaignContentId") REFERENCES "campaign_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roi_calculations" ADD CONSTRAINT "roi_calculations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_keywords" ADD CONSTRAINT "aeo_keywords_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aeo_snapshots" ADD CONSTRAINT "aeo_snapshots_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "aeo_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citation_ready_sources" ADD CONSTRAINT "citation_ready_sources_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_vertical_packs" ADD CONSTRAINT "workspace_vertical_packs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_vertical_packs" ADD CONSTRAINT "workspace_vertical_packs_verticalPackId_fkey" FOREIGN KEY ("verticalPackId") REFERENCES "vertical_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_sections" ADD CONSTRAINT "report_sections_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "insight_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_assets" ADD CONSTRAINT "evidence_assets_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "report_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_templates" ADD CONSTRAINT "report_templates_verticalPackId_fkey" FOREIGN KEY ("verticalPackId") REFERENCES "vertical_packs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faq_candidates" ADD CONSTRAINT "faq_candidates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_signals" ADD CONSTRAINT "risk_signals_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_executions" ADD CONSTRAINT "automation_executions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_logs" ADD CONSTRAINT "delivery_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "automation_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_paths" ADD CONSTRAINT "search_paths_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personas" ADD CONSTRAINT "personas_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona_keywords" ADD CONSTRAINT "persona_keywords_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_cluster_results" ADD CONSTRAINT "keyword_cluster_results_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_journeys" ADD CONSTRAINT "brand_journeys_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "intent_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_analysis_runs" ADD CONSTRAINT "intelligence_analysis_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_comparison_runs" ADD CONSTRAINT "intelligence_comparison_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_mention_snapshots" ADD CONSTRAINT "social_mention_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "benchmark_snapshots" ADD CONSTRAINT "benchmark_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intelligence_keywords" ADD CONSTRAINT "intelligence_keywords_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_alert_preferences" ADD CONSTRAINT "user_alert_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
