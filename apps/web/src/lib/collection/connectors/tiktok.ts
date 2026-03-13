// ─────────────────────────────────────────────
// TikTok Connector (Scaffold)
// ─────────────────────────────────────────────
// Uses TikTok Research API
// Requires: TIKTOK_ACCESS_TOKEN environment variable
// Docs: https://developers.tiktok.com/doc/research-api

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

export class TikTokApiConnector extends BaseConnector {
  readonly id = "tiktok-api";
  readonly platform: PlatformCode = "tiktok";
  readonly sourceType: SourceType = "api";
  readonly supportedCollections: CollectionType[] = ["channel", "content"];

  private accessToken: string;

  constructor(config: ConnectorConfig = {}) {
    super(config);
    this.accessToken =
      config.accessToken || process.env.TIKTOK_ACCESS_TOKEN || "";
  }

  async collectChannel(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>> {
    const start = Date.now();
    if (!this.accessToken) {
      return this.buildError(
        "channel",
        "TikTok access token not configured. Set TIKTOK_ACCESS_TOKEN.",
        start,
      );
    }
    return this.buildError(
      "channel",
      "TikTok channel collection scaffold — pending Research API integration.",
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
        "TikTok access token not configured.",
        start,
      );
    }
    return this.buildError(
      "content",
      "TikTok content collection scaffold — pending Research API integration.",
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
