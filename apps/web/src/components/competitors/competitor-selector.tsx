"use client";

import type { CompetitorChannel } from "@/lib/competitors";
import { COMPETITOR_TYPE_LABELS } from "@/lib/competitors";

type CompetitorSelectorProps = {
  competitors: CompetitorChannel[];
  selectedId: string;
  onChange: (id: string) => void;
};

export function CompetitorSelector({
  competitors,
  selectedId,
  onChange,
}: CompetitorSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {competitors.map((c) => {
        const isActive = c.id === selectedId;
        const typeLabel = COMPETITOR_TYPE_LABELS[c.competitorType];
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
              isActive
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-white shadow-sm"
                : "hover:border-[var(--foreground)]/30 border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
            }`}
          >
            <div>
              <p
                className={`text-[13px] font-medium leading-tight ${isActive ? "text-white" : ""}`}
              >
                {c.channelName}
              </p>
              <p
                className={`text-[11px] ${isActive ? "text-white/70" : "text-[var(--muted-foreground)]"}`}
              >
                {typeLabel?.en ?? c.competitorType}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
