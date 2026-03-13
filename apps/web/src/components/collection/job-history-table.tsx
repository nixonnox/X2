"use client";

import { RefreshCw } from "lucide-react";
import type { CollectionLog } from "@/lib/collection";
import { COLLECTION_TYPE_LABELS, PLATFORMS } from "@/lib/collection";

type Props = {
  logs: CollectionLog[];
  onRetry?: (log: CollectionLog) => void;
};

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  success: { label: "성공", cls: "bg-emerald-50 text-emerald-700" },
  failed: { label: "실패", cls: "bg-red-50 text-red-700" },
  retrying: { label: "재시도", cls: "bg-orange-50 text-orange-700" },
};

export function JobHistoryTable({ logs, onRetry }: Props) {
  if (logs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          아직 수집 작업 기록이 없습니다.
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          수동 실행 버튼을 눌러 첫 수집을 시작해보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                유형
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                플랫폼
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                대상
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                상태
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                건수
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                시작
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                소요
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                재시도
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                액션
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const typeInfo = COLLECTION_TYPE_LABELS[log.type];
              const platformInfo = PLATFORMS[log.platform];
              const statusInfo = STATUS_STYLE[log.status] ?? {
                label: "알수없음",
                cls: "bg-gray-50 text-gray-700",
              };

              return (
                <tr
                  key={log.id}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                >
                  <td className="px-3 py-2.5">
                    <span className="badge bg-[var(--secondary)] text-[11px] text-[var(--muted-foreground)]">
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium">
                    {platformInfo?.name || log.platform}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-[var(--muted-foreground)]">
                    {log.target}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`badge text-[10px] ${statusInfo.cls}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted-foreground)]">
                    {log.itemCount}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatTime(log.startedAt)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatDuration(log.durationMs)}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted-foreground)]">
                    {log.retryCount}
                  </td>
                  <td className="px-3 py-2.5">
                    {log.status === "failed" && onRetry && (
                      <button
                        onClick={() => onRetry(log)}
                        className="flex items-center gap-1 text-[11px] text-blue-600 transition-colors hover:text-blue-800"
                        title="재시도"
                      >
                        <RefreshCw className="h-3 w-3" />
                        재시도
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error details for failed logs */}
      {logs.some((l) => l.status === "failed" && l.userMessage) && (
        <div className="space-y-1.5 border-t border-[var(--border)] bg-red-50/50 px-4 py-3">
          <p className="text-[11px] font-medium text-red-700">최근 실패 안내</p>
          {logs
            .filter((l) => l.status === "failed" && l.userMessage)
            .slice(0, 3)
            .map((l) => (
              <p key={l.id} className="text-[12px] text-red-600">
                [{PLATFORMS[l.platform]?.name}] {l.userMessage}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
