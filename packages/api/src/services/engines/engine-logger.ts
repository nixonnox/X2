/**
 * Engine Execution Logger.
 * Tracks execution metrics, quality, and failures for all analytics engines.
 */

import type { Logger } from "../types";
import type { EngineExecutionLog, EngineStatus } from "./types";

// ---------------------------------------------------------------------------
// Engine Logger
// ---------------------------------------------------------------------------

export class EngineLogger {
  private readonly logs: EngineExecutionLog[] = [];
  private static readonly MAX_LOGS = 1000;

  constructor(private readonly logger: Logger) {}

  /**
   * Record an engine execution.
   */
  record(log: EngineExecutionLog): void {
    this.logs.unshift(log);

    // Trim to max size
    while (this.logs.length > EngineLogger.MAX_LOGS) {
      this.logs.pop();
    }

    // Log to system logger based on status
    const meta: Record<string, unknown> = {
      engine: log.engineName,
      version: log.engineVersion,
      status: log.status,
      inputCount: log.inputCount,
      outputCount: log.outputCount,
      successCount: log.successCount,
      failedCount: log.failedCount,
      avgConfidence: Math.round(log.avgConfidence * 100) / 100,
      lowConfidenceCount: log.lowConfidenceCount,
      durationMs: log.durationMs,
      traceId: log.traceId,
    };

    if (log.usedFallback) {
      meta.usedFallback = true;
    }
    if (log.retryCount > 0) {
      meta.retryCount = log.retryCount;
    }

    switch (log.status) {
      case "success":
        this.logger.info(`Engine execution completed: ${log.engineName}`, meta);
        break;
      case "partial":
        this.logger.warn(`Engine execution partial: ${log.engineName}`, meta);
        break;
      case "failed":
        this.logger.error(`Engine execution failed: ${log.engineName}`, {
          ...meta,
          errorDetail: log.errorDetail,
        });
        break;
      case "skipped":
        this.logger.info(`Engine execution skipped: ${log.engineName}`, meta);
        break;
    }
  }

  /**
   * Create a log builder for convenience.
   */
  createBuilder(engineName: string, engineVersion: string): EngineLogBuilder {
    return new EngineLogBuilder(this, engineName, engineVersion);
  }

  /**
   * Get recent logs for all engines or a specific engine.
   */
  getRecentLogs(engineName?: string, limit: number = 50): EngineExecutionLog[] {
    let filtered = this.logs;
    if (engineName) {
      filtered = filtered.filter((l) => l.engineName === engineName);
    }
    return filtered.slice(0, limit);
  }

  /**
   * Get logs by status.
   */
  getLogsByStatus(
    status: EngineStatus,
    limit: number = 50,
  ): EngineExecutionLog[] {
    return this.logs.filter((l) => l.status === status).slice(0, limit);
  }

  /**
   * Get engine health summary.
   */
  getHealthSummary(): Record<
    string,
    {
      totalRuns: number;
      successRate: number;
      avgConfidence: number;
      avgDurationMs: number;
      lastRun: Date | null;
      lastStatus: EngineStatus | null;
    }
  > {
    const summary: Record<
      string,
      {
        totalRuns: number;
        successCount: number;
        totalConfidence: number;
        totalDuration: number;
        lastRun: Date | null;
        lastStatus: EngineStatus | null;
      }
    > = {};

    for (const log of this.logs) {
      if (!summary[log.engineName]) {
        summary[log.engineName] = {
          totalRuns: 0,
          successCount: 0,
          totalConfidence: 0,
          totalDuration: 0,
          lastRun: null,
          lastStatus: null,
        };
      }

      const s = summary[log.engineName]!;
      s.totalRuns++;
      if (log.status === "success" || log.status === "partial") {
        s.successCount++;
      }
      s.totalConfidence += log.avgConfidence;
      s.totalDuration += log.durationMs;

      if (!s.lastRun || log.timestamp > s.lastRun) {
        s.lastRun = log.timestamp;
        s.lastStatus = log.status;
      }
    }

    const result: Record<string, any> = {};
    for (const [engine, s] of Object.entries(summary)) {
      result[engine] = {
        totalRuns: s.totalRuns,
        successRate:
          s.totalRuns > 0
            ? Math.round((s.successCount / s.totalRuns) * 100) / 100
            : 0,
        avgConfidence:
          s.totalRuns > 0
            ? Math.round((s.totalConfidence / s.totalRuns) * 100) / 100
            : 0,
        avgDurationMs:
          s.totalRuns > 0 ? Math.round(s.totalDuration / s.totalRuns) : 0,
        lastRun: s.lastRun,
        lastStatus: s.lastStatus,
      };
    }

    return result;
  }
}

// ---------------------------------------------------------------------------
// Log Builder (convenience pattern)
// ---------------------------------------------------------------------------

export class EngineLogBuilder {
  private startTime: number;
  private successCount = 0;
  private failedCount = 0;
  private skippedCount = 0;
  private confidences: number[] = [];
  private lowConfidenceCount = 0;
  private retryCount = 0;
  private usedFallback = false;
  private errorDetail?: string;
  private traceId?: string;
  private batchId?: string;
  private inputCount = 0;

  constructor(
    private readonly logger: EngineLogger,
    private readonly engineName: string,
    private readonly engineVersion: string,
  ) {
    this.startTime = Date.now();
  }

  setInput(count: number): this {
    this.inputCount = count;
    return this;
  }

  setTrace(traceId: string): this {
    this.traceId = traceId;
    return this;
  }

  setBatch(batchId: string): this {
    this.batchId = batchId;
    return this;
  }

  recordSuccess(confidence: number): void {
    this.successCount++;
    this.confidences.push(confidence);
    if (confidence < 0.5) {
      this.lowConfidenceCount++;
    }
  }

  recordFailure(error?: string): void {
    this.failedCount++;
    if (error) {
      this.errorDetail = error;
    }
  }

  recordSkip(): void {
    this.skippedCount++;
  }

  recordRetry(): void {
    this.retryCount++;
  }

  setFallback(): void {
    this.usedFallback = true;
  }

  /**
   * Finalize and record the log entry.
   */
  finish(): EngineExecutionLog {
    const durationMs = Date.now() - this.startTime;
    const avgConfidence =
      this.confidences.length > 0
        ? this.confidences.reduce((a, b) => a + b, 0) / this.confidences.length
        : 0;

    const outputCount =
      this.successCount + this.failedCount + this.skippedCount;

    let status: EngineStatus;
    if (this.failedCount === 0 && this.successCount > 0) {
      status = "success";
    } else if (this.successCount > 0 && this.failedCount > 0) {
      status = "partial";
    } else if (this.successCount === 0 && this.inputCount > 0) {
      status = "failed";
    } else {
      status = "skipped";
    }

    const log: EngineExecutionLog = {
      engineName: this.engineName,
      engineVersion: this.engineVersion,
      status,
      inputCount: this.inputCount,
      outputCount,
      successCount: this.successCount,
      failedCount: this.failedCount,
      skippedCount: this.skippedCount,
      avgConfidence,
      lowConfidenceCount: this.lowConfidenceCount,
      durationMs,
      retryCount: this.retryCount,
      usedFallback: this.usedFallback,
      errorDetail: this.errorDetail,
      timestamp: new Date(),
      traceId: this.traceId,
      batchId: this.batchId,
    };

    this.logger.record(log);
    return log;
  }
}
