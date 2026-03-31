"use client";

import { useState } from "react";
import { Sparkles, Loader2, Lightbulb, Target, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = {
  type:
    | "intelligence_summary"
    | "cluster_analysis"
    | "persona_analysis"
    | "journey_analysis"
    | "trend_change"
    | "competitor_comparison"
    | "demographic_analysis";
  keyword: string;
  data: Record<string, unknown>;
};

/**
 * AI 인사이트 해석 패널.
 * trpc.intelligence.interpret를 호출하여 LLM 기반 해석을 표시.
 */
export function AiInsightPanel({ type, keyword, data }: Props) {
  const [expanded, setExpanded] = useState(false);

  const interpretMutation = trpc.intelligence.interpret.useMutation();

  const handleGenerate = () => {
    interpretMutation.mutate({ type, keyword, data });
    setExpanded(true);
  };

  const result = interpretMutation.data;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50">
      {/* Header */}
      <button
        onClick={result ? () => setExpanded(!expanded) : handleGenerate}
        disabled={interpretMutation.isPending}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-700">AI 인사이트</span>
          {result?.usedLLM && (
            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">Claude</span>
          )}
          {result && !result.usedLLM && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">규칙 기반</span>
          )}
        </div>
        {interpretMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        ) : result ? (
          expanded ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />
        ) : (
          <span className="text-[11px] text-indigo-500">클릭하여 생성</span>
        )}
      </button>

      {/* Content */}
      {expanded && result && (
        <div className="border-t border-indigo-100 px-4 py-3 space-y-3">
          {/* Interpretation */}
          <p className="text-[13px] leading-relaxed text-gray-700">
            {result.interpretation}
          </p>

          {/* Key Findings */}
          {result.keyFindings.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-600">
                <Lightbulb className="h-3 w-3" /> 핵심 발견
              </div>
              <ul className="space-y-1">
                {result.keyFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-gray-600">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Actions */}
          {result.suggestedActions.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-gray-600">
                <Target className="h-3 w-3" /> 추천 액션
              </div>
              <ul className="space-y-1">
                {result.suggestedActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-emerald-700">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
