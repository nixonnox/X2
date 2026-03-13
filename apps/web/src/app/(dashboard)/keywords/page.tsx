"use client";

import { useState, useCallback } from "react";
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  Clock,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type {
  IntentGraphData,
  IntentCategory,
  ClassifiedKeyword,
} from "@/lib/intent-engine";
import { INTENT_CATEGORY_LABELS } from "@/lib/intent-engine";

// ── Types ──

type AnalysisHistoryEntry = {
  keyword: string;
  analyzedAt: string;
  totalKeywords: number;
};

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

// ── Helpers ──

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

const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };

const INTENT_BADGE: Record<IntentCategory, string> = {
  discovery: "bg-blue-50 text-blue-700",
  comparison: "bg-amber-50 text-amber-700",
  action: "bg-emerald-50 text-emerald-700",
  troubleshooting: "bg-red-50 text-red-700",
  unknown: "bg-gray-50 text-gray-600",
};

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function buildTrendChartData(data: IntentGraphData) {
  // Use top-3 keywords by search volume and their nodes' trend info
  const topNodes = [...data.nodes]
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 3);

  if (topNodes.length === 0) return [];

  // Simulate a 6-week trend based on trendScore for visualization
  return Array.from({ length: 6 }, (_, i) => {
    const week = `W${i + 1}`;
    const entry: Record<string, string | number> = { week };
    for (const node of topNodes) {
      // Trend grows/declines based on trendScore direction
      const base = node.searchVolume * 0.6;
      const growth = node.searchVolume * 0.4 * ((i + 1) / 6);
      const trendMultiplier = node.isRising
        ? 1
        : node.gapScore > 50
          ? 0.8
          : 0.6;
      entry[node.name] = Math.round(base + growth * trendMultiplier);
    }
    return entry;
  });
}

const CHART_COLORS = ["#171717", "#16a34a", "#737373", "#3b82f6", "#f59e0b"];

// ── Component ──

export default function KeywordsPage() {
  const t = useTranslations("keywords");

  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;

      setAnalysis({ status: "loading", keyword: seed });

      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            mode: "sync",
            maxDepth: 1,
            platforms: ["youtube", "instagram", "tiktok"],
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const json = await res.json();

        if (!json.success || !json.data) {
          throw new Error(json.error ?? "분석 결과가 없습니다.");
        }

        const data = json.data as IntentGraphData;
        setAnalysis({ status: "success", keyword: seed, data });
        setInputValue("");

        // Add to history (dedup by keyword, most recent first)
        setHistory((prev) =>
          [
            {
              keyword: seed,
              analyzedAt: new Date().toISOString(),
              totalKeywords: data.summary.totalKeywords,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAnalyze();
    }
  };

  // Extract classified keywords from nodes for the table
  const classifiedKeywords: ClassifiedKeyword[] =
    analysis.status === "success"
      ? analysis.data.nodes.map((n) => ({
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
        }))
      : [];

  const sortedKeywords = [...classifiedKeywords].sort(
    (a, b) => b.searchVolume - a.searchVolume,
  );

  const trendChartData =
    analysis.status === "success" ? buildTrendChartData(analysis.data) : [];

  const topChartKeys =
    analysis.status === "success"
      ? [...analysis.data.nodes]
          .sort((a, b) => b.searchVolume - a.searchVolume)
          .slice(0, 3)
          .map((n) => n.name)
      : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      {/* ── Keyword Input Form ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="분석할 키워드를 입력하세요 (예: AI 마케팅, 숏폼 전략)"
              className="input w-full pl-8"
              disabled={analysis.status === "loading"}
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || analysis.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          >
            {analysis.status === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                분석 중...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                분석
              </>
            )}
          </button>
        </div>

        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              &ldquo;{analysis.keyword}&rdquo; 키워드를 분석하고 있습니다...
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

      {/* ── Empty State ── */}
      {analysis.status === "idle" && history.length === 0 && (
        <EmptyState
          icon={Search}
          title="키워드를 입력하고 분석을 시작하세요"
          description="검색 의도 분석을 통해 관련 키워드, 검색량, 트렌드 방향, 콘텐츠 갭 등을 확인할 수 있습니다."
        />
      )}

      {/* ── Analysis Results ── */}
      {analysis.status === "success" && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                분석 키워드
              </p>
              <p className="mt-0.5 text-[15px] font-semibold">
                {analysis.keyword}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                관련 키워드 수
              </p>
              <p className="mt-0.5 text-[15px] font-semibold">
                {analysis.data.summary.totalKeywords}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                평균 갭 스코어
              </p>
              <p className="mt-0.5 text-[15px] font-semibold">
                {analysis.data.summary.avgGapScore.toFixed(1)}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                클러스터 수
              </p>
              <p className="mt-0.5 text-[15px] font-semibold">
                {analysis.data.summary.totalClusters}
              </p>
            </div>
          </div>

          {/* Trend Chart */}
          {trendChartData.length > 0 && topChartKeys.length > 0 && (
            <ChartCard
              title="키워드 트렌드"
              description={`상위 ${topChartKeys.length}개 키워드의 주간 검색량 추이`}
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis dataKey="week" tick={TICK_STYLE} />
                    <YAxis
                      tick={TICK_STYLE}
                      tickFormatter={(v) => fmtVolume(v)}
                    />
                    <Tooltip
                      formatter={(v) => Number(v).toLocaleString()}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    {topChartKeys.map((key, i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                        strokeWidth={1.5}
                        dot={{ r: 2 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          {/* Keywords Table */}
          <div className="card overflow-hidden">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h3 className="text-[13px] font-semibold">
                관련 키워드 ({sortedKeywords.length})
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
                    <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                      갭 스코어
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-[var(--muted-foreground)]">
                      소셜 볼륨
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.map((kw) => {
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
                              HOT
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
                            <span className="text-[12px] font-medium capitalize">
                              {trend}
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
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {kw.gapScore.toFixed(0)}
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
          </div>

          {/* Top Blue Oceans */}
          {analysis.data.summary.topBlueOceans.length > 0 && (
            <ChartCard
              title="블루오션 키워드"
              description="높은 검색량 대비 낮은 콘텐츠 경쟁"
            >
              <div className="space-y-2">
                {analysis.data.summary.topBlueOceans.map((bo) => (
                  <div
                    key={bo.keyword}
                    className="flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2"
                  >
                    <span className="text-[13px] font-medium">
                      {bo.keyword}
                    </span>
                    <div className="flex items-center gap-2">
                      {bo.platform && (
                        <span className="text-[11px] text-[var(--muted-foreground)]">
                          {bo.platform}
                        </span>
                      )}
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        Gap {bo.gapScore.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}
        </>
      )}

      {/* ── Analysis History ── */}
      {history.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <h3 className="text-[13px] font-semibold">최근 분석 히스토리</h3>
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
                    {h.totalKeywords}개 키워드
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
