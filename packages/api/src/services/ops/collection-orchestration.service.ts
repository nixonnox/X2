import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CollectionResult = {
  workspaceId: string;
  jobType: string;
  channelsProcessed: number;
  contentCollected: number;
  commentsCollected: number;
  errors: CollectionError[];
  durationMs: number;
};

export type CollectionError = {
  channelId: string;
  channelName: string;
  error: string;
};

export type ChannelSyncResult = {
  channelId: string;
  channelName: string;
  platform: string;
  newContentCount: number;
  newCommentCount: number;
  snapshotRecorded: boolean;
};

export type ScheduledJob = {
  id: string;
  workspaceId: string;
  type: string;
  cronExpression: string;
  status: string;
};

// Default job definitions
const DEFAULT_JOBS = [
  {
    type: "CHANNEL_SYNC",
    cronExpression: "0 */6 * * *", // Every 6 hours
    description: "Sync channel metadata and snapshots",
  },
  {
    type: "CONTENT_SYNC",
    cronExpression: "0 */4 * * *", // Every 4 hours
    description: "Fetch new content from connected channels",
  },
  {
    type: "COMMENT_SYNC",
    cronExpression: "0 */2 * * *", // Every 2 hours
    description: "Fetch new comments from content items",
  },
  {
    type: "USAGE_AGGREGATE",
    cronExpression: "0 0 * * *", // Daily at midnight
    description: "Aggregate daily usage metrics",
  },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CollectionOrchestrationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Trigger full collection cycle for workspace.
   */
  async triggerCollection(
    workspaceId: string,
    jobType: string,
    trace: TraceContext,
  ): Promise<ServiceResult<CollectionResult>> {
    try {
      const startTime = Date.now();

      // 1. Check workspace capabilities
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      // 2. Get active channels for workspace (through projects)
      const projects =
        await this.repositories.workspace.findProjects(workspaceId);

      const allChannels: Array<{
        id: string;
        name: string;
        platform: string;
        projectId: string;
      }> = [];

      for (const project of projects) {
        const channelResult = await this.repositories.channel.findByProject(
          project.id,
          { status: "ACTIVE" as any },
        );
        for (const ch of channelResult.data) {
          allChannels.push({
            id: ch.id,
            name: ch.name,
            platform: ch.platform,
            projectId: project.id,
          });
        }
      }

      if (allChannels.length === 0) {
        return ok({
          workspaceId,
          jobType,
          channelsProcessed: 0,
          contentCollected: 0,
          commentsCollected: 0,
          errors: [],
          durationMs: Date.now() - startTime,
        });
      }

      const totalContent = 0;
      const totalComments = 0;
      const errors: CollectionError[] = [];

      // 3. For each channel
      for (const ch of allChannels) {
        try {
          // TODO: [INTEGRATION] @x2/social — Call platform provider
          // Expected: socialProvider.getChannelData(ch.platform, channelConnection)
          // For now, log and skip actual data fetching

          // Normalize data and save to DB via repositories
          // This would involve:
          // - provider.getChannelInfo() -> upsert channel metadata
          // - provider.getContents() -> upsert content records
          // - provider.getComments() -> bulk create comments

          this.logger.info("Channel collection skipped (no provider)", {
            channelId: ch.id,
            platform: ch.platform,
          });
        } catch (channelError) {
          const errorMessage =
            channelError instanceof Error
              ? channelError.message
              : "Unknown error";
          errors.push({
            channelId: ch.id,
            channelName: ch.name,
            error: errorMessage,
          });
        }
      }

      const durationMs = Date.now() - startTime;

      // 4. Log
      this.logger.info("Collection completed", {
        workspaceId,
        jobType,
        channelCount: allChannels.length,
        contentCount: totalContent,
        commentCount: totalComments,
        errorCount: errors.length,
        durationMs,
        requestId: trace.requestId,
      });

      return ok({
        workspaceId,
        jobType,
        channelsProcessed: allChannels.length - errors.length,
        contentCollected: totalContent,
        commentsCollected: totalComments,
        errors,
        durationMs,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to trigger collection", {
        workspaceId,
        jobType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "COLLECTION_FAILED");
    }
  }

  /**
   * Sync a single channel.
   */
  async syncChannel(
    channelId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<ChannelSyncResult>> {
    try {
      // 1. Fetch channel with connection
      const channel = await this.repositories.channel.findById(channelId);
      if (!channel) {
        return err("Channel not found", "CHANNEL_NOT_FOUND");
      }

      const connection =
        await this.repositories.channel.findConnection(channelId);
      if (!connection) {
        return err("No active connection for channel", "CHANNEL_NOT_CONNECTED");
      }

      // 2. Call @x2/social provider.getChannelInfo()
      // TODO: [INTEGRATION] @x2/social — provider.getChannelInfo(channel.platform, connection)
      // Expected: { subscriberCount, contentCount, ... }

      // 3. Call @x2/social provider.getContents()
      // TODO: [INTEGRATION] @x2/social — provider.getContents(channel.platform, connection)
      // Expected: Content[]
      const newContentCount = 0;

      // 4. Upsert content records
      // For each content from provider, call:
      // await this.repositories.content.upsert(channelId, platformContentId, contentData)

      // 5. Fetch comments for each new content
      // TODO: [INTEGRATION] @x2/social — provider.getComments(channel.platform, connection, contentId)
      const newCommentCount = 0;

      // 6. Bulk create comments
      // await this.repositories.comment.bulkCreate(commentRecords)

      // 7. Record daily snapshot
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.repositories.channel.upsertSnapshot(channelId, today, {
        subscriberCount: channel.subscriberCount,
        contentCount: channel.contentCount,
        totalViews: BigInt(0), // Would come from provider
        avgEngagement: 0, // Would be calculated from provider data
      });
      const snapshotRecorded = true;

      // 8. Update channel lastSyncedAt
      await this.repositories.channel.update(channelId, {
        lastSyncedAt: new Date(),
      });

      // 9. Log
      this.logger.info("Channel synced", {
        channelId,
        channelName: channel.name,
        platform: channel.platform,
        newContentCount,
        newCommentCount,
        requestId: trace.requestId,
      });

      return ok({
        channelId,
        channelName: channel.name,
        platform: channel.platform,
        newContentCount,
        newCommentCount,
        snapshotRecorded,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to sync channel", {
        channelId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "CHANNEL_SYNC_FAILED");
    }
  }

  /**
   * Create default scheduled jobs for a workspace.
   */
  async setupDefaultJobs(
    workspaceId: string,
  ): Promise<ServiceResult<ScheduledJob[]>> {
    try {
      // Validate workspace exists
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) {
        return err("Workspace not found", "WORKSPACE_NOT_FOUND");
      }

      // Check for existing jobs to avoid duplicates
      const existingJobs =
        await this.repositories.scheduledJob.findByWorkspace(workspaceId);
      const existingTypes = new Set(existingJobs.map((j) => j.type));

      const createdJobs: ScheduledJob[] = [];

      for (const jobDef of DEFAULT_JOBS) {
        if (existingTypes.has(jobDef.type as any)) {
          this.logger.info("Default job already exists, skipping", {
            workspaceId,
            type: jobDef.type,
          });
          continue;
        }

        const job = await this.repositories.scheduledJob.create({
          type: jobDef.type as any,
          cronExpr: jobDef.cronExpression,
          status: "ACTIVE",
          retryCount: 0,
          workspace: { connect: { id: workspaceId } },
        });

        createdJobs.push(job as unknown as ScheduledJob);
      }

      this.logger.info("Default scheduled jobs created", {
        workspaceId,
        jobCount: createdJobs.length,
        types: createdJobs.map((j) => j.type),
      });

      return ok(createdJobs);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to setup default jobs", {
        workspaceId,
        error: message,
      });
      return err(message, "DEFAULT_JOBS_FAILED");
    }
  }
}
