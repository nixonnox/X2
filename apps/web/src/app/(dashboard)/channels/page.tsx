"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import { ChannelsListView } from "./channels-list-view";
import type { Channel, ChannelSnapshot } from "@/lib/channels/types";

export default function ChannelsPage() {
  const { projectId, isLoading: projLoading } = useCurrentProject();

  const { data: channels, isLoading: chLoading } = trpc.channel.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const isLoading = projLoading || chLoading;

  const mapped = useMemo<Channel[]>(() => {
    if (!channels) return [];
    return channels.map((ch: any) => ({
      id: ch.id,
      platformCode: ch.platform?.toLowerCase() ?? "youtube",
      platformLabel: ch.platform ?? "YouTube",
      analysisMode:
        ch.connectionType === "CONNECTED" ? "api_advanced" : "url_basic",
      name: ch.name,
      url: ch.url,
      country: "KR",
      category: "",
      tags: [],
      channelType: ch.channelType?.toLowerCase() ?? "owned",
      isCompetitor: ch.channelType === "COMPETITOR",
      status: ch.status?.toLowerCase() ?? "active",
      customPlatformName: null,
      thumbnailUrl: ch.thumbnailUrl ?? null,
      createdAt: ch.createdAt?.toISOString?.() ?? "",
      updatedAt: ch.updatedAt?.toISOString?.() ?? "",
    }));
  }, [channels]);

  const snapshots = useMemo<Record<string, ChannelSnapshot | undefined>>(() => {
    if (!channels) return {};
    const result: Record<string, ChannelSnapshot | undefined> = {};
    for (const ch of channels as any[]) {
      result[ch.id] = {
        channelId: ch.id,
        snapshotDate: new Date().toISOString(),
        audienceCount: ch.subscriberCount ?? 0,
        audienceLabel: "구독자",
        totalContents: ch.contentCount ?? 0,
        totalViewsOrReach: 0,
        engagementRate: 0,
        growthRate30d: 0,
        uploads30d: 0,
      };
    }
    return result;
  }, [channels]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return <ChannelsListView initialChannels={mapped} snapshots={snapshots} />;
}
