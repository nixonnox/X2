"use client";

import { Play, Pause, Calendar, Clock } from "lucide-react";
import type { CollectionSchedule } from "@/lib/collection";
import {
  COLLECTION_TYPE_LABELS,
  FREQUENCY_LABELS,
  PLATFORMS,
} from "@/lib/collection";

type Props = {
  schedules: CollectionSchedule[];
  onToggle?: (id: string, enabled: boolean) => void;
  onRunNow?: (schedule: CollectionSchedule) => void;
};

function formatNextRun(iso: string | null): string {
  if (!iso) return "예약 없음";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "곧 실행";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 후`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 후`;
  return `${Math.floor(hours / 24)}일 후`;
}

function formatLastRun(iso: string | null): string {
  if (!iso) return "실행 기록 없음";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export function CollectionScheduleList({
  schedules,
  onToggle,
  onRunNow,
}: Props) {
  if (schedules.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Calendar className="mx-auto mb-3 h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
        <p className="text-[13px] text-[var(--muted-foreground)]">
          등록된 수집 스케줄이 없습니다.
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          채널이나 키워드를 등록하면 자동으로 수집 스케줄이 생성됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
          수집 스케줄
        </h3>
        <span className="text-[12px] text-[var(--muted-foreground)]">
          {schedules.filter((s) => s.enabled).length}/{schedules.length} 활성
        </span>
      </div>

      <div className="space-y-2">
        {schedules.map((schedule) => {
          const typeInfo = COLLECTION_TYPE_LABELS[schedule.type];
          const platform = PLATFORMS[schedule.platform];

          return (
            <div
              key={schedule.id}
              className={`card flex items-center gap-4 p-3.5 transition-opacity ${
                !schedule.enabled ? "opacity-50" : ""
              }`}
            >
              {/* Toggle */}
              <button
                onClick={() => onToggle?.(schedule.id, !schedule.enabled)}
                className="flex-shrink-0"
                title={schedule.enabled ? "비활성화" : "활성화"}
              >
                {schedule.enabled ? (
                  <Play className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Pause className="h-4 w-4 text-gray-400" />
                )}
              </button>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[13px] font-medium text-[var(--foreground)]">
                    {schedule.name}
                  </h4>
                  <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                    {typeInfo.label}
                  </span>
                  <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                    {platform?.name}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {FREQUENCY_LABELS[schedule.frequency]}
                  </span>
                  <span>마지막: {formatLastRun(schedule.lastCollectedAt)}</span>
                  <span>다음: {formatNextRun(schedule.nextScheduledAt)}</span>
                </div>
              </div>

              {/* Run now */}
              {schedule.enabled && onRunNow && (
                <button
                  onClick={() => onRunNow(schedule)}
                  className="flex-shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
                >
                  지금 실행
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
