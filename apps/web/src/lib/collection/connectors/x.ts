// ─────────────────────────────────────────────
// X (Twitter) Connector (Scaffold)
// ─────────────────────────────────────────────
// Uses X API v2
// Requires: X_BEARER_TOKEN environment variable
// Docs: https://developer.x.com/en/docs/x-api

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

export class XApiConnector extends BaseConnector {
  readonly id = "x-api";
  readonly platform: PlatformCode = "x";
  readonly sourceType: SourceType = "api";
  readonly supportedCollections: CollectionType[] = [
    "channel",
    "content",
    "comment",
    "mention",
  ];

  private bearerToken: string;

  constructor(config: ConnectorConfig = {}) {
    super(config);
    this.bearerToken = config.accessToken || process.env.X_BEARER_TOKEN || "";
  }

  async collectChannel(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>> {
    const start = Date.now();
    if (!this.bearerToken) {
      return this.buildError(
        "channel",
        "X bearer token not configured. Set X_BEARER_TOKEN.",
        start,
      );
    }
    return this.buildError(
      "channel",
      "X channel collection scaffold — pending API v2 integration.",
      start,
    );
  }

  async collectContent(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    if (!this.bearerToken) {
      return this.buildError(
        "content",
        "X bearer token not configured.",
        start,
      );
    }
    return this.buildError(
      "content",
      "X content collection scaffold — pending API v2 integration.",
      start,
    );
  }

  async collectComments(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    if (!this.bearerToken) {
      return this.buildError(
        "comment",
        "X bearer token not configured.",
        start,
      );
    }
    return this.buildError(
      "comment",
      "X comment collection scaffold — pending API v2 integration.",
      start,
    );
  }

  async collectMentions(
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    const start = Date.now();
    if (!this.bearerToken) {
      return this.buildError(
        "mention",
        "X bearer token not configured.",
        start,
      );
    }
    return this.buildError(
      "mention",
      "X mention collection scaffold — pending API v2 integration.",
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
      message: this.bearerToken
        ? "Scaffold connector — implementation pending"
        : "Bearer token not configured",
    };
  }
}
