"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "./use-current-project";
import type {
  EnrichedComment,
  SentimentLabel,
  TopicLabel,
  RiskLevel,
} from "@/lib/comments/types";

/**
 * tRPC에서 댓글 데이터를 가져와 EnrichedComment[] 형태로 변환하는 훅.
 * 기존 commentService를 대체한다.
 */
export function useCommentsData() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const { data, isLoading: commentsLoading } =
    trpc.comment.listByProject.useQuery(
      { projectId: projectId!, pageSize: 100 },
      { enabled: !!projectId },
    );

  const { data: statsData } = trpc.comment.sentimentStats.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const enriched = useMemo<EnrichedComment[]>(() => {
    if (!data?.items) return [];
    return data.items.map((item: any) => mapToEnrichedComment(item));
  }, [data?.items]);

  const channels = useMemo(() => {
    const map = new Map<string, { name: string; platformCode: string }>();
    for (const c of enriched) {
      if (!map.has(c.channelId)) {
        map.set(c.channelId, {
          name: c.channelName,
          platformCode: c.platformCode,
        });
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      platformCode: v.platformCode,
    }));
  }, [enriched]);

  return {
    comments: enriched,
    channels,
    sentimentStats: statsData ?? [],
    isLoading: projectLoading || commentsLoading,
    hasData: enriched.length > 0,
    total: data?.total ?? 0,
  };
}

function mapSentiment(dbSentiment: string | undefined): SentimentLabel {
  switch (dbSentiment?.toUpperCase()) {
    case "POSITIVE":
      return "positive";
    case "NEGATIVE":
      return "negative";
    default:
      return "neutral";
  }
}

function mapTopic(topics: string[] | undefined): TopicLabel {
  const first = topics?.[0]?.toLowerCase();
  const valid: TopicLabel[] = [
    "price",
    "quality",
    "design",
    "service",
    "delivery",
    "schedule",
    "performance",
    "inquiry",
    "support",
    "spam",
  ];
  return (valid.includes(first as TopicLabel) ? first : "other") as TopicLabel;
}

function mapRiskLevel(
  dbRiskLevel: string | undefined,
  isRisk: boolean | undefined,
): RiskLevel {
  if (!isRisk) return "low";
  switch (dbRiskLevel?.toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "high";
    case "MEDIUM":
      return "medium";
    default:
      return "low";
  }
}

function mapToEnrichedComment(item: any): EnrichedComment {
  const analysis = item.analysis;
  const content = item.content;

  return {
    id: item.id,
    platformCode: (item.platform?.toLowerCase() ?? "youtube") as any,
    channelId: content?.channelId ?? "",
    channelName: content?.title ?? "",
    contentId: item.contentId,
    contentTitle: content?.title ?? "",
    authorName: item.authorName,
    authorProfileUrl: item.authorProfileUrl ?? null,
    commentText: item.text,
    postedAt: item.publishedAt?.toISOString?.() ?? new Date().toISOString(),
    likeCount: item.likeCount ?? 0,
    replyCount: item.replyCount ?? 0,
    language: analysis?.language ?? "ko",
    status: "unanswered",
    analysis: {
      commentId: item.id,
      sentimentLabel: mapSentiment(analysis?.sentiment),
      sentimentScore: analysis?.sentimentScore ?? 0,
      topicLabel: mapTopic(analysis?.topics),
      topicConfidence: analysis?.topicConfidence ?? 0,
      riskLevel: mapRiskLevel(analysis?.riskLevel, analysis?.isRisk),
      riskScore: analysis?.isRisk ? 70 : 10,
      needsResponse: analysis?.isQuestion ?? false,
      responsePriority: analysis?.isRisk ? "high" : "low",
      faqCandidate: analysis?.isQuestion ?? false,
      urgencyLevel: analysis?.isRisk ? "high" : "low",
      summary: analysis?.sentimentReason ?? item.text.slice(0, 100),
    },
    replySuggestions: analysis?.suggestedReply
      ? {
          commentId: item.id,
          suggestions: [
            {
              id: "s1",
              text: analysis.suggestedReply,
              tone: "friendly" as const,
              recommended: true,
            },
          ],
        }
      : null,
    tags: analysis?.topics ?? [],
  };
}
