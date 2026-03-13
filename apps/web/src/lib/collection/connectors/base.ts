// ─────────────────────────────────────────────
// Base Connector — Abstract foundation for all connectors
// ─────────────────────────────────────────────

import type {
  DataConnector,
  PlatformCode,
  SourceType,
  CollectionType,
  CollectionTarget,
  ConnectorConfig,
  ConnectorHealthStatus,
  RawCollectionResult,
} from "../types";

export abstract class BaseConnector implements DataConnector {
  abstract readonly id: string;
  abstract readonly platform: PlatformCode;
  abstract readonly sourceType: SourceType;
  abstract readonly supportedCollections: CollectionType[];

  protected config: ConnectorConfig;

  constructor(config: ConnectorConfig = {}) {
    this.config = {
      rateLimit: 60,
      timeout: 30000,
      retryPolicy: "exponential",
      maxRetries: 3,
      ...config,
    };
  }

  async collectChannel(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown>> {
    return this.unsupported("channel", target);
  }

  async collectContent(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    return this.unsupported("content", target);
  }

  async collectComments(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    return this.unsupported("comment", target);
  }

  async collectMentions(
    target: CollectionTarget,
  ): Promise<RawCollectionResult<unknown[]>> {
    return this.unsupported("mention", target);
  }

  async healthCheck(): Promise<ConnectorHealthStatus> {
    return {
      connectorId: this.id,
      platform: this.platform,
      sourceType: this.sourceType,
      healthy: true,
      latencyMs: null,
      lastCheckedAt: new Date().toISOString(),
      message: "Health check not implemented",
    };
  }

  // ── Helpers ──

  protected buildResult<T>(
    collectionType: CollectionType,
    data: T,
    itemCount: number,
    startTime: number,
    extra?: Partial<RawCollectionResult<T>["metadata"]>,
  ): RawCollectionResult<T> {
    return {
      success: true,
      data,
      metadata: {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        collectionType,
        collectedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        itemCount,
        ...extra,
      },
    };
  }

  protected buildError<T>(
    collectionType: CollectionType,
    error: string,
    startTime: number,
  ): RawCollectionResult<T> {
    return {
      success: false,
      data: null,
      error,
      metadata: {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        collectionType,
        collectedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        itemCount: 0,
      },
    };
  }

  private unsupported<T>(
    type: CollectionType,
    _target: CollectionTarget,
  ): Promise<RawCollectionResult<T>> {
    return Promise.resolve({
      success: false,
      data: null,
      error: `${this.id} connector does not support ${type} collection`,
      metadata: {
        connectorId: this.id,
        platform: this.platform,
        sourceType: this.sourceType,
        collectionType: type,
        collectedAt: new Date().toISOString(),
        durationMs: 0,
        itemCount: 0,
      },
    });
  }
}
