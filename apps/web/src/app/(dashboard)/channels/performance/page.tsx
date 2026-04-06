"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import { getPlatformLabel } from "@/lib/channels";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function ChannelPerformancePage() {
  const { projectId, isLoading: projLoading } = useCurrentProject();

  const { data: channels, isLoading: chLoading } = trpc.channel.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const isLoading = projLoading || chLoading;

  const rows = useMemo(() => {
    if (!channels) return [];
    return (channels as any[]).map((ch) => ({
      id: ch.id,
      name: ch.name,
      platform: getPlatformLabel(
        (ch.platform?.toLowerCase() ?? "youtube") as any,
      ),
      subscribers: ch.subscriberCount ?? 0,
      views: 0,
      engagementRate: 0,
      growthRate: 0,
      contentCount: ch.contentCount ?? 0,
    }));
  }, [channels]);

  const totals = useMemo(() => {
    const totalSubs = rows.reduce((s, r) => s + r.subscribers, 0);
    const totalContents = rows.reduce((s, r) => s + r.contentCount, 0);
    return { totalSubs, totalContents };
  }, [rows]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
            채널 성과 분석
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            등록된 채널의 성과 지표를 한눈에 비교합니다.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-gray-900">
            성과 데이터가 없어요
          </h3>
          <p className="mt-2 max-w-sm text-center text-[13px] text-gray-500">
            채널을 등록하면 구독자, 조회수, 참여율 등 성과 지표를 자동으로
            분석해요.
          </p>
          <a
            href="/channels/new"
            className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            채널 등록하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          채널 성과 분석
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          등록된 채널의 성과 지표를 한눈에 비교합니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "총 구독자", value: fmt(totals.totalSubs) },
          { label: "등록 채널", value: `${rows.length}개` },
          { label: "총 콘텐츠", value: fmt(totals.totalContents) },
        ].map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {kpi.label}
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[var(--foreground)]">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Channel Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                채널
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                플랫폼
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                구독자
              </th>
              <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                콘텐츠
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((ch) => (
              <tr
                key={ch.id}
                className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
              >
                <td className="px-4 py-2.5 font-medium">{ch.name}</td>
                <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                  {ch.platform}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {fmt(ch.subscribers)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {fmt(ch.contentCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
