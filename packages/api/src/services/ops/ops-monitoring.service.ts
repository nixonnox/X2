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

export type PipelineHealth = {
  workspaceId: string;
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  successRate: number;
  overdueJobs: OverdueJob[];
  recentFailures: FailedJob[];
  summary: {
    healthy: boolean;
    issues: string[];
  };
};

export type OverdueJob = {
  id: string;
  type: string;
  nextRunAt: Date;
  overdueBy: number; // minutes
};

export type FailedJob = {
  id: string;
  type: string;
  lastError: string;
  retryCount: number;
  lastRunAt: Date | null;
};

export type JobExecutionResult = {
  success: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type ScheduledJob = {
  id: string;
  workspaceId: string;
  type: string;
  cronExpression: string;
  status: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  lastError: string | null;
  retryCount: number;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class OpsMonitoringService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Get pipeline health overview.
   */
  async getPipelineHealth(
    workspaceId: string,
  ): Promise<ServiceResult<PipelineHealth>> {
    try {
      // 1. Get all scheduled jobs for workspace
      const allJobs =
        await this.repositories.scheduledJob.findByWorkspace(workspaceId);

      if (allJobs.length === 0) {
        return ok({
          workspaceId,
          totalJobs: 0,
          activeJobs: 0,
          pausedJobs: 0,
          successRate: 100,
          overdueJobs: [],
          recentFailures: [],
          summary: { healthy: true, issues: [] },
        });
      }

      // 2. Calculate success rate (jobs with lastError = null / total that have run)
      const jobsWithRuns = allJobs.filter((j) => j.lastRunAt !== null);
      const successfulJobs = jobsWithRuns.filter((j) => j.lastError === null);
      const successRate =
        jobsWithRuns.length > 0
          ? (successfulJobs.length / jobsWithRuns.length) * 100
          : 100;

      const activeJobs = allJobs.filter((j) => j.status === "ACTIVE");
      const pausedJobs = allJobs.filter((j) => j.status === "PAUSED");

      // 3. Find overdue jobs (nextRunAt < now, status=ACTIVE)
      const now = new Date();
      const overdueJobs: OverdueJob[] = activeJobs
        .filter((j) => j.nextRunAt && new Date(j.nextRunAt) < now)
        .map((j) => ({
          id: j.id,
          type: j.type,
          nextRunAt: j.nextRunAt!,
          overdueBy: Math.round(
            (now.getTime() - new Date(j.nextRunAt!).getTime()) / 60000,
          ),
        }))
        .sort((a, b) => b.overdueBy - a.overdueBy);

      // 4. Find recently failed jobs
      const recentFailures: FailedJob[] = allJobs
        .filter((j) => j.lastError !== null)
        .map((j) => ({
          id: j.id,
          type: j.type,
          lastError: j.lastError!,
          retryCount: j.retryCount,
          lastRunAt: j.lastRunAt,
        }))
        .sort((a, b) => {
          const aTime = a.lastRunAt?.getTime() ?? 0;
          const bTime = b.lastRunAt?.getTime() ?? 0;
          return bTime - aTime;
        })
        .slice(0, 10);

      // 5. Build summary
      const issues: string[] = [];
      if (overdueJobs.length > 0) {
        issues.push(`${overdueJobs.length} job(s) are overdue`);
      }
      if (recentFailures.length > 0) {
        issues.push(`${recentFailures.length} job(s) have recent failures`);
      }
      if (pausedJobs.length > 0) {
        issues.push(`${pausedJobs.length} job(s) are paused`);
      }
      if (successRate < 90) {
        issues.push(`Success rate is ${Math.round(successRate)}% (below 90%)`);
      }

      return ok({
        workspaceId,
        totalJobs: allJobs.length,
        activeJobs: activeJobs.length,
        pausedJobs: pausedJobs.length,
        successRate: Math.round(successRate * 100) / 100,
        overdueJobs,
        recentFailures,
        summary: {
          healthy: issues.length === 0,
          issues,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get pipeline health", {
        workspaceId,
        error: message,
      });
      return err(message, "PIPELINE_HEALTH_FAILED");
    }
  }

  /**
   * Record job execution result.
   */
  async recordJobExecution(
    jobId: string,
    result: JobExecutionResult,
  ): Promise<ServiceResult<void>> {
    try {
      // 1. Fetch current job
      const job = await this.repositories.scheduledJob.findById(jobId);
      if (!job) {
        return err("Scheduled job not found", "JOB_NOT_FOUND");
      }

      const now = new Date();

      if (result.success) {
        // 2a. Success: update lastRunAt, durationMs, nextRunAt, clear lastError
        await this.repositories.scheduledJob.recordExecution(
          jobId,
          result.durationMs,
        );
      } else {
        // 2b. Failure: increment retryCount
        const newRetryCount = job.retryCount + 1;

        const updateData: Record<string, unknown> = {
          lastRunAt: now,
          durationMs: result.durationMs,
          lastError: result.error ?? "Unknown error",
          retryCount: newRetryCount,
        };

        // 3. If retryCount >= 3: set status=PAUSED, create Notification
        if (newRetryCount >= 3) {
          updateData.status = "PAUSED";

          // Create notification for workspace admins
          // TODO: [CROSS-SERVICE] NotificationService.createSystemAlert
          await this.repositories.notification.create({
            type: "SYSTEM_ALERT",
            title: `Job paused after ${newRetryCount} failures: ${job.type}`,
            message: `Scheduled job "${job.type}" has been paused after ${newRetryCount} consecutive failures. Last error: ${result.error ?? "Unknown"}`,
            channel: "IN_APP",
            sourceType: "SCHEDULED_JOB",
            sourceId: jobId,
            workspace: { connect: { id: job.workspaceId } },
          });
        }

        await this.repositories.scheduledJob.recordExecution(
          jobId,
          result.durationMs,
          result.error ?? "Unknown error",
        );
      }

      // 4. Log
      this.logger.info("Job executed", {
        jobId,
        type: job.type,
        status: result.success ? "SUCCESS" : "FAILURE",
        durationMs: result.durationMs,
        error: result.error,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to record job execution", {
        jobId,
        error: message,
      });
      return err(message, "JOB_EXECUTION_RECORD_FAILED");
    }
  }

  /**
   * Get failed jobs that need attention.
   */
  async getFailedJobs(
    workspaceId: string,
  ): Promise<ServiceResult<ScheduledJob[]>> {
    try {
      const allJobs =
        await this.repositories.scheduledJob.findByWorkspace(workspaceId);

      const failedJobs = allJobs.filter(
        (j) => j.lastError !== null || j.status === "PAUSED",
      );

      return ok(failedJobs as unknown as ScheduledJob[]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get failed jobs", {
        workspaceId,
        error: message,
      });
      return err(message, "FAILED_JOBS_FETCH_FAILED");
    }
  }

  /**
   * Retry a failed job.
   */
  async retryJob(
    jobId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<void>> {
    try {
      const job = await this.repositories.scheduledJob.findById(jobId);
      if (!job) {
        return err("Scheduled job not found", "JOB_NOT_FOUND");
      }

      if (job.status !== "PAUSED" && job.lastError === null) {
        return err("Job is not in a failed state", "JOB_NOT_FAILED");
      }

      // Reset retryCount, set status=ACTIVE
      await this.repositories.scheduledJob.updateStatus(jobId, "ACTIVE" as any);

      // TODO: [INTEGRATION] @x2/queue — Re-enqueue job
      // Expected: queueService.enqueue(job.type, { jobId, workspaceId: job.workspaceId })

      this.logger.info("Job retry initiated", {
        jobId,
        type: job.type,
        requestId: trace.requestId,
      });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to retry job", {
        jobId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "JOB_RETRY_FAILED");
    }
  }
}
