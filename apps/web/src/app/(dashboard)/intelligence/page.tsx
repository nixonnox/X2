"use client";

import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useDeferredValue,
} from "react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import {
  Search,
  Loader2,
  Brain,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  GitCompareArrows,
  Clock,
  Shield,
  Wifi,
  WifiOff,
  TrendingUp,
  BarChart3,
  MessageSquare,
  Sparkles,
} from "lucide-react";

import { IntelligenceSummaryCards } from "@/components/intelligence/IntelligenceSummaryCards";
import { IntelligenceRadialGraph } from "@/components/intelligence/IntelligenceRadialGraph";
import { BenchmarkDifferentialRing } from "@/components/intelligence/BenchmarkDifferentialRing";
import { SignalFusionOverlayPanel } from "@/components/intelligence/SignalFusionOverlayPanel";
import { TaxonomyHeatMatrix } from "@/components/intelligence/TaxonomyHeatMatrix";
import { IntelligenceStatePanel } from "@/components/intelligence/IntelligenceStatePanel";
import { EvidenceSidePanel } from "@/components/intelligence/EvidenceSidePanel";
import { LiveMentionStatusPanel } from "@/components/intelligence/LiveMentionStatusPanel";
import BenchmarkTrendChart from "@/components/intelligence/BenchmarkTrendChart";
import { KeywordHistoryPanel } from "@/components/intelligence/KeywordHistoryPanel";
import { AnalysisHistoryPanel } from "@/components/intelligence/AnalysisHistoryPanel";
import { CurrentVsPreviousPanel } from "@/components/intelligence/CurrentVsPreviousPanel";
import { MentionTrendChart } from "@/components/intelligence/MentionTrendChart";
import { ChannelTrendChart } from "@/components/intelligence/ChannelTrendChart";
import { YouTubeSummaryPanel } from "@/components/intelligence/YouTubeSummaryPanel";
import { RelatedKeywordMap } from "@/components/intelligence/RelatedKeywordMap";
import { ExportButton } from "@/components/intelligence/ExportButton";
import { HourlyTrendChart } from "@/components/intelligence/HourlyTrendChart";
import { IssueTimeline } from "@/components/intelligence/IssueTimeline";
import { RelatedKeywordChangePanel } from "@/components/intelligence/RelatedKeywordChangePanel";
import { SentimentTermsPanel } from "@/components/intelligence/SentimentTermsPanel";
import { AttributeAnalysisPanel } from "@/components/intelligence/AttributeAnalysisPanel";
import { RankingPanel } from "@/components/intelligence/RankingPanel";
import { RawMentionList } from "@/components/intelligence/RawMentionList";
import { NoProjectEmptyState } from "@/components/shared";

// ─── Constants ───────────────────────────────────────────────────

const INDUSTRIES = [
  {
    value: "BEAUTY" as const,
    label: "뷰티",
    desc: "성분·효능·후기 흐름",
    color: "bg-pink-500",
    icon: "💄",
  },
  {
    value: "FNB" as const,
    label: "식음료",
    desc: "메뉴·맛·방문 반응",
    color: "bg-orange-500",
    icon: "🍽️",
  },
  {
    value: "FINANCE" as const,
    label: "금융",
    desc: "조건·비교·신뢰 흐름",
    color: "bg-blue-500",
    icon: "💰",
  },
  {
    value: "ENTERTAINMENT" as const,
    label: "엔터",
    desc: "팬 반응·확산·이슈",
    color: "bg-purple-500",
    icon: "🎬",
  },
];

// RECENT_KEYWORDS removed — now loaded from DB via intelligence.keywords

// ─── Types ───────────────────────────────────────────────────────

type ScreenState = {
  isLoading: boolean;
  isEmpty: boolean;
  isPartial: boolean;
  staleData: boolean;
  lowConfidence: boolean;
  providerCoverage: { connected: number; total: number; isPartial: boolean };
  comparisonAvailable: boolean;
  errors: string[];
};

// ─── Page Component ──────────────────────────────────────────────

export default function IntelligencePage() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  // Input state
  const [seedKeyword, setSeedKeyword] = useState("");
  // Deferred copy for query inputs — prevents per-keystroke history refetch.
  // React applies the update during idle time so rapid typing only triggers
  // a single historyQuery once the user pauses.
  const deferredSeedKeyword = useDeferredValue(seedKeyword);
  const [selectedIndustry, setSelectedIndustry] = useState<
    "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT" | undefined
  >(undefined);
  const [activeSection, setActiveSection] = useState<string>("summary");
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search history dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Analysis
  const analyzeMutation = trpc.intelligence.analyze.useMutation();

  // Keyword history from DB
  const keywordsQuery = trpc.intelligence.keywords.useQuery(
    { projectId: projectId ?? "", filter: "all", limit: 20 },
    { enabled: !!projectId },
  );
  const recordKeywordMutation = trpc.intelligence.recordKeyword.useMutation({
    onSuccess: () => keywordsQuery.refetch(),
  });
  const toggleSaveMutation = trpc.intelligence.toggleSaveKeyword.useMutation({
    onSuccess: () => keywordsQuery.refetch(),
  });

  // The active keyword for history/compare — either from analysis result or user input
  const activeKeywordForHistory =
    analyzeMutation.data?.seedKeyword ||
    deferredSeedKeyword.trim() ||
    undefined;

  // Analysis history — shows all runs when no keyword is active, filtered when one is
  const historyQuery = trpc.intelligence.history.useQuery(
    {
      projectId: projectId ?? "",
      seedKeyword: activeKeywordForHistory,
      limit: 20,
    },
    {
      enabled: !!projectId,
    },
  );

  // Current vs previous comparison — only when a specific keyword is analyzed
  const currentVsPreviousQuery = trpc.intelligence.currentVsPrevious.useQuery(
    {
      projectId: projectId ?? "",
      seedKeyword: analyzeMutation.data?.seedKeyword ?? "",
    },
    {
      enabled: !!projectId && !!analyzeMutation.data?.seedKeyword,
    },
  );

  // Load a specific saved run
  const [loadedRunId, setLoadedRunId] = useState<string | null>(null);
  const loadRunQuery = trpc.intelligence.loadRun.useQuery(
    { projectId: projectId ?? "", runId: loadedRunId ?? "" },
    { enabled: !!projectId && !!loadedRunId },
  );

  // Mention trend (daily/weekly/monthly)
  const [trendGranularity, setTrendGranularity] = useState<
    "daily" | "weekly" | "monthly"
  >("daily");
  const mentionTrendQuery = trpc.intelligence.mentionTrend.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
      granularity: trendGranularity,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Channel trend
  const channelTrendQuery = trpc.intelligence.channelTrend.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // YouTube summary
  const youtubeSummaryQuery = trpc.intelligence.youtubeSummary.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Hourly trend
  const hourlyTrendQuery = trpc.intelligence.hourlyTrend.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      hours: 24,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Issue timeline
  const issueTimelineQuery = trpc.intelligence.issueTimeline.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Raw mentions drill-down
  const [rawMentionPage, setRawMentionPage] = useState(1);
  const [rawPlatformFilter, setRawPlatformFilter] = useState<
    string | undefined
  >();
  const [rawSentimentFilter, setRawSentimentFilter] = useState<
    string | undefined
  >();
  const rawMentionsQuery = trpc.intelligence.rawMentions.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
      platform: rawPlatformFilter,
      sentiment: rawSentimentFilter,
      limit: 20,
      offset: (rawMentionPage - 1) * 20,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Channel ranking
  const channelRankingQuery = trpc.intelligence.channelRanking.useQuery(
    { projectId: projectId ?? "", days: 30, sortBy: "virality", limit: 10 },
    { enabled: !!projectId },
  );

  // Content ranking
  const contentRankingQuery = trpc.intelligence.contentRanking.useQuery(
    { projectId: projectId ?? "", days: 30, sortBy: "views", limit: 10 },
    { enabled: !!projectId },
  );

  // Related keyword change (period comparison)
  const relatedChangeQuery = trpc.intelligence.relatedKeywordChange.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      currentDays: 7,
      previousDays: 7,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Sentiment terms
  const sentimentTermsQuery = trpc.intelligence.sentimentTerms.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Attribute analysis
  const attributeQuery = trpc.intelligence.attributeAnalysis.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Related keywords
  const relatedKeywordsQuery = trpc.intelligence.relatedKeywords.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
      days: 30,
    },
    { enabled: !!projectId && !!analyzeMutation.data?.seedKeyword },
  );

  // Benchmark trend
  const benchmarkTrendQuery = trpc.intelligence.benchmarkTrend.useQuery(
    {
      projectId: projectId ?? "",
      seedKeyword: analyzeMutation.data?.seedKeyword ?? "",
      industryType: (analyzeMutation.data?.industryType ?? "BEAUTY") as
        | "BEAUTY"
        | "FNB"
        | "FINANCE"
        | "ENTERTAINMENT",
      days: 30,
    },
    {
      enabled: !!projectId && !!analyzeMutation.data?.seedKeyword,
    },
  );

  // Live mentions
  const { data: liveMentionData } = trpc.intelligence.liveMentions.useQuery(
    {
      projectId: projectId ?? "",
      keyword: analyzeMutation.data?.seedKeyword ?? "",
    },
    {
      enabled: !!projectId && !!analyzeMutation.data?.seedKeyword,
      refetchInterval: 60000, // Auto-refresh every 60s
    },
  );

  // Comment data for social bridge
  const { data: commentStatsRaw } = trpc.comment.sentimentStats.useQuery(
    { projectId: projectId ?? "" } as any,
    { enabled: !!projectId },
  );
  const { data: commentsRaw } = trpc.comment.listByProject.useQuery(
    { projectId: projectId ?? "", limit: 50 } as any,
    { enabled: !!projectId },
  );

  // Social data payload
  const socialDataPayload = useMemo(() => {
    const stats = commentStatsRaw as any;
    const commentsData = commentsRaw as any;
    if (!stats && !commentsData) return undefined;
    const comments = commentsData?.data ?? commentsData ?? [];
    const commentArray = Array.isArray(comments) ? comments : [];

    return {
      sentiment: stats
        ? {
            total: stats.total ?? 0,
            positive: stats.positive ?? 0,
            neutral: stats.neutral ?? 0,
            negative: stats.negative ?? 0,
            topNegativeTopics: commentArray
              .filter((c: any) => c.sentiment === "NEGATIVE")
              .slice(0, 3)
              .map((c: any) => c.topic ?? ""),
            topPositiveTopics: commentArray
              .filter((c: any) => c.sentiment === "POSITIVE")
              .slice(0, 3)
              .map((c: any) => c.topic ?? ""),
          }
        : undefined,
      commentTopics: commentArray.slice(0, 20).map((c: any) => ({
        topic: c.topic ?? c.primaryTopic ?? "기타",
        count: 1,
        sentiment: c.sentiment ?? "NEUTRAL",
        isQuestion: c.isQuestion ?? false,
        isRisk: c.isRisk ?? false,
      })),
      recentMentions: liveMentionData?.mentions?.slice(0, 10).map((m: any) => ({
        text: m.text.slice(0, 200),
        platform: m.platform,
        date: m.publishedAt,
      })),
    };
  }, [commentStatsRaw, commentsRaw, liveMentionData]);

  // Run analysis + record keyword
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const handleAnalyze = useCallback(() => {
    if (!seedKeyword.trim()) return;
    if (!projectId) {
      setAnalyzeError("프로젝트를 먼저 선택해주세요.");
      return;
    }
    setAnalyzeError(null);
    analyzeMutation.mutate(
      {
        projectId,
        seedKeyword: seedKeyword.trim(),
        industryType: selectedIndustry,
        socialData: socialDataPayload,
      },
      {
        onSuccess: (data) => {
          recordKeywordMutation.mutate({
            projectId,
            keyword: data.seedKeyword,
            industryType: data.industryType,
            industryLabel: data.industryLabel,
            confidence: data.metadata.confidence,
            freshness: data.metadata.freshness as string,
            signalHint: data.intelligence.signalQuality.overallRichness,
          });
        },
      },
    );
  }, [
    projectId,
    seedKeyword,
    selectedIndustry,
    socialDataPayload,
    analyzeMutation,
    recordKeywordMutation,
  ]);

  const handleQuickKeyword = useCallback(
    (kw: string, industryHint?: string) => {
      setSeedKeyword(kw);
      if (industryHint) {
        setSelectedIndustry(industryHint as typeof selectedIndustry);
      }
      if (!projectId) {
        setAnalyzeError("프로젝트를 먼저 선택해주세요.");
        return;
      }
      setAnalyzeError(null);
      analyzeMutation.mutate({
        projectId,
        seedKeyword: kw,
        industryType: selectedIndustry,
        socialData: socialDataPayload,
      });
    },
    [projectId, selectedIndustry, socialDataPayload, analyzeMutation],
  );

  // Node click for evidence panel
  const [selectedNode, setSelectedNode] = useState<{
    type: string;
    label: string;
  } | null>(null);

  // Screen state
  const result = analyzeMutation.data;
  const screenState: ScreenState = {
    isLoading: analyzeMutation.isPending || projectLoading,
    isEmpty: !result && !analyzeMutation.isPending,
    isPartial: result?.metadata?.isPartial ?? false,
    staleData: result?.metadata?.isStaleBased ?? false,
    lowConfidence: (result?.metadata?.confidence ?? 1) < 0.5,
    providerCoverage: {
      connected:
        (result?.metadata as any)?.providerCoverage?.connectedProviders ??
        liveMentionData?.coverage?.connectedProviders ??
        0,
      total:
        (result?.metadata as any)?.providerCoverage?.totalProviders ??
        liveMentionData?.coverage?.totalProviders ??
        5,
      isPartial:
        (result?.metadata as any)?.providerCoverage?.isPartial ??
        liveMentionData?.coverage?.isPartial ??
        true,
    },
    comparisonAvailable: !!result,
    errors: analyzeMutation.error ? [analyzeMutation.error.message] : [],
  };

  const intel = result?.intelligence;
  const signalQuality = intel?.signalQuality ?? {
    hasClusterData: false,
    hasSocialData: false,
    hasBenchmarkData: false,
    overallRichness: "MINIMAL" as const,
  };

  // ─── Early guards: loading and no-project states ─────────────────
  if (projectLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1400px] items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[13px]">워크스페이스를 불러오는 중…</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <NoProjectEmptyState description="인텔리전스 분석을 시작하려면 먼저 프로젝트를 만들어야 해요.\n설정 페이지에서 프로젝트를 생성한 뒤 다시 이 화면으로 돌아와 주세요." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ─── Hub Header ─────────────────────────────────────────── */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600 p-5 text-white shadow-lg shadow-violet-200/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">인텔리전스 허브</h1>
              <p className="text-sm text-violet-200">
                키워드를 분석하고, 실시간 반응을 보고, 비교해요
              </p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            {result && (
              <>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm ${
                    signalQuality.overallRichness === "RICH"
                      ? "bg-emerald-500/30 text-emerald-100"
                      : signalQuality.overallRichness === "MODERATE"
                        ? "bg-blue-500/30 text-blue-100"
                        : "bg-white/20 text-white/70"
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  {signalQuality.overallRichness === "RICH"
                    ? "풍부해요"
                    : signalQuality.overallRichness === "MODERATE"
                      ? "보통이에요"
                      : "최소한이에요"}
                </span>

                {result.metadata.isStaleBased && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/30 px-2.5 py-1 text-[11px] text-amber-100">
                    <Clock className="h-3 w-3" />
                    이전 데이터
                  </span>
                )}

                {liveMentionData?.coverage?.isPartial && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/30 px-2.5 py-1 text-[11px] text-amber-100">
                    <WifiOff className="h-3 w-3" />
                    일부 데이터
                  </span>
                )}

                {!liveMentionData?.coverage?.isPartial &&
                  liveMentionData?.totalCount !== undefined &&
                  liveMentionData.totalCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-100">
                      <Wifi className="h-3 w-3" />
                      실시간
                    </span>
                  )}
              </>
            )}

            {result && (
              <a
                href={`intelligence/compare?keyword=${encodeURIComponent(result.seedKeyword)}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
              >
                <GitCompareArrows className="h-3.5 w-3.5" />
                비교 분석
              </a>
            )}
          </div>
        </div>

        {/* Hub quick access cards */}
        {!result && !screenState.isLoading && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                icon: TrendingUp,
                label: "키워드 분석",
                desc: "키워드의 검색 흐름을 분석해요",
                action: () =>
                  document
                    .querySelector<HTMLInputElement>("input[type=text]")
                    ?.focus(),
              },
              {
                icon: GitCompareArrows,
                label: "비교 분석",
                desc: "키워드·업종·기간을 비교해요",
                href: "/intelligence/compare",
              },
              {
                icon: MessageSquare,
                label: "실시간 반응",
                desc: "소셜에서 지금 어떤 반응인지 봐요",
                action: () => {
                  setActiveSection("social");
                },
              },
              {
                icon: BarChart3,
                label: "기준 비교",
                desc: "업종 기준선과 비교해요",
                action: () => {
                  setActiveSection("benchmark");
                },
              },
            ].map((card) => (
              <a
                key={card.label}
                href={card.href ?? "#"}
                onClick={(e) => {
                  if (card.action) {
                    e.preventDefault();
                    card.action();
                  }
                }}
                className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <card.icon className="h-5 w-5 shrink-0 text-violet-200" />
                <div>
                  <p className="text-xs font-semibold text-white">
                    {card.label}
                  </p>
                  <p className="text-[10px] text-violet-300">{card.desc}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ─── Input Section ──────────────────────────────────────── */}
      <div className="mb-6 space-y-3 rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
        {/* Keyword input */}
        <div className="flex gap-2" ref={searchContainerRef}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={seedKeyword}
              onChange={(e) => setSeedKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setShowSearchHistory(false);
                  handleAnalyze();
                }
                if (e.key === "Escape") setShowSearchHistory(false);
              }}
              onFocus={() => setShowSearchHistory(true)}
              placeholder="어떤 키워드를 분석해볼까요?"
              className="input w-full py-2.5 pl-10 pr-4 text-sm"
            />
            {/* Search history dropdown */}
            {showSearchHistory &&
              (() => {
                const allKws = keywordsQuery.data?.keywords ?? [];
                const filtered = seedKeyword.trim()
                  ? allKws.filter((kw: { keyword: string }) =>
                      kw.keyword
                        .toLowerCase()
                        .includes(seedKeyword.trim().toLowerCase()),
                    )
                  : allKws;
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-white shadow-lg">
                    <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
                      검색 히스토리
                    </div>
                    {filtered.map(
                      (kw: {
                        keyword: string;
                        industryType: string | null;
                        isSaved: boolean;
                        lastSignalHint: string | null;
                        lastAnalyzedAt: string | null;
                      }) => (
                        <button
                          key={kw.keyword}
                          onClick={() => {
                            setSeedKeyword(kw.keyword);
                            if (kw.industryType) {
                              setSelectedIndustry(
                                kw.industryType as
                                  | "BEAUTY"
                                  | "FNB"
                                  | "FINANCE"
                                  | "ENTERTAINMENT",
                              );
                            }
                            setShowSearchHistory(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-violet-50"
                        >
                          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                          <span className="flex-1 truncate text-[var(--foreground)]">
                            {kw.keyword}
                          </span>
                          {kw.isSaved && (
                            <span className="text-[10px] text-violet-500">
                              ★
                            </span>
                          )}
                          {kw.lastSignalHint === "RICH" && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          )}
                          {kw.industryType && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              {
                                INDUSTRIES.find(
                                  (i) => i.value === kw.industryType,
                                )?.icon
                              }
                            </span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                );
              })()}
          </div>
          <button
            onClick={() => {
              setShowSearchHistory(false);
              handleAnalyze();
            }}
            disabled={!seedKeyword.trim() || screenState.isLoading}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {screenState.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            분석 시작
          </button>
        </div>

        {/* Quick keywords + Industry */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {(keywordsQuery.data?.keywords ?? [])
              .slice(0, 6)
              .map(
                (kw: {
                  keyword: string;
                  industryType: string | null;
                  isSaved: boolean;
                  lastSignalHint: string | null;
                }) => (
                  <button
                    key={kw.keyword}
                    onClick={() =>
                      handleQuickKeyword(
                        kw.keyword,
                        kw.industryType ?? undefined,
                      )
                    }
                    className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                      kw.isSaved
                        ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                        : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    {kw.keyword}
                    {kw.lastSignalHint === "RICH" && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                ),
              )}
            {(keywordsQuery.data?.keywords ?? []).length === 0 && (
              <span className="text-[11px] text-[var(--muted-foreground)]">
                키워드를 분석하면 여기에 기록이 나타나요
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.value}
                onClick={() =>
                  setSelectedIndustry(
                    selectedIndustry === ind.value ? undefined : ind.value,
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-left transition-all ${
                  selectedIndustry === ind.value
                    ? `${ind.color} text-white shadow-sm`
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                }`}
              >
                <span className="text-[11px] font-medium">
                  {ind.icon} {ind.label}
                </span>
                <span
                  className={`block text-[9px] ${
                    selectedIndustry === ind.value
                      ? "text-white/80"
                      : "text-[var(--muted-foreground)]"
                  }`}
                >
                  {ind.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Error State ────────────────────────────────────────── */}
      {analyzeError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">{analyzeError}</p>
        </div>
      )}
      {screenState.errors.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="text-sm text-red-700">
            {screenState.errors.map((e, i) => (
              <p key={i}>{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* ─── Loading State ──────────────────────────────────────── */}
      {screenState.isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm text-[var(--muted-foreground)]">
            분석하고 있어요
          </p>
        </div>
      )}

      {/* ─── Empty State ────────────────────────────────────────── */}
      {screenState.isEmpty && !screenState.isLoading && (
        <div className="py-8">
          <div className="mb-8 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-400" />
            <h3 className="mb-1 text-[15px] font-semibold text-[var(--foreground)]">
              키워드를 입력하면 분석이 시작돼요
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              검색 데이터, 소셜 반응, 업종 기준을 함께 분석해요
            </p>
          </div>

          {/* Feature preview cards */}
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100">
                <TrendingUp className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <h4 className="mb-1 text-[14px] font-semibold text-[var(--foreground)]">
                신호 종합
              </h4>
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                검색 데이터, 소셜 반응, 업종 기준을 하나로 종합해요
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <Wifi className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <h4 className="mb-1 text-[14px] font-semibold text-[var(--foreground)]">
                실시간 반응
              </h4>
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                YouTube, Instagram, TikTok에서 어떤 반응이 나오는지 봐요
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <GitCompareArrows className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <h4 className="mb-1 text-[14px] font-semibold text-[var(--foreground)]">
                비교 분석
              </h4>
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                키워드, 업종, 기간별 차이를 한눈에 비교해요
              </p>
            </div>
          </div>

          {/* Analysis History Panel — shown in empty state when history exists */}
          {(historyQuery.data?.runs ?? []).length > 0 && (
            <div className="mx-auto mt-8 max-w-3xl">
              <AnalysisHistoryPanel
                runs={(historyQuery.data?.runs ?? []).map((r: any) => ({
                  id: r.id,
                  seedKeyword: r.seedKeyword,
                  industryType: r.industryType,
                  industryLabel: r.industryLabel,
                  confidence: r.confidence,
                  freshness: r.freshness,
                  isPartial: r.isPartial,
                  isMockOnly: r.isMockOnly,
                  analyzedAt: r.analyzedAt,
                  signalQuality: r.signalQuality,
                  benchmarkComparison: r.benchmarkComparison,
                }))}
                isLoading={historyQuery.isLoading}
                onLoadRun={(runId) => {
                  setLoadedRunId(runId);
                }}
                emptyMessage="아직 분석 이력이 없어요. 키워드를 분석하면 이력이 쌓여요."
              />
            </div>
          )}

          {/* Keyword History Panel — shown in empty state */}
          {(keywordsQuery.data?.keywords ?? []).length > 0 && (
            <div className="mx-auto mt-8 max-w-3xl">
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                최근 분석 키워드
              </h3>
              <KeywordHistoryPanel
                keywords={(keywordsQuery.data?.keywords ?? []).map(
                  (k: any) => ({
                    ...k,
                    lastAnalyzedAt: k.lastAnalyzedAt as string,
                  }),
                )}
                onSelectKeyword={(kw, ind) => handleQuickKeyword(kw, ind)}
                onToggleSave={(kw) => {
                  if (projectId)
                    toggleSaveMutation.mutate({ projectId, keyword: kw });
                }}
                activeKeyword={seedKeyword}
                isLoading={keywordsQuery.isLoading}
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Result Section ─────────────────────────────────────── */}
      {result && !screenState.isLoading && (
        <div className="space-y-6">
          {/* State panel */}
          <IntelligenceStatePanel
            confidence={result.metadata.confidence}
            isPartial={result.metadata.isPartial}
            isStaleBased={result.metadata.isStaleBased}
            isMockOnly={result.metadata.isMockOnly}
            signalQuality={signalQuality}
            warnings={result.additionalWarnings}
          />

          {/* ── Section Nav ─────────────────────────────────────── */}
          <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
            <div className="flex min-w-max gap-1 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-1 sm:min-w-0">
              {[
                { key: "summary", label: "요약" },
                { key: "changes", label: "변화" },
                { key: "history", label: "이력" },
                { key: "trend", label: "트렌드" },
                { key: "radial", label: "연결 그래프" },
                { key: "benchmark", label: "기준 비교" },
                { key: "signal", label: "신호 종합" },
                { key: "social", label: "실시간 반응" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2.5 text-[11px] font-medium transition-all md:flex-1 md:text-xs ${
                    activeSection === tab.key
                      ? "bg-white text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
            {/* Main content (2/3) */}
            <div className="space-y-4 md:col-span-1 lg:col-span-2">
              {activeSection === "summary" && (
                <IntelligenceSummaryCards
                  industryType={result.industryType}
                  industryLabel={result.industryLabel}
                  signalQuality={signalQuality}
                  taxonomyMapping={intel?.taxonomyMapping ?? null}
                  benchmarkBaseline={intel?.benchmarkBaseline ?? []}
                  benchmarkComparison={
                    intel?.benchmarkComparison
                      ? {
                          ...intel.benchmarkComparison,
                          comparisons:
                            intel.benchmarkComparison.comparisons?.map(
                              (c: any) => ({
                                key: c.metricKey ?? c.key,
                                label: c.metricLabel ?? c.label,
                                rating: c.rating,
                                baseline: c.baselineValue ?? c.baseline,
                                actual: c.actualValue ?? c.actual,
                                deviation:
                                  c.deviation ?? c.deviationPercent ?? 0,
                                interpretation: c.interpretation ?? "",
                              }),
                            ) ?? [],
                        }
                      : null
                  }
                  socialIntegration={intel?.socialIntegration ?? null}
                  fusedEvidenceCount={intel?.fusedEvidenceCount ?? 0}
                  fusedInsightCount={intel?.fusedInsightCount ?? 0}
                  fusedWarningCount={intel?.fusedWarningCount ?? 0}
                  metadata={result.metadata}
                />
              )}

              {activeSection === "changes" && (
                <div className="space-y-4">
                  <CurrentVsPreviousPanel
                    hasPreviousRun={
                      currentVsPreviousQuery.data?.hasPreviousRun ?? false
                    }
                    current={currentVsPreviousQuery.data?.current as any}
                    previous={currentVsPreviousQuery.data?.previous as any}
                    isLoading={currentVsPreviousQuery.isLoading}
                    onOpenFullCompare={() => {
                      if (result) {
                        window.location.href = `/intelligence/compare?keyword=${encodeURIComponent(result.seedKeyword)}&type=period_vs_period`;
                      }
                    }}
                  />

                  {/* Loaded past run display */}
                  {loadRunQuery.data && loadedRunId && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-5 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-violet-800">
                          과거 분석 결과
                        </h3>
                        <button
                          onClick={() => setLoadedRunId(null)}
                          className="text-xs text-violet-500 hover:text-violet-700"
                        >
                          닫기
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            키워드
                          </p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {(loadRunQuery.data as any).seedKeyword}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            업종
                          </p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {(loadRunQuery.data as any).industryType}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            신뢰도
                          </p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {Math.round(
                              ((loadRunQuery.data as any).confidence ?? 0) *
                                100,
                            )}
                            %
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            분석일시
                          </p>
                          <p className="font-semibold text-[var(--foreground)]">
                            {new Date(
                              (loadRunQuery.data as any).analyzedAt,
                            ).toLocaleString("ko-KR")}
                          </p>
                        </div>
                      </div>
                      {(loadRunQuery.data as any).isPartial && (
                        <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          부분 데이터 기반 분석이에요
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "history" && (
                <div className="space-y-4">
                  <AnalysisHistoryPanel
                    runs={(historyQuery.data?.runs ?? []).map((r: any) => ({
                      id: r.id,
                      seedKeyword: r.seedKeyword,
                      industryType: r.industryType,
                      industryLabel: r.industryLabel,
                      confidence: r.confidence,
                      freshness: r.freshness,
                      isPartial: r.isPartial,
                      isMockOnly: r.isMockOnly,
                      analyzedAt: r.analyzedAt,
                      signalQuality: r.signalQuality,
                      benchmarkComparison: r.benchmarkComparison,
                    }))}
                    isLoading={historyQuery.isLoading}
                    currentRunId={result?.metadata?.savedRunId}
                    onLoadRun={(runId) => {
                      setLoadedRunId(runId);
                      setActiveSection("changes");
                    }}
                    onCompareWithCurrent={(runId) => {
                      if (result) {
                        window.location.href = `/intelligence/compare?keyword=${encodeURIComponent(result.seedKeyword)}&leftRunId=${result.metadata.savedRunId}&rightRunId=${runId}&type=period_vs_period`;
                      }
                    }}
                  />

                  {/* Keyword history in history view */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                      분석 키워드 기록
                    </h3>
                    <KeywordHistoryPanel
                      keywords={(keywordsQuery.data?.keywords ?? []).map(
                        (k: any) => ({
                          ...k,
                          lastAnalyzedAt: k.lastAnalyzedAt as string,
                        }),
                      )}
                      onSelectKeyword={(kw, ind) => handleQuickKeyword(kw, ind)}
                      onToggleSave={(kw) => {
                        if (projectId)
                          toggleSaveMutation.mutate({ projectId, keyword: kw });
                      }}
                      activeKeyword={result?.seedKeyword}
                      isLoading={keywordsQuery.isLoading}
                    />
                  </div>
                </div>
              )}

              {activeSection === "trend" && (
                <div className="space-y-4">
                  {/* Hourly Trend + Spikes */}
                  <HourlyTrendChart
                    dataPoints={
                      (hourlyTrendQuery.data?.dataPoints ?? []) as any
                    }
                    spikes={(hourlyTrendQuery.data?.spikes ?? []) as any}
                    stats={(hourlyTrendQuery.data?.stats ?? null) as any}
                    hasData={hourlyTrendQuery.data?.hasData ?? false}
                    warnings={hourlyTrendQuery.data?.warnings ?? []}
                  />

                  {/* Issue Timeline */}
                  <IssueTimeline
                    events={(issueTimelineQuery.data?.events ?? []) as any}
                    hasData={issueTimelineQuery.data?.hasData ?? false}
                    warnings={issueTimelineQuery.data?.warnings ?? []}
                  />

                  {/* Mention Trend (daily/weekly/monthly) */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                    <MentionTrendChart
                      dataPoints={
                        (mentionTrendQuery.data?.dataPoints ?? []) as any
                      }
                      granularity={trendGranularity}
                      hasData={mentionTrendQuery.data?.hasData ?? false}
                      warnings={mentionTrendQuery.data?.warnings ?? []}
                      onGranularityChange={setTrendGranularity}
                    />
                  </div>

                  {/* Channel Trend */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                    <ChannelTrendChart
                      channels={(channelTrendQuery.data?.channels ?? []) as any}
                      hasData={channelTrendQuery.data?.hasData ?? false}
                      warnings={channelTrendQuery.data?.warnings ?? []}
                    />
                  </div>

                  {/* YouTube Summary */}
                  <YouTubeSummaryPanel
                    summary={(youtubeSummaryQuery.data?.summary ?? null) as any}
                    topContent={
                      (youtubeSummaryQuery.data?.topContent ?? []) as any
                    }
                    hasData={youtubeSummaryQuery.data?.hasData ?? false}
                    warnings={youtubeSummaryQuery.data?.warnings ?? []}
                    isLoading={youtubeSummaryQuery.isLoading}
                  />

                  {/* Related Keywords Map */}
                  <RelatedKeywordMap
                    centerKeyword={result?.seedKeyword ?? ""}
                    nodes={(relatedKeywordsQuery.data?.nodes ?? []) as any}
                    hasData={relatedKeywordsQuery.data?.hasData ?? false}
                    warnings={relatedKeywordsQuery.data?.warnings ?? []}
                  />

                  {/* Related Keyword Change */}
                  <RelatedKeywordChangePanel
                    nodes={(relatedChangeQuery.data?.nodes ?? []) as any}
                    summary={(relatedChangeQuery.data?.summary ?? null) as any}
                    periods={(relatedChangeQuery.data?.periods ?? null) as any}
                    hasData={relatedChangeQuery.data?.hasData ?? false}
                    warnings={relatedChangeQuery.data?.warnings ?? []}
                  />

                  {/* Sentiment Terms */}
                  <SentimentTermsPanel
                    positive={(sentimentTermsQuery.data?.positive ?? []) as any}
                    negative={(sentimentTermsQuery.data?.negative ?? []) as any}
                    neutral={(sentimentTermsQuery.data?.neutral ?? []) as any}
                    hasData={sentimentTermsQuery.data?.hasData ?? false}
                    warnings={sentimentTermsQuery.data?.warnings ?? []}
                  />

                  {/* Attribute Strength/Weakness */}
                  <AttributeAnalysisPanel
                    attributes={(attributeQuery.data?.attributes ?? []) as any}
                    strengths={
                      (attributeQuery.data?.strengths ?? []) as string[]
                    }
                    weaknesses={
                      (attributeQuery.data?.weaknesses ?? []) as string[]
                    }
                    hasData={attributeQuery.data?.hasData ?? false}
                    warnings={attributeQuery.data?.warnings ?? []}
                  />

                  {/* Export Buttons */}
                  {result && projectId && (
                    <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-sm">
                      <span className="mr-2 self-center text-[11px] font-medium text-[var(--muted-foreground)]">
                        데이터 내려받기
                      </span>
                      <ExportButton
                        projectId={projectId}
                        keyword={result.seedKeyword}
                        type="mention_trend"
                        label="소셜 추이"
                      />
                      <ExportButton
                        projectId={projectId}
                        keyword={result.seedKeyword}
                        type="channel_trend"
                        label="채널별"
                      />
                      <ExportButton
                        projectId={projectId}
                        keyword={result.seedKeyword}
                        type="youtube_summary"
                        label="YouTube"
                      />
                      <ExportButton
                        projectId={projectId}
                        keyword={result.seedKeyword}
                        type="benchmark_trend"
                        label="기준 비교"
                      />
                    </div>
                  )}

                  {/* Rankings */}
                  <RankingPanel
                    channelRankings={
                      (channelRankingQuery.data?.rankings ?? []) as any
                    }
                    contentRankings={
                      (contentRankingQuery.data?.rankings ?? []) as any
                    }
                    hasChannelData={channelRankingQuery.data?.hasData ?? false}
                    hasContentData={contentRankingQuery.data?.hasData ?? false}
                    channelWarnings={channelRankingQuery.data?.warnings ?? []}
                    contentWarnings={contentRankingQuery.data?.warnings ?? []}
                    isLoading={
                      channelRankingQuery.isLoading ||
                      contentRankingQuery.isLoading
                    }
                  />

                  {/* Benchmark Trend */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                    <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
                      기준 비교 트렌드 (최근 30일)
                    </h3>
                    <BenchmarkTrendChart
                      dataPoints={benchmarkTrendQuery.data?.dataPoints ?? []}
                      trendSummary={
                        benchmarkTrendQuery.data?.trendSummary ?? {
                          direction: "INSUFFICIENT_DATA",
                          changePercent: 0,
                          volatility: "UNKNOWN",
                          dataPointCount: 0,
                          periodDays: 30,
                        }
                      }
                      warnings={benchmarkTrendQuery.data?.warnings ?? []}
                      hasData={benchmarkTrendQuery.data?.hasData ?? false}
                    />
                  </div>

                  {/* Keyword history in trend view */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                      분석 키워드 기록
                    </h3>
                    <KeywordHistoryPanel
                      keywords={(keywordsQuery.data?.keywords ?? []).map(
                        (k: any) => ({
                          ...k,
                          lastAnalyzedAt: k.lastAnalyzedAt as string,
                        }),
                      )}
                      onSelectKeyword={(kw, ind) => handleQuickKeyword(kw, ind)}
                      onToggleSave={(kw) => {
                        if (projectId)
                          toggleSaveMutation.mutate({ projectId, keyword: kw });
                      }}
                      activeKeyword={result.seedKeyword}
                      isLoading={keywordsQuery.isLoading}
                    />
                  </div>
                </div>
              )}

              {activeSection === "radial" && (
                <IntelligenceRadialGraph
                  seedKeyword={result.seedKeyword}
                  industryType={result.industryType.toLowerCase()}
                  taxonomyCategories={
                    intel?.taxonomyMapping?.coveredCategories?.map(
                      (c: any) => ({
                        category: c.category,
                        clusterCount: c.clusterCount,
                      }),
                    ) ?? []
                  }
                  dataBlocks={
                    result.additionalEvidence?.map((e: any, i: number) => ({
                      blockType: e.dataSourceType?.toUpperCase() ?? "EVIDENCE",
                      title: e.label ?? `Evidence ${i + 1}`,
                      taxonomyTags: [],
                    })) ?? []
                  }
                  signalQuality={signalQuality}
                  onNodeClick={(node) => setSelectedNode(node)}
                />
              )}

              {activeSection === "benchmark" && (
                <BenchmarkDifferentialRing
                  industryType={result.industryType.toLowerCase()}
                  industryLabel={result.industryLabel}
                  comparisons={
                    intel?.benchmarkComparison?.comparisons?.map((c: any) => ({
                      key: c.metricKey ?? c.key,
                      label: c.metricLabel ?? c.label,
                      rating: c.rating,
                      baseline: c.baselineValue ?? c.baseline,
                      actual: c.actualValue ?? c.actual,
                      deviation: c.deviation ?? c.deviationPercent ?? 0,
                      interpretation: c.interpretation ?? "",
                    })) ?? null
                  }
                  baseline={intel?.benchmarkBaseline ?? []}
                />
              )}

              {activeSection === "signal" && (
                <SignalFusionOverlayPanel
                  signalQuality={signalQuality}
                  taxonomyMapping={
                    intel?.taxonomyMapping
                      ? {
                          coveredCategories:
                            intel.taxonomyMapping.coveredCategories ?? [],
                          unmappedClusters:
                            intel.taxonomyMapping.unmappedClusters ?? 0,
                          totalClusters:
                            intel.taxonomyMapping.totalClusters ?? 0,
                        }
                      : null
                  }
                  socialIntegration={intel?.socialIntegration ?? null}
                  fusedEvidenceCount={intel?.fusedEvidenceCount ?? 0}
                  fusedInsightCount={intel?.fusedInsightCount ?? 0}
                  fusedWarningCount={intel?.fusedWarningCount ?? 0}
                />
              )}

              {activeSection === "social" && (
                <div className="space-y-4">
                  <LiveMentionStatusPanel
                    liveMentionData={liveMentionData ?? null}
                    isLoading={!liveMentionData && !!result}
                    keyword={result.seedKeyword}
                  />

                  {/* Raw Mentions Drill-down */}
                  <RawMentionList
                    mentions={(rawMentionsQuery.data?.mentions ?? []) as any}
                    total={rawMentionsQuery.data?.total ?? 0}
                    page={rawMentionsQuery.data?.page ?? 1}
                    totalPages={rawMentionsQuery.data?.totalPages ?? 1}
                    hasData={rawMentionsQuery.data?.hasData ?? false}
                    warnings={rawMentionsQuery.data?.warnings ?? []}
                    isLoading={rawMentionsQuery.isLoading}
                    onPageChange={setRawMentionPage}
                    onPlatformFilter={(p) => {
                      setRawPlatformFilter(p);
                      setRawMentionPage(1);
                    }}
                    onSentimentFilter={(s) => {
                      setRawSentimentFilter(s);
                      setRawMentionPage(1);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Side panel (1/3) — Insights + Actions + Warnings */}
            <div className="space-y-4">
              {/* Quick insights */}
              <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
                  인사이트
                </h3>
                {result.additionalInsights.length > 0 ? (
                  <div className="space-y-2">
                    {result.additionalInsights
                      .slice(0, 5)
                      .map((ins: any, i: number) => (
                        <div key={i} className="rounded-lg bg-blue-50 p-3">
                          <p className="text-[11px] font-medium text-blue-900">
                            {ins.title}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-blue-700">
                            {ins.description}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[9px] text-blue-500">
                              신뢰도 {Math.round(ins.confidence * 100)}%
                            </span>
                            <span className="text-[9px] text-blue-400">
                              {ins.source}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    아직 인사이트가 없어요
                  </p>
                )}
              </div>

              {/* Warnings */}
              {result.additionalWarnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    경고
                  </h3>
                  <div className="space-y-1.5">
                    {result.additionalWarnings.map((w: string, i: number) => (
                      <p
                        key={i}
                        className="text-[11px] leading-relaxed text-amber-700"
                      >
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Taxonomy heatmap */}
              {intel?.taxonomyMapping && (
                <TaxonomyHeatMatrix
                  industryType={result.industryType.toLowerCase()}
                  coveredCategories={
                    intel.taxonomyMapping.coveredCategories ?? []
                  }
                  uncoveredCategories={
                    intel.taxonomyMapping.uncoveredCategories ?? []
                  }
                  totalClusters={intel.taxonomyMapping.totalClusters ?? 0}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Evidence Side Panel ──────────────────────────────── */}
      <EvidenceSidePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        industryType={result?.industryType ?? ""}
        industryLabel={result?.industryLabel ?? ""}
        dataBlocks={result?.additionalEvidence?.map((e: any, i: number) => ({
          id: `ev-${i}`,
          type: e.dataSourceType ?? "EVIDENCE",
          label: e.label,
          value: "",
          description: e.summary,
          taxonomyTags: [],
        }))}
        socialIntegration={
          liveMentionData
            ? {
                mentionCount: liveMentionData.totalCount,
                sentiment:
                  liveMentionData.buzzLevel === "HIGH"
                    ? "활발"
                    : liveMentionData.buzzLevel === "MODERATE"
                      ? "보통"
                      : "저조",
                topPlatforms: liveMentionData.providerStatuses
                  .filter((p) => p.isAvailable)
                  .map((p) => p.platform),
                recentMentions: liveMentionData.mentions
                  .slice(0, 5)
                  .map((m) => ({
                    text: m.text.slice(0, 150),
                    platform: m.platform,
                    date: m.publishedAt,
                  })),
              }
            : undefined
        }
      />
    </div>
  );
}
