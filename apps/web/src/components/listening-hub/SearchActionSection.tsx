"use client";

import { Zap, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type ActionItem = {
  id?: string;
  title: string;
  description?: string;
  category?: string;
  priority?: "high" | "medium" | "low";
  linkedEngine?: string;
};

type ActionData = {
  actions?: ActionItem[];
};

type SearchActionSectionProps = {
  actionResult: EngineExecutionResult<unknown> | undefined;
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-[var(--secondary)] text-[var(--muted-foreground)]",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export function SearchActionSection({
  actionResult,
}: SearchActionSectionProps) {
  if (!actionResult) {
    return (
      <section id="section-action">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Zap className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 추천 액션이 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = actionResult.data as ActionData | undefined;
  const actions = data?.actions ?? [];

  return (
    <section id="section-action" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          추천 액션
        </h2>
        <Link
          href="/insights/actions"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {!actionResult.success && (
        <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" />
          <p className="text-[12px] text-red-700">
            액션 생성 실패:{" "}
            {typeof actionResult.error === "string"
              ? actionResult.error
              : "알 수 없는 오류"}
          </p>
        </div>
      )}

      {actionResult.success && actions.length === 0 && (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            추천 액션이 없습니다.
          </p>
        </div>
      )}

      {actions.length > 0 && (
        <div className="space-y-2">
          {actions.map((action, i) => {
            const priorityStyle =
              PRIORITY_STYLES[action.priority ?? "low"] ?? PRIORITY_STYLES.low;
            const priorityLabel =
              PRIORITY_LABELS[action.priority ?? "low"] ?? PRIORITY_LABELS.low;

            return (
              <div
                key={action.id ?? i}
                className="card flex items-start gap-3 p-4"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                      {action.title}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyle}`}
                    >
                      {priorityLabel}
                    </span>
                    {action.category && (
                      <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {action.category}
                      </span>
                    )}
                  </div>
                  {action.description && (
                    <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                      {action.description}
                    </p>
                  )}
                  {action.linkedEngine && (
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      근거: {action.linkedEngine}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cross-section CTA */}
      {actions.length > 0 && (
        <Link
          href="/insights/reports/new"
          className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          이 액션을 포함한 리포트 생성하기
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </section>
  );
}
