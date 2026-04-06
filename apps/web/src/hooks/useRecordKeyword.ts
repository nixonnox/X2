"use client";

import { useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";

/**
 * 분석한 키워드를 자동으로 히스토리에 기록하는 훅.
 * 모든 분석 페이지에서 사용.
 */
export function useRecordKeyword() {
  const { projectId } = useCurrentProject();
  const mutation = trpc.intelligence.recordKeyword.useMutation();

  const record = useCallback(
    (keyword: string) => {
      if (!keyword.trim() || !projectId) return;
      mutation.mutate({
        projectId,
        keyword: keyword.trim(),
      });
    },
    [mutation, projectId],
  );

  return record;
}
