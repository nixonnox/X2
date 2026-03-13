/**
 * Normalization layer.
 *
 * Transforms @x2/social provider responses (ChannelInfo, ContentInfo)
 * into repository-ready shapes defined in ./types.ts.
 *
 * Each function is pure and stateless — no side effects, no DB calls.
 */

/** ChannelInfo shape from @x2/social providers. */
type ChannelInfo = {
  platform: string;
  platformChannelId: string;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  contentCount: number | null;
};

/** ContentInfo shape from @x2/social providers. */
type ContentInfo = {
  platform: string;
  platformContentId: string;
  title: string;
  description: string | null;
  publishedAt: Date;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};
import type {
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
} from "./types";

// ---------------------------------------------------------------------------
// Channel normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a ChannelInfo from @x2/social into a repository-ready shape.
 */
export function normalizeChannel(raw: ChannelInfo): NormalizedChannel {
  return {
    platform: raw.platform,
    platformChannelId: raw.platformChannelId,
    name: raw.name,
    url: raw.url,
    thumbnailUrl: raw.thumbnailUrl,
    subscriberCount: raw.subscriberCount ?? 0,
    contentCount: raw.contentCount ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Content normalization
// ---------------------------------------------------------------------------

/** Platform-specific content type mapping. */
const CONTENT_TYPE_MAP: Record<string, string> = {
  youtube: "VIDEO",
  instagram: "POST",
  tiktok: "SHORT_VIDEO",
  x: "TWEET",
};

/**
 * Normalize a ContentInfo from @x2/social into a repository-ready shape.
 */
export function normalizeContent(
  raw: ContentInfo,
  platform: string,
): NormalizedContent {
  const totalEngagement = raw.likeCount + raw.commentCount;
  const engagementRate =
    raw.viewCount > 0 ? (totalEngagement / raw.viewCount) * 100 : 0;

  return {
    platformContentId: raw.platformContentId,
    title: raw.title,
    description: raw.description,
    contentType: CONTENT_TYPE_MAP[platform] ?? "OTHER",
    url: buildContentUrl(platform, raw.platformContentId),
    thumbnailUrl: raw.thumbnailUrl,
    publishedAt:
      raw.publishedAt instanceof Date
        ? raw.publishedAt
        : new Date(raw.publishedAt),
    viewCount: raw.viewCount,
    likeCount: raw.likeCount,
    commentCount: raw.commentCount,
    engagementRate: Math.round(engagementRate * 100) / 100,
  };
}

/** Build canonical content URL from platform + ID. */
function buildContentUrl(platform: string, contentId: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${contentId}`;
    case "instagram":
      return `https://www.instagram.com/p/${contentId}`;
    case "tiktok":
      return `https://www.tiktok.com/video/${contentId}`;
    case "x":
      return `https://x.com/i/status/${contentId}`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Comment normalization (from raw YouTube commentThreads, etc.)
// ---------------------------------------------------------------------------

/** Raw comment shape from YouTube commentThreads API. */
export type RawYouTubeComment = {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        authorDisplayName: string;
        authorChannelUrl?: string;
        textDisplay: string;
        likeCount: number;
        publishedAt: string;
      };
    };
    totalReplyCount: number;
  };
};

/**
 * Normalize a raw YouTube comment thread into repository-ready shape.
 */
export function normalizeYouTubeComment(
  raw: RawYouTubeComment,
): NormalizedComment {
  const s = raw.snippet.topLevelComment.snippet;
  return {
    platformCommentId: raw.snippet.topLevelComment.id,
    authorName: s.authorDisplayName,
    authorProfileUrl: s.authorChannelUrl ?? null,
    text: s.textDisplay,
    likeCount: s.likeCount,
    publishedAt: new Date(s.publishedAt),
    isReply: false,
    parentCommentId: null,
  };
}

/**
 * Generic comment normalization for platforms with flat comment structure.
 */
export function normalizeComment(raw: {
  id: string;
  authorName: string;
  authorProfileUrl?: string;
  text: string;
  likeCount?: number;
  publishedAt: string | Date;
  isReply?: boolean;
  parentCommentId?: string;
}): NormalizedComment {
  return {
    platformCommentId: raw.id,
    authorName: raw.authorName,
    authorProfileUrl: raw.authorProfileUrl ?? null,
    text: raw.text,
    likeCount: raw.likeCount ?? 0,
    publishedAt:
      raw.publishedAt instanceof Date
        ? raw.publishedAt
        : new Date(raw.publishedAt),
    isReply: raw.isReply ?? false,
    parentCommentId: raw.parentCommentId ?? null,
  };
}

// ---------------------------------------------------------------------------
// Mention normalization
// ---------------------------------------------------------------------------

/**
 * Normalize raw mention data from a search/listening source.
 */
export function normalizeMention(raw: {
  platform: string;
  sourceUrl: string;
  authorName?: string;
  text: string;
  mentionedAt: string | Date;
  sentiment?: string;
  reachEstimate?: number;
}): NormalizedMention {
  return {
    platform: raw.platform,
    sourceUrl: raw.sourceUrl,
    authorName: raw.authorName ?? null,
    text: raw.text,
    mentionedAt:
      raw.mentionedAt instanceof Date
        ? raw.mentionedAt
        : new Date(raw.mentionedAt),
    sentiment: validateSentiment(raw.sentiment),
    reachEstimate: raw.reachEstimate ?? 0,
  };
}

/** Validate sentiment string, return null if invalid. */
function validateSentiment(value?: string): string | null {
  if (!value) return null;
  const valid = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"];
  const upper = value.toUpperCase();
  return valid.includes(upper) ? upper : null;
}
