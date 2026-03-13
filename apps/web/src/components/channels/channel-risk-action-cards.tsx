import { AlertTriangle, Zap, ArrowRight } from "lucide-react";
import type { RiskSignal, RecommendedAction } from "@/lib/channels/types";

type Props = {
  risks: RiskSignal[];
  actions: RecommendedAction[];
};

const SEVERITY_STYLES = {
  high: {
    border: "border-red-200",
    bg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-700",
  },
  medium: {
    border: "border-amber-200",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  low: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
};

const PRIORITY_STYLES = {
  high: {
    border: "border-blue-200",
    bg: "bg-blue-50",
    label: "High Priority",
    labelColor: "text-blue-700 bg-blue-100",
  },
  medium: {
    border: "border-[var(--border)]",
    bg: "",
    label: "Medium",
    labelColor: "text-[var(--muted-foreground)] bg-[var(--secondary)]",
  },
  low: {
    border: "border-[var(--border)]",
    bg: "",
    label: "Low",
    labelColor: "text-[var(--muted-foreground)] bg-[var(--secondary)]",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  content: "Content",
  engagement: "Engagement",
  growth: "Growth",
  strategy: "Strategy",
};

export function ChannelRiskActionCards({ risks, actions }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Risk Signals */}
      <div className="space-y-2">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h3 className="text-[14px] font-semibold">Risk Signals</h3>
        </div>
        {risks.map((risk) => {
          const style = SEVERITY_STYLES[risk.severity];
          return (
            <div
              key={risk.id}
              className={`card ${style.border} ${style.bg} p-4`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`}
                  />
                  <div>
                    <p className={`text-[13px] font-semibold ${style.text}`}>
                      {risk.title}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                      {risk.description}
                    </p>
                  </div>
                </div>
                {risk.metric && (
                  <span
                    className={`badge ${style.bg} ${style.text} flex-shrink-0 border text-[10px] ${style.border}`}
                  >
                    {risk.metric}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommended Actions */}
      <div className="space-y-2">
        <div className="mb-1 flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          <h3 className="text-[14px] font-semibold">Recommended Actions</h3>
        </div>
        {actions.map((action) => {
          const style = PRIORITY_STYLES[action.priority];
          return (
            <div
              key={action.id}
              className={`card ${style.border} ${style.bg} p-4`}
            >
              <div className="flex items-start gap-2.5">
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">
                      {action.title}
                    </p>
                    <span className={`badge ${style.labelColor} text-[9px]`}>
                      {style.label}
                    </span>
                    <span className="badge bg-[var(--secondary)] text-[9px] text-[var(--muted-foreground)]">
                      {CATEGORY_LABELS[action.category] ?? action.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
