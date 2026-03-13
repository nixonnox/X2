import type {
  PrismaClient,
  Content,
  ContentMetricDaily,
  SocialPlatform,
  ContentType,
  ContentStatus,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
  type DateRange,
} from "./base.repository";

export type ContentFilters = {
  platform?: SocialPlatform;
  type?: ContentType;
  status?: ContentStatus;
  search?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
};

export type ContentSortField =
  | "publishedAt"
  | "viewCount"
  | "engagementRate"
  | "commentCount";

/**
 * Repository for Content and ContentMetricDaily models.
 * Handles content CRUD, metric time-series, and performance ranking queries.
 */
export class ContentRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List contents for a channel with pagination, filters, and sorting.
   */
  async findByChannel(
    channelId: string,
    pagination?: PaginationParams,
    filters?: ContentFilters,
    sortBy: ContentSortField = "publishedAt",
  ): Promise<PaginatedResult<Content>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.ContentWhereInput = {
      channelId,
      ...(filters?.platform && { platform: filters.platform }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.search && {
        title: { contains: filters.search, mode: "insensitive" as const },
      }),
      ...(filters?.publishedAfter || filters?.publishedBefore
        ? {
            publishedAt: {
              ...(filters.publishedAfter && { gte: filters.publishedAfter }),
              ...(filters.publishedBefore && { lte: filters.publishedBefore }),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: "desc" },
      }),
      this.prisma.content.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single content by ID with its daily metrics.
   */
  async findById(id: string) {
    return this.prisma.content.findUnique({
      where: { id },
      include: {
        metrics: { orderBy: { date: "desc" }, take: 30 },
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Upsert content by unique key (channelId, platformContentId).
   */
  async upsert(
    channelId: string,
    platformContentId: string,
    data: Omit<Prisma.ContentCreateInput, "channel" | "platformContentId">,
  ) {
    return this.prisma.content.upsert({
      where: { channelId_platformContentId: { channelId, platformContentId } },
      create: {
        ...data,
        platformContentId,
        channel: { connect: { id: channelId } },
      },
      update: data,
    });
  }

  /**
   * Retrieve daily metrics for a content item within a date range.
   */
  async findMetrics(
    contentId: string,
    dateRange?: DateRange,
  ): Promise<ContentMetricDaily[]> {
    return this.prisma.contentMetricDaily.findMany({
      where: {
        contentId,
        ...(dateRange && {
          date: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Upsert a daily metric snapshot for a content item.
   */
  async upsertDailyMetric(
    contentId: string,
    date: Date,
    data: Omit<Prisma.ContentMetricDailyCreateInput, "content" | "date">,
  ) {
    return this.prisma.contentMetricDaily.upsert({
      where: { contentId_date: { contentId, date } },
      create: { ...data, date, content: { connect: { id: contentId } } },
      update: data,
    });
  }

  /**
   * Find top-performing content for a channel ranked by a specific metric.
   */
  async findTopPerforming(
    channelId: string,
    limit: number = 10,
    metric: "viewCount" | "engagementRate" | "commentCount" = "viewCount",
  ): Promise<Content[]> {
    return this.prisma.content.findMany({
      where: { channelId, status: "ACTIVE" },
      orderBy: { [metric]: "desc" },
      take: limit,
    });
  }
}
