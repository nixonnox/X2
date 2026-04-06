"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  PageHeader,
  ChartCard,
  KpiCard,
  DemoBanner,
} from "@/components/shared";
import {
  CommentFilterBar,
  CommentTable,
  CommentDetailPanel,
  FaqSummaryCard,
  RiskCommentCard,
} from "@/components/comments";
import {
  buildDashboardSummary,
  buildSentimentDistribution,
  buildTopicDistribution,
  extractFaqs,
} from "@/lib/comments";
import { useCommentsData } from "@/hooks/use-comments-data";
import type { CommentFilters, EnrichedComment } from "@/lib/comments";

const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid var(--border)",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#16a34a",
  neutral: "#737373",
  negative: "#dc2626",
};

const TOPIC_COLOR = "#171717";

const SENTIMENT_LABELS_KO: Record<string, string> = {
  positive: "긍정",
  neutral: "중립",
  negative: "부정",
};

export default function CommentsPage() {
  const t = useTranslations("comments");
  const [filters, setFilters] = useState<CommentFilters>({});
  const [selectedComment, setSelectedComment] =
    useState<EnrichedComment | null>(null);
  const { comments: allComments, channels, isLoading } = useCommentsData();

  const filteredComments = useMemo(() => {
    let result = [...allComments];
    if (filters.platform)
      result = result.filter((c) => c.platformCode === filters.platform);
    if (filters.channelId)
      result = result.filter((c) => c.channelId === filters.channelId);
    if (filters.sentiment)
      result = result.filter(
        (c) => c.analysis.sentimentLabel === filters.sentiment,
      );
    if (filters.topic)
      result = result.filter((c) => c.analysis.topicLabel === filters.topic);
    if (filters.riskLevel)
      result = result.filter((c) => c.analysis.riskLevel === filters.riskLevel);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.commentText.toLowerCase().includes(q) ||
          c.authorName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [allComments, filters]);

  const highRiskComments = useMemo(
    () => allComments.filter((c) => c.analysis.riskLevel === "high"),
    [allComments],
  );

  const summary = useMemo(
    () => buildDashboardSummary(filteredComments),
    [filteredComments],
  );
  const sentimentDist = useMemo(
    () => buildSentimentDistribution(filteredComments),
    [filteredComments],
  );
  const topicDist = useMemo(
    () => buildTopicDistribution(filteredComments),
    [filteredComments],
  );
  const faqs = useMemo(() => extractFaqs(allComments), [allComments]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  // Flat sparklines — no historical data available yet
  const trendTotal = Array.from({ length: 12 }, () => summary.totalComments);
  const trendPositive = Array.from({ length: 12 }, () => summary.positiveRatio);
  const trendNegative = Array.from({ length: 12 }, () => summary.negativeRatio);
  const trendHighRisk = Array.from({ length: 12 }, () => summary.highRiskCount);
  const trendUnanswered = Array.from(
    { length: 12 },
    () => summary.unansweredCount,
  );

  // Sentiment pie data
  const sentimentPieData = sentimentDist.map((s) => ({
    name: SENTIMENT_LABELS_KO[s.label] ?? s.label,
    value: s.count,
    color: SENTIMENT_COLORS[s.label],
  }));

  function changeStr(curr: number, prev: number, suffix = ""): string {
    const diff = curr - prev;
    const sign = diff >= 0 ? "+" : "";
    return `${sign}${diff}${suffix}`;
  }

  // 데이터가 없으면 깔끔한 빈 상태 화면만 표시
  if (!isLoading && allComments.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)] py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">
            아직 수집된 댓글이 없어요
          </h3>
          <p className="mt-2 max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
            채널을 등록하면 댓글이 자동으로 수집되고, 감성 분석 · 위험도 ·
            주제별 분류 결과를 확인할 수 있어요.
          </p>
          <a
            href="/channels/new"
            className="btn-primary mt-5 inline-flex items-center px-5 py-2.5 text-sm font-medium transition-colors"
          >
            채널 등록하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={t("totalComments")}
          value={summary.totalComments.toLocaleString()}
          change={changeStr(summary.totalComments, summary.prevTotalComments)}
          changeType="positive"
          trend={trendTotal}
        />
        <KpiCard
          label={t("positive")}
          value={`${summary.positiveRatio}%`}
          change={changeStr(
            summary.positiveRatio,
            summary.prevPositiveRatio,
            "pp",
          )}
          changeType={
            summary.positiveRatio >= summary.prevPositiveRatio
              ? "positive"
              : "negative"
          }
          trend={trendPositive}
        />
        <KpiCard
          label={t("negative")}
          value={`${summary.negativeRatio}%`}
          change={changeStr(
            summary.negativeRatio,
            summary.prevNegativeRatio,
            "pp",
          )}
          changeType={
            summary.negativeRatio <= summary.prevNegativeRatio
              ? "positive"
              : "negative"
          }
          trend={trendNegative}
        />
        <KpiCard
          label={t("highRisk")}
          value={summary.highRiskCount.toString()}
          change={changeStr(summary.highRiskCount, summary.prevHighRiskCount)}
          changeType={
            summary.highRiskCount <= summary.prevHighRiskCount
              ? "positive"
              : "negative"
          }
          trend={trendHighRisk}
        />
        <KpiCard
          label={t("unanswered")}
          value={summary.unansweredCount.toString()}
          change={changeStr(
            summary.unansweredCount,
            summary.prevUnansweredCount,
          )}
          changeType={
            summary.unansweredCount <= summary.prevUnansweredCount
              ? "positive"
              : "negative"
          }
          trend={trendUnanswered}
        />
        <KpiCard
          label={t("faqTopics")}
          value={summary.faqCount.toString()}
          change=""
          changeType="neutral"
          trend={Array.from({ length: 12 }, () => summary.faqCount)}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Sentiment Distribution */}
        <ChartCard title="감성 분포" description="전체 댓글 감성 분석 결과">
          <div className="flex h-52 items-center">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {sentimentPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 px-2">
              {sentimentDist.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: SENTIMENT_COLORS[s.label] }}
                  />
                  <span className="flex-1 text-[12px]">
                    {SENTIMENT_LABELS_KO[s.label] ?? s.label}
                  </span>
                  <span className="text-[12px] font-medium">{s.count}</span>
                  <span className="w-8 text-right text-[11px] text-[var(--muted-foreground)]">
                    {s.ratio}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Topic Distribution */}
        <ChartCard title="주제 분포" description="댓글 주제별 분석">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicDist} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  horizontal={false}
                />
                <XAxis type="number" tick={TICK_STYLE} />
                <YAxis
                  type="category"
                  dataKey="displayLabel"
                  tick={TICK_STYLE}
                  width={80}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar
                  dataKey="count"
                  fill={TOPIC_COLOR}
                  radius={[0, 3, 3, 0]}
                  name="댓글"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Volume Trend */}
        <ChartCard title="댓글 추이" description="일별 감성별 댓글 수">
          <div className="flex h-52 items-center justify-center">
            <p className="text-[13px] text-[var(--muted-foreground)]">
              댓글이 지속적으로 수집되면 일별 추이 차트가 자동으로 표시됩니다.
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Risk + FAQ summary */}
      <div className="grid gap-3 lg:grid-cols-2">
        <RiskCommentCard
          comments={highRiskComments}
          onSelect={setSelectedComment}
        />
        <FaqSummaryCard faqs={faqs} />
      </div>

      {/* Filters */}
      <CommentFilterBar
        filters={filters}
        onChange={setFilters}
        channels={channels}
      />

      {/* Table + Detail Panel */}
      <div className="flex gap-3">
        <div className={`min-w-0 flex-1 ${selectedComment ? "lg:w-3/5" : ""}`}>
          <CommentTable
            comments={filteredComments}
            onSelect={setSelectedComment}
            selectedId={selectedComment?.id}
          />
        </div>

        {selectedComment && (
          <div className="hidden w-2/5 max-w-[440px] lg:block">
            <div className="sticky top-4">
              <CommentDetailPanel
                comment={selectedComment}
                onClose={() => setSelectedComment(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile detail panel (below table) */}
      {selectedComment && (
        <div className="lg:hidden">
          <CommentDetailPanel
            comment={selectedComment}
            onClose={() => setSelectedComment(null)}
          />
        </div>
      )}
    </div>
  );
}
