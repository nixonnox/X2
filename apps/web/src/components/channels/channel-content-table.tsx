"use client";

import {
  PlaySquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
} from "lucide-react";
import type { ChannelContent } from "@/lib/channels/types";
import { formatCount } from "@/lib/channels/metric-resolver";

type Props = {
  contents: ChannelContent[];
  viewsLabel?: string;
};

function getPerformanceBadge(
  content: ChannelContent,
  avgViews: number,
  avgEngagement: number,
) {
  const viewsRatio = content.viewsOrReach / Math.max(avgViews, 1);
  const engRatio = content.engagementRate / Math.max(avgEngagement, 1);

  if (viewsRatio >= 1.5 && engRatio >= 1.2) {
    return {
      label: "Top",
      color: "bg-emerald-50 text-emerald-700",
      icon: Star,
    };
  }
  if (viewsRatio >= 1.2 || engRatio >= 1.3) {
    return {
      label: "Above Avg",
      color: "bg-blue-50 text-blue-700",
      icon: TrendingUp,
    };
  }
  if (viewsRatio < 0.5 || engRatio < 0.5) {
    return {
      label: "Below Avg",
      color: "bg-red-50 text-red-700",
      icon: TrendingDown,
    };
  }
  return {
    label: "Average",
    color: "bg-[var(--secondary)] text-[var(--muted-foreground)]",
    icon: Minus,
  };
}

export function ChannelContentTable({ contents, viewsLabel = "Views" }: Props) {
  if (contents.length === 0) {
    return (
      <div className="card border-dashed p-8 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          No content data available.
        </p>
      </div>
    );
  }

  const avgViews =
    contents.reduce((s, c) => s + c.viewsOrReach, 0) / contents.length;
  const avgEngagement =
    contents.reduce((s, c) => s + c.engagementRate, 0) / contents.length;

  // Top performer highlight
  const topContent = [...contents].sort(
    (a, b) => b.viewsOrReach - a.viewsOrReach,
  )[0];

  return (
    <div className="space-y-3">
      {/* Top performer highlight */}
      {topContent && (
        <div className="card border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[12px] font-semibold text-emerald-700">
              Top Performer
            </span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[var(--foreground)]">
            {topContent.title}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
            <span>
              {formatCount(topContent.viewsOrReach)} {viewsLabel.toLowerCase()}
            </span>
            <span>·</span>
            <span>{topContent.engagementRate}% engagement</span>
            <span>·</span>
            <span>{topContent.commentsCount} comments</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]"></th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Published
                </th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Type
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  {viewsLabel}
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Engagement
                </th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Comments
                </th>
                <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {contents.map((c) => {
                const perf = getPerformanceBadge(c, avgViews, avgEngagement);
                const PerfIcon = perf.icon;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border-subtle)] transition-colors last:border-0 hover:bg-[var(--secondary)]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex h-8 w-12 items-center justify-center rounded bg-[var(--secondary)]">
                        <PlaySquare className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="max-w-xs truncate font-medium">{c.title}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {c.publishedAt}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge bg-[var(--secondary)] capitalize text-[var(--muted-foreground)]">
                        {c.contentType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      {formatCount(c.viewsOrReach)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                      {c.engagementRate}%
                    </td>
                    <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                      {c.commentsCount}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`badge ${perf.color} gap-0.5 text-[10px]`}
                      >
                        <PerfIcon className="h-2.5 w-2.5" />
                        {perf.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="flex items-center gap-4 border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--muted-foreground)]">
          <span>
            Avg. {viewsLabel.toLowerCase()}:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {formatCount(Math.round(avgViews))}
            </span>
          </span>
          <span>·</span>
          <span>
            Avg. engagement:{" "}
            <span className="font-medium text-[var(--foreground)]">
              {avgEngagement.toFixed(1)}%
            </span>
          </span>
          <span>·</span>
          <span>{contents.length} items</span>
        </div>
      </div>
    </div>
  );
}
