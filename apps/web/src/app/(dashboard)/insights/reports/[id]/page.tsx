"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/insights/reports"
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          리포트 상세
        </h1>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)] py-20">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--muted)]">
          <span className="text-2xl">🚧</span>
        </div>
        <h3 className="mt-4 text-[15px] font-semibold text-[var(--foreground)]">
          준비 중이에요
        </h3>
        <p className="mt-2 max-w-sm text-center text-[13px] text-[var(--muted-foreground)]">
          리포트 기능을 준비하고 있어요. 조금만 기다려주세요!
        </p>
        <Link
          href="/insights/reports"
          className="mt-5 text-[13px] text-blue-600 hover:text-blue-800"
        >
          리포트 목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
