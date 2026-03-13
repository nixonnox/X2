"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ReportKpiSummary } from "@/lib/reports";

type KpiItem = {
  label: string;
  value: string;
  change: number;
  changeLabel: string;
};

function formatKpi(summary: ReportKpiSummary): KpiItem[] {
  return [
    {
      label: "총 조회수",
      value: summary.totalViews.value.toLocaleString(),
      change: summary.totalViews.change,
      changeLabel: summary.totalViews.changeLabel,
    },
    {
      label: "참여율",
      value: `${summary.engagementRate.value}%`,
      change: summary.engagementRate.change,
      changeLabel: summary.engagementRate.changeLabel,
    },
    {
      label: "팔로워 변화",
      value: `${summary.followerChange.value > 0 ? "+" : ""}${summary.followerChange.value.toLocaleString()}`,
      change: summary.followerChange.change,
      changeLabel: summary.followerChange.changeLabel,
    },
    {
      label: "댓글 수",
      value: summary.commentCount.value.toLocaleString(),
      change: summary.commentCount.change,
      changeLabel: summary.commentCount.changeLabel,
    },
    {
      label: "부정 비율",
      value: `${summary.negativeRatio.value}%`,
      change: summary.negativeRatio.change,
      changeLabel: summary.negativeRatio.changeLabel,
    },
    {
      label: "언급 수",
      value: summary.mentionCount.value.toLocaleString(),
      change: summary.mentionCount.change,
      changeLabel: summary.mentionCount.changeLabel,
    },
  ];
}

function TrendIcon({ change }: { change: number }) {
  if (change > 0)
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (change < 0) return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />;
}

export function ReportKpiGrid({ summary }: { summary: ReportKpiSummary }) {
  const items = formatKpi(summary);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="card p-3">
          <p className="mb-1 text-[11px] text-[var(--muted-foreground)]">
            {item.label}
          </p>
          <p className="text-[18px] font-semibold text-[var(--foreground)]">
            {item.value}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <TrendIcon change={item.change} />
            <span
              className={`text-[11px] ${item.change > 0 ? "text-emerald-600" : item.change < 0 ? "text-red-600" : "text-[var(--muted-foreground)]"}`}
            >
              {item.changeLabel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
