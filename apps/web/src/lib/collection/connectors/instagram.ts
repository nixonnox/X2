// ─────────────────────────────────────────────
// Instagram Connector (Scaffold)
// ─────────────────────────────────────────────
// Uses Instagram Graph API (Business/Creator accounts)
// Requires: INSTAGRAM_ACCESS_TOKEN environment variable
// Docs: https://developers.facebook.com/docs/instagram-api

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

export class InstagramApiConnector extends BaseConnector {
  readonly id = "instagram-api";
  readonly platform: PlatformCode = "instagram";
  readonly sourceType: SourceType = "api";
  readonly supportedCollections: CollectionType[] = [
    "channel",
    "content",
    "comment",
  ];

  private accessToken: string;
  private baseUrl: string;

  constructor(config: ConnectorConfig = {}) {
    super(config);
    this.accessToken =
      config.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || "";
    this.baseUrl = config.baseUrl || "https://graph.instagram.com/v18.0";
  }

  async collectChannel(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>> {
    const start = Date.now();

    if (!this.accessToken) {
      return this.buildError(
        "channel",
        "Instagram access token not configured. Set INSTAGRAM_ACCESS_TOKEN.",
        start,
      );
    }

    // Scaffold: Real implementation would call Instagram Graph API
    // GET /{user-id}?fields=id,username,name,biography,profile_picture_url,followers_count,media_count
    return this.buildError(
      "channel",
      "Instagram channel collection not yet implemented. Connector scaffold ready for Graph API integration.",
      start,
    );
  }

  async collectContent(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();

    if (!this.accessToken) {
      return this.buildError(
        "content",
        "Instagram access token not configured.",
        start,
      );
    }

    // Scaffold: Real implementation would call:
    // GET /{user-id}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count
    return this.buildError(
      "content",
      "Instagram content collection not yet implemented. Connector scaffold ready for Graph API integration.",
      start,
    );
  }

  async collectComments(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();

    if (!this.accessToken) {
      return this.buildError(
        "comment",
        "Instagram access token not configured.",
        start,
      );
    }

    // Scaffold: Real implementation would call:
    // GET /{media-id}/comments?fields=id,text,username,timestamp,like_count
    return this.buildError(
      "comment",
      "Instagram comment collection not yet implemented. Connector scaffold ready for Graph API integration.",
      start,
    );
  }

  async healthCheck(): Promise<ConnectorHealthStatus> {
    return {
      connectorId: this.id,
      platform: this.platform,
      sourceType: this.sourceType,
      healthy: false,
      latencyMs: null,
      lastCheckedAt: new Date().toISOString(),
      message: this.accessToken
        ? "Scaffold connector — implementation pending"
        : "Access token not configured",
    };
  }
}
