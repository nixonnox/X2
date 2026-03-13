"use client";

import { trpc } from "@/lib/trpc";

/**
 * 현재 사용자의 첫 번째 워크스페이스 → 첫 번째 프로젝트를 반환하는 훅.
 * 추후 워크스페이스/프로젝트 선택 UI와 연동 예정.
 */
export function useCurrentProject() {
  const { data: workspaces, isLoading: wsLoading } =
    trpc.workspace.list.useQuery();

  const firstWorkspace = workspaces?.[0];

  const { data: projects, isLoading: projLoading } = trpc.project.list.useQuery(
    { workspaceId: firstWorkspace?.id ?? "" },
    { enabled: !!firstWorkspace?.id },
  );

  const firstProject = projects?.[0];

  return {
    workspace: firstWorkspace ?? null,
    workspaceId: firstWorkspace?.id ?? null,
    project: firstProject ?? null,
    projectId: firstProject?.id ?? null,
    isLoading: wsLoading || projLoading,
    hasData: !!firstProject,
  };
}
