"use client";

import { useState } from "react";
import { Clock, Brain, Shield, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Calendar } from "lucide-react";

type AnalysisRun = {
  id: string;
  seedKeyword: string;
  industryType: string;
  industryLabel?: string;
  confidence: number;
  freshness: string;
  isPartial: boolean;
  isMockOnly: boolean;
  analyzedAt: string | Date;
  signalQuality?: any;
  benchmarkComparison?: any;
};

type AnalysisHistoryPanelProps = {
  runs: AnalysisRun[];
  isLoading: boolean;
  hasMore?: boolean;
  onLoadRun: (runId: string) => void;
  onCompareWithCurrent?: (runId: string) => void;
  onLoadMore?: () => void;
  currentRunId?: string | null;
  emptyMessage?: string;
};

const INDUSTRY_COLORS: Record<string, { bg: string; text: string }> = {
  BEAUTY: { bg: "bg-pink-100", text: "text-pink-700" },
  FNB: { bg: "bg-orange-100", text: "text-orange-700" },
  FINANCE: { bg: "bg-blue-100", text: "text-blue-700" },
  ENTERTAINMENT: { bg: "bg-purple-100", text: "text-purple-700" },
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatRelativeTime(date: string | Date): string {
  const now = Date.now();
  const target = new Date(date).getTime();
  const diffMs = now - target;
  if (diffMs < 0) return "방금 전";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return "방금 전";
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 70 ? "text-emerald-700 bg-emerald-50" :
    pct >= 50 ? "text-blue-700 bg-blue-50" :
    "text-amber-700 bg-amber-50";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${color}`}>
      <Shield className="h-2.5 w-2.5" />
      {pct}%
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-3 animate-pulse">
          <div className="h-8 w-8 rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-gray-200" />
            <div className="h-2.5 w-20 rounded bg-gray-200" />
          </div>
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

export function AnalysisHistoryPanel({
  runs,
  isLoading,
  hasMore,
  onLoadRun,
  onCompareWithCurrent,
  onLoadMore,
  currentRunId,
  emptyMessage = "분석 이력이 아직 없어요. 키워드를 분석하면 이력이 여기에 쌓여요.",
}: AnalysisHistoryPanelProps) {
  const [expanded, setExpanded] = useState(true);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-800">분석 이력</h3>
        </div>
        <SkeletonRows />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-gray-50/50 transition-colors rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-800">분석 이력</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            {runs.length}건
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center py-6">
              <Clock className="h-6 w-6 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400 text-center">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-1 pt-2">
              {runs.map((run, index) => {
                const isCurrent = run.id === currentRunId;
                const industry = INDUSTRY_COLORS[run.industryType];

                return (
                  <div
                    key={run.id}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                      isCurrent
                        ? "bg-violet-50 border border-violet-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                    onClick={() => onLoadRun(run.id)}
                  >
                    {/* Index / current marker */}
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      isCurrent
                        ? "bg-violet-500 text-white"
                        : index === 0
                          ? "bg-violet-100 text-violet-600"
                          : "bg-gray-100 text-gray-500"
                    }`}>
                      {isCurrent ? "▶" : index === 0 ? "최신" : `#${index + 1}`}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-800 truncate">
                          {run.seedKeyword}
                        </span>
                        {industry && (
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium ${industry.bg} ${industry.text}`}>
                            {run.industryLabel ?? run.industryType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {formatDate(run.analyzedAt)}
                        </span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">
                          {formatRelativeTime(run.analyzedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ConfidenceBadge confidence={run.confidence} />
                      {run.isPartial && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-600" title="부분 데이터">
                          부분
                        </span>
                      )}
                      {run.isMockOnly && (
                        <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] text-red-600" title="샘플 데이터">
                          샘플
                        </span>
                      )}
                    </div>

                    {/* Compare action */}
                    {!isCurrent && onCompareWithCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompareWithCurrent(run.id);
                        }}
                        className="shrink-0 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-violet-100 hover:text-violet-700"
                        title="현재 결과와 비교"
                      >
                        비교
                      </button>
                    )}
                  </div>
                );
              })}

              {hasMore && onLoadMore && (
                <button
                  onClick={onLoadMore}
                  className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  더 보기
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
