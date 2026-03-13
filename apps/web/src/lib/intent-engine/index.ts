// ── Types ──
export type {
  TemporalPhase,
  IntentCategory,
  SubIntent,
  SocialPlatform,
  KeywordSource,
  AnalysisJobStatus,
  RelationshipType,
  ExpandedKeyword,
  TrendDataPoint,
  TrendAnalysis,
  SocialVolumeEntry,
  AggregatedSocialVolume,
  ClassifiedKeyword,
  SearchJourneyStage,
  GapAnalysis,
  KeywordCluster,
  SearchJourney,
  SearchJourneyPath,
  ContentGapMatrix,
  ContentGapCell,
  IntentGraphNode,
  IntentGraphLink,
  IntentGraphCategory,
  IntentGraphData,
  AnalysisSummary,
  AnalysisJob,
  AnalysisRequest,
  CacheEntry,
  SSEEvent,
  IntentEngineConfig,
} from "./types";

export {
  DEFAULT_CONFIG,
  INTENT_CATEGORY_LABELS,
  TEMPORAL_PHASE_LABELS,
  GAP_LEVEL_LABELS,
  JOURNEY_STAGE_LABELS,
  SUB_INTENT_LABELS,
} from "./types";

// ── Service ──
export { intentAnalysisService } from "./service";

// ── Pipeline ──
export { expandKeywords } from "./pipeline/keyword-expander";
export {
  collectSocialVolumes,
  collectSingleVolume,
} from "./pipeline/social-volume-collector";
export {
  aggregateTrends,
  analyzeSingleTrend,
} from "./pipeline/trend-aggregator";

// ── Classifier ──
export { classifyKeywords } from "./classifier/intent-classifier";
export {
  calculateGapScore,
  getGapLevel,
  analyzeGap,
  calculateDifficultyScore,
  calculateOpportunityScore,
} from "./classifier/gap-calculator";
export { classifyWithLLM } from "./classifier/llm-adapter";

// ── Graph ──
export { buildIntentGraph } from "./graph/graph-builder";

// ── Cache ──
export { cacheManager } from "./cache/cache-manager";

// ── Queue ──
export { analysisJobStore, ANALYSIS_STAGES } from "./queue/analysis-queue";
