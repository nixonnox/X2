import type { SentimentLabel } from "../types";

// ============================================
// Rule-based Sentiment Analyzer (mock)
// ============================================

const POSITIVE_KEYWORDS = [
  "좋아요",
  "최고",
  "대박",
  "재밌",
  "감사",
  "응원",
  "사랑",
  "멋져",
  "훌륭",
  "추천",
  "잘했",
  "기대",
  "완벽",
  "감동",
  "love",
  "great",
  "amazing",
  "awesome",
  "best",
  "good",
  "thanks",
  "excellent",
  "fantastic",
  "wonderful",
  "helpful",
  "nice",
  "cool",
  "beautiful",
  "perfect",
  "recommend",
];

const NEGATIVE_KEYWORDS = [
  "별로",
  "실망",
  "짜증",
  "화나",
  "싫어",
  "최악",
  "불만",
  "왜이래",
  "환불",
  "사기",
  "거짓",
  "엉망",
  "후회",
  "문제",
  "bad",
  "terrible",
  "worst",
  "hate",
  "disappointed",
  "awful",
  "horrible",
  "scam",
  "refund",
  "angry",
  "waste",
  "poor",
  "broken",
  "annoying",
  "useless",
];

export type SentimentResult = {
  label: SentimentLabel;
  score: number; // -1 to 1
};

/**
 * Rule-based sentiment analysis.
 * Replaceable with actual NLP/LLM service.
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();

  let positiveHits = 0;
  let negativeHits = 0;

  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) positiveHits++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) negativeHits++;
  }

  if (positiveHits > negativeHits) {
    const score = Math.min(0.3 + positiveHits * 0.15, 1);
    return { label: "positive", score };
  }
  if (negativeHits > positiveHits) {
    const score = Math.max(-0.3 - negativeHits * 0.15, -1);
    return { label: "negative", score };
  }

  return { label: "neutral", score: 0 };
}
