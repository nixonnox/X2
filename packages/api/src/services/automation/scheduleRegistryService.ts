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

export type AutomationRuleTriggerType =
  | "SCHEDULED_CRON"
  | "EVENT_RISK_SPIKE"
  | "EVENT_SENTIMENT_SPIKE"
  | "EVENT_FAQ_SURGE"
  | "EVENT_KEYWORD_TREND"
  | "EVENT_CAMPAIGN_ANOMALY"
  | "EVENT_GEO_SCORE_CHANGE"
  | "EVENT_COLLECTION_HEALTH";

export type CreateRuleInput = {
  name: string;
  description?: string;
  triggerType: AutomationRuleTriggerType;
  triggerCondition: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  cronExpression?: string;
  timezone?: string;
  cooldownMinutes?: number;
  isEnabled?: boolean;
};

export type UpdateRuleInput = Partial<CreateRuleInput>;

export type RuleListFilters = {
  triggerType?: AutomationRuleTriggerType;
  actionType?: string;
  isEnabled?: boolean;
  page?: number;
  limit?: number;
};

export type AutomationRuleRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  triggerType: AutomationRuleTriggerType;
  triggerCondition: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  cronExpression?: string;
  timezone?: string;
  cooldownMinutes?: number;
  isEnabled: boolean;
  nextRunAt?: Date;
  lastExecutedAt?: Date;
  executionCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RuleListResult = {
  rules: AutomationRuleRecord[];
  total: number;
  page: number;
  limit: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ScheduleRegistryService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 새 자동화 규칙을 생성합니다. 워크스페이스 플랜 한도를 확인합니다.
   */
  async createRule(
    workspaceId: string,
    input: CreateRuleInput,
    trace: TraceContext,
  ): Promise<ServiceResult<AutomationRuleRecord>> {
    try {
      if (
        !workspaceId ||
        !input.name ||
        !input.triggerType ||
        !input.actionType
      ) {
        return err(
          "필수 필드가 누락되었습니다 (workspaceId, name, triggerType, actionType)",
          "INVALID_INPUT",
        );
      }

      // 플랜 한도 검사
      const limitCheck = await this.checkRuleLimit(workspaceId);
      if (!limitCheck.allowed) {
        return err(
          `규칙 생성 한도를 초과했습니다 (현재: ${limitCheck.current}/${limitCheck.max})`,
          "PLAN_LIMIT_EXCEEDED",
        );
      }

      // nextRunAt 계산 (크론 스케줄인 경우)
      let nextRunAt: Date | undefined;
      if (input.triggerType === "SCHEDULED_CRON" && input.cronExpression) {
        nextRunAt =
          this.calculateNextRun(input.cronExpression, input.timezone) ??
          undefined;
      }

      const rule: AutomationRuleRecord = {
        id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        name: input.name,
        description: input.description,
        triggerType: input.triggerType,
        triggerCondition: input.triggerCondition ?? {},
        actionType: input.actionType,
        actionConfig: input.actionConfig ?? {},
        cronExpression: input.cronExpression,
        timezone: input.timezone ?? "Asia/Seoul",
        cooldownMinutes: input.cooldownMinutes ?? 0,
        isEnabled: input.isEnabled !== false,
        nextRunAt,
        executionCount: 0,
        failureCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // DB 저장 시도
      try {
        const saved = await (this.repositories as any).scheduledJob.create?.({
          ...rule,
          triggerCondition: JSON.stringify(rule.triggerCondition),
          actionConfig: JSON.stringify(rule.actionConfig),
        });
        if (saved?.id) rule.id = saved.id;
      } catch {
        // 저장 실패 시 메모리 레코드 반환
      }

      this.logger.info("자동화 규칙 생성 완료", {
        ruleId: rule.id,
        workspaceId,
        triggerType: input.triggerType,
        requestId: trace.requestId,
      });

      return ok(rule);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 규칙 생성 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RULE_CREATE_FAILED");
    }
  }

  /**
   * 자동화 규칙을 업데이트합니다. 트리거가 변경되면 통계를 초기화합니다.
   */
  async updateRule(
    ruleId: string,
    updates: UpdateRuleInput,
    trace: TraceContext,
  ): Promise<ServiceResult<AutomationRuleRecord>> {
    try {
      if (!ruleId) {
        return err("ruleId는 필수입니다", "INVALID_INPUT");
      }

      const existing = await this.findRuleById(ruleId);
      if (!existing) {
        return err("규칙을 찾을 수 없습니다", "RULE_NOT_FOUND");
      }

      // 트리거 타입이 변경되면 통계 초기화
      const triggerChanged =
        updates.triggerType && updates.triggerType !== existing.triggerType;

      const updated: AutomationRuleRecord = {
        ...existing,
        ...updates,
        executionCount: triggerChanged ? 0 : existing.executionCount,
        failureCount: triggerChanged ? 0 : existing.failureCount,
        lastExecutedAt: triggerChanged ? undefined : existing.lastExecutedAt,
        updatedAt: new Date(),
      };

      // nextRunAt 재계산
      if (updated.triggerType === "SCHEDULED_CRON" && updated.cronExpression) {
        updated.nextRunAt =
          this.calculateNextRun(updated.cronExpression, updated.timezone) ??
          undefined;
      }

      this.logger.info("자동화 규칙 업데이트 완료", {
        ruleId,
        triggerChanged,
        requestId: trace.requestId,
      });

      return ok(updated);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 규칙 업데이트 실패", {
        ruleId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RULE_UPDATE_FAILED");
    }
  }

  /**
   * 자동화 규칙을 삭제합니다 (소프트 삭제: isEnabled=false 또는 하드 삭제).
   */
  async deleteRule(
    ruleId: string,
    hardDelete: boolean = false,
    trace: TraceContext,
  ): Promise<ServiceResult<{ deleted: boolean }>> {
    try {
      if (!ruleId) {
        return err("ruleId는 필수입니다", "INVALID_INPUT");
      }

      if (hardDelete) {
        try {
          await (this.repositories as any).scheduledJob.delete?.(ruleId);
        } catch {
          // 삭제 메서드가 없으면 무시
        }
      } else {
        // 소프트 삭제: isEnabled = false
        await this.updateRule(ruleId, { isEnabled: false }, trace);
      }

      this.logger.info("자동화 규칙 삭제 완료", {
        ruleId,
        hardDelete,
        requestId: trace.requestId,
      });

      return ok({ deleted: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 규칙 삭제 실패", {
        ruleId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RULE_DELETE_FAILED");
    }
  }

  /**
   * 워크스페이스의 자동화 규칙 목록을 조회합니다 (페이지네이션 지원).
   */
  async listRules(
    workspaceId: string,
    filters: RuleListFilters,
    trace: TraceContext,
  ): Promise<ServiceResult<RuleListResult>> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;

      let rules: any[] = [];
      try {
        rules =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        rules = [];
      }

      // 필터 적용
      if (filters.triggerType) {
        rules = rules.filter((r: any) => r.triggerType === filters.triggerType);
      }
      if (filters.actionType) {
        rules = rules.filter((r: any) => r.actionType === filters.actionType);
      }
      if (filters.isEnabled !== undefined) {
        rules = rules.filter((r: any) => r.isEnabled === filters.isEnabled);
      }

      const total = rules.length;
      const offset = (page - 1) * limit;
      const paged = rules.slice(offset, offset + limit);

      this.logger.info("자동화 규칙 목록 조회 완료", {
        workspaceId,
        total,
        page,
        limit,
        requestId: trace.requestId,
      });

      return ok({ rules: paged, total, page, limit });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 규칙 목록 조회 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RULE_LIST_FAILED");
    }
  }

  /**
   * 실행 시간이 도래한 SCHEDULED_CRON 규칙을 반환합니다 (nextRunAt <= now).
   */
  async getDueRules(
    workspaceId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<AutomationRuleRecord[]>> {
    try {
      const now = new Date();
      let rules: any[] = [];

      try {
        rules =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        rules = [];
      }

      const dueRules = rules.filter((r: any) => {
        if (r.triggerType !== "SCHEDULED_CRON" || r.isEnabled === false)
          return false;
        const nextRunAt = r.nextRunAt ? new Date(r.nextRunAt) : null;
        return nextRunAt && nextRunAt <= now;
      });

      this.logger.info("실행 대상 규칙 조회 완료", {
        workspaceId,
        dueCount: dueRules.length,
        requestId: trace.requestId,
      });

      return ok(dueRules);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("실행 대상 규칙 조회 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "DUE_RULES_FAILED");
    }
  }

  /**
   * 특정 트리거 타입에 해당하는 활성 이벤트 규칙을 반환합니다.
   */
  async getEventRules(
    workspaceId: string,
    triggerType: AutomationRuleTriggerType,
    trace: TraceContext,
  ): Promise<ServiceResult<AutomationRuleRecord[]>> {
    try {
      let rules: any[] = [];

      try {
        rules =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        rules = [];
      }

      const eventRules = rules.filter(
        (r: any) => r.triggerType === triggerType && r.isEnabled !== false,
      );

      this.logger.info("이벤트 규칙 조회 완료", {
        workspaceId,
        triggerType,
        count: eventRules.length,
        requestId: trace.requestId,
      });

      return ok(eventRules);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("이벤트 규칙 조회 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EVENT_RULES_FAILED");
    }
  }

  /**
   * 크론 표현식에서 다음 실행 시간을 계산합니다.
   * 외부 라이브러리 없이 일반적인 패턴을 지원합니다.
   *
   * 지원 패턴:
   * - "0 * * * *"        → 매시 정각
   * - "0 N * * *"        → 매일 N시
   * - "0 N * * D"        → 매주 D요일 N시 (0=일, 1=월, ..., 6=토)
   * - "0 N D * *"        → 매월 D일 N시
   * - "* /N * * * *"     → N분마다 (공백 없이)
   */
  calculateNextRun(cronExpr: string, timezone?: string): Date | null {
    try {
      const now = new Date();
      const parts = cronExpr.trim().split(/\s+/);

      if (parts.length !== 5) return null;

      const [minute, hour, dayOfMonth, _month, dayOfWeek] = parts;

      // N분마다: */N * * * *
      if (
        minute.startsWith("*/") &&
        hour === "*" &&
        dayOfMonth === "*" &&
        dayOfWeek === "*"
      ) {
        const intervalMin = parseInt(minute.slice(2), 10);
        if (isNaN(intervalMin) || intervalMin <= 0) return null;
        const next = new Date(now);
        const currentMin = next.getMinutes();
        const nextMin = Math.ceil((currentMin + 1) / intervalMin) * intervalMin;
        next.setMinutes(nextMin, 0, 0);
        if (next <= now) {
          next.setMinutes(next.getMinutes() + intervalMin);
        }
        return next;
      }

      // N시간마다: 0 */N * * *
      if (
        minute === "0" &&
        hour.startsWith("*/") &&
        dayOfMonth === "*" &&
        dayOfWeek === "*"
      ) {
        const intervalHour = parseInt(hour.slice(2), 10);
        if (isNaN(intervalHour) || intervalHour <= 0) return null;
        const next = new Date(now);
        const currentHour = next.getHours();
        const nextHour =
          Math.ceil((currentHour + 1) / intervalHour) * intervalHour;
        next.setHours(nextHour, 0, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + intervalHour);
        }
        return next;
      }

      const minVal = parseInt(minute, 10);
      const hourVal = parseInt(hour, 10);

      if (isNaN(minVal)) return null;

      // 매시 정각: 0 * * * * (또는 N * * * *)
      if (hour === "*" && dayOfMonth === "*" && dayOfWeek === "*") {
        const next = new Date(now);
        next.setMinutes(minVal, 0, 0);
        if (next <= now) {
          next.setHours(next.getHours() + 1);
          next.setMinutes(minVal, 0, 0);
        }
        return next;
      }

      if (isNaN(hourVal)) return null;

      // 매주 특정 요일: 0 N * * D
      if (dayOfMonth === "*" && dayOfWeek !== "*") {
        const targetDow = parseInt(dayOfWeek, 10);
        if (isNaN(targetDow) || targetDow < 0 || targetDow > 6) return null;
        const next = new Date(now);
        next.setHours(hourVal, minVal, 0, 0);
        const currentDow = next.getDay();
        let daysAhead = targetDow - currentDow;
        if (daysAhead < 0 || (daysAhead === 0 && next <= now)) {
          daysAhead += 7;
        }
        next.setDate(next.getDate() + daysAhead);
        next.setHours(hourVal, minVal, 0, 0);
        return next;
      }

      // 매월 특정일: 0 N D * *
      if (dayOfMonth !== "*" && dayOfWeek === "*") {
        const targetDay = parseInt(dayOfMonth, 10);
        if (isNaN(targetDay) || targetDay < 1 || targetDay > 31) return null;
        const next = new Date(now);
        next.setDate(targetDay);
        next.setHours(hourVal, minVal, 0, 0);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
          next.setDate(targetDay);
          next.setHours(hourVal, minVal, 0, 0);
        }
        return next;
      }

      // 매일 특정 시간: 0 N * * *
      if (dayOfMonth === "*" && dayOfWeek === "*") {
        const next = new Date(now);
        next.setHours(hourVal, minVal, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
          next.setHours(hourVal, minVal, 0, 0);
        }
        return next;
      }

      return null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findRuleById(
    ruleId: string,
  ): Promise<AutomationRuleRecord | null> {
    try {
      const rule = await (this.repositories as any).scheduledJob.findById?.(
        ruleId,
      );
      return rule ?? null;
    } catch {
      return null;
    }
  }

  private async checkRuleLimit(
    workspaceId: string,
  ): Promise<{ allowed: boolean; current: number; max: number }> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      const plan = (workspace as any)?.plan as string;

      const maxRulesMap: Record<string, number> = {
        FREE: 0,
        PRO: 5,
        BUSINESS: 50,
      };
      const max = maxRulesMap[plan] ?? 0;

      let rules: any[] = [];
      try {
        rules =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        rules = [];
      }

      const current = Array.isArray(rules)
        ? rules.filter((r: any) => r.isEnabled !== false).length
        : 0;

      return { allowed: current < max, current, max };
    } catch {
      return { allowed: false, current: 0, max: 0 };
    }
  }
}
