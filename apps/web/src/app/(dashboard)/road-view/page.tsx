"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  Route,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import type {
  IntentGraphData,
  IntentCategory,
  TemporalPhase,
} from "@/lib/intent-engine";
import {
  INTENT_CATEGORY_LABELS,
  TEMPORAL_PHASE_LABELS,
} from "@/lib/intent-engine";

// ── Types ──

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

type BrandMention = {
  keyword: string;
  phase: TemporalPhase;
  intent: IntentCategory;
  volume: number;
  gapScore: number;
  isRising: boolean;
  context: "direct" | "comparison" | "alternative" | "related";
};

type BrandJourney = {
  from: string;
  to: string;
  weight: number;
  phase: TemporalPhase;
  intent: IntentCategory;
};

type CompetitorBrand = {
  name: string;
  mentions: number;
  avgGapScore: number;
  contexts: { type: string; count: number }[];
  phases: { phase: TemporalPhase; count: number }[];
};

// ── Brand Extraction Logic ──

function extractBrandMentions(
  data: IntentGraphData,
  seedKeyword: string,
): {
  mentions: BrandMention[];
  competitors: CompetitorBrand[];
  journeys: BrandJourney[];
} {
  const { nodes, links } = data;

  // Identify potential brand-like keywords (high volume, comparison/action intent, or containing "vs")
  const mentions: BrandMention[] = [];
  const brandCounts = new Map<
    string,
    {
      count: number;
      gaps: number[];
      contexts: string[];
      phases: TemporalPhase[];
    }
  >();

  for (const node of nodes) {
    if (node.isSeed) continue;

    // Determine context
    let context: BrandMention["context"] = "related";
    if (
      node.name.toLowerCase().includes("vs") ||
      node.name.includes("비교") ||
      node.subIntent === "versus"
    ) {
      context = "comparison";
    } else if (
      node.name.includes("대안") ||
      node.name.includes("대체") ||
      node.subIntent === "alternative"
    ) {
      context = "alternative";
    } else if (
      node.intentCategory === "action" ||
      node.subIntent === "purchase"
    ) {
      context = "direct";
    }

    mentions.push({
      keyword: node.name,
      phase: node.temporalPhase,
      intent: node.intentCategory,
      volume: node.searchVolume,
      gapScore: node.gapScore,
      isRising: node.isRising,
      context,
    });

    // Track brand-like keywords (simplification: group by first word/noun)
    const brandKey = extractBrandName(node.name, seedKeyword);
    if (brandKey && brandKey !== seedKeyword.toLowerCase()) {
      if (!brandCounts.has(brandKey)) {
        brandCounts.set(brandKey, {
          count: 0,
          gaps: [],
          contexts: [],
          phases: [],
        });
      }
      const bc = brandCounts.get(brandKey)!;
      bc.count++;
      bc.gaps.push(node.gapScore);
      bc.contexts.push(context);
      bc.phases.push(node.temporalPhase);
    }
  }

  // Build competitor profiles
  const competitors: CompetitorBrand[] = [...brandCounts.entries()]
    .filter(([, v]) => v.count >= 2)
    .map(([name, v]) => {
      const contextCounts = new Map<string, number>();
      for (const c of v.contexts)
        contextCounts.set(c, (contextCounts.get(c) ?? 0) + 1);
      const phaseCounts = new Map<TemporalPhase, number>();
      for (const p of v.phases)
        phaseCounts.set(p, (phaseCounts.get(p) ?? 0) + 1);

      return {
        name,
        mentions: v.count,
        avgGapScore: Math.round(
          v.gaps.reduce((s, g) => s + g, 0) / v.gaps.length,
        ),
        contexts: [...contextCounts.entries()].map(([type, count]) => ({
          type,
          count,
        })),
        phases: [...phaseCounts.entries()].map(([phase, count]) => ({
          phase,
          count,
        })),
      };
    })
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);

  // Build journey paths
  const journeys: BrandJourney[] = [];
  for (const link of links) {
    const sourceNode = nodes.find((n) => n.id === link.source);
    const targetNode = nodes.find((n) => n.id === link.target);
    if (!sourceNode || !targetNode) continue;
    if (sourceNode.temporalPhase === targetNode.temporalPhase) continue;

    journeys.push({
      from: sourceNode.name,
      to: targetNode.name,
      weight: Math.round(link.strength * 100),
      phase: targetNode.temporalPhase,
      intent: targetNode.intentCategory,
    });
  }

  return {
    mentions,
    competitors,
    journeys: journeys.sort((a, b) => b.weight - a.weight).slice(0, 20),
  };
}

function extractBrandName(keyword: string, seedKeyword: string): string | null {
  const lower = keyword.toLowerCase();
  const seed = seedKeyword.toLowerCase();

  // Remove seed keyword from the string
  const cleaned = lower.replace(seed, "").trim();
  if (!cleaned || cleaned.length < 2) return null;

  // Take first meaningful word
  const words = cleaned.split(/[\s·,]+/).filter((w) => w.length >= 2);
  return words[0] ?? null;
}

// ── Component ──

export default function RoadViewPage() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"journey" | "competitors" | "gaps">(
    "journey",
  );

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;
      setAnalysis({ status: "loading", keyword: seed });
      setExpandedBrand(null);
      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            mode: "sync",
            maxDepth: 2,
            maxKeywords: 150,
            platforms: [
              "youtube",
              "instagram",
              "tiktok",
              "naver_blog",
              "google",
            ],
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

  const { mentions, competitors, journeys } = useMemo(() => {
    if (analysis.status !== "success")
      return { mentions: [], competitors: [], journeys: [] };
    return extractBrandMentions(analysis.data, analysis.keyword);
  }, [analysis]);

  // Gap matrix data
  const gapMatrixData = useMemo(() => {
    if (analysis.status !== "success") return [];
    const matrix = analysis.data.gapMatrix;
    return matrix.cells
      .filter((c) => c.keywordCount > 0)
      .sort((a, b) => b.avgGapScore - a.avgGapScore)
      .slice(0, 12);
  }, [analysis]);

  // Phase flow data
  const phaseFlowData = useMemo(() => {
    if (analysis.status !== "success") return [];
    return analysis.data.journey.stages.map((s) => ({
      name: TEMPORAL_PHASE_LABELS[s.phase].label,
      keywords: s.keywords.length,
      avgGap: s.avgGapScore,
      fill: { before: "#8b5cf6", current: "#3b82f6", after: "#10b981" }[
        s.phase
      ],
    }));
  }, [analysis]);

  // Context distribution
  const contextDistData = useMemo(() => {
    const counts = { direct: 0, comparison: 0, alternative: 0, related: 0 };
    for (const m of mentions) counts[m.context]++;
    return [
      { name: "직접 검색", value: counts.direct, fill: "#3b82f6" },
      { name: "비교 검색", value: counts.comparison, fill: "#f59e0b" },
      { name: "대안 탐색", value: counts.alternative, fill: "#ef4444" },
      { name: "관련 검색", value: counts.related, fill: "#6b7280" },
    ].filter((d) => d.value > 0);
  }, [mentions]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="로드 뷰"
        description="브랜드 중심의 검색 여정을 추적합니다. 소비자가 브랜드를 어떤 맥락에서 검색하는지 파악하세요."
        guide="키워드를 입력하면 해당 브랜드/키워드와 관련된 검색 흐름, 경쟁 브랜드 언급, 콘텐츠 갭을 분석합니다."
      />

      {/* Input */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="브랜드 또는 키워드를 입력하세요"
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
                <Route className="h-3.5 w-3.5" /> 로드 뷰 분석
              </>
            )}
          </button>
        </div>
        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              브랜드 검색 여정을 분석하고 있습니다...
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

      {/* Empty */}
      {analysis.status === "idle" && (
        <EmptyState
          icon={Route}
          title="브랜드 중심 검색 여정을 추적합니다"
          description="브랜드 또는 키워드를 입력하면 소비자의 검색 경로, 경쟁 브랜드 관계, 콘텐츠 기회를 종합적으로 분석합니다."
        />
      )}

      {/* Results */}
      {analysis.status === "success" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                분석 키워드
              </p>
              <p className="mt-0.5 truncate text-[14px] font-semibold">
                {analysis.keyword}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                관련 검색어
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {mentions.length}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                경쟁 키워드
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {competitors.length}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                검색 경로
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {journeys.length}
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

          {/* View Mode Tabs */}
          <div className="flex gap-1 rounded-lg bg-[var(--secondary)] p-1">
            {(
              [
                { key: "journey", label: "검색 여정" },
                { key: "competitors", label: "경쟁 분석" },
                { key: "gaps", label: "콘텐츠 갭" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  viewMode === key
                    ? "bg-white text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Journey View */}
          {viewMode === "journey" && (
            <>
              {/* Charts */}
              <div className="grid gap-3 lg:grid-cols-2">
                <ChartCard
                  title="시간적 단계별 분포"
                  description="검색 전/중/후 키워드 분포와 갭 스코어"
                >
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={phaseFlowData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border-subtle)"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
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
                        <Bar
                          dataKey="avgGap"
                          fill="#10b981"
                          radius={[3, 3, 0, 0]}
                          name="평균 갭"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard
                  title="검색 맥락 분포"
                  description="검색어가 사용되는 맥락 비율"
                >
                  <div className="flex h-56 items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contextDistData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {contextDistData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
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
                  <div className="mt-2 flex flex-wrap justify-center gap-3">
                    {contextDistData.map((entry, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 text-[11px]"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: entry.fill }}
                        />
                        {entry.name} ({entry.value})
                      </span>
                    ))}
                  </div>
                </ChartCard>
              </div>

              {/* Journey Paths */}
              <div className="card overflow-hidden">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="text-[13px] font-semibold">주요 검색 경로</h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    소비자가 이동하는 검색어 간 주요 경로
                  </p>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {journeys.slice(0, 15).map((j, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-medium">
                        {i + 1}
                      </span>
                      <span className="max-w-[150px] truncate text-[12px] font-medium">
                        {j.from}
                      </span>
                      <ArrowRight className="h-3 w-3 flex-shrink-0 text-[var(--muted-foreground)]" />
                      <span className="max-w-[150px] truncate text-[12px] font-medium">
                        {j.to}
                      </span>
                      <div className="flex-1" />
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor:
                            (INTENT_CATEGORY_LABELS[j.intent]?.color ??
                              "#6b7280") + "20",
                          color:
                            INTENT_CATEGORY_LABELS[j.intent]?.color ??
                            "#6b7280",
                        }}
                      >
                        {INTENT_CATEGORY_LABELS[j.intent]?.label ?? j.intent}
                      </span>
                      <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium">
                        강도 {j.weight}
                      </span>
                    </div>
                  ))}
                  {journeys.length === 0 && (
                    <div className="px-4 py-6 text-center text-[12px] text-[var(--muted-foreground)]">
                      단계 간 전환 경로가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Competitors View */}
          {viewMode === "competitors" && (
            <div className="card overflow-hidden">
              <div className="border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-[13px] font-semibold">경쟁 키워드 분석</h3>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  &quot;{analysis.keyword}&quot; 검색 시 함께 언급되는 경쟁
                  키워드
                </p>
              </div>
              {competitors.length > 0 ? (
                <div className="divide-y divide-[var(--border)]">
                  {competitors.map((comp) => {
                    const isExpanded = expandedBrand === comp.name;
                    return (
                      <div key={comp.name}>
                        <button
                          onClick={() =>
                            setExpandedBrand(isExpanded ? null : comp.name)
                          }
                          className="hover:bg-[var(--secondary)]/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium">
                              {comp.name}
                            </p>
                            <p className="text-[11px] text-[var(--muted-foreground)]">
                              {comp.mentions}회 언급 · 평균 갭{" "}
                              {comp.avgGapScore}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {comp.avgGapScore > 60 ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : comp.avgGapScore > 30 ? (
                              <Minus className="h-3 w-3 text-amber-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                            <span
                              className={`text-[11px] font-medium ${
                                comp.avgGapScore > 60
                                  ? "text-emerald-600"
                                  : comp.avgGapScore > 30
                                    ? "text-amber-600"
                                    : "text-red-600"
                              }`}
                            >
                              {comp.avgGapScore > 60
                                ? "블루오션"
                                : comp.avgGapScore > 30
                                  ? "기회"
                                  : "경쟁"}
                            </span>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="bg-[var(--secondary)]/30 grid gap-3 px-4 py-3 sm:grid-cols-2">
                            <div>
                              <p className="mb-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                                검색 맥락
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {comp.contexts.map((c) => (
                                  <span
                                    key={c.type}
                                    className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px]"
                                  >
                                    {{
                                      direct: "직접",
                                      comparison: "비교",
                                      alternative: "대안",
                                      related: "관련",
                                    }[c.type] ?? c.type}
                                    : {c.count}건
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                                시간적 단계
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {comp.phases.map((p) => (
                                  <span
                                    key={p.phase}
                                    className="rounded-full px-2.5 py-0.5 text-[11px]"
                                    style={{
                                      backgroundColor:
                                        (TEMPORAL_PHASE_LABELS[p.phase]
                                          ?.color ?? "#6b7280") + "20",
                                      color:
                                        TEMPORAL_PHASE_LABELS[p.phase]?.color ??
                                        "#6b7280",
                                    }}
                                  >
                                    {TEMPORAL_PHASE_LABELS[p.phase]?.label ??
                                      p.phase}
                                    : {p.count}건
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-[12px] text-[var(--muted-foreground)]">
                  식별된 경쟁 키워드가 없습니다. 더 많은 키워드로 분석해 보세요.
                </div>
              )}
            </div>
          )}

          {/* Gaps View */}
          {viewMode === "gaps" && (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-[var(--border)] px-4 py-3">
                  <h3 className="text-[13px] font-semibold">
                    콘텐츠 갭 매트릭스
                  </h3>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    의도 × 시간 단계별 콘텐츠 기회 분석 (갭 스코어 높을수록
                    블루오션)
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-[var(--secondary)]/50 border-b border-[var(--border)]">
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                          의도 × 단계
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                          키워드 수
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                          평균 갭
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                          검색량
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                          상위 키워드
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {gapMatrixData.map((cell, i) => {
                        const intentLabel =
                          INTENT_CATEGORY_LABELS[cell.intent]?.label ??
                          cell.intent;
                        const phaseLabel =
                          TEMPORAL_PHASE_LABELS[cell.phase]?.label ??
                          cell.phase;
                        const gapColor =
                          cell.avgGapScore > 60
                            ? "text-blue-600"
                            : cell.avgGapScore > 30
                              ? "text-emerald-600"
                              : cell.avgGapScore > 15
                                ? "text-amber-600"
                                : "text-red-600";
                        const gapBg =
                          cell.avgGapScore > 60
                            ? "bg-blue-50"
                            : cell.avgGapScore > 30
                              ? "bg-emerald-50"
                              : cell.avgGapScore > 15
                                ? "bg-amber-50"
                                : "bg-red-50";
                        return (
                          <tr
                            key={i}
                            className="hover:bg-[var(--secondary)]/30"
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-medium">{intentLabel}</span>
                              <span className="text-[var(--muted-foreground)]">
                                {" "}
                                ×{" "}
                              </span>
                              <span>{phaseLabel}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {cell.keywordCount}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${gapColor} ${gapBg}`}
                              >
                                {cell.avgGapScore}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {cell.avgSearchVolume.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {cell.topKeywords.slice(0, 3).map((kw) => (
                                  <span
                                    key={kw}
                                    className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px]"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hotspots */}
              {analysis.data.gapMatrix.hotspots.length > 0 && (
                <div className="card p-4">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold">
                    <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
                    블루오션 핫스팟 (갭 스코어 60+)
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {analysis.data.gapMatrix.hotspots.map((hs, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-blue-200 bg-blue-50/50 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-medium">
                            {INTENT_CATEGORY_LABELS[hs.intent]?.label} ×{" "}
                            {TEMPORAL_PHASE_LABELS[hs.phase]?.label}
                          </span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            갭 {hs.avgGapScore}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {hs.recommendation}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {hs.topKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Blue Ocean Opportunities */}
          <div className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">블루오션 기회 Top 5</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                갭 스코어가 높은 키워드 — 콘텐츠 제작 우선 대상
              </p>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {analysis.data.summary.topBlueOceans.map((bo, i) => (
                <div
                  key={bo.keyword}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[12px] font-medium">
                    {bo.keyword}
                  </span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                    갭 {bo.gapScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
