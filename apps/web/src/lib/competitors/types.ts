import type { PlatformCode } from "@/lib/channels";

// ── Competitor Channel ──

export type CompetitorType =
  | "direct_competitor"
  | "similar_channel"
  | "inspiration_channel"
  | "benchmark_channel";

export const COMPETITOR_TYPE_LABELS: Record<
  CompetitorType,
  { en: string; ko: string }
> = {
  direct_competitor: { en: "Direct Competitor", ko: "직접 경쟁" },
  similar_channel: { en: "Similar Channel", ko: "유사 채널" },
  inspiration_channel: { en: "Inspiration", ko: "영감 채널" },
  benchmark_channel: { en: "Benchmark", ko: "벤치마크" },
};

export type CompetitorChannel = {
  id: string;
  platform: PlatformCode;
  channelName: string;
  url: string;
  competitorType: CompetitorType;
  addedAt: string;
  thumbnailUrl?: string;
  country?: string;
  category?: string;
};

// ── Channel Comparison Metrics ──

export type ChannelComparisonMetric = {
  metricName: string;
  metricKey: string;
  ourValue: number;
  competitorValue: number;
  difference: number;
  differencePercent: number;
  insight: string;
  isOurAdvantage: boolean;
};

// ── Competitor Snapshot (same structure as ChannelSnapshot) ──

export type CompetitorSnapshot = {
  channelId: string;
  audienceCount: number;
  totalContents: number;
  totalViewsOrReach: number;
  engagementRate: number;
  growthRate30d: number;
  uploads30d: number;
  avgViewsPerContent: number;
  snapshotDate: string;
};

// ── Competitor Snapshot Series ──

export type CompetitorSnapshotSeries = {
  channelId: string;
  date: string;
  audienceCount: number;
  totalViewsOrReach: number;
  engagementRate: number;
};

// ── Competitor Content ──

export type ContentFormat =
  | "video"
  | "short_form"
  | "image"
  | "thread"
  | "text"
  | "live";

export type ContentTopic =
  | "tutorial"
  | "entertainment"
  | "product"
  | "announcement"
  | "community"
  | "review"
  | "news";

export type CompetitorContent = {
  id: string;
  channelId: string;
  contentTitle: string;
  thumbnail?: string;
  publishDate: string;
  views: number;
  engagementRate: number;
  contentType: ContentFormat;
  topic: ContentTopic;
};

// ── Content Strategy Comparison ──

export type FormatDistribution = {
  format: ContentFormat;
  label: string;
  ourCount: number;
  competitorCount: number;
  ourPercent: number;
  competitorPercent: number;
};

export type TopicDistribution = {
  topic: ContentTopic;
  label: string;
  ourCount: number;
  competitorCount: number;
  ourPercent: number;
  competitorPercent: number;
};

// ── Competitor Insight ──

export type CompetitorInsight = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendedActions: string[];
  growthAnalysis: string;
  contentStrategyAnalysis: string;
  strategyRecommendation: string;
};

// ── Add Form ──

export type CompetitorFormInput = {
  platform: PlatformCode;
  url: string;
  channelName: string;
  competitorType: CompetitorType;
};
