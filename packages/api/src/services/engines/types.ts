/**
 * Analytics Engine Types.
 * Shared types for all analysis engines.
 */

// ---------------------------------------------------------------------------
// Engine metadata
// ---------------------------------------------------------------------------

/** Engine version identifier for traceability */
export type EngineVersion = {
  engine: string;
  version: string;
  model: string; // e.g. "rule-based-v1", "claude-haiku-20250301"
};

/** Engine execution status */
export type EngineStatus = "success" | "partial" | "failed" | "skipped";

/** Engine execution log entry */
export type EngineExecutionLog = {
  engineName: string;
  engineVersion: string;
  status: EngineStatus;
  inputCount: number;
  outputCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  avgConfidence: number;
  lowConfidenceCount: number;
  durationMs: number;
  retryCount: number;
  usedFallback: boolean;
  errorDetail?: string;
  timestamp: Date;
  traceId?: string;
  batchId?: string;
};

/** Quality flags for individual analysis results */
export type QualityFlags = {
  lowConfidence: boolean;
  needsHumanReview: boolean;
  noisyData: boolean;
  usedFallback: boolean;
};

/** Confidence threshold constants */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Sentiment Engine
// ---------------------------------------------------------------------------

export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export type SentimentResult = {
  sentiment: SentimentLabel;
  sentimentScore: number; // -1.0 to 1.0
  confidence: number; // 0.0 to 1.0
  reason: string | null;
  language: string;
  qualityFlags: QualityFlags;
};

// ---------------------------------------------------------------------------
// Topic Engine
// ---------------------------------------------------------------------------

export type TopicResult = {
  primaryTopic: string;
  secondaryTopics: string[];
  confidence: number;
  topicSource: string; // "keyword_match" | "pattern" | "llm"
};

/** Predefined business-relevant topic taxonomy (Korean context) */
export const TOPIC_TAXONOMY = [
  "가격",
  "품질",
  "사용법",
  "비교",
  "일정",
  "지원",
  "불만",
  "칭찬",
  "배송",
  "환불",
  "기능",
  "디자인",
  "성능",
  "내구성",
  "사이즈",
  "맛",
  "서비스",
  "매장",
  "이벤트",
  "할인",
  "추천",
  "후기",
  "문의",
  "기타",
] as const;

export type BusinessTopic = (typeof TOPIC_TAXONOMY)[number] | string;

// ---------------------------------------------------------------------------
// FAQ / Question Detection
// ---------------------------------------------------------------------------

export type QuestionDetectionResult = {
  isQuestion: boolean;
  questionType: string | null; // "how_to" | "why" | "comparison" | "recommendation" | "price" | "availability" | "general"
  normalizedQuestion: string | null;
  confidence: number;
};

// ---------------------------------------------------------------------------
// Risk Detection
// ---------------------------------------------------------------------------

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskDetectionResult = {
  isRisk: boolean;
  riskLevel: RiskLevel | null;
  riskIndicators: string[];
  confidence: number;
};

// ---------------------------------------------------------------------------
// Combined Comment Analysis
// ---------------------------------------------------------------------------

export type CommentAnalysisEngineResult = {
  commentId: string;
  sentiment: SentimentResult;
  topics: TopicResult;
  question: QuestionDetectionResult;
  risk: RiskDetectionResult;
  isSpam: boolean;
  suggestedReply: string | null;
  engineVersion: EngineVersion;
  analyzedAt: Date;
};

// ---------------------------------------------------------------------------
// Intent Engine
// ---------------------------------------------------------------------------

export type IntentCategory =
  | "DISCOVERY"
  | "COMPARISON"
  | "ACTION"
  | "TROUBLESHOOTING"
  | "NAVIGATION"
  | "UNKNOWN";

export type IntentSubCategory =
  | "정보_탐색"
  | "비교_검토"
  | "구매_의도"
  | "문제_해결"
  | "후기_탐색"
  | "추천_탐색"
  | "실행_방문_의도"
  | string;

export type IntentClassificationResult = {
  keyword: string;
  intentCategory: IntentCategory;
  subIntent: IntentSubCategory | null;
  confidence: number;
  supportingPhrases: string[];
  gapScore: number;
  gapType: "BLUE_OCEAN" | "OPPORTUNITY" | "COMPETITIVE" | "SATURATED";
  engineVersion: EngineVersion;
};

// ---------------------------------------------------------------------------
// Cluster Engine
// ---------------------------------------------------------------------------

export type ClusterResult = {
  clusterId: string;
  label: string;
  representativePhrase: string;
  memberItems: ClusterMember[];
  clusterScore: number;
  engineVersion: EngineVersion;
};

export type ClusterMember = {
  id: string;
  text: string;
  type: "keyword" | "topic" | "intent" | "question";
  similarity: number;
};

// ---------------------------------------------------------------------------
// Journey Engine
// ---------------------------------------------------------------------------

export type JourneyStage =
  | "AWARENESS"
  | "INTEREST"
  | "COMPARISON"
  | "DECISION"
  | "ACTION"
  | "ADVOCACY";

export type JourneyNode = {
  id: string;
  stage: JourneyStage;
  label: string;
  keywords: string[];
  intentCategory: IntentCategory | null;
  weight: number;
};

export type JourneyEdge = {
  fromNodeId: string;
  toNodeId: string;
  transitionScore: number;
  supportingEvidence: string[];
};

export type JourneyMapResult = {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  dominantPath: string[]; // node IDs of the most common journey
  engineVersion: EngineVersion;
};

// ---------------------------------------------------------------------------
// Competitor Gap Engine
// ---------------------------------------------------------------------------

export type CompetitorGapResult = {
  projectId: string;
  gapSummary: string;
  opportunityAreas: OpportunityArea[];
  missingContentFormats: string[];
  competitorStrengths: CompetitorStrength[];
  suggestedActions: string[];
  engineVersion: EngineVersion;
};

export type OpportunityArea = {
  area: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  relatedKeywords: string[];
};

export type CompetitorStrength = {
  competitorName: string;
  strength: string;
  ourGap: string;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
};

// ---------------------------------------------------------------------------
// GEO/AEO Scoring Engine
// ---------------------------------------------------------------------------

export type GeoAeoScoreResult = {
  citationReadinessScore: number; // 0-100
  answerabilityScore: number; // 0-100
  structureQualityScore: number; // 0-100
  sourceTrustScore: number; // 0-100
  overallScore: number; // 0-100
  improvementSuggestions: string[];
  engineVersion: EngineVersion;
};

// ---------------------------------------------------------------------------
// Action Recommendation Engine
// ---------------------------------------------------------------------------

export type ActionCategory =
  | "CONTENT_CREATION"
  | "CONTENT_OPTIMIZATION"
  | "COMMUNITY_MANAGEMENT"
  | "ADVERTISING"
  | "INFLUENCER"
  | "REPORT"
  | "RISK_MITIGATION"
  | "SEO_OPTIMIZATION"
  | "PRODUCT_FEEDBACK";

export type ActionRecommendationResult = {
  title: string;
  description: string;
  category: ActionCategory;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  expectedImpact: string;
  relatedEvidenceIds: string[];
  sourceModule: string;
  sourceEntityId: string | null;
  engineVersion: EngineVersion;
};
