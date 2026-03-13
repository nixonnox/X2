"use client";

import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { Insight } from "@/lib/insights";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/insights";

type InsightCardProps = {
  insight: Insight;
};

export function InsightCard2({ insight }: InsightCardProps) {
  const cat = CATEGORY_LABELS[insight.category];
  const pri = PRIORITY_LABELS[insight.priority];

  const ChangeIcon =
    insight.metricChangeType === "positive"
      ? ArrowUp
      : insight.metricChangeType === "negative"
        ? ArrowDown
        : Minus;

  const changeColor =
    insight.metricChangeType === "positive"
      ? "text-emerald-600"
      : insight.metricChangeType === "negative"
        ? "text-red-500"
        : "text-[var(--muted-foreground)]";

  return (
    <div className="card space-y-2.5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`badge text-[11px] ${cat.bg} ${cat.color}`}>
            {cat.label}
          </span>
          <span className={`badge text-[11px] ${pri.bg} ${pri.color}`}>
            {pri.label}
          </span>
        </div>
        <span className="flex-shrink-0 text-[11px] text-[var(--muted-foreground)]">
          {insight.createdAt}
        </span>
      </div>

      <h3 className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
        {insight.title}
      </h3>
      <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
        {insight.description}
      </p>

      {insight.metric && (
        <div className="flex items-center gap-3 border-t border-[var(--border-subtle)] pt-1">
          <div>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {insight.metric}
            </p>
            <p className="text-[14px] font-bold text-[var(--foreground)]">
              {insight.metricValue}
            </p>
          </div>
          {insight.metricChange && (
            <div className={`flex items-center gap-0.5 ${changeColor}`}>
              <ChangeIcon className="h-3.5 w-3.5" />
              <span className="text-[13px] font-medium">
                {insight.metricChange}
              </span>
            </div>
          )}
          {insight.source && (
            <span className="ml-auto text-[11px] text-[var(--muted-foreground)]">
              {insight.source}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
