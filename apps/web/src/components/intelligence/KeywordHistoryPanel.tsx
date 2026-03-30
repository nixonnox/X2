"use client";

import { Star, Clock, BarChart3 } from "lucide-react";

type KeywordHistoryPanelProps = {
  keywords: Array<{
    id: string;
    keyword: string;
    industryType: string | null;
    industryLabel: string | null;
    isSaved: boolean;
    analysisCount: number;
    lastConfidence: number | null;
    lastFreshness: string | null;
    lastSignalHint: string | null;
    lastAnalyzedAt: string | Date;
  }>;
  onSelectKeyword: (keyword: string, industryType?: string) => void;
  onToggleSave: (keyword: string) => void;
  activeKeyword?: string;
  isLoading?: boolean;
};

const INDUSTRY_COLORS: Record<string, { bg: string; text: string }> = {
  BEAUTY: { bg: "bg-pink-100", text: "text-pink-700" },
  FNB: { bg: "bg-orange-100", text: "text-orange-700" },
  FINANCE: { bg: "bg-blue-100", text: "text-blue-700" },
  ENTERTAINMENT: { bg: "bg-purple-100", text: "text-purple-700" },
};

const SIGNAL_DOT: Record<string, string> = {
  RICH: "bg-emerald-500",
  MODERATE: "bg-amber-500",
  MINIMAL: "bg-red-500",
};

function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diffMs = now - target;

  if (diffMs < 0) return "방금 전";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months}개월 전`;
  if (weeks > 0) return `${weeks}주 전`;
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return "방금 전";
}

function SkeletonRows() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md px-3 py-2 animate-pulse"
        >
          <div className="h-3.5 w-20 rounded bg-gray-200" />
          <div className="h-3 w-10 rounded-full bg-gray-200" />
          <div className="flex-1" />
          <div className="h-3 w-12 rounded bg-gray-200" />
          <div className="h-3.5 w-3.5 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function KeywordHistoryPanel({
  keywords,
  onSelectKeyword,
  onToggleSave,
  activeKeyword,
  isLoading,
}: KeywordHistoryPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <h3 className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          키워드 히스토리
        </h3>
        <SkeletonRows />
      </div>
    );
  }

  if (keywords.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
        <h3 className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          키워드 히스토리
        </h3>
        <p className="text-[12px] text-[var(--muted-foreground)] text-center py-4">
          아직 분석한 키워드가 없어요. 키워드를 분석하면 여기에 나타나요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <h3 className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
        키워드 히스토리
      </h3>
      <div className="space-y-0.5">
        {keywords.map((kw) => {
          const isActive = activeKeyword === kw.keyword;
          const industry = kw.industryType
            ? INDUSTRY_COLORS[kw.industryType]
            : null;
          const signalDot = kw.lastSignalHint
            ? SIGNAL_DOT[kw.lastSignalHint]
            : null;

          return (
            <div
              key={kw.id}
              onClick={() =>
                onSelectKeyword(kw.keyword, kw.industryType ?? undefined)
              }
              className={`
                flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer
                transition-colors hover:bg-[var(--accent)]
                ${isActive ? "border-l-2 border-l-blue-500 bg-blue-50/50" : "border-l-2 border-l-transparent"}
              `}
            >
              {/* Signal dot */}
              {signalDot && (
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${signalDot}`}
                  title={kw.lastSignalHint ?? ""}
                />
              )}

              {/* Keyword text */}
              <span
                className={`text-[12px] truncate ${
                  isActive
                    ? "font-bold text-[var(--foreground)]"
                    : "font-medium text-[var(--foreground)]"
                }`}
              >
                {kw.keyword}
              </span>

              {/* Industry badge */}
              {industry && kw.industryLabel && (
                <span
                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${industry.bg} ${industry.text}`}
                >
                  {kw.industryLabel}
                </span>
              )}

              <span className="flex-1" />

              {/* Analysis count */}
              <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted-foreground)] shrink-0">
                <BarChart3 className="h-2.5 w-2.5" />
                {kw.analysisCount}회
              </span>

              {/* Relative time */}
              <span className="flex items-center gap-0.5 text-[9px] text-[var(--muted-foreground)] shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {formatRelativeTime(kw.lastAnalyzedAt)}
              </span>

              {/* Save toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(kw.keyword);
                }}
                className="p-0.5 shrink-0 transition-colors hover:text-amber-500"
                title={kw.isSaved ? "저장 해제" : "저장"}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    kw.isSaved
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-400"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
