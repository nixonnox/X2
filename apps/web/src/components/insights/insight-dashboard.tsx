"use client";

import {
  Sparkles,
  Search,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import type { InsightSummary } from "@/lib/insights";

type InsightDashboardProps = {
  summary: InsightSummary;
};

export function InsightDashboard({ summary }: InsightDashboardProps) {
  const scoreColor =
    summary.overallScore >= 70
      ? "text-emerald-600"
      : summary.overallScore >= 40
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    summary.overallScore >= 70
      ? "bg-emerald-50 border-emerald-200"
      : summary.overallScore >= 40
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {/* Overall Score */}
      <div className={`card p-4 ${scoreBg}`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`h-4 w-4 ${scoreColor}`} />
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Health Score
          </p>
        </div>
        <p className={`mt-2 text-2xl font-bold tracking-tight ${scoreColor}`}>
          {summary.overallScore}
        </p>
        <p className={`text-[12px] font-medium ${scoreColor}`}>
          {summary.scoreLabel}
        </p>
      </div>

      {/* Key Findings */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-500" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Key Findings
          </p>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {summary.keyFindings}
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          data-driven discoveries
        </p>
      </div>

      {/* Growth Opportunities */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Opportunities
          </p>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {summary.growthOpportunities}
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          growth levers identified
        </p>
      </div>

      {/* Risk Signals */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Risk Signals
          </p>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {summary.riskSignals}
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          {summary.criticalCount} critical
        </p>
      </div>

      {/* Strategies */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-500" />
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Strategies
          </p>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          {summary.strategySuggestions}
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          actionable suggestions
        </p>
      </div>
    </div>
  );
}
