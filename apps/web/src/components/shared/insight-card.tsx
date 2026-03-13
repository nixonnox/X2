import { Sparkles, Clock, Target, Rocket } from "lucide-react";

type InsightCardProps = {
  type: "short-term" | "mid-term" | "long-term";
  title: string;
  period: string;
  content: string;
  confidence: number;
};

const TYPE_CONFIG = {
  "short-term": {
    icon: Rocket,
    bg: "bg-[var(--secondary)]",
    text: "text-[var(--foreground)]",
    border: "border-[var(--border)]",
  },
  "mid-term": {
    icon: Target,
    bg: "bg-[var(--secondary)]",
    text: "text-[var(--foreground)]",
    border: "border-[var(--border)]",
  },
  "long-term": {
    icon: Clock,
    bg: "bg-[var(--secondary)]",
    text: "text-[var(--foreground)]",
    border: "border-[var(--border)]",
  },
};

export function InsightCard({
  type,
  title,
  period,
  content,
  confidence,
}: InsightCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className={`card p-4 ${config.text}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-md ${config.bg}`}
          >
            <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-[13px] font-semibold">{title}</h3>
        </div>
        <div className="flex items-center gap-1 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
          <Sparkles className="h-3 w-3" />
          {confidence}%
        </div>
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
        {period}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
        {content}
      </p>
    </div>
  );
}
