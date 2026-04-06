"use client";

import { Loader2, Hash } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";

export default function MentionAnalysisPage() {
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const { data: keywords, isLoading } = trpc.keyword.list.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const loading = projectLoading || isLoading;
  const kws = keywords ?? [];

  // 통계 계산
  const totalMentions = kws.reduce((s: number, k: any) => {
    const latest = k.metrics?.[0];
    return s + (latest?.mentionCount ?? 0);
  }, 0);

  const avgSentiment =
    kws.length > 0
      ? Math.round(
          kws.reduce((s: number, k: any) => {
            const latest = k.metrics?.[0];
            return s + (latest?.positiveRate ?? 0);
          }, 0) / kws.length,
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          언급 분석
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          등록된 키워드의 소셜 미디어 언급량과 감성을 분석합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : kws.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Hash className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-[14px] font-medium text-[var(--foreground)]">
            등록된 키워드가 없어요
          </p>
          <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
            키워드를 먼저 등록해야 언급량 분석이 시작됩니다.
          </p>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                총 언급량
              </p>
              <p className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">
                {totalMentions > 0 ? totalMentions.toLocaleString() : "-"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                평균 긍정 비율
              </p>
              <p className="mt-1 text-[22px] font-semibold text-emerald-600">
                {avgSentiment > 0 ? `${avgSentiment}%` : "-"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                추적 키워드
              </p>
              <p className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">
                {kws.length}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                활성 키워드
              </p>
            </div>
          </div>

          {/* 키워드 테이블 */}
          <div className="card overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)]">
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                    키워드
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                    언급 수
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                    긍정 비율
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-[var(--muted-foreground)]">
                    검색량
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-[var(--muted-foreground)]">
                    카테고리
                  </th>
                </tr>
              </thead>
              <tbody>
                {kws.map((k: any) => {
                  const latest = k.metrics?.[0];
                  return (
                    <tr
                      key={k.id}
                      className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--secondary)]"
                    >
                      <td className="px-4 py-2.5 font-medium">{k.keyword}</td>
                      <td className="px-4 py-2.5 text-right">
                        {latest?.mentionCount != null
                          ? latest.mentionCount.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {latest?.positiveRate != null
                          ? `${Math.round(latest.positiveRate)}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {latest?.searchVolume != null
                          ? latest.searchVolume.toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                        {k.category ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
