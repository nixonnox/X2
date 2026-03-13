import type { PlatformCode } from "./types";

// ============================================
// Metric Labels
// ============================================

export type MetricLabels = {
  audience: string;
  contents: string;
  views: string;
  engagement: string;
  growth: string;
  uploads: string;
};

export type MetricDescriptions = {
  audience: string;
  contents: string;
  views: string;
  engagement: string;
  growth: string;
  uploads: string;
};

type MetricConfig = {
  labels: MetricLabels;
  descriptions: MetricDescriptions;
};

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  youtube: {
    labels: {
      audience: "Subscribers",
      contents: "Videos",
      views: "Total Views",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Uploads",
    },
    descriptions: {
      audience: "Total channel subscribers",
      contents: "Total published videos and shorts",
      views: "Cumulative views across all videos",
      engagement: "Avg. likes + comments / views",
      growth: "Subscriber change in last 30 days",
      uploads: "Videos uploaded in last 30 days",
    },
  },
  instagram: {
    labels: {
      audience: "Followers",
      contents: "Posts",
      views: "Estimated Reach",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Posts",
    },
    descriptions: {
      audience: "Total profile followers",
      contents: "Total posts, reels, and stories",
      views: "Estimated reach across content",
      engagement: "Avg. likes + comments / followers",
      growth: "Follower change in last 30 days",
      uploads: "Content posted in last 30 days",
    },
  },
  tiktok: {
    labels: {
      audience: "Followers",
      contents: "Videos",
      views: "Total Views",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Videos",
    },
    descriptions: {
      audience: "Total profile followers",
      contents: "Total published videos",
      views: "Cumulative views across all videos",
      engagement: "Avg. likes + comments + shares / views",
      growth: "Follower change in last 30 days",
      uploads: "Videos posted in last 30 days",
    },
  },
  x: {
    labels: {
      audience: "Followers",
      contents: "Posts",
      views: "Impressions",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Posts",
    },
    descriptions: {
      audience: "Total profile followers",
      contents: "Total tweets and threads",
      views: "Estimated total impressions",
      engagement: "Avg. likes + retweets + replies / impressions",
      growth: "Follower change in last 30 days",
      uploads: "Posts published in last 30 days",
    },
  },
  naver_blog: {
    labels: {
      audience: "Subscribers",
      contents: "Posts",
      views: "Visitors",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Posts",
    },
    descriptions: {
      audience: "Total blog subscribers",
      contents: "Total published posts",
      views: "Total unique visitors",
      engagement: "Avg. comments + likes / visitors",
      growth: "Subscriber change in last 30 days",
      uploads: "Posts published in last 30 days",
    },
  },
  naver_cafe: {
    labels: {
      audience: "Members",
      contents: "Posts",
      views: "Page Views",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Posts",
    },
    descriptions: {
      audience: "Total cafe members",
      contents: "Total community posts",
      views: "Total page views",
      engagement: "Avg. comments + likes / views",
      growth: "Member change in last 30 days",
      uploads: "Posts published in last 30 days",
    },
  },
  website: {
    labels: {
      audience: "Visitors",
      contents: "Pages",
      views: "Page Views",
      engagement: "Engagement Rate",
      growth: "30d Growth",
      uploads: "30d Articles",
    },
    descriptions: {
      audience: "Monthly unique visitors",
      contents: "Total published pages",
      views: "Total page views",
      engagement: "Avg. time on page indicator",
      growth: "Visitor change in last 30 days",
      uploads: "Articles published in last 30 days",
    },
  },
};

const DEFAULT_CONFIG: MetricConfig = {
  labels: {
    audience: "Audience",
    contents: "Contents",
    views: "Reach",
    engagement: "Engagement Rate",
    growth: "30d Growth",
    uploads: "30d Uploads",
  },
  descriptions: {
    audience: "Total audience size",
    contents: "Total published content",
    views: "Estimated reach or views",
    engagement: "Average engagement rate",
    growth: "Audience change in last 30 days",
    uploads: "Content published in last 30 days",
  },
};

export function resolveMetricLabels(platformCode: PlatformCode): MetricLabels {
  return METRIC_CONFIGS[platformCode]?.labels ?? DEFAULT_CONFIG.labels;
}

export function resolveMetricDescriptions(
  platformCode: PlatformCode,
): MetricDescriptions {
  return (
    METRIC_CONFIGS[platformCode]?.descriptions ?? DEFAULT_CONFIG.descriptions
  );
}

export function getMetricLabel(
  platformCode: PlatformCode,
  key: keyof MetricLabels,
): string {
  const labels = resolveMetricLabels(platformCode);
  return labels[key];
}

export function getMetricDescription(
  platformCode: PlatformCode,
  key: keyof MetricDescriptions,
): string {
  const descriptions = resolveMetricDescriptions(platformCode);
  return descriptions[key];
}

// ============================================
// Formatters
// ============================================

export function formatCount(n: number | null | undefined): string {
  if (n == null) return "-";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null) return "-";
  return `${n.toFixed(1)}%`;
}

export function formatGrowth(n: number | null | undefined): string {
  if (n == null) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}
