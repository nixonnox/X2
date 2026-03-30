import type { Repositories } from "../../repositories";
import type { PaginatedResult } from "../../repositories/base.repository";
import { type ServiceResult, type Logger, ok, err } from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationInput = {
  userId: string;
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  channel?: string;
  actionUrl?: string;
  sourceType?: string;
  sourceId?: string;
};

export type Notification = {
  id: string;
  userId: string | null;
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: Date;
};

export type NotificationFilters = {
  isRead?: boolean;
  type?: string;
  pagination?: { page?: number; pageSize?: number };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class NotificationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Create a notification.
   */
  async create(input: NotificationInput): Promise<ServiceResult<Notification>> {
    try {
      if (!input.title || !input.message) {
        return err("title and message are required", "INVALID_INPUT");
      }

      const notification = await this.repositories.notification.create({
        type: input.type as any,
        title: input.title,
        message: input.message,
        channels: [input.channel ?? "IN_APP"],
        isRead: false,
        actionUrl: input.actionUrl ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        user: { connect: { id: input.userId } },
      });

      // TODO: [INTEGRATION] WebSocket push for real-time delivery
      // Expected: wsServer.push(input.userId, { type: 'notification', data: notification })

      // TODO: [INTEGRATION] Email service for email channel
      // if (input.channel === 'EMAIL') { emailService.send(user.email, input.title, input.message) }

      this.logger.info("Notification created", {
        notificationId: notification.id,
        userId: input.userId,
        type: input.type,
      });

      return ok(notification as unknown as Notification);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to create notification", {
        userId: input.userId,
        error: message,
      });
      return err(message, "NOTIFICATION_CREATE_FAILED");
    }
  }

  /**
   * List notifications for user.
   */
  async listForUser(
    userId: string,
    filters?: NotificationFilters,
  ): Promise<ServiceResult<PaginatedResult<Notification>>> {
    try {
      const result = await this.repositories.notification.findByUser(
        userId,
        filters?.pagination,
        filters?.isRead,
      );

      return ok(result as unknown as PaginatedResult<Notification>);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to list notifications", {
        userId,
        error: message,
      });
      return err(message, "NOTIFICATION_LIST_FAILED");
    }
  }

  /**
   * Mark notification as read.
   */
  async markRead(notificationId: string): Promise<ServiceResult<void>> {
    try {
      const notification =
        await this.repositories.notification.findById(notificationId);
      if (!notification) {
        return err("Notification not found", "NOTIFICATION_NOT_FOUND");
      }

      if (notification.isRead) {
        return ok(undefined); // Already read, no-op
      }

      await this.repositories.notification.markRead(notificationId);

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to mark notification as read", {
        notificationId,
        error: message,
      });
      return err(message, "NOTIFICATION_READ_FAILED");
    }
  }

  /**
   * Mark all notifications as read for user.
   */
  async markAllRead(userId: string): Promise<ServiceResult<void>> {
    try {
      await this.repositories.notification.markAllRead(userId);

      this.logger.info("All notifications marked as read", { userId });

      return ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to mark all notifications as read", {
        userId,
        error: message,
      });
      return err(message, "NOTIFICATION_READ_ALL_FAILED");
    }
  }

  /**
   * Get unread count.
   */
  async getUnreadCount(userId: string): Promise<ServiceResult<number>> {
    try {
      const count = await this.repositories.notification.getUnreadCount(userId);

      return ok(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get unread count", {
        userId,
        error: message,
      });
      return err(message, "NOTIFICATION_COUNT_FAILED");
    }
  }

  /**
   * Create system alert (for ops events).
   */
  async createSystemAlert(
    workspaceId: string,
    type: string,
    title: string,
    message: string,
    sourceType?: string,
    sourceId?: string,
  ): Promise<ServiceResult<Notification>> {
    try {
      // Find workspace admins
      const allMembers =
        await this.repositories.workspace.findMembers(workspaceId);
      const admins = allMembers.filter(
        (m) => (m as any).role === "OWNER" || (m as any).role === "ADMIN",
      );

      if (admins.length === 0) {
        this.logger.warn("No admins found for workspace, alert not sent", {
          workspaceId,
          type,
        });
        return err("No admins found for workspace", "NO_ADMINS");
      }

      // Create notification for the first admin (primary)
      // In a full implementation, create for all admins
      let lastCreated: Notification | null = null;

      for (const admin of admins) {
        const notification = await this.repositories.notification.create({
          type: type as any,
          title,
          message,
          channels: ["IN_APP"],
          isRead: false,
          sourceType: sourceType ?? null,
          sourceId: sourceId ?? null,
          user: { connect: { id: admin.userId } },
        });

        lastCreated = notification as unknown as Notification;

        // TODO: [INTEGRATION] WebSocket push for real-time delivery
        // TODO: [INTEGRATION] Email service for critical alerts
      }

      this.logger.info("System alert created", {
        workspaceId,
        type,
        recipientCount: admins.length,
      });

      return ok(lastCreated!);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to create system alert", {
        workspaceId,
        type,
        error: message,
      });
      return err(message, "SYSTEM_ALERT_FAILED");
    }
  }
}
