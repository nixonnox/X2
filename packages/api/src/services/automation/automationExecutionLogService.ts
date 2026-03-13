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

export type ExecutionStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type CreateExecutionInput = {
  ruleId: string;
  workspaceId: string;
  idempotencyKey: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
};

export type ExecutionRecord = {
  id: string;
  ruleId: string;
  workspaceId: string;
  idempotencyKey: string;
  triggerType: string;
  triggerPayload: Record<string, unknown>;
  status: ExecutionStatus;
  actionResult?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  retryCount: number;
  nextRetryAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ExecutionHistoryFilters = {
  status?: ExecutionStatus;
  triggerType?: string;
  ruleId?: string;
  page?: number;
  limit?: number;
};

export type ExecutionHistoryResult = {
  executions: ExecutionRecord[];
  total: number;
  page: number;
  limit: number;
};

export type ExecutionStats = {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  running: number;
  pending: number;
  averageDurationMs: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AutomationExecutionLogService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 새로운 자동화 실행 레코드를 생성합니다.
   */
  async createExecution(
    input: CreateExecutionInput,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionRecord>> {
    try {
      if (!input.ruleId || !input.workspaceId || !input.idempotencyKey) {
        return err(
          "필수 필드가 누락되었습니다 (ruleId, workspaceId, idempotencyKey)",
          "INVALID_INPUT",
        );
      }

      const execution: ExecutionRecord = {
        id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ruleId: input.ruleId,
        workspaceId: input.workspaceId,
        idempotencyKey: input.idempotencyKey,
        triggerType: input.triggerType,
        triggerPayload: input.triggerPayload,
        status: "PENDING",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        const saved = await (this.repositories as any).scheduledJob.create?.({
          ...execution,
          triggerPayload: JSON.stringify(execution.triggerPayload),
        });
        if (saved?.id) execution.id = saved.id;
      } catch {
        // DB 저장 실패 시 메모리 레코드 반환
      }

      this.logger.info("자동화 실행 레코드 생성 완료", {
        executionId: execution.id,
        ruleId: input.ruleId,
        idempotencyKey: input.idempotencyKey,
        requestId: trace.requestId,
      });

      return ok(execution);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 실행 레코드 생성 실패", {
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_CREATE_FAILED");
    }
  }

  /**
   * 실행 상태를 RUNNING으로 변경하고 시작 시간을 기록합니다.
   */
  async startExecution(
    executionId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionRecord>> {
    try {
      if (!executionId) {
        return err("executionId는 필수입니다", "INVALID_INPUT");
      }

      const execution = await this.findExecutionById(executionId);
      if (!execution) {
        return err("실행 레코드를 찾을 수 없습니다", "EXECUTION_NOT_FOUND");
      }

      execution.status = "RUNNING";
      execution.startedAt = new Date();
      execution.updatedAt = new Date();

      this.logger.info("자동화 실행 시작", {
        executionId,
        ruleId: execution.ruleId,
        requestId: trace.requestId,
      });

      return ok(execution);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 실행 시작 실패", {
        executionId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_START_FAILED");
    }
  }

  /**
   * 실행을 성공으로 완료합니다. 결과와 소요 시간을 기록하고 규칙 통계를 업데이트합니다.
   */
  async completeExecution(
    executionId: string,
    result: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionRecord>> {
    try {
      if (!executionId) {
        return err("executionId는 필수입니다", "INVALID_INPUT");
      }

      const execution = await this.findExecutionById(executionId);
      if (!execution) {
        return err("실행 레코드를 찾을 수 없습니다", "EXECUTION_NOT_FOUND");
      }

      const now = new Date();
      const durationMs = execution.startedAt
        ? now.getTime() - execution.startedAt.getTime()
        : 0;

      execution.status = "COMPLETED";
      execution.actionResult = result;
      execution.durationMs = durationMs;
      execution.completedAt = now;
      execution.updatedAt = now;

      // 규칙 통계 업데이트 (executionCount 증가, lastExecutedAt 갱신)
      await this.updateRuleStats(execution.ruleId, true);

      this.logger.info("자동화 실행 완료 (성공)", {
        executionId,
        ruleId: execution.ruleId,
        durationMs,
        requestId: trace.requestId,
      });

      return ok(execution);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 실행 완료 처리 실패", {
        executionId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_COMPLETE_FAILED");
    }
  }

  /**
   * 실행을 실패로 기록합니다. 재시도가 필요한 경우 다음 재시도 시간을 설정합니다.
   */
  async failExecution(
    executionId: string,
    error: string,
    shouldRetry: boolean,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionRecord>> {
    try {
      if (!executionId) {
        return err("executionId는 필수입니다", "INVALID_INPUT");
      }

      const execution = await this.findExecutionById(executionId);
      if (!execution) {
        return err("실행 레코드를 찾을 수 없습니다", "EXECUTION_NOT_FOUND");
      }

      const now = new Date();
      execution.status = "FAILED";
      execution.errorMessage = error;
      execution.updatedAt = now;

      if (shouldRetry && execution.retryCount < 3) {
        execution.retryCount++;
        // 지수 백오프: 5분, 15분, 60분
        const backoffMinutes = [5, 15, 60];
        const delayMinutes = backoffMinutes[execution.retryCount - 1] ?? 60;
        execution.nextRetryAt = new Date(
          now.getTime() + delayMinutes * 60 * 1000,
        );

        this.logger.info("자동화 실행 실패 — 재시도 예약됨", {
          executionId,
          retryCount: execution.retryCount,
          nextRetryAt: execution.nextRetryAt.toISOString(),
          requestId: trace.requestId,
        });
      } else {
        // 규칙 실패 통계 업데이트
        await this.updateRuleStats(execution.ruleId, false);

        this.logger.warn("자동화 실행 실패 — 재시도 불가", {
          executionId,
          retryCount: execution.retryCount,
          error,
          requestId: trace.requestId,
        });
      }

      return ok(execution);
    } catch (err2) {
      const message = err2 instanceof Error ? err2.message : "알 수 없는 오류";
      this.logger.error("자동화 실행 실패 처리 오류", {
        executionId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_FAIL_FAILED");
    }
  }

  /**
   * 실행을 건너뜀(SKIPPED)으로 기록합니다 (중복, 쿨다운, 플랜 제한 등).
   */
  async skipExecution(
    executionId: string,
    reason: string,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionRecord>> {
    try {
      if (!executionId) {
        return err("executionId는 필수입니다", "INVALID_INPUT");
      }

      const execution = await this.findExecutionById(executionId);
      if (!execution) {
        return err("실행 레코드를 찾을 수 없습니다", "EXECUTION_NOT_FOUND");
      }

      execution.status = "SKIPPED";
      execution.errorMessage = reason;
      execution.updatedAt = new Date();

      this.logger.info("자동화 실행 건너뜀", {
        executionId,
        reason,
        requestId: trace.requestId,
      });

      return ok(execution);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동화 실행 건너뜀 처리 실패", {
        executionId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_SKIP_FAILED");
    }
  }

  /**
   * 워크스페이스의 실행 이력을 페이지네이션과 필터로 조회합니다.
   */
  async getExecutionHistory(
    workspaceId: string,
    filters: ExecutionHistoryFilters,
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionHistoryResult>> {
    try {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;

      let executions: any[] = [];
      try {
        executions =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        executions = [];
      }

      // 필터 적용
      if (filters.status) {
        executions = executions.filter((e: any) => e.status === filters.status);
      }
      if (filters.triggerType) {
        executions = executions.filter(
          (e: any) => e.triggerType === filters.triggerType,
        );
      }
      if (filters.ruleId) {
        executions = executions.filter((e: any) => e.ruleId === filters.ruleId);
      }

      // 최신순 정렬
      executions.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt ?? 0).getTime();
        const dateB = new Date(b.createdAt ?? 0).getTime();
        return dateB - dateA;
      });

      const total = executions.length;
      const offset = (page - 1) * limit;
      const paged = executions.slice(offset, offset + limit);

      this.logger.info("실행 이력 조회 완료", {
        workspaceId,
        total,
        page,
        limit,
        requestId: trace.requestId,
      });

      return ok({ executions: paged, total, page, limit });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("실행 이력 조회 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_HISTORY_FAILED");
    }
  }

  /**
   * 워크스페이스의 실행 통계를 집계합니다.
   */
  async getExecutionStats(
    workspaceId: string,
    dateRange: { from: Date; to: Date },
    trace: TraceContext,
  ): Promise<ServiceResult<ExecutionStats>> {
    try {
      let executions: any[] = [];
      try {
        executions =
          (await (this.repositories as any).scheduledJob.findByWorkspace?.(
            workspaceId,
          )) ?? [];
      } catch {
        executions = [];
      }

      // 날짜 범위 필터
      const filtered = executions.filter((e: any) => {
        const created = new Date(e.createdAt ?? 0);
        return created >= dateRange.from && created <= dateRange.to;
      });

      const stats: ExecutionStats = {
        total: filtered.length,
        completed: filtered.filter((e: any) => e.status === "COMPLETED").length,
        failed: filtered.filter((e: any) => e.status === "FAILED").length,
        skipped: filtered.filter((e: any) => e.status === "SKIPPED").length,
        running: filtered.filter((e: any) => e.status === "RUNNING").length,
        pending: filtered.filter((e: any) => e.status === "PENDING").length,
        averageDurationMs: 0,
      };

      const completedWithDuration = filtered.filter(
        (e: any) => e.status === "COMPLETED" && e.durationMs != null,
      );
      if (completedWithDuration.length > 0) {
        const totalDuration = completedWithDuration.reduce(
          (sum: number, e: any) => sum + (e.durationMs ?? 0),
          0,
        );
        stats.averageDurationMs = Math.round(
          totalDuration / completedWithDuration.length,
        );
      }

      this.logger.info("실행 통계 조회 완료", {
        workspaceId,
        stats,
        requestId: trace.requestId,
      });

      return ok(stats);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("실행 통계 조회 실패", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_STATS_FAILED");
    }
  }

  /**
   * 지정된 일수보다 오래된 실행 레코드를 삭제합니다.
   */
  async cleanupOldExecutions(
    olderThanDays: number,
    trace: TraceContext,
  ): Promise<ServiceResult<{ deletedCount: number }>> {
    try {
      if (olderThanDays <= 0) {
        return err("olderThanDays는 양수여야 합니다", "INVALID_INPUT");
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;
      try {
        const result = await (
          this.repositories as any
        ).scheduledJob.deleteOlderThan?.(cutoffDate);
        deletedCount = result?.count ?? 0;
      } catch {
        deletedCount = 0;
      }

      this.logger.info("오래된 실행 레코드 정리 완료", {
        olderThanDays,
        cutoffDate: cutoffDate.toISOString(),
        deletedCount,
        requestId: trace.requestId,
      });

      return ok({ deletedCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("실행 레코드 정리 실패", {
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "EXECUTION_CLEANUP_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async findExecutionById(
    executionId: string,
  ): Promise<ExecutionRecord | null> {
    try {
      const record = await (this.repositories as any).scheduledJob.findById?.(
        executionId,
      );
      return record ?? null;
    } catch {
      return null;
    }
  }

  private async updateRuleStats(
    ruleId: string,
    success: boolean,
  ): Promise<void> {
    try {
      if (success) {
        await (this.repositories as any).scheduledJob.incrementExecutionCount?.(
          ruleId,
        );
      } else {
        await (this.repositories as any).scheduledJob.incrementFailureCount?.(
          ruleId,
        );
      }
    } catch {
      // 통계 업데이트 실패는 무시
    }
  }
}
