import type {
  PrismaClient,
  FAQCandidate,
  FAQStatus,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

/**
 * Repository for FAQCandidate model.
 * Manages frequently asked questions detected from comment analysis clustering.
 */
export class FaqCandidateRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List FAQ candidates for a project with optional status filter.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    status?: FAQStatus,
  ): Promise<PaginatedResult<FAQCandidate>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.FAQCandidateWhereInput = {
      projectId,
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fAQCandidate.findMany({
        where,
        skip,
        take,
        orderBy: { mentionCount: "desc" },
      }),
      this.prisma.fAQCandidate.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single FAQ candidate by ID.
   */
  async findById(id: string): Promise<FAQCandidate | null> {
    return this.prisma.fAQCandidate.findUnique({ where: { id } });
  }

  /**
   * Create a new FAQ candidate.
   */
  async create(data: Prisma.FAQCandidateCreateInput) {
    return this.prisma.fAQCandidate.create({ data });
  }

  /**
   * Update a FAQ candidate's status and optional resolution timestamp.
   */
  async updateStatus(id: string, status: FAQStatus, resolvedAt?: Date) {
    return this.prisma.fAQCandidate.update({
      where: { id },
      data: {
        status,
        ...(resolvedAt && { resolvedAt }),
        ...(status === "ANSWERED" && !resolvedAt && { resolvedAt: new Date() }),
      },
    });
  }

  /**
   * Upsert a FAQ by question text: increment mention count and append source comment IDs.
   */
  async upsertByQuestion(
    projectId: string,
    question: string,
    data: {
      sourceCommentIds?: string[];
      questionVariants?: string[];
      category?: string;
      urgencyScore?: number;
      businessImpact?: string;
      suggestedAction?: string;
    },
  ) {
    const now = new Date();
    return this.prisma.fAQCandidate.upsert({
      where: { projectId_question: { projectId, question } },
      create: {
        question,
        project: { connect: { id: projectId } },
        sourceCommentIds: data.sourceCommentIds ?? [],
        questionVariants: data.questionVariants ?? [],
        category: data.category,
        urgencyScore: data.urgencyScore,
        businessImpact: data.businessImpact,
        suggestedAction: data.suggestedAction,
        mentionCount: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        mentionCount: { increment: 1 },
        lastSeenAt: now,
        ...(data.sourceCommentIds && {
          sourceCommentIds: { push: data.sourceCommentIds },
        }),
        ...(data.questionVariants && {
          questionVariants: { push: data.questionVariants },
        }),
        ...(data.category && { category: data.category }),
        ...(data.urgencyScore !== undefined && {
          urgencyScore: data.urgencyScore,
        }),
        ...(data.businessImpact && { businessImpact: data.businessImpact }),
        ...(data.suggestedAction && { suggestedAction: data.suggestedAction }),
      },
    });
  }

  /**
   * Find top FAQ candidates by mention count.
   */
  async findTopByMentionCount(
    projectId: string,
    limit: number = 10,
  ): Promise<FAQCandidate[]> {
    return this.prisma.fAQCandidate.findMany({
      where: { projectId },
      orderBy: { mentionCount: "desc" },
      take: limit,
    });
  }

  /**
   * Find FAQ candidates that have not yet been answered.
   */
  async findUnanswered(projectId: string): Promise<FAQCandidate[]> {
    return this.prisma.fAQCandidate.findMany({
      where: {
        projectId,
        hasAnswer: false,
        status: { in: ["DETECTED", "REVIEWING"] },
      },
      orderBy: { mentionCount: "desc" },
    });
  }
}
