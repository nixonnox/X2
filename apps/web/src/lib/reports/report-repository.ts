// ─────────────────────────────────────────────────────────────
// Report Repository — 리포트 저장소 (인메모리/Mock)
// ─────────────────────────────────────────────────────────────

import type {
  Report,
  ReportType,
  ReportStatus,
  ReportStatusLog,
} from "./types";
import { MOCK_REPORTS } from "./mock-data";

class ReportRepository {
  private reports: Map<string, Report> = new Map();
  private statusLogs: ReportStatusLog[] = [];

  constructor() {
    for (const r of MOCK_REPORTS) {
      this.reports.set(r.id, r);
    }
  }

  getAll(): Report[] {
    return Array.from(this.reports.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getById(id: string): Report | undefined {
    return this.reports.get(id);
  }

  getByType(type: ReportType): Report[] {
    return this.getAll().filter((r) => r.type === type);
  }

  getByStatus(status: ReportStatus): Report[] {
    return this.getAll().filter((r) => r.status === status);
  }

  save(report: Report): void {
    this.reports.set(report.id, report);
    this.addStatusLog(report.id, report.status, "리포트 저장됨");
  }

  updateStatus(id: string, status: ReportStatus, message?: string): void {
    const report = this.reports.get(id);
    if (report) {
      report.status = status;
      report.updatedAt = new Date().toISOString();
      this.addStatusLog(id, status, message || `상태 변경: ${status}`);
    }
  }

  delete(id: string): boolean {
    return this.reports.delete(id);
  }

  private addStatusLog(
    reportId: string,
    status: ReportStatus,
    message: string,
  ): void {
    this.statusLogs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      reportId,
      status,
      message,
      timestamp: new Date().toISOString(),
    });
    if (this.statusLogs.length > 500) {
      this.statusLogs = this.statusLogs.slice(-500);
    }
  }

  getStatusLogs(reportId: string): ReportStatusLog[] {
    return this.statusLogs.filter((l) => l.reportId === reportId);
  }

  getSummary() {
    const all = this.getAll();
    return {
      total: all.length,
      ready: all.filter((r) => r.status === "ready").length,
      sent: all.filter((r) => r.status === "sent").length,
      scheduled: all.filter((r) => r.status === "scheduled").length,
      failed: all.filter((r) => r.status === "failed").length,
    };
  }
}

export const reportRepository = new ReportRepository();
