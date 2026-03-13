type ChartCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChartCard({
  title,
  description,
  children,
  className,
}: ChartCardProps) {
  return (
    <div className={`card p-4 ${className ?? ""}`}>
      <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}
