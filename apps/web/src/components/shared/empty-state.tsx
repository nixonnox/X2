import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--secondary)]">
        <Icon className="h-6 w-6 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="mt-4 text-[14px] font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-sm whitespace-pre-line text-[13px] leading-relaxed text-[var(--muted-foreground)]">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
