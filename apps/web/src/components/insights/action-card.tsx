"use client";

import { CheckCircle2, Circle } from "lucide-react";
import type { ActionRecommendation } from "@/lib/insights";
import { PRIORITY_LABELS } from "@/lib/insights";

type ActionCardProps = {
  action: ActionRecommendation;
  onToggle?: (id: string) => void;
};

export function ActionCard({ action, onToggle }: ActionCardProps) {
  const pri = PRIORITY_LABELS[action.priority];

  return (
    <div
      className={`card flex items-start gap-3 p-3.5 transition-colors ${
        action.completed ? "opacity-60" : ""
      }`}
    >
      <button
        onClick={() => onToggle?.(action.id)}
        className="mt-0.5 flex-shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        {action.completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4
            className={`text-[13px] font-medium text-[var(--foreground)] ${action.completed ? "line-through" : ""}`}
          >
            {action.action}
          </h4>
          <span className={`badge text-[10px] ${pri.bg} ${pri.color}`}>
            {pri.label}
          </span>
        </div>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          {action.description}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
          <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
            {action.category}
          </span>
          <span>{action.dueLabel}</span>
          <span className="font-medium text-emerald-600">
            {action.expectedImpact}
          </span>
        </div>
      </div>
    </div>
  );
}
