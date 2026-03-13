import type {
  PrismaClient,
  EvidenceAsset,
  DataSourceType,
  Prisma,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

/**
 * Repository for EvidenceAsset model.
 * Manages data-backed evidence blocks embedded in report sections.
 */
export class EvidenceAssetRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find all evidence assets belonging to a report section, ordered by position.
   */
  async findBySection(sectionId: string): Promise<EvidenceAsset[]> {
    return this.prisma.evidenceAsset.findMany({
      where: { sectionId },
      orderBy: { order: "asc" },
    });
  }

  /**
   * Create a new evidence asset within a section.
   */
  async create(
    sectionId: string,
    data: Omit<Prisma.EvidenceAssetCreateInput, "section">,
  ) {
    return this.prisma.evidenceAsset.create({
      data: {
        ...data,
        section: { connect: { id: sectionId } },
      },
    });
  }

  /**
   * Reverse lookup: find which reports reference a specific data entity.
   * Useful for impact analysis when source data changes.
   */
  async findByDataSource(
    dataSourceType: DataSourceType,
    entityId: string,
  ): Promise<EvidenceAsset[]> {
    return this.prisma.evidenceAsset.findMany({
      where: {
        dataSourceType,
        dataEntityIds: { has: entityId },
      },
      include: {
        section: {
          include: {
            report: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });
  }
}
