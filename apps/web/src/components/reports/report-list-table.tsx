"use client";

import Link from "next/link";
import { ExternalLink, Mail, Link2 } from "lucide-react";
import type { Report } from "@/lib/reports";
import { REPORT_TYPE_LABELS } from "@/lib/reports";
import { ReportStatusBadge } from "./report-status-badge";

type Props = { reports: Report[] };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function ReportListTable({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          아직 생성된 리포트가 없습니다.
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          '리포트 생성' 버튼을 눌러 첫 리포트를 만들어 보세요.
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
                리포트명
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                유형
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                기간
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                상태
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                공유
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                생성일
              </th>
              <th className="px-3 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                보기
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const typeInfo = REPORT_TYPE_LABELS[report.type];
              return (
                <tr
                  key={report.id}
                  className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                >
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/insights/reports/${report.id}`}
                      className="font-medium text-[var(--foreground)] hover:underline"
                    >
                      {report.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
                      {typeInfo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatDate(report.periodStart)} ~{" "}
                    {formatDate(report.periodEnd)}
                  </td>
                  <td className="px-3 py-2.5">
                    <ReportStatusBadge status={report.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {report.deliveries.some(
                        (d) => d.type === "email" && d.status === "sent",
                      ) && <Mail className="h-3.5 w-3.5 text-sky-500" />}
                      {report.shareLink?.enabled && (
                        <Link2 className="h-3.5 w-3.5 text-violet-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatDate(report.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/insights/reports/${report.id}`}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-3 w-3" />
                      열기
                    </Link>
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
