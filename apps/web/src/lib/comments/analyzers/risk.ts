import type {
  RiskLevel,
  UrgencyLevel,
  SentimentLabel,
  TopicLabel,
} from "../types";

// ============================================
// Rule-based Risk Scorer (mock)
// ============================================

const HIGH_RISK_KEYWORDS = [
  "사기",
  "고소",
  "신고",
  "법적",
  "소송",
  "폭로",
  "scam",
  "fraud",
  "lawsuit",
  "report",
  "legal",
  "환불",
  "refund",
  "최악",
  "worst",
];

const MEDIUM_RISK_KEYWORDS = [
  "실망",
  "불만",
  "화나",
  "짜증",
  "왜이래",
  "disappointed",
  "angry",
  "annoying",
  "terrible",
  "awful",
  "문제",
  "오류",
  "버그",
  "problem",
  "issue",
  "broken",
];

const PROFANITY_PATTERNS = [
  /[시씨]발/i,
  /[ㅅㅆ]ㅂ/i,
  /ㅂㅅ/i,
  /개새/i,
  /병신/i,
  /미친/i,
  /fuck/i,
  /shit/i,
  /damn/i,
  /ass(?:hole)?/i,
  /bitch/i,
];

export type RiskResult = {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  urgencyLevel: UrgencyLevel;
  needsResponse: boolean;
  responsePriority: UrgencyLevel;
};

/**
 * Rule-based risk scoring.
 * Replaceable with actual moderation/NLP service.
 */
export function scoreRisk(
  text: string,
  sentimentLabel: SentimentLabel,
  topicLabel: TopicLabel,
): RiskResult {
  const lower = text.toLowerCase();
  let score = 0;

  // Keyword scoring
  for (const kw of HIGH_RISK_KEYWORDS) {
    if (lower.includes(kw)) score += 30;
  }
  for (const kw of MEDIUM_RISK_KEYWORDS) {
    if (lower.includes(kw)) score += 15;
  }

  // Profanity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) score += 25;
  }

  // Sentiment boost
  if (sentimentLabel === "negative") score += 10;

  // Sensitive topics
  if (
    ["support", "delivery", "price"].includes(topicLabel) &&
    sentimentLabel === "negative"
  ) {
    score += 10;
  }

  // Cap
  score = Math.min(score, 100);

  // Level
  const riskLevel: RiskLevel =
    score >= 50 ? "high" : score >= 20 ? "medium" : "low";

  // Urgency
  const urgencyLevel: UrgencyLevel =
    score >= 70
      ? "critical"
      : score >= 50
        ? "high"
        : score >= 20
          ? "medium"
          : "low";

  // Response need
  const needsResponse =
    riskLevel !== "low" ||
    ["inquiry", "support", "schedule", "price"].includes(topicLabel);

  const responsePriority: UrgencyLevel =
    riskLevel === "high" ? "high" : needsResponse ? "medium" : "low";

  return {
    riskLevel,
    riskScore: score,
    urgencyLevel,
    needsResponse,
    responsePriority,
  };
}
