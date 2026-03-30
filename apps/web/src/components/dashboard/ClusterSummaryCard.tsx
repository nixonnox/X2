"use client";

import Link from "next/link";
import { Layers, ArrowRight, Sparkles } from "lucide-react";

type ClusterItem = {
  label?: string;
  memberCount?: number;
  dominantIntent?: string;
  topKeywords?: string[];
};

type ClusterSummaryCardProps = {
  clusters?: ClusterItem[];
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
};

export function ClusterSummaryCard({
  clusters,
  confidence,
  freshness,
}: ClusterSummaryCardProps) {
  const hasData = clusters && clusters.length > 0;

  return (
    <Link href="/cluster-finder" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50">
              <Layers className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              핵심 의도 클러스터
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
            {clusters!.map((cluster, i) => (
              <li
                key={i}
                className="rounded-md bg-[var(--secondary)]/50 px-2.5 py-2 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[var(--foreground)]">
                    {cluster.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {cluster.dominantIntent && (
                      <span className="badge bg-amber-100 text-amber-700 text-[10px]">
                        {cluster.dominantIntent}
                      </span>
                    )}
                    {cluster.memberCount != null && (
                      <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                        {cluster.memberCount.toLocaleString()}개
                      </span>
                    )}
                  </div>
                </div>
                {cluster.topKeywords && cluster.topKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cluster.topKeywords.slice(0, 3).map((kw, j) => (
                      <span
                        key={j}
                        className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <Layers className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              클러스터 분석 후
              <br />
              핵심 의도 그룹이 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
