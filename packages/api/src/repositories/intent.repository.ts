import type {
  PrismaClient,
  IntentQuery,
  IntentKeywordResult,
  AnalysisJobStatus,
  IntentCategory,
  GapType,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

export type IntentKeywordFilters = {
  category?: IntentCategory;
  gapType?: GapType;
};

/**
 * Repository for IntentQuery and IntentKeywordResult models.
 * Manages search intent analysis jobs and their keyword-level results.
 */
export class IntentRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List intent queries for a project with pagination.
   */
  async findQueriesByProject(
    projectId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<IntentQuery>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.IntentQueryWhereInput = { projectId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.intentQuery.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.intentQuery.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single intent query by ID with its keyword results.
   */
  async findQueryById(id: string) {
    return this.prisma.intentQuery.findUnique({
      where: { id },
      include: {
        keywords: { orderBy: { gapScore: "desc" } },
      },
    });
  }

  /**
   * Create an intent query with nested keyword results.
   */
  async createQuery(data: Prisma.IntentQueryCreateInput) {
    return this.prisma.intentQuery.create({
      data,
      include: { keywords: true },
    });
  }

  /**
   * Update an intent query's status and optional result data.
   */
  async updateQueryStatus(
    id: string,
    status: AnalysisJobStatus,
    resultGraph?: Prisma.InputJsonValue,
    resultSummary?: Prisma.InputJsonValue,
  ) {
    return this.prisma.intentQuery.update({
      where: { id },
      data: {
        status,
        ...(resultGraph !== undefined && { resultGraph }),
        ...(resultSummary !== undefined && { resultSummary }),
        ...(status === "COMPLETED" && { completedAt: new Date() }),
      },
    });
  }

  /**
   * Create a single keyword result for an intent query.
   */
  async createKeywordResult(data: Prisma.IntentKeywordResultCreateInput) {
    return this.prisma.intentKeywordResult.create({ data });
  }

  /**
   * Find keyword results for a query with optional category and gap type filters.
   */
  async findKeywordResults(
    queryId: string,
    filters?: IntentKeywordFilters,
  ): Promise<IntentKeywordResult[]> {
    return this.prisma.intentKeywordResult.findMany({
      where: {
        queryId,
        ...(filters?.category && { intentCategory: filters.category }),
        ...(filters?.gapType && { gapType: filters.gapType }),
      },
      orderBy: { gapScore: "desc" },
    });
  }

  /**
   * Find gap opportunities (BLUE_OCEAN or OPPORTUNITY) across a project's intent queries.
   */
  async findGapOpportunities(
    projectId: string,
  ): Promise<IntentKeywordResult[]> {
    return this.prisma.intentKeywordResult.findMany({
      where: {
        query: { projectId },
        gapType: { in: ["BLUE_OCEAN", "OPPORTUNITY"] },
      },
      orderBy: { gapScore: "desc" },
    });
  }
}
