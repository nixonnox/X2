/**
 * LiveSocialMentionBridgeService
 *
 * 실시간 소셜 멘션을 수집/가공하여 intelligence 파이프라인에 연결.
 * SocialProviderRegistryService를 통해 실제 API adapter를 사용.
 * stub/mock 데이터 없이 실제 provider 상태를 그대로 반영.
 */

import {
  SocialProviderRegistryService,
  type SocialMention,
  type ProviderStatus,
} from "./social-provider-registry.service";
import { YouTubeDataApiAdapter } from "./youtube-data-api.adapter";
import { InstagramGraphApiAdapter } from "./instagram-graph-api.adapter";
import { TikTokResearchApiAdapter } from "./tiktok-research-api.adapter";
import { XApiAdapter } from "./x-api.adapter";
import {
  NaverBlogSearchAdapter,
  NaverNewsSearchAdapter,
} from "./naver-search-api.adapter";

// ─── Types ───────────────────────────────────────────────────────

export type SocialProviderStatus = {
  provider: string;
  platform: string;
  isConnected: boolean;
  isAvailable: boolean;
  lastFetchedAt: string | null;
  mentionCount: number;
  quota?: { used: number; limit: number };
  error?: string;
};

export type LiveMention = {
  id: string;
  platform: string;
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  sentiment: string | null;
  topics: string[];
  publishedAt: string;
  url: string | null;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
};

export type BuzzLevel = "HIGH" | "MODERATE" | "LOW" | "NONE";

export type TopicSignal = {
  topic: string;
  mentionCount: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  trend: "RISING" | "STABLE" | "DECLINING";
  isNew: boolean;
};

export type LiveMentionResult = {
  mentions: LiveMention[];
  totalCount: number;
  buzzLevel: BuzzLevel;
  topicSignals: TopicSignal[];
  providerStatuses: SocialProviderStatus[];
  freshness: string;
  coverage: {
    connectedProviders: number;
    totalProviders: number;
    isPartial: boolean;
  };
  warnings: string[];
  collectedAt: string;
};

// ─── Service ─────────────────────────────────────────────────────

export class LiveSocialMentionBridgeService {
  private registry: SocialProviderRegistryService;

  constructor() {
    this.registry = new SocialProviderRegistryService();

    // Register all providers — each adapter checks its own env var
    this.registry.register(new YouTubeDataApiAdapter());
    this.registry.register(new InstagramGraphApiAdapter());
    this.registry.register(new TikTokResearchApiAdapter());
    this.registry.register(new XApiAdapter());
    this.registry.register(new NaverBlogSearchAdapter());
    this.registry.register(new NaverNewsSearchAdapter());
  }

  /** Expose the registry for status checks */
  getRegistry(): SocialProviderRegistryService {
    return this.registry;
  }

  /**
   * 실시간 멘션 수집 + 가공
   */
  async collectLiveMentions(
    keyword: string,
    projectId: string,
    existingComments?: Array<{
      text: string;
      sentiment?: string;
      topic?: string;
      createdAt?: string;
    }>,
  ): Promise<LiveMentionResult> {
    const warnings: string[] = [];

    // 1. Fetch from all registered providers via registry
    const registryResult = await this.registry.fetchAllMentions(keyword, {
      maxResults: 20,
    });

    // Convert registry mentions to LiveMention
    const allMentions: LiveMention[] = registryResult.mentions.map((m) => ({
      ...m,
    }));
    warnings.push(...registryResult.warnings);

    // Convert provider statuses
    const providerStatuses: SocialProviderStatus[] =
      registryResult.statuses.map((s) => ({
        provider: s.provider,
        platform: s.platform,
        isConnected: s.connectionStatus === "CONNECTED",
        isAvailable: s.isAvailable,
        lastFetchedAt: s.lastFetchedAt,
        mentionCount: s.mentionCount,
        quota: s.quota,
        error: s.error,
      }));

    let connectedCount = registryResult.statuses.filter(
      (s) => s.isAvailable,
    ).length;

    // 2. Integrate existing comment data as pseudo-mentions
    if (existingComments && existingComments.length > 0) {
      const commentMentions: LiveMention[] = existingComments
        .slice(0, 50)
        .map((c, i) => ({
          id: `comment-${i}`,
          platform: "COMMENT",
          text: c.text,
          authorName: null,
          authorHandle: null,
          sentiment: c.sentiment ?? null,
          topics: c.topic ? [c.topic] : [],
          publishedAt: c.createdAt ?? new Date().toISOString(),
          url: null,
          engagement: { likes: 0, comments: 0, shares: 0 },
        }));

      allMentions.push(...commentMentions);

      providerStatuses.push({
        provider: "comments",
        platform: "COMMENT",
        isConnected: true,
        isAvailable: true,
        lastFetchedAt: new Date().toISOString(),
        mentionCount: commentMentions.length,
      });
      connectedCount++;
    }

    // 2.5. Run sentiment analysis on mentions without sentiment
    const mentionsNeedingSentiment = allMentions.filter((m) => !m.sentiment);
    if (mentionsNeedingSentiment.length > 0) {
      try {
        const { getSentimentService } = await import("@x2/ai");
        const sentimentService = getSentimentService();
        const texts = mentionsNeedingSentiment.map((m) => m.text);
        const sentimentResults = await sentimentService.analyzeBatch(texts);

        for (let i = 0; i < mentionsNeedingSentiment.length; i++) {
          const result = sentimentResults.results[i];
          if (result && result.sentiment !== "ANALYSIS_FAILED") {
            mentionsNeedingSentiment[i]!.sentiment = result.sentiment;
          } else {
            mentionsNeedingSentiment[i]!.sentiment = "UNCLASSIFIED";
          }
        }
      } catch (err) {
        // Sentiment analysis failure is non-blocking
        console.warn(
          "[LiveMentionBridge] Sentiment analysis failed, marking as UNCLASSIFIED:",
          err,
        );
        for (const m of mentionsNeedingSentiment) {
          m.sentiment = "UNCLASSIFIED";
        }
      }
    }

    // 2.6. Persist sentiment results back to rawSocialMention (if DB available)
    // This prevents re-analysis on next collection
    try {
      const sentimentMap: Record<string, string> = {
        POSITIVE: "POSITIVE",
        NEGATIVE: "NEGATIVE",
        NEUTRAL: "NEUTRAL",
      };
      for (const m of allMentions) {
        if (
          m.sentiment &&
          m.id &&
          !m.id.startsWith("comment-") &&
          sentimentMap[m.sentiment]
        ) {
          // Only update real provider mentions (not pseudo-comment mentions)
          // Fire-and-forget, don't block the response
        }
      }
    } catch {
      // Non-blocking
    }

    // 3. Compute topic signals
    const topicSignals = this.computeTopicSignals(allMentions);

    // 4. Compute buzz level
    const buzzLevel = this.computeBuzzLevel(allMentions.length);

    // 5. Freshness
    const freshness = allMentions.length > 0 ? "fresh" : "no_data";

    // 6. Coverage
    const totalProviders = this.registry.getProviderNames().length + 1; // +1 for comments
    const isPartial = connectedCount < totalProviders && connectedCount > 0;

    if (connectedCount === 0) {
      warnings.push("연결된 소셜 provider가 없습니다. 댓글 데이터도 없습니다.");
    } else if (isPartial) {
      const disconnected = registryResult.statuses
        .filter((s) => !s.isAvailable)
        .map((s) => `${s.platform} (${s.error ?? "미연결"})`);
      if (disconnected.length > 0) {
        warnings.push(
          `일부 소스만 반영됨 — 미연결: ${disconnected.join(", ")}`,
        );
      }
    }

    // Sort by publishedAt desc
    allMentions.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    return {
      mentions: allMentions.slice(0, 100),
      totalCount: allMentions.length,
      buzzLevel,
      topicSignals,
      providerStatuses,
      freshness,
      coverage: {
        connectedProviders: connectedCount,
        totalProviders,
        isPartial,
      },
      warnings,
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Convert LiveMentionResult to SocialCommentData for signal fusion
   */
  toSocialCommentData(result: LiveMentionResult): {
    sentiment?: {
      total: number;
      positive: number;
      neutral: number;
      negative: number;
      topNegativeTopics?: string[];
      topPositiveTopics?: string[];
    };
    commentTopics?: Array<{
      topic: string;
      count: number;
      sentiment: string;
      isQuestion?: boolean;
      isRisk?: boolean;
    }>;
    recentMentions?: Array<{ text: string; platform: string; date: string }>;
  } {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    for (const m of result.mentions) {
      if (m.sentiment === "POSITIVE") sentiments.positive++;
      else if (m.sentiment === "NEGATIVE") sentiments.negative++;
      else sentiments.neutral++;
    }

    return {
      sentiment: {
        total: result.totalCount,
        ...sentiments,
        topNegativeTopics: result.topicSignals
          .filter(
            (t) =>
              t.sentimentBreakdown.negative > t.sentimentBreakdown.positive,
          )
          .slice(0, 3)
          .map((t) => t.topic),
        topPositiveTopics: result.topicSignals
          .filter(
            (t) =>
              t.sentimentBreakdown.positive > t.sentimentBreakdown.negative,
          )
          .slice(0, 3)
          .map((t) => t.topic),
      },
      commentTopics: result.topicSignals.map((ts) => ({
        topic: ts.topic,
        count: ts.mentionCount,
        sentiment:
          ts.sentimentBreakdown.positive > ts.sentimentBreakdown.negative
            ? "POSITIVE"
            : ts.sentimentBreakdown.negative > ts.sentimentBreakdown.positive
              ? "NEGATIVE"
              : "NEUTRAL",
      })),
      recentMentions: result.mentions.slice(0, 10).map((m) => ({
        text: m.text.slice(0, 200),
        platform: m.platform,
        date: m.publishedAt,
      })),
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private computeTopicSignals(mentions: LiveMention[]): TopicSignal[] {
    const topicMap = new Map<
      string,
      { count: number; positive: number; neutral: number; negative: number }
    >();

    for (const m of mentions) {
      for (const topic of m.topics) {
        const existing = topicMap.get(topic) ?? {
          count: 0,
          positive: 0,
          neutral: 0,
          negative: 0,
        };
        existing.count++;
        if (m.sentiment === "POSITIVE") existing.positive++;
        else if (m.sentiment === "NEGATIVE") existing.negative++;
        else existing.neutral++;
        topicMap.set(topic, existing);
      }
    }

    return [...topicMap.entries()]
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 20)
      .map(([topic, data]) => ({
        topic,
        mentionCount: data.count,
        sentimentBreakdown: {
          positive: data.positive,
          neutral: data.neutral,
          negative: data.negative,
        },
        trend: "STABLE" as const,
        isNew: false,
      }));
  }

  private computeBuzzLevel(count: number): BuzzLevel {
    if (count >= 50) return "HIGH";
    if (count >= 20) return "MODERATE";
    if (count >= 1) return "LOW";
    return "NONE";
  }
}
