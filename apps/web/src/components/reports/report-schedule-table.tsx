"use client";

import { Clock, ToggleLeft, ToggleRight } from "lucide-react";
import type { ReportSchedule } from "@/lib/reports";
import {
  SCHEDULE_FREQUENCY_LABELS,
  DAY_OF_WEEK_LABELS,
  REPORT_TYPE_LABELS,
} from "@/lib/reports";

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatScheduleTiming(s: ReportSchedule): string {
  const freq = SCHEDULE_FREQUENCY_LABELS[s.frequency];
  const time = formatTime(s.hour, s.minute);
  if (s.frequency === "weekly" && s.dayOfWeek !== null) {
    return `${freq} ${DAY_OF_WEEK_LABELS[s.dayOfWeek]}요일 ${time}`;
  }
  if (s.frequency === "monthly" && s.dayOfMonth !== null) {
    return `${freq} ${s.dayOfMonth}일 ${time}`;
  }
  return `${freq} ${time}`;
}

type Props = {
  schedules: ReportSchedule[];
  onToggle?: (id: string, enabled: boolean) => void;
};

export function ReportScheduleTable({ schedules, onToggle }: Props) {
  if (schedules.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Clock className="mx-auto mb-2 h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-[13px] text-[var(--muted-foreground)]">
          등록된 스케줄이 없습니다.
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
                스케줄명
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                리포트 유형
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                주기
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                수신자
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                다음 실행
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => {
              const typeInfo = REPORT_TYPE_LABELS[s.reportType];
              return (
                <tr
                  key={s.id}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                >
                  <td className="px-3 py-2.5 font-medium text-[var(--foreground)]">
                    {s.name}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatScheduleTiming(s)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {s.recipients.length > 0
                      ? s.recipients.map((r) => r.name || r.email).join(", ")
                      : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {s.nextRunAt
                      ? new Date(s.nextRunAt).toLocaleString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggle?.(s.id, !s.enabled)}
                      className="flex items-center gap-1 text-[12px]"
                    >
                      {s.enabled ? (
                        <>
                          <ToggleRight className="h-5 w-5 text-emerald-500" />
                          <span className="text-emerald-600">활성</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-500">비활성</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
