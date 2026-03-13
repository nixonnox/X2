import type {
  PrismaClient,
  InfluencerProfile,
  InfluencerTier,
  SocialPlatform,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

export type InfluencerSearchFilters = {
  platform?: SocialPlatform;
  tier?: InfluencerTier;
  minFollowers?: number;
  categories?: string[];
  country?: string;
};

/**
 * Repository for InfluencerProfile model.
 * Manages influencer discovery, scoring, and profile data tied to channels.
 */
export class InfluencerRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * Find the influencer profile linked to a specific channel.
   */
  async findByChannel(channelId: string): Promise<InfluencerProfile | null> {
    return this.prisma.influencerProfile.findUnique({
      where: { channelId },
    });
  }

  /**
   * Find an influencer profile by ID.
   */
  async findById(id: string): Promise<InfluencerProfile | null> {
    return this.prisma.influencerProfile.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            platform: true,
            subscriberCount: true,
            url: true,
          },
        },
      },
    });
  }

  /**
   * Create or update an influencer profile for a channel.
   */
  async upsert(
    channelId: string,
    data: Omit<Prisma.InfluencerProfileCreateInput, "channel">,
  ) {
    return this.prisma.influencerProfile.upsert({
      where: { channelId },
      create: {
        ...data,
        channel: { connect: { id: channelId } },
      },
      update: data,
    });
  }

  /**
   * Find influencer profiles by tier with pagination.
   */
  async findByTier(
    tier: InfluencerTier,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<InfluencerProfile>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.InfluencerProfileWhereInput = { tierLevel: tier };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.influencerProfile.findMany({
        where,
        skip,
        take,
        orderBy: { overallScore: "desc" },
      }),
      this.prisma.influencerProfile.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Search influencers by name, platform, tier, and minimum follower count.
   */
  async search(
    query: string,
    filters?: InfluencerSearchFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<InfluencerProfile>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.InfluencerProfileWhereInput = {
      ...(filters?.tier && { tierLevel: filters.tier }),
      ...(filters?.country && { country: filters.country }),
      ...(filters?.categories && {
        categories: { hasSome: filters.categories },
      }),
      channel: {
        ...(query && {
          name: { contains: query, mode: "insensitive" as const },
        }),
        ...(filters?.platform && { platform: filters.platform }),
        ...(filters?.minFollowers && {
          subscriberCount: { gte: filters.minFollowers },
        }),
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.influencerProfile.findMany({
        where,
        skip,
        take,
        orderBy: { overallScore: "desc" },
        include: {
          channel: {
            select: {
              id: true,
              name: true,
              platform: true,
              subscriberCount: true,
              url: true,
            },
          },
        },
      }),
      this.prisma.influencerProfile.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }
}
