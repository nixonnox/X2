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
  BarChart3,
  FileText,
  Zap,
  Filter,
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl">✨</span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-gray-900">
        아직 분석된 인사이트가 없어요
      </h3>
      <p className="mt-2 max-w-sm text-center text-[13px] text-gray-500">
        채널을 등록하고 데이터가 수집되면, AI가 자동으로 핵심 발견과 기회를
        분석해요.
      </p>
      <a
        href="/channels/new"
        className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        분석 시작하기
      </a>
    </div>
  );
}

function ActionsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl">⚡</span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-gray-900">
        추천 액션이 아직 없어요
      </h3>
      <p className="mt-2 max-w-sm text-center text-[13px] text-gray-500">
        분석이 완료되면 실행 가능한 액션을 우선순위별로 추천해드려요.
      </p>
      <a
        href="/channels/new"
        className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        분석 시작하기
      </a>
    </div>
  );
}

function EvidenceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 py-20">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
        <span className="text-2xl">📄</span>
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-gray-900">
        근거 자료가 아직 없어요
      </h3>
      <p className="mt-2 max-w-sm text-center text-[13px] text-gray-500">
        분석이 완료되면 차트, 댓글, FAQ 등 보고서에 활용할 수 있는 근거 자료가
        정리돼요.
      </p>
      <a
        href="/insights/reports/new"
        className="mt-5 inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        리포트 생성하기
      </a>
    </div>
  );
}
