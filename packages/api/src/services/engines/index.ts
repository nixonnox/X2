/**
 * Analytics Engine barrel exports.
 */

// Types
export type {
  EngineVersion,
  EngineStatus,
  EngineExecutionLog,
  QualityFlags,
  SentimentLabel,
  SentimentResult,
  TopicResult,
  BusinessTopic,
  QuestionDetectionResult,
  RiskDetectionResult,
  RiskLevel,
  CommentAnalysisEngineResult,
  IntentCategory,
  IntentSubCategory,
  IntentClassificationResult,
  ClusterResult,
  ClusterMember,
  JourneyStage,
  JourneyNode,
  JourneyEdge,
  JourneyMapResult,
  CompetitorGapResult,
  OpportunityArea,
  CompetitorStrength,
  GeoAeoScoreResult,
  ActionCategory,
  ActionRecommendationResult,
} from "./types";

export { CONFIDENCE_THRESHOLDS, TOPIC_TAXONOMY } from "./types";

// Engines
export { TextAnalyzer } from "./text-analyzer";
export { IntentClassifier } from "./intent-classifier";
export { ClusterEngine } from "./cluster-engine";
export type { ClusterInput } from "./cluster-engine";
export { JourneyEngine } from "./journey-engine";
export { CompetitorGapEngine } from "./competitor-gap-engine";
export type { ChannelMetrics } from "./competitor-gap-engine";
export { GeoAeoScorer } from "./geo-aeo-scorer";
export { ActionSynthesizer } from "./action-synthesizer";
export type { AnalysisSignal } from "./action-synthesizer";

// Logger
export { EngineLogger, EngineLogBuilder } from "./engine-logger";
