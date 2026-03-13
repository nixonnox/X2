import type {
  PrismaClient,
  InsightReport,
  ReportSection,
  ReportTemplate,
  InsightType,
  ReportStatus,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

/**
 * Repository for InsightReport, ReportSection, and ReportTemplate models.
 * Handles report CRUD, section management, and public sharing via tokens.
 */
export class ReportRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List reports for a project with optional type and status filters.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    type?: InsightType,
    status?: ReportStatus,
  ): Promise<PaginatedResult<InsightReport>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.InsightReportWhereInput = {
      projectId,
      ...(type && { type }),
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.insightReport.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.insightReport.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a report by ID with its sections, evidence assets, and action items.
   */
  async findById(id: string) {
    return this.prisma.insightReport.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { evidenceAssets: { orderBy: { order: "asc" } } },
        },
        actions: true,
      },
    });
  }

  /**
   * Create a report with nested sections.
   */
  async create(data: Prisma.InsightReportCreateInput) {
    return this.prisma.insightReport.create({
      data,
      include: { sections: true },
    });
  }

  /**
   * Update a report's publication status.
   */
  async updateStatus(id: string, status: ReportStatus) {
    return this.prisma.insightReport.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Find a report by its public share token.
   */
  async findByShareToken(token: string) {
    return this.prisma.insightReport.findUnique({
      where: { shareToken: token },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { evidenceAssets: { orderBy: { order: "asc" } } },
        },
      },
    });
  }

  /**
   * List available report templates, optionally filtered by vertical pack.
   */
  async findTemplates(verticalPackId?: string): Promise<ReportTemplate[]> {
    return this.prisma.reportTemplate.findMany({
      where: {
        ...(verticalPackId ? { verticalPackId } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find ordered sections for a report.
   */
  async findSections(reportId: string): Promise<ReportSection[]> {
    return this.prisma.reportSection.findMany({
      where: { reportId },
      orderBy: { order: "asc" },
      include: { evidenceAssets: { orderBy: { order: "asc" } } },
    });
  }
}
