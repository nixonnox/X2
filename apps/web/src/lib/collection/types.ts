// ─────────────────────────────────────────────
// Social Data Collection Engine — Core Types
// ─────────────────────────────────────────────

// ── Platform Codes ──

export type PlatformCode =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "x"
  | "naver_blog"
  | "naver_cafe"
  | "blog"
  | "community"
  | "news"
  | "website"
  | "custom";

export type SourceType = "api" | "crawler" | "manual" | "mock";

export type CollectionType = "channel" | "content" | "comment" | "mention";

export type JobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

export type RetryPolicy = "none" | "linear" | "exponential";

// ── Platform metadata ──

export type PlatformInfo = {
  code: PlatformCode;
  name: string;
  icon: string;
  preferredSource: SourceType;
  supportedCollections: CollectionType[];
  note: string;
};

export const PLATFORMS: Record<PlatformCode, PlatformInfo> = {
  youtube: {
    code: "youtube",
    name: "YouTube",
    icon: "Youtube",
    preferredSource: "api",
    supportedCollections: ["channel", "content", "comment", "mention"],
    note: "YouTube Data API v3 사용. API 키 필요.",
  },
  instagram: {
    code: "instagram",
    name: "Instagram",
    icon: "Instagram",
    preferredSource: "api",
    supportedCollections: ["channel", "content", "comment"],
    note: "Instagram Graph API 사용. Business/Creator 계정 필요.",
  },
  tiktok: {
    code: "tiktok",
    name: "TikTok",
    icon: "Music2",
    preferredSource: "api",
    supportedCollections: ["channel", "content"],
    note: "TikTok Research API 사용. 승인된 앱 필요.",
  },
  x: {
    code: "x",
    name: "X (Twitter)",
    icon: "Twitter",
    preferredSource: "api",
    supportedCollections: ["channel", "content", "comment", "mention"],
    note: "X API v2 사용. Bearer Token 필요.",
  },
  naver_blog: {
    code: "naver_blog",
    name: "Naver Blog",
    icon: "BookOpen",
    preferredSource: "crawler",
    supportedCollections: ["channel", "content", "comment", "mention"],
    note: "네이버 검색 API 또는 웹 수집 사용.",
  },
  naver_cafe: {
    code: "naver_cafe",
    name: "Naver Cafe",
    icon: "Coffee",
    preferredSource: "crawler",
    supportedCollections: ["content", "comment", "mention"],
    note: "네이버 카페 API 또는 웹 수집 사용. 접근 제한 있을 수 있음.",
  },
  blog: {
    code: "blog",
    name: "Blog",
    icon: "FileText",
    preferredSource: "crawler",
    supportedCollections: ["content", "mention"],
    note: "RSS 피드 또는 웹 수집 사용.",
  },
  community: {
    code: "community",
    name: "Community",
    icon: "Users",
    preferredSource: "crawler",
    supportedCollections: ["content", "comment", "mention"],
    note: "커뮤니티 사이트별 웹 수집. 사이트 정책 확인 필요.",
  },
  news: {
    code: "news",
    name: "News",
    icon: "Newspaper",
    preferredSource: "crawler",
    supportedCollections: ["content", "mention"],
    note: "뉴스 API 또는 RSS 수집. 저작권 정책 확인 필요.",
  },
  website: {
    code: "website",
    name: "Website",
    icon: "Globe",
    preferredSource: "crawler",
    supportedCollections: ["content", "mention"],
    note: "robots.txt 및 이용약관 준수 필요.",
  },
  custom: {
    code: "custom",
    name: "Custom",
    icon: "Puzzle",
    preferredSource: "manual",
    supportedCollections: ["channel", "content", "comment", "mention"],
    note: "사용자 정의 소스. 커넥터 직접 구현 필요.",
  },
};

// ── Connector Interface Types ──

export type ConnectorConfig = {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  baseUrl?: string;
  rateLimit?: number; // requests per minute
  timeout?: number; // ms
  retryPolicy?: RetryPolicy;
  maxRetries?: number;
  customHeaders?: Record<string, string>;
  [key: string]: unknown;
};

export type ConnectorHealthStatus = {
  connectorId: string;
  platform: PlatformCode;
  sourceType: SourceType;
  healthy: boolean;
  latencyMs: number | null;
  lastCheckedAt: string;
  message: string;
  details?: Record<string, unknown>;
};

// ── Data Connector Interface ──

export interface DataConnector {
  readonly id: string;
  readonly platform: PlatformCode;
  readonly sourceType: SourceType;
  readonly supportedCollections: CollectionType[];

  collectChannel(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>>;
  collectContent(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>>;
  collectComments(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>>;
  collectMentions(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>>;
  healthCheck(): Promise<ConnectorHealthStatus>;
}

// ── Collection Target ──

export type CollectionTarget = {
  id: string;
  platform: PlatformCode;
  channelId?: string;
  channelUrl?: string;
  contentId?: string;
  keyword?: string;
  options?: {
    limit?: number;
    since?: string;
    until?: string;
    cursor?: string;
    sortBy?: string;
    [key: string]: unknown;
  };
};

// ── Raw Collection Result ──

export type RawCollectionResult<T = unknown> = {
  success: boolean;
  data: T | null;
  error?: string;
  metadata: {
    connectorId: string;
    platform: PlatformCode;
    sourceType: SourceType;
    collectionType: CollectionType;
    collectedAt: string;
    durationMs: number;
    itemCount: number;
    cursor?: string;
    hasMore?: boolean;
  };
  rawSnapshot?: unknown;
};

// ── Normalized Data Structures ──

export type NormalizedChannel = {
  id: string;
  platform: PlatformCode;
  platformChannelId: string;
  name: string;
  handle: string;
  url: string;
  avatarUrl: string;
  description: string;
  subscriberCount: number;
  contentCount: number;
  totalViews: number;
  createdAt: string;
  collectedAt: string;
  extra: Record<string, unknown>;
};

export type NormalizedContent = {
  id: string;
  platform: PlatformCode;
  platformContentId: string;
  channelId: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  contentType: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  engagementRate: number;
  collectedAt: string;
  extra: Record<string, unknown>;
};

export type NormalizedComment = {
  id: string;
  platform: PlatformCode;
  platformCommentId: string;
  contentId: string;
  channelId: string;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string;
  text: string;
  publishedAt: string;
  likeCount: number;
  replyCount: number;
  isReply: boolean;
  parentCommentId: string | null;
  collectedAt: string;
  extra: Record<string, unknown>;
};

export type NormalizedMention = {
  id: string;
  platform: PlatformCode;
  keyword: string;
  sourceUrl: string;
  sourceTitle: string;
  authorName: string;
  authorHandle: string;
  text: string;
  publishedAt: string;
  sentiment: "positive" | "neutral" | "negative" | "unknown";
  reach: number;
  collectedAt: string;
  extra: Record<string, unknown>;
};

// ── Collection Job ──

export type CollectionJob = {
  id: string;
  type: CollectionType;
  platform: PlatformCode;
  target: CollectionTarget;
  connectorId: string;
  status: JobStatus;
  priority: number;
  retryCount: number;
  maxRetries: number;
  retryPolicy: RetryPolicy;
  scheduledAt: string;
  startedAt: string | null;
  endedAt: string | null;
  error: string | null;
  resultSummary: string | null;
  createdAt: string;
};

// ── Collection Job Result ──

export type CollectionJobResult = {
  jobId: string;
  success: boolean;
  collectionType: CollectionType;
  platform: PlatformCode;
  connectorId: string;
  normalizedPayload:
    | NormalizedChannel
    | NormalizedContent[]
    | NormalizedComment[]
    | NormalizedMention[]
    | null;
  metadata: {
    collectedAt: string;
    durationMs: number;
    itemCount: number;
    sourceType: SourceType;
  };
  rawSnapshot?: unknown;
};

// ── Collection Log ──

export type CollectionLog = {
  id: string;
  jobId: string;
  type: CollectionType;
  platform: PlatformCode;
  target: string;
  connectorId: string;
  status: "success" | "failed" | "retrying";
  errorMessage: string | null;
  userMessage: string | null;
  retryCount: number;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  itemCount: number;
  metadata: Record<string, unknown>;
};

// ── Collection Schedule ──

export type ScheduleFrequency =
  | "manual"
  | "hourly"
  | "every_6h"
  | "every_12h"
  | "daily"
  | "weekly";

export type CollectionSchedule = {
  id: string;
  name: string;
  type: CollectionType;
  platform: PlatformCode;
  targetId: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  connectorPreference: SourceType;
  lastCollectedAt: string | null;
  nextScheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Collection Settings ──

export type CollectionSettings = {
  globalEnabled: boolean;
  defaultFrequency: ScheduleFrequency;
  defaultRetryPolicy: RetryPolicy;
  defaultMaxRetries: number;
  devMode: boolean;
  mockFallback: boolean;
  rateLimitPerMinute: number;
  dataRetentionDays: number;
};

// ── Queue / Worker Types ──

export type QueueItem = {
  id: string;
  job: CollectionJob;
  priority: number;
  addedAt: string;
  attempts: number;
};

export type WorkerStatus = {
  id: string;
  active: boolean;
  currentJobId: string | null;
  processedCount: number;
  failedCount: number;
  startedAt: string;
};

// ── Labels / Display Configs ──

export const JOB_STATUS_LABELS: Record<
  JobStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "대기중", color: "text-amber-600", bg: "bg-amber-50" },
  running: { label: "실행중", color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "완료", color: "text-emerald-600", bg: "bg-emerald-50" },
  failed: { label: "실패", color: "text-red-600", bg: "bg-red-50" },
  cancelled: { label: "취소됨", color: "text-gray-600", bg: "bg-gray-50" },
  retrying: { label: "재시도중", color: "text-orange-600", bg: "bg-orange-50" },
};

export const COLLECTION_TYPE_LABELS: Record<
  CollectionType,
  { label: string; icon: string }
> = {
  channel: { label: "채널", icon: "Radio" },
  content: { label: "콘텐츠", icon: "FileVideo" },
  comment: { label: "댓글", icon: "MessageSquare" },
  mention: { label: "멘션", icon: "AtSign" },
};

export const SOURCE_TYPE_LABELS: Record<
  SourceType,
  { label: string; icon: string }
> = {
  api: { label: "API", icon: "Plug" },
  crawler: { label: "크롤러", icon: "Bug" },
  manual: { label: "수동", icon: "Hand" },
  mock: { label: "Mock", icon: "FlaskConical" },
};

export const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  manual: "수동 실행",
  hourly: "매시간",
  every_6h: "6시간마다",
  every_12h: "12시간마다",
  daily: "매일",
  weekly: "매주",
};
