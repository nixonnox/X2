import type {
  PrismaClient,
  RiskSignal,
  RiskSignalStatus,
  RiskLevel,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

export type RiskStatusCount = {
  status: RiskSignalStatus;
  count: number;
};

/**
 * Repository for RiskSignal model.
 * Manages risk events detected from negative sentiment spikes and dangerous comments.
 */
export class RiskSignalRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List risk signals for a project with optional status and severity filters.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    status?: RiskSignalStatus,
    severity?: RiskLevel,
  ): Promise<PaginatedResult<RiskSignal>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.RiskSignalWhereInput = {
      projectId,
      ...(status && { status }),
      ...(severity && { severity }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.riskSignal.findMany({
        where,
        skip,
        take,
        orderBy: { detectedAt: "desc" },
      }),
      this.prisma.riskSignal.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single risk signal by ID.
   */
  async findById(id: string): Promise<RiskSignal | null> {
    return this.prisma.riskSignal.findUnique({ where: { id } });
  }

  /**
   * Create a new risk signal.
   */
  async create(data: Prisma.RiskSignalCreateInput) {
    return this.prisma.riskSignal.create({ data });
  }

  /**
   * Update a risk signal's status with optional response note and resolution timestamp.
   */
  async updateStatus(
    id: string,
    status: RiskSignalStatus,
    responseNote?: string,
    resolvedAt?: Date,
  ) {
    return this.prisma.riskSignal.update({
      where: { id },
      data: {
        status,
        ...(responseNote && { responseNote }),
        ...(resolvedAt && { resolvedAt }),
        ...(status === "RESOLVED" && !resolvedAt && { resolvedAt: new Date() }),
      },
    });
  }

  /**
   * Assign a risk signal to a team member for investigation.
   */
  async assignTo(id: string, assigneeId: string) {
    return this.prisma.riskSignal.update({
      where: { id },
      data: { assigneeId, status: "INVESTIGATING" },
    });
  }

  /**
   * Find all active risk signals (not yet resolved or dismissed).
   */
  async findActive(projectId: string): Promise<RiskSignal[]> {
    return this.prisma.riskSignal.findMany({
      where: {
        projectId,
        status: { in: ["ACTIVE", "INVESTIGATING", "RESPONDING"] },
      },
      orderBy: [{ severity: "desc" }, { detectedAt: "desc" }],
    });
  }

  /**
   * Find risk signals filtered by severity level.
   */
  async findBySeverity(
    projectId: string,
    severity: RiskLevel,
  ): Promise<RiskSignal[]> {
    return this.prisma.riskSignal.findMany({
      where: { projectId, severity },
      orderBy: { detectedAt: "desc" },
    });
  }

  /**
   * Get risk signal counts grouped by status for a project.
   */
  async countByStatus(projectId: string): Promise<RiskStatusCount[]> {
    const result = await this.prisma.riskSignal.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { status: true },
    });

    return result.map(
      (r: { status: RiskSignalStatus; _count: { status: number } }) => ({
        status: r.status,
        count: r._count.status,
      }),
    );
  }
}
