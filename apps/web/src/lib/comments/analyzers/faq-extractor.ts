import type { TopicLabel, FaqItem, EnrichedComment } from "../types";
import { getTopicDisplayLabel } from "./topic";

// ============================================
// FAQ / Repeated Question Extractor (mock)
// ============================================

/**
 * Extract FAQ-like repeated questions from enriched comments.
 * Replaceable with actual clustering/NLP service.
 */
export function extractFaqs(comments: EnrichedComment[]): FaqItem[] {
  // Count FAQ candidates by topic
  const faqCandidates = comments.filter((c) => c.analysis.faqCandidate);

  const topicCounts: Record<TopicLabel, number> = {} as Record<
    TopicLabel,
    number
  >;
  for (const c of faqCandidates) {
    const t = c.analysis.topicLabel;
    topicCounts[t] = (topicCounts[t] ?? 0) + 1;
  }

  // Map to FAQ items with suggested answers
  const items: FaqItem[] = Object.entries(topicCounts)
    .filter(([, count]) => count >= 1)
    .map(([label, count]) => ({
      question:
        FAQ_QUESTIONS[label as TopicLabel] ??
        `Questions about ${getTopicDisplayLabel(label as TopicLabel).toLowerCase()}`,
      count,
      topicLabel: label as TopicLabel,
      suggestedAnswer:
        FAQ_ANSWERS[label as TopicLabel] ??
        "Please contact our support team for more information.",
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return items;
}

const FAQ_QUESTIONS: Partial<Record<TopicLabel, string>> = {
  price: "How much does it cost? / Are there discounts?",
  schedule: "When is the next event / upload schedule?",
  delivery: "When will my order arrive?",
  inquiry: "General product / service inquiries",
  support: "How do I fix this issue?",
  quality: "Is the quality good?",
  performance: "Why is the app/service slow?",
};

const FAQ_ANSWERS: Partial<Record<TopicLabel, string>> = {
  price:
    "Please check our official pricing page for the latest information. We periodically run promotions — follow us for updates!",
  schedule:
    "We announce schedules through our official channels. Enable notifications so you don't miss any updates!",
  delivery:
    "Standard delivery takes 2-5 business days. For order-specific inquiries, please DM us with your order number.",
  inquiry:
    "Thank you for your interest! Please visit our FAQ page or reach out via DM for detailed answers.",
  support:
    "We're sorry you're experiencing issues. Please contact our support team with details and we'll resolve it promptly.",
  quality:
    "We maintain strict quality standards. If you have specific feedback, we'd love to hear it — please DM us.",
  performance:
    "We're continuously working to improve performance. Please ensure you're using the latest version.",
};
