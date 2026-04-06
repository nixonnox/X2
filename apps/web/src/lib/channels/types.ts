// ============================================
// Channel Domain Types
// ============================================

export type AnalysisMode = "url_basic" | "api_advanced" | "custom_manual";

export type ChannelType = "owned" | "competitor" | "monitoring";

export type ChannelStatus = "active" | "syncing" | "error" | "paused";

export type PlatformCode =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "threads"
  | "facebook"
  | "linkedin"
  | "naver_blog"
  | "naver_cafe"
  | "website"
  | "custom";

export type PlatformCategory =
  | "social"
  | "video"
  | "blog"
  | "community"
  | "other";

export type ContentType =
  | "video"
  | "short"
  | "reel"
  | "post"
  | "story"
  | "live"
  | "article"
  | "tweet"
  | "thread";

// ---- Channel ----

export type Channel = {
  id: string;
  platformCode: PlatformCode;
  platformLabel: string;
  analysisMode: AnalysisMode;
  name: string;
  url: string;
  country: string;
  category: string;
  tags: string[];
  channelType: ChannelType;
  isCompetitor: boolean;
  status: ChannelStatus;
  customPlatformName: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// ---- Snapshot ----

export type ChannelSnapshot = {
  channelId: string;
  snapshotDate: string;
  audienceCount: number | null;
  audienceLabel: string;
  totalContents: number | null;
  totalViewsOrReach: number | null;
  engagementRate: number | null;
  growthRate30d: number | null;
  uploads30d: number | null;
};

// ---- Content ----

export type ChannelContent = {
  id: string;
  channelId: string;
  title: string;
  thumbnailUrl: string | null;
  contentType: ContentType;
  publishedAt: string;
  viewsOrReach: number;
  engagementRate: number;
  commentsCount: number;
};

// ---- Insight ----

export type ChannelInsight = {
  channelId: string;
  summary: string;
  strengths: string[];
  suggestions: string[];
  competitorNote?: string;
  nextActions?: string[];
};

// ---- Risk Signal ----

export type RiskSignal = {
  id: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  metric?: string;
};

// ---- Recommended Action ----

export type RecommendedAction = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "content" | "engagement" | "growth" | "strategy";
};

// ---- Snapshot time series (for charts) ----

export type ChannelSnapshotSeries = {
  date: string;
  audienceCount: number;
  totalViewsOrReach: number;
  engagementRate: number;
};

// ---- Channel form input ----

export type ChannelFormInput = {
  platformCode: PlatformCode;
  url: string;
  name: string;
  country: string;
  category: string;
  tags: string[];
  channelType: ChannelType;
  isCompetitor: boolean;
  analysisMode: AnalysisMode;
  customPlatformName?: string;
};
