"use client";

import { CheckCircle2, XCircle, Plug, Bug, FlaskConical } from "lucide-react";
import type { ConnectorHealthStatus } from "@/lib/collection";
import { PLATFORMS, SOURCE_TYPE_LABELS } from "@/lib/collection";

type Props = {
  statuses: ConnectorHealthStatus[];
};

const SOURCE_ICONS: Record<string, typeof Plug> = {
  api: Plug,
  crawler: Bug,
  mock: FlaskConical,
};

function formatLastChecked(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function ConnectorStatusCards({ statuses }: Props) {
  const healthy = statuses.filter((s) => s.healthy).length;
  const total = statuses.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
          커넥터 상태
        </h3>
        <span className="text-[12px] text-[var(--muted-foreground)]">
          {healthy}/{total} 정상
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statuses.map((status) => {
          const platform = PLATFORMS[status.platform];
          const sourceLabel = SOURCE_TYPE_LABELS[status.sourceType];
          const SourceIcon = SOURCE_ICONS[status.sourceType] || Plug;

          return (
            <div
              key={status.connectorId}
              className={`card border-l-3 p-3 ${
                status.healthy ? "border-l-emerald-500" : "border-l-red-400"
              }`}
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <SourceIcon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                  <span className="text-[12px] font-semibold text-[var(--foreground)]">
                    {platform?.name || status.platform}
                  </span>
                </div>
                {status.healthy ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                    {sourceLabel.label}
                  </span>
                  {status.latencyMs !== null && (
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {status.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug text-[var(--muted-foreground)]">
                  {status.message}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)] opacity-70">
                  확인: {formatLastChecked(status.lastCheckedAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
