import type {
  PrismaClient,
  CitationReadyReportSource,
  AeoEngine,
  CitationSourceType,
  Prisma,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

export type CitationSourceFilters = {
  sourceType?: CitationSourceType;
  isActive?: boolean;
  geoOptimized?: boolean;
  primaryTopic?: string;
};

/**
 * Repository for CitationReadyReportSource model.
 * Manages content sources intended for AI search engine citation.
 */
export class CitationSourceRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List citation sources for a project with optional filters.
   */
  async findByProject(
    projectId: string,
    filters?: CitationSourceFilters,
  ): Promise<CitationReadyReportSource[]> {
    return this.prisma.citationReadyReportSource.findMany({
      where: {
        projectId,
        ...(filters?.sourceType && { sourceType: filters.sourceType }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.geoOptimized !== undefined && {
          geoOptimized: filters.geoOptimized,
        }),
        ...(filters?.primaryTopic && { primaryTopic: filters.primaryTopic }),
      },
      orderBy: { currentCitationCount: "desc" },
    });
  }

  /**
   * Find a single citation source by ID.
   */
  async findById(id: string): Promise<CitationReadyReportSource | null> {
    return this.prisma.citationReadyReportSource.findUnique({ where: { id } });
  }

  /**
   * Create a new citation source.
   */
  async create(data: Prisma.CitationReadyReportSourceCreateInput) {
    return this.prisma.citationReadyReportSource.create({ data });
  }

  /**
   * Update a citation source's fields.
   */
  async update(id: string, data: Prisma.CitationReadyReportSourceUpdateInput) {
    return this.prisma.citationReadyReportSource.update({
      where: { id },
      data,
    });
  }

  /**
   * Update citation tracking fields after a new citation is detected.
   */
  async updateCitationCount(
    id: string,
    count: number,
    lastCitedDate: Date,
    engine: AeoEngine,
  ) {
    return this.prisma.citationReadyReportSource.update({
      where: { id },
      data: {
        currentCitationCount: count,
        lastCitedDate,
        lastCitedEngine: engine,
      },
    });
  }

  /**
   * Find sources by their citation status (cited or not cited).
   */
  async findByCitationStatus(
    projectId: string,
    minCitations: number = 1,
  ): Promise<CitationReadyReportSource[]> {
    return this.prisma.citationReadyReportSource.findMany({
      where: {
        projectId,
        isActive: true,
        currentCitationCount: { gte: minCitations },
      },
      orderBy: { currentCitationCount: "desc" },
    });
  }
}
