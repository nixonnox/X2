// ─────────────────────────────────────────────────────────────
// AI Usage Logger — 인메모리 사용량 로깅 서비스
// ─────────────────────────────────────────────────────────────

import type {
  AiUsageLog,
  AiUsageStats,
  AiCostEstimate,
  AiTaskType,
  AiProviderType,
  AiExecutionStatus,
} from "../types";

class AiUsageLogService {
  private logs: AiUsageLog[] = [];
  private readonly maxLogs = 10_000;

  /** 새 사용량 로그 항목 기록 */
  log(entry: Omit<AiUsageLog, "id" | "createdAt">): AiUsageLog {
    const record: AiUsageLog = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    this.logs.push(record);

    // FIFO: 최대 보관 수 초과 시 오래된 로그 제거
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }

    return record;
  }

  /** 집계 통계 조회 */
  getStats(workspaceId?: string): AiUsageStats {
    const filtered = workspaceId
      ? this.logs.filter((l) => l.workspaceId === workspaceId)
      : this.logs;

    const successCount = filtered.filter(
      (l) => l.status === "completed",
    ).length;
    const failureCount = filtered.filter((l) =>
      (
        ["failed", "timeout", "validation_failed"] as AiExecutionStatus[]
      ).includes(l.status),
    ).length;
    const fallbackCount = filtered.filter(
      (l) => l.status === "fallback_used",
    ).length;

    const totalLatency = filtered.reduce((sum, l) => sum + l.latencyMs, 0);
    const avgLatencyMs =
      filtered.length > 0 ? Math.round(totalLatency / filtered.length) : 0;

    const totalCostUsd = filtered.reduce(
      (sum, l) => sum + l.estimatedCostUsd,
      0,
    );

    // 프로바이더별 집계
    const byProvider = {} as Record<
      AiProviderType,
      { count: number; costUsd: number }
    >;
    for (const log of filtered) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { count: 0, costUsd: 0 };
      }
      byProvider[log.provider].count += 1;
      byProvider[log.provider].costUsd += log.estimatedCostUsd;
    }

    // 태스크 유형별 집계
    const byTaskType = {} as Record<string, { count: number; costUsd: number }>;
    for (const log of filtered) {
      if (!byTaskType[log.taskType]) {
        byTaskType[log.taskType] = { count: 0, costUsd: 0 };
      }
      byTaskType[log.taskType]!.count += 1;
      byTaskType[log.taskType]!.costUsd += log.estimatedCostUsd;
    }

    // 최근 에러 (최신 10건)
    const recentErrors = filtered
      .filter((l) =>
        (
          ["failed", "timeout", "validation_failed"] as AiExecutionStatus[]
        ).includes(l.status),
      )
      .slice(-10);

    return {
      totalRequests: filtered.length,
      successCount,
      failureCount,
      fallbackCount,
      avgLatencyMs,
      totalCostUsd,
      byProvider,
      byTaskType,
      recentErrors,
    };
  }

  /** 로그 목록 조회 (필터 및 페이징) */
  getLogs(options: {
    workspaceId?: string;
    taskType?: AiTaskType;
    provider?: AiProviderType;
    status?: AiExecutionStatus;
    limit?: number;
    offset?: number;
  }): { logs: AiUsageLog[]; total: number } {
    let filtered = [...this.logs];

    if (options.workspaceId) {
      filtered = filtered.filter((l) => l.workspaceId === options.workspaceId);
    }
    if (options.taskType) {
      filtered = filtered.filter((l) => l.taskType === options.taskType);
    }
    if (options.provider) {
      filtered = filtered.filter((l) => l.provider === options.provider);
    }
    if (options.status) {
      filtered = filtered.filter((l) => l.status === options.status);
    }

    const total = filtered.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    const paged = filtered.slice(offset, offset + limit);

    return { logs: paged, total };
  }

  /** 비용 추정 (오늘/이번 달) */
  getCostEstimate(workspaceId?: string): AiCostEstimate {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();

    const filtered = workspaceId
      ? this.logs.filter((l) => l.workspaceId === workspaceId)
      : this.logs;

    const todayLogs = filtered.filter((l) => l.createdAt >= todayStart);
    const monthLogs = filtered.filter((l) => l.createdAt >= monthStart);

    return {
      totalRequestsToday: todayLogs.length,
      totalTokensToday: todayLogs.reduce(
        (s, l) => s + l.inputTokens + l.outputTokens,
        0,
      ),
      totalCostTodayUsd: todayLogs.reduce((s, l) => s + l.estimatedCostUsd, 0),
      totalRequestsMonth: monthLogs.length,
      totalTokensMonth: monthLogs.reduce(
        (s, l) => s + l.inputTokens + l.outputTokens,
        0,
      ),
      totalCostMonthUsd: monthLogs.reduce((s, l) => s + l.estimatedCostUsd, 0),
    };
  }

  /** 모든 로그 삭제 */
  clearLogs(): void {
    this.logs = [];
  }
}

/** 싱글톤 인스턴스 */
export const usageLogger = new AiUsageLogService();
