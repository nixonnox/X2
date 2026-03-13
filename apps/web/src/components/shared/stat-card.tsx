import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon?: LucideIcon;
};

export function StatCard({
  label,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatCardProps) {
  const changeColor = {
    positive: "text-[var(--success)]",
    negative: "text-[var(--destructive)]",
    neutral: "text-[var(--muted-foreground)]",
  }[changeType];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </p>
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        )}
      </div>
      <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
        {value}
      </p>
      {change && (
        <p className={`mt-0.5 text-[11px] font-medium ${changeColor}`}>
          {change}
        </p>
      )}
    </div>
  );
}
