import type {
  PrismaClient,
  Comment,
  CommentAnalysis,
  SentimentType,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
  type DateRange,
} from "./base.repository";

export type CommentFilters = {
  sentiment?: SentimentType;
  isQuestion?: boolean;
  isRisk?: boolean;
  isSpam?: boolean;
  publishedAfter?: Date;
  publishedBefore?: Date;
};

export type SentimentDistribution = {
  sentiment: SentimentType;
  count: number;
};

/**
 * Repository for Comment and CommentAnalysis models.
 * Handles comment CRUD, batch inserts, and cross-content analysis queries.
 */
export class CommentRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List comments for a content item with optional sentiment/analysis filters.
   */
  async findByContent(
    contentId: string,
    pagination?: PaginationParams,
    filters?: CommentFilters,
  ): Promise<PaginatedResult<Comment & { analysis: CommentAnalysis | null }>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.CommentWhereInput = {
      contentId,
      ...(filters?.publishedAfter || filters?.publishedBefore
        ? {
            publishedAt: {
              ...(filters.publishedAfter && { gte: filters.publishedAfter }),
              ...(filters.publishedBefore && { lte: filters.publishedBefore }),
            },
          }
        : {}),
      ...((filters?.sentiment ||
        filters?.isQuestion !== undefined ||
        filters?.isRisk !== undefined ||
        filters?.isSpam !== undefined) && {
        analysis: {
          ...(filters.sentiment && { sentiment: filters.sentiment }),
          ...(filters.isQuestion !== undefined && {
            isQuestion: filters.isQuestion,
          }),
          ...(filters.isRisk !== undefined && { isRisk: filters.isRisk }),
          ...(filters.isSpam !== undefined && { isSpam: filters.isSpam }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip,
        take,
        orderBy: { publishedAt: "desc" },
        include: { analysis: true },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single comment by ID with its analysis data.
   */
  async findById(id: string) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { analysis: true },
    });
  }

  /**
   * Create a single comment.
   */
  async create(data: Prisma.CommentCreateInput) {
    return this.prisma.comment.create({ data });
  }

  /**
   * Batch-insert comments, skipping any that already exist by unique key.
   */
  async bulkCreate(comments: Prisma.CommentCreateManyInput[]) {
    return this.prisma.comment.createMany({
      data: comments,
      skipDuplicates: true,
    });
  }

  /**
   * Find comments that have not yet been analyzed (no CommentAnalysis record).
   */
  async findUnanalyzed(limit: number = 100): Promise<Comment[]> {
    return this.prisma.comment.findMany({
      where: { analysis: null },
      take: limit,
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Create an analysis record for a comment.
   */
  async createAnalysis(
    commentId: string,
    data: Omit<Prisma.CommentAnalysisCreateInput, "comment">,
  ) {
    return this.prisma.commentAnalysis.create({
      data: {
        ...data,
        comment: { connect: { id: commentId } },
      },
    });
  }

  /**
   * Query comment analyses across a project, joining through Content -> Channel -> Project.
   */
  async findAnalysisByFilters(
    projectId: string,
    filters?: CommentFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<CommentAnalysis>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.CommentAnalysisWhereInput = {
      comment: {
        content: {
          channel: { projectId },
        },
      },
      ...(filters?.sentiment && { sentiment: filters.sentiment }),
      ...(filters?.isQuestion !== undefined && {
        isQuestion: filters.isQuestion,
      }),
      ...(filters?.isRisk !== undefined && { isRisk: filters.isRisk }),
      ...(filters?.isSpam !== undefined && { isSpam: filters.isSpam }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.commentAnalysis.findMany({
        where,
        skip,
        take,
        orderBy: { analyzedAt: "desc" },
        include: { comment: true },
      }),
      this.prisma.commentAnalysis.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Get sentiment distribution counts for a project within a date range.
   */
  async countBySentiment(
    projectId: string,
    dateRange?: DateRange,
  ): Promise<SentimentDistribution[]> {
    const result = await this.prisma.commentAnalysis.groupBy({
      by: ["sentiment"],
      where: {
        comment: {
          content: {
            channel: { projectId },
          },
          ...(dateRange && {
            publishedAt: { gte: dateRange.from, lte: dateRange.to },
          }),
        },
      },
      _count: { sentiment: true },
    });

    return result.map(
      (r: { sentiment: SentimentType; _count: { sentiment: number } }) => ({
        sentiment: r.sentiment,
        count: r._count.sentiment,
      }),
    );
  }
}
