"use client";

import { use } from "react";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ChannelDetailView } from "./channel-detail-view";
import type {
  Channel,
  ChannelSnapshot,
  ChannelSnapshotSeries,
  ChannelContent,
} from "@/lib/channels/types";

export default function ChannelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: channelData, isLoading } = trpc.channel.get.useQuery({ id });

  const { data: contentsData } = trpc.content.listByChannel.useQuery(
    { channelId: id, pageSize: 20 },
    { enabled: !!channelData },
  );

  const channel = useMemo<Channel | null>(() => {
    if (!channelData) return null;
    const ch = channelData as any;
    return {
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
    };
  }, [channelData]);

  const snapshot = useMemo<ChannelSnapshot | undefined>(() => {
    if (!channelData) return undefined;
    const ch = channelData as any;
    const latestSnap = ch.snapshots?.[0];
    return {
      channelId: ch.id,
      snapshotDate:
        latestSnap?.date?.toISOString?.() ?? new Date().toISOString(),
      audienceCount: ch.subscriberCount ?? 0,
      audienceLabel: "구독자",
      totalContents: ch.contentCount ?? 0,
      totalViewsOrReach: Number(latestSnap?.totalViews ?? 0),
      engagementRate: latestSnap?.avgEngagement ?? 0,
      growthRate30d: latestSnap?.followerGrowthRate ?? 0,
      uploads30d: 0,
    };
  }, [channelData]);

  const series = useMemo<ChannelSnapshotSeries[]>(() => {
    if (!channelData) return [];
    const ch = channelData as any;
    return (ch.snapshots ?? []).map((s: any) => ({
      date: s.date?.toISOString?.()?.slice(0, 7) ?? "",
      audienceCount: s.subscriberCount ?? 0,
      totalViewsOrReach: Number(s.totalViews ?? 0),
      engagementRate: s.avgEngagement ?? 0,
    }));
  }, [channelData]);

  const contents = useMemo<ChannelContent[]>(() => {
    if (!contentsData?.items) return [];
    return contentsData.items.map((c: any) => ({
      id: c.id,
      channelId: id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl ?? null,
      contentType: c.type?.toLowerCase() ?? "video",
      publishedAt: c.publishedAt?.toISOString?.() ?? "",
      viewsOrReach: Number(c.viewCount ?? 0),
      engagementRate: c.engagementRate ?? 0,
      commentsCount: c.commentCount ?? 0,
    }));
  }, [contentsData?.items, id]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--muted-foreground)]">
        채널을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <ChannelDetailView
      channel={channel}
      snapshot={snapshot}
      series={series}
      contents={contents}
      contentTypeDist={[]}
      insight={undefined}
    />
  );
}
