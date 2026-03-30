import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeliveryChannel = "IN_APP" | "EMAIL" | "WEBHOOK";
export type DeliveryStatus = "PENDING" | "DELIVERED" | "FAILED";

export type DeliveryLogRecord = {
  id: string;
  executionId: string;
  channel: DeliveryChannel;
  recipientId: string;
  recipientAddress?: string;
  status: DeliveryStatus;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDeliveryInput = {
  executionId: string;
  channel: DeliveryChannel;
  recipientId: string;
  recipientAddress?: string;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class DeliveryRetryService {
  /** 지수 백오프 간격 (분): 5분, 15분, 60분 */
  private static readonly BACKOFF_MINUTES = [5, 15, 60];
  private static readonly MAX_RETRIES = 3;

  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 배달 로그를 생성합니다.
   */
  async createDelivery(
    input: CreateDeliveryInput,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    try {
      if (!input.executionId || !input.channel || !input.recipientId) {
        return err(
          "필수 필드가 누락되었습니다 (executionId, channel, recipientId)",
          "INVALID_INPUT",
        );
      }

      // 중복 배달 방지
      const isDuplicate = await this.checkDuplicateDelivery(
        input.executionId,
        input.channel,
        input.recipientId,
      );
      if (isDuplicate) {
        return err("이미 동일한 배달이 존재합니다", "DUPLICATE_DELIVERY");
      }

      const delivery: DeliveryLogRecord = {
        id: `dlv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        executionId: input.executionId,
        channel: input.channel,
        recipientId: input.recipientId,
        recipientAddress: input.recipientAddress,
        status: "PENDING",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.logger.info("배달 로그 생성 완료", {
        deliveryId: delivery.id,
        executionId: input.executionId,
        channel: input.channel,
        recipientId: input.recipientId,
        requestId: trace.requestId,
      });

      return ok(delivery);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("배달 로그 생성 실패", {
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "DELIVERY_CREATE_FAILED");
    }
  }

  /**
   * 배달을 시도합니다 (채널에 따라 인앱 알림, 이메일, 웹훅).
   */
  async processDelivery(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    try {
      switch (delivery.channel) {
        case "IN_APP":
          return this.processInAppDelivery(deliveryId, delivery, trace);
        case "EMAIL":
          return this.processEmailDelivery(deliveryId, delivery, trace);
        case "WEBHOOK":
          return this.processWebhookDelivery(deliveryId, delivery, trace);
        default:
          return err(
            `지원되지 않는 배달 채널: ${delivery.channel}`,
            "UNSUPPORTED_CHANNEL",
          );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("배달 처리 실패", {
        deliveryId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "DELIVERY_PROCESS_FAILED");
    }
  }

  /**
   * 실패한 배달 중 재시도 가능한 것을 찾아 재시도합니다.
   * (retryCount < 3 && nextRetryAt <= now)
   */
  async retryFailedDeliveries(
    trace: TraceContext,
  ): Promise<ServiceResult<{ retried: number; failed: number }>> {
    try {
      const now = new Date();
      let failedDeliveries: DeliveryLogRecord[] = [];

      try {
        const all =
          (await (
            this.repositories as any
          ).notification.findFailedDeliveries?.()) ?? [];
        failedDeliveries = all.filter((d: any) => {
          if (d.status !== "FAILED") return false;
          if ((d.retryCount ?? 0) >= DeliveryRetryService.MAX_RETRIES)
            return false;
          const nextRetryAt = d.nextRetryAt ? new Date(d.nextRetryAt) : null;
          return nextRetryAt && nextRetryAt <= now;
        });
      } catch {
        failedDeliveries = [];
      }

      let retried = 0;
      let failed = 0;

      for (const delivery of failedDeliveries) {
        const result = await this.processDelivery(delivery.id, delivery, trace);
        if (result.success) {
          retried++;
        } else {
          failed++;
        }
      }

      this.logger.info("실패 배달 재시도 완료", {
        retried,
        failed,
        total: failedDeliveries.length,
        requestId: trace.requestId,
      });

      return ok({ retried, failed });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("실패 배달 재시도 처리 오류", {
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RETRY_FAILED_DELIVERIES_ERROR");
    }
  }

  /**
   * 배달 성공으로 표시합니다.
   */
  async markDelivered(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    try {
      delivery.status = "DELIVERED";
      delivery.deliveredAt = new Date();
      delivery.updatedAt = new Date();

      this.logger.info("배달 성공 처리 완료", {
        deliveryId,
        channel: delivery.channel,
        recipientId: delivery.recipientId,
        requestId: trace.requestId,
      });

      return ok(delivery);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("배달 성공 처리 실패", {
        deliveryId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "MARK_DELIVERED_FAILED");
    }
  }

  /**
   * 배달 실패로 표시하고 재시도를 예약합니다 (지수 백오프: 5분, 15분, 60분).
   */
  async markFailed(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    errorMessage: string,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    try {
      const now = new Date();
      delivery.status = "FAILED";
      delivery.errorMessage = errorMessage;
      delivery.retryCount++;
      delivery.updatedAt = now;

      if (delivery.retryCount < DeliveryRetryService.MAX_RETRIES) {
        const delayMinutes =
          DeliveryRetryService.BACKOFF_MINUTES[delivery.retryCount - 1] ?? 60;
        delivery.nextRetryAt = new Date(
          now.getTime() + delayMinutes * 60 * 1000,
        );

        this.logger.info("배달 실패 — 재시도 예약됨", {
          deliveryId,
          retryCount: delivery.retryCount,
          nextRetryAt: delivery.nextRetryAt.toISOString(),
          requestId: trace.requestId,
        });
      } else {
        this.logger.warn("배달 실패 — 최대 재시도 횟수 초과", {
          deliveryId,
          retryCount: delivery.retryCount,
          errorMessage,
          requestId: trace.requestId,
        });
      }

      return ok(delivery);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("배달 실패 처리 오류", {
        deliveryId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "MARK_FAILED_ERROR");
    }
  }

  /**
   * 특정 실행 건의 모든 배달 로그를 조회합니다.
   */
  async getDeliveryStatus(
    executionId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord[]>> {
    try {
      let deliveries: DeliveryLogRecord[] = [];

      try {
        deliveries =
          (await (this.repositories as any).notification.findByExecutionId?.(
            executionId,
          )) ?? [];
      } catch {
        deliveries = [];
      }

      this.logger.info("배달 상태 조회 완료", {
        executionId,
        deliveryCount: deliveries.length,
        requestId: trace.requestId,
      });

      return ok(deliveries);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("배달 상태 조회 실패", {
        executionId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "DELIVERY_STATUS_FAILED");
    }
  }

  /**
   * 동일한 실행/채널/수신자 조합에 이미 배달이 존재하는지 확인합니다.
   */
  async checkDuplicateDelivery(
    executionId: string,
    channel: DeliveryChannel,
    recipientId: string,
  ): Promise<boolean> {
    try {
      const deliveries =
        (await (this.repositories as any).notification.findByExecutionId?.(
          executionId,
        )) ?? [];
      return (
        Array.isArray(deliveries) &&
        deliveries.some(
          (d: any) => d.channel === channel && d.recipientId === recipientId,
        )
      );
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers — 채널별 배달 처리
  // ---------------------------------------------------------------------------

  private async processInAppDelivery(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    try {
      // 인앱 알림 생성
      await this.repositories.notification.create({
        user: { connect: { id: delivery.recipientId } },
        type: "SYSTEM_ALERT" as any,
        title: "자동화 알림",
        message: `자동화 실행 결과가 전달되었습니다 (실행 ID: ${delivery.executionId})`,
        channels: ["IN_APP"],
        isRead: false,
      });

      return this.markDelivered(deliveryId, delivery, trace);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "인앱 알림 생성 실패";
      return this.markFailed(deliveryId, delivery, message, trace);
    }
  }

  private async processEmailDelivery(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    // 이메일 전송 플레이스홀더 — 실제 이메일 서비스 연동 시 구현
    this.logger.info("이메일 배달 처리 (플레이스홀더)", {
      deliveryId,
      recipientId: delivery.recipientId,
      recipientAddress: delivery.recipientAddress,
      requestId: trace.requestId,
    });

    // 현재는 성공으로 처리
    return this.markDelivered(deliveryId, delivery, trace);
  }

  private async processWebhookDelivery(
    deliveryId: string,
    delivery: DeliveryLogRecord,
    trace: TraceContext,
  ): Promise<ServiceResult<DeliveryLogRecord>> {
    // 웹훅 호출 플레이스홀더 — 실제 HTTP 클라이언트 연동 시 구현
    this.logger.info("웹훅 배달 처리 (플레이스홀더)", {
      deliveryId,
      recipientAddress: delivery.recipientAddress,
      requestId: trace.requestId,
    });

    // 현재는 성공으로 처리
    return this.markDelivered(deliveryId, delivery, trace);
  }
}
