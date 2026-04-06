"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

const WORKSPACE_STORAGE_KEY = "x2_current_workspace";
const PROJECT_STORAGE_KEY = "x2_current_project";

/**
 * 사이드바 상단의 워크스페이스 전환 드롭다운.
 *
 * 동작:
 * - trpc.workspace.list로 사용자의 모든 워크스페이스 fetch
 * - 선택된 workspaceId를 localStorage("x2_current_workspace")에 영속화
 * - useCurrentProject 훅이 같은 키를 읽어서 현재 워크스페이스를 결정
 * - 워크스페이스 전환 시 x2_current_project를 비워서 새 워크스페이스의
 *   첫 프로젝트가 자동 선택되게 함
 * - 강제 리로드로 모든 컴포넌트 동기화 (멀티탭은 P1)
 */
export function WorkspaceSwitcher() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery(
    undefined,
    {
      staleTime: 60_000,
    },
  );

  // Restore from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (stored) setSelectedId(stored);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Default to first workspace if nothing selected yet
  useEffect(() => {
    if (selectedId || !workspaces?.length) return;
    const first = workspaces[0];
    if (first) setSelectedId(first.id);
  }, [workspaces, selectedId]);

  // Outside click closes dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected =
    workspaces?.find((w) => w.id === selectedId) ?? workspaces?.[0];

  function handleSelect(id: string) {
    if (id === selectedId) {
      setOpen(false);
      return;
    }
    setSelectedId(id);
    try {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
      // Clear project key so use-current-project picks first project of new workspace
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    setOpen(false);
    router.refresh();
    // Hard reload as fallback for components that don't subscribe to storage events
    setTimeout(() => window.location.reload(), 50);
  }

  return (
    <div className="relative mx-3 mb-3" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[13px] transition-colors hover:bg-[var(--sidebar-hover)]"
      >
        <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-blue-500 text-[9px] font-bold text-white">
          {selected?.name?.[0]?.toUpperCase() ?? "W"}
        </div>
        <span className="flex-1 truncate text-left font-medium">
          {isLoading ? "로딩…" : (selected?.name ?? "워크스페이스 없음")}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-[var(--muted-foreground)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && workspaces && workspaces.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--sidebar-bg)] py-1 shadow-lg">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => handleSelect(ws.id)}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] hover:bg-[var(--sidebar-hover)]"
            >
              <span className="flex-1 truncate">{ws.name}</span>
              {ws.id === selectedId && (
                <Check className="h-3.5 w-3.5 text-violet-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
