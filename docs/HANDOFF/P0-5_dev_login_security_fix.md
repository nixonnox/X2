# P0-5 Handoff — dev-login / debug-session 보안 구멍 막기

**작성**: 2026-04-07, 채팅 Claude → 터미널 Claude
**원래 P1로 분류했으나 코드 리뷰 결과 P0로 승격**
**예상 시간**: 30분
**위험도**: 낮음 (방어적 가드 추가 + middleware allowlist에서 제거)

---

## 왜 P0인가 — 심각도

`apps/web/src/app/api/dev-login/route.ts`는 **production에서 그대로 노출**되고 있음:

1. **env 가드 0건**. `NODE_ENV` 체크 없음.
2. `apps/web/src/middleware.ts`의 `PUBLIC_PATHS`(라인 27)에 `/api/dev-login`이 포함돼 있어서 auth 미들웨어를 통째로 우회.
3. 핸들러 동작:
   - `dev@x2.local` 사용자를 DB에서 찾거나 **자동 생성**
   - NextAuth `encode()`로 30일짜리 JWT 발급
   - `__Secure-authjs.session-token` 쿠키 세팅
   - `/dashboard`로 리다이렉트

**현재 production exploit:**

```
누구든지: GET https://x2-nixonnox.vercel.app/api/dev-login
→ 30일 유효 세션 쿠키 획득 → dev@x2.local 사용자로 로그인됨
→ /dashboard, 모든 워크스페이스/프로젝트 접근 가능
```

`/api/debug-session`도 동일 패턴(PUBLIC_PATHS 라인 28). 인증된 사용자의 워크스페이스/프로젝트/멤버십 구조를 통째로 덤프함. 덜 치명적이지만 정찰 정보 유출.

X2가 "제한적 내부 테스트" 단계라 즉각 노출 위험은 작지만, **production URL을 아는 누구든지** 1줄 curl로 인증을 우회할 수 있는 상태는 P0 외에 다른 분류가 불가능함.

---

## 수정안

### 1. `apps/web/src/app/api/dev-login/route.ts`

파일 최상단 `export async function GET(...)` 바로 안쪽에 가드 추가:

```diff
 export async function GET(request: Request) {
+  // SECURITY: production에서는 절대 노출되면 안 됨.
+  // middleware PUBLIC_PATHS에서도 제거하지만, defense-in-depth로 라우트 자체에도 가드.
+  if (process.env.NODE_ENV === "production") {
+    return new NextResponse(null, { status: 404 });
+  }
+
   const email = "dev@x2.local";
   const secret = process.env.AUTH_SECRET;
```

`NextResponse` 임포트가 이미 있으면 그대로, 없으면 추가:

```ts
import { NextResponse } from "next/server";
```

(파일에 이미 `NextResponse.json`을 쓰고 있어 임포트는 있음)

### 2. `apps/web/src/app/api/debug-session/route.ts`

동일 패턴:

```diff
 export async function GET() {
+  if (process.env.NODE_ENV === "production") {
+    return new NextResponse(null, { status: 404 });
+  }
+
   const session = await auth();
```

`NextResponse` 임포트 확인 (없으면 추가).

### 3. `apps/web/src/middleware.ts` — PUBLIC_PATHS에서 두 라우트 제거

```diff
 const PUBLIC_PATHS = [
   "/login",
   "/signup",
   "/onboarding",
   "/forgot-password",
   "/reset-password",
   "/verify-email",
   "/api/auth",
   "/api/health",
   "/api/locale",
   "/api/intent",
   "/api/sync",
-  "/api/dev-login",
-  "/api/debug-session",
   "/reports/shared",
   "/terms",
   "/privacy",
   "/maintenance",
 ];
```

이렇게 하면:

- production: 라우트 가드(404) + middleware가 미인증 요청을 `/login`으로 리다이렉트 → **이중 방어**
- dev (`pnpm dev`): 가드는 통과, 단 미인증 사용자는 middleware가 막음. 로컬에서 로그인된 상태에서만 접근 가능 → 원래 의도와 일치

---

## 절차

```bash
# 1. 상태 확인
git status
git checkout -- .

# 2. 파일 3개 수정 (위 diff)
#    - apps/web/src/app/api/dev-login/route.ts
#    - apps/web/src/app/api/debug-session/route.ts
#    - apps/web/src/middleware.ts

# 3. 빌드 검증
pnpm --filter @x2/web typecheck
pnpm --filter @x2/web build

# 4. 커밋
git add apps/web/src/app/api/dev-login/route.ts \
        apps/web/src/app/api/debug-session/route.ts \
        apps/web/src/middleware.ts \
        docs/HANDOFF/P0-5_dev_login_security_fix.md
git commit -m "fix(P0-5): close dev-login/debug-session production exposure

/api/dev-login은 NODE_ENV 가드 없이 PUBLIC_PATHS에 등록돼 있어
누구든지 production URL로 GET 요청만 보내면 dev@x2.local로
30일짜리 세션 쿠키를 발급받을 수 있는 상태였음. /api/debug-session도
동일하게 PUBLIC_PATHS에 들어 있어 정찰 정보 노출 가능.

수정:
- 두 라우트 모두 NODE_ENV === 'production'이면 404 반환
- middleware PUBLIC_PATHS에서 두 경로 제거 (defense-in-depth)
- dev에서는 여전히 사용 가능

핸드오프: docs/HANDOFF/P0-5_dev_login_security_fix.md
"

# 5. 푸시
git push origin master
```

---

## 검증 (터미널 Claude)

- [ ] `pnpm --filter @x2/web typecheck` 통과
- [ ] `pnpm --filter @x2/web build` 통과
- [ ] git push 후 Vercel 빌드 성공 (actor=github)

## 검증 (채팅 Claude, push 후 — production)

- [ ] `curl -i https://x2-nixonnox.vercel.app/api/dev-login` → **404**, Set-Cookie 없음
- [ ] `curl -i https://x2-nixonnox.vercel.app/api/debug-session` → 404 또는 /login 리다이렉트
- [ ] 로그인된 사용자의 `/dashboard` 정상 동작 (회귀 없음)

---

## 롤백

```bash
git revert HEAD
git push origin master
```

가드만 추가/allowlist 정리라 롤백 영향 최소.
