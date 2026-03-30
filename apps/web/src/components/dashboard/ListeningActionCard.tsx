"use client";

import Link from "next/link";
import { Lightbulb, ArrowRight, Sparkles } from "lucide-react";

type ActionItem = {
  title?: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  owner?: string;
};

type ListeningActionCardProps = {
  actions?: ActionItem[];
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
};

const PRIORITY_CONFIG = {
  high: { label: "높음", bg: "bg-red-100", color: "text-red-700" },
  medium: { label: "보통", bg: "bg-amber-100", color: "text-amber-700" },
  low: { label: "낮음", bg: "bg-blue-100", color: "text-blue-700" },
} as const;

export function ListeningActionCard({
  actions,
  confidence,
  freshness,
}: ListeningActionCardProps) {
  const hasData = actions && actions.length > 0;

  return (
    <Link href="/insights/actions" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              추천 액션
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
          <ul className="mt-3 space-y-2">
            {actions!.map((action, i) => {
              const pri = action.priority
                ? PRIORITY_CONFIG[action.priority]
                : null;
              return (
                <li
                  key={i}
                  className="flex items-start justify-between gap-2 rounded-md bg-[var(--secondary)]/50 px-2.5 py-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-[12px] font-medium text-[var(--foreground)] line-clamp-1">
                      {action.title}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {action.category && (
                        <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                          {action.category}
                        </span>
                      )}
                      {action.owner && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {action.owner}
                        </span>
                      )}
                    </div>
                  </div>
                  {pri && (
                    <span
                      className={`badge shrink-0 text-[10px] ${pri.bg} ${pri.color}`}
                    >
                      {pri.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <Lightbulb className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              검색 인텔리전스 분석 후
              <br />
              추천 액션이 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
