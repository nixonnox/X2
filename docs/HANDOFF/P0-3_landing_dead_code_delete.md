# P0-3 Handoff — landing.tsx dead code 삭제

**작성**: 2026-04-07, 채팅 Claude → 터미널 Claude
**P0-1, P0-2 production 검증 완료 후 후속 작업**
**예상 시간**: 1-2h
**위험도**: 낮음 (완전한 dead code 삭제)

---

## 결정 배경

`apps/web/src/app/landing.tsx` (1719줄)은 **dead code** 확인:

1. **import 0건** — 전체 src에서 `from "...landing"` 또는 `from "./landing"` grep 결과 없음
2. `apps/web/src/app/page.tsx`(실제 production 랜딩)는 자체 Hero/HubCards 컴포넌트만 사용, `landing.tsx`를 임포트하지 않음
3. `app/page.tsx`에 있는 `landing` 단어 1건은 `@/components/landing/scroll-link`로 무관
4. git commit `4f13c29` 메시지에 "draft, never wired up"으로 명시
5. P0-1, P0-2 안정화 끝났으므로 더 이상 미루지 말고 정리

옵션 (A) 새 랜딩 채택은 디자인 검토/의사결정 필요 → 안정화 단계에서는 부적합
옵션 (B) **삭제** 채택 — 코드베이스에서 1719줄 + 의존 라우트 정리

---

## 삭제 대상

### 1. `apps/web/src/app/landing.tsx` (1719줄)

완전 삭제

### 2. `apps/web/src/app/api/demo/` 디렉토리 전체

- `apps/web/src/app/api/demo/analyze/route.ts` (그리고 디렉토리 내 모든 파일)
- 사용처 grep 결과: `landing.tsx:193` 한 곳 뿐 → 함께 삭제

### **삭제 금지**

- `apps/web/src/app/api/intent/` — 살아있음. `app/(dashboard)/intent/page.tsx`에서 사용 중
- `apps/web/src/components/landing/` — `app/page.tsx`에서 `scroll-link` 등 사용

---

## 절차

```bash
# 1. 상태 확인 (worktree 깨끗한지)
git status

# 2. CRLF/LF 노이즈 있으면 먼저 정리
git checkout -- .

# 3. 삭제
git rm apps/web/src/app/landing.tsx
git rm -r apps/web/src/app/api/demo

# 4. 빌드 검증
pnpm --filter @x2/web typecheck
pnpm --filter @x2/web build

# 5. grep 재확인 (혹시 놓친 참조 있는지)
grep -rn "from.*landing\"" apps/web/src
grep -rn "demo/analyze" apps/web/src

# 6. 커밋
git add -A
git commit -m "chore(web): remove dead landing.tsx draft and /api/demo route

- Delete apps/web/src/app/landing.tsx (1719 lines, never imported)
- Delete apps/web/src/app/api/demo/ (only consumer was landing.tsx)
- Production landing remains app/page.tsx (unchanged)
- /api/intent/* preserved (used by /intent page)

P0-3 cleanup. Verified import grep returns 0 matches.
"

# 7. 푸시 → Vercel auto-deploy 확인
git push origin main
```

---

## 검증 체크리스트 (터미널 Claude)

- [ ] `pnpm --filter @x2/web typecheck` 통과
- [ ] `pnpm --filter @x2/web build` 통과
- [ ] grep `from.*landing"` → 0 matches
- [ ] grep `demo/analyze` → 0 matches
- [ ] git push 후 Vercel 빌드 성공 (actor=github)

---

## 검증 체크리스트 (채팅 Claude, push 후)

- [ ] `https://x2-nixonnox.vercel.app/` 정상 렌더 (production 랜딩 깨지지 않음)
- [ ] `https://x2-nixonnox.vercel.app/intent` 정상 동작 (intent API 살아있는지)
- [ ] 콘솔 에러 0
- [ ] Vercel 배포 commit hash + actor=github 확인

---

## 롤백

문제 발생 시:

```bash
git revert HEAD
git push origin main
```

1719줄짜리 단일 커밋이라 revert 깔끔.
