"use client";

/**
 * VerticalComparisonMatrix
 *
 * 7개 비교 섹션을 아코디언 형태로 표시.
 * 각 섹션은 4컬럼 테이블로 업종별 값을 비교.
 * 차이가 있는 행/셀은 색상으로 강조.
 */

import React, { useState } from "react";
import type {
  ComparisonSectionViewModel,
  ComparisonRowViewModel,
  IndustryColumnViewModel,
} from "../types/viewModel";
import {
  getSectionBadgeClass,
  getRowHighlightClass,
  getCellHighlightClass,
  formatDiffRatio,
} from "../mappers/mapPreviewToViewModel";

type Props = {
  sections: ComparisonSectionViewModel[];
  industryColumns: IndustryColumnViewModel[];
};

export function VerticalComparisonMatrix({ sections, industryColumns }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(sections.filter((s) => s.hasDifferences).map((s) => s.section)),
  );

  const toggle = (section: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div key={section.section} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* 섹션 헤더 */}
          <button
            onClick={() => toggle(section.section)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{section.label}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSectionBadgeClass(section)}`}>
                {formatDiffRatio(section.diffCount, section.totalCount)}
              </span>
            </div>
            <span className="text-gray-400 text-sm">
              {expanded.has(section.section) ? "접기" : "펼치기"}
            </span>
          </button>

          {/* 섹션 내용 */}
          {expanded.has(section.section) && (
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 w-[20%]">항목</th>
                    {industryColumns.map((col) => (
                      <th key={col.industry} className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-[20%]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {section.rows.map((row) => (
                    <ComparisonRow key={row.id} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Row Component ────────────────────────────────────────────────

function ComparisonRow({ row }: { row: ComparisonRowViewModel }) {
  return (
    <tr className={getRowHighlightClass(row.hasDifference, row.highlightLevel)}>
      <td className="px-4 py-2 text-gray-700 font-medium">
        {row.dimension}
        {row.hasDifference && (
          <span className="ml-1 text-amber-500 text-xs">*</span>
        )}
      </td>
      {row.cells.map((cell) => (
        <td
          key={cell.industry}
          className={`px-3 py-2 ${getCellHighlightClass(cell.highlightLevel, cell.isOutlier)}`}
          title={cell.highlightReason}
        >
          <div className="text-gray-900">{cell.value}</div>
          {cell.subValue && (
            <div className="text-xs text-gray-500 mt-0.5">{cell.subValue}</div>
          )}
          {cell.isOutlier && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 ml-1" title="이상값" />
          )}
        </td>
      ))}
    </tr>
  );
}
