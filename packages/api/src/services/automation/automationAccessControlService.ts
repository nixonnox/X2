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

export type PlanType = "FREE" | "PRO" | "BUSINESS";

export type PlanCapabilities = {
  maxRules: number;
  reportAuto: boolean;
  alertAuto: boolean;
  webhook: boolean;
  maxReportAutoPerMonth?: number;
  maxAlertPerDay?: number;
};

export type UsageQuotaResult = {
  allowed: boolean;
  current: number;
  limit: number;
  resetAt?: Date;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_CAPABILITIES: Record<PlanType, PlanCapabilities> = {
  FREE: {
    maxRules: 0,
    reportAuto: false,
    alertAuto: false,
    webhook: false,
  },
  PRO: {
    maxRules: 5,
    reportAuto: true,
    alertAuto: true,
    webhook: false,
    maxReportAutoPerMonth: 4,
    maxAlertPerDay: 10,
  },
  BUSINESS: {
    maxRules: 50,
    reportAuto: true,
    alertAuto: true,
    webhook: true,
    maxReportAutoPerMonth: 30,
    maxAlertPerDay: 100,
  },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AutomationAccessControlService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 워크스페이스가 새 자동화 규칙을 생성할 수 있는지 확인합니다 (플랜 한도 기준).
   */
  async canCreateRule(
    workspaceId: string,
    trace: TraceContext,
  ): Promise<
    ServiceResult<{ allowed: boolean; current: number; max: number }>
  > {
    try {
      const plan = await this.getWorkspacePlan(workspaceId);
      const capabilities = this.getPlanCapabilities(plan);

      if (capabilities.maxRules === 0) {
        this.logger.info("규칙 생성 불가 — 무료 플랜", {
          workspaceId,
          plan,
          requestId: trace.requestId,
        });
        return ok({ allowed: false, current: 0, max: 0 });
      }

      const currentCount = await this.countActiveRules(workspaceId);
      const allowed = currentCount < capabilities.maxRules;

      this.logger.info("규칙 생성 가능 여부 확인 완료", {
        workspaceId,
        plan,
        currentCount,
        maxRules: capabilities.maxRules,
        allowed,
        requestId: trace.requestId,
      });

      return ok({ allowed, current: currentCount, max: capabilities.maxRules });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("규칙 생성 권한 확인 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ACCESS_CHECK_FAILED");
    }
  }

  /**
   * 워크스페이스의 플랜이 해당 액션 타입 실행을 허용하는지 확인합니다.
   */
  async canExecuteAction(
    workspaceId: string,
    actionType: string,
    trace: TraceContext,
  ): Promise<ServiceResult<{ allowed: boolean; reason?: string }>> {
    try {
      const plan = await this.getWorkspacePlan(workspaceId);
      const capabilities = this.getPlanCapabilities(plan);

      // 플랜별 액션 허용 여부 확인
      let allowed = false;
      let reason: string | undefined;

      switch (actionType) {
        case "SEND_ALERT":
          allowed = capabilities.alertAuto;
          if (!allowed)
            reason = "현재 플랜에서 알림 자동화가 지원되지 않습니다";
          break;
        case "GENERATE_REPORT":
          allowed = capabilities.reportAuto;
          if (!allowed)
            reason = "현재 플랜에서 리포트 자동 생성이 지원되지 않습니다";
          break;
        case "WEBHOOK":
          allowed = capabilities.webhook;
          if (!allowed) reason = "현재 플랜에서 웹훅이 지원되지 않습니다";
          break;
        default:
          // 기본적으로 FREE 플랜이 아니면 허용
          allowed = plan !== "FREE";
          if (!allowed) reason = "무료 플랜에서는 자동화가 지원되지 않습니다";
          break;
      }

      this.logger.info("액션 실행 권한 확인 완료", {
        workspaceId,
        plan,
        actionType,
        allowed,
        requestId: trace.requestId,
      });

      return ok({ allowed, reason });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("액션 실행 권한 확인 실패", {
        workspaceId,
        actionType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ACTION_ACCESS_CHECK_FAILED");
    }
  }

  /**
   * 월간/일간 사용량 쿼터를 확인합니다.
   */
  async checkUsageQuota(
    workspaceId: string,
    actionType: string,
    trace: TraceContext,
  ): Promise<ServiceResult<UsageQuotaResult>> {
    try {
      const plan = await this.getWorkspacePlan(workspaceId);
      const capabilities = this.getPlanCapabilities(plan);

      let limit = 0;
      let periodKey = "";
      let periodStart: Date;
      const now = new Date();

      if (actionType === "GENERATE_REPORT") {
        limit = capabilities.maxReportAutoPerMonth ?? 0;
        periodKey = `report:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (actionType === "SEND_ALERT") {
        limit = capabilities.maxAlertPerDay ?? 0;
        periodKey = `alert:${now.toISOString().slice(0, 10)}`;
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
      } else {
        // 기타 액션은 제한 없음
        return ok({ allowed: true, current: 0, limit: 0 });
      }

      if (limit === 0) {
        return ok({ allowed: false, current: 0, limit: 0 });
      }

      const current = await this.getUsageCount(workspaceId, periodKey);
      const allowed = current < limit;

      // 다음 리셋 시간 계산
      let resetAt: Date | undefined;
      if (actionType === "GENERATE_REPORT") {
        resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      } else {
        resetAt = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
      }

      this.logger.info("사용량 쿼터 확인 완료", {
        workspaceId,
        actionType,
        current,
        limit,
        allowed,
        requestId: trace.requestId,
      });

      return ok({ allowed, current, limit, resetAt });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("사용량 쿼터 확인 실패", {
        workspaceId,
        actionType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "USAGE_QUOTA_CHECK_FAILED");
    }
  }

  /**
   * 사용량을 기록합니다 (빌링 연동).
   */
  async incrementUsage(
    workspaceId: string,
    actionType: string,
    trace: TraceContext,
  ): Promise<ServiceResult<{ recorded: boolean }>> {
    try {
      const now = new Date();
      let periodKey = "";

      if (actionType === "GENERATE_REPORT") {
        periodKey = `report:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      } else if (actionType === "SEND_ALERT") {
        periodKey = `alert:${now.toISOString().slice(0, 10)}`;
      } else {
        periodKey = `other:${now.toISOString().slice(0, 10)}`;
      }

      try {
        await (this.repositories as any).usage.increment?.({
          workspaceId,
          key: `automation:${periodKey}`,
          value: 1,
        });
      } catch {
        // 사용량 기록 실패는 무시 (비즈니스 로직 중단 방지)
      }

      this.logger.info("자동화 사용량 기록 완료", {
        workspaceId,
        actionType,
        periodKey,
        requestId: trace.requestId,
      });

      return ok({ recorded: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 사용량 기록 실패", {
        workspaceId,
        actionType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "USAGE_INCREMENT_FAILED");
    }
  }

  /**
   * 플랜별 자동화 기능 스펙을 반환합니다.
   */
  getPlanCapabilities(plan: PlanType | string): PlanCapabilities {
    return PLAN_CAPABILITIES[plan as PlanType] ?? PLAN_CAPABILITIES.FREE;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async getWorkspacePlan(workspaceId: string): Promise<PlanType> {
    const workspace = await this.repositories.workspace.findById(workspaceId);
    if (!workspace) {
      this.logger.error("워크스페이스를 찾을 수 없습니다", { workspaceId });
      throw new Error(`Workspace not found: ${workspaceId}`);
    }
    const plan = (workspace as any)?.plan as string;
    if (plan === "PRO" || plan === "BUSINESS") return plan;
    return "FREE";
  }

  private async countActiveRules(workspaceId: string): Promise<number> {
    try {
      const rules =
        (await (this.repositories as any).scheduledJob.findByWorkspace?.(
          workspaceId,
        )) ?? [];
      return Array.isArray(rules)
        ? rules.filter((r: any) => r.isEnabled !== false).length
        : 0;
    } catch {
      return 0;
    }
  }

  private async getUsageCount(
    workspaceId: string,
    periodKey: string,
  ): Promise<number> {
    try {
      const usage = await (this.repositories as any).usage.findByKey?.(
        workspaceId,
        `automation:${periodKey}`,
      );
      return (usage as any)?.value ?? 0;
    } catch {
      return 0;
    }
  }
}
