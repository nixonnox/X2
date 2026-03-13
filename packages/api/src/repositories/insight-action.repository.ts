import type {
  PrismaClient,
  InsightAction,
  ActionStatus,
  ActionPriority,
  SourceModule,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

export type ActionStatusCount = {
  status: ActionStatus;
  count: number;
};

/**
 * Repository for InsightAction model.
 * Manages actionable insights derived from reports and analysis modules.
 */
export class InsightActionRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find actions linked to a specific report, optionally filtered by status.
   */
  async findByReport(
    reportId: string,
    status?: ActionStatus,
  ): Promise<InsightAction[]> {
    return this.prisma.insightAction.findMany({
      where: {
        reportId,
        ...(status && { status }),
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * List all actions across a project (through reports) with filters.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    status?: ActionStatus,
    priority?: ActionPriority,
  ): Promise<PaginatedResult<InsightAction>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.InsightActionWhereInput = {
      report: { projectId },
      ...(status && { status }),
      ...(priority && { priority }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.insightAction.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.insightAction.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single action by ID.
   */
  async findById(id: string): Promise<InsightAction | null> {
    return this.prisma.insightAction.findUnique({
      where: { id },
      include: { report: { select: { id: true, title: true } } },
    });
  }

  /**
   * Create a new insight action.
   */
  async create(data: Prisma.InsightActionCreateInput) {
    return this.prisma.insightAction.create({ data });
  }

  /**
   * Update an action's status and optional outcome text.
   */
  async updateStatus(id: string, status: ActionStatus, outcome?: string) {
    return this.prisma.insightAction.update({
      where: { id },
      data: {
        status,
        ...(outcome && { outcome }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });
  }

  /**
   * Find actions originating from a specific analysis module.
   */
  async findBySourceModule(
    sourceModule: SourceModule,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<InsightAction>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.InsightActionWhereInput = { sourceModule };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.insightAction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.insightAction.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Get action counts grouped by status for a project.
   */
  async countByStatus(projectId: string): Promise<ActionStatusCount[]> {
    const result = await this.prisma.insightAction.groupBy({
      by: ["status"],
      where: { report: { projectId } },
      _count: { status: true },
    });

    return result.map(
      (r: { status: ActionStatus; _count: { status: number } }) => ({
        status: r.status,
        count: r._count.status,
      }),
    );
  }
}
