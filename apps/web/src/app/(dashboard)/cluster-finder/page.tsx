"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  Sparkles,
  Loader2,
  Network,
  ChevronDown,
  ChevronRight,
  MessageSquareText,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import { useClusterQuery } from "@/features/persona-cluster";
import type { ClusterViewModel } from "@/features/persona-cluster";
import { ScreenStatePanel } from "@/features/persona-cluster/components/ScreenStatePanel";
import { CLUSTER_CATEGORY_LABELS } from "@/lib/persona-cluster-engine";

// ── Colors ──

const CLUSTER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#e11d48",
  "#a855f7", "#0ea5e9", "#d97706", "#22c55e", "#7c3aed", "#f43f5e",
  "#0891b2", "#ca8a04",
];

// ── GPT Analysis Types ──

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

// ── Component ──

export default function ClusterFinderPage() {
  const [inputValue, setInputValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [gptAnalysis, setGptAnalysis] = useState<GptAnalysisState>({ status: "idle" });

  const { clusters, summary, screenState, analyze } = useClusterQuery();

  const handleAnalyze = async (kw?: string) => {
    const seed = (kw ?? inputValue).trim();
    if (!seed) return;
    setKeyword(seed);
    setSelectedCluster(null);
    setExpandedClusters(new Set());
    setGptAnalysis({ status: "idle" });
    setInputValue("");
    await analyze(seed);
  };

  // Cluster size bar chart
  const clusterBarData = useMemo(() => {
    return clusters
      .map((c, i) => ({
        name: c.label || `C${i + 1}`,
        keywords: c.memberCount,
        avgGap: c.avgGapScore,
      }))
      .sort((a, b) => b.keywords - a.keywords);
  }, [clusters]);

  // Intent distribution bar chart
  const intentBarData = useMemo(() => {
    if (!summary) return [];
    return summary.intentDistribution;
  }, [summary]);

  const selectedClusterData = useMemo(() => {
    if (!selectedCluster) return null;
    return clusters.find((c) => c.id === selectedCluster) ?? null;
  }, [clusters, selectedCluster]);

  const toggleExpand = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  };

  // GPT Analysis — calls /api/intent/gpt-analyze (기존 API 유지)
  const handleGptAnalysis = useCallback(async () => {
    if (!selectedClusterData) return;
    setGptAnalysis({ status: "loading" });
    try {
      const keywords = selectedClusterData.representativeKeywords.slice(0, 30);
      const res = await fetch("/api/intent/gpt-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword: keyword,
          clusterName: selectedClusterData.label,
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
      setGptAnalysis({ status: "success", result: json.data as GptClusterAnalysis });
    } catch (err) {
      setGptAnalysis({ status: "error", message: (err as Error).message });
    }
  }, [selectedClusterData, keyword]);

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
              disabled={screenState.status === "loading"}
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || screenState.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {screenState.status === "loading" ? (
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
        <ScreenStatePanel
          state={screenState}
          keyword={keyword}
          loadingMessage="키워드를 클러스터링하고 있습니다..."
        />
      </div>

      {/* ── Empty / Idle ── */}
      {screenState.status === "idle" && (
        <EmptyState
          icon={Network}
          title="관련 검색어를 자동으로 그룹핑합니다"
          description="키워드를 입력하면 유사한 검색어를 클러스터로 묶고, 각 클러스터의 핵심 토픽과 소비자 관심사를 분석합니다."
        />
      )}

      {/* ── Results ── */}
      {screenState.status === "success" && !screenState.isEmpty && summary && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">시드 키워드</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold">{keyword}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">전체 키워드</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.totalKeywords}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">클러스터 수</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.totalClusters}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">평균 갭 스코어</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.avgGapScore}</p>
            </div>
          </div>

          {/* Meta info */}
          {screenState.durationMs != null && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              분석 완료 · {(screenState.durationMs / 1000).toFixed(1)}초 소요
              {screenState.lowConfidenceItems > 0 && ` · ${screenState.lowConfidenceItems}개 낮은 신뢰도 클러스터`}
            </p>
          )}

          {/* Charts */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="클러스터 크기 분포"
              description="클러스터별 포함 키워드 수"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusterBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }} />
                    <Bar dataKey="keywords" fill="#3b82f6" radius={[3, 3, 0, 0]} name="키워드 수" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="검색 의도 분포"
              description="클러스터별 의도 분류"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }} />
                    <Bar dataKey="count" name="키워드 수" radius={[3, 3, 0, 0]}>
                      {intentBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
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
                클러스터를 클릭하면 포함된 키워드를 확인하고, GPT 분석을 실행할 수 있습니다.
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {clusters.map((cluster, i) => (
                <ClusterRow
                  key={cluster.id}
                  cluster={cluster}
                  color={CLUSTER_COLORS[i % CLUSTER_COLORS.length]!}
                  isExpanded={expandedClusters.has(cluster.id)}
                  isSelected={selectedCluster === cluster.id}
                  onToggle={() => {
                    toggleExpand(cluster.id);
                    setSelectedCluster(cluster.id);
                  }}
                  onGptAnalysis={handleGptAnalysis}
                  gptLoading={gptAnalysis.status === "loading"}
                />
              ))}
            </div>
          </div>

          {/* GPT Analysis Result */}
          {gptAnalysis.status === "success" && selectedClusterData && (
            <GptAnalysisPanel
              result={gptAnalysis.result}
              clusterLabel={selectedClusterData.label}
            />
          )}
          {gptAnalysis.status === "error" && (
            <div className="rounded-md bg-red-50 px-3 py-2">
              <p className="text-[12px] text-red-700">GPT 분석 실패: {gptAnalysis.message}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Cluster Row ──

function ClusterRow({
  cluster,
  color,
  isExpanded,
  isSelected,
  onToggle,
  onGptAnalysis,
  gptLoading,
}: {
  cluster: ClusterViewModel;
  color: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onGptAnalysis: () => void;
  gptLoading: boolean;
}) {
  const catLabel = CLUSTER_CATEGORY_LABELS[cluster.category as keyof typeof CLUSTER_CATEGORY_LABELS];

  return (
    <div>
      <button
        onClick={onToggle}
        className={`hover:bg-[var(--secondary)]/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}
      >
        <span
          className="h-3 w-3 flex-shrink-0 rounded-sm"
          style={{ backgroundColor: color }}
        />
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-medium">
              {cluster.label}
            </p>
            {cluster.lowConfidenceFlag && (
              <AlertTriangle className="h-3 w-3 flex-shrink-0 text-orange-400" />
            )}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {cluster.memberCount}개 키워드
            · {cluster.dominantIntentLabel}
            · {cluster.categoryLabel}
            {cluster.risingCount > 0 && ` · ↑${cluster.risingCount}개 급상승`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {catLabel && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: catLabel.color + "15",
                color: catLabel.color,
              }}
            >
              {catLabel.label}
            </span>
          )}
          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium">
            점수 {cluster.score}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-[var(--secondary)]/30 space-y-2 px-4 py-3">
          {/* Themes */}
          {cluster.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cluster.themes.map((theme) => (
                <span
                  key={theme}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Representative keywords */}
          <div className="flex flex-wrap gap-1.5">
            {cluster.representativeKeywords.map((kw) => (
              <span
                key={kw}
                className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700"
              >
                {kw}
              </span>
            ))}
          </div>

          {/* Members (expanded) */}
          {cluster.members.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {cluster.members.slice(0, 30).map((m) => (
                <span
                  key={m.id}
                  className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    m.isRising
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-50 text-gray-600"
                  }`}
                >
                  {m.label}
                  {m.isRising && <span className="ml-1 text-[9px]">↑</span>}
                </span>
              ))}
              {cluster.members.length > 30 && (
                <span className="self-center text-[11px] text-[var(--muted-foreground)]">
                  +{cluster.members.length - 30}개
                </span>
              )}
            </div>
          )}

          {/* Representative questions */}
          {cluster.representativeQuestions.length > 0 && (
            <div className="space-y-1 rounded-md bg-white/50 p-2">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">대표 질문</p>
              {cluster.representativeQuestions.slice(0, 5).map((q, i) => (
                <p key={i} className="text-[11px] text-[var(--foreground)]">• {q}</p>
              ))}
            </div>
          )}

          <button
            onClick={onGptAnalysis}
            disabled={gptLoading}
            className="btn-primary mt-2 flex items-center gap-1.5 text-[12px] disabled:opacity-50"
          >
            {gptLoading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> GPT 분석 중...
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
}

// ── GPT Analysis Panel ──

function GptAnalysisPanel({
  result,
  clusterLabel,
}: {
  result: GptClusterAnalysis;
  clusterLabel: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold">
        <Sparkles className="h-4 w-4 text-amber-500" />
        GPT 분석 결과: {clusterLabel}
      </h2>

      <div className="card p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
          <MessageSquareText className="h-3.5 w-3.5 text-blue-500" />
          종합 분석
        </h3>
        <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          {result.summary}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {result.topKeywords.map((kw) => (
            <span key={kw} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
              {kw}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-[13px] font-semibold">페르소나 분석</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {result.personas.map((p, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-3">
              <p className="mb-1 text-[12px] font-semibold">{p.label}</p>
              <p className="mb-2 text-[11px] text-[var(--muted-foreground)]">{p.situation}</p>
              <div className="space-y-1">
                {p.questions.map((q, qi) => (
                  <p key={qi} className="text-[11px] text-[var(--foreground)]">• {q}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-[13px] font-semibold">주요 토픽 분석 (상위 10개 질문)</h3>
        <div className="space-y-2">
          {result.topics.map((t, i) => (
            <div key={i} className="flex gap-3 rounded-md border border-[var(--border)] p-2.5">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-medium">
                {i + 1}
              </span>
              <div>
                <p className="text-[12px] font-medium">{t.question}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{t.evidence}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
