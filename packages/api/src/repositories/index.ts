import type { PrismaClient } from "@prisma/client";

export {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
  type DateRange,
} from "./base.repository";
export { ChannelRepository, type ChannelFilters } from "./channel.repository";
export {
  ContentRepository,
  type ContentFilters,
  type ContentSortField,
} from "./content.repository";
export {
  CommentRepository,
  type CommentFilters,
  type SentimentDistribution,
} from "./comment.repository";
export { KeywordRepository } from "./keyword.repository";
export {
  MentionRepository,
  type MentionFilters,
  type PlatformCount,
  type SentimentCount,
} from "./mention.repository";
export { TrendAnalyticsRepository } from "./trend-analytics.repository";
export {
  IntentRepository,
  type IntentKeywordFilters,
} from "./intent.repository";
export { AeoRepository } from "./aeo.repository";
export {
  CitationSourceRepository,
  type CitationSourceFilters,
} from "./citation-source.repository";
export { ReportRepository } from "./report.repository";
export { EvidenceAssetRepository } from "./evidence-asset.repository";
export {
  InsightActionRepository,
  type ActionStatusCount,
} from "./insight-action.repository";
export {
  InfluencerRepository,
  type InfluencerSearchFilters,
} from "./influencer.repository";
export { CampaignRepository } from "./campaign.repository";
export {
  WorkspaceRepository,
  type WorkspaceCapabilities,
} from "./workspace.repository";
export { UsageRepository } from "./usage.repository";
export { ScheduledJobRepository } from "./scheduled-job.repository";
export { NotificationRepository } from "./notification.repository";
export { FaqCandidateRepository } from "./faq-candidate.repository";
export {
  RiskSignalRepository,
  type RiskStatusCount,
} from "./risk-signal.repository";

import { ChannelRepository } from "./channel.repository";
import { ContentRepository } from "./content.repository";
import { CommentRepository } from "./comment.repository";
import { KeywordRepository } from "./keyword.repository";
import { MentionRepository } from "./mention.repository";
import { TrendAnalyticsRepository } from "./trend-analytics.repository";
import { IntentRepository } from "./intent.repository";
import { AeoRepository } from "./aeo.repository";
import { CitationSourceRepository } from "./citation-source.repository";
import { ReportRepository } from "./report.repository";
import { EvidenceAssetRepository } from "./evidence-asset.repository";
import { InsightActionRepository } from "./insight-action.repository";
import { InfluencerRepository } from "./influencer.repository";
import { CampaignRepository } from "./campaign.repository";
import { WorkspaceRepository } from "./workspace.repository";
import { UsageRepository } from "./usage.repository";
import { ScheduledJobRepository } from "./scheduled-job.repository";
import { NotificationRepository } from "./notification.repository";
import { FaqCandidateRepository } from "./faq-candidate.repository";
import { RiskSignalRepository } from "./risk-signal.repository";

/**
 * Factory function that instantiates all repositories with a shared PrismaClient.
 * Use this at application bootstrap to create a single set of repositories.
 */
export function createRepositories(prisma: PrismaClient) {
  return {
    channel: new ChannelRepository(prisma),
    content: new ContentRepository(prisma),
    comment: new CommentRepository(prisma),
    keyword: new KeywordRepository(prisma),
    mention: new MentionRepository(prisma),
    trendAnalytics: new TrendAnalyticsRepository(prisma),
    intent: new IntentRepository(prisma),
    aeo: new AeoRepository(prisma),
    citationSource: new CitationSourceRepository(prisma),
    report: new ReportRepository(prisma),
    evidenceAsset: new EvidenceAssetRepository(prisma),
    insightAction: new InsightActionRepository(prisma),
    influencer: new InfluencerRepository(prisma),
    campaign: new CampaignRepository(prisma),
    workspace: new WorkspaceRepository(prisma),
    usage: new UsageRepository(prisma),
    scheduledJob: new ScheduledJobRepository(prisma),
    notification: new NotificationRepository(prisma),
    faqCandidate: new FaqCandidateRepository(prisma),
    riskSignal: new RiskSignalRepository(prisma),
  };
}

/** Type representing the full set of instantiated repositories. */
export type Repositories = ReturnType<typeof createRepositories>;
