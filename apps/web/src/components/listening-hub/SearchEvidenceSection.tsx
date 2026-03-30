"use client";

import {
  FileCheck,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  Table2,
  Quote,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type EvidenceItem = {
  id?: string;
  label: string;
  type?: "KPI_CARD" | "PIE_CHART" | "BAR_CHART" | "TABLE" | "QUOTE_LIST";
  summary?: string;
  source?: string;
  confidence?: number;
};

type EvidenceData = {
  items?: EvidenceItem[];
};

type SearchEvidenceSectionProps = {
  evidenceResult: EngineExecutionResult<unknown> | undefined;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  KPI_CARD: BarChart3,
  PIE_CHART: PieChart,
  BAR_CHART: BarChart3,
  TABLE: Table2,
  QUOTE_LIST: Quote,
};

export function SearchEvidenceSection({
  evidenceResult,
}: SearchEvidenceSectionProps) {
  if (!evidenceResult) {
    return (
      <section id="section-evidence">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <FileCheck className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 근거 자료가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = evidenceResult.data as EvidenceData | undefined;
  const items = data?.items ?? [];

  return (
    <section id="section-evidence" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          근거 자료
        </h2>
        <Link
          href="/insights/evidence"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!evidenceResult.success && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          <p className="text-[12px] text-red-700">
            근거 자료 수집 실패: {evidenceResult.error ?? "알 수 없는 오류"}
          </p>
        </div>
      )}

      {evidenceResult.success && items.length === 0 && (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            근거 자료가 없습니다.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const Icon = TYPE_ICONS[item.type ?? "TABLE"] ?? Table2;
            return (
              <div key={item.id ?? i} className="card p-3">
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[var(--secondary)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[12px] font-semibold text-[var(--foreground)]">
                      {item.label}
                    </h3>
                    {item.summary && (
                      <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)] line-clamp-2">
                        {item.summary}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      {item.source && (
                        <span className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                          {item.source}
                        </span>
                      )}
                      {item.confidence != null && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          신뢰도 {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to reports */}
      {items.length > 0 && (
        <div className="flex items-center gap-3">
          <Link
            href="/insights/reports/new"
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            이 근거로 리포트 생성하기
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/insights/evidence"
            className="text-[12px] text-[var(--muted-foreground)] hover:underline"
          >
            근거 번들 관리
          </Link>
        </div>
      )}
    </section>
  );
}
