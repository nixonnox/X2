import type { PlatformCode } from "../channels/types";

// ============================================
// Comment Domain Types
// ============================================

export type SentimentLabel = "positive" | "neutral" | "negative";

export type TopicLabel =
  | "price"
  | "quality"
  | "design"
  | "service"
  | "delivery"
  | "schedule"
  | "performance"
  | "inquiry"
  | "support"
  | "spam"
  | "other";

export type RiskLevel = "low" | "medium" | "high";

export type ResponseStatus =
  | "unanswered"
  | "reviewing"
  | "responded"
  | "dismissed";

export type UrgencyLevel = "low" | "medium" | "high" | "critical";

export type SuggestionTone = "formal" | "friendly" | "brand-safe";

// ---- Comment ----

export type Comment = {
  id: string;
  platformCode: PlatformCode;
  channelId: string;
  channelName: string;
  contentId: string;
  contentTitle: string;
  authorName: string;
  authorProfileUrl: string | null;
  commentText: string;
  postedAt: string;
  likeCount: number;
  replyCount: number;
  language: string;
  status: ResponseStatus;
};

// ---- Comment Analysis ----

export type CommentAnalysis = {
  commentId: string;
  sentimentLabel: SentimentLabel;
  sentimentScore: number; // -1 to 1
  topicLabel: TopicLabel;
  topicConfidence: number; // 0 to 1
  riskLevel: RiskLevel;
  riskScore: number; // 0 to 100
  needsResponse: boolean;
  responsePriority: UrgencyLevel;
  faqCandidate: boolean;
  urgencyLevel: UrgencyLevel;
  summary: string;
};

// ---- Reply Suggestion ----

export type ReplySuggestion = {
  id: string;
  text: string;
  tone: SuggestionTone;
  recommended: boolean;
};

export type CommentReplySuggestions = {
  commentId: string;
  suggestions: ReplySuggestion[];
};

// ---- Comment Tag ----

export type CommentTag = {
  commentId: string;
  tags: string[];
};

// ---- Enriched Comment (Comment + Analysis joined) ----

export type EnrichedComment = Comment & {
  analysis: CommentAnalysis;
  replySuggestions: CommentReplySuggestions | null;
  tags: string[];
};

// ---- Dashboard Summary ----

export type CommentDashboardSummary = {
  totalComments: number;
  positiveRatio: number;
  negativeRatio: number;
  neutralRatio: number;
  highRiskCount: number;
  unansweredCount: number;
  faqCount: number;
  prevTotalComments: number;
  prevPositiveRatio: number;
  prevNegativeRatio: number;
  prevHighRiskCount: number;
  prevUnansweredCount: number;
};

// ---- Sentiment Distribution ----

export type SentimentDistribution = {
  label: SentimentLabel;
  count: number;
  ratio: number;
};

// ---- Topic Distribution ----

export type TopicDistribution = {
  label: TopicLabel;
  displayLabel: string;
  count: number;
};

// ---- Comment Volume Series ----

export type CommentVolumeSeries = {
  date: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
};

// ---- FAQ Item ----

export type FaqItem = {
  question: string;
  count: number;
  topicLabel: TopicLabel;
  suggestedAnswer: string;
};

// ---- Filters ----

export type CommentFilters = {
  platform?: PlatformCode;
  channelId?: string;
  contentId?: string;
  sentiment?: SentimentLabel;
  topic?: TopicLabel;
  riskLevel?: RiskLevel;
  responseStatus?: ResponseStatus;
  search?: string;
};
