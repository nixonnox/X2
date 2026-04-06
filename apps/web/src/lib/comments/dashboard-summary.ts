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
    // No historical data yet — use current values (no fake deltas)
    prevTotalComments: total,
    prevPositiveRatio: total > 0 ? Math.round((positive / total) * 100) : 0,
    prevNegativeRatio: total > 0 ? Math.round((negative / total) * 100) : 0,
    prevHighRiskCount: highRisk,
    prevUnansweredCount: unanswered,
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

// TODO: 실데이터 연결 - tRPC comment.listByProject에서 날짜별 집계 사용
export function buildCommentVolumeSeries(): CommentVolumeSeries[] {
  console.warn(
    "[MOCK] buildCommentVolumeSeries called - no real time-series data connected",
  );
  return [];
}

export { extractFaqs };
