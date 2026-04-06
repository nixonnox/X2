"use client";

import { PageHeader } from "@/components/shared";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="리포트"
        description="자동 생성된 리포트를 관리하고 공유하세요."
      />

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
      </div>
    </div>
  );
}
