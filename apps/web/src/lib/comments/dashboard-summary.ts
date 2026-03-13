import type {
  EnrichedComment,
  CommentDashboardSummary,
  SentimentDistribution,
  TopicDistribution,
  CommentVolumeSeries,
  SentimentLabel,
  TopicLabel,
} from "./types";
import { getTopicDisplayLabel } from "./analyzers/topic";
import { extractFaqs } from "./analyzers/faq-extractor";
export type { FaqItem } from "./types";

// ============================================
// Dashboard Summary Builder
// ============================================

export function buildDashboardSummary(
  comments: EnrichedComment[],
): CommentDashboardSummary {
  const total = comments.length;
  const positive = comments.filter(
    (c) => c.analysis.sentimentLabel === "positive",
  ).length;
  const negative = comments.filter(
    (c) => c.analysis.sentimentLabel === "negative",
  ).length;
  const neutral = total - positive - negative;
  const highRisk = comments.filter(
    (c) => c.analysis.riskLevel === "high",
  ).length;
  const unanswered = comments.filter(
    (c) => c.status === "unanswered" && c.analysis.needsResponse,
  ).length;
  const faq = comments.filter((c) => c.analysis.faqCandidate).length;

  return {
    totalComments: total,
    positiveRatio: total > 0 ? Math.round((positive / total) * 100) : 0,
    negativeRatio: total > 0 ? Math.round((negative / total) * 100) : 0,
    neutralRatio: total > 0 ? Math.round((neutral / total) * 100) : 0,
    highRiskCount: highRisk,
    unansweredCount: unanswered,
    faqCount: faq,
    // Mock previous period values
    prevTotalComments: Math.round(total * 0.88),
    prevPositiveRatio: total > 0 ? Math.round((positive / total) * 100) - 3 : 0,
    prevNegativeRatio: total > 0 ? Math.round((negative / total) * 100) + 2 : 0,
    prevHighRiskCount: Math.max(highRisk - 1, 0),
    prevUnansweredCount: Math.round(unanswered * 1.2),
  };
}

export function buildSentimentDistribution(
  comments: EnrichedComment[],
): SentimentDistribution[] {
  const total = comments.length;
  const counts: Record<SentimentLabel, number> = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };
  for (const c of comments) {
    counts[c.analysis.sentimentLabel]++;
  }
  return [
    {
      label: "positive",
      count: counts.positive,
      ratio: total > 0 ? Math.round((counts.positive / total) * 100) : 0,
    },
    {
      label: "neutral",
      count: counts.neutral,
      ratio: total > 0 ? Math.round((counts.neutral / total) * 100) : 0,
    },
    {
      label: "negative",
      count: counts.negative,
      ratio: total > 0 ? Math.round((counts.negative / total) * 100) : 0,
    },
  ];
}

export function buildTopicDistribution(
  comments: EnrichedComment[],
): TopicDistribution[] {
  const counts: Partial<Record<TopicLabel, number>> = {};
  for (const c of comments) {
    const t = c.analysis.topicLabel;
    counts[t] = (counts[t] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => ({
      label: label as TopicLabel,
      displayLabel: getTopicDisplayLabel(label as TopicLabel),
      count: count ?? 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function buildCommentVolumeSeries(): CommentVolumeSeries[] {
  // Mock time series for last 7 days
  const days = ["Mar 1", "Mar 2", "Mar 3", "Mar 4", "Mar 5", "Mar 6", "Mar 7"];
  return days.map((date) => {
    const total = Math.round(15 + Math.random() * 25);
    const positive = Math.round(total * (0.35 + Math.random() * 0.2));
    const negative = Math.round(total * (0.1 + Math.random() * 0.15));
    const neutral = total - positive - negative;
    return { date, total, positive, negative, neutral };
  });
}

export { extractFaqs };
