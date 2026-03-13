import type { PrismaClient, Notification, Prisma } from "@prisma/client";
import {
  BaseRepository,
  type PaginationParams,
  type PaginatedResult,
} from "./base.repository";

/**
 * Repository for Notification model.
 * Handles system notifications: creation, read status, and per-user/workspace queries.
 */
export class NotificationRepository extends BaseRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  /**
   * List notifications for a user with optional read/unread filter.
   */
  async findByUser(
    userId: string,
    pagination?: PaginationParams,
    isRead?: boolean,
  ): Promise<PaginatedResult<Notification>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(isRead !== undefined && { isRead }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }

  /**
   * Find a single notification by ID.
   */
  async findById(id: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { id } });
  }

  /**
   * Create a new notification.
   */
  async create(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Mark a single notification as read.
   */
  async markRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Get the count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * List notifications scoped to a workspace.
   */
  async findByWorkspace(
    workspaceId: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Notification>> {
    const { skip, take, page, pageSize } = this.paginate(pagination);

    const where: Prisma.NotificationWhereInput = { workspaceId };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return this.toPaginatedResult(data, total, page, pageSize);
  }
}
