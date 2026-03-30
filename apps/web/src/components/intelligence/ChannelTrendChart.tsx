"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { BarChart3, WifiOff } from "lucide-react";

type ChannelData = {
  platform: string;
  totalCount: number;
  dataPoints: Array<{ date: string; count: number }>;
};

type Props = {
  channels: ChannelData[];
  hasData: boolean;
  warnings: string[];
};

const PLATFORM_COLORS: Record<string, string> = {
  YOUTUBE: "#ef4444",
  INSTAGRAM: "#e879f9",
  TIKTOK: "#06b6d4",
  X: "#1d9bf0",
  COMMENT: "#6b7280",
};

const PLATFORM_LABELS: Record<string, string> = {
  YOUTUBE: "YouTube",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  X: "X",
  COMMENT: "댓글",
};

export function ChannelTrendChart({ channels, hasData, warnings }: Props) {
  if (!hasData) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
        <div className="text-center">
          <WifiOff className="mx-auto h-6 w-6 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">
            {warnings[0] ?? "채널별 데이터가 아직 없어요"}
          </p>
        </div>
      </div>
    );
  }

  // Merge all channel data into unified date rows
  const dateSet = new Set<string>();
  for (const ch of channels) {
    for (const dp of ch.dataPoints) dateSet.add(dp.date);
  }
  const dates = [...dateSet].sort();

  const chartData = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const ch of channels) {
      const dp = ch.dataPoints.find((d) => d.date === date);
      row[ch.platform] = dp?.count ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <BarChart3 className="h-4 w-4 text-blue-500" />
          채널별 반응 추이
        </h4>
        <div className="flex gap-2">
          {channels.map((ch) => (
            <span key={ch.platform} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[ch.platform] ?? "#999" }}
              />
              {PLATFORM_LABELS[ch.platform] ?? ch.platform} ({ch.totalCount})
            </span>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          {channels.map((ch) => (
            <Bar
              key={ch.platform}
              dataKey={ch.platform}
              name={PLATFORM_LABELS[ch.platform] ?? ch.platform}
              fill={PLATFORM_COLORS[ch.platform] ?? "#999"}
              stackId="channels"
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
