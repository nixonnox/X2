// ─────────────────────────────────────────────
// Job Queue & Worker Abstraction
// ─────────────────────────────────────────────
// In-memory queue for development.
// Designed to be replaced by Redis/BullMQ in production.

import type {
  CollectionJob,
  CollectionJobResult,
  QueueItem,
  WorkerStatus,
} from "./types";
import { runJob } from "./jobs";

// ── Queue Abstraction ──

class JobQueue {
  private items: QueueItem[] = [];
  private processed: CollectionJobResult[] = [];
  private deadLetter: {
    job: CollectionJob;
    error: string;
    failedAt: string;
  }[] = [];
  private maxSize = 1000;

  enqueue(job: CollectionJob): void {
    if (this.items.length >= this.maxSize) {
      // Remove oldest low-priority items
      this.items.sort((a, b) => b.priority - a.priority);
      this.items = this.items.slice(0, this.maxSize - 1);
    }

    this.items.push({
      id: job.id,
      job,
      priority: job.priority,
      addedAt: new Date().toISOString(),
      attempts: 0,
    });

    // Sort by priority (higher = first)
    this.items.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): QueueItem | null {
    return this.items.shift() || null;
  }

  peek(): QueueItem | null {
    return this.items[0] || null;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  getItems(): QueueItem[] {
    return [...this.items];
  }

  addToDeadLetter(job: CollectionJob, error: string): void {
    this.deadLetter.push({ job, error, failedAt: new Date().toISOString() });
    // Keep last 100 dead letters
    if (this.deadLetter.length > 100) {
      this.deadLetter = this.deadLetter.slice(-100);
    }
  }

  getDeadLetter() {
    return [...this.deadLetter];
  }

  addProcessed(result: CollectionJobResult): void {
    this.processed.push(result);
    if (this.processed.length > 500) {
      this.processed = this.processed.slice(-500);
    }
  }

  getProcessed(): CollectionJobResult[] {
    return [...this.processed];
  }
}

// ── Worker Abstraction ──

class QueueWorker {
  private status: WorkerStatus;
  private queue: JobQueue;
  private processing = false;
  private devMode: boolean;

  constructor(
    queue: JobQueue,
    devMode = process.env.NODE_ENV !== "production",
  ) {
    this.queue = queue;
    this.devMode = devMode;
    this.status = {
      id: `worker-${Date.now()}`,
      active: false,
      currentJobId: null,
      processedCount: 0,
      failedCount: 0,
      startedAt: new Date().toISOString(),
    };
  }

  async processNext(): Promise<CollectionJobResult | null> {
    if (this.processing) return null;

    const item = this.queue.dequeue();
    if (!item) return null;

    this.processing = true;
    this.status.active = true;
    this.status.currentJobId = item.job.id;

    try {
      const result = await runJob(item.job, this.devMode);
      this.queue.addProcessed(result);

      if (result.success) {
        this.status.processedCount++;
      } else {
        this.status.failedCount++;

        // Retry logic
        if (item.attempts < item.job.maxRetries) {
          item.attempts++;
          item.job.retryCount = item.attempts;
          item.job.status = "retrying";
          this.queue.enqueue(item.job);
        } else {
          this.queue.addToDeadLetter(
            item.job,
            item.job.error || "Max retries exceeded",
          );
        }
      }

      return result;
    } finally {
      this.processing = false;
      this.status.active = false;
      this.status.currentJobId = null;
    }
  }

  async processAll(): Promise<CollectionJobResult[]> {
    const results: CollectionJobResult[] = [];
    while (this.queue.size() > 0) {
      const result = await this.processNext();
      if (result) results.push(result);
    }
    return results;
  }

  getStatus(): WorkerStatus {
    return { ...this.status };
  }
}

// ── Singleton Instances ──

export const jobQueue = new JobQueue();
export const jobWorker = new QueueWorker(jobQueue, true);
