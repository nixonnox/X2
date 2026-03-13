import type {
  PrismaClient,
  Campaign,
  CampaignCreator,
  CampaignContent,
  CampaignMetric,
  PostMeasurement,
  RoiCalculation,
  CampaignStatus,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

/**
 * Repository for Campaign and related models (CampaignCreator, CampaignContent,
 * CampaignMetric, PostMeasurement, RoiCalculation).
 * Manages influencer campaign lifecycle from planning through ROI measurement.
 */
export class CampaignRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List campaigns for a project with optional status filter.
   */
  async findByProject(
    projectId: string,
    pagination?: PaginationParams,
    status?: CampaignStatus,
  ): Promise<PaginatedResult<Campaign>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.CampaignWhereInput = {
      projectId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a campaign by ID with its creators, content, and metrics.
   */
  async findById(id: string) {
    return this.prisma.campaign.findUnique({
      where: { id },
      include: {
        creators: {
          include: {
            channel: { select: { id: true, name: true, platform: true } },
            influencerProfile: {
              select: { id: true, tierLevel: true, overallScore: true },
            },
            contents: true,
          },
        },
        contents: true,
        _count: { select: { metrics: true, roiCalculations: true } },
      },
    });
  }

  /**
   * Create a campaign with nested creators.
   */
  async create(data: Prisma.CampaignCreateInput) {
    return this.prisma.campaign.create({
      data,
      include: { creators: true },
    });
  }

  /**
   * Update a campaign's status.
   */
  async updateStatus(id: string, status: CampaignStatus) {
    return this.prisma.campaign.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Add a creator (influencer) to a campaign.
   */
  async addCreator(
    campaignId: string,
    data: Omit<Prisma.CampaignCreatorCreateInput, "campaign">,
  ) {
    return this.prisma.campaignCreator.create({
      data: {
        ...data,
        campaign: { connect: { id: campaignId } },
      },
    });
  }

  /**
   * Add content to a campaign creator's deliverables.
   */
  async addContent(
    campaignCreatorId: string,
    data: Omit<Prisma.CampaignContentCreateInput, "campaignCreator">,
  ) {
    return this.prisma.campaignContent.create({
      data: {
        ...data,
        campaignCreator: { connect: { id: campaignCreatorId } },
      },
    });
  }

  /**
   * Upsert daily aggregate metrics for a campaign.
   */
  async upsertDailyMetric(
    campaignId: string,
    date: Date,
    data: Omit<Prisma.CampaignMetricCreateInput, "campaign" | "date">,
  ) {
    return this.prisma.campaignMetric.upsert({
      where: { campaignId_date: { campaignId, date } },
      create: { ...data, date, campaign: { connect: { id: campaignId } } },
      update: data,
    });
  }

  /**
   * Upsert a daily measurement for a specific campaign content post.
   */
  async upsertPostMeasurement(
    campaignContentId: string,
    date: Date,
    data: Omit<Prisma.PostMeasurementCreateInput, "campaignContent" | "date">,
  ) {
    return this.prisma.postMeasurement.upsert({
      where: { campaignContentId_date: { campaignContentId, date } },
      create: {
        ...data,
        date,
        campaignContent: { connect: { id: campaignContentId } },
      },
      update: data,
    });
  }

  /**
   * Create a new ROI calculation snapshot for a campaign.
   */
  async createRoiCalculation(
    campaignId: string,
    data: Omit<Prisma.RoiCalculationCreateInput, "campaign">,
  ) {
    return this.prisma.roiCalculation.create({
      data: {
        ...data,
        campaign: { connect: { id: campaignId } },
      },
    });
  }

  /**
   * Find the most recent ROI calculation for a campaign.
   */
  async findLatestRoi(campaignId: string): Promise<RoiCalculation | null> {
    return this.prisma.roiCalculation.findFirst({
      where: { campaignId },
      orderBy: { calculatedAt: "desc" },
    });
  }
}
