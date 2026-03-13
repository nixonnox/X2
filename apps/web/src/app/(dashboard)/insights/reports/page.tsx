"use client";

import Link from "next/link";
import { Plus, Calendar, FileText } from "lucide-react";
import { MOCK_REPORTS } from "@/lib/reports";
import { ReportListTable } from "@/components/reports";

export default function ReportsPage() {
  const reports = MOCK_REPORTS;
  const summary = {
    total: reports.length,
    ready: reports.filter((r) => r.status === "ready").length,
    sent: reports.filter((r) => r.status === "sent").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
            리포트
          </h1>
          <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
            자동 생성된 리포트를 관리하고 공유하세요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/insights/reports/schedules"
            className="flex items-center gap-1.5 rounded-md bg-[var(--secondary)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary-hover)]"
          >
            <Calendar className="h-3.5 w-3.5" />
            스케줄 관리
          </Link>
          <Link
            href="/insights/reports/new"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            리포트 생성
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="mb-1 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              전체 리포트
            </span>
          </div>
          <p className="text-[22px] font-semibold text-[var(--foreground)]">
            {summary.total}
          </p>
        </div>
        <div className="card p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              완료
            </span>
          </div>
          <p className="text-[22px] font-semibold text-emerald-600">
            {summary.ready}
          </p>
        </div>
        <div className="card p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              발송됨
            </span>
          </div>
          <p className="text-[22px] font-semibold text-sky-600">
            {summary.sent}
          </p>
        </div>
      </div>

      <ReportListTable reports={reports} />
    </div>
  );
}
