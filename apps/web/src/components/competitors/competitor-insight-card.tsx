"use client";

import {
  TrendingUp,
  Target,
  AlertTriangle,
  Lightbulb,
  Zap,
} from "lucide-react";
import type { CompetitorInsight } from "@/lib/competitors";

type CompetitorInsightCardProps = {
  insight: CompetitorInsight;
};

export function CompetitorInsightCard({ insight }: CompetitorInsightCardProps) {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="card border-blue-200 bg-blue-50/40 p-4">
        <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
          {insight.summary}
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {/* Growth Analysis */}
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              성장 분석
            </h4>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
            {insight.growthAnalysis}
          </p>
        </div>

        {/* Content Strategy */}
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              콘텐츠 전략
            </h4>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
            {insight.contentStrategyAnalysis}
          </p>
        </div>

        {/* Strategy Recommendation */}
        <div className="card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              전략 추천
            </h4>
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
            {insight.strategyRecommendation}
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Strengths & Weaknesses */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-500" />
            <h4 className="text-[12px] font-semibold text-[var(--foreground)]">
              우리의 강점
            </h4>
          </div>
          {insight.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {insight.strengths.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-[var(--foreground)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted-foreground)]">
              특별한 강점이 발견되지 않았습니다
            </p>
          )}
        </div>

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h4 className="text-[12px] font-semibold text-[var(--foreground)]">
              개선이 필요한 부분
            </h4>
          </div>
          {insight.weaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {insight.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[13px] text-[var(--foreground)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[var(--muted-foreground)]">
              특별한 약점이 발견되지 않았습니다
            </p>
          )}
        </div>
      </div>

      {/* Recommended Actions */}
      {insight.recommendedActions.length > 0 && (
        <div className="card border-dashed p-4">
          <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            추천 액션
          </h4>
          <div className="flex flex-wrap gap-2">
            {insight.recommendedActions.map((a, i) => (
              <span
                key={i}
                className="badge bg-[var(--secondary)] px-2.5 py-1 text-[12px] text-[var(--foreground)]"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
