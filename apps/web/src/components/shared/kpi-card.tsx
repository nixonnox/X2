"use client";

import { ResponsiveContainer, AreaChart, Area } from "recharts";

type KpiCardProps = {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  trend: number[];
};

export function KpiCard({
  label,
  value,
  change,
  changeType,
  trend,
}: KpiCardProps) {
  const trendData = trend.map((v, i) => ({ i, v }));
  const color =
    changeType === "positive"
      ? "#16a34a"
      : changeType === "negative"
        ? "#dc2626"
        : "#737373";

  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-xl font-semibold text-[var(--foreground)]">
            {value}
          </p>
          <p className="mt-0.5 text-[11px] font-medium" style={{ color }}>
            {change}
          </p>
        </div>
        <div className="h-8 w-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient
                  id={`grad-${label}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={color}
                strokeWidth={1.5}
                fill={`url(#grad-${label})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
