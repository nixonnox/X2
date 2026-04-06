"use client";

import { useMemo } from "react";
import { Loader2, FolderOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import { ContentsView } from "./contents-view";

export default function ContentsPage() {
  const { projectId, isLoading: projLoading } = useCurrentProject();

  const { data, isLoading: contentsLoading } =
    trpc.content.listByProject.useQuery(
      { projectId: projectId!, pageSize: 50 },
      { enabled: !!projectId },
    );

  const isLoading = projLoading || contentsLoading;

  const allContents = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map((c: any) => ({
      id: c.id,
      title: c.title,
      platform: c.channel?.platform ?? "",
      platformCode: c.channel?.platform?.toLowerCase() ?? "youtube",
      channelName: c.channel?.name ?? "",
      views: Number(c.viewCount ?? 0),
      engagement: c.engagementRate ?? 0,
      publishedAt: c.publishedAt?.toISOString?.() ?? "",
      commentsCount: c.commentCount ?? 0,
      contentType: c.type?.toLowerCase() ?? "video",
    }));
  }, [data?.items]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!projLoading && !projectId) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <FolderOpen className="h-12 w-12 text-amber-400" />
        <div>
          <p className="text-[15px] font-semibold">
            먼저 프로젝트를 만들어주세요
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            콘텐츠를 보려면 프로젝트와 채널이 필요합니다
          </p>
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-amber-700"
        >
          설정에서 시작하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return <ContentsView contents={allContents} />;
}
