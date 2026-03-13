// ─────────────────────────────────────────────
// Collection Scheduler
// ─────────────────────────────────────────────
// Schedule registry and execution planner.
// In-memory for development. Production: cron / queue-based.

import type {
  CollectionSchedule,
  ScheduleFrequency,
  CollectionType,
  PlatformCode,
  SourceType,
} from "./types";

const FREQUENCY_INTERVALS_MS: Record<ScheduleFrequency, number> = {
  manual: 0,
  hourly: 60 * 60 * 1000,
  every_6h: 6 * 60 * 60 * 1000,
  every_12h: 12 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

class CollectionScheduler {
  private schedules: Map<string, CollectionSchedule> = new Map();

  addSchedule(schedule: CollectionSchedule): void {
    this.schedules.set(schedule.id, schedule);
  }

  removeSchedule(id: string): void {
    this.schedules.delete(id);
  }

  getSchedule(id: string): CollectionSchedule | undefined {
    return this.schedules.get(id);
  }

  getAllSchedules(): CollectionSchedule[] {
    return Array.from(this.schedules.values());
  }

  getEnabledSchedules(): CollectionSchedule[] {
    return this.getAllSchedules().filter((s) => s.enabled);
  }

  toggleSchedule(id: string, enabled: boolean): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.enabled = enabled;
      schedule.updatedAt = new Date().toISOString();
    }
  }

  updateFrequency(id: string, frequency: ScheduleFrequency): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      schedule.frequency = frequency;
      schedule.nextScheduledAt = this.calculateNext(frequency);
      schedule.updatedAt = new Date().toISOString();
    }
  }

  markCollected(id: string): void {
    const schedule = this.schedules.get(id);
    if (schedule) {
      const now = new Date().toISOString();
      schedule.lastCollectedAt = now;
      schedule.nextScheduledAt = this.calculateNext(schedule.frequency);
      schedule.updatedAt = now;
    }
  }

  getDueSchedules(): CollectionSchedule[] {
    const now = Date.now();
    return this.getEnabledSchedules().filter((s) => {
      if (s.frequency === "manual") return false;
      if (!s.nextScheduledAt) return true;
      return new Date(s.nextScheduledAt).getTime() <= now;
    });
  }

  private calculateNext(frequency: ScheduleFrequency): string | null {
    if (frequency === "manual") return null;
    const interval = FREQUENCY_INTERVALS_MS[frequency];
    return new Date(Date.now() + interval).toISOString();
  }
}

// ── Schedule Factory ──

export function createSchedule(params: {
  name: string;
  type: CollectionType;
  platform: PlatformCode;
  targetId: string;
  frequency: ScheduleFrequency;
  connectorPreference?: SourceType;
}): CollectionSchedule {
  const now = new Date().toISOString();
  return {
    id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name,
    type: params.type,
    platform: params.platform,
    targetId: params.targetId,
    frequency: params.frequency,
    enabled: true,
    connectorPreference: params.connectorPreference || "mock",
    lastCollectedAt: null,
    nextScheduledAt: params.frequency === "manual" ? null : now,
    createdAt: now,
    updatedAt: now,
  };
}

export const collectionScheduler = new CollectionScheduler();
