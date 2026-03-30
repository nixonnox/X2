"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";
import { ListeningHubLayout } from "@/components/listening-hub/ListeningHubLayout";
import { IntentSummarySection } from "@/components/listening-hub/IntentSummarySection";
import { ClusterSection } from "@/components/listening-hub/ClusterSection";
import { PathfinderSection } from "@/components/listening-hub/PathfinderSection";
import { RoadViewSection } from "@/components/listening-hub/RoadViewSection";
import { PersonaSection } from "@/components/listening-hub/PersonaSection";
import { SearchInsightSection } from "@/components/listening-hub/SearchInsightSection";
import { SearchActionSection } from "@/components/listening-hub/SearchActionSection";
import { SearchEvidenceSection } from "@/components/listening-hub/SearchEvidenceSection";
import { SearchIntelligenceStatusBar } from "@/components/dashboard/SearchIntelligenceStatusBar";
import type {
  SearchIntelligenceResult,
  EngineExecutionResult,
} from "@/services/search-intelligence";
import {
  Search,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/**
 * API 응답은 SearchIntelligenceResult + 추가 통합 엔진 결과.
 * SearchIntelligenceResult: seedKeyword, payloadSummary, trace, durationMs,
 *   cluster?, pathfinder?, roadview?, persona?, analyzedAt, completedAt
 * 추가 필드: insight, action, evidence (통합 서비스에서 생성)
 */
type ListeningHubResponse = SearchIntelligenceResult & {
  insight?: EngineExecutionResult<unknown>;
  action?: EngineExecutionResult<unknown>;
  evidence?: EngineExecutionResult<unknown>;
};

export default function ListeningHubPage() {
  const [seedKeyword, setSeedKeyword] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ListeningHubResponse | null>(null);
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
        body: JSON.stringify({ keyword: seedKeyword.trim() }),
      });

      if (!res.ok) {
        throw new Error(`분석 실패 (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다"
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
        description="검색 인텔리전스 기반 통합 분석 — 의도 → 클러스터 → 검색 경로 → 사용자 여정 → 페르소나 → 인사이트 → 액션"
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
      {hasResult && (
        <SearchIntelligenceStatusBar
          status={{
            seedKeyword: result.seedKeyword,
            confidence: Math.round(result.trace.confidence * 100),
            freshness: result.trace.freshness as "fresh" | "stale" | "unknown" | undefined,
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
        <IntentSummarySection result={result} />

        {/* Section 2: Clusters */}
        <ClusterSection clusterResult={result?.cluster} />

        {/* Section 3: Pathfinder */}
        <PathfinderSection pathfinderResult={result?.pathfinder} />

        {/* Section 4: Road View */}
        <RoadViewSection roadviewResult={result?.roadview} />

        {/* Section 5: Persona */}
        <PersonaSection personaResult={result?.persona} />

        {/* Section 6: Insights */}
        <SearchInsightSection result={result} />

        {/* Section 7: Actions */}
        <SearchActionSection actionResult={result?.action} />

        {/* Section 8: Evidence */}
        <SearchEvidenceSection evidenceResult={result?.evidence} />
      </ListeningHubLayout>
    </div>
  );
}
