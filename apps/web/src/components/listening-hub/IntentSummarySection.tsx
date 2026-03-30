"use client";

import { ArrowRight, Search, BarChart3, MessageCircleQuestion, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { SearchIntelligenceResult } from "@/services/search-intelligence";

type IntentSummarySectionProps = {
  result: SearchIntelligenceResult | null;
};

export function IntentSummarySection({ result }: IntentSummarySectionProps) {
  if (!result) {
    return (
      <section id="section-overview">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Search className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 인텐트 개요가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const { seedKeyword, payloadSummary, trace, durationMs } = result;

  return (
    <section id="section-overview" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          인텐트 개요
        </h2>
        <Link
          href="/intent"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          심층 분석 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Low confidence warning */}
      {trace.confidence < 0.3 && (
        <div className="rounded-md bg-orange-50 px-3 py-2 text-[12px] text-orange-700">
          신뢰도가 낮습니다 ({Math.round(trace.confidence * 100)}%). 데이터가 충분하지 않을 수 있습니다.
        </div>
      )}

      {/* Stale data warning */}
      {trace.freshness === "stale" && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
          데이터가 오래되었습니다. 최신 분석을 다시 실행하세요.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="card p-3">
          <p className="text-[11px] text-[var(--muted-foreground)]">시드 키워드</p>
          <p className="mt-0.5 truncate text-[14px] font-semibold">{seedKeyword}</p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5">
            <Search className="h-3 w-3 text-[var(--muted-foreground)]" />
            <p className="text-[11px] text-[var(--muted-foreground)]">관련 키워드</p>
          </div>
          <p className="mt-0.5 text-[14px] font-semibold">
            {payloadSummary.totalRelatedKeywords}개
          </p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-[var(--muted-foreground)]" />
            <p className="text-[11px] text-[var(--muted-foreground)]">SERP 데이터</p>
          </div>
          <p className="mt-0.5 text-[14px] font-semibold">
            {payloadSummary.hasSerpData ? "수집됨" : "없음"}
          </p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-[var(--muted-foreground)]" />
            <p className="text-[11px] text-[var(--muted-foreground)]">트렌드 데이터</p>
          </div>
          <p className="mt-0.5 text-[14px] font-semibold">
            {payloadSummary.hasTrendData ? "수집됨" : "없음"}
          </p>
        </div>
        <div className="card p-3">
          <div className="flex items-center gap-1.5">
            <MessageCircleQuestion className="h-3 w-3 text-[var(--muted-foreground)]" />
            <p className="text-[11px] text-[var(--muted-foreground)]">질문 데이터</p>
          </div>
          <p className="mt-0.5 text-[14px] font-semibold">
            {payloadSummary.hasQuestionData ? "수집됨" : "없음"}
          </p>
        </div>
      </div>

      {/* Sources & timing */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
        <span>
          소스: {payloadSummary.sourcesUsed.join(", ") || "없음"}
        </span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span>분석 소요: {(durationMs / 1000).toFixed(1)}초</span>
        <span className="h-3 w-px bg-[var(--border)]" />
        <span>
          신뢰도: {Math.round(trace.confidence * 100)}%
        </span>
      </div>
    </section>
  );
}
