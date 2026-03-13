// ─────────────────────────────────────────────
// Connector Registry & Resolver
// ─────────────────────────────────────────────
// Central registry for all data connectors.
// Resolves the best connector for a given platform + source type.

import type {
  DataConnector,
  PlatformCode,
  SourceType,
  CollectionType,
  ConnectorHealthStatus,
} from "./types";
import {
  YouTubeApiConnector,
  InstagramApiConnector,
  TikTokApiConnector,
  XApiConnector,
  GenericCrawlerConnector,
  MockConnector,
} from "./connectors";

class ConnectorRegistry {
  private connectors: Map<string, DataConnector> = new Map();

  register(connector: DataConnector): void {
    this.connectors.set(connector.id, connector);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }

  get(id: string): DataConnector | undefined {
    return this.connectors.get(id);
  }

  getAll(): DataConnector[] {
    return Array.from(this.connectors.values());
  }

  getByPlatform(platform: PlatformCode): DataConnector[] {
    return this.getAll().filter((c) => c.platform === platform);
  }

  getBySourceType(sourceType: SourceType): DataConnector[] {
    return this.getAll().filter((c) => c.sourceType === sourceType);
  }

  resolve(
    platform: PlatformCode,
    collectionType: CollectionType,
    preferredSource?: SourceType,
  ): DataConnector | null {
    const candidates = this.getByPlatform(platform).filter((c) =>
      c.supportedCollections.includes(collectionType),
    );

    if (candidates.length === 0) return null;

    // Prefer the requested source type
    if (preferredSource) {
      const preferred = candidates.find(
        (c) => c.sourceType === preferredSource,
      );
      if (preferred) return preferred;
    }

    // Fallback priority: api → crawler → mock → manual
    const priority: SourceType[] = ["api", "crawler", "mock", "manual"];
    for (const st of priority) {
      const match = candidates.find((c) => c.sourceType === st);
      if (match) return match;
    }

    return candidates[0] || null;
  }

  resolveMock(platform: PlatformCode): DataConnector | null {
    return (
      this.getByPlatform(platform).find((c) => c.sourceType === "mock") || null
    );
  }

  async healthCheckAll(): Promise<ConnectorHealthStatus[]> {
    const results: ConnectorHealthStatus[] = [];
    for (const connector of this.getAll()) {
      const status = await connector.healthCheck();
      results.push(status);
    }
    return results;
  }
}

// ── Default registry with all connectors ──

function createDefaultRegistry(): ConnectorRegistry {
  const registry = new ConnectorRegistry();

  // API connectors
  registry.register(new YouTubeApiConnector());
  registry.register(new InstagramApiConnector());
  registry.register(new TikTokApiConnector());
  registry.register(new XApiConnector());

  // Crawler connectors
  registry.register(
    new GenericCrawlerConnector("naver_blog", [
      "channel",
      "content",
      "comment",
      "mention",
    ]),
  );
  registry.register(
    new GenericCrawlerConnector("naver_cafe", [
      "content",
      "comment",
      "mention",
    ]),
  );
  registry.register(
    new GenericCrawlerConnector("blog", ["content", "mention"]),
  );
  registry.register(
    new GenericCrawlerConnector("community", ["content", "comment", "mention"]),
  );
  registry.register(
    new GenericCrawlerConnector("news", ["content", "mention"]),
  );
  registry.register(
    new GenericCrawlerConnector("website", ["content", "mention"]),
  );

  // Mock connectors (dev/test mode)
  registry.register(new MockConnector("youtube"));
  registry.register(new MockConnector("instagram"));
  registry.register(new MockConnector("tiktok"));
  registry.register(new MockConnector("x"));
  registry.register(new MockConnector("naver_blog"));
  registry.register(new MockConnector("news"));

  return registry;
}

export const connectorRegistry = createDefaultRegistry();
