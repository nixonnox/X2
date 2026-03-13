import { Info } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  guide?: string;
  children?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  guide,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
              {description}
            </p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
      {guide && (
        <div className="flex items-start gap-2 rounded-md bg-blue-50/60 px-3 py-2 text-[12px] text-blue-700">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span className="leading-relaxed">{guide}</span>
        </div>
      )}
    </div>
  );
}
