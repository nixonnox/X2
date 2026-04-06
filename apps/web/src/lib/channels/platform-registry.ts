import type {
  PlatformCode,
  PlatformCategory,
  AnalysisMode,
  ContentType,
} from "./types";

// ============================================
// Platform Capability
// ============================================

export type PlatformCapability = {
  supportsFollowers: boolean;
  supportsSubscribers: boolean;
  supportsViews: boolean;
  supportsComments: boolean;
  supportsEngagement: boolean;
  supportsVideoContent: boolean;
  supportsShortForm: boolean;
  supportsLinkClicks: boolean;
};

// ============================================
// Platform Registry Item
// ============================================

export type PlatformRegistryItem = {
  code: PlatformCode;
  label: string;
  category: PlatformCategory;
  iconKey: string;
  color: string;
  supportedAnalysisModes: AnalysisMode[];
  supportedUrlPatterns: RegExp[];
  supportedContentTypes: ContentType[];
  supportedMetrics: string[];
  capabilities: PlatformCapability;
  audienceLabel: string;
  isEnabled: boolean;
  isCustomAllowed: boolean;
  placeholder: string;
};

// ============================================
// Registry Data
// ============================================

const PLATFORM_REGISTRY: PlatformRegistryItem[] = [
  {
    code: "youtube",
    label: "YouTube",
    category: "video",
    iconKey: "Youtube",
    color: "text-red-600 bg-red-50",
    supportedAnalysisModes: ["url_basic", "api_advanced"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?youtube\.com\/(channel\/|@|c\/)/i,
      /^https?:\/\/(www\.)?youtube\.com\/user\//i,
    ],
    supportedContentTypes: ["video", "short", "live"],
    supportedMetrics: [
      "views",
      "subscribers",
      "engagement",
      "likes",
      "comments",
      "shares",
    ],
    capabilities: {
      supportsFollowers: false,
      supportsSubscribers: true,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: true,
      supportsShortForm: true,
      supportsLinkClicks: false,
    },
    audienceLabel: "Subscribers",
    isEnabled: true,
    isCustomAllowed: false,
    placeholder: "https://www.youtube.com/@channelname",
  },
  {
    code: "instagram",
    label: "Instagram",
    category: "social",
    iconKey: "Instagram",
    color: "text-pink-600 bg-pink-50",
    supportedAnalysisModes: ["url_basic", "api_advanced"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?$/i,
    ],
    supportedContentTypes: ["post", "reel", "story", "live"],
    supportedMetrics: ["followers", "engagement", "likes", "comments", "reach"],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: false,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: true,
      supportsShortForm: true,
      supportsLinkClicks: false,
    },
    audienceLabel: "Followers",
    isEnabled: true,
    isCustomAllowed: false,
    placeholder: "https://www.instagram.com/username",
  },
  {
    code: "tiktok",
    label: "TikTok",
    category: "video",
    iconKey: "Music2",
    color: "text-gray-900 bg-gray-100",
    supportedAnalysisModes: ["url_basic", "api_advanced"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9._]+\/?$/i,
    ],
    supportedContentTypes: ["short", "live"],
    supportedMetrics: [
      "followers",
      "views",
      "engagement",
      "likes",
      "comments",
      "shares",
    ],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: true,
      supportsShortForm: true,
      supportsLinkClicks: false,
    },
    audienceLabel: "Followers",
    isEnabled: true,
    isCustomAllowed: false,
    placeholder: "https://www.tiktok.com/@username",
  },
  {
    code: "x",
    label: "X (Twitter)",
    category: "social",
    iconKey: "Twitter",
    color: "text-sky-600 bg-sky-50",
    supportedAnalysisModes: ["url_basic", "api_advanced"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?(twitter|x)\.com\/[a-zA-Z0-9_]+\/?$/i,
    ],
    supportedContentTypes: ["tweet", "thread"],
    supportedMetrics: [
      "followers",
      "engagement",
      "impressions",
      "retweets",
      "likes",
    ],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: false,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: true,
    },
    audienceLabel: "Followers",
    isEnabled: true,
    isCustomAllowed: false,
    placeholder: "https://x.com/username",
  },
  {
    code: "threads",
    label: "Threads",
    category: "social",
    iconKey: "AtSign",
    color: "text-gray-800 bg-gray-100",
    supportedAnalysisModes: ["url_basic"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?threads\.net\/@?[a-zA-Z0-9._]+\/?$/i,
    ],
    supportedContentTypes: ["post", "thread"],
    supportedMetrics: ["followers", "engagement", "likes"],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: false,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: false,
    },
    audienceLabel: "Followers",
    isEnabled: false,
    isCustomAllowed: false,
    placeholder: "https://www.threads.net/@username",
  },
  {
    code: "facebook",
    label: "Facebook",
    category: "social",
    iconKey: "Facebook",
    color: "text-blue-600 bg-blue-50",
    supportedAnalysisModes: ["url_basic", "api_advanced"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/?$/i,
    ],
    supportedContentTypes: ["post", "video", "reel", "live", "story"],
    supportedMetrics: ["followers", "engagement", "reach", "likes", "comments"],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: true,
      supportsShortForm: true,
      supportsLinkClicks: true,
    },
    audienceLabel: "Followers",
    isEnabled: false,
    isCustomAllowed: false,
    placeholder: "https://www.facebook.com/pagename",
  },
  {
    code: "linkedin",
    label: "LinkedIn",
    category: "social",
    iconKey: "Linkedin",
    color: "text-blue-700 bg-blue-50",
    supportedAnalysisModes: ["url_basic"],
    supportedUrlPatterns: [
      /^https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9-]+\/?$/i,
    ],
    supportedContentTypes: ["post", "article"],
    supportedMetrics: ["followers", "engagement", "impressions"],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: false,
      supportsViews: false,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: true,
    },
    audienceLabel: "Followers",
    isEnabled: false,
    isCustomAllowed: false,
    placeholder: "https://www.linkedin.com/company/name",
  },
  {
    code: "naver_blog",
    label: "Naver Blog",
    category: "blog",
    iconKey: "BookOpen",
    color: "text-green-600 bg-green-50",
    supportedAnalysisModes: ["url_basic", "custom_manual"],
    supportedUrlPatterns: [/^https?:\/\/blog\.naver\.com\/[a-zA-Z0-9_]+\/?$/i],
    supportedContentTypes: ["article"],
    supportedMetrics: ["visitors", "subscribers", "likes", "comments"],
    capabilities: {
      supportsFollowers: false,
      supportsSubscribers: true,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: false,
    },
    audienceLabel: "Subscribers",
    isEnabled: false,
    isCustomAllowed: false,
    placeholder: "https://blog.naver.com/blogid",
  },
  {
    code: "naver_cafe",
    label: "Naver Cafe",
    category: "community",
    iconKey: "Users",
    color: "text-green-700 bg-green-50",
    supportedAnalysisModes: ["url_basic", "custom_manual"],
    supportedUrlPatterns: [/^https?:\/\/cafe\.naver\.com\/[a-zA-Z0-9_]+\/?$/i],
    supportedContentTypes: ["post"],
    supportedMetrics: ["members", "posts", "comments"],
    capabilities: {
      supportsFollowers: false,
      supportsSubscribers: false,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: false,
    },
    audienceLabel: "Members",
    isEnabled: false,
    isCustomAllowed: false,
    placeholder: "https://cafe.naver.com/cafename",
  },
  {
    code: "website",
    label: "Website / Blog",
    category: "other",
    iconKey: "Globe",
    color: "text-violet-600 bg-violet-50",
    supportedAnalysisModes: ["url_basic", "custom_manual"],
    supportedUrlPatterns: [/^https?:\/\/.+/i],
    supportedContentTypes: ["article", "post"],
    supportedMetrics: ["visitors", "pageviews"],
    capabilities: {
      supportsFollowers: false,
      supportsSubscribers: true,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: false,
      supportsVideoContent: false,
      supportsShortForm: false,
      supportsLinkClicks: true,
    },
    audienceLabel: "Visitors",
    isEnabled: true,
    isCustomAllowed: false,
    placeholder: "https://example.com",
  },
  {
    code: "custom",
    label: "Custom / Other",
    category: "other",
    iconKey: "MoreHorizontal",
    color: "text-gray-500 bg-gray-100",
    supportedAnalysisModes: ["url_basic", "custom_manual"],
    supportedUrlPatterns: [/^https?:\/\/.+/i],
    supportedContentTypes: ["post", "video", "article"],
    supportedMetrics: ["audience", "engagement"],
    capabilities: {
      supportsFollowers: true,
      supportsSubscribers: true,
      supportsViews: true,
      supportsComments: true,
      supportsEngagement: true,
      supportsVideoContent: true,
      supportsShortForm: false,
      supportsLinkClicks: false,
    },
    audienceLabel: "Audience",
    isEnabled: true,
    isCustomAllowed: true,
    placeholder: "https://...",
  },
];

// ============================================
// Registry Access Functions
// ============================================

export function getAllPlatforms(): PlatformRegistryItem[] {
  return PLATFORM_REGISTRY;
}

export function getEnabledPlatforms(): PlatformRegistryItem[] {
  return PLATFORM_REGISTRY.filter((p) => p.isEnabled);
}

export function getPrimaryPlatforms(): PlatformRegistryItem[] {
  return PLATFORM_REGISTRY.filter((p) =>
    ["youtube", "instagram", "tiktok", "x"].includes(p.code),
  );
}

export function getPlatform(
  code: PlatformCode,
): PlatformRegistryItem | undefined {
  return PLATFORM_REGISTRY.find((p) => p.code === code);
}

export function getPlatformLabel(code: PlatformCode): string {
  return getPlatform(code)?.label ?? code;
}

export function getPlatformColor(code: PlatformCode): string {
  return getPlatform(code)?.color ?? "text-gray-500 bg-gray-100";
}

export function getPlatformAudienceLabel(code: PlatformCode): string {
  return getPlatform(code)?.audienceLabel ?? "Audience";
}

export function getAnalysisModeLabel(mode: AnalysisMode): string {
  const labels: Record<AnalysisMode, string> = {
    url_basic: "기본 분석 (추천)",
    api_advanced: "API 고급 분석",
    custom_manual: "수동 등록",
  };
  return labels[mode];
}

export function getAnalysisModeDescription(mode: AnalysisMode): string {
  const descriptions: Record<AnalysisMode, string> = {
    url_basic: "URL 기반 공개 데이터 자동 수집 — 바로 시작 가능",
    api_advanced: "공식 API 연동 상세 분석 — API 키 필요",
    custom_manual: "수동으로 데이터 입력 — 비공개 채널 등록 시 사용",
  };
  return descriptions[mode];
}
