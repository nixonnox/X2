"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Sparkles,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Target,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import type {
  IntentGraphData,
  IntentCategory,
  ClassifiedKeyword,
  TemporalPhase,
} from "@/lib/intent-engine";
import {
  INTENT_CATEGORY_LABELS,
  TEMPORAL_PHASE_LABELS,
  GAP_LEVEL_LABELS,
} from "@/lib/intent-engine";

// ── Helpers ──

const INTENT_COLORS: Record<IntentCategory, string> = {
  discovery: "#3b82f6",
  comparison: "#f59e0b",
  action: "#10b981",
  troubleshooting: "#ef4444",
  unknown: "#6b7280",
};

const PHASE_COLORS: Record<TemporalPhase, string> = {
  before: "#8b5cf6",
  current: "#3b82f6",
  after: "#10b981",
};

const INTENT_BADGE: Record<IntentCategory, string> = {
  discovery: "bg-blue-50 text-blue-700",
  comparison: "bg-amber-50 text-amber-700",
  action: "bg-emerald-50 text-emerald-700",
  troubleshooting: "bg-red-50 text-red-700",
  unknown: "bg-gray-50 text-gray-600",
};

const TREND_ICON = {
  rising: ArrowUpRight,
  declining: ArrowDownRight,
  stable: Minus,
} as const;
const TREND_COLOR = {
  rising: "text-emerald-600",
  declining: "text-[var(--destructive)]",
  stable: "text-[var(--muted-foreground)]",
} as const;

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

// ── Component ──

export default function IntentFinderPage() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [history, setHistory] = useState<
    { keyword: string; analyzedAt: string; count: number }[]
  >([]);
  const [intentFilter, setIntentFilter] = useState<IntentCategory | "all">(
    "all",
  );
  const [phaseFilter, setPhaseFilter] = useState<TemporalPhase | "all">("all");

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const raw = (keyword ?? inputValue).trim();
      if (!raw) return;
      // 콤마 구분 다중 키워드 지원: "AI, 마케팅, 숏폼" → 첫 번째로 분석, 나머지는 확장에 포함
      const seeds = raw
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const seed = seeds[0];
      if (!seed) return;
      setAnalysis({
        status: "loading",
        keyword: seeds.length > 1 ? seeds.join(", ") : seed,
      });
      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            additionalKeywords: seeds.length > 1 ? seeds.slice(1) : undefined,
            mode: "sync",
            maxDepth: 2,
            maxKeywords: 150,
            platforms: ["youtube", "instagram", "tiktok"],
            includeQuestions: true,
            includeSeasonality: true,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!json.success || !json.data)
          throw new Error(json.error ?? "분석 결과가 없어요.");
        const data = json.data as IntentGraphData;
        setAnalysis({ status: "success", keyword: seed, data });
        setInputValue("");
        setHistory((prev) =>
          [
            {
              keyword: seed,
              analyzedAt: new Date().toISOString(),
              count: data.summary.totalKeywords,
            },
            ...prev.filter((h) => h.keyword !== seed),
          ].slice(0, 20),
        );
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

  // Extract keywords from nodes
  const allKeywords = useMemo<ClassifiedKeyword[]>(() => {
    if (analysis.status !== "success") return [];
    return analysis.data.nodes.map((n) => ({
      keyword: n.name,
      temporalPhase: n.temporalPhase,
      intentCategory: n.intentCategory,
      subIntent: n.subIntent,
      confidence: 0.85,
      searchVolume: n.searchVolume,
      socialVolume: n.socialVolume,
      gapScore: n.gapScore,
      isRising: n.isRising,
      source: "seed" as const,
      journeyStage: n.journeyStage,
    }));
  }, [analysis]);

  // Apply filters
  const filteredKeywords = useMemo(() => {
    return allKeywords
      .filter((kw) => {
        if (intentFilter !== "all" && kw.intentCategory !== intentFilter)
          return false;
        if (phaseFilter !== "all" && kw.temporalPhase !== phaseFilter)
          return false;
        return true;
      })
      .sort((a, b) => b.searchVolume - a.searchVolume);
  }, [allKeywords, intentFilter, phaseFilter]);

  // Chart data
  const intentDistribution = useMemo(() => {
    if (analysis.status !== "success") return [];
    const dist = analysis.data.summary.intentDistribution;
    return Object.entries(dist).map(([key, value]) => ({
      name: INTENT_CATEGORY_LABELS[key as IntentCategory]?.label ?? key,
      value,
      color: INTENT_COLORS[key as IntentCategory] ?? "#6b7280",
    }));
  }, [analysis]);

  const phaseDistribution = useMemo(() => {
    if (analysis.status !== "success") return [];
    const dist = analysis.data.summary.temporalDistribution;
    return Object.entries(dist).map(([key, value]) => ({
      name: TEMPORAL_PHASE_LABELS[key as TemporalPhase]?.label ?? key,
      value,
      color: PHASE_COLORS[key as TemporalPhase] ?? "#6b7280",
    }));
  }, [analysis]);

  // Gap matrix data for horizontal bar chart
  const gapMatrixData = useMemo(() => {
    if (analysis.status !== "success") return [];
    const matrix = analysis.data.gapMatrix;
    if (!matrix?.cells) return [];
    return Object.entries(matrix.cells)
      .map(([key, cell]: [string, any]) => ({
        name: key,
        avgGap: cell.avgGapScore ?? 0,
        count: cell.keywordCount ?? 0,
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avgGap - a.avgGap)
      .slice(0, 10);
  }, [analysis]);

  // Top blue oceans
  const blueOceans = useMemo(() => {
    if (analysis.status !== "success") return [];
    return analysis.data.summary.topBlueOceans ?? [];
  }, [analysis]);

  // Top rising keywords
  const risingKeywords = useMemo(() => {
    if (analysis.status !== "success") return [];
    return analysis.data.summary.topRising ?? [];
  }, [analysis]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="인텐트 파인더"
        description="검색 키워드의 사용자 의도를 자동 분류하고, 블루오션 기회와 콘텐츠 갭을 발견하세요."
        guide="키워드를 입력하면 관련 키워드를 확장하고, 정보형/비교형/행동형/문제해결형으로 의도를 자동 분류해요."
      />

      {/* ── Keyword Input ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="키워드 입력 (콤마로 여러 개 입력 가능: AI 마케팅, 숏폼 전략, 인플루언서)"
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
                <Sparkles className="h-3.5 w-3.5" /> 의도 분석
              </>
            )}
          </button>
        </div>
        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              &ldquo;{analysis.keyword}&rdquo; 키워드의 의도를 분석하고
              있어요...
            </p>
          </div>
        )}
        {analysis.status === "error" && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-[13px] text-red-700">
              분석에 실패했어요: {analysis.message}
            </p>
          </div>
        )}
      </div>

      {/* ── Empty State ── */}
      {analysis.status === "idle" && history.length === 0 && (
        <EmptyState
          icon={Search}
          title="검색 키워드의 사용자 의도를 분석해요"
          description="키워드를 입력하면 의도 분류(정보형/비교형/행동형/문제해결형), 검색 여정 단계, 콘텐츠 갭 분석 결과를 확인할 수 있어요."
        />
      )}

      {/* ── Analysis Results ── */}
      {analysis.status === "success" && (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                관련 키워드
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalKeywords}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                평균 갭 스코어
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.avgGapScore.toFixed(1)}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                클러스터 수
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {analysis.data.summary.totalClusters}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                블루오션
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-blue-600">
                {blueOceans.length}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                급상승
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-emerald-600">
                {risingKeywords.length}
              </p>
            </div>
          </div>

          {/* Charts Row 1: Intent + Temporal Distribution */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="인텐트 유형 분포"
              description="키워드의 검색 의도 분류"
            >
              <div className="flex h-56 items-center">
                <div className="h-full w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={intentDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        strokeWidth={2}
                        stroke="var(--background)"
                      >
                        {intentDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 px-2">
                  {intentDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-[12px]">{item.name}</span>
                      <span className="text-[12px] font-medium">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="검색 단계 분포"
              description="검색 이전/현재/이후 시간적 단계"
            >
              <div className="flex h-56 items-center">
                <div className="h-full w-1/2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={phaseDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        strokeWidth={2}
                        stroke="var(--background)"
                      >
                        {phaseDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 12,
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2 px-2">
                  {phaseDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 text-[12px]">{item.name}</span>
                      <span className="text-[12px] font-medium">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2: Gap Matrix + Blue Oceans */}
          <div className="grid gap-3 lg:grid-cols-2">
            {gapMatrixData.length > 0 && (
              <ChartCard
                title="콘텐츠 갭 매트릭스"
                description="의도×단계별 평균 갭 스코어 (높을수록 블루오션)"
              >
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gapMatrixData} layout="vertical">
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
                        width={100}
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
                        fill="#3b82f6"
                        radius={[0, 3, 3, 0]}
                        name="평균 갭"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {blueOceans.length > 0 && (
              <ChartCard
                title="블루오션 키워드"
                description="높은 검색 수요, 낮은 콘텐츠 경쟁"
              >
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {blueOceans.map((bo) => (
                    <div
                      key={bo.keyword}
                      className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[13px] font-medium">
                          {bo.keyword}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {bo.platform && (
                          <span className="text-[11px] text-[var(--muted-foreground)]">
                            {bo.platform}
                          </span>
                        )}
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                          갭 {bo.gapScore.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>

          {/* Filters */}
          <div className="card p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                <span className="text-[12px] font-medium text-[var(--muted-foreground)]">
                  필터:
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setIntentFilter("all")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${intentFilter === "all" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
                >
                  전체 의도
                </button>
                {(Object.keys(INTENT_CATEGORY_LABELS) as IntentCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setIntentFilter(cat)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${intentFilter === cat ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
                    >
                      {INTENT_CATEGORY_LABELS[cat].label}
                    </button>
                  ),
                )}
              </div>
              <div className="h-4 w-px bg-[var(--border)]" />
              <div className="flex gap-1">
                <button
                  onClick={() => setPhaseFilter("all")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${phaseFilter === "all" ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
                >
                  전체 단계
                </button>
                {(Object.keys(TEMPORAL_PHASE_LABELS) as TemporalPhase[]).map(
                  (phase) => (
                    <button
                      key={phase}
                      onClick={() => setPhaseFilter(phase)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${phaseFilter === phase ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"}`}
                    >
                      {TEMPORAL_PHASE_LABELS[phase].label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* Keywords Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">
                키워드 분류 결과 ({filteredKeywords.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                    <th className="px-4 py-2 text-left font-medium text-[var(--muted-foreground)]">
                      키워드
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                      검색량
                    </th>
                    <th className="px-4 py-2 text-center font-medium text-[var(--muted-foreground)]">
                      트렌드
                    </th>
                    <th className="px-4 py-2 text-center font-medium text-[var(--muted-foreground)]">
                      검색 의도
                    </th>
                    <th className="px-4 py-2 text-center font-medium text-[var(--muted-foreground)]">
                      검색 단계
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                      갭 스코어
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                      소셜 볼륨
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKeywords.slice(0, 50).map((kw) => {
                    const trend: "rising" | "declining" | "stable" = kw.isRising
                      ? "rising"
                      : kw.searchVolume > 500
                        ? "stable"
                        : "declining";
                    const TrendIcon = TREND_ICON[trend];
                    return (
                      <tr
                        key={kw.keyword}
                        className="hover:bg-[var(--secondary)]/50 border-b border-[var(--border)] transition-colors last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium">
                          {kw.keyword}
                          {kw.isRising && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              급상승
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {kw.searchVolume.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <div
                            className={`flex items-center justify-center gap-1 ${TREND_COLOR[trend]}`}
                          >
                            <TrendIcon className="h-3.5 w-3.5" />
                            <span className="text-[12px] font-medium">
                              {trend === "rising"
                                ? "상승"
                                : trend === "declining"
                                  ? "하락"
                                  : "유지"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${INTENT_BADGE[kw.intentCategory]}`}
                          >
                            {INTENT_CATEGORY_LABELS[kw.intentCategory]?.label ??
                              kw.intentCategory}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block rounded-full bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {TEMPORAL_PHASE_LABELS[kw.temporalPhase]?.label ??
                              kw.temporalPhase}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span
                            className={
                              kw.gapScore >= 70
                                ? "font-medium text-blue-600"
                                : kw.gapScore >= 40
                                  ? "text-emerald-600"
                                  : ""
                            }
                          >
                            {kw.gapScore.toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtVolume(kw.socialVolume)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredKeywords.length > 50 && (
              <div className="border-t border-[var(--border)] px-4 py-2 text-center">
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  상위 50개만 표시 (전체 {filteredKeywords.length}개)
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <h3 className="text-[13px] font-semibold">최근 분석</h3>
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {history.map((h) => (
              <button
                key={`${h.keyword}-${h.analyzedAt}`}
                onClick={() => handleAnalyze(h.keyword)}
                disabled={analysis.status === "loading"}
                className="hover:bg-[var(--secondary)]/50 flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  <span className="text-[13px] font-medium">{h.keyword}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {h.count}개
                  </span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {new Date(h.analyzedAt).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
