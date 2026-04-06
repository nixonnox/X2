"use client";

import { useState } from "react";
import { PageHeader, ErrorBoundary } from "@/components/shared";
import { ListeningHubLayout } from "@/components/listening-hub/ListeningHubLayout";
import { IntentSummarySection } from "@/components/listening-hub/IntentSummarySection";
import { ClusterSection } from "@/components/listening-hub/ClusterSection";
import { PathfinderSection } from "@/components/listening-hub/PathfinderSection";
import { RoadViewSection } from "@/components/listening-hub/RoadViewSection";
import { PersonaSection } from "@/components/listening-hub/PersonaSection";
import { SearchInsightSection } from "@/components/listening-hub/SearchInsightSection";
import { SearchIntelligenceStatusBar } from "@/components/dashboard/SearchIntelligenceStatusBar";
import type { SearchIntelligenceResult } from "@/services/search-intelligence";
import { Search, Loader2, AlertTriangle } from "lucide-react";

/** API 응답 envelope (route.ts에서 NextResponse.json({success, data})로 반환) */
type AnalyzeApiResponse =
  | { success: true; data: SearchIntelligenceResult }
  | { success: false; error: string };

export default function ListeningHubPage() {
  const [seedKeyword, setSeedKeyword] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<SearchIntelligenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!seedKeyword.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/search-intelligence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedKeyword: seedKeyword.trim() }),
        redirect: "manual",
      });

      // 리다이렉트 감지 (미들웨어에서 로그인 페이지로 보내는 경우)
      if (
        res.type === "opaqueredirect" ||
        res.status === 307 ||
        res.status === 302
      ) {
        throw new Error(
          "세션이 만료되었어요. 페이지를 새로고침하고 다시 시도해 주세요.",
        );
      }

      if (!res.ok) {
        throw new Error("분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }

      const json = (await res.json()) as AnalyzeApiResponse;
      if (!json.success) {
        throw new Error(json.error || "분석에 실패했어요");
      }
      setResult(json.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했어요",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const hasResult = result !== null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="리스닝 허브"
        description="키워드 하나로 의도, 클러스터, 검색 경로, 페르소나, 인사이트를 한눈에 파악하세요."
      />

      {/* Search Input */}
      <form onSubmit={handleAnalyze} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            placeholder="분석할 시드 키워드를 입력하세요 (예: 프로틴 음료)"
            className="input h-10 w-full pl-10 text-[13px]"
            disabled={isAnalyzing}
          />
        </div>
        <button
          type="submit"
          disabled={!seedKeyword.trim() || isAnalyzing}
          className="btn-primary h-10 whitespace-nowrap px-5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              분석 중...
            </>
          ) : (
            "분석 시작"
          )}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-[13px] font-medium text-red-700">{error}</p>
            <p className="mt-0.5 text-[12px] text-red-600">
              네트워크 연결을 확인하고 다시 시도해 주세요.
            </p>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {hasResult && result.trace && (
        <SearchIntelligenceStatusBar
          status={{
            seedKeyword: result.seedKeyword,
            confidence: Math.round((result.trace.confidence ?? 0) * 100),
            freshness: result.trace.freshness as
              | "fresh"
              | "stale"
              | "unknown"
              | undefined,
            analyzedAt: result.analyzedAt,
            isMockOnly: result.trace.isMockOnly,
            isPartial: result.trace.isPartial,
            warnings: result.trace.warnings,
          }}
        />
      )}

      {/* Main Content */}
      <ListeningHubLayout hasResult={hasResult}>
        {/* Section 1: Overview / Intent */}
        <ErrorBoundary>
          <IntentSummarySection result={result} />
        </ErrorBoundary>

        {/* Section 2: Clusters */}
        <ErrorBoundary>
          <ClusterSection clusterResult={result?.cluster} />
        </ErrorBoundary>

        {/* Section 3: Pathfinder */}
        <ErrorBoundary>
          <PathfinderSection pathfinderResult={result?.pathfinder} />
        </ErrorBoundary>

        {/* Section 4: Road View */}
        <ErrorBoundary>
          <RoadViewSection roadviewResult={result?.roadview} />
        </ErrorBoundary>

        {/* Section 5: Persona */}
        <ErrorBoundary>
          <PersonaSection personaResult={result?.persona} />
        </ErrorBoundary>

        {/* Section 6: Insights */}
        <ErrorBoundary>
          <SearchInsightSection result={result} />
        </ErrorBoundary>

        {/* Section 7-8 (Actions, Evidence): 백엔드 어그리게이터 미구현 — P1에서 복구 예정.
            컴포넌트 파일은 보존됨: SearchActionSection.tsx, SearchEvidenceSection.tsx */}
      </ListeningHubLayout>
    </div>
  );
}
