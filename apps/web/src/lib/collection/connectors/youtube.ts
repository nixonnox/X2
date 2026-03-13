// ─────────────────────────────────────────────
// YouTube API Connector
// ─────────────────────────────────────────────
// Uses YouTube Data API v3
// Requires: YOUTUBE_API_KEY environment variable
// Docs: https://developers.google.com/youtube/v3

import type {
  PlatformCode,
  SourceType,
  CollectionType,
  CollectionTarget,
  ConnectorConfig,
  ConnectorHealthStatus,
  RawCollectionResult,
} from "../types";
import { BaseConnector } from "./base";

type YouTubeChannelRaw = {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl: string;
    thumbnails: { default: { url: string } };
    publishedAt: string;
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
};

type YouTubeVideoRaw = {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    thumbnails: { medium: { url: string } };
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: { duration: string };
};

type YouTubeCommentRaw = {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: {
        authorDisplayName: string;
        authorProfileImageUrl: string;
        textDisplay: string;
        publishedAt: string;
        likeCount: number;
      };
    };
    totalReplyCount: number;
    videoId: string;
  };
};

export class YouTubeApiConnector extends BaseConnector {
  readonly id = "youtube-api";
  readonly platform: PlatformCode = "youtube";
  readonly sourceType: SourceType = "api";
  readonly supportedCollections: CollectionType[] = [
    "channel",
    "content",
    "comment",
    "mention",
  ];

  private apiKey: string;
  private baseUrl: string;

  constructor(config: ConnectorConfig = {}) {
    super(config);
    this.apiKey = config.apiKey || process.env.YOUTUBE_API_KEY || "";
    this.baseUrl = config.baseUrl || "https://www.googleapis.com/youtube/v3";
  }

  async collectChannel(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<YouTubeChannelRaw>> {
    const start = Date.now();

    if (!this.apiKey) {
      return this.buildError(
        "channel",
        "YouTube API key not configured. Set YOUTUBE_API_KEY.",
        start,
      );
    }

    try {
      const url = `${this.baseUrl}/channels?part=snippet,statistics&id=${target.channelId}&key=${this.apiKey}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!res.ok) {
        return this.buildError(
          "channel",
          `YouTube API error: ${res.status} ${res.statusText}`,
          start,
        );
      }

      const json = await res.json();
      const item = json.items?.[0];

      if (!item) {
        return this.buildError(
          "channel",
          `Channel not found: ${target.channelId}`,
          start,
        );
      }

      return this.buildResult("channel", item as YouTubeChannelRaw, 1, start);
    } catch (err) {
      return this.buildError(
        "channel",
        `YouTube channel collection failed: ${(err as Error).message}`,
        start,
      );
    }
  }

  async collectContent(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<YouTubeVideoRaw[]>> {
    const start = Date.now();

    if (!this.apiKey) {
      return this.buildError(
        "content",
        "YouTube API key not configured.",
        start,
      );
    }

    try {
      const limit = target.options?.limit || 20;
      const searchUrl = `${this.baseUrl}/search?part=id&channelId=${target.channelId}&type=video&order=date&maxResults=${limit}&key=${this.apiKey}`;
      const searchRes = await fetch(searchUrl, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!searchRes.ok) {
        return this.buildError(
          "content",
          `YouTube search API error: ${searchRes.status}`,
          start,
        );
      }

      const searchJson = await searchRes.json();
      const videoIds = searchJson.items
        ?.map((i: { id: { videoId: string } }) => i.id.videoId)
        .join(",");

      if (!videoIds) {
        return this.buildResult("content", [], 0, start);
      }

      const videosUrl = `${this.baseUrl}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${this.apiKey}`;
      const videosRes = await fetch(videosUrl, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });
      const videosJson = await videosRes.json();

      return this.buildResult(
        "content",
        videosJson.items as YouTubeVideoRaw[],
        videosJson.items?.length || 0,
        start,
      );
    } catch (err) {
      return this.buildError(
        "content",
        `YouTube content collection failed: ${(err as Error).message}`,
        start,
      );
    }
  }

  async collectComments(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<YouTubeCommentRaw[]>> {
    const start = Date.now();

    if (!this.apiKey) {
      return this.buildError(
        "comment",
        "YouTube API key not configured.",
        start,
      );
    }

    try {
      const limit = target.options?.limit || 50;
      const url = `${this.baseUrl}/commentThreads?part=snippet&videoId=${target.contentId}&maxResults=${limit}&order=relevance&key=${this.apiKey}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!res.ok) {
        return this.buildError(
          "comment",
          `YouTube comments API error: ${res.status}`,
          start,
        );
      }

      const json = await res.json();
      return this.buildResult(
        "comment",
        json.items as YouTubeCommentRaw[],
        json.items?.length || 0,
        start,
      );
    } catch (err) {
      return this.buildError(
        "comment",
        `YouTube comment collection failed: ${(err as Error).message}`,
        start,
      );
    }
  }

  async collectMentions(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();

    if (!this.apiKey) {
      return this.buildError(
        "mention",
        "YouTube API key not configured.",
        start,
      );
    }

    try {
      const keyword = target.keyword || "";
      const limit = target.options?.limit || 20;
      const url = `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=${limit}&order=date&key=${this.apiKey}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!res.ok) {
        return this.buildError(
          "mention",
          `YouTube search API error: ${res.status}`,
          start,
        );
      }

      const json = await res.json();
      return this.buildResult(
        "mention",
        json.items || [],
        json.items?.length || 0,
        start,
      );
    } catch (err) {
      return this.buildError(
        "mention",
        `YouTube mention collection failed: ${(err as Error).message}`,
        start,
      );
    }
  }

  async healthCheck(): Promise<ConnectorHealthStatus> {
    const start = Date.now();

    if (!this.apiKey) {
      return {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        healthy: false,
        latencyMs: null,
        lastCheckedAt: new Date().toISOString(),
        message: "API key not configured",
      };
    }

    try {
      const url = `${this.baseUrl}/channels?part=id&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=${this.apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

      return {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        healthy: res.ok,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        message: res.ok ? "YouTube API 정상 연결" : `API error: ${res.status}`,
      };
    } catch (err) {
      return {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        healthy: false,
        latencyMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        message: `Connection failed: ${(err as Error).message}`,
      };
    }
  }
}
