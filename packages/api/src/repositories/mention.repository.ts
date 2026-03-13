import type {
  PrismaClient,
  RawSocialMention,
  SocialPlatform,
  SentimentType,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
  type DateRange,
} from "./base.repository";

export type MentionFilters = {
  platform?: SocialPlatform;
  sentiment?: SentimentType;
  dateRange?: DateRange;
  keyword?: string;
  isSpam?: boolean;
};

export type PlatformCount = {
  platform: SocialPlatform;
  count: number;
};

export type SentimentCount = {
  sentiment: SentimentType;
  count: number;
};

/**
 * Repository for RawSocialMention model.
 * Handles brand/keyword mention data from social platforms.
 */
export class MentionRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List mentions for a project with platform, sentiment, date, and keyword filters.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    filters?: MentionFilters,
  ): Promise<PaginatedResult<RawSocialMention>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.RawSocialMentionWhereInput = {
      projectId,
      ...(filters?.platform && { platform: filters.platform }),
      ...(filters?.sentiment && { sentiment: filters.sentiment }),
      ...(filters?.keyword && { matchedKeyword: filters.keyword }),
      ...(filters?.isSpam !== undefined && { isSpam: filters.isSpam }),
      ...(filters?.dateRange && {
        publishedAt: { gte: filters.dateRange.from, lte: filters.dateRange.to },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.rawSocialMention.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: "desc" },
      }),
      this.prisma.rawSocialMention.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single mention by ID.
   */
  async findById(id: string): Promise<RawSocialMention | null> {
    return this.prisma.rawSocialMention.findUnique({ where: { id } });
  }

  /**
   * Create a single mention record.
   */
  async create(data: Prisma.RawSocialMentionCreateInput) {
    return this.prisma.rawSocialMention.create({ data });
  }

  /**
   * Batch-insert mentions, skipping duplicates on (projectId, platform, platformPostId).
   */
  async bulkCreate(mentions: Prisma.RawSocialMentionCreateManyInput[]) {
    return this.prisma.rawSocialMention.createMany({
      data: mentions,
      skipDuplicates: true,
    });
  }

  /**
   * Count mentions grouped by platform within a date range.
   */
  async countByPlatform(
    projectId: string,
    dateRange?: DateRange,
  ): Promise<PlatformCount[]> {
    const result = await this.prisma.rawSocialMention.groupBy({
      by: ["platform"],
      where: {
        projectId,
        ...(dateRange && {
          publishedAt: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      _count: { platform: true },
    });

    return result.map(
      (r: { platform: SocialPlatform; _count: { platform: number } }) => ({
        platform: r.platform,
        count: r._count.platform,
      }),
    );
  }

  /**
   * Count mentions grouped by sentiment within a date range.
   */
  async countBySentiment(
    projectId: string,
    dateRange?: DateRange,
  ): Promise<SentimentCount[]> {
    const result = await this.prisma.rawSocialMention.groupBy({
      by: ["sentiment"],
      where: {
        projectId,
        sentiment: { not: null },
        ...(dateRange && {
          publishedAt: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      _count: { sentiment: true },
    });

    return result.map(
      (r: {
        sentiment: SentimentType | null;
        _count: { sentiment: number };
      }) => ({
        sentiment: r.sentiment!,
        count: r._count.sentiment,
      }),
    );
  }
}
