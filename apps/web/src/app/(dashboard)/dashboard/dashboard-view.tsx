"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Link2,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Tv,
  Search,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { PageHeader } from "@/components/shared";
import { resolveChannelUrl, getPlatformLabel } from "@/lib/channels";
import { trpc } from "@/lib/trpc";

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

type DataStatus = {
  lastSyncAt: string | null;
  failedPipelines: number;
  totalPipelines: number;
  lowConfidenceCount: number;
};

// ---- QuickAddChannel ----

function QuickAddChannel() {
  const [url, setUrl] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setDetected(null);
    setResult(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) return;

    debounceRef.current = setTimeout(() => {
      const r = resolveChannelUrl(value);
      if (r.isValid && r.detectedPlatformCode) {
        setDetected(getPlatformLabel(r.detectedPlatformCode));
      }
    }, 400);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let normalized = url.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/quick-add-channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          type: "success",
          message: `${data.channel?.name ?? "채널"}이 등록되었습니다!`,
        });
        setUrl("");
        setDetected(null);
      } else {
        setResult({
          type: "error",
          message: data.error ?? "채널 등록에 실패했어요.",
        });
      }
    } catch {
      setResult({
        type: "error",
        message: "네트워크 오류가 발생했어요. 인터넷 연결을 확인해 주세요.",
      });
    } finally {
      setLoading(false);
    }
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
          {detected && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!url.trim() || loading}
          className="btn-primary h-9 whitespace-nowrap px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              채널 등록
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      {detected && (
        <p className="mt-2 flex items-center gap-1 text-[12px] text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          <span className="font-medium">{detected}</span> 채널이 감지되었습니다
        </p>
      )}

      {result && (
        <p
          className={`mt-2 text-[12px] ${result.type === "success" ? "text-emerald-600" : "text-red-600"}`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}

// ---- Quick Start Cards (4 hub entry points) ----

const QUICK_START_CARDS = [
  {
    icon: Tv,
    title: "채널 분석하기",
    description: "소셜 채널을 등록하고 성과를 분석하세요",
    href: "/channels/new",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-200",
  },
  {
    icon: Search,
    title: "키워드 분석하기",
    description: "검색 의도와 사용자 여정을 파악하세요",
    href: "/listening-hub",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-200",
  },
  {
    icon: Globe,
    title: "AI 가시성 확인",
    description: "AI 검색에서 브랜드 인용 현황을 확인하세요",
    href: "/geo-aeo",
    color: "bg-violet-50",
    iconColor: "text-violet-600",
    borderColor: "border-violet-200",
  },
  {
    icon: FileText,
    title: "리포트 보기",
    description: "분석 결과를 리포트로 확인하세요",
    href: "/insights/reports",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    borderColor: "border-amber-200",
  },
];

// ---- DashboardView (simplified work-start hub) ----

export default function DashboardView({
  hasChannels,
  kpis,
}: DashboardViewProps) {
  const t = useTranslations("dashboard");
  const [quickAddOpen, setQuickAddOpen] = useState(!hasChannels);

  // Derive channel count from KPIs
  const channelCountKpi = kpis.find((k) => k.label === "등록 채널");
  const channelCount = channelCountKpi ? Number(channelCountKpi.value) : 0;

  // Notification unread count
  const unreadCountQuery = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const unreadAlertCount = (unreadCountQuery.data as any)?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* 1. Welcome Section */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">
          안녕하세요! 무엇을 분석해볼까요?
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted-foreground)]">
          아래에서 원하는 분석을 선택하거나, 채널을 등록해 시작하세요.
        </p>
      </div>

      {/* 2. Quick Start Cards (4 hub entry points) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_START_CARDS.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`card group border ${card.borderColor} p-4 transition-all hover:shadow-md`}
          >
            <div className="mb-3 flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}
              >
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[14px] font-semibold text-[var(--foreground)]">
              {card.title}
            </p>
            <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
              {card.description}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100">
              시작하기 <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* 3. Quick Add Channel (collapsible) */}
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

      {/* 4. Summary Cards (channel count + notifications) */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Channel Summary */}
        <Link
          href="/channels"
          className="card group flex items-center gap-4 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Tv className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[var(--muted-foreground)]">
              등록된 채널
            </p>
            <p className="text-lg font-bold text-[var(--foreground)]">
              {hasChannels ? `${channelCount}개` : "없음"}
            </p>
          </div>
          {!hasChannels && (
            <span className="flex items-center gap-1.5 text-[12px] text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              채널을 등록해 주세요
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        {/* Notification Summary */}
        <Link
          href="/notifications"
          className="card group flex items-center gap-4 p-4 transition-colors hover:bg-[var(--secondary)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-[var(--muted-foreground)]">
              읽지 않은 알림
            </p>
            <p className="text-lg font-bold text-[var(--foreground)]">
              {unreadAlertCount > 0 ? `${unreadAlertCount}건` : "없음"}
            </p>
          </div>
          {unreadAlertCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              {unreadAlertCount}
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>
    </div>
  );
}
