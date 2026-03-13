"use client";

import { Trophy, PlaySquare } from "lucide-react";
import type { CompetitorContent } from "@/lib/competitors";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const RANK_STYLES = [
  "border-amber-300 bg-amber-50/50",
  "border-gray-300 bg-gray-50/50",
  "border-orange-200 bg-orange-50/30",
];

type CompetitorTopContentCardProps = {
  contents: CompetitorContent[];
  channelLabel: string;
};

export function CompetitorTopContentCard({
  contents,
  channelLabel,
}: CompetitorTopContentCardProps) {
  const top3 = contents.sort((a, b) => b.views - a.views).slice(0, 3);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
          {channelLabel}
        </h3>
      </div>
      <div className="space-y-2">
        {top3.map((content, i) => (
          <div
            key={content.id}
            className={`flex items-center gap-3 rounded-lg border p-2.5 ${RANK_STYLES[i] ?? "border-[var(--border)]"}`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[12px] font-bold text-[var(--foreground)] shadow-sm">
              {i + 1}
            </div>
            <div className="flex h-8 w-14 items-center justify-center rounded bg-white/80">
              <PlaySquare className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[var(--foreground)]">
                {content.contentTitle}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {fmt(content.views)} views &middot; {content.engagementRate}%
                eng.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
