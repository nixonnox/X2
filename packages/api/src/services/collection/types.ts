/**
 * Collection pipeline types.
 *
 * Defines the data shapes flowing through the collection pipeline:
 * Platform API → Normalization → Repository → Analytics Input
 */

/** Supported social platform identifiers. */
export type SupportedPlatform = "youtube" | "instagram" | "tiktok" | "x";

// ---------------------------------------------------------------------------
// Platform raw → Normalized shapes (Prisma-ready)
// ---------------------------------------------------------------------------

/** Normalized channel data ready for repository upsert. */
export type NormalizedChannel = {
  platform: string;
  platformChannelId: string;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  subscriberCount: number;
  contentCount: number;
};

/** Normalized content data ready for repository upsert. */
export type NormalizedContent = {
  platformContentId: string;
  title: string;
  description: string | null;
  contentType: string;
  url: string;
  thumbnailUrl: string | null;
  publishedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate: number;
};

/** Normalized comment data ready for repository bulk insert. */
export type NormalizedComment = {
  platformCommentId: string;
  authorName: string;
  authorProfileUrl: string | null;
  text: string;
  likeCount: number;
  publishedAt: Date;
  isReply: boolean;
  parentCommentId: string | null;
};

/** Normalized mention data ready for repository bulk insert. */
export type NormalizedMention = {
  platform: string;
  sourceUrl: string;
  authorName: string | null;
  text: string;
  mentionedAt: Date;
  sentiment: string | null;
  reachEstimate: number;
};

// ---------------------------------------------------------------------------
// Collection execution types
// ---------------------------------------------------------------------------

/** What to collect for a channel. */
export type CollectionScope = {
  channelId: string;
  projectId: string;
  platform: SupportedPlatform;
  platformChannelId: string;
  channelName: string;
  /** Which data types to collect in this run. */
  types: CollectionDataType[];
};

export type CollectionDataType =
  | "channel_info"
  | "contents"
  | "comments"
  | "analytics";

/** Result of collecting data for one channel. */
export type ChannelCollectionResult = {
  channelId: string;
  channelName: string;
  platform: string;
  channelUpdated: boolean;
  newContentCount: number;
  newCommentCount: number;
  snapshotRecorded: boolean;
  errors: string[];
  durationMs: number;
};

/** Result of a full collection run across multiple channels. */
export type CollectionRunResult = {
  workspaceId: string;
  jobType: string;
  startedAt: Date;
  completedAt: Date;
  channelResults: ChannelCollectionResult[];
  totals: {
    channelsProcessed: number;
    channelsFailed: number;
    contentsCollected: number;
    commentsCollected: number;
  };
};

// ---------------------------------------------------------------------------
// Collection health & retry
// ---------------------------------------------------------------------------

export type CollectionLogEntry = {
  channelId: string;
  platform: string;
  jobType: string;
  status: "success" | "partial" | "failed";
  message: string;
  itemCount: number;
  durationMs: number;
  errorDetail?: string;
  timestamp: Date;
};

export type RetryPolicy = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  backoffMultiplier: 2,
};

export type PlatformHealthStatus = {
  platform: string;
  healthy: boolean;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
  errorRate: number;
};

// ---------------------------------------------------------------------------
// Analytics input types
// ---------------------------------------------------------------------------

/** Input shape for comment analysis engine. */
export type CommentAnalysisInput = {
  commentId: string;
  text: string;
  authorName: string;
  publishedAt: Date;
  contentId: string;
  channelId: string;
  platform: string;
};

/** Input shape for listening/mention analysis engine. */
export type ListeningAnalysisInput = {
  mentionId: string;
  text: string;
  platform: string;
  sourceUrl: string;
  mentionedAt: Date;
  projectId: string;
  matchedKeywords: string[];
};

/** Input shape for intent analysis engine. */
export type IntentAnalysisInput = {
  queryId: string;
  queryText: string;
  platform: string;
  volume: number;
  projectId: string;
};

/** Input shape for GEO/AEO visibility tracking engine. */
export type GeoAeoInput = {
  keywordId: string;
  keyword: string;
  engine: string;
  position: number | null;
  cited: boolean;
  snippetText: string | null;
  checkedAt: Date;
};
