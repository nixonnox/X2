/**
 * Platform Adapter.
 *
 * Bridges @x2/social SocialProvider to the repository/service layer.
 * Each method:
 *   1. Calls the @x2/social provider
 *   2. Normalizes the response
 *   3. Persists via repositories
 *   4. Returns collection metrics
 *
 * This is the single integration point between external APIs and our data layer.
 */

import type { SocialProvider } from "@x2/social";
import { createProvider, PlatformApiError, RateLimitError } from "@x2/social";
import type { SupportedPlatform } from "./types";
import type { Repositories } from "../../repositories";
import type { Logger } from "../types";
import { normalizeChannel, normalizeContent } from "./normalization";
import type {
  NormalizedChannel,
  NormalizedContent,
  ChannelCollectionResult,
  CollectionScope,
  RetryPolicy,
} from "./types";
import { DEFAULT_RETRY_POLICY } from "./types";
import { CollectionHealthTracker } from "./collection-health";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class PlatformAdapter {
  private providers = new Map<string, SocialProvider>();

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Get or create a SocialProvider for the given platform.
   */
  private getProvider(platform: SupportedPlatform): SocialProvider {
    let provider = this.providers.get(platform);
    if (!provider) {
      provider = createProvider(platform as any);
      this.providers.set(platform, provider);
    }
    return provider;
  }

  /**
   * Collect all data for a single channel scope.
   * Runs channel info → contents → comments → snapshot in sequence.
   */
  async collectChannel(
    scope: CollectionScope,
  ): Promise<ChannelCollectionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let channelUpdated = false;
    let newContentCount = 0;
    let newCommentCount = 0;
    let snapshotRecorded = false;

    const provider = this.getProvider(scope.platform);

    // 1. Sync channel info
    if (
      scope.types.includes("channel_info") ||
      scope.types.includes("contents")
    ) {
      const result = await this.withRetry(
        () => this.syncChannelInfo(provider, scope),
        "channel_info",
        scope,
      );
      if (result.success) {
        channelUpdated = true;
      } else {
        errors.push(result.error);
      }
    }

    // 2. Sync contents — collect content DB IDs for metric recording
    const contentDbIds: Array<{ dbId: string; normalized: NormalizedContent }> =
      [];

    if (scope.types.includes("contents")) {
      const result = await this.withRetry(
        () => this.syncContents(provider, scope),
        "contents",
        scope,
      );
      if (result.success) {
        newContentCount = result.data.newCount;
        contentDbIds.push(...result.data.contentRecords);
      } else {
        errors.push(result.error);
      }
    }

    // 3. Record daily metrics for collected contents (single pass, no re-upsert)
    if (contentDbIds.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (const { dbId, normalized } of contentDbIds) {
        try {
          await this.repositories.content.upsertDailyMetric(dbId, today, {
            viewCount: normalized.viewCount,
            likeCount: normalized.likeCount,
            commentCount: normalized.commentCount,
            shareCount: 0,
            engagementRate: normalized.engagementRate,
          });
        } catch (error) {
          // Non-fatal — log but continue
          this.logger.warn("Failed to record content metric", {
            contentId: dbId,
            error: error instanceof Error ? error.message : "Unknown",
          });
        }
      }
    }

    // 4. Sync comments for existing content items
    if (scope.types.includes("comments")) {
      const result = await this.withRetry(
        () => this.syncComments(scope),
        "comments",
        scope,
      );
      if (result.success) {
        newCommentCount = result.data;
      } else {
        errors.push(result.error);
      }
    }

    // 5. Record daily channel snapshot
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const channel = await this.repositories.channel.findById(scope.channelId);
      if (channel) {
        await this.repositories.channel.upsertSnapshot(scope.channelId, today, {
          subscriberCount: channel.subscriberCount,
          contentCount: channel.contentCount,
          totalViews: BigInt(0),
          avgEngagement: 0,
        });
        snapshotRecorded = true;
      }
    } catch (error) {
      const msg = this.formatError("snapshot", error);
      errors.push(msg);
    }

    // 6. Update lastSyncedAt
    try {
      await this.repositories.channel.update(scope.channelId, {
        lastSyncedAt: new Date(),
      });
    } catch (error) {
      this.logger.warn("Failed to update lastSyncedAt", {
        channelId: scope.channelId,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }

    return {
      channelId: scope.channelId,
      channelName: scope.channelName,
      platform: scope.platform,
      channelUpdated,
      newContentCount,
      newCommentCount,
      snapshotRecorded,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  // ---------------------------------------------------------------------------
  // Collection phases
  // ---------------------------------------------------------------------------

  /**
   * Phase 1: Fetch and persist channel info.
   */
  private async syncChannelInfo(
    provider: SocialProvider,
    scope: CollectionScope,
  ): Promise<void> {
    const channelInfo = await provider.getChannelInfo(scope.platformChannelId);
    const normalized = normalizeChannel(channelInfo);
    await this.repositories.channel.update(scope.channelId, {
      name: normalized.name,
      thumbnailUrl: normalized.thumbnailUrl,
      subscriberCount: normalized.subscriberCount,
      contentCount: normalized.contentCount,
    });
  }

  /**
   * Phase 2: Fetch and persist contents.
   * Returns DB IDs + normalized data for metric recording (avoids double upsert).
   */
  private async syncContents(
    provider: SocialProvider,
    scope: CollectionScope,
  ): Promise<{
    newCount: number;
    contentRecords: Array<{ dbId: string; normalized: NormalizedContent }>;
  }> {
    const contents = await provider.getContents(scope.platformChannelId, {
      limit: 50,
    });
    let newCount = 0;
    const contentRecords: Array<{
      dbId: string;
      normalized: NormalizedContent;
    }> = [];

    for (const raw of contents) {
      const normalized = normalizeContent(raw, scope.platform);
      const result = await this.repositories.content.upsert(
        scope.channelId,
        normalized.platformContentId,
        {
          title: normalized.title,
          description: normalized.description,
          type: normalized.contentType as any,
          platform: scope.platform as any,
          url: normalized.url,
          thumbnailUrl: normalized.thumbnailUrl,
          publishedAt: normalized.publishedAt,
          viewCount: normalized.viewCount,
          likeCount: normalized.likeCount,
          commentCount: normalized.commentCount,
          engagementRate: normalized.engagementRate,
        },
      );

      // Track new vs updated
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        newCount++;
      }

      // Store DB ID for metric recording — no second upsert needed
      contentRecords.push({ dbId: result.id, normalized });
    }

    return { newCount, contentRecords };
  }

  /**
   * Phase 3: Fetch and persist comments for channel's content items.
   * Uses comment.bulkCreate with skipDuplicates for idempotent inserts.
   */
  private async syncComments(scope: CollectionScope): Promise<number> {
    // Get recent content items for this channel to fetch comments for
    const contentResult = await this.repositories.content.findByChannel(
      scope.channelId,
      { page: 1, pageSize: 20 },
    );

    if (contentResult.data.length === 0) {
      return 0;
    }

    // TODO: [INTEGRATION] @x2/social — Add getComments() to SocialProvider interface
    // When implemented:
    //   const provider = this.getProvider(scope.platform);
    //   for (const content of contentResult.data) {
    //     const rawComments = await provider.getComments(content.platformContentId);
    //     const normalized = rawComments.map(c => normalizeYouTubeComment(c));
    //     const records = normalized.map(c => ({
    //       platformCommentId: c.platformCommentId,
    //       authorName: c.authorName,
    //       authorProfileUrl: c.authorProfileUrl,
    //       text: c.text,
    //       likeCount: c.likeCount,
    //       publishedAt: c.publishedAt,
    //       isReply: c.isReply,
    //       contentId: content.id,
    //     }));
    //     await this.repositories.comment.bulkCreate(records);
    //     totalNew += records.length;
    //   }

    this.logger.info(
      "Comment sync skipped — SocialProvider.getComments() not yet available",
      {
        channelId: scope.channelId,
        platform: scope.platform,
        contentCount: contentResult.data.length,
      },
    );

    return 0;
  }

  // ---------------------------------------------------------------------------
  // Retry logic
  // ---------------------------------------------------------------------------

  /**
   * Execute an async operation with exponential backoff retry.
   * Only retries on retryable errors (RateLimit, server errors).
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    phase: string,
    scope: CollectionScope,
    policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  ): Promise<{ success: true; data: T } | { success: false; error: string }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        const data = await operation();
        return { success: true, data };
      } catch (error) {
        lastError = error;

        // Don't retry non-retryable errors
        if (!this.isRetryable(error)) {
          const msg = this.formatError(phase, error);
          this.logger.warn(`${phase} failed (not retryable)`, {
            channelId: scope.channelId,
            platform: scope.platform,
            error: msg,
          });
          return { success: false, error: msg };
        }

        // Calculate delay
        const delay = CollectionHealthTracker.calculateRetryDelay(
          attempt,
          policy,
        );
        if (delay < 0) break; // Max retries reached

        this.logger.warn(
          `${phase} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${policy.maxRetries})`,
          {
            channelId: scope.channelId,
            platform: scope.platform,
            error: error instanceof Error ? error.message : "Unknown",
          },
        );

        await this.sleep(delay);
      }
    }

    const msg = this.formatError(phase, lastError);
    this.logger.error(`${phase} failed after ${policy.maxRetries} retries`, {
      channelId: scope.channelId,
      platform: scope.platform,
      error: msg,
    });
    return { success: false, error: msg };
  }

  /**
   * Check if an error is retryable.
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof PlatformApiError) {
      // Server errors are retryable
      return error.statusCode >= 500 && error.statusCode < 600;
    }
    // Network errors (no status code) are retryable
    if (error instanceof TypeError && error.message.includes("fetch"))
      return true;
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ---------------------------------------------------------------------------
  // Error formatting
  // ---------------------------------------------------------------------------

  /**
   * Format an error into a log-friendly string.
   */
  private formatError(phase: string, error: unknown): string {
    if (error instanceof RateLimitError) {
      return `[${phase}] Rate limited — retry after ${error.retryAfterMs}ms`;
    }
    if (error instanceof PlatformApiError) {
      return `[${phase}] API error ${error.statusCode}: ${error.message}`;
    }
    if (error instanceof Error) {
      return `[${phase}] ${error.message}`;
    }
    return `[${phase}] Unknown error`;
  }
}
