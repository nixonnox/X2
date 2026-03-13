"use client";

import { FileText, Calendar } from "lucide-react";
import type { StrategyReport } from "@/lib/insights";

type ReportCardProps = {
  report: StrategyReport;
};

export function ReportCard({ report }: ReportCardProps) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between bg-[var(--secondary)] px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            {report.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
          <Calendar className="h-3 w-3" />
          <span>{report.period}</span>
        </div>
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {report.sections.map((section, i) => (
          <div key={i} className="px-4 py-3">
            <h4 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {section.title}
            </h4>
            <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
              {section.content}
            </p>
          </div>
        ))}
      </div>
      <div className="bg-[var(--secondary)] px-4 py-2 text-[11px] text-[var(--muted-foreground)]">
        Generated on {report.generatedAt} by AI Strategy Engine
      </div>
    </div>
  );
}
