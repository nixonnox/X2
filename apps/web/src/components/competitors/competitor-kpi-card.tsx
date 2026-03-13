"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { ChannelComparisonMetric } from "@/lib/competitors";

function formatValue(key: string, value: number): string {
  if (key === "engagement" || key === "growth") return `${value.toFixed(1)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

type CompetitorKpiCardProps = {
  metric: ChannelComparisonMetric;
  ourLabel: string;
  competitorLabel: string;
};

export function CompetitorKpiCard({
  metric,
  ourLabel,
  competitorLabel,
}: CompetitorKpiCardProps) {
  const DiffIcon = metric.isOurAdvantage
    ? ArrowUp
    : metric.difference === 0
      ? Minus
      : ArrowDown;
  const diffColor = metric.isOurAdvantage
    ? "text-emerald-600"
    : metric.difference === 0
      ? "text-[var(--muted-foreground)]"
      : "text-red-500";

  return (
    <div className="card space-y-2.5 p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
        {metric.metricName}
      </p>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {ourLabel}
          </p>
          <p className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {formatValue(metric.metricKey, metric.ourValue)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {competitorLabel}
          </p>
          <p className="text-lg font-bold tracking-tight text-[var(--muted-foreground)]">
            {formatValue(metric.metricKey, metric.competitorValue)}
          </p>
        </div>
      </div>

      <div
        className={`flex items-center gap-1 text-[12px] font-medium ${diffColor}`}
      >
        <DiffIcon className="h-3 w-3" />
        <span>{metric.insight}</span>
      </div>
    </div>
  );
}
