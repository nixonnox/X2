/**
 * X2 Intelligence Scheduler
 *
 * 프로젝트별 키워드에 대해 주기적 수집/snapshot 작업을 등록합니다.
 * - 매 6시간: 소셜 멘션 수집 (intelligence-collection)
 * - 매일 1회: benchmark snapshot 생성 (intelligence-snapshot)
 *
 * 실행: tsx workers/analyzer/src/scheduler.ts
 */

import { db } from "@x2/db";
import {
  intelligenceCollectionQueue,
  intelligenceSnapshotQueue,
  dataRetentionQueue,
} from "@x2/queue";

function log(msg: string, meta?: Record<string, unknown>) {
  console.log(`[${new Date().toISOString()}] [scheduler] ${msg}`, meta ? JSON.stringify(meta) : "");
}

async function registerScheduledJobs() {
  log("Loading active keywords from DB...");

  // Get all saved (bookmarked) keywords with their projects
  const keywords = await db.intelligenceKeyword.findMany({
    where: { isSaved: true },
    select: {
      projectId: true,
      keyword: true,
      industryType: true,
    },
  });

  log(`Found ${keywords.length} saved keywords`);

  if (keywords.length === 0) {
    log("No saved keywords found. Schedule jobs manually or save keywords in Intelligence Hub.");
    return;
  }

  // Clean existing repeatable jobs to avoid duplicates
  const existingCollection = await intelligenceCollectionQueue.getRepeatableJobs();
  for (const job of existingCollection) {
    await intelligenceCollectionQueue.removeRepeatableByKey(job.key);
  }

  const existingSnapshot = await intelligenceSnapshotQueue.getRepeatableJobs();
  for (const job of existingSnapshot) {
    await intelligenceSnapshotQueue.removeRepeatableByKey(job.key);
  }

  log("Cleared existing repeatable jobs");

  // Register new repeatable jobs for each keyword
  for (const kw of keywords) {
    const jobId = `${kw.projectId}:${kw.keyword}`;

    // Collection: every 6 hours
    await intelligenceCollectionQueue.add(
      `collect:${jobId}`,
      {
        projectId: kw.projectId,
        keyword: kw.keyword,
        triggeredBy: "scheduler",
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: "0 */6 * * *", // Every 6 hours at :00
        },
        jobId: `collection:${jobId}`,
      },
    );

    // Snapshot: daily at 02:00 UTC
    await intelligenceSnapshotQueue.add(
      `snapshot:${jobId}`,
      {
        projectId: kw.projectId,
        keyword: kw.keyword,
        industryType: kw.industryType ?? "BEAUTY",
        runAnalysis: false,
        triggeredBy: "scheduler",
        scheduledAt: new Date().toISOString(),
      },
      {
        repeat: {
          pattern: "0 2 * * *", // Daily at 02:00 UTC
        },
        jobId: `snapshot:${jobId}`,
      },
    );

    log(`Registered jobs for "${kw.keyword}"`, { projectId: kw.projectId });
  }

  // Register retention cleanup: weekly on Sunday at 03:00 UTC
  const existingRetention = await dataRetentionQueue.getRepeatableJobs();
  for (const job of existingRetention) {
    await dataRetentionQueue.removeRepeatableByKey(job.key);
  }

  await dataRetentionQueue.add(
    "retention-cleanup",
    {
      retentionDays: 90,
      dryRun: false,
      triggeredBy: "scheduler",
      scheduledAt: new Date().toISOString(),
    },
    {
      repeat: {
        pattern: "0 3 * * 0", // Every Sunday at 03:00 UTC
      },
      jobId: "retention-weekly",
    },
  );

  log(`Scheduled ${keywords.length * 2 + 1} repeatable jobs (${keywords.length} collection + ${keywords.length} snapshot + 1 retention)`);
}

// ─── Run ──────────────────────────────────────────────────────

registerScheduledJobs()
  .then(() => {
    log("Scheduler completed. Jobs will run according to cron patterns.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[scheduler] Failed:", err);
    process.exit(1);
  });
