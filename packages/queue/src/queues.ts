/**
 * Queue definitions for scheduled intelligence jobs.
 */
import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

// ─── Queue Names ────────────────────────────────────────────
export const QUEUE_NAMES = {
  INTELLIGENCE_COLLECTION: "intelligence-collection",
  INTELLIGENCE_SNAPSHOT: "intelligence-snapshot",
  DATA_RETENTION: "data-retention",
  BACKFILL: "intelligence-backfill",
  DELIVERY_RETRY: "delivery-retry",
} as const;

// ─── Job Data Types ─────────────────────────────────────────

export type CollectionJobData = {
  projectId: string;
  keyword: string;
  /** Optional: only collect from specific providers */
  providers?: string[];
  /** Job context for tracking */
  triggeredBy: "scheduler" | "manual" | "webhook";
  scheduledAt: string; // ISO timestamp
};

export type SnapshotJobData = {
  projectId: string;
  keyword: string;
  industryType: string;
  /** Whether to also run signal fusion analysis */
  runAnalysis: boolean;
  triggeredBy: "scheduler" | "manual" | "post-collection";
  scheduledAt: string;
};

export type DeliveryRetryJobData = {
  notificationId: string;
  userId: string;
  channel: string; // "EMAIL" | "WEBHOOK"
  title: string;
  message: string;
  priority: string;
  actionUrl: string;
  sourceType: string;
  sourceId: string;
  projectId: string;
  recipientEmail?: string;
  webhookUrl?: string;
  attemptCount: number; // Current attempt (1-based)
};

export type BackfillJobData = {
  projectId: string;
  keyword: string;
  industryType: string;
  /** Backfill range */
  startDate: string; // ISO date
  endDate: string; // ISO date
  /** Provider to use (or "all") */
  provider: string;
  /** Batch tracking */
  batchIndex: number;
  totalBatches: number;
  /** Job context */
  triggeredBy: "manual" | "admin";
  backfillId: string; // Unique ID for this backfill session
};

export type RetentionJobData = {
  retentionDays: number;
  dryRun: boolean;
  triggeredBy: "scheduler" | "manual";
  scheduledAt: string;
};

// ─── Queue Names ── (retention) ─────────────────────────────
// Added to QUEUE_NAMES below

// ─── Queue Instances ────────────────────────────────────────

export const intelligenceCollectionQueue = new Queue<CollectionJobData>(
  QUEUE_NAMES.INTELLIGENCE_COLLECTION,
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 }, // 30s, 60s, 120s
      removeOnComplete: { count: 100 }, // Keep last 100 completed
      removeOnFail: { count: 200 }, // Keep last 200 failed for debugging
    },
  },
);

export const deliveryRetryQueue = new Queue<DeliveryRetryJobData>(
  QUEUE_NAMES.DELIVERY_RETRY,
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1, // Each job IS one attempt; no BullMQ auto-retry
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  },
);

export const backfillQueue = new Queue<BackfillJobData>(QUEUE_NAMES.BACKFILL, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 60_000 }, // 1min, 2min
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

export const dataRetentionQueue = new Queue<RetentionJobData>(
  QUEUE_NAMES.DATA_RETENTION,
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 1, // Retention is idempotent, no retry needed
      removeOnComplete: { count: 30 },
      removeOnFail: { count: 50 },
    },
  },
);

export const intelligenceSnapshotQueue = new Queue<SnapshotJobData>(
  QUEUE_NAMES.INTELLIGENCE_SNAPSHOT,
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 15_000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  },
);
