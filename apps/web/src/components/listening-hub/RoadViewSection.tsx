"use client";

import { ArrowRight, Route, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type StageData = {
  stage: string;
  label?: string;
  keywordCount?: number;
  gapScore?: number;
  keywords?: string[];
};

type RoadViewData = {
  stages?: StageData[];
  summary?: { totalStages?: number; weakStages?: string[] };
};

const STAGE_ORDER = [
  "awareness",
  "interest",
  "comparison",
  "decision",
  "action",
  "advocacy",
] as const;

const STAGE_LABELS: Record<string, string> = {
  awareness: "인지",
  interest: "관심",
  comparison: "비교",
  decision: "결정",
  action: "행동",
  advocacy: "옹호",
};

const STAGE_COLORS: Record<string, string> = {
  awareness: "bg-blue-50 border-blue-200 text-blue-700",
  interest: "bg-purple-50 border-purple-200 text-purple-700",
  comparison: "bg-amber-50 border-amber-200 text-amber-700",
  decision: "bg-emerald-50 border-emerald-200 text-emerald-700",
  action: "bg-red-50 border-red-200 text-red-700",
  advocacy: "bg-pink-50 border-pink-200 text-pink-700",
};

type RoadViewSectionProps = {
  roadviewResult: EngineExecutionResult<unknown> | undefined;
};

export function RoadViewSection({ roadviewResult }: RoadViewSectionProps) {
  if (!roadviewResult) {
    return (
      <section id="section-roadview">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Route className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 사용자 여정이 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = roadviewResult.data as RoadViewData | undefined;
  const stages = data?.stages ?? [];
  const weakStages = data?.summary?.weakStages ?? [];
  const confidence = roadviewResult.trace?.confidence ?? 0;
  const freshness = roadviewResult.trace?.freshness;

  // Sort stages by expected order
  const sortedStages = [...stages].sort((a, b) => {
    const aIdx = STAGE_ORDER.indexOf(a.stage as (typeof STAGE_ORDER)[number]);
    const bIdx = STAGE_ORDER.indexOf(b.stage as (typeof STAGE_ORDER)[number]);
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
  });

  return (
    <section id="section-roadview" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          사용자 여정 (Road View)
        </h2>
        <Link
          href="/road-view"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 분석 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {confidence < 0.3 && (
        <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            여정 분석 신뢰도가 낮습니다 ({Math.round(confidence * 100)}%).
          </p>
        </div>
      )}
      {freshness === "stale" && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <p className="text-[12px] text-amber-700">
            데이터가 오래되었습니다. 최신 분석을 다시 실행하세요.
          </p>
        </div>
      )}

      {!roadviewResult.success && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
          여정 분석 실패:{" "}
          {typeof roadviewResult.error === "string"
            ? roadviewResult.error
            : "알 수 없는 오류"}
        </div>
      )}

      {roadviewResult.success && sortedStages.length === 0 && (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            여정 단계 결과가 없습니다.
          </p>
        </div>
      )}

      {sortedStages.length > 0 && (
        <>
          {/* Horizontal stage flow */}
          <div className="overflow-x-auto">
            <div
              className="flex gap-2 pb-2"
              style={{ minWidth: "max-content" }}
            >
              {sortedStages.map((stage, i) => {
                const isWeak = weakStages.includes(stage.stage);
                const colorClass =
                  STAGE_COLORS[stage.stage] ??
                  "bg-gray-50 border-gray-200 text-gray-700";

                return (
                  <div key={stage.stage} className="flex items-center gap-2">
                    <div
                      className={`rounded-lg border px-4 py-3 ${colorClass} ${
                        isWeak ? "ring-2 ring-red-300" : ""
                      }`}
                      style={{ minWidth: 120 }}
                    >
                      <p className="text-[12px] font-semibold">
                        {stage.label ??
                          STAGE_LABELS[stage.stage] ??
                          stage.stage}
                      </p>
                      <p className="mt-1 text-[18px] font-bold">
                        {stage.keywordCount ?? 0}
                      </p>
                      <p className="text-[10px] opacity-70">키워드</p>
                      {stage.gapScore != null && (
                        <div className="mt-1.5">
                          <div className="h-1 w-full rounded-full bg-white/50">
                            <div
                              className="h-1 rounded-full bg-current opacity-60"
                              style={{
                                width: `${Math.min(stage.gapScore, 100)}%`,
                              }}
                            />
                          </div>
                          <p className="mt-0.5 text-[9px] opacity-70">
                            갭 {Math.round(stage.gapScore)}
                          </p>
                        </div>
                      )}
                      {isWeak && (
                        <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">
                          <AlertTriangle className="h-2.5 w-2.5" /> 취약
                        </span>
                      )}
                    </div>
                    {i < sortedStages.length - 1 && (
                      <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cross-section CTA */}
          <button
            onClick={() => {
              const el = document.getElementById("section-evidence");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            각 단계의 대표 질문과 근거 확인
            <ArrowRight className="h-3 w-3" />
          </button>
        </>
      )}
    </section>
  );
}
