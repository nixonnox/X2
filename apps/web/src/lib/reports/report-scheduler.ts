// ─────────────────────────────────────────────────────────────
// Report Scheduler — 리포트 예약 실행
// ─────────────────────────────────────────────────────────────

import type {
  ReportSchedule,
  ScheduleFrequency,
  ReportType,
  SectionType,
  ReportRecipient,
} from "./types";
import { DEFAULT_SECTIONS } from "./types";

class ReportScheduleService {
  private schedules: Map<string, ReportSchedule> = new Map();

  add(schedule: ReportSchedule): void {
    this.schedules.set(schedule.id, schedule);
  }

  remove(id: string): void {
    this.schedules.delete(id);
  }

  get(id: string): ReportSchedule | undefined {
    return this.schedules.get(id);
  }

  getAll(): ReportSchedule[] {
    return Array.from(this.schedules.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getEnabled(): ReportSchedule[] {
    return this.getAll().filter((s) => s.enabled);
  }

  toggle(id: string, enabled: boolean): void {
    const s = this.schedules.get(id);
    if (s) {
      s.enabled = enabled;
      s.updatedAt = new Date().toISOString();
    }
  }

  markRun(id: string): void {
    const s = this.schedules.get(id);
    if (s) {
      s.lastRunAt = new Date().toISOString();
      s.nextRunAt = calculateNextRun(s);
      s.updatedAt = new Date().toISOString();
    }
  }

  getDue(): ReportSchedule[] {
    const now = Date.now();
    return this.getEnabled().filter((s) => {
      if (!s.nextRunAt) return false;
      return new Date(s.nextRunAt).getTime() <= now;
    });
  }
}

function calculateNextRun(schedule: ReportSchedule): string | null {
  const now = new Date();
  const next = new Date(now);

  switch (schedule.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      next.setHours(schedule.hour, schedule.minute, 0, 0);
      break;
    case "weekly":
      next.setDate(
        next.getDate() +
          ((7 + (schedule.dayOfWeek ?? 1) - next.getDay()) % 7 || 7),
      );
      next.setHours(schedule.hour, schedule.minute, 0, 0);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(schedule.dayOfMonth ?? 1, 28));
      next.setHours(schedule.hour, schedule.minute, 0, 0);
      break;
    case "once":
      return null;
  }

  return next.toISOString();
}

export function createSchedule(params: {
  name: string;
  reportType: ReportType;
  projectName: string;
  frequency: ScheduleFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  minute?: number;
  recipients?: ReportRecipient[];
  sections?: SectionType[];
  autoShare?: boolean;
}): ReportSchedule {
  const now = new Date().toISOString();
  const sched: ReportSchedule = {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name,
    reportType: params.reportType,
    projectName: params.projectName,
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek ?? 1,
    dayOfMonth: params.dayOfMonth ?? 1,
    hour: params.hour ?? 9,
    minute: params.minute ?? 0,
    timezone: "Asia/Seoul",
    enabled: true,
    recipients: params.recipients || [],
    sections: params.sections || DEFAULT_SECTIONS,
    autoShare: params.autoShare ?? false,
    lastRunAt: null,
    nextRunAt: null,
    createdAt: now,
    updatedAt: now,
  };
  sched.nextRunAt = calculateNextRun(sched);
  return sched;
}

export const reportScheduleService = new ReportScheduleService();

// ── Pre-populate mock schedules ──
const mockSchedules = [
  createSchedule({
    name: "주간 성과 리포트",
    reportType: "weekly_report",
    projectName: "X2 Analytics",
    frequency: "weekly",
    dayOfWeek: 1,
    hour: 9,
    recipients: [{ email: "team@example.com", name: "팀 전체" }],
  }),
  createSchedule({
    name: "월간 종합 리포트",
    reportType: "monthly_report",
    projectName: "X2 Analytics",
    frequency: "monthly",
    dayOfMonth: 1,
    hour: 8,
    recipients: [{ email: "manager@example.com", name: "매니저" }],
  }),
];
mockSchedules[0]!.lastRunAt = new Date(Date.now() - 5 * 86400000).toISOString();
for (const s of mockSchedules) {
  reportScheduleService.add(s);
}
