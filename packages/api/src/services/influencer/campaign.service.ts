import type { Repositories } from "../../repositories";
import type { PaginatedResult } from "../../repositories/base.repository";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CampaignInput = {
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  currency?: string;
  goals?: string[];
  hashtags?: string[];
};

export type CreatorInput = {
  channelId: string;
  influencerProfileId?: string;
  role?: string;
  agreedRate?: number;
  deliverables?: string;
};

export type ContentInput = {
  campaignId: string;
  title: string;
  contentUrl?: string;
  platform: string;
  contentType?: string;
  publishedAt?: Date;
};

export type Campaign = {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  currency: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CampaignCreator = {
  id: string;
  campaignId: string;
  channelId: string;
  influencerProfileId: string | null;
  role: string | null;
  agreedRate: number | null;
  status: string;
};

export type CampaignContent = {
  id: string;
  campaignCreatorId: string;
  campaignId: string;
  title: string;
  contentUrl: string | null;
  platform: string;
  contentType: string | null;
  publishedAt: Date | null;
};

export type CampaignDetail = Campaign & {
  creators: (CampaignCreator & {
    channel?: { id: string; name: string; platform: string };
    contents?: CampaignContent[];
  })[];
  metricsCount: number;
  roiCalculationsCount: number;
};

export type CampaignFilters = {
  status?: string;
  pagination?: { page?: number; pageSize?: number };
};

// Valid status transitions
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["ACTIVE", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CampaignService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a new campaign.
   */
  async createCampaign(
    projectId: string,
    input: CampaignInput,
  ): Promise<ServiceResult<Campaign>> {
    try {
      if (!input.name) {
        return err("Campaign name is required", "INVALID_INPUT");
      }

      const campaign = await this.repositories.campaign.create({
        name: input.name,
        objective: input.description ?? null,
        campaignType: "BRAND_AWARENESS" as any,
        status: "DRAFT",
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        totalBudget: input.budget ?? null,
        currency: input.currency ?? "USD",
        kpiTargets: input.goals ? (input.goals as any) : undefined,
        project: { connect: { id: projectId } },
      });

      this.logger.info("Campaign created", {
        projectId,
        campaignId: campaign.id,
        name: input.name,
      });

      return ok(campaign as unknown as Campaign);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to create campaign", {
        projectId,
        error: message,
      });
      return err(message, "CAMPAIGN_CREATE_FAILED");
    }
  }

  /**
   * Add creators to campaign.
   */
  async addCreators(
    campaignId: string,
    creators: CreatorInput[],
  ): Promise<ServiceResult<CampaignCreator[]>> {
    try {
      if (creators.length === 0) {
        return err("At least one creator is required", "INVALID_INPUT");
      }

      // Validate campaign exists
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      const createdCreators: CampaignCreator[] = [];

      for (const input of creators) {
        // Validate channel exists
        const channel = await this.repositories.channel.findById(
          input.channelId,
        );
        if (!channel) {
          this.logger.warn("Channel not found, skipping creator", {
            channelId: input.channelId,
            campaignId,
          });
          continue;
        }

        const creator = await this.repositories.campaign.addCreator(
          campaignId,
          {
            channel: { connect: { id: input.channelId } },
            ...(input.influencerProfileId && {
              influencerProfile: { connect: { id: input.influencerProfileId } },
            }),
            outreachStatus: "PROPOSED" as any,
            compensationAmount: input.agreedRate ?? null,
          },
        );

        createdCreators.push(creator as unknown as CampaignCreator);
      }

      this.logger.info("Creators added to campaign", {
        campaignId,
        creatorCount: createdCreators.length,
      });

      return ok(createdCreators);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to add creators", {
        campaignId,
        error: message,
      });
      return err(message, "CAMPAIGN_ADD_CREATORS_FAILED");
    }
  }

  /**
   * Add content to campaign creator.
   */
  async addContent(
    creatorId: string,
    content: ContentInput,
  ): Promise<ServiceResult<CampaignContent>> {
    try {
      if (!content.title) {
        return err("Content title is required", "INVALID_INPUT");
      }

      const campaignContent = await this.repositories.campaign.addContent(
        creatorId,
        {
          campaign: { connect: { id: content.campaignId } },
          platformContentUrl: content.contentUrl ?? null,
          platform: content.platform as any,
          status: "PLANNED" as any,
          publishedAt: content.publishedAt ?? null,
        },
      );

      this.logger.info("Content added to campaign creator", {
        creatorId,
        contentId: campaignContent.id,
      });

      return ok(campaignContent as unknown as CampaignContent);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to add campaign content", {
        creatorId,
        error: message,
      });
      return err(message, "CAMPAIGN_ADD_CONTENT_FAILED");
    }
  }

  /**
   * Update campaign status (DRAFT -> ACTIVE -> PAUSED -> COMPLETED -> ARCHIVED).
   */
  async updateStatus(
    campaignId: string,
    status: string,
  ): Promise<ServiceResult<Campaign>> {
    try {
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      // Validate status transition
      const allowed = VALID_STATUS_TRANSITIONS[campaign.status] ?? [];
      if (!allowed.includes(status)) {
        return err(
          `Invalid status transition from ${campaign.status} to ${status}`,
          "INVALID_STATUS_TRANSITION",
        );
      }

      const updated = await this.repositories.campaign.updateStatus(
        campaignId,
        status as any,
      );

      this.logger.info("Campaign status updated", {
        campaignId,
        from: campaign.status,
        to: status,
      });

      return ok(updated as unknown as Campaign);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to update campaign status", {
        campaignId,
        error: message,
      });
      return err(message, "CAMPAIGN_STATUS_FAILED");
    }
  }

  /**
   * List campaigns for project.
   */
  async listCampaigns(
    projectId: string,
    filters?: CampaignFilters,
  ): Promise<ServiceResult<PaginatedResult<Campaign>>> {
    try {
      const result = await this.repositories.campaign.findByProject(
        projectId,
        filters?.pagination,
        filters?.status as any,
      );

      return ok(result as unknown as PaginatedResult<Campaign>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list campaigns", {
        projectId,
        error: message,
      });
      return err(message, "CAMPAIGN_LIST_FAILED");
    }
  }

  /**
   * Get campaign details with all related data.
   */
  async getCampaign(
    campaignId: string,
  ): Promise<ServiceResult<CampaignDetail>> {
    try {
      const campaign = await this.repositories.campaign.findById(campaignId);
      if (!campaign) {
        return err("Campaign not found", "CAMPAIGN_NOT_FOUND");
      }

      const detail: CampaignDetail = {
        id: campaign.id,
        projectId: campaign.projectId,
        name: campaign.name,
        description: campaign.objective ?? null,
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
        budget: campaign.totalBudget ? Number(campaign.totalBudget) : null,
        currency: campaign.currency,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        creators: (campaign.creators ?? []).map((c: any) => ({
          id: c.id,
          campaignId: c.campaignId ?? campaignId,
          channelId: c.channelId ?? c.channel?.id,
          influencerProfileId:
            c.influencerProfileId ?? c.influencerProfile?.id ?? null,
          role: c.role,
          agreedRate: c.agreedRate ? Number(c.agreedRate) : null,
          status: c.status,
          channel: c.channel,
          contents: c.contents,
        })),
        metricsCount: (campaign as any)._count?.metrics ?? 0,
        roiCalculationsCount: (campaign as any)._count?.roiCalculations ?? 0,
      };

      return ok(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get campaign", {
        campaignId,
        error: message,
      });
      return err(message, "CAMPAIGN_GET_FAILED");
    }
  }
}
