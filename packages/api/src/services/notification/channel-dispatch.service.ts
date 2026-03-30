/**
 * NotificationChannelDispatchService
 *
 * 알림 생성 후 설정된 채널(IN_APP, EMAIL, WEBHOOK)별로
 * 실제 발송을 수행하는 서비스.
 *
 * - IN_APP: DB에 이미 저장됨 (별도 발송 불필요)
 * - EMAIL: SMTP/API 기반 이메일 발송
 * - WEBHOOK: HTTP POST 기반 웹훅 발송
 *
 * 각 채널은 독립적으로 실행되며, 한 채널의 실패가 다른 채널에 영향을 주지 않는다.
 */

// ─── Types ──────────────────────────────────────────────────────

export type DeliveryChannel = "IN_APP" | "EMAIL" | "WEBHOOK";

export type DeliveryStatus =
  | "SUCCESS"
  | "FAILED"
  | "SKIPPED"
  | "QUEUED"
  | "DEDUPLICATED"
  | "PROVIDER_UNAVAILABLE";

export type DeliveryResult = {
  channel: DeliveryChannel;
  status: DeliveryStatus;
  error?: string;
  deliveredAt?: string;
  retryCount?: number;
};

export type DispatchInput = {
  notificationId: string;
  userId: string;
  channels: DeliveryChannel[];
  title: string;
  message: string;
  priority: string;
  actionUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  // Email-specific
  recipientEmail?: string;
  // Webhook-specific
  webhookUrl?: string;
};

export type ChannelConfig = {
  emailEnabled: boolean;
  emailSmtpHost?: string;
  emailSmtpPort?: number;
  emailFrom?: string;
  emailApiKey?: string; // For transactional email APIs (SendGrid, Resend, etc.)
  emailApiUrl?: string;
  webhookEnabled: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
};

// ─── Environment-based Config ───────────────────────────────────

function loadChannelConfig(): ChannelConfig {
  return {
    emailEnabled: !!process.env.NOTIFICATION_EMAIL_API_KEY,
    emailApiKey: process.env.NOTIFICATION_EMAIL_API_KEY,
    emailApiUrl:
      process.env.NOTIFICATION_EMAIL_API_URL ?? "https://api.resend.com/emails",
    emailFrom: process.env.NOTIFICATION_EMAIL_FROM ?? "notifications@x2.app",
    webhookEnabled: !!process.env.NOTIFICATION_WEBHOOK_URL,
    webhookUrl: process.env.NOTIFICATION_WEBHOOK_URL,
    webhookSecret: process.env.NOTIFICATION_WEBHOOK_SECRET,
  };
}

// ─── Service ────────────────────────────────────────────────────

export class NotificationChannelDispatchService {
  private config: ChannelConfig;
  private deliveryLog: DeliveryResult[] = [];
  private prisma: any | null = null;

  constructor(config?: Partial<ChannelConfig>, prisma?: any) {
    const envConfig = loadChannelConfig();
    this.config = { ...envConfig, ...config };
    this.prisma = prisma ?? null;
  }

  /**
   * Dispatch a notification to all specified channels.
   * Each channel runs independently — failures don't block other channels.
   */
  async dispatch(input: DispatchInput): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    for (const channel of input.channels) {
      try {
        const result = await this.deliverToChannel(channel, input);
        results.push(result);
        this.deliveryLog.push(result);
        await this.persistDeliveryResult(input, result);
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        const result: DeliveryResult = {
          channel,
          status: "FAILED",
          error,
        };
        results.push(result);
        this.deliveryLog.push(result);
        await this.persistDeliveryResult(input, result);
        console.error(`[ChannelDispatch] ${channel} delivery failed:`, error);
      }
    }

    return results;
  }

  /**
   * Persist delivery result to delivery_logs table.
   * Non-blocking: failures here don't affect dispatch.
   */
  private async persistDeliveryResult(
    input: DispatchInput,
    result: DeliveryResult,
  ): Promise<void> {
    if (!this.prisma) return;

    try {
      // delivery_logs requires executionId (FK to automation_executions).
      // When no automation execution context exists, we skip DB persistence
      // and rely on the in-memory log. This is the expected path for
      // direct alert-triggered dispatches.
      // Future: create a lightweight execution record for non-automation dispatches.

      // For now, log the delivery result for observability
      if (result.status === "FAILED") {
        console.warn(
          `[ChannelDispatch] ${result.channel} delivery failed for notification ${input.notificationId}: ${result.error}`,
        );
      }
    } catch {
      // Persistence failure must not block dispatch
    }
  }

  /**
   * Get channel availability status.
   */
  getChannelStatus(): Record<
    DeliveryChannel,
    { enabled: boolean; configured: boolean }
  > {
    return {
      IN_APP: { enabled: true, configured: true },
      EMAIL: {
        enabled: this.config.emailEnabled,
        configured: !!this.config.emailApiKey,
      },
      WEBHOOK: {
        enabled: this.config.webhookEnabled,
        configured: !!this.config.webhookUrl,
      },
    };
  }

  /**
   * Get recent delivery log (for debugging/monitoring).
   */
  getRecentDeliveryLog(limit = 20): DeliveryResult[] {
    return this.deliveryLog.slice(-limit);
  }

  // ─── Channel Delivery ──────────────────────────────────────────

  private async deliverToChannel(
    channel: DeliveryChannel,
    input: DispatchInput,
  ): Promise<DeliveryResult> {
    switch (channel) {
      case "IN_APP":
        // Already saved to DB during notification creation
        return {
          channel,
          status: "SUCCESS",
          deliveredAt: new Date().toISOString(),
        };

      case "EMAIL":
        return this.deliverEmail(input);

      case "WEBHOOK":
        return this.deliverWebhook(input);

      default:
        return {
          channel,
          status: "SKIPPED",
          error: `Unknown channel: ${channel}`,
        };
    }
  }

  // ─── Email Delivery ────────────────────────────────────────────

  private async deliverEmail(input: DispatchInput): Promise<DeliveryResult> {
    if (!this.config.emailEnabled || !this.config.emailApiKey) {
      return {
        channel: "EMAIL",
        status: "PROVIDER_UNAVAILABLE",
        error: "NOTIFICATION_EMAIL_API_KEY 환경변수가 설정되지 않았습니다",
      };
    }

    const recipientEmail = input.recipientEmail;
    if (!recipientEmail) {
      return {
        channel: "EMAIL",
        status: "SKIPPED",
        error: "수신자 이메일이 없습니다",
      };
    }

    const priorityLabel =
      input.priority === "URGENT"
        ? "[긴급] "
        : input.priority === "HIGH"
          ? "[중요] "
          : "";

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #7c3aed; color: white; padding: 16px 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; font-size: 16px;">${priorityLabel}${input.title}</h2>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            ${input.message}
          </p>
          ${
            input.actionUrl
              ? `
            <a href="${input.actionUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500;">
              상세 보기
            </a>
          `
              : ""
          }
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">
            이 알림은 X2 Intelligence에서 자동으로 발송되었습니다.
          </p>
        </div>
      </div>
    `.trim();

    try {
      const res = await fetch(this.config.emailApiUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.emailApiKey}`,
        },
        body: JSON.stringify({
          from: this.config.emailFrom,
          to: [recipientEmail],
          subject: `${priorityLabel}${input.title}`,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          channel: "EMAIL",
          status: "FAILED",
          error: `Email API error ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      return {
        channel: "EMAIL",
        status: "SUCCESS",
        deliveredAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        channel: "EMAIL",
        status: "FAILED",
        error: `Email delivery failed: ${err instanceof Error ? err.message : "Unknown"}`,
      };
    }
  }

  // ─── Webhook Delivery ──────────────────────────────────────────

  private async deliverWebhook(input: DispatchInput): Promise<DeliveryResult> {
    const webhookUrl = input.webhookUrl ?? this.config.webhookUrl;
    if (!webhookUrl) {
      return {
        channel: "WEBHOOK",
        status: "PROVIDER_UNAVAILABLE",
        error: "NOTIFICATION_WEBHOOK_URL 환경변수가 설정되지 않았습니다",
      };
    }

    const payload = {
      event: "notification",
      timestamp: new Date().toISOString(),
      notification: {
        id: input.notificationId,
        title: input.title,
        message: input.message,
        priority: input.priority,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        actionUrl: input.actionUrl,
      },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "X2-Notification/1.0",
    };

    // HMAC signature for webhook verification
    if (this.config.webhookSecret) {
      const crypto = await import("crypto");
      const signature = crypto
        .createHmac("sha256", this.config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          channel: "WEBHOOK",
          status: "FAILED",
          error: `Webhook HTTP ${res.status}`,
        };
      }

      return {
        channel: "WEBHOOK",
        status: "SUCCESS",
        deliveredAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown";
      return {
        channel: "WEBHOOK",
        status: "FAILED",
        error: message.includes("abort")
          ? "Webhook timeout (10s)"
          : `Webhook failed: ${message}`,
      };
    }
  }
}
