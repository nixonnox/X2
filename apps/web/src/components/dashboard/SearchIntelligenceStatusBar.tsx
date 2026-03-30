"use client";

import {
  Sparkles,
  Clock,
  Server,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type StatusData = {
  confidence?: number;
  freshness?: "fresh" | "stale" | "unknown";
  engineCount?: number;
  successCount?: number;
  seedKeyword?: string;
  analyzedAt?: string;
  isMockOnly?: boolean;
  isPartial?: boolean;
  warnings?: string[];
};

type SearchIntelligenceStatusBarProps = {
  status?: StatusData;
};

export function SearchIntelligenceStatusBar({
  status,
}: SearchIntelligenceStatusBarProps) {
  if (!status) {
    return (
      <div className="card flex items-center gap-2 px-4 py-2.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-[12px] text-[var(--muted-foreground)]">
          검색 인텔리전스 상태 정보를 불러올 수 없습니다
        </span>
      </div>
    );
  }

  const {
    confidence,
    freshness,
    engineCount,
    successCount,
    seedKeyword,
    analyzedAt,
    isMockOnly,
    isPartial,
    warnings,
  } = status;

  const confidenceColor =
    confidence != null && confidence >= 70
      ? "text-emerald-600"
      : confidence != null && confidence >= 40
        ? "text-amber-600"
        : "text-red-600";

  const confidenceBg =
    confidence != null && confidence >= 70
      ? "bg-emerald-100"
      : confidence != null && confidence >= 40
        ? "bg-amber-100"
        : "bg-red-100";

  return (
    <div className="card px-4 py-2.5 space-y-1.5">
      {/* Main status row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {/* Seed keyword */}
        {seedKeyword && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--muted-foreground)]">
              시드 키워드
            </span>
            <span className="badge bg-[var(--secondary)] text-[11px] font-medium text-[var(--foreground)]">
              {seedKeyword}
            </span>
          </div>
        )}

        {/* Confidence */}
        {confidence != null && (
          <div className="flex items-center gap-1.5">
            <Sparkles className={`h-3 w-3 ${confidenceColor}`} />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              신뢰도
            </span>
            <span
              className={`badge text-[10px] font-medium ${confidenceBg} ${confidenceColor}`}
            >
              {confidence}%
            </span>
          </div>
        )}

        {/* Freshness */}
        {freshness && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[var(--muted-foreground)]" />
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
                ? "최신 데이터"
                : freshness === "stale"
                  ? "데이터 갱신 필요"
                  : "상태 확인 중"}
            </span>
          </div>
        )}

        {/* Engine success rate */}
        {engineCount != null && successCount != null && (
          <div className="flex items-center gap-1.5">
            <Server className="h-3 w-3 text-[var(--muted-foreground)]" />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              엔진
            </span>
            <span
              className={`badge text-[10px] ${
                successCount === engineCount
                  ? "bg-emerald-100 text-emerald-700"
                  : successCount > 0
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {successCount}/{engineCount} 성공
            </span>
          </div>
        )}

        {/* Analyzed timestamp */}
        {analyzedAt && (
          <span className="text-[10px] text-[var(--muted-foreground)]">
            분석 시점: {analyzedAt}
          </span>
        )}

        {/* Mock-only badge */}
        {isMockOnly && (
          <span className="badge bg-red-100 text-red-700 text-[10px]">
            목업 데이터
          </span>
        )}

        {/* Partial badge */}
        {isPartial && !isMockOnly && (
          <span className="badge bg-amber-100 text-amber-700 text-[10px]">
            부분 데이터
          </span>
        )}

        {/* Full success indicator */}
        {!isMockOnly &&
          !isPartial &&
          confidence != null &&
          confidence >= 70 && (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          )}
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-[11px] text-amber-700">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
