"use client";

import { Loader2 } from "lucide-react";
import { DemoBanner } from "@/components/shared";
import { useCurrentProject } from "@/hooks/use-current-project";
import { trpc } from "@/lib/trpc";
import DashboardView from "./dashboard-view";
import type {
  DashboardKpi,
  DashboardChartPoint,
  DashboardContent,
} from "./dashboard-view";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DashboardPage() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const { data: summary, isLoading: summaryLoading } =
    trpc.analytics.dashboardSummary.useQuery(
      { projectId: projectId! },
      { enabled: !!projectId },
    );

  const isLoading = projectLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!projectId || !summary) {
    return (
      <div className="space-y-4">
        <DashboardView
          hasChannels={false}
          kpis={[]}
          chartSeries={[]}
          recentContents={[]}
        />
      </div>
    );
  }

  // ---- Aggregate KPIs from real data ----
  const { channels, totals, recentContents: recent } = summary;

  const avgEngagement =
    channels.length > 0
      ? (
          channels.reduce(
            (sum, ch) => sum + (ch.lastSnapshot?.avgEngagement ?? 0),
            0,
          ) / channels.length
        ).toFixed(1)
      : "0";

  const kpis: DashboardKpi[] = [
    {
      label: "총 조회수",
      value: formatCount(
        channels.reduce(
          (s, c) => s + Number(c.lastSnapshot?.totalViews ?? 0),
          0,
        ),
      ),
      change: "",
      changeType: "positive",
      trend: [],
    },
    {
      label: "총 구독자/팔로워",
      value: formatCount(totals.totalSubscribers),
      change: "",
      changeType: "positive",
      trend: [],
    },
    {
      label: "평균 참여율",
      value: `${avgEngagement}%`,
      change: "",
      changeType: "positive",
      trend: [],
    },
    {
      label: "총 콘텐츠",
      value: formatCount(totals.totalContents),
      change: "",
      changeType: "positive",
      trend: [],
    },
    {
      label: "등록 채널",
      value: String(totals.channelCount),
      change: "",
      changeType: "positive",
      trend: [],
    },
    {
      label: "총 댓글",
      value: formatCount(totals.totalComments),
      change: "",
      changeType: "positive",
      trend: [],
    },
  ];

  // ---- Chart data from snapshots ----
  const chartSeries: DashboardChartPoint[] = [];
  // TODO: Populate from channel snapshots when historical data exists

  // ---- Recent contents ----
  const recentContents: DashboardContent[] = (recent ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    platform: c.channel?.platform ?? "",
    views: Number(c.viewCount),
    engagement: c.engagementRate,
    publishedAt: c.publishedAt?.toISOString?.() ?? "",
  }));

  return (
    <div className="space-y-4">
      {totals.channelCount === 0 && (
        <DemoBanner message="채널을 연결하면 실제 데이터를 확인할 수 있습니다." />
      )}
      <DashboardView
        hasChannels={totals.channelCount > 0}
        kpis={kpis}
        chartSeries={chartSeries}
        recentContents={recentContents}
      />
    </div>
  );
}
