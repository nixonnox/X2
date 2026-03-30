"use client";

import { ArrowRight, Lightbulb, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import type { SearchIntelligenceResult } from "@/services/search-intelligence";

type InsightItem = {
  category: string;
  title: string;
  narrative: string;
  source?: string;
};

type SearchInsightSectionProps = {
  result: SearchIntelligenceResult | null;
};

/**
 * Extracts key findings from each engine result to display as insight cards.
 */
function extractInsights(result: SearchIntelligenceResult): InsightItem[] {
  const insights: InsightItem[] = [];

  // From cluster
  if (result.cluster?.success && result.cluster.data) {
    const data = result.cluster.data as { clusters?: { label: string }[]; totalClusters?: number };
    if (data.clusters && data.clusters.length > 0) {
      insights.push({
        category: "클러스터",
        title: `${data.totalClusters ?? data.clusters.length}개 주제 클러스터 발견`,
        narrative: `"${result.seedKeyword}" 관련 키워드가 ${data.clusters.length}개의 의미 그룹으로 분류되었습니다. 주요 클러스터: ${data.clusters.slice(0, 3).map((c) => c.label).join(", ")}`,
        source: "cluster",
      });
    }
  }

  // From pathfinder
  if (result.pathfinder?.success && result.pathfinder.data) {
    const data = result.pathfinder.data as { totalNodes?: number; totalPaths?: number; nodes?: unknown[] };
    const nodeCount = data.totalNodes ?? data.nodes?.length ?? 0;
    if (nodeCount > 0) {
      insights.push({
        category: "검색 경로",
        title: `${nodeCount}개 노드의 검색 네트워크 구축`,
        narrative: `사용자들이 "${result.seedKeyword}"를 중심으로 ${data.totalPaths ?? 0}개의 검색 경로를 형성하고 있습니다.`,
        source: "pathfinder",
      });
    }
  }

  // From roadview
  if (result.roadview?.success && result.roadview.data) {
    const data = result.roadview.data as { stages?: { stage: string; keywordCount?: number }[]; summary?: { weakStages?: string[] } };
    const weakStages = data.summary?.weakStages ?? [];
    if (data.stages && data.stages.length > 0) {
      if (weakStages.length > 0) {
        insights.push({
          category: "여정 갭",
          title: `${weakStages.length}개 여정 단계에서 콘텐츠 갭 발견`,
          narrative: `다음 단계에서 콘텐츠가 부족합니다: ${weakStages.join(", ")}. 이 단계를 보강하면 전환율 개선에 도움이 됩니다.`,
          source: "roadview",
        });
      } else {
        insights.push({
          category: "사용자 여정",
          title: `${data.stages.length}단계 검색 여정 매핑 완료`,
          narrative: `"${result.seedKeyword}" 관련 사용자 여정이 ${data.stages.length}단계로 매핑되었습니다.`,
          source: "roadview",
        });
      }
    }
  }

  // From persona
  if (result.persona?.success && result.persona.data) {
    const data = result.persona.data as { personas?: { label?: string; name?: string }[]; totalPersonas?: number };
    if (data.personas && data.personas.length > 0) {
      insights.push({
        category: "페르소나",
        title: `${data.totalPersonas ?? data.personas.length}개 검색자 유형 식별`,
        narrative: `주요 검색자 유형: ${data.personas.slice(0, 3).map((p) => p.label ?? p.name).join(", ")}. 각 유형별 맞춤 콘텐츠 전략이 필요합니다.`,
        source: "persona",
      });
    }
  }

  return insights;
}

const CATEGORY_BADGE: Record<string, string> = {
  "클러스터": "bg-purple-50 text-purple-700",
  "검색 경로": "bg-blue-50 text-blue-700",
  "여정 갭": "bg-red-50 text-red-700",
  "사용자 여정": "bg-emerald-50 text-emerald-700",
  "페르소나": "bg-amber-50 text-amber-700",
};

export function SearchInsightSection({ result }: SearchInsightSectionProps) {
  if (!result) {
    return (
      <section id="section-insight">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Lightbulb className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 인사이트가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const insights = extractInsights(result);
  const confidence = result.trace?.confidence ?? 0;
  const freshness = result.trace?.freshness;

  return (
    <section id="section-insight" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          인사이트
        </h2>
        <Link
          href="/insights"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {confidence < 0.3 && (
        <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            전체 신뢰도가 낮습니다 ({Math.round(confidence * 100)}%). 인사이트의 정확도가 제한적일 수 있습니다.
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

      {insights.length === 0 ? (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            추출된 인사이트가 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((insight, i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        CATEGORY_BADGE[insight.category] ??
                        "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {insight.category}
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-[13px] font-semibold text-[var(--foreground)]">
                    {insight.title}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                    {insight.narrative}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
