"use client";

import { PlaySquare } from "lucide-react";
import type { CompetitorContent } from "@/lib/competitors";

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const FORMAT_BADGE: Record<string, string> = {
  video: "bg-blue-50 text-blue-700",
  short_form: "bg-violet-50 text-violet-700",
  image: "bg-amber-50 text-amber-700",
  thread: "bg-emerald-50 text-emerald-700",
  text: "bg-gray-50 text-gray-700",
  live: "bg-red-50 text-red-700",
};

type CompetitorContentTableProps = {
  ourContents: CompetitorContent[];
  competitorContents: CompetitorContent[];
  ourLabel: string;
  competitorLabel: string;
};

function ContentRow({ content }: { content: CompetitorContent }) {
  return (
    <tr className="border-b border-[var(--border-subtle)] transition-colors last:border-0 hover:bg-[var(--secondary)]">
      <td className="px-3 py-2">
        <div className="flex h-7 w-12 items-center justify-center rounded bg-[var(--secondary)]">
          <PlaySquare className="h-3 w-3 text-[var(--muted-foreground)]" />
        </div>
      </td>
      <td className="px-3 py-2">
        <p className="max-w-[200px] truncate text-[13px] font-medium">
          {content.contentTitle}
        </p>
      </td>
      <td className="px-3 py-2">
        <span
          className={`badge text-[11px] ${FORMAT_BADGE[content.contentType] ?? "bg-gray-50 text-gray-700"}`}
        >
          {content.contentType.replace("_", " ")}
        </span>
      </td>
      <td className="px-3 py-2 text-[13px] text-[var(--muted-foreground)]">
        {content.publishDate}
      </td>
      <td className="px-3 py-2 text-right text-[13px] font-medium">
        {fmt(content.views)}
      </td>
      <td className="px-3 py-2 text-right text-[13px] text-[var(--muted-foreground)]">
        {content.engagementRate}%
      </td>
    </tr>
  );
}

export function CompetitorContentTable({
  ourContents,
  competitorContents,
  ourLabel,
  competitorLabel,
}: CompetitorContentTableProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Our contents */}
      <div className="card overflow-hidden">
        <div className="bg-[var(--secondary)] px-4 py-2">
          <p className="text-[12px] font-semibold text-[var(--foreground)]">
            {ourLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]" />
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  제목
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  유형
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  날짜
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  조회수
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  참여율
                </th>
              </tr>
            </thead>
            <tbody>
              {ourContents.map((c) => (
                <ContentRow key={c.id} content={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Competitor contents */}
      <div className="card overflow-hidden">
        <div className="bg-gray-100 px-4 py-2">
          <p className="text-[12px] font-semibold text-[var(--muted-foreground)]">
            {competitorLabel}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]" />
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  제목
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  유형
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  날짜
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  조회수
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  참여율
                </th>
              </tr>
            </thead>
            <tbody>
              {competitorContents.map((c) => (
                <ContentRow key={c.id} content={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
