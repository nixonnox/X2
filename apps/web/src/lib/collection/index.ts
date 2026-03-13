// ── Types ──
export type {
  PlatformCode,
  SourceType,
  CollectionType,
  JobStatus,
  RetryPolicy,
  PlatformInfo,
  ConnectorConfig,
  ConnectorHealthStatus,
  DataConnector,
  CollectionTarget,
  RawCollectionResult,
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
  CollectionJob,
  CollectionJobResult,
  CollectionLog,
  ScheduleFrequency,
  CollectionSchedule,
  CollectionSettings,
  QueueItem,
  WorkerStatus,
} from "./types";

export {
  PLATFORMS,
  JOB_STATUS_LABELS,
  COLLECTION_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  FREQUENCY_LABELS,
} from "./types";

// ── Connectors ──
export {
  YouTubeApiConnector,
  InstagramApiConnector,
  TikTokApiConnector,
  XApiConnector,
  GenericCrawlerConnector,
  MockConnector,
} from "./connectors";

// ── Registry ──
export { connectorRegistry } from "./registry";

// ── Jobs ──
export {
  createJob,
  runJob,
  collectChannel,
  collectContent,
  collectComments,
  collectMentions,
} from "./jobs";

// ── Normalization ──
export {
  normalizeChannel,
  normalizeContent,
  normalizeComment,
  normalizeMention,
} from "./normalization";

// ── Scheduler ──
export { collectionScheduler, createSchedule } from "./scheduler";

// ── Queue ──
export { jobQueue, jobWorker } from "./queue";

// ── Logs ──
export { collectionLogService } from "./logs";

// ── Mock Data ──
export {
  DEFAULT_SETTINGS,
  MOCK_LOGS,
  MOCK_CONNECTOR_HEALTH,
  MOCK_SCHEDULES,
} from "./mock-data";
