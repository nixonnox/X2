import type { PlatformCode } from "./types";
import type {
  BasicChannelAnalysisResult,
  BasicChannelInsight,
} from "./url/types";

// ============================================
// Mock Basic Analysis Generator
// ============================================

/**
 * URL 기반 기본 분석 mock 데이터를 생성한다.
 * 실제 구현에서는 크롤링/API 호출 후 결과를 반환한다.
 */
export function generateBasicAnalysis(params: {
  channelId: string;
  platformCode: PlatformCode;
  channelIdentifier: string;
  normalizedUrl: string;
}): BasicChannelAnalysisResult {
  const generator =
    PLATFORM_GENERATORS[params.platformCode] ?? defaultGenerator;
  return generator(params);
}

type GeneratorParams = {
  channelId: string;
  platformCode: PlatformCode;
  channelIdentifier: string;
  normalizedUrl: string;
};

type Generator = (params: GeneratorParams) => BasicChannelAnalysisResult;

// ---- Platform-specific generators ----

const youtubeGenerator: Generator = (p) => ({
  channelId: p.channelId,
  platformCode: p.platformCode,
  channelIdentifier: p.channelIdentifier,
  normalizedUrl: p.normalizedUrl,
  analysisMode: "url_basic",
  profile: {
    name: p.channelIdentifier.replace("@", ""),
    audienceLabel: "Subscribers",
    audienceCount: randomBetween(5_000, 500_000),
    totalContents: randomBetween(50, 800),
    totalViewsOrReach: randomBetween(500_000, 50_000_000),
    engagementRate: randomFloat(1.5, 8.0),
    growthRate30d: randomFloat(-2.0, 12.0),
    uploads30d: randomBetween(2, 20),
  },
  contentDistribution: [
    { type: "video", count: randomBetween(30, 400) },
    { type: "short", count: randomBetween(10, 200) },
    { type: "live", count: randomBetween(0, 30) },
  ],
  insights: youtubeInsights(),
});

const instagramGenerator: Generator = (p) => ({
  channelId: p.channelId,
  platformCode: p.platformCode,
  channelIdentifier: p.channelIdentifier,
  normalizedUrl: p.normalizedUrl,
  analysisMode: "url_basic",
  profile: {
    name: p.channelIdentifier,
    audienceLabel: "Followers",
    audienceCount: randomBetween(1_000, 300_000),
    totalContents: randomBetween(30, 500),
    totalViewsOrReach: randomBetween(100_000, 10_000_000),
    engagementRate: randomFloat(2.0, 10.0),
    growthRate30d: randomFloat(-1.0, 15.0),
    uploads30d: randomBetween(5, 30),
  },
  contentDistribution: [
    { type: "post", count: randomBetween(20, 300) },
    { type: "reel", count: randomBetween(10, 150) },
    { type: "story", count: randomBetween(30, 200) },
  ],
  insights: instagramInsights(),
});

const tiktokGenerator: Generator = (p) => ({
  channelId: p.channelId,
  platformCode: p.platformCode,
  channelIdentifier: p.channelIdentifier,
  normalizedUrl: p.normalizedUrl,
  analysisMode: "url_basic",
  profile: {
    name: p.channelIdentifier.replace("@", ""),
    audienceLabel: "Followers",
    audienceCount: randomBetween(2_000, 1_000_000),
    totalContents: randomBetween(20, 500),
    totalViewsOrReach: randomBetween(200_000, 30_000_000),
    engagementRate: randomFloat(3.0, 15.0),
    growthRate30d: randomFloat(0, 20.0),
    uploads30d: randomBetween(5, 40),
  },
  contentDistribution: [
    { type: "short", count: randomBetween(20, 400) },
    { type: "live", count: randomBetween(0, 20) },
  ],
  insights: tiktokInsights(),
});

const xGenerator: Generator = (p) => ({
  channelId: p.channelId,
  platformCode: p.platformCode,
  channelIdentifier: p.channelIdentifier,
  normalizedUrl: p.normalizedUrl,
  analysisMode: "url_basic",
  profile: {
    name: p.channelIdentifier.replace("@", ""),
    audienceLabel: "Followers",
    audienceCount: randomBetween(500, 200_000),
    totalContents: randomBetween(100, 5_000),
    totalViewsOrReach: randomBetween(50_000, 5_000_000),
    engagementRate: randomFloat(0.5, 5.0),
    growthRate30d: randomFloat(-3.0, 10.0),
    uploads30d: randomBetween(10, 90),
  },
  contentDistribution: [
    { type: "tweet", count: randomBetween(100, 4_000) },
    { type: "thread", count: randomBetween(5, 100) },
  ],
  insights: xInsights(),
});

const defaultGenerator: Generator = (p) => ({
  channelId: p.channelId,
  platformCode: p.platformCode,
  channelIdentifier: p.channelIdentifier,
  normalizedUrl: p.normalizedUrl,
  analysisMode: "url_basic",
  profile: {
    name: p.channelIdentifier,
    audienceLabel: "Followers",
    audienceCount: randomBetween(100, 50_000),
    totalContents: randomBetween(10, 200),
    totalViewsOrReach: randomBetween(10_000, 1_000_000),
    engagementRate: randomFloat(1.0, 6.0),
    growthRate30d: randomFloat(-2.0, 8.0),
    uploads30d: randomBetween(2, 15),
  },
  contentDistribution: [
    { type: "post", count: randomBetween(10, 150) },
    { type: "article", count: randomBetween(0, 50) },
  ],
  insights: defaultInsights(),
});

const PLATFORM_GENERATORS: Partial<Record<PlatformCode, Generator>> = {
  youtube: youtubeGenerator,
  instagram: instagramGenerator,
  tiktok: tiktokGenerator,
  x: xGenerator,
};

// ---- Insight templates ----

function youtubeInsights(): BasicChannelInsight[] {
  return [
    {
      title: "Strong short-form presence",
      description:
        "Shorts content is driving significant discovery and new subscriber growth.",
      type: "strength",
    },
    {
      title: "Consistent upload cadence",
      description:
        "Regular uploads help maintain algorithmic visibility and audience retention.",
      type: "strength",
    },
    {
      title: "Explore longer content",
      description:
        "Longer videos (10+ min) tend to generate higher ad revenue and watch time.",
      type: "opportunity",
    },
  ];
}

function instagramInsights(): BasicChannelInsight[] {
  return [
    {
      title: "High engagement rate",
      description:
        "Engagement rate is above the Instagram average, indicating strong audience connection.",
      type: "strength",
    },
    {
      title: "Reels are growing",
      description: "Reels content shows higher reach compared to static posts.",
      type: "strength",
    },
    {
      title: "Story consistency",
      description:
        "Regular Stories can increase profile visits and maintain top-of-mind awareness.",
      type: "opportunity",
    },
  ];
}

function tiktokInsights(): BasicChannelInsight[] {
  return [
    {
      title: "Viral potential",
      description:
        "TikTok's algorithm favors new content, giving each video a chance at broad distribution.",
      type: "strength",
    },
    {
      title: "High engagement rate",
      description: "Engagement rate is well above platform averages.",
      type: "strength",
    },
    {
      title: "Cross-platform repurposing",
      description:
        "Consider repurposing top TikToks as YouTube Shorts or Instagram Reels.",
      type: "opportunity",
    },
  ];
}

function xInsights(): BasicChannelInsight[] {
  return [
    {
      title: "Active posting frequency",
      description:
        "Frequent posting keeps the account visible in followers' timelines.",
      type: "strength",
    },
    {
      title: "Thread strategy",
      description:
        "Long-form threads tend to generate more bookmarks and shares than single tweets.",
      type: "info",
    },
    {
      title: "Engagement optimization",
      description:
        "Reply and quote-tweet engagement can help expand organic reach.",
      type: "opportunity",
    },
  ];
}

function defaultInsights(): BasicChannelInsight[] {
  return [
    {
      title: "Custom channel registered",
      description: "This channel will be tracked with manual analysis mode.",
      type: "info",
    },
    {
      title: "Regular monitoring",
      description:
        "Set up periodic check-ins to track audience growth and content performance.",
      type: "opportunity",
    },
  ];
}

// ---- Utilities ----

// TODO: 실데이터 연결 - tRPC channel.getStats() 또는 YouTube/Instagram API 사용
function randomBetween(_min: number, _max: number): number {
  console.warn("[MOCK] randomBetween called - no real data connected");
  return 0;
}

// TODO: 실데이터 연결 - tRPC channel.getStats() 또는 YouTube/Instagram API 사용
function randomFloat(_min: number, _max: number): number {
  console.warn("[MOCK] randomFloat called - no real data connected");
  return 0;
}
