import type {
  Comment,
  CommentAnalysis,
  EnrichedComment,
  CommentFilters,
  CommentReplySuggestions,
} from "./types";
import { MOCK_COMMENTS } from "./mock-data";
import { analyzeSentiment } from "./analyzers/sentiment";
import { classifyTopic } from "./analyzers/topic";
import { scoreRisk } from "./analyzers/risk";
import { generateReplySuggestions } from "./analyzers/response-suggestion";

// ============================================
// Comment Analysis Service
// ============================================

/**
 * Analyze a single comment and return CommentAnalysis.
 * Replaceable with actual AI pipeline.
 */
function analyzeComment(comment: Comment): CommentAnalysis {
  const sentiment = analyzeSentiment(comment.commentText);
  const topic = classifyTopic(comment.commentText);
  const risk = scoreRisk(comment.commentText, sentiment.label, topic.label);

  // FAQ candidate: question-like comments in inquiry/schedule/price/support topics
  const faqCandidate =
    risk.needsResponse &&
    ["inquiry", "schedule", "price", "support", "delivery"].includes(
      topic.label,
    );

  return {
    commentId: comment.id,
    sentimentLabel: sentiment.label,
    sentimentScore: sentiment.score,
    topicLabel: topic.label,
    topicConfidence: topic.confidence,
    riskLevel: risk.riskLevel,
    riskScore: risk.riskScore,
    needsResponse: risk.needsResponse,
    responsePriority: risk.responsePriority,
    faqCandidate,
    urgencyLevel: risk.urgencyLevel,
    summary: generateSummary(
      comment,
      sentiment.label,
      topic.label,
      risk.riskLevel,
    ),
  };
}

function generateSummary(
  comment: Comment,
  sentiment: string,
  topic: string,
  risk: string,
): string {
  const parts: string[] = [];
  parts.push(`${sentiment} comment about ${topic}`);
  if (risk === "high") parts.push("— requires urgent attention");
  else if (risk === "medium") parts.push("— moderate attention needed");
  parts.push(`from ${comment.authorName} on ${comment.channelName}`);
  return parts.join(" ");
}

// ============================================
// In-memory cache
// ============================================

let analysisCache: Map<string, CommentAnalysis> | null = null;
let enrichedCache: EnrichedComment[] | null = null;

function getAnalysisMap(): Map<string, CommentAnalysis> {
  if (!analysisCache) {
    analysisCache = new Map();
    for (const c of MOCK_COMMENTS) {
      analysisCache.set(c.id, analyzeComment(c));
    }
  }
  return analysisCache;
}

function getEnrichedComments(): EnrichedComment[] {
  if (!enrichedCache) {
    const analyses = getAnalysisMap();
    enrichedCache = MOCK_COMMENTS.map((c) => {
      const analysis = analyses.get(c.id)!;
      const replySuggestions = generateReplySuggestions(
        c.id,
        analysis.sentimentLabel,
        analysis.topicLabel,
        analysis.riskLevel,
      );
      return {
        ...c,
        analysis,
        replySuggestions,
        tags: generateTags(analysis),
      };
    });
  }
  return enrichedCache;
}

function generateTags(analysis: CommentAnalysis): string[] {
  const tags: string[] = [];
  if (analysis.riskLevel === "high") tags.push("urgent");
  if (analysis.faqCandidate) tags.push("faq");
  if (analysis.needsResponse) tags.push("needs-reply");
  if (analysis.topicLabel === "spam") tags.push("spam");
  return tags;
}

// ============================================
// Public Service API
// ============================================

export const commentService = {
  getAllEnriched(): EnrichedComment[] {
    return getEnrichedComments();
  },

  getFiltered(filters: CommentFilters): EnrichedComment[] {
    let result = getEnrichedComments();

    if (filters.platform) {
      result = result.filter((c) => c.platformCode === filters.platform);
    }
    if (filters.channelId) {
      result = result.filter((c) => c.channelId === filters.channelId);
    }
    if (filters.contentId) {
      result = result.filter((c) => c.contentId === filters.contentId);
    }
    if (filters.sentiment) {
      result = result.filter(
        (c) => c.analysis.sentimentLabel === filters.sentiment,
      );
    }
    if (filters.topic) {
      result = result.filter((c) => c.analysis.topicLabel === filters.topic);
    }
    if (filters.riskLevel) {
      result = result.filter((c) => c.analysis.riskLevel === filters.riskLevel);
    }
    if (filters.responseStatus) {
      result = result.filter((c) => c.status === filters.responseStatus);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.commentText.toLowerCase().includes(q) ||
          c.authorName.toLowerCase().includes(q) ||
          c.contentTitle.toLowerCase().includes(q) ||
          c.channelName.toLowerCase().includes(q),
      );
    }

    return result;
  },

  getById(id: string): EnrichedComment | undefined {
    return getEnrichedComments().find((c) => c.id === id);
  },

  getAnalysis(commentId: string): CommentAnalysis | undefined {
    return getAnalysisMap().get(commentId);
  },

  getReplySuggestions(commentId: string): CommentReplySuggestions | null {
    const comment = getEnrichedComments().find((c) => c.id === commentId);
    return comment?.replySuggestions ?? null;
  },

  getHighRiskComments(): EnrichedComment[] {
    return getEnrichedComments().filter((c) => c.analysis.riskLevel === "high");
  },

  getUnanswered(): EnrichedComment[] {
    return getEnrichedComments().filter(
      (c) => c.status === "unanswered" && c.analysis.needsResponse,
    );
  },

  getUniqueChannels(): { id: string; name: string; platformCode: string }[] {
    const seen = new Map<
      string,
      { id: string; name: string; platformCode: string }
    >();
    for (const c of MOCK_COMMENTS) {
      if (!seen.has(c.channelId)) {
        seen.set(c.channelId, {
          id: c.channelId,
          name: c.channelName,
          platformCode: c.platformCode,
        });
      }
    }
    return Array.from(seen.values());
  },
};
