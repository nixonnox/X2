import type {
  PrismaClient,
  Channel,
  ChannelSnapshot,
  ChannelConnection,
  SocialPlatform,
  ChannelStatus,
  ChannelType,
  ConnectionStatus,
  Prisma,
} from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
  type DateRange,
} from "./base.repository";

export type ChannelFilters = {
  platform?: SocialPlatform;
  status?: ChannelStatus;
  channelType?: ChannelType;
  search?: string;
};

/**
 * Repository for Channel, ChannelConnection, and ChannelSnapshot models.
 * Handles channel CRUD, OAuth connection management, and time-series snapshots.
 */
export class ChannelRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List channels belonging to a project with optional filters.
   */
  async findByProject(
    projectId: string,
    filters?: ChannelFilters,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Channel>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.ChannelWhereInput = {
      projectId,
      deletedAt: null,
      ...(filters?.platform && { platform: filters.platform }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.channelType && { channelType: filters.channelType }),
      ...(filters?.search && {
        name: { contains: filters.search, mode: "insensitive" as const },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.channel.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.channel.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single channel by ID, including connections and snapshot count.
   */
  async findById(id: string) {
    return this.prisma.channel.findUnique({
      where: { id },
      include: {
        connections: { orderBy: { connectedAt: "desc" }, take: 1 },
        _count: { select: { snapshots: true, contents: true } },
      },
    });
  }

  /**
   * Create a new channel.
   */
  async create(data: Prisma.ChannelCreateInput) {
    return this.prisma.channel.create({ data });
  }

  /**
   * Update channel fields by ID.
   */
  async update(id: string, data: Prisma.ChannelUpdateInput) {
    return this.prisma.channel.update({ where: { id }, data });
  }

  /**
   * Soft-delete a channel by setting deletedAt.
   */
  async softDelete(id: string) {
    return this.prisma.channel.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  }

  /**
   * Retrieve time-series channel snapshots within a date range.
   */
  async findSnapshots(
    channelId: string,
    dateRange?: DateRange,
  ): Promise<ChannelSnapshot[]> {
    return this.prisma.channelSnapshot.findMany({
      where: {
        channelId,
        ...(dateRange && {
          date: { gte: dateRange.from, lte: dateRange.to },
        }),
      },
      orderBy: { date: "asc" },
    });
  }

  /**
   * Upsert a daily channel snapshot keyed by (channelId, date).
   */
  async upsertSnapshot(
    channelId: string,
    date: Date,
    data: Omit<Prisma.ChannelSnapshotCreateInput, "channel" | "date">,
  ) {
    return this.prisma.channelSnapshot.upsert({
      where: { channelId_date: { channelId, date } },
      create: { ...data, date, channel: { connect: { id: channelId } } },
      update: data,
    });
  }

  /**
   * Find the latest OAuth connection for a channel.
   */
  async findConnection(channelId: string): Promise<ChannelConnection | null> {
    return this.prisma.channelConnection.findFirst({
      where: { channelId, status: "ACTIVE" },
      orderBy: { connectedAt: "desc" },
    });
  }

  /**
   * Create or update an OAuth connection for a channel.
   */
  async upsertConnection(
    channelId: string,
    tokenData: {
      accessToken: string;
      refreshToken?: string;
      tokenExpiry?: Date;
      scopes?: string[];
      status?: ConnectionStatus;
    },
  ) {
    const existing = await this.findConnection(channelId);

    if (existing) {
      return this.prisma.channelConnection.update({
        where: { id: existing.id },
        data: tokenData,
      });
    }

    return this.prisma.channelConnection.create({
      data: {
        ...tokenData,
        scopes: tokenData.scopes ?? [],
        channel: { connect: { id: channelId } },
      },
    });
  }
}
