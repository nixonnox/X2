"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { reportScheduleService } from "@/lib/reports";
import { ReportScheduleTable } from "@/components/reports";

export default function ReportSchedulesPage() {
  const schedules = reportScheduleService.getAll();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/insights/reports"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
              스케줄 관리
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
              리포트 자동 생성 스케줄을 관리합니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          스케줄 추가
        </button>
      </div>

      <ReportScheduleTable schedules={schedules} />
    </div>
  );
}
