"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Clock, Zap, AlertTriangle } from "lucide-react";

type DataPoint = {
  hour: string;
  label: string;
  count: number;
  positive: number;
  negative: number;
  isSpike: boolean;
};

type Spike = {
  hour: string;
  count: number;
  ratio: number;
  label: string;
};

type Props = {
  dataPoints: DataPoint[];
  spikes: Spike[];
  stats: {
    mean: number;
    spikeThreshold: number;
    totalMentions: number;
    peakHour: string | null;
  } | null;
  hasData: boolean;
  warnings: string[];
};

export function HourlyTrendChart({
  dataPoints,
  spikes,
  stats,
  hasData,
  warnings,
}: Props) {
  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Clock className="h-4 w-4 text-blue-500" />
          시간별 추이
        </h4>
        <div className="py-8 text-center">
          <Clock className="mx-auto mb-2 h-7 w-7 text-gray-300" />
          <p className="text-sm text-gray-400">
            {warnings[0] ?? "시간별 데이터가 아직 없어요"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Clock className="h-4 w-4 text-blue-500" />
          시간별 추이
        </h4>
        {stats && (
          <div className="flex gap-3 text-[10px] text-gray-400">
            <span>평균 {stats.mean}건/시간</span>
            <span>전체 {stats.totalMentions}건</span>
          </div>
        )}
      </div>

      {/* Spike alerts */}
      {spikes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {spikes.slice(0, 3).map((s) => (
            <span
              key={s.hour}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] text-amber-700"
            >
              <Zap className="h-3 w-3" />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={dataPoints}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 9 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(value: any) => [value as number, "반응 수"] as any}
          />
          {stats && (
            <ReferenceLine
              y={stats.spikeThreshold}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: "급증 기준", fontSize: 9, fill: "#f59e0b" }}
            />
          )}
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {dataPoints.map((d, i) => (
              <Cell
                key={i}
                fill={d.isSpike ? "#f59e0b" : "#7c3aed"}
                fillOpacity={d.isSpike ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
