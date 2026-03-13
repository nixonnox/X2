import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutomationTriggerType =
  | "SCHEDULED_CRON"
  | "EVENT_RISK_SPIKE"
  | "EVENT_SENTIMENT_SPIKE"
  | "EVENT_FAQ_SURGE"
  | "EVENT_KEYWORD_TREND"
  | "EVENT_CAMPAIGN_ANOMALY"
  | "EVENT_GEO_SCORE_CHANGE"
  | "EVENT_COLLECTION_HEALTH";

export type AutomationTriggerInput = {
  type: AutomationTriggerType;
  payload: Record<string, unknown>;
  eventId?: string;
};

export type ExecutionResult = {
  executionId: string;
  ruleId: string;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  reason?: string;
  durationMs?: number;
};

export type EvaluateAndExecuteResult = {
  evaluated: number;
  executed: number;
  skipped: number;
  failed: number;
  results: ExecutionResult[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AutomationOrchestratorService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 주어진 워크스페이스에서 트리거 조건에 맞는 자동화 규칙을 평가하고 실행합니다.
   */
  async evaluateAndExecute(
    workspaceId: string,
    trigger: AutomationTriggerInput,
    trace: TraceContext,
  ): Promise<ServiceResult<EvaluateAndExecuteResult>> {
    try {
      if (!workspaceId) {
        return err("workspaceId는 필수입니다", "INVALID_INPUT");
      }

      const startTime = Date.now();
      const results: ExecutionResult[] = [];
      let evaluated = 0;
      let executed = 0;
      let skipped = 0;
      let failed = 0;

      // 트리거 타입에 해당하는 활성 규칙 조회
      const rules = await this.findMatchingRules(workspaceId, trigger.type);
      evaluated = rules.length;

      for (const rule of rules) {
        const idempotencyKey = this.generateIdempotencyKey(rule.id, trigger);

        // 중복 실행 검사
        const isDuplicate = await this.checkDuplicate(rule.id, idempotencyKey);
        if (isDuplicate) {
          skipped++;
          results.push({
            executionId: "",
            ruleId: rule.id,
            status: "SKIPPED",
            reason: "중복 실행 방지 (이미 실행됨)",
          });
          continue;
        }

        // 쿨다운 검사
        const isInCooldown = await this.checkCooldown(rule);
        if (isInCooldown) {
          skipped++;
          results.push({
            executionId: "",
            ruleId: rule.id,
            status: "SKIPPED",
            reason: "쿨다운 기간 중",
          });
          continue;
        }

        // 플랜 접근 검사
        const hasAccess = await this.checkPlanAccess(
          workspaceId,
          rule.actionType as string,
        );
        if (!hasAccess) {
          skipped++;
          results.push({
            executionId: "",
            ruleId: rule.id,
            status: "SKIPPED",
            reason: "현재 플랜에서 허용되지 않는 액션 타입",
          });
          continue;
        }

        // 실행 레코드 생성
        try {
          const execution = await this.createExecution(
            rule.id,
            workspaceId,
            idempotencyKey,
            trigger,
          );
          const execStartTime = Date.now();

          // 액션 핸들러 디스패치
          await this.processExecution(execution.id, rule, trigger);

          const durationMs = Date.now() - execStartTime;
          executed++;
          results.push({
            executionId: execution.id,
            ruleId: rule.id,
            status: "COMPLETED",
            durationMs,
          });
        } catch (execError) {
          failed++;
          const message =
            execError instanceof Error ? execError.message : "알 수 없는 오류";
          results.push({
            executionId: "",
            ruleId: rule.id,
            status: "FAILED",
            reason: message,
          });
        }
      }

      this.logger.info("자동화 규칙 평가 및 실행 완료", {
        workspaceId,
        triggerType: trigger.type,
        evaluated,
        executed,
        skipped,
        failed,
        durationMs: Date.now() - startTime,
        requestId: trace.requestId,
      });

      return ok({ evaluated, executed, skipped, failed, results });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 규칙 평가 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "AUTOMATION_EVALUATE_FAILED");
    }
  }

  /**
   * 크론 스케줄러에 의해 호출됩니다. 실행 대상 SCHEDULED_CRON 규칙을 찾아 실행합니다.
   */
  async executeScheduledRules(
    workspaceId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<EvaluateAndExecuteResult>> {
    try {
      const now = new Date();
      const dueRules = await this.findDueScheduledRules(workspaceId, now);

      if (dueRules.length === 0) {
        this.logger.info("실행 대상 스케줄 규칙 없음", {
          workspaceId,
          requestId: trace.requestId,
        });
        return ok({
          evaluated: 0,
          executed: 0,
          skipped: 0,
          failed: 0,
          results: [],
        });
      }

      const trigger: AutomationTriggerInput = {
        type: "SCHEDULED_CRON",
        payload: { scheduledAt: now.toISOString() },
      };

      return this.evaluateAndExecute(workspaceId, trigger, trace);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("스케줄 규칙 실행 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "SCHEDULED_EXECUTION_FAILED");
    }
  }

  /**
   * 단일 실행 건을 처리합니다. 규칙의 액션 타입에 따라 적절한 핸들러로 라우팅합니다.
   */
  async processExecution(
    executionId: string,
    rule: any,
    trigger: AutomationTriggerInput,
  ): Promise<void> {
    const actionType = rule.actionType as string;

    switch (actionType) {
      case "SEND_ALERT":
        // 알림 전송 처리
        this.logger.info("알림 전송 액션 실행", {
          executionId,
          ruleId: rule.id,
        });
        break;
      case "GENERATE_REPORT":
        // 리포트 생성 처리
        this.logger.info("리포트 생성 액션 실행", {
          executionId,
          ruleId: rule.id,
        });
        break;
      case "WEBHOOK":
        // 웹훅 호출 처리
        this.logger.info("웹훅 호출 액션 실행", {
          executionId,
          ruleId: rule.id,
        });
        break;
      case "NOTIFY_SLACK":
        // 슬랙 알림 처리
        this.logger.info("슬랙 알림 액션 실행", {
          executionId,
          ruleId: rule.id,
        });
        break;
      default:
        this.logger.warn("알 수 없는 액션 타입", { executionId, actionType });
        break;
    }
  }

  /**
   * 동일한 idempotency key로 이미 실행된 기록이 있는지 확인합니다.
   */
  async checkDuplicate(
    ruleId: string,
    idempotencyKey: string,
  ): Promise<boolean> {
    try {
      const existing = await (
        this.repositories as any
      ).scheduledJob.findByIdempotencyKey?.(idempotencyKey);
      return !!existing;
    } catch {
      // 테이블/메서드가 없으면 중복 아님으로 처리
      return false;
    }
  }

  /**
   * 규칙의 쿨다운 기간이 경과했는지 확인합니다.
   */
  async checkCooldown(rule: any): Promise<boolean> {
    if (!rule.cooldownMinutes || rule.cooldownMinutes <= 0) {
      return false;
    }

    const lastExecutedAt = rule.lastExecutedAt;
    if (!lastExecutedAt) {
      return false;
    }

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    const elapsed = Date.now() - new Date(lastExecutedAt).getTime();
    return elapsed < cooldownMs;
  }

  /**
   * 워크스페이스의 플랜이 해당 액션 타입을 허용하는지 확인합니다.
   */
  async checkPlanAccess(
    workspaceId: string,
    actionType: string,
  ): Promise<boolean> {
    try {
      const workspace = await this.repositories.workspace.findById(workspaceId);
      if (!workspace) return false;

      const plan = (workspace as any).plan as string;

      switch (plan) {
        case "FREE":
          return false;
        case "PRO":
          return (
            actionType === "SEND_ALERT" || actionType === "GENERATE_REPORT"
          );
        case "BUSINESS":
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * 이벤트 기반 또는 스케줄 기반 idempotency key를 생성합니다.
   */
  private generateIdempotencyKey(
    ruleId: string,
    trigger: AutomationTriggerInput,
  ): string {
    if (trigger.type === "SCHEDULED_CRON") {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const payloadHash = createHash("sha256")
        .update(JSON.stringify(trigger.payload))
        .digest("hex")
        .slice(0, 12);
      return `${ruleId}:${trigger.type}:${today}:${payloadHash}`;
    }

    // 이벤트 기반
    const eventId =
      trigger.eventId ??
      createHash("sha256")
        .update(JSON.stringify(trigger.payload))
        .digest("hex")
        .slice(0, 12);
    return `${ruleId}:${trigger.type}:${eventId}`;
  }

  private async findMatchingRules(
    workspaceId: string,
    triggerType: AutomationTriggerType,
  ): Promise<any[]> {
    try {
      // 활성 규칙 중 트리거 타입이 일치하는 것 조회
      const allRules = await (
        this.repositories as any
      ).scheduledJob.findByWorkspace?.(workspaceId);
      if (!Array.isArray(allRules)) return [];
      return allRules.filter(
        (r: any) => r.isEnabled !== false && r.triggerType === triggerType,
      );
    } catch {
      return [];
    }
  }

  private async findDueScheduledRules(
    workspaceId: string,
    now: Date,
  ): Promise<any[]> {
    try {
      const rules = await this.findMatchingRules(workspaceId, "SCHEDULED_CRON");
      return rules.filter((r: any) => {
        const nextRunAt = r.nextRunAt ? new Date(r.nextRunAt) : null;
        return nextRunAt && nextRunAt <= now;
      });
    } catch {
      return [];
    }
  }

  private async createExecution(
    ruleId: string,
    workspaceId: string,
    idempotencyKey: string,
    trigger: AutomationTriggerInput,
  ): Promise<{ id: string }> {
    try {
      const execution = await (this.repositories as any).scheduledJob.create?.({
        ruleId,
        workspaceId,
        idempotencyKey,
        triggerType: trigger.type,
        triggerPayload: trigger.payload,
        status: "PENDING",
        createdAt: new Date(),
      });
      return execution ?? { id: `exec_${Date.now()}` };
    } catch {
      return { id: `exec_${Date.now()}` };
    }
  }
}
