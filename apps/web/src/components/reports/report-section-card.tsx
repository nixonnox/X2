"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ReportSection } from "@/lib/reports";
import { SECTION_LABELS } from "@/lib/reports";

export function ReportSectionCard({ section }: { section: ReportSection }) {
  const [expanded, setExpanded] = useState(true);
  const meta = SECTION_LABELS[section.type];

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--secondary)]"
      >
        <div>
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            {section.title}
          </h3>
          <p className="text-[11px] text-[var(--muted-foreground)]">
            {meta?.description}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
          <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
            {section.content}
          </p>
          {section.highlights.length > 0 && (
            <ul className="space-y-1.5">
              {section.highlights.map((h, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12px] text-[var(--muted-foreground)]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
