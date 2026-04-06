# P0-4 Handoff — use-current-project hydration mismatch 픽스

**작성**: 2026-04-07, 채팅 Claude → 터미널 Claude
**P0-3 production 검증 중 발견된 P0-2 carry-over 버그**
**예상 시간**: 1-2h
**위험도**: 낮음

---

## 증상

production `/intent` (그리고 dashboard 라우트 전반) 콘솔에서:

```
Error: Minified React error #418
"Hydration failed because the initial UI does not match what was rendered on the server."
```

페이지는 동작 (React가 client-side rerender로 복구) — 다만 첫 렌더 깜빡임/낭비된 리렌더 발생.

---

## 원인

`apps/web/src/hooks/use-current-project.ts` lines 33-40, 62-69:

```ts
// SSR-safe localStorage read for workspace selection (paired with WorkspaceSwitcher)
const storedWorkspaceId = useMemo(() => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return null;
  }
}, []);
```

그리고 lines 62-69의 `storedProjectId`도 동일 패턴.

**문제**: `useMemo`는 첫 렌더에서 즉시 실행됨. 서버에서는 `window === undefined` → `null`을 리턴하지만, 클라이언트 hydration 시점에는 `window`가 존재해서 localStorage 값을 리턴함. 결과적으로 server-rendered HTML과 client first-render의 텍스트가 달라짐 → React error #418.

`WorkspaceSwitcher.tsx`는 이미 `useState + useEffect` 패턴으로 올바르게 처리됨 (lines 36-44). 같은 패턴을 `use-current-project.ts`에도 적용해야 함.

---

## 수정안 (Option A — useState + useEffect, 권장)

`apps/web/src/hooks/use-current-project.ts`:

```diff
 "use client";

-import { useEffect, useMemo } from "react";
+import { useEffect, useMemo, useState } from "react";
 import { useSearchParams } from "next/navigation";
 import { trpc } from "@/lib/trpc";
```

```diff
-  // SSR-safe localStorage read for workspace selection (paired with WorkspaceSwitcher)
-  const storedWorkspaceId = useMemo(() => {
-    if (typeof window === "undefined") return null;
-    try {
-      return window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
-    } catch {
-      return null;
-    }
-  }, []);
+  // SSR-safe: null on server AND on client first render → mount 후 localStorage 값으로 업데이트.
+  // useMemo 대신 useState+useEffect를 써야 hydration mismatch가 안 남.
+  const [storedWorkspaceId, setStoredWorkspaceId] = useState<string | null>(null);
+  useEffect(() => {
+    try {
+      setStoredWorkspaceId(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
+    } catch {
+      // ignore storage errors
+    }
+  }, []);
```

```diff
-  // SSR-safe localStorage read (only on client, only after mount)
-  const storedProjectId = useMemo(() => {
-    if (typeof window === "undefined") return null;
-    try {
-      return window.localStorage.getItem(STORAGE_KEY);
-    } catch {
-      return null;
-    }
-  }, []);
+  // 동일 패턴: null → mount 후 localStorage 값으로 업데이트
+  const [storedProjectId, setStoredProjectId] = useState<string | null>(null);
+  useEffect(() => {
+    try {
+      setStoredProjectId(window.localStorage.getItem(STORAGE_KEY));
+    } catch {
+      // ignore storage errors
+    }
+  }, []);
```

**왜 이게 맞나**:

- 서버 렌더: `useState(null)` → `null`
- 클라이언트 첫 렌더 (hydration): `useState(null)` → `null` (서버와 일치 ✅)
- 마운트 후: `useEffect` 실행 → `setState` 호출 → 두 번째 렌더에 localStorage 값 반영
- React가 hydration mismatch로 panic 안 함

---

## 부작용 검토

- 첫 렌더에서 `storedWorkspaceId` / `storedProjectId`가 `null`이라 `activeWorkspace`, `resolvedProject`가 잠시 첫 워크스페이스/첫 프로젝트로 fallback될 수 있음 → 마운트 후 useEffect 발화 → localStorage 값으로 보정.
- 사용자에게 보이는 깜빡임은 거의 없거나 한 프레임 수준. 현재 발생 중인 hydration 복구보다 훨씬 깔끔.
- `WorkspaceSwitcher.tsx`도 같은 패턴이라 일관성 ↑.

---

## 절차

```bash
# 1. 상태 확인
git status
git checkout -- .  # CRLF/LF 노이즈 있으면

# 2. 파일 수정
# apps/web/src/hooks/use-current-project.ts 위 diff대로 수정

# 3. 빌드 검증
pnpm --filter @x2/web typecheck
pnpm --filter @x2/web build

# 4. 커밋
git add apps/web/src/hooks/use-current-project.ts docs/HANDOFF/P0-4_hydration_localStorage_fix.md
git commit -m "fix(P0-4): use-current-project hydration mismatch 제거

useMemo로 window.localStorage를 읽으면 서버(null) vs 클라이언트(저장값)
첫 렌더가 어긋나서 React error #418 발생.

useState(null) + useEffect 패턴으로 교체:
- 서버/클라이언트 첫 렌더 모두 null → hydration 일치
- 마운트 후 useEffect에서 localStorage 값으로 업데이트
- WorkspaceSwitcher.tsx와 동일 패턴

P0-2 Step 4 carry-over. /intent 콘솔에서 발견.

핸드오프: docs/HANDOFF/P0-4_hydration_localStorage_fix.md
"

# 5. 푸시
git push origin master
```

---

## 검증 (터미널 Claude)

- [ ] `pnpm --filter @x2/web typecheck` 통과
- [ ] `pnpm --filter @x2/web build` 통과
- [ ] git push 후 Vercel 빌드 성공 (actor=github)

## 검증 (채팅 Claude, push 후)

- [ ] `https://x2-nixonnox.vercel.app/intent` 콘솔에 React #418 사라짐
- [ ] `https://x2-nixonnox.vercel.app/listening-hub` 정상 렌더
- [ ] `https://x2-nixonnox.vercel.app/intelligence` 정상 렌더
- [ ] localStorage에 워크스페이스/프로젝트 저장돼 있을 때 새로고침해도 선택 유지되는지

---

## 롤백

```bash
git revert HEAD
git push origin master
```
