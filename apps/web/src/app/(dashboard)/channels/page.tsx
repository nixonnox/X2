"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import { ChannelsListView } from "./channels-list-view";
import { getPlatformLabel } from "@/lib/channels";
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
      platformLabel: getPlatformLabel(
        (ch.platform?.toLowerCase() ?? "youtube") as any,
      ),
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
        audienceCount: ch.subscriberCount ?? null,
        audienceLabel: "구독자",
        totalContents: ch.contentCount ?? null,
        totalViewsOrReach: null,
        engagementRate: ch.avgEngagement ?? null,
        growthRate30d: null,
        uploads30d: null,
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

  if (mapped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <span className="text-2xl">📺</span>
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-gray-900">
          등록된 채널이 없어요
        </h3>
        <p className="mt-2 max-w-sm text-center text-[13px] text-gray-500">
          YouTube, Instagram, TikTok 등 분석하고 싶은 채널을 등록하면 성과
          데이터를 자동으로 수집해요.
        </p>
        <a
          href="/channels/new"
          className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          채널 등록하기
        </a>
      </div>
    );
  }

  return <ChannelsListView initialChannels={mapped} snapshots={snapshots} />;
}
