"use client";

import Link from "next/link";
import {
  Headphones,
  ArrowRight,
  Sparkles,
  Layers,
  Users,
  Route,
  BarChart3,
} from "lucide-react";

type SummaryData = {
  seedKeyword?: string;
  clusterCount?: number;
  personaCount?: number;
  pathCount?: number;
  stageCount?: number;
  confidence?: number;
};

type ListeningSummaryCardProps = {
  summary?: SummaryData;
};

export function ListeningSummaryCard({ summary }: ListeningSummaryCardProps) {
  const hasData = summary && summary.seedKeyword;

  const metrics = hasData
    ? [
        {
          icon: Layers,
          label: "클러스터",
          value: summary.clusterCount,
          color: "text-amber-500",
        },
        {
          icon: Users,
          label: "페르소나",
          value: summary.personaCount,
          color: "text-rose-500",
        },
        {
          icon: Route,
          label: "탐색 경로",
          value: summary.pathCount,
          color: "text-violet-500",
        },
        {
          icon: BarChart3,
          label: "여정 단계",
          value: summary.stageCount,
          color: "text-blue-500",
        },
      ].filter((m) => m.value != null)
    : [];

  return (
    <Link href="/listening-hub" className="group block">
      <div className="card p-4 transition-colors group-hover:border-[var(--foreground)]/20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50">
              <Headphones className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
              검색 인텔리전스 종합
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {hasData && summary.confidence != null && (
              <span className="flex items-center gap-1 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                <Sparkles className="h-3 w-3" />
                {summary.confidence}%
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Content */}
        {hasData ? (
          <div className="mt-3 space-y-3">
            {/* Seed keyword */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                시드 키워드
              </span>
              <span className="badge bg-indigo-100 text-indigo-700 text-[11px] font-medium">
                {summary.seedKeyword}
              </span>
            </div>

            {/* Metrics grid */}
            {metrics.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {metrics.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-md bg-[var(--secondary)]/50 px-2.5 py-1.5"
                    >
                      <Icon className={`h-3.5 w-3.5 ${m.color}`} />
                      <div>
                        <p className="text-[14px] font-semibold text-[var(--foreground)]">
                          {m.value}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {m.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center py-6 text-center">
            <Headphones className="h-6 w-6 text-[var(--muted-foreground)]/40" />
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              검색 인텔리전스 분석이 시작되면
              <br />
              종합 요약이 여기에 표시됩니다
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}
