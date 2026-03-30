"use client";

import Link from "next/link";
import { Users, ArrowRight, Sparkles } from "lucide-react";

type PersonaItem = {
  name?: string;
  archetype?: string;
  percentage?: number;
  description?: string;
  color?: string;
};

type PersonaSummaryCardProps = {
  personas?: PersonaItem[];
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
};

export function PersonaSummaryCard({
  personas,
  confidence,
  freshness,
}: PersonaSummaryCardProps) {
  const hasData = personas && personas.length > 0;
  const top3 = hasData ? personas.slice(0, 3) : [];

  return (
    <Link href="/persona" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-50">
              <Users className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              핵심 페르소나
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
            {top3.map((persona, i) => (
              <li key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: persona.color ?? "#a3a3a3" }}
                    />
                    <span className="text-[12px] font-medium text-[var(--foreground)]">
                      {persona.name}
                    </span>
                    {persona.archetype && (
                      <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                        {persona.archetype}
                      </span>
                    )}
                  </div>
                  {persona.percentage != null && (
                    <span className="text-[11px] font-medium text-[var(--foreground)]">
                      {persona.percentage}%
                    </span>
                  )}
                </div>
                {/* Percentage bar */}
                {persona.percentage != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--secondary)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(persona.percentage, 100)}%`,
                        backgroundColor: persona.color ?? "#a3a3a3",
                      }}
                    />
                  </div>
                )}
                {persona.description && (
                  <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1">
                    {persona.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <Users className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              페르소나 분석이 완료되면
              <br />
              핵심 검색자 유형이 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
