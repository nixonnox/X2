"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Plus, Swords, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PageHeader,
  ChartCard,
  EmptyState,
  DemoBanner,
} from "@/components/shared";
import {
  CompetitorKpiCard,
  CompetitorSelector,
  CompetitorContentTable,
  CompetitorTopContentCard,
  CompetitorInsightCard,
} from "@/components/competitors";
import {
  competitorService,
  buildFormatDistribution,
  buildTopicDistribution,
  generateCompetitorInsight,
} from "@/lib/competitors";
import { useCompetitorsData } from "@/hooks/use-competitors-data";

const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--border)",
};
const OUR_COLOR = "#171717";
const COMP_COLOR = "#6b7280";
const PIE_COLORS = ["#171717", "#6b7280", "#a3a3a3", "#d4d4d4", "#e5e5e5"];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function CompetitorsPage() {
  const t = useTranslations("competitors");
  const {
    competitors: realCompetitors,
    ownChannels,
    isLoading: dataLoading,
  } = useCompetitorsData();

  // tRPC 데이터가 있으면 사용, 없으면 mock fallback
  const hasRealData = realCompetitors.length > 0;
  const competitors = useMemo(
    () => (hasRealData ? realCompetitors : competitorService.getAll()),
    [hasRealData, realCompetitors],
  );
  const [selectedId, setSelectedId] = useState(competitors[0]?.id ?? "");

  const ourChannel =
    hasRealData && ownChannels[0]
      ? {
          id: ownChannels[0].id,
          channelName: ownChannels[0].channelName,
          platform: ownChannels[0].platform,
        }
      : competitorService.getOurChannel();

  if (dataLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }
  const selectedCompetitor = useMemo(
    () => competitorService.getById(selectedId),
    [selectedId],
  );

  const compSnapshot = useMemo(
    () => (selectedId ? competitorService.getSnapshot(selectedId) : undefined),
    [selectedId],
  );

  const metrics = useMemo(
    () => (selectedId ? competitorService.compareMetrics(selectedId) : []),
    [selectedId],
  );

  const growthData = useMemo(
    () =>
      selectedId ? competitorService.getGrowthComparisonData(selectedId) : [],
    [selectedId],
  );

  const uploadData = useMemo(
    () => competitorService.getUploadComparisonData(),
    [],
  );

  const platformDist = useMemo(
    () => competitorService.getPlatformDistribution(),
    [],
  );

  const ourContents = useMemo(() => competitorService.getOurContents(), []);
  const compContents = useMemo(
    () => (selectedId ? competitorService.getContents(selectedId) : []),
    [selectedId],
  );

  const formatDist = useMemo(
    () => buildFormatDistribution(ourContents, compContents),
    [ourContents, compContents],
  );

  const topicDist = useMemo(
    () => buildTopicDistribution(ourContents, compContents),
    [ourContents, compContents],
  );

  const ourTop = useMemo(
    () =>
      competitorService
        .getOurContents()
        .sort((a, b) => b.views - a.views)
        .slice(0, 3),
    [],
  );

  const compTop = useMemo(
    () => (selectedId ? competitorService.getTopContents(selectedId, 3) : []),
    [selectedId],
  );

  const insight = useMemo(
    () =>
      selectedCompetitor && compSnapshot
        ? generateCompetitorInsight(
            selectedCompetitor.channelName,
            compSnapshot,
            ourContents,
            compContents,
            formatDist,
          )
        : null,
    [selectedCompetitor, compSnapshot, ourContents, compContents, formatDist],
  );

  const ourLabel = ourChannel.channelName;
  const compLabel = selectedCompetitor?.channelName ?? "Competitor";

  if (competitors.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t("title")}
          description={t("description")}
          guide={t("guide")}
        >
          <Link href="/competitors/add" className="btn-primary">
            <Plus className="h-3.5 w-3.5" />
            Add Competitor
          </Link>
        </PageHeader>
        <EmptyState
          icon={Swords}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/competitors/add" className="btn-primary">
              <Plus className="h-3.5 w-3.5" />
              Add Competitor
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!hasRealData && (
        <DemoBanner message="경쟁 채널을 등록하면 실제 데이터로 비교 분석을 확인할 수 있습니다." />
      )}
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      >
        <Link href="/competitors/add" className="btn-primary">
          <Plus className="h-3.5 w-3.5" />
          Add Competitor
        </Link>
      </PageHeader>

      {/* ── Competitor Selector ── */}
      <div className="card p-4">
        <p className="mb-2 text-[12px] font-medium text-[var(--muted-foreground)]">
          Select competitor to compare
        </p>
        <CompetitorSelector
          competitors={competitors}
          selectedId={selectedId}
          onChange={setSelectedId}
        />
      </div>

      {/* ── KPI Comparison Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <CompetitorKpiCard
            key={m.metricKey}
            metric={m}
            ourLabel={ourLabel}
            competitorLabel={compLabel}
          />
        ))}
      </div>

      {/* ── Charts Row 1: Audience Growth + Engagement ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Audience Growth Comparison"
          description="Subscriber/follower growth over 6 months"
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis dataKey="date" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} tickFormatter={(v) => fmt(v)} />
                <Tooltip
                  formatter={(v) => fmt(Number(v))}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="ourAudience"
                  stroke={OUR_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: OUR_COLOR }}
                  name={ourLabel}
                />
                <Line
                  type="monotone"
                  dataKey="competitorAudience"
                  stroke={COMP_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: COMP_COLOR }}
                  name={compLabel}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Engagement Rate Comparison"
          description="Monthly engagement rate trend"
        >
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis dataKey="date" tick={TICK_STYLE} />
                <YAxis tick={TICK_STYLE} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v) => `${Number(v).toFixed(1)}%`}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="ourEngagement"
                  stroke={OUR_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: OUR_COLOR }}
                  name={ourLabel}
                />
                <Line
                  type="monotone"
                  dataKey="competitorEngagement"
                  stroke={COMP_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: COMP_COLOR }}
                  name={compLabel}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts Row 2: Upload Frequency + Platform Distribution ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Upload Frequency (30d)"
          description="Posts uploaded in the last 30 days"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={uploadData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis dataKey="name" tick={{ ...TICK_STYLE, fontSize: 10 }} />
                <YAxis tick={TICK_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="uploads" radius={[3, 3, 0, 0]} name="Uploads">
                  {uploadData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isOurs ? OUR_COLOR : COMP_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Platform Distribution"
          description="Tracked channels by platform"
        >
          <div className="flex h-56 items-center">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformDist}
                    dataKey="count"
                    nameKey="platform"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {platformDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 px-2">
              {platformDist.map((item, i) => (
                <div key={item.platform} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                    style={{
                      backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  />
                  <span className="flex-1 text-[12px] capitalize">
                    {item.platform}
                  </span>
                  <span className="text-[12px] font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Content Strategy Comparison ── */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          Content Strategy Comparison
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Format Distribution */}
          <ChartCard
            title="Content Format"
            description="Distribution by content format"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatDist} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={TICK_STYLE}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => `${v}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="ourPercent"
                    fill={OUR_COLOR}
                    radius={[0, 3, 3, 0]}
                    name={ourLabel}
                  />
                  <Bar
                    dataKey="competitorPercent"
                    fill={COMP_COLOR}
                    radius={[0, 3, 3, 0]}
                    name={compLabel}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Topic Distribution */}
          <ChartCard
            title="Content Topics"
            description="Distribution by content topic"
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicDist} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={TICK_STYLE}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={TICK_STYLE}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => `${v}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    dataKey="ourPercent"
                    fill={OUR_COLOR}
                    radius={[0, 3, 3, 0]}
                    name={ourLabel}
                  />
                  <Bar
                    dataKey="competitorPercent"
                    fill={COMP_COLOR}
                    radius={[0, 3, 3, 0]}
                    name={compLabel}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* ── Top Content Comparison ── */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          Top Performing Content
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <CompetitorTopContentCard
            contents={ourTop}
            channelLabel={`${ourLabel} - Top 3`}
          />
          <CompetitorTopContentCard
            contents={compTop}
            channelLabel={`${compLabel} - Top 3`}
          />
        </div>
      </div>

      {/* ── Full Content Table ── */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          Content Performance Comparison
        </h2>
        <CompetitorContentTable
          ourContents={ourContents}
          competitorContents={compContents}
          ourLabel={ourLabel}
          competitorLabel={compLabel}
        />
      </div>

      {/* ── Competitive Insights ── */}
      {insight && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            Competitive Insights
          </h2>
          <CompetitorInsightCard insight={insight} />
        </div>
      )}
    </div>
  );
}
