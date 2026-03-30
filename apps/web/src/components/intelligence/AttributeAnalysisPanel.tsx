"use client";

import { BarChart3, ThumbsUp, ThumbsDown } from "lucide-react";

type Attribute = {
  attribute: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  score: number; // -100 to +100
};

type Props = {
  attributes: Attribute[];
  strengths: string[];
  weaknesses: string[];
  hasData: boolean;
  warnings: string[];
};

export function AttributeAnalysisPanel({ attributes, strengths, weaknesses, hasData, warnings }: Props) {
  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center py-8">
        <BarChart3 className="mx-auto h-6 w-6 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">{warnings[0] ?? "속성별 분석 데이터가 아직 없어요"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        <BarChart3 className="h-4 w-4 text-violet-500" />
        속성별 강점/약점
      </h4>

      {/* Strength/Weakness summary */}
      <div className="flex gap-3">
        {strengths.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-700 font-medium">강점: {strengths.join(", ")}</span>
          </div>
        )}
        {weaknesses.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-700 font-medium">약점: {weaknesses.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Attribute bars */}
      <div className="space-y-2">
        {attributes.map((attr) => {
          const barWidth = Math.abs(attr.score);
          const isPositive = attr.score > 0;
          return (
            <div key={attr.attribute} className="flex items-center gap-3">
              <span className="w-12 text-[11px] font-medium text-gray-700 text-right shrink-0">{attr.attribute}</span>
              <div className="flex-1 flex items-center gap-1">
                {/* Negative bar (left) */}
                <div className="flex-1 flex justify-end">
                  {!isPositive && (
                    <div
                      className="h-4 rounded-l bg-red-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
                {/* Center line */}
                <div className="w-px h-5 bg-gray-300 shrink-0" />
                {/* Positive bar (right) */}
                <div className="flex-1">
                  {isPositive && (
                    <div
                      className="h-4 rounded-r bg-emerald-400"
                      style={{ width: `${barWidth}%` }}
                    />
                  )}
                </div>
              </div>
              <span className={`w-10 text-[10px] font-medium text-right ${isPositive ? "text-emerald-600" : attr.score < 0 ? "text-red-600" : "text-gray-500"}`}>
                {attr.score > 0 ? "+" : ""}{attr.score}
              </span>
              <span className="w-8 text-[9px] text-gray-400 text-right">{attr.total}건</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
