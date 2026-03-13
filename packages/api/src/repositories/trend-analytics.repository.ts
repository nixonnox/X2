import type {
  PrismaClient,
  TrendKeywordAnalytics,
  Prisma,
} from "@prisma/client";
import { BaseRepository, type DateRange } from "./base.repository";

/**
 * Repository for TrendKeywordAnalytics model.
 * Manages aggregated keyword trend data combining search and social signals.
 */
export class TrendAnalyticsRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find trend analytics for a project, optionally filtered by date range (period string comparison).
   */
  async findByProject(
    projectId: string,
    dateRange?: DateRange,
  ): Promise<TrendKeywordAnalytics[]> {
    return this.prisma.trendKeywordAnalytics.findMany({
      where: {
        projectId,
        ...(dateRange && {
          createdAt: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Upsert a trend analytics record keyed by (projectId, keyword, locale, period).
   */
  async upsert(
    projectId: string,
    keyword: string,
    locale: string,
    period: string,
    data: Omit<
      Prisma.TrendKeywordAnalyticsCreateInput,
      "project" | "keyword" | "locale" | "period"
    >,
  ) {
    return this.prisma.trendKeywordAnalytics.upsert({
      where: {
        projectId_keyword_locale_period: { projectId, keyword, locale, period },
      },
      create: {
        ...data,
        keyword,
        locale,
        period,
        project: { connect: { id: projectId } },
      },
      update: data,
    });
  }

  /**
   * Find the most recent trend analytics entries for a project.
   */
  async findLatest(
    projectId: string,
    limit: number = 20,
  ): Promise<TrendKeywordAnalytics[]> {
    return this.prisma.trendKeywordAnalytics.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
