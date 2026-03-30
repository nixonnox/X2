"use client";

/**
 * useVerticalPreviewQuery
 *
 * 4개 업종 비교 프리뷰 데이터를 요청하고 상태를 관리하는 hook.
 * tRPC의 verticalDocument.detailedComparison 엔드포인트를 호출.
 */

import { useState, useCallback } from "react";
import type {
  VerticalPreviewViewModel,
  VerticalPreviewScreenState,
} from "../types/viewModel";

// ─── Return Type ──────────────────────────────────────────────────

export type UseVerticalPreviewQueryReturn = {
  viewModel: VerticalPreviewViewModel | null;
  screenState: VerticalPreviewScreenState;
  analyze: (input: VerticalPreviewQueryInput) => Promise<void>;
  reset: () => void;
};

// ─── Input Type ───────────────────────────────────────────────────

export type VerticalPreviewQueryInput = {
  seedKeyword: string;
  outputType: "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT";
  audience: string;
  confidence?: number;
  evidenceItems?: any[];
  insights?: any[];
  actions?: any[];
  category?: string;
  clusterTopics?: string[];
  relatedKeywords?: string[];
};

// ─── Initial State ────────────────────────────────────────────────

function buildScreenState(
  partial: Partial<VerticalPreviewScreenState>,
  status: VerticalPreviewScreenState["status"],
  errorMessage?: string,
): VerticalPreviewScreenState {
  return {
    status,
    isEmpty: partial.isEmpty ?? false,
    hasError: status === "error",
    errorMessage,
    loadingMessage: status === "loading" ? "4개 업종 비교 프리뷰 생성 중..." : undefined,
    qualityWarnings: partial.qualityWarnings ?? [],
    isMockBased: partial.isMockBased ?? false,
    isStale: partial.isStale ?? false,
    isPartial: partial.isPartial ?? false,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useVerticalPreviewQuery(): UseVerticalPreviewQueryReturn {
  const [viewModel, setViewModel] = useState<VerticalPreviewViewModel | null>(null);
  const [screenState, setScreenState] = useState<VerticalPreviewScreenState>(
    buildScreenState({}, "idle"),
  );

  const analyze = useCallback(async (input: VerticalPreviewQueryInput) => {
    setScreenState(buildScreenState({}, "loading"));

    try {
      const body = {
        result: {
          seedKeyword: input.seedKeyword,
          analyzedAt: new Date().toISOString(),
          trace: {
            confidence: input.confidence ?? 0.7,
            freshness: "fresh",
          },
        },
        quality: {
          level: "MEDIUM" as const,
          confidence: input.confidence ?? 0.7,
          freshness: "fresh" as const,
        },
        evidenceItems: input.evidenceItems ?? [],
        insights: input.insights ?? [],
        actions: input.actions ?? [],
        outputType: input.outputType,
        audience: input.audience,
        category: input.category,
        clusterTopics: input.clusterTopics,
        relatedKeywords: input.relatedKeywords,
      };

      const res = await fetch("/api/trpc/verticalDocument.detailedComparison", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // tRPC query uses GET with input as query param
      });

      // For tRPC, use the client directly in production.
      // This hook provides the pattern; actual tRPC integration
      // uses trpc.verticalDocument.detailedComparison.useQuery()
      // For now, simulate with direct fetch to POST endpoint.
      const postRes = await fetch("/api/vertical-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!postRes.ok) {
        throw new Error(`프리뷰 생성 실패: ${postRes.status}`);
      }

      const data = await postRes.json();
      const vm = data.viewModel as VerticalPreviewViewModel;

      if (!vm || !vm.comparisonSections) {
        setScreenState(buildScreenState({ isEmpty: true }, "success"));
        return;
      }

      setViewModel(vm);
      setScreenState(buildScreenState({
        qualityWarnings: vm.inputSummary.qualityWarnings,
        isMockBased: vm.inputSummary.qualityWarnings.includes("Mock 데이터 기반"),
        isStale: vm.inputSummary.qualityWarnings.includes("Stale 데이터"),
        isPartial: vm.inputSummary.qualityWarnings.includes("Partial 데이터"),
      }, "success"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setScreenState(buildScreenState({}, "error", message));
    }
  }, []);

  const reset = useCallback(() => {
    setViewModel(null);
    setScreenState(buildScreenState({}, "idle"));
  }, []);

  return { viewModel, screenState, analyze, reset };
}
