"use client";

import Link from "next/link";
import { Plus, Calendar, FileText, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";
import { ReportListTable } from "@/components/reports";

export default function ReportsPage() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const reportsQuery = trpc.report.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const reports = reportsQuery.data?.items ?? [];
  const total = reportsQuery.data?.total ?? 0;

  const summary = {
    total,
    ready: reports.filter((r) => r.status === "PUBLISHED").length,
    sent: reports.filter((r) => r.status === "ARCHIVED").length,
  };

  const isLoading = projectLoading || reportsQuery.isLoading;

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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <>
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
                  보관됨
                </span>
              </div>
              <p className="text-[22px] font-semibold text-sky-600">
                {summary.sent}
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <FileText className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
              <p className="text-[14px] font-medium text-[var(--foreground)]">
                아직 리포트가 없습니다
              </p>
              <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                새 리포트를 생성하거나 스케줄을 설정해보세요.
              </p>
              <Link
                href="/insights/reports/new"
                className="mt-4 flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                첫 리포트 생성
              </Link>
            </div>
          ) : (
            <ReportListTable reports={reports as any} />
          )}
        </>
      )}
    </div>
  );
}
