import type {
  PrismaClient,
  AeoKeyword,
  AeoSnapshot,
  AeoEngine,
  KeywordStatus,
  Prisma,
} from "@prisma/client";
import { BaseRepository, type DateRange } from "./base.repository";

/**
 * Repository for AeoKeyword and AeoSnapshot models.
 * Manages AI engine optimization keyword tracking and citation snapshots.
 */
export class AeoRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List AEO keywords for a project, optionally filtered by status.
   */
  async findKeywordsByProject(
    projectId: string,
    status?: KeywordStatus,
  ): Promise<AeoKeyword[]> {
    return this.prisma.aeoKeyword.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find a single AEO keyword by ID with its snapshots.
   */
  async findKeywordById(id: string) {
    return this.prisma.aeoKeyword.findUnique({
      where: { id },
      include: {
        snapshots: { orderBy: { date: "desc" }, take: 30 },
      },
    });
  }

  /**
   * Create a new AEO keyword to track.
   */
  async createKeyword(data: Prisma.AeoKeywordCreateInput) {
    return this.prisma.aeoKeyword.create({ data });
  }

  /**
   * Retrieve snapshots for a keyword, optionally filtered by date range and engine.
   */
  async findSnapshots(
    keywordId: string,
    dateRange?: DateRange,
    engine?: AeoEngine,
  ): Promise<AeoSnapshot[]> {
    return this.prisma.aeoSnapshot.findMany({
      where: {
        keywordId,
        ...(engine && { engine }),
        ...(dateRange && {
          date: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Upsert a snapshot keyed by (keywordId, date, engine).
   */
  async upsertSnapshot(
    keywordId: string,
    date: Date,
    engine: AeoEngine,
    data: Omit<Prisma.AeoSnapshotCreateInput, "keyword" | "date" | "engine">,
  ) {
    return this.prisma.aeoSnapshot.upsert({
      where: {
        keywordId_date_engine: { keywordId, date, engine },
      },
      create: {
        ...data,
        date,
        engine,
        keyword: { connect: { id: keywordId } },
      },
      update: data,
    });
  }

  /**
   * Find the latest snapshot per keyword per engine for a project.
   * Uses a raw approach: fetches all keywords, then latest snapshot for each.
   */
  async findLatestSnapshots(
    projectId: string,
  ): Promise<Array<AeoKeyword & { snapshots: AeoSnapshot[] }>> {
    const keywords = await this.prisma.aeoKeyword.findMany({
      where: { projectId, status: "ACTIVE" },
      include: {
        snapshots: {
          orderBy: { date: "desc" },
          distinct: ["engine"],
          take: 4, // max 4 engines
        },
      },
    });

    return keywords;
  }
}
