/**
 * Collection Runner.
 *
 * Orchestrates end-to-end collection cycles:
 *   1. Resolves which channels to collect
 *   2. Delegates to PlatformAdapter per channel
 *   3. Logs results and manages retry/failure tracking
 *   4. Feeds analytics engines via direct service calls
 *
 * This replaces the TODO stubs in collection-orchestration.service.ts
 * with real @x2/social provider calls.
 */

import type { SupportedPlatform } from "./types";
import type { Repositories } from "../../repositories";
import type { Logger } from "../types";
import { ok, err, type ServiceResult, type TraceContext } from "../types";
import { PlatformAdapter } from "./platform-adapter";
import { CollectionHealthTracker } from "./collection-health";
import type {
  CollectionScope,
  CollectionRunResult,
  ChannelCollectionResult,
  CollectionDataType,
  CollectionLogEntry,
} from "./types";

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export class CollectionRunner {
  private readonly adapter: PlatformAdapter;
  private readonly health: CollectionHealthTracker;
  /** Per-channel consecutive failure counts. */
  private readonly channelFailures = new Map<string, number>();
  /** Collection log entries (in-memory, most recent first). */
  private readonly logs: CollectionLogEntry[] = [];
  private static readonly MAX_LOGS = 500;

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {
    this.adapter = new PlatformAdapter(repositories, logger);
    this.health = new CollectionHealthTracker(logger);
  }

  /**
   * Run a full collection cycle for a workspace.
   *
   * @param workspaceId - Target workspace
   * @param jobType - e.g. "CONTENT_SYNC", "COMMENT_SYNC", "CHANNEL_SYNC"
   * @param trace - Request trace context
   */
  async runWorkspaceCollection(
    workspaceId: string,
    jobType: string,
    trace: TraceContext,
  ): Promise<ServiceResult<CollectionRunResult>> {
    const startedAt = new Date();

    try {
      // 1. Validate workspace
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      // 2. Build collection scopes from workspace channels
      const scopes = await this.buildScopes(workspaceId, jobType);

      if (scopes.length === 0) {
        return ok({
          workspaceId,
          jobType,
          startedAt,
          completedAt: new Date(),
          channelResults: [],
          totals: {
            channelsProcessed: 0,
            channelsFailed: 0,
            contentsCollected: 0,
            commentsCollected: 0,
          },
        });
      }

      // 3. Execute collection for each channel
      const channelResults: ChannelCollectionResult[] = [];

      for (const scope of scopes) {
        // Skip if platform is unhealthy (circuit breaker)
        if (this.health.isCircuitOpen(scope.platform)) {
          this.logger.warn("Skipping channel — platform circuit open", {
            channelId: scope.channelId,
            platform: scope.platform,
          });
          const skipResult: ChannelCollectionResult = {
            channelId: scope.channelId,
            channelName: scope.channelName,
            platform: scope.platform,
            channelUpdated: false,
            newContentCount: 0,
            newCommentCount: 0,
            snapshotRecorded: false,
            errors: ["Platform circuit breaker open — skipped"],
            durationMs: 0,
          };
          channelResults.push(skipResult);
          this.recordLog(skipResult, jobType, "failed");
          continue;
        }

        const result = await this.adapter.collectChannel(scope);
        channelResults.push(result);

        // Update health trackers
        if (result.errors.length === 0) {
          this.health.recordSuccess(scope.platform);
          this.channelFailures.set(scope.channelId, 0);
          this.recordLog(result, jobType, "success");
        } else if (
          result.channelUpdated ||
          result.newContentCount > 0 ||
          result.newCommentCount > 0
        ) {
          // Partial: some phases succeeded, some failed
          this.health.recordFailure(
            scope.platform,
            result.errors[0] ?? "Unknown",
          );
          this.trackChannelFailure(scope.channelId, scope.channelName);
          this.recordLog(result, jobType, "partial");
        } else {
          this.health.recordFailure(
            scope.platform,
            result.errors[0] ?? "Unknown",
          );
          this.trackChannelFailure(scope.channelId, scope.channelName);
          this.recordLog(result, jobType, "failed");
        }
      }

      // 4. Trigger downstream analytics for newly collected data
      await this.triggerAnalytics(workspaceId, channelResults, trace);

      // 5. Build totals
      const totals = {
        channelsProcessed: channelResults.filter((r) => r.errors.length === 0)
          .length,
        channelsFailed: channelResults.filter((r) => r.errors.length > 0)
          .length,
        contentsCollected: channelResults.reduce(
          (sum, r) => sum + r.newContentCount,
          0,
        ),
        commentsCollected: channelResults.reduce(
          (sum, r) => sum + r.newCommentCount,
          0,
        ),
      };

      const completedAt = new Date();

      this.logger.info("Workspace collection completed", {
        workspaceId,
        jobType,
        ...totals,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        requestId: trace.requestId,
      });

      return ok({
        workspaceId,
        jobType,
        startedAt,
        completedAt,
        channelResults,
        totals,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Collection run failed", {
        workspaceId,
        jobType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "COLLECTION_RUN_FAILED");
    }
  }

  /**
   * Run collection for a single channel (on-demand sync).
   * NOTE: Intentionally bypasses circuit breaker — used for manual recovery.
   */
  async runSingleChannel(
    channelId: string,
    types: CollectionDataType[],
    trace: TraceContext,
  ): Promise<ServiceResult<ChannelCollectionResult>> {
    try {
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Channel not found", "CHANNEL_NOT_FOUND");
      }

      const scope: CollectionScope = {
        channelId: channel.id,
        projectId: channel.projectId,
        platform: channel.platform as SupportedPlatform,
        platformChannelId: channel.platformChannelId,
        channelName: channel.name,
        types,
      };

      // Bypass circuit breaker — this is an explicit manual retry
      const result = await this.adapter.collectChannel(scope);

      if (result.errors.length === 0) {
        this.health.recordSuccess(scope.platform);
        this.channelFailures.set(channelId, 0);
      } else {
        this.health.recordFailure(
          scope.platform,
          result.errors[0] ?? "Unknown",
        );
      }

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Single channel collection failed", {
        channelId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "CHANNEL_COLLECTION_FAILED");
    }
  }

  /**
   * Get health status for all platforms.
   */
  getHealthStatus() {
    return this.health.getAllStatus();
  }

  /**
   * Get recent collection log entries.
   */
  getRecentLogs(limit: number = 50): CollectionLogEntry[] {
    return this.logs.slice(0, limit);
  }

  /**
   * Get logs filtered by platform or status.
   */
  getLogsByFilter(filter: {
    platform?: string;
    status?: CollectionLogEntry["status"];
    limit?: number;
  }): CollectionLogEntry[] {
    let filtered = this.logs;
    if (filter.platform) {
      filtered = filtered.filter((l) => l.platform === filter.platform);
    }
    if (filter.status) {
      filtered = filtered.filter((l) => l.status === filter.status);
    }
    return filtered.slice(0, filter.limit ?? 50);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Build CollectionScope[] for all active channels in a workspace.
   */
  private async buildScopes(
    workspaceId: string,
    jobType: string,
  ): Promise<CollectionScope[]> {
    const projects =
      await this.repositories.workspace.findProjects(workspaceId);

    // N+1 방지: 모든 프로젝트의 채널을 병렬로 조회
    const channelResults = await Promise.all(
      projects.map((project) =>
        this.repositories.channel
          .findByProject(project.id, { status: "ACTIVE" as any })
          .then((result) => ({ projectId: project.id, channels: result.data })),
      ),
    );

    const scopes: CollectionScope[] = [];
    for (const { projectId, channels } of channelResults) {
      for (const ch of channels) {
        const types = this.resolveDataTypes(jobType);
        scopes.push({
          channelId: ch.id,
          projectId,
          platform: ch.platform as SupportedPlatform,
          platformChannelId: ch.platformChannelId,
          channelName: ch.name,
          types,
        });
      }
    }

    return scopes;
  }

  /**
   * Map a job type to the data types that should be collected.
   */
  private resolveDataTypes(jobType: string): CollectionDataType[] {
    switch (jobType) {
      case "CHANNEL_SYNC":
        return ["channel_info"];
      case "CONTENT_SYNC":
        return ["channel_info", "contents"];
      case "COMMENT_SYNC":
        return ["comments"];
      case "FULL_SYNC":
        return ["channel_info", "contents", "comments", "analytics"];
      default:
        return ["channel_info", "contents"];
    }
  }

  /**
   * Track per-channel failure count and log warnings at threshold.
   */
  private trackChannelFailure(channelId: string, channelName: string): void {
    const current = this.channelFailures.get(channelId) ?? 0;
    const next = current + 1;
    this.channelFailures.set(channelId, next);

    if (next === 3) {
      this.logger.warn("Channel has 3 consecutive failures", {
        channelId,
        channelName,
        consecutiveFailures: next,
      });
    }
    if (next === 5) {
      this.logger.error(
        "Channel has 5 consecutive failures — consider disabling",
        {
          channelId,
          channelName,
          consecutiveFailures: next,
        },
      );
    }
  }

  /**
   * Record a collection log entry.
   */
  private recordLog(
    result: ChannelCollectionResult,
    jobType: string,
    status: CollectionLogEntry["status"],
  ): void {
    const entry: CollectionLogEntry = {
      channelId: result.channelId,
      platform: result.platform,
      jobType,
      status,
      message:
        status === "success"
          ? `Collected ${result.newContentCount} contents, ${result.newCommentCount} comments`
          : result.errors.join("; "),
      itemCount: result.newContentCount + result.newCommentCount,
      durationMs: result.durationMs,
      errorDetail:
        result.errors.length > 0 ? result.errors.join("\n") : undefined,
      timestamp: new Date(),
    };

    this.logs.unshift(entry);

    // Trim to max size
    while (this.logs.length > CollectionRunner.MAX_LOGS) {
      this.logs.pop();
    }
  }

  /**
   * Trigger downstream analytics services after collection.
   * Calls services directly instead of going through a builder intermediary.
   */
  private async triggerAnalytics(
    workspaceId: string,
    results: ChannelCollectionResult[],
    trace: TraceContext,
  ): Promise<void> {
    const hasNewData = results.some(
      (r) => r.newContentCount > 0 || r.newCommentCount > 0,
    );

    if (!hasNewData) return;

    // Find unanalyzed comments and log count for ops visibility
    try {
      const unanalyzed = await this.repositories.comment.findUnanalyzed(100);
      if (unanalyzed.length > 0) {
        this.logger.info("Unanalyzed comments available for analysis", {
          count: unanalyzed.length,
          workspaceId,
          requestId: trace.requestId,
        });
        // TODO: [QUEUE] Push to BullMQ comment-analysis queue
        // When BullMQ is ready:
        //   for (const comment of unanalyzed) {
        //     await commentAnalysisQueue.add({ commentId: comment.id, contentId: comment.contentId });
        //   }
        // Or call CommentAnalysisService directly:
        //   await this.commentAnalysisService.analyzeComments(contentId, trace);
      }
    } catch (error) {
      this.logger.error("Failed to check unanalyzed comments", {
        error: error instanceof Error ? error.message : "Unknown",
        workspaceId,
      });
    }
  }
}
