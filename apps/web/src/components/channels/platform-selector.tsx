"use client";

import {
  Youtube,
  Instagram,
  Music2,
  Twitter,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import type { PlatformCode } from "@/lib/channels/types";
import {
  getPrimaryPlatforms,
  getEnabledPlatforms,
} from "@/lib/channels/platform-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Youtube,
  Instagram,
  Music2,
  Twitter,
  Globe,
  MoreHorizontal,
};

type Props = {
  value: PlatformCode;
  onChange: (code: PlatformCode) => void;
};

export function PlatformSelector({ value, onChange }: Props) {
  const primary = getPrimaryPlatforms();
  const others = getEnabledPlatforms().filter(
    (p) => !["youtube", "instagram", "tiktok", "x"].includes(p.code),
  );

  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-[var(--foreground)]">
        Platform
      </label>

      {/* Primary platforms */}
      <div className="grid grid-cols-2 gap-2">
        {primary.map((p) => {
          const Icon = ICON_MAP[p.iconKey] ?? MoreHorizontal;
          const isSelected = value === p.code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => onChange(p.code)}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                isSelected
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                  : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--secondary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Other platforms */}
      {others.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {others.map((p) => {
            const Icon = ICON_MAP[p.iconKey] ?? MoreHorizontal;
            const isSelected = value === p.code;
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => onChange(p.code)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors ${
                  isSelected
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-white"
                    : "border-[var(--border)] bg-white text-[var(--foreground)] hover:bg-[var(--secondary)]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
