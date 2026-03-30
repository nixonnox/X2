"use client";

import { Grid3X3, Minus } from "lucide-react";

type Props = {
  industryType: string;
  coveredCategories: { category: string; clusterCount: number }[];
  uncoveredCategories: string[];
  totalClusters: number;
};

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return "bg-white border border-gray-100";
  const ratio = Math.min(count / Math.max(maxCount, 1), 1);
  if (ratio <= 0.25) return "bg-emerald-100";
  if (ratio <= 0.5) return "bg-emerald-200";
  if (ratio <= 0.75) return "bg-emerald-400";
  return "bg-emerald-600";
}

function getHeatTextColor(count: number, maxCount: number): string {
  if (count === 0) return "text-gray-300";
  const ratio = Math.min(count / Math.max(maxCount, 1), 1);
  return ratio > 0.5 ? "text-white" : "text-emerald-900";
}

export function TaxonomyHeatMatrix({
  industryType,
  coveredCategories,
  uncoveredCategories,
  totalClusters,
}: Props) {
  const sorted = [...coveredCategories].sort(
    (a, b) => b.clusterCount - a.clusterCount
  );
  const totalCategories = sorted.length + uncoveredCategories.length;
  const coveragePercent =
    totalCategories > 0
      ? Math.round((sorted.length / totalCategories) * 100)
      : 0;

  const maxCount =
    sorted.length > 0 ? Math.max(...sorted.map((c) => c.clusterCount)) : 1;

  // Build rows: covered first, then uncovered
  const allRows: { category: string; count: number; covered: boolean }[] = [
    ...sorted.map((c) => ({
      category: c.category,
      count: c.clusterCount,
      covered: true,
    })),
    ...uncoveredCategories.map((cat) => ({
      category: cat,
      count: 0,
      covered: false,
    })),
  ];

  // Limit display
  const displayRows = allRows.slice(0, 12);
  const remaining = allRows.length - displayRows.length;

  // Signal strength columns: breakdown by intensity tiers
  const tiers = [
    { label: "강", min: Math.ceil(maxCount * 0.66), color: "bg-emerald-600" },
    {
      label: "중",
      min: Math.ceil(maxCount * 0.33),
      color: "bg-emerald-300",
    },
    { label: "약", min: 1, color: "bg-emerald-100" },
  ];

  return (
    <div className="card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-[12px] font-semibold text-[var(--foreground)]">
            분류 히트맵
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--muted-foreground)]">
            커버리지
          </span>
          <span
            className={`badge text-[10px] font-semibold ${
              coveragePercent >= 60
                ? "bg-emerald-100 text-emerald-700"
                : coveragePercent >= 30
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {coveragePercent}%
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">
            ({sorted.length}/{totalCategories})
          </span>
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr>
              <th className="text-left py-1 pr-3 text-[10px] font-medium text-[var(--muted-foreground)] w-[140px]">
                카테고리
              </th>
              <th className="text-center py-1 px-2 text-[10px] font-medium text-[var(--muted-foreground)] w-[60px]">
                클러스터
              </th>
              <th className="text-left py-1 px-2 text-[10px] font-medium text-[var(--muted-foreground)]">
                시그널 강도
              </th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                <td className="py-1.5 pr-3">
                  <span
                    className={`truncate block max-w-[140px] ${
                      row.covered
                        ? "text-[var(--foreground)]"
                        : "text-gray-400 italic"
                    }`}
                  >
                    {row.category}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-center">
                  {row.covered ? (
                    <span
                      className={`inline-flex items-center justify-center h-6 w-8 rounded text-[10px] font-semibold ${getHeatColor(row.count, maxCount)} ${getHeatTextColor(row.count, maxCount)}`}
                    >
                      {row.count}
                    </span>
                  ) : (
                    <Minus className="h-3 w-3 text-gray-300 mx-auto" />
                  )}
                </td>
                <td className="py-1.5 px-2">
                  {row.covered ? (
                    <div className="flex items-center gap-1">
                      <div className="h-2 rounded-full bg-[var(--secondary)] flex-1 max-w-[120px]">
                        <div
                          className="h-2 rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${(row.count / maxCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-[var(--muted-foreground)] w-8 text-right">
                        {Math.round((row.count / maxCount) * 100)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-gray-300 italic">
                      데이터 없음
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {remaining > 0 && (
        <p className="text-[10px] text-[var(--muted-foreground)] text-center">
          외 {remaining}개 카테고리
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 border-t border-[var(--border)]">
        <span className="text-[9px] text-[var(--muted-foreground)]">
          강도:
        </span>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-white border border-gray-200" />
          <span className="text-[9px] text-[var(--muted-foreground)]">0</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-100" />
          <span className="text-[9px] text-[var(--muted-foreground)]">낮음</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-300" />
          <span className="text-[9px] text-[var(--muted-foreground)]">중간</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm bg-emerald-600" />
          <span className="text-[9px] text-[var(--muted-foreground)]">높음</span>
        </div>
        <span className="ml-auto text-[9px] text-[var(--muted-foreground)]">
          총 {totalClusters}개 클러스터
        </span>
      </div>
    </div>
  );
}
