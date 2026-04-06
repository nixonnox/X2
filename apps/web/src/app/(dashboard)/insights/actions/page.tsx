"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Circle, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";

const PRIO_STYLE: Record<string, { label: string; cls: string }> = {
  HIGH: { label: "높음", cls: "bg-orange-50 text-orange-600" },
  MEDIUM: { label: "보통", cls: "bg-blue-50 text-blue-600" },
  LOW: { label: "낮음", cls: "bg-gray-50 text-gray-600" },
};

export default function InsightActionsPage() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.insight.listActions.useQuery(
    { projectId: projectId!, pageSize: 50 },
    { enabled: !!projectId },
  );

  const updateMutation = trpc.insight.updateAction.useMutation({
    onSuccess: () => utils.insight.listActions.invalidate(),
  });

  const toggleComplete = (id: string, currentStatus: string) => {
    updateMutation.mutate({
      id,
      status: currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED",
    });
  };

  const actions = data?.items ?? [];
  const loading = projectLoading || isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          추천 액션
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          AI가 분석한 데이터를 기반으로 실행 가능한 액션 아이템을 제안합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : actions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Zap className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            아직 추천 액션이 없어요
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            AI 분석이 완료되면 실행 가능한 액션이 자동으로 생성됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((a: any) => {
            const completed = a.status === "COMPLETED";
            const prio =
              PRIO_STYLE[a.priority ?? "MEDIUM"] ?? PRIO_STYLE["MEDIUM"]!;
            return (
              <div
                key={a.id}
                className={`card flex items-start gap-3 p-4 transition-opacity ${completed ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => toggleComplete(a.id, a.status)}
                  disabled={updateMutation.isPending}
                  className="mt-0.5 shrink-0"
                >
                  {completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--muted-foreground)]" />
                  )}
                </button>
                <div className="flex-1">
                  <p
                    className={`text-[13px] font-medium ${completed ? "text-[var(--muted-foreground)] line-through" : "text-[var(--foreground)]"}`}
                  >
                    {a.title}
                  </p>
                  {a.description && (
                    <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                      {a.description}
                    </p>
                  )}
                  {a.report && (
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      출처: {a.report.title}
                    </p>
                  )}
                </div>
                <span className={`badge text-[10px] ${prio.cls}`}>
                  {prio.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
