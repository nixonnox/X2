import type {
  PrismaClient,
  Keyword,
  KeywordMetricDaily,
  KeywordStatus,
  Prisma,
} from "@prisma/client";
import { BaseRepository, type DateRange } from "./base.repository";

/**
 * Repository for Keyword and KeywordMetricDaily models.
 * Manages tracked keywords and their daily search volume metrics.
 */
export class KeywordRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List all keywords for a project, optionally filtered by status.
   */
  async findByProject(
    projectId: string,
    status?: KeywordStatus,
  ): Promise<Keyword[]> {
    return this.prisma.keyword.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find a single keyword by ID with its recent metrics.
   */
  async findById(id: string) {
    return this.prisma.keyword.findUnique({
      where: { id },
      include: {
        metrics: { orderBy: { date: "desc" }, take: 30 },
      },
    });
  }

  /**
   * Create a new tracked keyword for a project.
   */
  async create(projectId: string, keyword: string, category?: string) {
    return this.prisma.keyword.create({
      data: {
        keyword,
        category,
        project: { connect: { id: projectId } },
      },
    });
  }

  /**
   * Update a keyword's tracking status.
   */
  async updateStatus(id: string, status: KeywordStatus) {
    return this.prisma.keyword.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Retrieve daily metrics for a keyword within a date range.
   */
  async findMetrics(
    keywordId: string,
    dateRange?: DateRange,
  ): Promise<KeywordMetricDaily[]> {
    return this.prisma.keywordMetricDaily.findMany({
      where: {
        keywordId,
        ...(dateRange && {
          date: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Upsert a daily keyword metric snapshot.
   */
  async upsertDailyMetric(
    keywordId: string,
    date: Date,
    data: Omit<Prisma.KeywordMetricDailyCreateInput, "keyword" | "date">,
  ) {
    return this.prisma.keywordMetricDaily.upsert({
      where: { keywordId_date: { keywordId, date } },
      create: { ...data, date, keyword: { connect: { id: keywordId } } },
      update: data,
    });
  }
}
