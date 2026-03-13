// ─────────────────────────────────────────────
// Collection Log Service
// ─────────────────────────────────────────────

import type { CollectionLog, CollectionType, PlatformCode } from "./types";

class CollectionLogService {
  private logs: CollectionLog[] = [];
  private maxLogs = 1000;

  addLog(params: Omit<CollectionLog, "id" | "metadata">): void {
    const log: CollectionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...params,
      metadata: {},
    };
    this.logs.unshift(log);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
  }

  getAll(): CollectionLog[] {
    return [...this.logs];
  }

  getRecent(limit = 50): CollectionLog[] {
    return this.logs.slice(0, limit);
  }

  getByStatus(status: "success" | "failed" | "retrying"): CollectionLog[] {
    return this.logs.filter((l) => l.status === status);
  }

  getByPlatform(platform: PlatformCode): CollectionLog[] {
    return this.logs.filter((l) => l.platform === platform);
  }

  getByType(type: CollectionType): CollectionLog[] {
    return this.logs.filter((l) => l.type === type);
  }

  getSummary() {
    const total = this.logs.length;
    const success = this.logs.filter((l) => l.status === "success").length;
    const failed = this.logs.filter((l) => l.status === "failed").length;
    const retrying = this.logs.filter((l) => l.status === "retrying").length;
    return { total, success, failed, retrying };
  }

  clear(): void {
    this.logs = [];
  }
}

export const collectionLogService = new CollectionLogService();
