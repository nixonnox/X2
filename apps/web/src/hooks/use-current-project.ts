"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY = "x2_current_project";
const WORKSPACE_STORAGE_KEY = "x2_current_workspace";

/**
 * 현재 사용자의 프로젝트를 해석하는 훅.
 *
 * 우선순위:
 *   1. URL 쿼리 파라미터 `?projectId=...`
 *   2. localStorage `x2_current_project`
 *   3. 첫 번째 워크스페이스의 첫 번째 프로젝트(기본값)
 *
 * 선택된 프로젝트는 자동으로 localStorage에 저장돼 새로고침 후에도 유지됩니다.
 *
 * 리턴 shape은 기존 consumer들과의 호환을 위해 유지됩니다.
 */
export function useCurrentProject() {
  const searchParams = useSearchParams();
  const paramProjectId = searchParams?.get("projectId") ?? null;

  const { data: workspaces, isLoading: wsLoading } =
    trpc.workspace.list.useQuery(undefined, {
      staleTime: 60_000,
      retry: 2,
    });

  // SSR-safe localStorage read for workspace selection (paired with WorkspaceSwitcher)
  const storedWorkspaceId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Resolve active workspace: stored selection (if still valid) → first workspace
  const activeWorkspace = useMemo(() => {
    if (!workspaces?.length) return null;
    if (storedWorkspaceId) {
      const match = workspaces.find((w) => w.id === storedWorkspaceId);
      if (match) return match;
    }
    return workspaces[0] ?? null;
  }, [workspaces, storedWorkspaceId]);

  const { data: projects, isLoading: projLoading } = trpc.project.list.useQuery(
    { workspaceId: activeWorkspace?.id ?? "" },
    {
      enabled: !!activeWorkspace?.id,
      staleTime: 60_000,
      retry: 2,
    },
  );

  // SSR-safe localStorage read (only on client, only after mount)
  const storedProjectId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // Resolve selected project with priority: URL → localStorage → first
  const resolvedProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;

    // 1. URL param (highest priority)
    if (paramProjectId) {
      const match = projects.find((p) => p.id === paramProjectId);
      if (match) return match;
    }

    // 2. localStorage
    if (storedProjectId) {
      const match = projects.find((p) => p.id === storedProjectId);
      if (match) return match;
    }

    // 3. First project (fallback)
    return projects[0] ?? null;
  }, [projects, paramProjectId, storedProjectId]);

  // Persist resolved selection to localStorage (side effect)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!resolvedProject?.id) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== resolvedProject.id) {
        window.localStorage.setItem(STORAGE_KEY, resolvedProject.id);
      }
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [resolvedProject?.id]);

  return {
    workspace: activeWorkspace,
    workspaceId: activeWorkspace?.id ?? null,
    project: resolvedProject,
    projectId: resolvedProject?.id ?? null,
    isLoading: wsLoading || (!!activeWorkspace?.id && projLoading),
    hasData: !!resolvedProject,
  };
}
