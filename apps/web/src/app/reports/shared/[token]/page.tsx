"use client";

import { use } from "react";
import { MOCK_REPORTS } from "@/lib/reports";
import { ReportKpiGrid, ReportSectionCard } from "@/components/reports";

export default function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const report = MOCK_REPORTS.find(
    (r) => r.shareLink?.token === token && r.shareLink?.enabled,
  );

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="p-10 text-center">
          <h1 className="mb-2 text-[16px] font-semibold text-[var(--foreground)]">
            리포트를 찾을 수 없습니다
          </h1>
          <p className="text-[13px] text-[var(--muted-foreground)]">
            링크가 만료되었거나 비활성화되었을 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-1 text-[11px] text-[var(--muted-foreground)]">
            {report.projectName}
          </p>
          <h1 className="text-[22px] font-bold text-[var(--foreground)]">
            {report.title}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            {report.periodStart} ~ {report.periodEnd}
          </p>
          {report.description && (
            <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
              {report.description}
            </p>
          )}
        </div>

        {/* KPI */}
        <ReportKpiGrid summary={report.kpiSummary} />

        {/* Insights */}
        <div className="card p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
            핵심 인사이트
          </h2>
          <div className="space-y-2">
            {report.insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-3 rounded-md bg-[var(--secondary)] p-3"
              >
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="text-[12px] font-medium text-[var(--foreground)]">
                    {insight.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    {insight.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {report.sections.map((section) => (
            <ReportSectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] pt-6 text-center">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            이 리포트는 X2 Report Engine에 의해 자동 생성되었습니다.
          </p>
          <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
            생성일: {new Date(report.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>
    </div>
  );
}
