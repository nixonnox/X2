"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Sparkles,
  Loader2,
  Network,
  ChevronDown,
  ChevronRight,
  MessageSquareText,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import type {
  IntentGraphData,
  KeywordCluster,
  IntentCategory,
} from "@/lib/intent-engine";
import { INTENT_CATEGORY_LABELS } from "@/lib/intent-engine";

// ── Types ──

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

type GptAnalysisState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: GptClusterAnalysis }
  | { status: "error"; message: string };

type GptClusterAnalysis = {
  summary: string;
  topKeywords: string[];
  personas: { label: string; situation: string; questions: string[] }[];
  topics: { question: string; evidence: string }[];
};

// ── Colors ──

const CLUSTER_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
  "#14b8a6",
  "#e11d48",
  "#a855f7",
  "#0ea5e9",
  "#d97706",
  "#22c55e",
  "#7c3aed",
  "#f43f5e",
  "#0891b2",
  "#ca8a04",
];

// ── Component ──

export default function ClusterFinderPage() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(),
  );
  const [gptAnalysis, setGptAnalysis] = useState<GptAnalysisState>({
    status: "idle",
  });

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;
      setAnalysis({ status: "loading", keyword: seed });
      setSelectedCluster(null);
      setGptAnalysis({ status: "idle" });
      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            mode: "sync",
            maxDepth: 2,
            maxKeywords: 200,
            platforms: ["youtube", "instagram", "tiktok"],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data)
          throw new Error(json.error ?? "분석 결과가 없습니다.");
        setAnalysis({
          status: "success",
          keyword: seed,
          data: json.data as IntentGraphData,
        });
        setInputValue("");
      } catch (err) {
        setAnalysis({
          status: "error",
          keyword: seed,
          message: (err as Error).message,
        });
      }
    },
    [inputValue],
  );

  // Extract clusters
  const clusters = useMemo<KeywordCluster[]>(() => {
    if (analysis.status !== "success") return [];
    return analysis.data.clusters ?? [];
  }, [analysis]);

  // Cluster size bar chart
  const clusterBarData = useMemo(() => {
    return clusters
      .map((c, i) => ({
        name: c.name || `C${i + 1}`,
        keywords: c.size ?? c.keywords?.length ?? 0,
        avgGap: c.avgGapScore ?? 0,
      }))
      .sort((a, b) => b.keywords - a.keywords);
  }, [clusters]);

  // Get selected cluster detail
  const selectedClusterData = useMemo(() => {
    if (!selectedCluster) return null;
    return clusters.find((c) => c.id === selectedCluster) ?? null;
  }, [clusters, selectedCluster]);

  // Get nodes for selected cluster
  const clusterNodes = useMemo(() => {
    if (analysis.status !== "success" || !selectedCluster) return [];
    return analysis.data.nodes.filter((n) => n.clusterId === selectedCluster);
  }, [analysis, selectedCluster]);

  const toggleExpand = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  // GPT Analysis — calls /api/intent/gpt-analyze
  const handleGptAnalysis = useCallback(async () => {
    if (!selectedClusterData || analysis.status !== "success") return;
    setGptAnalysis({ status: "loading" });
    try {
      const keywords = clusterNodes.map((n) => n.name).slice(0, 30);
      const res = await fetch("/api/intent/gpt-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword: analysis.keyword,
          clusterName: selectedClusterData.name ?? selectedClusterData.centroid,
          keywords,
          dominantIntent: selectedClusterData.dominantIntent,
          dominantPhase: selectedClusterData.dominantPhase,
          avgGapScore: selectedClusterData.avgGapScore,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success || !json.data)
        throw new Error(json.error ?? "GPT 분석 결과가 없습니다.");
      setGptAnalysis({
        status: "success",
        result: json.data as GptClusterAnalysis,
      });
    } catch (err) {
      setGptAnalysis({ status: "error", message: (err as Error).message });
    }
  }, [selectedClusterData, clusterNodes, analysis]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="클러스터 파인더"
        description="검색어 전후로 검색한 키워드를 모아 마이크로 모멘트를 가시화합니다."
        guide="키워드를 분석하면 유사 검색어를 자동으로 클러스터링하고, 각 클러스터의 소비자 관심사와 트렌드를 파악할 수 있습니다."
      />

      {/* ── Input ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="클러스터 분석할 키워드를 입력하세요"
              className="input w-full pl-8"
              disabled={analysis.status === "loading"}
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || analysis.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {analysis.status === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 분석 중...
              </>
            ) : (
              <>
                <Network className="h-3.5 w-3.5" /> 클러스터 분석
              </>
            )}
          </button>
        </div>
        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              키워드를 클러스터링하고 있습니다...
            </p>
          </div>
        )}
        {analysis.status === "error" && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-[13px] text-red-700">
              분석 실패: {analysis.message}
            </p>
          </div>
        )}
      </div>

      {/* ── Empty ── */}
      {analysis.status === "idle" && (
        <EmptyState
          icon={Network}
          title="관련 검색어를 자동으로 그룹핑합니다"
          description="키워드를 입력하면 유사한 검색어를 클러스터로 묶고, 각 클러스터의 핵심 토픽과 소비자 관심사를 분석합니다."
        />
      )}

      {/* ── Results ── */}
      {analysis.status === "success" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                시드 키워드
              </p>
              <p className="mt-0.5 truncate text-[14px] font-semibold">
                {analysis.keyword}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                전체 키워드
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalKeywords}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                클러스터 수
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {clusters.length}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                평균 갭 스코어
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.avgGapScore}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="클러스터 크기 분포"
              description="클러스터별 포함 키워드 수"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusterBarData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Bar
                      dataKey="keywords"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                      name="키워드 수"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="클러스터별 갭 스코어"
              description="블루오션 기회가 높은 클러스터"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusterBarData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      domain={[0, 100]}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                      formatter={(v) => `${Number(v).toFixed(1)}`}
                    />
                    <Bar
                      dataKey="avgGap"
                      fill="#10b981"
                      radius={[0, 3, 3, 0]}
                      name="평균 갭"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Cluster List */}
          <div className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">클러스터 목록</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                클러스터를 클릭하면 포함된 키워드를 확인하고, GPT 분석을 실행할
                수 있습니다.
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {clusters.map((cluster, i) => {
                const isExpanded = expandedClusters.has(cluster.id);
                const isSelected = selectedCluster === cluster.id;
                const nodes = analysis.data.nodes.filter(
                  (n) => n.clusterId === cluster.id,
                );
                return (
                  <div key={cluster.id}>
                    <button
                      onClick={() => {
                        toggleExpand(cluster.id);
                        setSelectedCluster(cluster.id);
                      }}
                      className={`hover:bg-[var(--secondary)]/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}
                    >
                      <span
                        className="h-3 w-3 flex-shrink-0 rounded-sm"
                        style={{
                          backgroundColor:
                            CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                        }}
                      />
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium">
                          {cluster.name || `클러스터 ${i + 1}`}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {nodes.length}개 키워드 · 갭{" "}
                          {(cluster.avgGapScore ?? 0).toFixed(0)}
                          {cluster.dominantIntent &&
                            ` · ${INTENT_CATEGORY_LABELS[cluster.dominantIntent as IntentCategory]?.label ?? cluster.dominantIntent}`}
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium">
                        Gap {(cluster.avgGapScore ?? 0).toFixed(0)}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="bg-[var(--secondary)]/30 space-y-2 px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {nodes.slice(0, 30).map((n) => (
                            <span
                              key={n.id}
                              className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${n.isRising ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                            >
                              {n.name}
                              {n.isRising && (
                                <span className="ml-1 text-[9px]">↑</span>
                              )}
                            </span>
                          ))}
                          {nodes.length > 30 && (
                            <span className="self-center text-[11px] text-[var(--muted-foreground)]">
                              +{nodes.length - 30}개
                            </span>
                          )}
                        </div>
                        <button
                          onClick={handleGptAnalysis}
                          disabled={gptAnalysis.status === "loading"}
                          className="btn-primary mt-2 flex items-center gap-1.5 text-[12px] disabled:opacity-50"
                        >
                          {gptAnalysis.status === "loading" ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" /> GPT
                              분석 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" /> GPT 종합 분석
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* GPT Analysis Result */}
          {gptAnalysis.status === "success" && selectedClusterData && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-2 text-[14px] font-semibold">
                <Sparkles className="h-4 w-4 text-amber-500" />
                GPT 분석 결과: {selectedClusterData.name}
              </h2>

              {/* 종합 분석 */}
              <div className="card p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                  <MessageSquareText className="h-3.5 w-3.5 text-blue-500" />
                  종합 분석
                </h3>
                <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  {gptAnalysis.result.summary}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {gptAnalysis.result.topKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* 페르소나 분석 */}
              <div className="card p-4">
                <h3 className="mb-3 text-[13px] font-semibold">
                  페르소나 분석
                </h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  {gptAnalysis.result.personas.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-[var(--border)] p-3"
                    >
                      <p className="mb-1 text-[12px] font-semibold">
                        {p.label}
                      </p>
                      <p className="mb-2 text-[11px] text-[var(--muted-foreground)]">
                        {p.situation}
                      </p>
                      <div className="space-y-1">
                        {p.questions.map((q, qi) => (
                          <p
                            key={qi}
                            className="text-[11px] text-[var(--foreground)]"
                          >
                            • {q}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 주요 토픽 분석 */}
              <div className="card p-4">
                <h3 className="mb-3 text-[13px] font-semibold">
                  주요 토픽 분석 (상위 10개 질문)
                </h3>
                <div className="space-y-2">
                  {gptAnalysis.result.topics.map((t, i) => (
                    <div
                      key={i}
                      className="flex gap-3 rounded-md border border-[var(--border)] p-2.5"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-medium">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[12px] font-medium">{t.question}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {t.evidence}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
