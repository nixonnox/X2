/**
 * X2 Analyzer Worker
 *
 * BullMQ worker that processes scheduled intelligence jobs:
 * 1. intelligence-collection: 소셜 멘션 수집 + snapshot 저장
 * 2. intelligence-snapshot: 분석 실행 + benchmark snapshot 저장
 *
 * 실행: pnpm --filter @x2/analyzer dev
 */

import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { db } from "@x2/db";
import {
  QUEUE_NAMES,
  type CollectionJobData,
  type SnapshotJobData,
  type RetentionJobData,
  type BackfillJobData,
  type DeliveryRetryJobData,
} from "@x2/queue";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// ─── Helpers ──────────────────────────────────────────────────

function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function log(level: "info" | "warn" | "error", msg: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const metaStr = meta ? " " + JSON.stringify(meta) : "";
  console[level](`[${ts}] [analyzer] ${msg}${metaStr}`);
}

// ─── Collection Worker ────────────────────────────────────────

async function processCollection(job: Job<CollectionJobData>) {
  const { projectId, keyword, triggeredBy } = job.data;
  log("info", `Collection started`, { projectId, keyword, triggeredBy, jobId: job.id });

  // 1. Check for overlap — skip if a snapshot was already created today for this keyword
  const existing = await db.socialMentionSnapshot.findFirst({
    where: {
      projectId,
      keyword,
      date: todayDate(),
    },
  });

  if (existing) {
    log("info", `Snapshot already exists for today, skipping collection`, { projectId, keyword });
    return { status: "skipped", reason: "duplicate_snapshot" };
  }

  // 2. Collect live mentions via direct DB query for connected providers
  // In production, this would call LiveSocialMentionBridgeService
  // For now, we create a minimal snapshot from any existing data
  const mentionCount = await db.rawSocialMention.count({
    where: {
      matchedKeyword: keyword,
      collectedAt: { gte: todayDate() },
    },
  });

  // 2.5. Run sentiment analysis on unanalyzed mentions
  try {
    const unanalyzed = await db.rawSocialMention.findMany({
      where: {
        matchedKeyword: keyword,
        collectedAt: { gte: todayDate() },
        sentiment: null,
      },
      select: { id: true, text: true },
      take: 100,
    });

    if (unanalyzed.length > 0) {
      const { getSentimentService } = await import("@x2/ai");
      const sentimentService = getSentimentService();
      const results = await sentimentService.analyzeBatch(unanalyzed.map((m: any) => m.text));

      const sentimentMap: Record<string, string> = { POSITIVE: "POSITIVE", NEGATIVE: "NEGATIVE", NEUTRAL: "NEUTRAL" };
      for (let i = 0; i < unanalyzed.length; i++) {
        const r = results.results[i];
        if (r && sentimentMap[r.sentiment]) {
          await db.rawSocialMention.update({
            where: { id: unanalyzed[i]!.id },
            data: { sentiment: sentimentMap[r.sentiment] as any },
          });
        }
      }
      log("info", `Sentiment analyzed ${unanalyzed.length} mentions`, { projectId, keyword });
    }
  } catch (err) {
    log("warn", `Sentiment analysis in collection failed`, { error: String(err) });
  }

  // 3. Count sentiments from today's mentions
  const mentions = await db.rawSocialMention.findMany({
    where: {
      matchedKeyword: keyword,
      collectedAt: { gte: todayDate() },
    },
    select: { sentiment: true },
    take: 500,
  });

  let positive = 0, neutral = 0, negative = 0, unclassified = 0;
  for (const m of mentions) {
    const s = (m as any).sentiment;
    if (s === "POSITIVE") positive++;
    else if (s === "NEGATIVE") negative++;
    else if (s === "NEUTRAL") neutral++;
    else unclassified++;
  }

  // 4. Save social mention snapshot
  const buzzLevel = mentionCount >= 50 ? "HIGH" : mentionCount >= 10 ? "MODERATE" : mentionCount > 0 ? "LOW" : "NONE";

  await db.socialMentionSnapshot.upsert({
    where: {
      projectId_keyword_date: {
        projectId,
        keyword,
        date: todayDate(),
      },
    },
    update: {
      totalCount: mentionCount,
      buzzLevel,
      positiveCount: positive,
      neutralCount: neutral,
      negativeCount: negative,
      unclassifiedCount: unclassified,
      freshness: mentionCount > 0 ? "fresh" : "no_data",
    },
    create: {
      projectId,
      keyword,
      date: todayDate(),
      totalCount: mentionCount,
      buzzLevel,
      positiveCount: positive,
      neutralCount: neutral,
      negativeCount: negative,
      unclassifiedCount: unclassified,
      providerStatuses: [],
      freshness: mentionCount > 0 ? "fresh" : "no_data",
    },
  });

  // 5. Update job status in scheduled_jobs table
  await updateJobStatus(projectId, "MENTION_COLLECT", keyword, "SUCCESS");

  log("info", `Collection completed`, {
    projectId, keyword, mentionCount, buzzLevel,
  });

  return { status: "completed", mentionCount, buzzLevel };
}

// ─── Snapshot Worker ──────────────────────────────────────────

async function processSnapshot(job: Job<SnapshotJobData>) {
  const { projectId, keyword, industryType, runAnalysis, triggeredBy } = job.data;
  log("info", `Snapshot started`, { projectId, keyword, industryType, triggeredBy, jobId: job.id });

  // 1. Check for duplicate — skip if analysis run exists today for this keyword
  const existingRun = await db.intelligenceAnalysisRun.findFirst({
    where: {
      projectId,
      seedKeyword: keyword,
      analyzedAt: { gte: todayDate() },
    },
    orderBy: { analyzedAt: "desc" },
  });

  if (existingRun && !runAnalysis) {
    log("info", `Analysis run already exists for today, skipping`, { projectId, keyword });
    return { status: "skipped", reason: "duplicate_run" };
  }

  // 2. Check for existing benchmark snapshot today
  const existingBench = await db.benchmarkSnapshot.findFirst({
    where: {
      projectId,
      keyword,
      industryType,
      date: todayDate(),
    },
  });

  if (existingBench) {
    log("info", `Benchmark snapshot already exists for today`, { projectId, keyword });
  }

  // 3. If we have a recent analysis run, create/update benchmark snapshot from it
  const latestRun = existingRun ?? await db.intelligenceAnalysisRun.findFirst({
    where: { projectId, seedKeyword: keyword },
    orderBy: { analyzedAt: "desc" },
  });

  if (latestRun && latestRun.benchmarkComparison) {
    const bench = latestRun.benchmarkComparison as any;
    if (bench.overallScore != null) {
      await db.benchmarkSnapshot.upsert({
        where: {
          projectId_keyword_industryType_date: {
            projectId,
            keyword,
            industryType,
            date: todayDate(),
          },
        },
        update: {
          overallScore: bench.overallScore,
          comparisons: bench.comparisons ?? [],
          highlights: bench.highlights ?? [],
          warnings: bench.warnings ?? [],
        },
        create: {
          projectId,
          keyword,
          industryType,
          date: todayDate(),
          overallScore: bench.overallScore,
          comparisons: bench.comparisons ?? [],
          highlights: bench.highlights ?? [],
          warnings: bench.warnings ?? [],
        },
      });
      log("info", `Benchmark snapshot saved`, { projectId, keyword, score: bench.overallScore });
    }
  }

  // 4. Update job status
  await updateJobStatus(projectId, "SNAPSHOT_GEN", keyword, "SUCCESS");

  log("info", `Snapshot completed`, { projectId, keyword });
  return { status: "completed" };
}

// ─── Job Status Tracking ──────────────────────────────────────

async function updateJobStatus(
  projectId: string,
  jobType: string,
  context: string,
  status: "SUCCESS" | "FAILED",
) {
  try {
    // Use scheduled_jobs table if a matching job exists
    const job = await db.scheduledJob.findFirst({
      where: {
        projectId,
        type: jobType as any,
        status: "ACTIVE",
      },
    });

    if (job) {
      await db.scheduledJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: new Date(),
          ...(status === "FAILED" ? { status: "FAILED" as any } : {}),
        },
      });
    }
  } catch (err) {
    log("warn", `Failed to update job status`, { projectId, jobType, context, error: String(err) });
  }
}

// ─── Retention Worker ─────────────────────────────────────────

async function processRetention(job: Job<RetentionJobData>) {
  const { retentionDays, dryRun, triggeredBy } = job.data;
  log("info", `Retention cleanup started`, { retentionDays, dryRun, triggeredBy, jobId: job.id });

  const { IntelligenceRetentionPolicyService } = await import(
    "@x2/api/services/intelligence/intelligence-retention.service"
  );
  const retentionService = new IntelligenceRetentionPolicyService(db);

  const result = await retentionService.executeCleanup({
    retentionDays,
    dryRun,
  });

  log("info", `Retention cleanup ${dryRun ? "dry-run" : "completed"}`, {
    totalDeleted: result.totalDeleted,
    totalProtected: result.totalProtected,
    durationMs: result.durationMs,
    targets: result.targets.map((t) => `${t.table}: -${t.toDelete} (protected: ${t.protected})`),
  });

  return result;
}

// ─── Backfill Worker ──────────────────────────────────────────

async function processBackfill(job: Job<BackfillJobData>) {
  const { projectId, keyword, industryType, startDate, endDate, batchIndex, totalBatches, backfillId } = job.data;
  log("info", `Backfill batch ${batchIndex + 1}/${totalBatches} started`, { projectId, keyword, backfillId, jobId: job.id });

  const { IntelligenceBackfillService } = await import(
    "@x2/api/services/intelligence/intelligence-backfill.service"
  );
  const backfillService = new IntelligenceBackfillService(db);

  const result = await backfillService.executeBatch(
    projectId,
    keyword,
    industryType,
    new Date(startDate),
    new Date(endDate),
    backfillId,
  );

  log("info", `Backfill batch ${batchIndex + 1}/${totalBatches} ${result.status}`, {
    projectId, keyword, snapshotsCreated: result.snapshotsCreated, backfillId,
  });

  return result;
}

// ─── Start Workers ────────────────────────────────────────────

const collectionWorker = new Worker<CollectionJobData>(
  QUEUE_NAMES.INTELLIGENCE_COLLECTION,
  processCollection,
  {
    connection,
    concurrency: 3,
    limiter: { max: 10, duration: 60_000 }, // Max 10 jobs per minute
  },
);

const snapshotWorker = new Worker<SnapshotJobData>(
  QUEUE_NAMES.INTELLIGENCE_SNAPSHOT,
  processSnapshot,
  {
    connection,
    concurrency: 2,
    limiter: { max: 5, duration: 60_000 },
  },
);

// ─── Delivery Retry Worker ────────────────────────────────────

async function processDeliveryRetry(job: Job<DeliveryRetryJobData>) {
  const { notificationId, userId, channel, attemptCount, projectId } = job.data;
  log("info", `Delivery retry ${attemptCount}/3 for ${channel}`, { notificationId, jobId: job.id });

  const { NotificationChannelDispatchService } = await import(
    "@x2/api/services/notification/channel-dispatch.service"
  );
  const dispatcher = new NotificationChannelDispatchService(undefined, db as any);
  const results = await dispatcher.dispatch({
    notificationId: job.data.notificationId,
    userId: job.data.userId,
    channels: [job.data.channel as any],
    title: job.data.title,
    message: job.data.message,
    priority: job.data.priority,
    actionUrl: job.data.actionUrl,
    sourceType: job.data.sourceType,
    sourceId: job.data.sourceId,
    recipientEmail: job.data.recipientEmail,
    webhookUrl: job.data.webhookUrl,
  });

  for (const r of results) {
    // Log result
    log(r.status === "SUCCESS" ? "info" : "warn", `Delivery retry result: ${r.status}`, {
      notificationId, channel: r.channel, attemptCount, error: r.error,
    });

    // Persist to delivery_logs (now possible with nullable executionId)
    try {
      await (db as any).deliveryLog.create({
        data: {
          channel: r.channel,
          status: r.status === "SUCCESS" ? "SENT" : "FAILED",
          sentAt: r.status === "SUCCESS" ? new Date() : undefined,
          failedAt: r.status !== "SUCCESS" ? new Date() : undefined,
          errorMessage: r.error ?? undefined,
          retryCount: attemptCount,
          sourceType: job.data.sourceType,
          sourceId: job.data.sourceId,
        },
      });
    } catch {
      // delivery_log persistence failure is non-blocking
    }

    // Schedule next retry if still failing
    if (r.status !== "SUCCESS" && attemptCount < 3) {
      const { deliveryRetryQueue } = await import("@x2/queue");
      const delays = [5 * 60_000, 15 * 60_000, 60 * 60_000];
      const nextDelay = delays[attemptCount] ?? delays[delays.length - 1]!;

      await deliveryRetryQueue.add(
        `retry:${notificationId}:${channel}:${attemptCount + 1}`,
        { ...job.data, attemptCount: attemptCount + 1 },
        { delay: nextDelay },
      );
      log("info", `Next retry scheduled in ${nextDelay / 60000}min`, { notificationId, channel });
    }
  }

  return { results: results.map((r) => ({ channel: r.channel, status: r.status })) };
}

const deliveryRetryWorker = new Worker<DeliveryRetryJobData>(
  QUEUE_NAMES.DELIVERY_RETRY,
  processDeliveryRetry,
  {
    connection,
    concurrency: 2,
  },
);

const backfillWorker = new Worker<BackfillJobData>(
  QUEUE_NAMES.BACKFILL,
  processBackfill,
  {
    connection,
    concurrency: 1, // Sequential to respect quota
    limiter: { max: 2, duration: 60_000 }, // Max 2 batches per minute
  },
);

const retentionWorker = new Worker<RetentionJobData>(
  QUEUE_NAMES.DATA_RETENTION,
  processRetention,
  {
    connection,
    concurrency: 1, // Only one retention job at a time
  },
);

// ─── Event Handlers ───────────────────────────────────────────

collectionWorker.on("completed", (job) => {
  log("info", `Collection job completed`, { jobId: job.id, keyword: job.data.keyword });
});

collectionWorker.on("failed", (job, err) => {
  log("error", `Collection job failed`, {
    jobId: job?.id,
    keyword: job?.data.keyword,
    error: err.message,
    attempt: job?.attemptsMade,
  });
});

snapshotWorker.on("completed", (job) => {
  log("info", `Snapshot job completed`, { jobId: job.id, keyword: job.data.keyword });
});

deliveryRetryWorker.on("completed", (job) => {
  log("info", `Delivery retry completed`, { jobId: job.id, channel: job.data.channel, attempt: job.data.attemptCount });
});

deliveryRetryWorker.on("failed", (job, err) => {
  log("error", `Delivery retry worker failed`, { jobId: job?.id, error: err.message });
});

backfillWorker.on("completed", (job) => {
  log("info", `Backfill job completed`, { jobId: job.id, batch: `${job.data.batchIndex + 1}/${job.data.totalBatches}` });
});

backfillWorker.on("failed", (job, err) => {
  log("error", `Backfill job failed`, { jobId: job?.id, error: err.message, batch: `${job?.data.batchIndex}` });
});

retentionWorker.on("completed", (job) => {
  log("info", `Retention job completed`, { jobId: job.id, dryRun: job.data.dryRun });
});

retentionWorker.on("failed", (job, err) => {
  log("error", `Retention job failed`, { jobId: job?.id, error: err.message });
});

snapshotWorker.on("failed", (job, err) => {
  log("error", `Snapshot job failed`, {
    jobId: job?.id,
    keyword: job?.data.keyword,
    error: err.message,
    attempt: job?.attemptsMade,
  });
});

// ─── Graceful Shutdown ────────────────────────────────────────

async function shutdown() {
  log("info", "Shutting down workers...");
  await collectionWorker.close();
  await snapshotWorker.close();
  await backfillWorker.close();
  await deliveryRetryWorker.close();
  await retentionWorker.close();
  await connection.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

log("info", "X2 Analyzer Worker started", {
  queues: [QUEUE_NAMES.INTELLIGENCE_COLLECTION, QUEUE_NAMES.INTELLIGENCE_SNAPSHOT],
  redis: REDIS_URL.replace(/\/\/.*@/, "//***@"), // mask credentials
});
