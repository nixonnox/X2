import type {
  PrismaClient,
  ScheduledJob,
  JobStatus,
  Prisma,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

/**
 * Repository for ScheduledJob model.
 * Manages recurring data pipeline jobs: scheduling, execution tracking, and error handling.
 */
export class ScheduledJobRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List scheduled jobs for a workspace, optionally filtered by status.
   */
  async findByWorkspace(
    workspaceId: string,
    status?: JobStatus,
  ): Promise<ScheduledJob[]> {
    return this.prisma.scheduledJob.findMany({
      where: {
        workspaceId,
        ...(status && { status }),
      },
      orderBy: { nextRunAt: "asc" },
    });
  }

  /**
   * Find a single scheduled job by ID.
   */
  async findById(id: string): Promise<ScheduledJob | null> {
    return this.prisma.scheduledJob.findUnique({ where: { id } });
  }

  /**
   * Create a new scheduled job.
   */
  async create(data: Prisma.ScheduledJobCreateInput) {
    return this.prisma.scheduledJob.create({ data });
  }

  /**
   * Update a job's status and optional error message.
   */
  async updateStatus(id: string, status: JobStatus, error?: string) {
    return this.prisma.scheduledJob.update({
      where: { id },
      data: {
        status,
        ...(error !== undefined && { lastError: error }),
        ...(status === "FAILED" && { retryCount: { increment: 1 } }),
      },
    });
  }

  /**
   * Record a job execution with duration and optional error.
   */
  async recordExecution(id: string, durationMs: number, error?: string) {
    return this.prisma.scheduledJob.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        durationMs,
        ...(error
          ? { lastError: error, status: "FAILED", retryCount: { increment: 1 } }
          : { lastError: null }),
      },
    });
  }

  /**
   * Find jobs that are due for execution (status=ACTIVE, nextRunAt <= cutoff).
   */
  async findDueJobs(before?: Date): Promise<ScheduledJob[]> {
    const cutoff = before ?? new Date();
    return this.prisma.scheduledJob.findMany({
      where: {
        status: "ACTIVE",
        nextRunAt: { lte: cutoff },
      },
      orderBy: { nextRunAt: "asc" },
    });
  }

  /**
   * Find all jobs belonging to a logical job group.
   */
  async findByJobGroup(jobGroup: string): Promise<ScheduledJob[]> {
    return this.prisma.scheduledJob.findMany({
      where: { jobGroup },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find recently failed jobs for a workspace for debugging/alerting.
   */
  async findFailedJobs(
    workspaceId: string,
    limit: number = 10,
  ): Promise<ScheduledJob[]> {
    return this.prisma.scheduledJob.findMany({
      where: { workspaceId, status: "FAILED" },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }
}
