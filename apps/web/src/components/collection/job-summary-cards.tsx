"use client";

import { CheckCircle2, XCircle, Clock, Activity, Database } from "lucide-react";

type JobSummary = {
  total: number;
  success: number;
  failed: number;
  pending: number;
};

type Props = { summary: JobSummary };

const CARDS = [
  {
    key: "total",
    label: "전체 작업",
    icon: Database,
    color: "text-[var(--foreground)]",
    bg: "bg-[var(--secondary)]",
  },
  {
    key: "success",
    label: "성공",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    key: "failed",
    label: "실패",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    key: "pending",
    label: "대기중",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
] as const;

export function JobSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = summary[card.key];
        return (
          <div key={card.key} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
                  {card.label}
                </p>
                <p className={`mt-1 text-2xl font-bold ${card.color}`}>
                  {value}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.bg}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CollectionActivityIndicator({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-emerald-500" : "bg-gray-300"}`}
      />
      <span className="text-[12px] text-[var(--muted-foreground)]">
        {active ? "수집 활성" : "수집 비활성"}
      </span>
      <Activity
        className={`h-3.5 w-3.5 ${active ? "text-emerald-500" : "text-gray-400"}`}
      />
    </div>
  );
}
