"use client";

import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

type Props = {
  dataPoints: Array<{
    period: string;
    totalCount: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
  }>;
  granularity: "daily" | "weekly" | "monthly";
  hasData: boolean;
  warnings: string[];
  onGranularityChange: (g: "daily" | "weekly" | "monthly") => void;
};

const GRANULARITY_OPTIONS = [
  { value: "daily" as const, label: "일별" },
  { value: "weekly" as const, label: "주별" },
  { value: "monthly" as const, label: "월별" },
];

export function MentionTrendChart({
  dataPoints, granularity, hasData, warnings, onGranularityChange,
}: Props) {
  if (!hasData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div className="text-center">
          <Calendar className="mx-auto h-6 w-6 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">
            {warnings[0] ?? "소셜 반응 추이 데이터가 아직 없어요"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Granularity selector */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          소셜 반응 추이
        </h4>
        <div className="flex gap-1">
          {GRANULARITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onGranularityChange(opt.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                granularity === opt.value
                  ? "bg-violet-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={dataPoints}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                totalCount: "전체",
                positiveCount: "긍정",
                negativeCount: "부정",
              };
              return [value, labels[name] ?? name];
            }}
          />
          <Area type="monotone" dataKey="totalCount" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.1} strokeWidth={2} />
          <Area type="monotone" dataKey="positiveCount" stroke="#22c55e" fill="#22c55e" fillOpacity={0.05} strokeWidth={1} />
          <Area type="monotone" dataKey="negativeCount" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
