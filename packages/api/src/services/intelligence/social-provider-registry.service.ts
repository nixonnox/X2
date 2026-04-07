/**
 * SocialProviderRegistryService
 *
 * Provider 등록/상태 관리/연결 테스트를 담당하는 중앙 레지스트리.
 * 각 provider는 SocialProviderAdapter 인터페이스를 구현해야 한다.
 */

// ─── Types ───────────────────────────────────────────────────────

export type ProviderConnectionStatus =
  | "CONNECTED"
  | "NOT_CONNECTED"
  | "ERROR"
  | "RATE_LIMITED"
  | "AUTH_EXPIRED";

export type SocialMention = {
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

export type ProviderFetchResult = {
  mentions: SocialMention[];
  fetchedAt: string;
  quotaUsed?: number;
  quotaRemaining?: number;
  error?: string;
};

export type ProviderConfig = {
  name: string;
  platform: string;
  requiresApiKey: boolean;
  envKeyName: string;
  authType: "API_KEY" | "OAUTH2" | "BEARER_TOKEN" | "NONE";
  rateLimitPerDay?: number;
  documentation: string;
};

export type ProviderStatus = {
  provider: string;
  platform: string;
  connectionStatus: ProviderConnectionStatus;
  isAvailable: boolean;
  lastFetchedAt: string | null;
  mentionCount: number;
  quota?: { used: number; limit: number };
  error?: string;
  config: ProviderConfig;
};

// ─── Adapter Interface ───────────────────────────────────────────

export interface SocialProviderAdapter {
  readonly config: ProviderConfig;

  /** Check if the provider has valid credentials configured */
  isConfigured(): boolean;

  /** Test the connection (lightweight API call) */
  testConnection(): Promise<{ ok: boolean; error?: string }>;

  /** Fetch mentions for a keyword */
  fetchMentions(
    keyword: string,
    options?: {
      maxResults?: number;
      since?: Date;
    },
  ): Promise<ProviderFetchResult>;
}

// ─── Registry ────────────────────────────────────────────────────

export class SocialProviderRegistryService {
  private adapters = new Map<string, SocialProviderAdapter>();
  private statusCache = new Map<
    string,
    {
      status: ProviderConnectionStatus;
      lastChecked: Date;
      error?: string;
    }
  >();

  /** Register a provider adapter */
  register(adapter: SocialProviderAdapter): void {
    this.adapters.set(adapter.config.name, adapter);
  }

  /** Get all registered provider names */
  getProviderNames(): string[] {
    return [...this.adapters.keys()];
  }

  /** Get a specific adapter */
  getAdapter(name: string): SocialProviderAdapter | undefined {
    return this.adapters.get(name);
  }

  /** Get status for all providers */
  async getAllStatuses(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [name, adapter] of this.adapters) {
      const cached = this.statusCache.get(name);
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      let connectionStatus: ProviderConnectionStatus;
      let error: string | undefined;

      if (!adapter.isConfigured()) {
        connectionStatus = "NOT_CONNECTED";
        error = "API 키 미설정";
      } else if (
        cached &&
        Date.now() - cached.lastChecked.getTime() < staleThreshold
      ) {
        connectionStatus = cached.status;
        error = cached.error;
      } else {
        const test = await adapter.testConnection();
        connectionStatus = test.ok ? "CONNECTED" : "ERROR";
        error = test.error;
        this.statusCache.set(name, {
          status: connectionStatus,
          lastChecked: new Date(),
          error,
        });
      }

      statuses.push({
        provider: name,
        platform: adapter.config.platform,
        connectionStatus,
        isAvailable: connectionStatus === "CONNECTED",
        lastFetchedAt: null,
        mentionCount: 0,
        error,
        config: adapter.config,
      });
    }

    return statuses;
  }

  /** Fetch mentions from all connected providers */
  async fetchAllMentions(
    keyword: string,
    options?: { maxResults?: number; since?: Date },
  ): Promise<{
    mentions: SocialMention[];
    statuses: ProviderStatus[];
    warnings: string[];
  }> {
    const allMentions: SocialMention[] = [];
    const statuses: ProviderStatus[] = [];
    const warnings: string[] = [];

    for (const [name, adapter] of this.adapters) {
      const status: ProviderStatus = {
        provider: name,
        platform: adapter.config.platform,
        connectionStatus: "NOT_CONNECTED",
        isAvailable: false,
        lastFetchedAt: null,
        mentionCount: 0,
        config: adapter.config,
      };

      if (!adapter.isConfigured()) {
        status.connectionStatus = "NOT_CONNECTED";
        status.error = "API 키 미설정";
        statuses.push(status);
        continue;
      }

      try {
        const result = await adapter.fetchMentions(keyword, options);
        status.connectionStatus = "CONNECTED";
        status.isAvailable = true;
        status.mentionCount = result.mentions.length;
        status.lastFetchedAt = result.fetchedAt;
        if (
          result.quotaUsed !== undefined &&
          result.quotaRemaining !== undefined
        ) {
          status.quota = {
            used: result.quotaUsed,
            limit: result.quotaUsed + result.quotaRemaining,
          };
        }
        if (result.error) {
          warnings.push(`${name}: ${result.error}`);
        }
        allMentions.push(...result.mentions);
      } catch (err: any) {
        const message = err.message ?? "수집 실패";
        if (message.includes("quota") || message.includes("rate")) {
          status.connectionStatus = "RATE_LIMITED";
        } else if (
          message.includes("auth") ||
          message.includes("token") ||
          message.includes("401")
        ) {
          status.connectionStatus = "AUTH_EXPIRED";
        } else {
          status.connectionStatus = "ERROR";
        }
        status.error = message;
        warnings.push(`${name}: ${message}`);
      }

      statuses.push(status);
    }

    // Sort by publishedAt desc
    allMentions.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    return { mentions: allMentions.slice(0, 100), statuses, warnings };
  }
}
