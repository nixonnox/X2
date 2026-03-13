"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Target,
  ArrowRight,
  Clock,
  Shield,
  HelpCircle,
  BarChart3,
  FileText,
  Zap,
  ChevronRight,
  Filter,
  MessageSquare,
} from "lucide-react";

// Insight categories matching backend InsightCategory type
type InsightCategory =
  | "KEY_FINDING"
  | "OPPORTUNITY"
  | "RISK"
  | "TREND_CHANGE"
  | "PERFORMANCE";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const CATEGORY_CONFIG: Record<
  InsightCategory,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  KEY_FINDING: {
    label: "핵심 발견",
    icon: Sparkles,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  OPPORTUNITY: {
    label: "기회",
    icon: Target,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  RISK: {
    label: "위험",
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  TREND_CHANGE: {
    label: "트렌드 변화",
    icon: TrendingUp,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  PERFORMANCE: {
    label: "성과",
    icon: BarChart3,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
  },
};

const SEVERITY_BADGE: Record<Severity, { label: string; className: string }> = {
  CRITICAL: { label: "긴급", className: "bg-red-100 text-red-700" },
  HIGH: { label: "높음", className: "bg-orange-100 text-orange-700" },
  MEDIUM: { label: "보통", className: "bg-yellow-100 text-yellow-700" },
  LOW: { label: "낮음", className: "bg-gray-100 text-gray-600" },
};

export default function InsightsPage() {
  const t = useTranslations("insights");
  const [activeTab, setActiveTab] = useState<
    "insights" | "actions" | "evidence"
  >("insights");
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | "all">(
    "all",
  );

  const tabs = [
    { key: "insights" as const, label: "핵심 인사이트", icon: Sparkles },
    { key: "actions" as const, label: "추천 액션", icon: Zap },
    { key: "evidence" as const, label: "근거 자료", icon: FileText },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="인사이트 & 액션"
        description="분석 결과에서 도출된 핵심 발견, 실행 가능한 액션, 근거 자료를 확인하세요"
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === tab.key
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
            {(["all", ...Object.keys(CATEGORY_CONFIG)] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat as any)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  categoryFilter === cat
                    ? "bg-[var(--foreground)] text-white"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {cat === "all"
                  ? "전체"
                  : CATEGORY_CONFIG[cat as InsightCategory].label}
              </button>
            ))}
          </div>

          {/* Empty State - shown when no insights data */}
          <div className="space-y-3">
            <InsightEmptyState />
          </div>
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <ActionsEmptyState />
        </div>
      )}

      {/* Evidence Tab */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <EvidenceEmptyState />
        </div>
      )}

      {/* Flow CTA: Insights → Report */}
      <div className="card flex items-center justify-between bg-[var(--secondary)] p-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--foreground)]">
            분석 결과를 리포트로 정리하세요
          </p>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            인사이트와 근거 자료를 역할별 리포트로 구성합니다
          </p>
        </div>
        <Link
          href="/insights/reports/new"
          className="btn-primary inline-flex flex-shrink-0 items-center gap-2 px-4 py-2 text-[13px]"
        >
          리포트 생성 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// --- Empty / Placeholder States ---

function InsightEmptyState() {
  return (
    <div className="card p-8 text-center">
      <Sparkles className="mx-auto mb-3 h-10 w-10 text-amber-400" />
      <h3 className="mb-1 text-[15px] font-semibold text-[var(--foreground)]">
        인사이트가 준비되면 여기에 표시됩니다
      </h3>
      <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--muted-foreground)]">
        채널을 등록하고 데이터가 수집되면, AI가 자동으로 핵심 발견, 기회, 위험
        요소를 분석합니다. 각 인사이트에는 근거 데이터가 함께 제공됩니다.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/start"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13px]"
        >
          분석 시작하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Structure Preview */}
      <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
        {Object.entries(CATEGORY_CONFIG)
          .slice(0, 3)
          .map(([key, config]) => (
            <div
              key={key}
              className="rounded-lg border border-dashed border-[var(--border)] p-4 opacity-60"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgColor} mx-auto mb-2`}
              >
                <config.icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                {config.label}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

function ActionsEmptyState() {
  return (
    <div className="card p-8 text-center">
      <Zap className="mx-auto mb-3 h-10 w-10 text-blue-400" />
      <h3 className="mb-1 text-[15px] font-semibold text-[var(--foreground)]">
        추천 액션이 준비되면 여기에 표시됩니다
      </h3>
      <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--muted-foreground)]">
        분석 결과를 바탕으로 실행 가능한 액션을 자동 생성합니다. 각 액션에는
        우선순위, 담당자 제안, 예상 효과가 포함됩니다.
      </p>

      {/* Action Structure Preview */}
      <div className="mx-auto mt-4 max-w-lg space-y-2">
        {["콘텐츠 제작", "커뮤니티 대응", "SEO 최적화"].map((action, i) => (
          <div
            key={action}
            className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] p-3 opacity-60"
          >
            <div
              className={`badge ${i === 0 ? "bg-red-100 text-red-600" : i === 1 ? "bg-orange-100 text-orange-600" : "bg-yellow-100 text-yellow-600"}`}
            >
              {i === 0 ? "높음" : i === 1 ? "높음" : "보통"}
            </div>
            <span className="text-[13px] text-[var(--muted-foreground)]">
              {action}
            </span>
            <ChevronRight className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EvidenceEmptyState() {
  return (
    <div className="card p-8 text-center">
      <FileText className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
      <h3 className="mb-1 text-[15px] font-semibold text-[var(--foreground)]">
        근거 자료가 준비되면 여기에 표시됩니다
      </h3>
      <p className="mx-auto mb-4 max-w-md text-[13px] text-[var(--muted-foreground)]">
        차트, 원문 댓글, FAQ 예시, 리스크 사례 등을 보고서/PPT에 바로 활용할 수
        있는 형태로 제공합니다. 각 근거 항목의 요약 문장은 슬라이드 설명에
        그대로 사용할 수 있습니다.
      </p>

      {/* Usage actions preview */}
      <div className="mb-6 flex justify-center gap-3">
        <Link
          href="/insights/reports/new"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-[13px]"
        >
          근거 기반 리포트 생성 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mx-auto mt-4 grid max-w-xl gap-3 sm:grid-cols-4">
        {[
          {
            icon: BarChart3,
            label: "차트 데이터",
            hint: "LINE_CHART / PIE_CHART",
          },
          { icon: MessageSquare, label: "대표 댓글", hint: "QUOTE_LIST" },
          { icon: HelpCircle, label: "FAQ 예시", hint: "TABLE" },
          { icon: Shield, label: "리스크 사례", hint: "KPI_CARD" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-dashed border-[var(--border)] p-3 opacity-60"
          >
            <item.icon className="mx-auto mb-1 h-5 w-5 text-[var(--muted-foreground)]" />
            <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
              {item.label}
            </p>
            <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
              {item.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
