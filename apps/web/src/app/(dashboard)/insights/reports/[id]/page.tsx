"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Download, Printer, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  ReportStatusBadge,
  ReportKpiGrid,
  ReportSectionCard,
  ShareLinkCard,
} from "@/components/reports";

const REPORT_TYPE_LABELS: Record<string, { label: string }> = {
  WEEKLY: { label: "주간" },
  MONTHLY: { label: "월간" },
  QUARTERLY: { label: "분기" },
  CUSTOM: { label: "커스텀" },
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: report, isLoading, error } = trpc.report.get.useQuery(
    { id },
    { retry: false },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-10 text-center">
        <p className="text-[14px] text-[var(--muted-foreground)]">
          {error?.message ?? "리포트를 찾을 수 없습니다."}
        </p>
        <Link
          href="/insights/reports"
          className="mt-2 inline-block text-[13px] text-blue-600 hover:text-blue-800"
        >
          리포트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const typeInfo = REPORT_TYPE_LABELS[report.type] ?? { label: report.type };
  const kpiSummary = (report.content as any)?.kpiSummary ?? null;
  const insights: Array<{ id: string; title: string; description: string; category?: string; impact?: string; source?: string }> =
    (report.content as any)?.insights ?? [];
  const shareLink = report.shareToken
    ? { token: report.shareToken, enabled: true }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/insights/reports"
            className="mt-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
                {report.title}
              </h1>
              <ReportStatusBadge status={report.status} />
            </div>
            <div className="flex items-center gap-3 text-[12px] text-[var(--muted-foreground)]">
              <span className="badge bg-[var(--secondary)] text-[10px]">
                {typeInfo.label}
              </span>
              <span>
                {report.period}
              </span>
              {report.project?.name && <span>{report.project.name}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="이메일 발송 기능 준비 중"
            className="flex cursor-not-allowed items-center gap-1.5 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] opacity-50"
          >
            <Mail className="h-3.5 w-3.5" />
            이메일 발송 (준비 중)
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary-hover)]"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary-hover)]"
          >
            <Printer className="h-3.5 w-3.5" />
            인쇄
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      {kpiSummary && <ReportKpiGrid summary={kpiSummary} />}

      {/* Insights Summary */}
      {insights.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            핵심 인사이트
          </h2>
          <div className="space-y-2">
            {insights.map((insight) => {
              const catColors: Record<string, string> = {
                positive: "bg-emerald-500",
                caution: "bg-amber-500",
                opportunity: "bg-blue-500",
                risk: "bg-red-500",
              };
              return (
                <div
                  key={insight.id}
                  className="flex items-start gap-3 rounded-md bg-[var(--secondary)] p-3"
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${catColors[insight.category ?? ""] ?? "bg-gray-400"}`}
                  />
                  <div>
                    <p className="text-[12px] font-medium text-[var(--foreground)]">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {insight.description}
                    </p>
                    {(insight.impact || insight.source) && (
                      <div className="mt-1 flex items-center gap-2">
                        {insight.impact && (
                          <span className="badge bg-[var(--background)] text-[9px] text-[var(--muted-foreground)]">
                            {insight.impact} impact
                          </span>
                        )}
                        {insight.source && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {insight.source}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Recommendations */}
      {report.actions && report.actions.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            추천 액션
          </h2>
          <div className="space-y-2">
            {report.actions.map((action: any) => {
              const prioColors: Record<string, string> = {
                critical: "text-red-600 bg-red-50",
                high: "text-orange-600 bg-orange-50",
                medium: "text-blue-600 bg-blue-50",
                low: "text-gray-600 bg-gray-50",
              };
              return (
                <div
                  key={action.id}
                  className="flex items-start justify-between rounded-md border border-[var(--border-subtle)] p-3"
                >
                  <div className="flex-1">
                    <p className="text-[12px] font-medium text-[var(--foreground)]">
                      {action.title ?? action.action}
                    </p>
                    {action.description && (
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                        {action.description}
                      </p>
                    )}
                  </div>
                  {action.priority && (
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <span
                        className={`badge text-[9px] ${prioColors[action.priority] ?? ""}`}
                      >
                        {action.priority}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sections */}
      {report.sections && report.sections.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
            상세 섹션
          </h2>
          {report.sections.map((section: any) => (
            <ReportSectionCard key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* Share Link */}
      <ShareLinkCard shareLink={shareLink as any} />

      {/* Email Dialog — 이메일 발송 연동 완료 후 활성화 */}
    </div>
  );
}
