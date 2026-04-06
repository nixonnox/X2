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
      audience: "구독자",
      contents: "동영상",
      views: "총 조회수",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 업로드",
    },
    descriptions: {
      audience: "채널 전체 구독자 수",
      contents: "게시된 동영상 및 쇼츠 수",
      views: "전체 동영상 누적 조회수",
      engagement: "평균 좋아요 + 댓글 / 조회수",
      growth: "최근 30일 구독자 변화",
      uploads: "최근 30일 업로드된 동영상",
    },
  },
  instagram: {
    labels: {
      audience: "팔로워",
      contents: "게시물",
      views: "예상 도달",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 게시물",
    },
    descriptions: {
      audience: "프로필 전체 팔로워 수",
      contents: "게시물, 릴스, 스토리 수",
      views: "콘텐츠 전체 예상 도달 수",
      engagement: "평균 좋아요 + 댓글 / 팔로워",
      growth: "최근 30일 팔로워 변화",
      uploads: "최근 30일 게시된 콘텐츠",
    },
  },
  tiktok: {
    labels: {
      audience: "팔로워",
      contents: "동영상",
      views: "총 조회수",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 동영상",
    },
    descriptions: {
      audience: "프로필 전체 팔로워 수",
      contents: "게시된 동영상 수",
      views: "전체 동영상 누적 조회수",
      engagement: "평균 좋아요 + 댓글 + 공유 / 조회수",
      growth: "최근 30일 팔로워 변화",
      uploads: "최근 30일 게시된 동영상",
    },
  },
  x: {
    labels: {
      audience: "팔로워",
      contents: "게시물",
      views: "노출수",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 게시물",
    },
    descriptions: {
      audience: "프로필 전체 팔로워 수",
      contents: "트윗 및 스레드 수",
      views: "예상 전체 노출수",
      engagement: "평균 좋아요 + 리트윗 + 답글 / 노출수",
      growth: "최근 30일 팔로워 변화",
      uploads: "최근 30일 게시된 게시물",
    },
  },
  naver_blog: {
    labels: {
      audience: "구독자",
      contents: "게시물",
      views: "방문자",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 게시물",
    },
    descriptions: {
      audience: "블로그 전체 구독자 수",
      contents: "게시된 글 수",
      views: "순 방문자 수",
      engagement: "평균 댓글 + 좋아요 / 방문자",
      growth: "최근 30일 구독자 변화",
      uploads: "최근 30일 게시된 글",
    },
  },
  naver_cafe: {
    labels: {
      audience: "멤버",
      contents: "게시물",
      views: "페이지뷰",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 게시물",
    },
    descriptions: {
      audience: "카페 전체 멤버 수",
      contents: "커뮤니티 게시물 수",
      views: "전체 페이지뷰",
      engagement: "평균 댓글 + 좋아요 / 조회수",
      growth: "최근 30일 멤버 변화",
      uploads: "최근 30일 게시된 글",
    },
  },
  website: {
    labels: {
      audience: "방문자",
      contents: "페이지",
      views: "페이지뷰",
      engagement: "참여율",
      growth: "30일 성장률",
      uploads: "30일 게시글",
    },
    descriptions: {
      audience: "월간 순 방문자 수",
      contents: "게시된 페이지 수",
      views: "전체 페이지뷰",
      engagement: "평균 페이지 체류 시간 지표",
      growth: "최근 30일 방문자 변화",
      uploads: "최근 30일 게시된 글",
    },
  },
};

const DEFAULT_CONFIG: MetricConfig = {
  labels: {
    audience: "시청자",
    contents: "콘텐츠",
    views: "도달",
    engagement: "참여율",
    growth: "30일 성장률",
    uploads: "30일 업로드",
  },
  descriptions: {
    audience: "전체 시청자 수",
    contents: "게시된 콘텐츠 수",
    views: "예상 도달 또는 조회수",
    engagement: "평균 참여율",
    growth: "최근 30일 시청자 변화",
    uploads: "최근 30일 게시된 콘텐츠",
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
    return d.toLocaleDateString("ko-KR", {
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
    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "어제";
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}
