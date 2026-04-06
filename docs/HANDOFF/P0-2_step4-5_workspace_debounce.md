# P0-2 Step 4-5 핸드오프: WorkspaceSwitcher 드롭다운 + seedKeyword debounce

작성자: 채팅 Claude (read-only 진단)
대상: 터미널 Claude Code (writer)
작성일: 2026-04-07
선행 조건: P0-1 핸드오프(`P0-1_listening_hub_fix.md`) 적용 후 진행 권장. 동일 워크트리에 동시 작업 금지.

## 배경

P0-2 Step 1-3 (`64c5292`)에서 `useCurrentProject` 훅이 URL → localStorage → 첫 워크스페이스 우선순위로 projectId를 안정적으로 결정하도록 수정 완료. **남은 Step 4-5는 (a) 사용자가 직접 워크스페이스를 전환할 수 있는 UI**, **(b) 타이핑마다 history 쿼리가 떨어지는 perf 문제**.

---

## Step 4 — WorkspaceSwitcher 드롭다운 (현재 dead UI)

### 현재 상태

`apps/web/src/components/layout/sidebar.tsx:163-174`:

```tsx
{
  /* Workspace switcher */
}
<div className="mx-3 mb-3">
  <button className="flex w-full items-center gap-2 rounded-md border ...">
    <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-blue-500 text-[9px] font-bold text-white">
      W
    </div>
    <span className="flex-1 truncate text-left font-medium">
      {t("nav.workspace")}
    </span>
    <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />
  </button>
</div>;
```

문제:

- `onClick` 없음 → 클릭해도 아무 일도 안 일어남
- 드롭다운 없음
- `trpc.workspace.list` 쿼리 안 부름 → 실제 워크스페이스 이름조차 표시 안 함 (정적 i18n 라벨 `nav.workspace`만)
- 사용자가 멀티 워크스페이스를 가져도 전환할 방법이 없음 → `useCurrentProject`가 항상 첫 번째 워크스페이스만 사용

### 해결 방안 (3-4h)

**1. 새 컴포넌트 생성**: `apps/web/src/components/layout/WorkspaceSwitcher.tsx`

요구사항:

- `trpc.workspace.list.useQuery()`로 사용자의 모든 워크스페이스 fetch
- 현재 선택된 workspaceId를 `localStorage` 키 `x2_current_workspace`로 영속화 (use-current-project와 paired)
- 클릭 시 드롭다운: 워크스페이스 리스트 + 각 항목 호버/active 스타일 + outside-click으로 닫기
- 워크스페이스 선택 시: `localStorage` 업데이트 → `window.location.reload()` 또는 `router.refresh()` (use-current-project가 새 workspaceId 읽도록)
- 로딩 중: skeleton, 빈 리스트: "워크스페이스 없음" 표시

스켈레톤:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

const WORKSPACE_STORAGE_KEY = "x2_current_workspace";

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
    } catch {}
  }, []);

  // Default to first workspace if nothing selected
  useEffect(() => {
    if (selectedId || !workspaces?.length) return;
    setSelectedId(workspaces[0].id);
  }, [workspaces, selectedId]);

  // Outside click
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
      // Also clear project key so use-current-project picks first project of new workspace
      window.localStorage.removeItem("x2_current_project");
    } catch {}
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
          className={`h-3 w-3 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180" : ""}`}
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
```

**2. `useCurrentProject` 훅과 동기화**: `apps/web/src/hooks/use-current-project.ts`

현재는 `firstWorkspace = workspaces?.[0]`로 하드코딩. 이걸 localStorage 우선으로 바꿔야 함:

```diff
+const WORKSPACE_STORAGE_KEY = "x2_current_workspace";

 export function useCurrentProject() {
   const searchParams = useSearchParams();
   const paramProjectId = searchParams?.get("projectId") ?? null;

   const { data: workspaces, isLoading: wsLoading } =
     trpc.workspace.list.useQuery(undefined, {
       staleTime: 60_000,
       retry: 2,
     });

-  const firstWorkspace = workspaces?.[0];
+  const storedWorkspaceId = useMemo(() => {
+    if (typeof window === "undefined") return null;
+    try { return window.localStorage.getItem(WORKSPACE_STORAGE_KEY); } catch { return null; }
+  }, []);
+
+  const activeWorkspace = useMemo(() => {
+    if (!workspaces?.length) return null;
+    if (storedWorkspaceId) {
+      const match = workspaces.find((w) => w.id === storedWorkspaceId);
+      if (match) return match;
+    }
+    return workspaces[0] ?? null;
+  }, [workspaces, storedWorkspaceId]);
```

이후 `firstWorkspace` 참조를 모두 `activeWorkspace`로 교체. 리턴 객체의 `workspace`/`workspaceId` 필드는 그대로 유지.

**3. sidebar.tsx에 마운트**:

```diff
+import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

-{/* Workspace switcher */}
-<div className="mx-3 mb-3">
-  <button className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[13px] transition-colors hover:bg-[var(--sidebar-hover)]">
-    <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-violet-500 to-blue-500 text-[9px] font-bold text-white">
-      W
-    </div>
-    <span className="flex-1 truncate text-left font-medium">
-      {t("nav.workspace")}
-    </span>
-    <ChevronDown className="h-3 w-3 text-[var(--muted-foreground)]" />
-  </button>
-</div>
+<WorkspaceSwitcher />
```

---

## Step 5 — seedKeyword debounce

### 현재 상태

`apps/web/src/app/(dashboard)/intelligence/page.tsx:141-155`:

```tsx
const activeKeywordForHistory =
  analyzeMutation.data?.seedKeyword || seedKeyword.trim() || undefined;

const historyQuery = trpc.intelligence.history.useQuery(
  {
    projectId: projectId ?? "",
    seedKeyword: activeKeywordForHistory,
    limit: 20,
  },
  { enabled: !!projectId },
);
```

문제: `seedKeyword`는 input의 `onChange`로 매 키스트로크마다 업데이트됨(line 646). 그 값이 `activeKeywordForHistory`에 흘러들어가서 **타이핑할 때마다 `intelligence.history` tRPC 쿼리가 새로 발사됨**. 사용자가 "프로틴 음료"를 치면 7-8번의 history 쿼리가 무의미하게 서버에 떨어짐.

### 해결 방안 (1-2h)

**Option 1 (권장): React 18 `useDeferredValue`** — 외부 라이브러리 추가 없이 가장 간단.

```diff
-import { useState, useRef, useEffect } from "react";
+import { useState, useRef, useEffect, useDeferredValue } from "react";

   const [seedKeyword, setSeedKeyword] = useState("");
+  const deferredSeedKeyword = useDeferredValue(seedKeyword);

   ...

-  const activeKeywordForHistory =
-    analyzeMutation.data?.seedKeyword || seedKeyword.trim() || undefined;
+  const activeKeywordForHistory =
+    analyzeMutation.data?.seedKeyword || deferredSeedKeyword.trim() || undefined;
```

`useDeferredValue`는 React가 idle 시점에 업데이트를 적용하므로 빠른 타이핑 중에는 historyQuery가 다시 안 떨어짐. Ctrl+Enter나 Enter로 분석 실행 시점에는 `analyzeMutation.data?.seedKeyword`가 우선이라 영향 없음.

**Option 2 (대안): 고정 300ms debounce 훅**

```ts
// apps/web/src/hooks/use-debounced-value.ts
import { useEffect, useState } from "react";

export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```

intelligence/page.tsx에서:

```tsx
const debouncedSeedKeyword = useDebouncedValue(seedKeyword, 300);
const activeKeywordForHistory =
  analyzeMutation.data?.seedKeyword || debouncedSeedKeyword.trim() || undefined;
```

**Option 1을 우선 시도**, 만약 `useDeferredValue`가 너무 느리거나 너무 빠르다 싶으면 Option 2의 300ms 고정 debounce로 폴백.

### 동일 패턴 점검 (선택)

다른 페이지에서도 `seedKeyword` state를 input에 직접 묶어서 사용하는 곳이 있는지 확인:

- `apps/web/src/app/(dashboard)/keywords/page.tsx`
- `apps/web/src/app/(dashboard)/cluster-finder/page.tsx`
- `apps/web/src/app/(dashboard)/pathfinder/page.tsx`
- `apps/web/src/app/(dashboard)/intent/page.tsx`

한 번씩 grep 해보고 동일한 "input → state → tRPC query 의존성" 패턴이 있으면 같은 방식으로 픽스. 단, 이번 P0-2 Step 5의 핵심은 intelligence/page.tsx의 historyQuery 하나라서, 시간 부족하면 거기까지만 마무리.

---

## 검증 절차

1. `pnpm --filter web typecheck` → 타입 에러 0
2. `pnpm --filter web build` → 빌드 통과
3. 로컬 dev:
   - 사이드바 워크스페이스 버튼 클릭 → 드롭다운 열림 → 워크스페이스 리스트 표시
   - 다른 워크스페이스 선택 → 페이지 새로고침 → 사이드바·intelligence 페이지 모두 새 워크스페이스로 전환됨
   - 새로고침 후에도 마지막 선택 유지
   - intelligence 페이지에서 키워드 빠르게 타이핑 → Network 탭에서 `intelligence.history` 호출이 매 키스트로크 안 떨어지고, idle 후 1번만 떨어지는지 확인
4. Vercel auto-deploy 확인 (push 후 actor=github 새 배포)

## 커밋 메시지 제안

```
feat(P0-2): WorkspaceSwitcher 드롭다운 + intelligence 히스토리 debounce (Step 4-5)

- WorkspaceSwitcher 컴포넌트 신설: trpc.workspace.list 쿼리 + 드롭다운 UI + localStorage persistence
- useCurrentProject 훅: x2_current_workspace localStorage 키와 동기화 → 사용자 선택한 workspace 우선
- sidebar.tsx: dead button을 WorkspaceSwitcher로 교체
- intelligence/page.tsx: useDeferredValue로 seedKeyword 지연 → history 쿼리 키스트로크 폭격 제거
```

## 위험 요소 (사전 경고)

1. **localStorage 동기화 race**: 두 컴포넌트(WorkspaceSwitcher, useCurrentProject)가 동일 키 읽기/쓰기. `router.refresh()` + `window.location.reload()`로 강제 동기화하지만, 여러 탭 열려 있으면 한 탭에서만 적용됨. 멀티탭 동기화는 P1로 미루기.
2. **첫 마운트 시 selectedId가 null**: 위 스켈레톤은 `useEffect`로 storage 읽고, 그 다음 또 다른 `useEffect`로 첫 워크스페이스 fallback. SSR에서는 selected가 null로 렌더되고 hydration 후 채워짐. "로딩…" 라벨로 깜빡임 흡수.
3. **`router.refresh()`만으론 use-current-project 갱신 안 될 수 있음**: useMemo의 의존성에 storage 값이 직접 들어가 있지 않아서. 그래서 `window.location.reload()`를 같이 호출. 더 우아한 방법은 `storage` 이벤트 리스너 추가지만 시간 절약 위해 reload로 충분.
4. **i18n key `nav.workspace`**: 더 이상 사용 안 함. `messages/ko.json`, `messages/en.json`에서 제거하거나 그대로 두고 무시. 제거 시 다른 곳 참조 grep 필수.
