"use client";

import Link from "next/link";
import { TrendingUp, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

type IntentItem = {
  keyword?: string;
  intent?: string;
  volume?: number;
  change?: number;
  isRising?: boolean;
};

type TrendingIntentCardProps = {
  intents?: IntentItem[];
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
};

const INTENT_COLORS: Record<string, string> = {
  정보탐색: "bg-blue-100 text-blue-700",
  구매의도: "bg-emerald-100 text-emerald-700",
  비교분석: "bg-violet-100 text-violet-700",
  문제해결: "bg-amber-100 text-amber-700",
  브랜드: "bg-rose-100 text-rose-700",
};

function getIntentColor(intent?: string) {
  if (!intent) return "bg-[var(--secondary)] text-[var(--muted-foreground)]";
  return INTENT_COLORS[intent] ?? "bg-[var(--secondary)] text-[var(--muted-foreground)]";
}

export function TrendingIntentCard({
  intents,
  confidence,
  freshness,
}: TrendingIntentCardProps) {
  const hasData = intents && intents.length > 0;
  const top3 = hasData ? intents.slice(0, 3) : [];

  return (
    <Link href="/intent" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              급상승 검색 의도
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
            {top3.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-2 rounded-md bg-[var(--secondary)]/50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-medium text-[var(--foreground)] truncate">
                    {item.keyword}
                  </span>
                  {item.intent && (
                    <span
                      className={`badge shrink-0 text-[10px] ${getIntentColor(item.intent)}`}
                    >
                      {item.intent}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.volume != null && (
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {item.volume.toLocaleString()}
                    </span>
                  )}
                  {item.isRising && (
                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                  )}
                  {item.change != null && (
                    <span
                      className={`text-[11px] font-medium ${
                        item.change > 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {item.change > 0 ? "+" : ""}
                      {item.change}%
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <TrendingUp className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              검색 의도 분석이 시작되면
              <br />
              급상승 의도가 여기에 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
