"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTranslations } from "next-intl";
import { ChartCard } from "@/components/shared";
import {
  ChannelHeader,
  ChannelKpiCard,
  ChannelContentTable,
  ChannelInsightCards,
  ChannelRiskActionCards,
  ChannelAnalysisMeta,
} from "@/components/channels";
import {
  resolveMetricLabels,
  resolveMetricDescriptions,
  formatCount,
  generateRiskSignals,
  generateRecommendedActions,
} from "@/lib/channels";
import type {
  Channel,
  ChannelSnapshot,
  ChannelSnapshotSeries,
  ChannelContent,
  ChannelInsight,
} from "@/lib/channels";

const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--border)",
};
const PIE_COLORS = ["#171717", "#6b7280", "#a3a3a3", "#d4d4d4"];

type Props = {
  channel: Channel;
  snapshot: ChannelSnapshot | undefined;
  series: ChannelSnapshotSeries[];
  contents: ChannelContent[];
  contentTypeDist: { type: string; count: number }[];
  insight: ChannelInsight | undefined;
};

export function ChannelDetailView({
  channel,
  snapshot,
  series,
  contents,
  contentTypeDist,
  insight,
}: Props) {
  const t = useTranslations("channelDetail");
  const labels = resolveMetricLabels(channel.platformCode);
  const descriptions = resolveMetricDescriptions(channel.platformCode);

  const prevSnapshot =
    series.length >= 2 ? series[series.length - 2] : undefined;
  const risks = generateRiskSignals(channel.platformCode, snapshot);
  const actions = generateRecommendedActions(channel.platformCode, snapshot);

  const uploadFreqData = series.map((s) => {
    const count = contents.filter((c) => {
      if (!c.publishedAt) return false;
      const d = new Date(c.publishedAt);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return s.date.includes(monthStr) || monthStr === s.date;
    }).length;
    return { date: s.date, uploads: count };
  });

  const isNewChannel =
    !snapshot && series.length === 0 && contents.length === 0;

  return (
    <div className="space-y-5">
      {/* ── 1. Header ── */}
      <ChannelHeader channel={channel} />

      {/* ── New Channel Banner ── */}
      {isNewChannel && (
        <div className="card border-blue-200 bg-blue-50/50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <svg
                className="h-5 w-5 animate-spin text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-blue-900">
                데이터 수집 중입니다
              </h3>
              <p className="mt-1 text-[13px] text-blue-700">
                채널이 성공적으로 등록되었습니다. 구독자, 조회수, 참여율 등의
                데이터를 수집하고 있습니다. 초기 분석 결과는 잠시 후 이
                페이지에서 확인하실 수 있습니다.
              </p>
              <SyncButton channelId={channel.id} />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <ChannelKpiCard
          label={labels.audience}
          value={snapshot?.audienceCount ?? null}
          description={descriptions.audience}
          previousValue={prevSnapshot?.audienceCount}
        />
        <ChannelKpiCard
          label={labels.contents}
          value={snapshot?.totalContents ?? null}
          description={descriptions.contents}
        />
        <ChannelKpiCard
          label={labels.views}
          value={snapshot?.totalViewsOrReach ?? null}
          description={descriptions.views}
          previousValue={prevSnapshot?.totalViewsOrReach}
        />
        <ChannelKpiCard
          label={labels.engagement}
          value={snapshot?.engagementRate ?? null}
          format="percent"
          description={descriptions.engagement}
        />
        <ChannelKpiCard
          label={labels.growth}
          value={snapshot?.growthRate30d ?? null}
          format="growth"
          description={descriptions.growth}
        />
        <ChannelKpiCard
          label={labels.uploads}
          value={snapshot?.uploads30d ?? null}
          description={descriptions.uploads}
        />
      </div>

      {/* ── 3. Charts ── */}
      {series.length > 0 && (
        <div className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title={`${labels.audience} Growth`}
              description="Trend over recent months"
            >
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis dataKey="date" tick={TICK_STYLE} />
                    <YAxis
                      tick={TICK_STYLE}
                      tickFormatter={(v) => formatCount(v)}
                    />
                    <Tooltip
                      formatter={(v) => formatCount(Number(v))}
                      contentStyle={TOOLTIP_STYLE}
                    />
                    <Line
                      type="monotone"
                      dataKey="audienceCount"
                      stroke="#171717"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#171717" }}
                      activeDot={{ r: 5 }}
                      name={labels.audience}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title={`${labels.views} & Engagement`}
              description={`${labels.views} trend with engagement rate overlay`}
            >
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis dataKey="date" tick={TICK_STYLE} />
                    <YAxis
                      yAxisId="left"
                      tick={TICK_STYLE}
                      tickFormatter={(v) => formatCount(v)}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={TICK_STYLE}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalViewsOrReach"
                      stroke="#171717"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#171717" }}
                      name={labels.views}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="engagementRate"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#16a34a" }}
                      name="Engagement %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {contentTypeDist.length > 0 && (
              <ChartCard
                title="Content Type Distribution"
                description="Breakdown by content format"
              >
                <div className="flex h-56 items-center">
                  <div className="h-full w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={contentTypeDist}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                          strokeWidth={2}
                          stroke="var(--background)"
                        >
                          {contentTypeDist.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 px-2">
                    {contentTypeDist.map((item, i) => {
                      const total = contentTypeDist.reduce(
                        (s, d) => s + d.count,
                        0,
                      );
                      const pct =
                        total > 0
                          ? ((item.count / total) * 100).toFixed(0)
                          : "0";
                      return (
                        <div
                          key={item.type}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                            style={{
                              backgroundColor:
                                PIE_COLORS[i % PIE_COLORS.length],
                            }}
                          />
                          <span className="flex-1 text-[12px] text-[var(--muted-foreground)]">
                            {item.type}
                          </span>
                          <span className="text-[12px] font-medium">
                            {item.count}
                          </span>
                          <span className="w-8 text-right text-[11px] text-[var(--muted-foreground)]">
                            {pct}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ChartCard>
            )}

            {uploadFreqData.some((d) => d.uploads > 0) && (
              <ChartCard
                title="Upload Frequency"
                description="Posting frequency over recent months"
              >
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={uploadFreqData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-subtle)"
                      />
                      <XAxis dataKey="date" tick={TICK_STYLE} />
                      <YAxis tick={TICK_STYLE} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar
                        dataKey="uploads"
                        fill="#171717"
                        radius={[3, 3, 0, 0]}
                        name={labels.uploads}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Content Performance ── */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          {t("contentPerformance")}
        </h2>
        <ChannelContentTable contents={contents} viewsLabel={labels.views} />
      </div>

      {/* ── CTA: Comment Analysis ── */}
      <div className="card flex items-center justify-between border-blue-200 bg-blue-50/50 p-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            {t("commentAnalysisCta")}
          </p>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            {t("commentAnalysisCtaDesc")}
          </p>
        </div>
        <Link
          href={`/comments?channelId=${channel.id}`}
          className="btn-secondary flex-shrink-0 text-[12px]"
        >
          {t("viewComments")}
        </Link>
      </div>

      {/* ── CTA: Competitive Analysis ── */}
      <div className="card flex items-center justify-between border-violet-200 bg-violet-50/50 p-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            Competitive Analysis
          </p>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            Compare this channel with competitors to discover growth
            opportunities and strategic insights.
          </p>
        </div>
        <Link
          href="/competitors"
          className="btn-secondary flex-shrink-0 text-[12px]"
        >
          View Competitors
        </Link>
      </div>

      {/* ── 5. Channel Insights ── */}
      {insight && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            {t("channelInsights")}
          </h2>
          <ChannelInsightCards insight={insight} />
        </div>
      )}

      {/* ── 6. Risk Signals & Recommended Actions ── */}
      {(risks.length > 0 || actions.length > 0) && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            {t("risksAndActions")}
          </h2>
          <ChannelRiskActionCards risks={risks} actions={actions} />
        </div>
      )}

      {/* ── 7. Analysis Meta ── */}
      <ChannelAnalysisMeta
        channel={channel}
        snapshotDate={snapshot?.snapshotDate}
      />
    </div>
  );
}

// ── 에러 메시지 한글 변환 ──

function getErrorMessage(error?: string): string {
  if (!error) return "데이터 수집에 실패했습니다.";
  if (error.includes("not configured")) {
    const match = error.match(/Set (\w+)/);
    const envVar = match?.[1] || "API_KEY";
    return `API 키가 설정되지 않았습니다. .env.local 파일에 ${envVar}를 추가해주세요.`;
  }
  if (error.includes("not found"))
    return "채널을 찾을 수 없습니다. URL을 확인해주세요.";
  if (error.includes("Unsupported"))
    return "이 플랫폼은 아직 데이터 수집을 지원하지 않습니다.";
  if (error.includes("Cannot extract"))
    return "채널 URL에서 ID를 추출할 수 없습니다. URL 형식을 확인해주세요.";
  if (error.includes("quota") || error.includes("rate"))
    return "API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.";
  return error;
}

// ── 동기화 버튼 컴포넌트 ──

function SyncButton({ channelId }: { channelId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        // 성공 시 페이지 새로고침으로 새 데이터 표시
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      setResult({ success: false, error: "동기화 요청에 실패했습니다." });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="btn-primary text-[12px] disabled:opacity-50"
      >
        {syncing ? "데이터 수집 중..." : "지금 데이터 수집하기"}
      </button>
      {result && !result.success && (
        <div className="mt-2 space-y-1 text-[12px] text-amber-700">
          <p>{getErrorMessage(result.error)}</p>
        </div>
      )}
      {result?.success && (
        <p className="mt-2 text-[12px] text-emerald-700">
          데이터 수집 완료! 페이지를 새로고침합니다...
        </p>
      )}
    </div>
  );
}
