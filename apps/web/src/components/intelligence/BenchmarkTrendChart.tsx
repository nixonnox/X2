"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

type BenchmarkTrendChartProps = {
  dataPoints: Array<{
    date: string;
    overallScore: number;
    comparisons: unknown[];
    highlights: string[] | null;
    warnings: string[] | null;
  }>;
  trendSummary: {
    direction:
      | "RISING"
      | "DECLINING"
      | "STABLE"
      | "VOLATILE"
      | "INSUFFICIENT_DATA";
    changePercent: number;
    volatility: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
    dataPointCount: number;
    periodDays: number;
    latestScore?: number;
    previousScore?: number | null;
  };
  warnings: string[];
  hasData: boolean;
};

const directionConfig: Record<
  BenchmarkTrendChartProps["trendSummary"]["direction"],
  {
    icon: typeof TrendingUp;
    color: string;
    bgColor: string;
    textColor: string;
    label: string;
  }
> = {
  RISING: {
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    label: "올라가는 흐름이에요",
  },
  DECLINING: {
    icon: TrendingDown,
    color: "text-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    label: "내려가는 흐름이에요",
  },
  STABLE: {
    icon: Minus,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    label: "안정적이에요",
  },
  VOLATILE: {
    icon: Activity,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    label: "오르내림이 커요",
  },
  INSUFFICIENT_DATA: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    textColor: "text-gray-600",
    label: "데이터가 더 필요해요",
  },
};

const volatilityLabel: Record<
  BenchmarkTrendChartProps["trendSummary"]["volatility"],
  string
> = {
  HIGH: "오르내림이 커요",
  MODERATE: "보통 수준이에요",
  LOW: "안정적이에요",
  UNKNOWN: "아직 알 수 없어요",
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getScoreColor(score: number): string {
  if (score > 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      overallScore: number;
      highlights: string[] | null;
    };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]!.payload;
  const scoreColor = getScoreColor(data.overallScore);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
      <p className="text-sm font-medium text-gray-700">{data.date}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: scoreColor }}>
        {data.overallScore}점
      </p>
      {data.highlights && data.highlights.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {data.highlights.map((h, i) => (
            <li key={i} className="text-xs text-gray-500">
              • {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BenchmarkTrendChart({
  dataPoints,
  trendSummary,
  warnings,
  hasData,
}: BenchmarkTrendChartProps) {
  const chartData = useMemo(
    () =>
      dataPoints.map((dp) => ({
        date: dp.date,
        dateLabel: formatDateLabel(dp.date),
        overallScore: dp.overallScore,
        highlights: dp.highlights,
      })),
    [dataPoints]
  );

  const gradientId = "benchmarkScoreGradient";

  const dominantColor = useMemo(() => {
    if (chartData.length === 0) return "#22c55e";
    const avg =
      chartData.reduce((sum, d) => sum + d.overallScore, 0) / chartData.length;
    return getScoreColor(avg);
  }, [chartData]);

  if (!hasData) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8">
        <p className="text-center text-sm text-gray-400">
          이 기간에는 기준 비교 데이터가 아직 없어요.
          <br />
          키워드를 분석하면 데이터가 쌓여요.
        </p>
      </div>
    );
  }

  const config = directionConfig[trendSummary.direction];
  const DirectionIcon = config.icon;
  const changeSign = trendSummary.changePercent >= 0 ? "+" : "";

  return (
    <div className="space-y-4">
      {/* Trend summary badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.bgColor} ${config.textColor}`}
          >
            <DirectionIcon className="h-4 w-4" />
            {config.label}
            <span className="ml-1 font-semibold">
              {changeSign}
              {trendSummary.changePercent.toFixed(1)}%
            </span>
          </span>
          <span className="text-xs text-gray-500">
            {volatilityLabel[trendSummary.volatility]} · {trendSummary.periodDays}일간{" "}
            {trendSummary.dataPointCount}개 데이터
          </span>
        </div>

        {trendSummary.latestScore !== undefined && (
          <div className="text-right">
            <span className="text-xs text-gray-500">최신 점수</span>
            <p
              className="text-2xl font-bold leading-tight"
              style={{ color: getScoreColor(trendSummary.latestScore) }}
            >
              {trendSummary.latestScore}
            </p>
          </div>
        )}
      </div>

      {/* Area chart */}
      <div className="h-[240px] md:h-[280px] lg:h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={dominantColor} stopOpacity={0.3} />
                <stop
                  offset="95%"
                  stopColor={dominantColor}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={50}
              stroke="#9ca3af"
              strokeDasharray="4 4"
              label={{
                value: "기준선",
                position: "insideTopRight",
                fill: "#9ca3af",
                fontSize: 11,
              }}
            />
            <Area
              type="monotone"
              dataKey="overallScore"
              stroke={dominantColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: dominantColor, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: dominantColor, strokeWidth: 2, stroke: "#fff" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <ul className="space-y-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-xs text-amber-700">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
