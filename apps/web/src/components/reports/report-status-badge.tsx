"use client";

import type { ReportStatus } from "@/lib/reports";
import { REPORT_STATUS_LABELS } from "@/lib/reports";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const info = REPORT_STATUS_LABELS[status];
  return (
    <span className={`badge text-[10px] ${info.bg} ${info.color}`}>
      {info.label}
    </span>
  );
}
