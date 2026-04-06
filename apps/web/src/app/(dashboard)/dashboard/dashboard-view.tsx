"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  PlaySquare,
  Link2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Tv,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Clock,
  AlertTriangle,
  SmilePlus,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Zap,
  FileText,
  Users,
  Globe,
  Brain,
  GitCompareArrows,
  FolderOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageHeader, KpiCard, ChartCard } from "@/components/shared";
import { resolveChannelUrl, getPlatformLabel } from "@/lib/channels";
import { TrendingIntentCard } from "@/components/dashboard/TrendingIntentCard";
import { TopJourneyPreviewCard } from "@/components/dashboard/TopJourneyPreviewCard";
import { PersonaSummaryCard } from "@/components/dashboard/PersonaSummaryCard";
import { ClusterSummaryCard } from "@/components/dashboard/ClusterSummaryCard";
import { ListeningActionCard } from "@/components/dashboard/ListeningActionCard";
import { ListeningSummaryCard } from "@/components/dashboard/ListeningSummaryCard";
import { SearchIntelligenceStatusBar } from "@/components/dashboard/SearchIntelligenceStatusBar";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";

// ---- Types for props ----

export type DashboardKpi = {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  trend: number[];
};

export type DashboardChartPoint = {
  month: string;
  views: number;
  engagement: number;
  followers: number;
};

export type DashboardContent = {
  id: string;
  title: string;
  platform: string;
  views: number;
  engagement: number;
  publishedAt: string;
};

export type DashboardViewProps = {
  hasChannels: boolean;
  kpis: DashboardKpi[];
  chartSeries: DashboardChartPoint[];
  recentContents: DashboardContent[];
  dataStatus?: DataStatus;
};

// ---- Helpers ----

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const CHART_GRID = { stroke: "var(--border-subtle)" };
const TICK_STYLE = { fontSize: 11, fill: "var(--muted-foreground)" };

// ---- QuickAddChannel (unchanged) ----

function QuickAddChannel() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setDetected(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setValidating(false);
      return;
    }

    setValidating(true);
    debounceRef.current = setTimeout(() => {
      const result = resolveChannelUrl(value);
      setValidating(false);
      if (result.isValid && result.detectedPlatformCode) {
        setDetected(getPlatformLabel(result.detectedPlatformCode));
      }
    }, 400);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (url.trim()) {
      router.push(`/channels/new?url=${encodeURIComponent(url.trim())}`);
    }
  }

  // 프로젝트 없을 때 친절한 안내
  if (!projectLoading && !projectId) {
    return (
      <div className="card border-amber-200 bg-amber-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <FolderOpen className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
              먼저 프로젝트를 만들어주세요
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
              채널을 등록하려면 프로젝트가 필요해요. 프로젝트는 분석할 채널들을
              묶는 단위입니다.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-amber-700"
              >
                프로젝트 만들기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/start"
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary-hover)]"
              >
                시작 가이드 보기
              </Link>
            </div>
          </div>
        </div>
        {/* 플로우 안내 */}
        <div className="mt-4 flex items-center gap-2 rounded-md bg-white/70 px-3 py-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
            1
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            워크스페이스 생성
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
            2
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            프로젝트 생성
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
            3
          </span>
          <span className="text-[11px] font-medium text-amber-700">
            채널 등록
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)]">→</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--secondary)] text-[10px] font-bold text-[var(--muted-foreground)]">
            4
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            분석 시작
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <Link2 className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
            채널 URL을 붙여넣으세요
          </h3>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            YouTube, Instagram, TikTok 등 분석하고 싶은 채널의 URL을 입력하세요
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="예: https://www.instagram.com/genus_offcl/"
            className="input h-9 w-full pr-8 text-[13px]"
          />
          {validating && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
            </div>
          )}
          {detected && !validating && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!url.trim()}
          className="btn-primary h-9 whitespace-nowrap px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          채널 등록
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </button>
      </form>

      {detected && (
        <p className="mt-2 flex items-center gap-1 text-[12px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-medium">{detected}</span> 채널이 감지되었습니다
        </p>
      )}
    </div>
  );
}

// ---- OnboardingGuide (unchanged) ----

function OnboardingGuide() {
  const steps = [
    {
      icon: Tv,
      title: "채널 추가",
      description: "분석할 소셜 미디어 채널의 URL을 등록하세요",
      href: "/channels/new",
      color: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      icon: TrendingUp,
      title: "키워드 등록",
      description: "브랜드 관련 키워드로 트렌드를 추적하세요",
      href: "/keywords",
      color: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      icon: MessageSquare,
      title: "경쟁 채널 추가",
      description: "경쟁사와 성과를 비교해 보세요",
      href: "/competitors",
      color: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      icon: Sparkles,
      title: "인사이트 확인",
      description: "AI가 분석한 전략 제안을 확인하세요",
      href: "/insights",
      color: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((step, i) => (
        <Link
          key={step.title}
          href={step.href}
          className="card group p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${step.color}`}
            >
              <step.icon className={`h-4 w-4 ${step.iconColor}`} />
            </div>
            <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
              Step {i + 1}
            </span>
          </div>
          <p className="text-[13px] font-semibold">{step.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
            {step.description}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 text-[12px] text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
            시작하기 <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      ))}
    </div>
  );
}

// ---- DataStatusBar ----

type DataStatus = {
  lastSyncAt: string | null;
  failedPipelines: number;
  totalPipelines: number;
  lowConfidenceCount: number;
};

function DataStatusBar({
  hasChannels,
  channelCount,
  status,
}: {
  hasChannels: boolean;
  channelCount: number;
  status?: DataStatus;
}) {
  if (!hasChannels) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2.5 text-[12px] text-[var(--muted-foreground)]">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
        <span>데이터가 아직 없습니다. 채널을 등록해 주세요.</span>
      </div>
    );
  }

  const lastSync = status?.lastSyncAt ?? null;
  const failed = status?.failedPipelines ?? 0;
  const total = status?.totalPipelines ?? 0;
  const lowConf = status?.lowConfidenceCount ?? 0;
  const allHealthy = failed === 0;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-4 py-2.5 text-[12px] text-[var(--muted-foreground)] ${
        failed > 0
          ? "border-amber-300 bg-amber-50/50"
          : "border-[var(--border)] bg-[var(--secondary)]"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" />
        최근 수집: {lastSync ?? "대기 중"}
      </span>
      <span className="hidden text-[var(--border)] sm:inline">|</span>
      <span className="inline-flex items-center gap-1.5">
        <Tv className="h-3.5 w-3.5" />
        채널 {channelCount}개 연결
      </span>
      <span className="hidden text-[var(--border)] sm:inline">|</span>
      {allHealthy ? (
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          수집 상태: 정상
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          데이터 수집 {failed}/{total}건 실패
        </span>
      )}
      {lowConf > 0 && (
        <>
          <span className="hidden text-[var(--border)] sm:inline">|</span>
          <Link
            href="/admin/collection"
            className="inline-flex items-center gap-1.5 text-amber-700 hover:underline"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            낮은 신뢰도 {lowConf}건
          </Link>
        </>
      )}
    </div>
  );
}

// ---- InsightCard ----

function InsightCard({
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
  title,
  metric,
  metricLabel,
  description,
  href,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  title: string;
  metric: string;
  metricLabel: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className="card p-5 transition-all hover:shadow-md"
        style={{ borderLeftWidth: "3px", borderLeftColor: borderColor }}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
              {title}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {metric}
              </span>
              <span className="text-[12px] text-[var(--muted-foreground)]">
                {metricLabel}
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[12px] text-[var(--muted-foreground)]">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1 text-[12px] font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
          자세히 보기 <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}

// ---- RecommendedActions ----

function RecommendedActions({ hasChannels }: { hasChannels: boolean }) {
  // Both states show empty placeholder — real actions come from tRPC in Phase 9
  return (
    <div className="card p-6 text-center">
      <Zap className="mx-auto mb-2 h-7 w-7 text-[var(--muted-foreground)]" />
      <p className="text-[13px] text-[var(--muted-foreground)]">
        {hasChannels
          ? "분석이 완료되면 추천 액션이 여기에 표시됩니다"
          : "채널을 등록하면 추천 액션이 표시됩니다"}
      </p>
      {/* Action structure preview */}
      <div className="mx-auto mt-4 max-w-md space-y-1.5">
        {["콘텐츠 제작", "리스크 대응", "SEO 최적화"].map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded border border-dashed border-[var(--border)] px-3 py-2 opacity-50"
          >
            <span
              className={`badge text-[10px] ${i === 0 ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}
            >
              {i === 0 ? "높음" : "보통"}
            </span>
            <span className="text-[12px] text-[var(--muted-foreground)]">
              {label}
            </span>
          </div>
        ))}
      </div>
      <Link
        href="/insights"
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:text-blue-700"
      >
        인사이트 확인하기 <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ---- GeoAeoCard ----

function GeoAeoCard({ hasChannels }: { hasChannels: boolean }) {
  return (
    <Link href="/geo-aeo" className="group block h-full">
      <ChartCard title="AI 검색 최적화" description="GEO/AEO 인용 준비도">
        <div className="flex flex-col items-center justify-center py-6">
          <Globe className="mb-3 h-10 w-10 text-indigo-400" />
          {hasChannels ? (
            <>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                분석 중...
              </p>
              <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                인용 준비도 점수가 곧 표시됩니다
              </p>
            </>
          ) : (
            <p className="text-[13px] text-[var(--muted-foreground)]">
              채널 등록 후 측정이 시작됩니다
            </p>
          )}
          <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
            자세히 보기 <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </ChartCard>
    </Link>
  );
}

// ---- Intelligence Summary Card ----

function IntelligenceSummaryCard() {
  const { projectId } = useCurrentProject();
  const keywordsQuery = trpc.intelligence.keywords.useQuery(
    { projectId: projectId ?? "", filter: "all", limit: 3 },
    { enabled: !!projectId },
  );

  // Source of truth: actual Notification unreadCount (same as Bell badge)
  const unreadCountQuery = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadAlertCount = (unreadCountQuery.data as any)?.count ?? 0;

  const keywords = keywordsQuery.data?.keywords ?? [];
  const hasKeywords = keywords.length > 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Brain className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
              인사이트 허브
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              키워드 분석 인사이트
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/intelligence/compare"
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
          >
            <GitCompareArrows className="h-3 w-3" />
            비교 분석
          </Link>
          <Link
            href="/intelligence"
            className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
          >
            전체 보기
          </Link>
        </div>
      </div>

      {/* Body */}
      {!hasKeywords ? (
        <div className="rounded-lg bg-[var(--secondary)] px-4 py-6 text-center">
          <Brain className="mx-auto mb-2 h-7 w-7 text-[var(--muted-foreground)]" />
          <p className="text-[13px] text-[var(--muted-foreground)]">
            아직 분석한 키워드가 없어요. 여기서 첫 분석을 시작해보세요.
          </p>
          <Link
            href="/intelligence"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-indigo-700"
          >
            분석 시작
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Recent keywords list */}
          <div className="space-y-2">
            {keywords.map((kw: any) => (
              <div
                key={kw.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Signal hint dot */}
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      kw.lastSignalHint?.toLowerCase().includes("warning") ||
                      kw.lastSignalHint?.toLowerCase().includes("risk")
                        ? "bg-amber-400"
                        : kw.lastSignalHint
                              ?.toLowerCase()
                              .includes("opportunity")
                          ? "bg-emerald-400"
                          : "bg-blue-400"
                    }`}
                  />
                  <span className="truncate text-[13px] font-medium text-[var(--foreground)]">
                    {kw.keyword}
                  </span>
                  {kw.industryLabel && (
                    <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                      {kw.industryLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                  <Clock className="h-3 w-3" />
                  {kw.lastAnalyzedAt
                    ? new Date(kw.lastAnalyzedAt).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            ))}
          </div>

          {/* Alert summary + CTA — source: Notification unreadCount */}
          <div className="flex items-center justify-between">
            {unreadAlertCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                읽지 않은 알림 {unreadAlertCount}건
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />새 알림이 없어요
              </span>
            )}
            <Link
              href="/intelligence"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-indigo-700"
            >
              분석 시작
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- DashboardView (main client component) ----

export default function DashboardView({
  hasChannels,
  kpis,
  chartSeries,
  recentContents,
  dataStatus,
}: DashboardViewProps) {
  const t = useTranslations("dashboard");
  const [quickAddOpen, setQuickAddOpen] = useState(!hasChannels);

  // Show up to 4 KPIs
  const topKpis = kpis.slice(0, 4);
  // Show up to 5 recent contents
  const topContents = recentContents.slice(0, 5);
  // Derive channel count from KPIs (use kpis length as proxy, or fallback)
  const channelCount = kpis.length > 0 ? Math.max(kpis.length, 1) : 0;

  return (
    <div className="space-y-5">
      {/* 1. PageHeader */}
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      {/* 2. Data Status Bar */}
      <DataStatusBar
        hasChannels={hasChannels}
        channelCount={channelCount}
        status={dataStatus}
      />

      {/* 3. QuickAddChannel - collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setQuickAddOpen((prev) => !prev)}
          className="mb-2 flex items-center gap-1.5 text-[13px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          {quickAddOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          채널 빠른 등록
        </button>
        {quickAddOpen && <QuickAddChannel />}
      </div>

      {/* Onboarding guide for new users */}
      {!hasChannels && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            시작 가이드
          </h2>
          <OnboardingGuide />
        </div>
      )}

      {/* 4. Search Intelligence Status */}
      {hasChannels && <SearchIntelligenceStatusBar />}

      {/* 4.5 Intelligence 인사이트 */}
      <IntelligenceSummaryCard />

      {/* 5. Listening Intelligence — Core Discovery */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            오늘의 핵심 발견
          </h2>
          <Link
            href="/listening-hub"
            className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
          >
            리스닝 허브에서 자세히 보기
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TrendingIntentCard />
          <ClusterSummaryCard />
          <PersonaSummaryCard />
        </div>
      </div>

      {/* 6. Journey & Listening Overview */}
      <div className="grid gap-3 sm:grid-cols-2">
        <TopJourneyPreviewCard />
        <ListeningSummaryCard />
      </div>

      {/* 7. Recommended Actions from Listening */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
            추천 액션
          </h2>
          {hasChannels && (
            <Link
              href="/insights/actions"
              className="text-[12px] font-medium text-blue-600 hover:text-blue-700"
            >
              전체 보기
            </Link>
          )}
        </div>
        <ListeningActionCard />
      </div>

      {/* Legacy insight cards for social/comments data */}
      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-[var(--foreground)]">
          소셜 & 댓글 분석
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: SmilePlus,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
              borderColor: "#10b981",
              title: "감성 트렌드",
              metricLabel: "부정 댓글 비율",
              href: "/comments",
            },
            {
              icon: HelpCircle,
              iconBg: "bg-amber-50",
              iconColor: "text-amber-600",
              borderColor: "#f59e0b",
              title: "주요 이슈 & FAQ",
              metricLabel: "미답변 FAQ",
              href: "/comments/faq",
            },
            {
              icon: Search,
              iconBg: "bg-violet-50",
              iconColor: "text-violet-600",
              borderColor: "#8b5cf6",
              title: "키워드 기회",
              metricLabel: "블루오션 키워드",
              href: "/intent",
            },
          ].map((card) => (
            <InsightCard
              key={card.title}
              icon={card.icon}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
              borderColor={card.borderColor}
              title={card.title}
              metric={hasChannels ? "—" : "—"}
              metricLabel={card.metricLabel}
              description={
                hasChannels
                  ? "분석이 완료되면 표시됩니다"
                  : "채널 등록 후 분석이 시작됩니다"
              }
              href={card.href}
            />
          ))}
        </div>
      </div>

      {/* 8. KPI Cards (top 4) */}
      {topKpis.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {topKpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* 7 & 8. Channel Performance Chart + GEO/AEO in 2-column grid */}
      {chartSeries.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard
              title="채널 성과 추이"
              description="월별 조회수, 참여율, 팔로워 증감 추이"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" {...CHART_GRID} />
                    <XAxis dataKey="month" tick={TICK_STYLE} />
                    <YAxis tick={TICK_STYLE} tickFormatter={formatNumber} />
                    <Tooltip
                      formatter={(v) => formatNumber(Number(v))}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="#171717"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                      name="조회수"
                    />
                    <Line
                      type="monotone"
                      dataKey="engagement"
                      stroke="#16a34a"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                      name="참여율"
                    />
                    <Line
                      type="monotone"
                      dataKey="followers"
                      stroke="#737373"
                      strokeWidth={1.5}
                      dot={{ r: 2 }}
                      name="팔로워"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          <div className="lg:col-span-1">
            <GeoAeoCard hasChannels={hasChannels} />
          </div>
        </div>
      )}

      {/* If no chart data but has channels, still show GEO/AEO card */}
      {chartSeries.length === 0 && hasChannels && (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <GeoAeoCard hasChannels={hasChannels} />
          </div>
        </div>
      )}

      {/* 9. Recent Top Content (compact, max 5) */}
      {topContents.length > 0 && (
        <ChartCard
          title="최근 인기 콘텐츠"
          description="조회수 기준 인기 콘텐츠"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    썸네일
                  </th>
                  <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    제목
                  </th>
                  <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    플랫폼
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    조회수
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    참여율
                  </th>
                  <th className="pb-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    게시일
                  </th>
                </tr>
              </thead>
              <tbody>
                {topContents.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[var(--border-subtle)] transition-colors last:border-0 hover:bg-[var(--secondary)]"
                  >
                    <td className="py-2">
                      <div className="flex h-7 w-12 items-center justify-center rounded bg-[var(--secondary)]">
                        <PlaySquare className="h-3 w-3 text-[var(--muted-foreground)]" />
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <p className="max-w-xs truncate font-medium">
                        {item.title}
                      </p>
                    </td>
                    <td className="py-2">
                      <span className="badge bg-[var(--secondary)] text-[var(--muted-foreground)]">
                        {item.platform}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatNumber(item.views)}
                    </td>
                    <td className="py-2 text-right text-[var(--muted-foreground)]">
                      {item.engagement}%
                    </td>
                    <td className="py-2 text-[var(--muted-foreground)]">
                      {item.publishedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* 10. Quick Links Footer */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/reports"
          className="card group flex items-center gap-3 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <FileText className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--foreground)]">
              리포트 보기
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              분석 결과를 리포트로 확인
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          href="/competitors"
          className="card group flex items-center gap-3 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--foreground)]">
              경쟁 분석
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              경쟁사와 성과 비교
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
        <Link
          href="/influencers"
          className="card group flex items-center gap-3 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-4.5 w-4.5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[var(--foreground)]">
              인플루언서 탐색
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              협업 가능한 인플루언서 찾기
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
}
