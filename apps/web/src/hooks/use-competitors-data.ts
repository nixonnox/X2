"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "./use-current-project";
import type { CompetitorChannel } from "@/lib/competitors/types";

/**
 * tRPC에서 경쟁 채널 데이터를 가져오는 훅.
 * 기존 competitorService를 대체한다.
 */
export function useCompetitorsData() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const { data: compareData, isLoading: compareLoading } =
    trpc.competitor.compare.useQuery(
      { projectId: projectId! },
      { enabled: !!projectId },
    );

  const ownChannels = useMemo(() => {
    return (compareData?.ownChannels ?? []).map((ch: any) => ({
      id: ch.id,
      channelName: ch.name,
      platform: ch.platform?.toLowerCase() ?? "youtube",
      subscriberCount: ch.subscriberCount,
      contentCount: ch.contentCount,
      thumbnailUrl: ch.thumbnailUrl,
    }));
  }, [compareData?.ownChannels]);

  const competitors = useMemo<CompetitorChannel[]>(() => {
    return (compareData?.competitors ?? []).map((ch: any) => ({
      id: ch.id,
      platform: ch.platform?.toLowerCase() ?? "youtube",
      channelName: ch.name,
      url: "",
      competitorType: "direct_competitor" as const,
      addedAt: new Date().toISOString(),
      thumbnailUrl: ch.thumbnailUrl,
    }));
  }, [compareData?.competitors]);

  return {
    ownChannels,
    competitors,
    isLoading: projectLoading || compareLoading,
    hasData: competitors.length > 0,
    projectId,
  };
}
