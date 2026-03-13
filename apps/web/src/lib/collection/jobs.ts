// ─────────────────────────────────────────────
// Collection Jobs
// ─────────────────────────────────────────────
// Orchestrates the collection pipeline:
// target → connector → collect → normalize → result → log

import type {
  CollectionJob,
  CollectionJobResult,
  CollectionTarget,
  CollectionType,
  PlatformCode,
  SourceType,
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
  DataConnector,
} from "./types";
import { connectorRegistry } from "./registry";
import {
  normalizeChannel,
  normalizeContent,
  normalizeComment,
  normalizeMention,
} from "./normalization";
import { collectionLogService } from "./logs";

function jobId() {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Job Factory ──

export function createJob(
  type: CollectionType,
  platform: PlatformCode,
  target: CollectionTarget,
  options?: {
    connectorId?: string;
    sourceMode?: SourceType;
    priority?: number;
    maxRetries?: number;
  },
): CollectionJob {
  const connector = options?.connectorId
    ? connectorRegistry.get(options.connectorId)
    : connectorRegistry.resolve(platform, type, options?.sourceMode);

  return {
    id: jobId(),
    type,
    platform,
    target,
    connectorId: connector?.id || "unknown",
    status: "pending",
    priority: options?.priority || 0,
    retryCount: 0,
    maxRetries: options?.maxRetries ?? 3,
    retryPolicy: "exponential",
    scheduledAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null,
    error: null,
    resultSummary: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Job Runner ──

export async function runJob(
  job: CollectionJob,
  devMode = false,
): Promise<CollectionJobResult> {
  const startTime = Date.now();
  job.status = "running";
  job.startedAt = new Date().toISOString();

  // Resolve connector (use mock in dev mode)
  let connector: DataConnector | null | undefined;

  if (devMode) {
    connector = connectorRegistry.resolveMock(job.platform);
  } else {
    connector = connectorRegistry.get(job.connectorId);
  }

  if (!connector) {
    const error = `Connector not found: ${job.connectorId}`;
    job.status = "failed";
    job.error = error;
    job.endedAt = new Date().toISOString();

    collectionLogService.addLog({
      jobId: job.id,
      type: job.type,
      platform: job.platform,
      target: job.target.channelId || job.target.keyword || "unknown",
      connectorId: job.connectorId,
      status: "failed",
      errorMessage: error,
      userMessage: "수집 커넥터를 찾을 수 없습니다.",
      retryCount: job.retryCount,
      startedAt: job.startedAt,
      endedAt: job.endedAt,
      durationMs: Date.now() - startTime,
      itemCount: 0,
    });

    return {
      jobId: job.id,
      success: false,
      collectionType: job.type,
      platform: job.platform,
      connectorId: job.connectorId,
      normalizedPayload: null,
      metadata: {
        collectedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        itemCount: 0,
        sourceType: "mock",
      },
    };
  }

  try {
    const result = await executeCollection(connector, job);
    const normalizedPayload = normalizeResult(
      job.type,
      job.platform,
      result.data,
      job.target,
    );

    job.status = "completed";
    job.endedAt = new Date().toISOString();
    job.resultSummary = `${result.metadata.itemCount} items collected`;

    collectionLogService.addLog({
      jobId: job.id,
      type: job.type,
      platform: job.platform,
      target: job.target.channelId || job.target.keyword || "unknown",
      connectorId: connector.id,
      status: "success",
      errorMessage: null,
      userMessage: null,
      retryCount: job.retryCount,
      startedAt: job.startedAt!,
      endedAt: job.endedAt,
      durationMs: Date.now() - startTime,
      itemCount: result.metadata.itemCount,
    });

    return {
      jobId: job.id,
      success: true,
      collectionType: job.type,
      platform: job.platform,
      connectorId: connector.id,
      normalizedPayload,
      metadata: {
        collectedAt: result.metadata.collectedAt,
        durationMs: Date.now() - startTime,
        itemCount: result.metadata.itemCount,
        sourceType: connector.sourceType,
      },
      rawSnapshot: result.rawSnapshot,
    };
  } catch (err) {
    const error = (err as Error).message;
    job.status = "failed";
    job.error = error;
    job.endedAt = new Date().toISOString();

    collectionLogService.addLog({
      jobId: job.id,
      type: job.type,
      platform: job.platform,
      target: job.target.channelId || job.target.keyword || "unknown",
      connectorId: connector.id,
      status: "failed",
      errorMessage: error,
      userMessage: "수집 중 오류가 발생했습니다. 잠시 후 재시도합니다.",
      retryCount: job.retryCount,
      startedAt: job.startedAt!,
      endedAt: job.endedAt,
      durationMs: Date.now() - startTime,
      itemCount: 0,
    });

    return {
      jobId: job.id,
      success: false,
      collectionType: job.type,
      platform: job.platform,
      connectorId: connector.id,
      normalizedPayload: null,
      metadata: {
        collectedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        itemCount: 0,
        sourceType: connector.sourceType,
      },
    };
  }
}

// ── Collection Execution ──

async function executeCollection(connector: DataConnector, job: CollectionJob) {
  switch (job.type) {
    case "channel":
      return connector.collectChannel(job.target);
    case "content":
      return connector.collectContent(job.target);
    case "comment":
      return connector.collectComments(job.target);
    case "mention":
      return connector.collectMentions(job.target);
    default:
      throw new Error(`Unknown collection type: ${job.type}`);
  }
}

// ── Normalization Dispatch ──

function normalizeResult(
  type: CollectionType,
  platform: PlatformCode,
  data: unknown,
  target: CollectionTarget,
):
  | NormalizedChannel
  | NormalizedContent[]
  | NormalizedComment[]
  | NormalizedMention[]
  | null {
  if (!data) return null;

  switch (type) {
    case "channel":
      return normalizeChannel(platform, data as Record<string, unknown>);

    case "content": {
      const items = data as Record<string, unknown>[];
      return items.map((item) =>
        normalizeContent(platform, item, target.channelId || ""),
      );
    }

    case "comment": {
      const items = data as Record<string, unknown>[];
      return items.map((item) =>
        normalizeComment(
          platform,
          item,
          target.contentId || "",
          target.channelId || "",
        ),
      );
    }

    case "mention": {
      const items = data as Record<string, unknown>[];
      return items.map((item) => normalizeMention(platform, item));
    }

    default:
      return null;
  }
}

// ── Convenience runners ──

export async function collectChannel(
  platform: PlatformCode,
  channelId: string,
  devMode = false,
) {
  const job = createJob("channel", platform, {
    id: channelId,
    platform,
    channelId,
  });
  return runJob(job, devMode);
}

export async function collectContent(
  platform: PlatformCode,
  channelId: string,
  limit = 20,
  devMode = false,
) {
  const job = createJob("content", platform, {
    id: channelId,
    platform,
    channelId,
    options: { limit },
  });
  return runJob(job, devMode);
}

export async function collectComments(
  platform: PlatformCode,
  contentId: string,
  channelId: string,
  limit = 50,
  devMode = false,
) {
  const job = createJob("comment", platform, {
    id: contentId,
    platform,
    contentId,
    channelId,
    options: { limit },
  });
  return runJob(job, devMode);
}

export async function collectMentions(
  platform: PlatformCode,
  keyword: string,
  limit = 20,
  devMode = false,
) {
  const job = createJob("mention", platform, {
    id: keyword,
    platform,
    keyword,
    options: { limit },
  });
  return runJob(job, devMode);
}
