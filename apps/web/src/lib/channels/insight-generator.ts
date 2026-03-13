import type {
  PlatformCode,
  ChannelSnapshot,
  RiskSignal,
  RecommendedAction,
} from "./types";

// ============================================
// Risk Signal Generator (mock rule-based)
// ============================================

export function generateRiskSignals(
  platformCode: PlatformCode,
  snapshot: ChannelSnapshot | undefined,
): RiskSignal[] {
  if (!snapshot) return [];

  const signals: RiskSignal[] = [];

  // Low growth
  if (snapshot.growthRate30d < 2) {
    signals.push({
      id: "low-growth",
      title: "Slow audience growth",
      description: `Growth rate is ${snapshot.growthRate30d.toFixed(1)}% over the past 30 days, which is below the healthy threshold of 3-5%. Consider reviewing your content strategy.`,
      severity: snapshot.growthRate30d < 0 ? "high" : "medium",
      metric: `${snapshot.growthRate30d.toFixed(1)}% / 30d`,
    });
  }

  // Declining engagement
  if (snapshot.engagementRate < 3) {
    signals.push({
      id: "low-engagement",
      title: "Below-average engagement rate",
      description: `Engagement rate of ${snapshot.engagementRate.toFixed(1)}% is below the platform average. Content may not be resonating with the audience.`,
      severity: snapshot.engagementRate < 1.5 ? "high" : "medium",
      metric: `${snapshot.engagementRate.toFixed(1)}%`,
    });
  }

  // Low upload frequency
  const lowUploadThreshold = platformCode === "x" ? 30 : 8;
  if (snapshot.uploads30d < lowUploadThreshold) {
    signals.push({
      id: "low-uploads",
      title: "Reduced posting frequency",
      description: `Only ${snapshot.uploads30d} posts in the last 30 days. Inconsistent posting can reduce algorithmic visibility and audience retention.`,
      severity:
        snapshot.uploads30d < lowUploadThreshold / 2 ? "high" : "medium",
      metric: `${snapshot.uploads30d} / 30d`,
    });
  }

  // Platform-specific signals
  if (platformCode === "youtube" && snapshot.uploads30d > 0) {
    const viewsPerUpload =
      snapshot.totalViewsOrReach / Math.max(snapshot.totalContents, 1);
    if (viewsPerUpload < 1000) {
      signals.push({
        id: "low-views-per-video",
        title: "Low average views per video",
        description:
          "Average views per video is under 1K. Consider optimizing thumbnails, titles, and content topics for discovery.",
        severity: "medium",
        metric: `${Math.round(viewsPerUpload)} avg views`,
      });
    }
  }

  if (platformCode === "tiktok" && snapshot.engagementRate < 5) {
    signals.push({
      id: "tiktok-engagement-drop",
      title: "TikTok engagement below platform norm",
      description:
        "TikTok typically sees higher engagement rates (5-10%). Your content may need more hooks and trending audio.",
      severity: "medium",
      metric: `${snapshot.engagementRate.toFixed(1)}%`,
    });
  }

  // If no signals, add a positive one
  if (signals.length === 0) {
    signals.push({
      id: "all-clear",
      title: "No critical issues detected",
      description:
        "All key metrics are within healthy ranges. Continue monitoring for any changes.",
      severity: "low",
    });
  }

  return signals.slice(0, 3);
}

// ============================================
// Recommended Action Generator (mock rule-based)
// ============================================

export function generateRecommendedActions(
  platformCode: PlatformCode,
  snapshot: ChannelSnapshot | undefined,
): RecommendedAction[] {
  if (!snapshot) return [];

  const actions: RecommendedAction[] = [];

  // Growth-based actions
  if (snapshot.growthRate30d < 5) {
    actions.push({
      id: "boost-growth",
      title: "Increase content frequency",
      description:
        "Posting more frequently can improve algorithmic distribution and audience discovery. Aim for at least 3-4 posts per week.",
      priority: "high",
      category: "growth",
    });
  }

  // Engagement-based actions
  if (snapshot.engagementRate < 4) {
    actions.push({
      id: "boost-engagement",
      title: "Improve audience interaction",
      description:
        "Add clear CTAs, ask questions in captions, and respond to comments within the first hour to boost engagement.",
      priority: "high",
      category: "engagement",
    });
  }

  // Platform-specific recommendations
  const platformActions = PLATFORM_ACTIONS[platformCode];
  if (platformActions) {
    actions.push(...platformActions);
  }

  // Universal actions
  if (snapshot.uploads30d > 15 && snapshot.engagementRate > 5) {
    actions.push({
      id: "repurpose-top",
      title: "Repurpose top-performing content",
      description:
        "Your top content can be adapted for other platforms. Cross-posting increases total reach with minimal extra effort.",
      priority: "medium",
      category: "strategy",
    });
  }

  return actions.slice(0, 3);
}

const PLATFORM_ACTIONS: Partial<Record<PlatformCode, RecommendedAction[]>> = {
  youtube: [
    {
      id: "yt-shorts",
      title: "Expand Shorts strategy",
      description:
        "YouTube Shorts drive 3-5x more new subscriber discovery than long-form videos. Aim for 40-50% Shorts ratio.",
      priority: "medium",
      category: "content",
    },
  ],
  instagram: [
    {
      id: "ig-reels",
      title: "Prioritize Reels over static posts",
      description:
        "Reels receive 2x more reach than static posts. Shift content mix to 60% Reels for maximum growth.",
      priority: "medium",
      category: "content",
    },
  ],
  tiktok: [
    {
      id: "tt-trends",
      title: "Leverage trending sounds & formats",
      description:
        "Videos using trending audio get 30% more distribution. Check the Discover page for current trends.",
      priority: "medium",
      category: "content",
    },
  ],
  x: [
    {
      id: "x-threads",
      title: "Create more thread content",
      description:
        "Long-form threads generate 3x more engagement than single posts. Use threads for in-depth analysis.",
      priority: "medium",
      category: "content",
    },
  ],
};
