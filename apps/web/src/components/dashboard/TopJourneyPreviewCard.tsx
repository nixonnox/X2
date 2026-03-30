"use client";

import Link from "next/link";
import { Route, ArrowRight, ChevronRight, Sparkles } from "lucide-react";

type PathItem = {
  pathLabel?: string;
  steps?: string[];
  dominantIntent?: string;
  pathScore?: number;
};

type TopJourneyPreviewCardProps = {
  paths?: PathItem[];
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
};

export function TopJourneyPreviewCard({
  paths,
  confidence,
  freshness,
}: TopJourneyPreviewCardProps) {
  const hasData = paths && paths.length > 0;
  const top3 = hasData ? paths.slice(0, 3) : [];

  return (
    <Link href="/pathfinder" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-50">
              <Route className="h-3.5 w-3.5 text-violet-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              대표 탐색 경로
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {confidence != null && (
              <span className="flex items-center gap-1 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                <Sparkles className="h-3 w-3" />
                {confidence}%
              </span>
            )}
            {freshness && (
              <span
                className={`badge text-[10px] ${
                  freshness === "fresh"
                    ? "bg-emerald-100 text-emerald-700"
                    : freshness === "stale"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                }`}
              >
                {freshness === "fresh"
                  ? "최신"
                  : freshness === "stale"
                    ? "갱신 필요"
                    : "확인 중"}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Content */}
        {hasData ? (
          <ul className="mt-3 space-y-2.5">
            {top3.map((path, i) => (
              <li key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[var(--foreground)]">
                    {path.pathLabel}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {path.dominantIntent && (
                      <span className="badge bg-violet-100 text-violet-700 text-[10px]">
                        {path.dominantIntent}
                      </span>
                    )}
                    {path.pathScore != null && (
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {path.pathScore}점
                      </span>
                    )}
                  </div>
                </div>
                {path.steps && path.steps.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    {path.steps.map((step, j) => (
                      <span key={j} className="flex items-center gap-1">
                        <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                          {step}
                        </span>
                        {j < path.steps!.length - 1 && (
                          <ChevronRight className="h-3 w-3 text-[var(--muted-foreground)]/50" />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <Route className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              검색 여정 분석 후
              <br />
              대표 탐색 경로가 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
