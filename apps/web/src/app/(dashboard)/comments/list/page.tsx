"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";

const SENTIMENT_STYLE: Record<string, { label: string; cls: string }> = {
  POSITIVE: { label: "긍정", cls: "bg-emerald-50 text-emerald-600" },
  NEGATIVE: { label: "부정", cls: "bg-red-50 text-red-600" },
  NEUTRAL: { label: "중립", cls: "bg-gray-50 text-gray-600" },
  MIXED: { label: "혼합", cls: "bg-amber-50 text-amber-600" },
};

type SentimentFilter = "all" | "POSITIVE" | "NEGATIVE" | "NEUTRAL";

export default function CommentListPage() {
  const [filter, setFilter] = useState<SentimentFilter>("all");
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const { data, isLoading } = trpc.comment.listByProject.useQuery(
    {
      projectId: projectId!,
      pageSize: 50,
      sentiment:
        filter === "all"
          ? undefined
          : (filter as "POSITIVE" | "NEGATIVE" | "NEUTRAL"),
    },
    { enabled: !!projectId },
  );

  const comments = data?.items ?? [];
  const loading = projectLoading || isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          댓글 목록
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          수집된 댓글을 감성별로 확인하고 관리합니다.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(
          [
            { key: "all", label: "전체" },
            { key: "POSITIVE", label: "긍정" },
            { key: "NEGATIVE", label: "부정" },
            { key: "NEUTRAL", label: "중립" },
          ] as { key: SentimentFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === tab.key
                ? "bg-blue-600 text-white"
                : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:bg-[var(--secondary-hover)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : comments.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            아직 수집된 댓글이 없어요
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            채널을 등록하고 수집을 시작해 보세요.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                  작성자
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                  댓글 내용
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                  플랫폼
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                  감성
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                  날짜
                </th>
              </tr>
            </thead>
            <tbody>
              {comments.map((c: any) => {
                const sentiment = c.analysis?.sentiment ?? "NEUTRAL";
                const style =
                  SENTIMENT_STYLE[sentiment] ?? SENTIMENT_STYLE["NEUTRAL"]!;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      {c.authorName ?? "-"}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-[var(--foreground)]">
                      {c.text}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                      {c.content?.channelId ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge text-[10px] ${style.cls}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-[var(--muted-foreground)]">
                      {c.publishedAt
                        ? new Date(c.publishedAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
