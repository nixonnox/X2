/**
 * Collection pipeline barrel exports.
 */

// Types
export type {
  NormalizedChannel,
  NormalizedContent,
  NormalizedComment,
  NormalizedMention,
  CollectionScope,
  CollectionDataType,
  ChannelCollectionResult,
  CollectionRunResult,
  CollectionLogEntry,
  RetryPolicy,
  PlatformHealthStatus,
  CommentAnalysisInput,
  ListeningAnalysisInput,
  IntentAnalysisInput,
  GeoAeoInput,
} from "./types";

export { DEFAULT_RETRY_POLICY } from "./types";

// Normalization
export {
  normalizeChannel,
  normalizeContent,
  normalizeComment,
  normalizeYouTubeComment,
  normalizeMention,
} from "./normalization";

// Services
export { PlatformAdapter } from "./platform-adapter";
export { CollectionRunner } from "./collection-runner";
export { AnalyticsInputBuilder } from "./analytics-input-builder";
export type {
  CommentAnalyzer,
  ListeningCollector,
  IntentProcessor,
  GeoAeoCollector,
} from "./analytics-input-builder";
export { CollectionHealthTracker } from "./collection-health";
