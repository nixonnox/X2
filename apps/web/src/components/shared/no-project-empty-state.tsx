"use client";

import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { EmptyState } from "./empty-state";

type Props = {
  /** 페이지 맥락에 맞춘 짧은 설명. 비우면 기본 문구 사용. */
  description?: string;
};

/**
 * 프로젝트가 아직 없는 사용자에게 보여주는 전용 빈 상태.
 * useCurrentProject()가 null projectId를 반환할 때 전체 페이지 대체용으로 사용하세요.
 */
export function NoProjectEmptyState({ description }: Props) {
  return (
    <EmptyState
      icon={FolderPlus}
      title="먼저 프로젝트를 만들어 주세요"
      description={
        description ??
        "분석을 시작하려면 설정에서 프로젝트를 하나 이상 만들어야 해요.\n프로젝트는 워크스페이스 단위로 관리됩니다."
      }
      action={
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-90"
        >
          <FolderPlus className="h-4 w-4" />
          프로젝트 만들기
        </Link>
      }
    />
  );
}
