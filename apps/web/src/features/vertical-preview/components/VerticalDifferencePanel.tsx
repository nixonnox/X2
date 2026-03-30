"use client";

/**
 * VerticalDifferencePanel
 *
 * 차이점 요약 패널.
 * - 주요 차이점 목록 (severity별 색상)
 * - 업종별 이탈도 바
 * - 가장 많은 차이 섹션 / 가장 이탈 업종 표시
 */

import React from "react";
import type { DifferenceSummaryViewModel } from "../types/viewModel";
import { getIndustryColor } from "../mappers/mapPreviewToViewModel";

type Props = {
  summary: DifferenceSummaryViewModel;
};

export function VerticalDifferencePanel({ summary }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <h3 className="font-bold text-gray-900">차이점 요약</h3>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-2xl font-bold text-gray-900">{summary.totalDifferences}</div>
          <div className="text-xs text-gray-500">총 차이 항목</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-sm font-bold text-gray-900">{summary.mostDifferentSection.label}</div>
          <div className="text-xs text-gray-500">가장 많은 차이 섹션</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="text-sm font-bold text-gray-900">{summary.mostDeviatingIndustry.label}</div>
          <div className="text-xs text-gray-500">가장 이탈이 큰 업종</div>
        </div>
      </div>

      {/* 주요 차이점 */}
      {summary.topDifferences.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">주요 차이점</h4>
          <ul className="space-y-1">
            {summary.topDifferences.map((diff, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${diff.severity === "HIGH" ? "bg-red-500" : diff.severity === "MEDIUM" ? "bg-amber-500" : "bg-gray-400"}`} />
                <span className={diff.colorClass}>{diff.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 업종별 이탈도 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">업종별 이탈도</h4>
        <div className="space-y-2">
          {summary.industryDeviations.map((dev) => {
            const maxCount = Math.max(...summary.industryDeviations.map((d) => d.count), 1);
            const width = Math.round((dev.count / maxCount) * 100);

            return (
              <div key={dev.industry}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{dev.label}</span>
                  <span className="text-gray-500">{dev.count}건</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${width}%`,
                      backgroundColor: getIndustryColor(dev.industry),
                    }}
                  />
                </div>
                {dev.topItems.length > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {dev.topItems.join(" | ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
