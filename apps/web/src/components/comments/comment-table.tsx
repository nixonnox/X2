"use client";

import { PlatformBadge } from "@/components/channels";
import type { EnrichedComment } from "@/lib/comments/types";
import {
  SentimentBadge,
  TopicBadge,
  RiskBadge,
  ResponseStatusBadge,
} from "./badges";

type Props = {
  comments: EnrichedComment[];
  onSelect: (comment: EnrichedComment) => void;
  selectedId?: string;
};

export function CommentTable({ comments, onSelect, selectedId }: Props) {
  if (comments.length === 0) {
    return (
      <div className="card border-dashed p-8 text-center">
        <p className="text-[13px] text-[var(--muted-foreground)]">
          현재 필터에 해당하는 댓글이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                날짜
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                플랫폼
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                작성자
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                댓글
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                감성
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                주제
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                위험도
              </th>
              <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                상태
              </th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => {
              const isHighRisk = c.analysis.riskLevel === "high";
              const isSelected = c.id === selectedId;
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className={`cursor-pointer border-b border-[var(--border-subtle)] transition-colors last:border-0 ${isSelected ? "bg-blue-50" : isHighRisk ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-[var(--secondary)]"}`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                    {formatShortDate(c.postedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <PlatformBadge code={c.platformCode} showLabel={false} />
                  </td>
                  <td className="max-w-[100px] truncate whitespace-nowrap px-3 py-2.5 font-medium">
                    {c.authorName}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="max-w-[300px] truncate text-[var(--muted-foreground)]">
                      {c.commentText}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <SentimentBadge sentiment={c.analysis.sentimentLabel} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <TopicBadge topic={c.analysis.topicLabel} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <RiskBadge risk={c.analysis.riskLevel} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <ResponseStatusBadge status={c.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
        {comments.length}개의 댓글 표시 중
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
