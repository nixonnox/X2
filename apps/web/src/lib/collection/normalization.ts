// ─────────────────────────────────────────────
// Normalization Service
// ─────────────────────────────────────────────
// Transforms raw platform-specific data into
// common normalized data structures.

import type {
  PlatformCode,
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
} from "./types";

function toISODate(input: string | number | undefined): string {
  if (!input) return new Date().toISOString();
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseInt(val, 10) || 0;
  return 0;
}

// ── Channel Normalization ──

export function normalizeChannel(
  platform: PlatformCode,
  raw: Record<string, unknown>,
): NormalizedChannel {
  const now = new Date().toISOString();

  switch (platform) {
    case "youtube":
      return normalizeYouTubeChannel(raw, now);
    default:
      return normalizeGenericChannel(platform, raw, now);
  }
}

function normalizeYouTubeChannel(
  raw: Record<string, unknown>,
  now: string,
): NormalizedChannel {
  const snippet = (raw.snippet || {}) as Record<string, unknown>;
  const stats = (raw.statistics || {}) as Record<string, unknown>;
  const thumbs = (snippet.thumbnails || {}) as Record<string, { url?: string }>;

  return {
    id: `yt-ch-${raw.id || "unknown"}`,
    platform: "youtube",
    platformChannelId: String(raw.id || ""),
    name: String(snippet.title || ""),
    handle: String(snippet.customUrl || ""),
    url: `https://youtube.com/${snippet.customUrl || ""}`,
    avatarUrl: thumbs.default?.url || "",
    description: String(snippet.description || ""),
    subscriberCount: toNumber(stats.subscriberCount),
    contentCount: toNumber(stats.videoCount),
    totalViews: toNumber(stats.viewCount),
    createdAt: toISODate(snippet.publishedAt as string),
    collectedAt: now,
    extra: {},
  };
}

function normalizeGenericChannel(
  platform: PlatformCode,
  raw: Record<string, unknown>,
  now: string,
): NormalizedChannel {
  return {
    id: `${platform}-ch-${raw.id || "unknown"}`,
    platform,
    platformChannelId: String(raw.id || ""),
    name: String(raw.name || raw.title || ""),
    handle: String(raw.handle || raw.username || ""),
    url: String(raw.url || ""),
    avatarUrl: String(
      raw.avatarUrl || raw.thumbnailUrl || raw.profileImageUrl || "",
    ),
    description: String(raw.description || ""),
    subscriberCount: toNumber(
      raw.subscriberCount || raw.followersCount || raw.followers,
    ),
    contentCount: toNumber(
      raw.contentCount || raw.videoCount || raw.mediaCount || raw.postCount,
    ),
    totalViews: toNumber(raw.totalViews || raw.viewCount || 0),
    createdAt: toISODate(
      (raw.createdAt as string) || (raw.publishedAt as string),
    ),
    collectedAt: now,
    extra: {},
  };
}

// ── Content Normalization ──

export function normalizeContent(
  platform: PlatformCode,
  raw: Record<string, unknown>,
  channelId: string,
): NormalizedContent {
  const now = new Date().toISOString();

  switch (platform) {
    case "youtube":
      return normalizeYouTubeContent(raw, channelId, now);
    default:
      return normalizeGenericContent(platform, raw, channelId, now);
  }
}

function normalizeYouTubeContent(
  raw: Record<string, unknown>,
  channelId: string,
  now: string,
): NormalizedContent {
  const snippet = (raw.snippet || {}) as Record<string, unknown>;
  const stats = (raw.statistics || {}) as Record<string, unknown>;
  const thumbs = (snippet.thumbnails || {}) as Record<string, { url?: string }>;

  const views = toNumber(stats.viewCount);
  const likes = toNumber(stats.likeCount);
  const comments = toNumber(stats.commentCount);
  const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;

  return {
    id: `yt-ct-${raw.id || "unknown"}`,
    platform: "youtube",
    platformContentId: String(raw.id || ""),
    channelId,
    title: String(snippet.title || ""),
    description: String(snippet.description || "").slice(0, 500),
    url: `https://youtube.com/watch?v=${raw.id}`,
    thumbnailUrl: thumbs.medium?.url || "",
    contentType: "video",
    publishedAt: toISODate(snippet.publishedAt as string),
    viewCount: views,
    likeCount: likes,
    commentCount: comments,
    shareCount: 0,
    engagementRate: Math.round(engagement * 100) / 100,
    collectedAt: now,
    extra: {
      duration: (raw.contentDetails as Record<string, unknown>)?.duration,
    },
  };
}

function normalizeGenericContent(
  platform: PlatformCode,
  raw: Record<string, unknown>,
  channelId: string,
  now: string,
): NormalizedContent {
  const views = toNumber(raw.viewCount || raw.views || raw.playCount || 0);
  const likes = toNumber(raw.likeCount || raw.likes || raw.diggCount || 0);
  const comments = toNumber(raw.commentCount || raw.comments || 0);
  const shares = toNumber(raw.shareCount || raw.shares || 0);
  const engagement =
    views > 0 ? ((likes + comments + shares) / views) * 100 : 0;

  return {
    id: `${platform}-ct-${raw.id || "unknown"}`,
    platform,
    platformContentId: String(raw.id || ""),
    channelId,
    title: String(raw.title || raw.caption || ""),
    description: String(raw.description || raw.text || "").slice(0, 500),
    url: String(raw.url || raw.permalink || ""),
    thumbnailUrl: String(
      raw.thumbnailUrl || raw.thumbnail_url || raw.cover || "",
    ),
    contentType: String(
      raw.contentType || raw.media_type || raw.type || "post",
    ),
    publishedAt: toISODate(
      (raw.publishedAt as string) ||
        (raw.timestamp as string) ||
        (raw.createTime as string),
    ),
    viewCount: views,
    likeCount: likes,
    commentCount: comments,
    shareCount: shares,
    engagementRate: Math.round(engagement * 100) / 100,
    collectedAt: now,
    extra: {},
  };
}

// ── Comment Normalization ──

export function normalizeComment(
  platform: PlatformCode,
  raw: Record<string, unknown>,
  contentId: string,
  channelId: string,
): NormalizedComment {
  const now = new Date().toISOString();

  switch (platform) {
    case "youtube":
      return normalizeYouTubeComment(raw, contentId, channelId, now);
    default:
      return normalizeGenericComment(platform, raw, contentId, channelId, now);
  }
}

function normalizeYouTubeComment(
  raw: Record<string, unknown>,
  contentId: string,
  channelId: string,
  now: string,
): NormalizedComment {
  const snippet = (raw.snippet || {}) as Record<string, unknown>;
  const topLevel = (snippet.topLevelComment as Record<string, unknown>) || {};
  const topSnippet = (topLevel.snippet || {}) as Record<string, unknown>;

  return {
    id: `yt-cm-${raw.id || "unknown"}`,
    platform: "youtube",
    platformCommentId: String(raw.id || ""),
    contentId,
    channelId,
    authorName: String(topSnippet.authorDisplayName || ""),
    authorHandle: "",
    authorAvatarUrl: String(topSnippet.authorProfileImageUrl || ""),
    text: String(topSnippet.textDisplay || ""),
    publishedAt: toISODate(topSnippet.publishedAt as string),
    likeCount: toNumber(topSnippet.likeCount),
    replyCount: toNumber(snippet.totalReplyCount),
    isReply: false,
    parentCommentId: null,
    collectedAt: now,
    extra: {},
  };
}

function normalizeGenericComment(
  platform: PlatformCode,
  raw: Record<string, unknown>,
  contentId: string,
  channelId: string,
  now: string,
): NormalizedComment {
  return {
    id: `${platform}-cm-${raw.id || "unknown"}`,
    platform,
    platformCommentId: String(raw.id || ""),
    contentId,
    channelId,
    authorName: String(raw.authorName || raw.username || raw.author || ""),
    authorHandle: String(raw.authorHandle || raw.username || ""),
    authorAvatarUrl: String(raw.authorAvatarUrl || raw.profileImageUrl || ""),
    text: String(raw.text || raw.content || raw.body || ""),
    publishedAt: toISODate(
      (raw.publishedAt as string) || (raw.timestamp as string),
    ),
    likeCount: toNumber(raw.likeCount || raw.likes || 0),
    replyCount: toNumber(raw.replyCount || raw.replies || 0),
    isReply: Boolean(raw.isReply || raw.parentId),
    parentCommentId: raw.parentCommentId ? String(raw.parentCommentId) : null,
    collectedAt: now,
    extra: {},
  };
}

// ── Mention Normalization ──

export function normalizeMention(
  platform: PlatformCode,
  raw: Record<string, unknown>,
): NormalizedMention {
  const now = new Date().toISOString();

  return {
    id: `${platform}-mn-${raw.id || "unknown"}`,
    platform,
    keyword: String(raw.keyword || ""),
    sourceUrl: String(raw.sourceUrl || raw.url || raw.permalink || ""),
    sourceTitle: String(raw.sourceTitle || raw.title || ""),
    authorName: String(raw.authorName || raw.author || raw.username || ""),
    authorHandle: String(raw.authorHandle || raw.handle || ""),
    text: String(raw.text || raw.content || raw.snippet || "").slice(0, 1000),
    publishedAt: toISODate(
      (raw.publishedAt as string) || (raw.timestamp as string),
    ),
    sentiment: validateSentiment(raw.sentiment),
    reach: toNumber(raw.reach || raw.impressions || 0),
    collectedAt: now,
    extra: {},
  };
}

function validateSentiment(
  val: unknown,
): "positive" | "neutral" | "negative" | "unknown" {
  const valid = ["positive", "neutral", "negative"];
  return valid.includes(val as string)
    ? (val as "positive" | "neutral" | "negative")
    : "unknown";
}
