"use client";

import { Sparkles } from "lucide-react";
import type { Strategy } from "@/lib/insights";
import { TIMEFRAME_LABELS, IMPACT_LABELS, EFFORT_LABELS } from "@/lib/insights";

type StrategyTimelineProps = {
  strategies: Strategy[];
};

export function StrategyTimeline({ strategies }: StrategyTimelineProps) {
  const grouped = {
    short_term: strategies.filter((s) => s.timeframe === "short_term"),
    mid_term: strategies.filter((s) => s.timeframe === "mid_term"),
    long_term: strategies.filter((s) => s.timeframe === "long_term"),
  };

  return (
    <div className="space-y-6">
      {(["short_term", "mid_term", "long_term"] as const).map((tf) => {
        const config = TIMEFRAME_LABELS[tf];
        const items = grouped[tf];
        if (items.length === 0) return null;

        return (
          <div key={tf}>
            {/* Timeline header */}
            <div className="mb-3 flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: config.color }}
              />
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
                  {config.label}
                </h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {config.period}
                </p>
              </div>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            {/* Strategy cards */}
            <div className="ml-1.5 space-y-3 border-l-2 border-[var(--border)] pl-5">
              {items.map((strategy) => (
                <StrategyCard key={strategy.id} strategy={strategy} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const impact = IMPACT_LABELS[strategy.impact];
  const effort = EFFORT_LABELS[strategy.effort];

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-semibold text-[var(--foreground)]">
          {strategy.title}
        </h4>
        <div className="flex flex-shrink-0 items-center gap-1 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
          <Sparkles className="h-3 w-3" />
          {strategy.confidence}%
        </div>
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
        {strategy.description}
      </p>

      {/* Impact / Effort */}
      <div className="flex items-center gap-4 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--muted-foreground)]">영향도:</span>
          <span className={`font-medium ${impact.color}`}>{impact.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--muted-foreground)]">난이도:</span>
          <span className={`font-medium ${effort.color}`}>{effort.label}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          실행 항목
        </p>
        <ul className="space-y-1">
          {strategy.actions.map((action, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] text-[var(--foreground)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--foreground)]" />
              {action}
            </li>
          ))}
        </ul>
      </div>

      {/* Expected Outcome */}
      <div className="rounded-md bg-[var(--secondary)] px-3 py-2">
        <p className="text-[12px] text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            기대 효과:{" "}
          </span>
          {strategy.expectedOutcome}
        </p>
      </div>
    </div>
  );
}
