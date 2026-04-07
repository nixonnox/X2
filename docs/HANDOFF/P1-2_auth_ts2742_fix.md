# P1-2 Handoff — @x2/auth TS2742 typecheck 수리

**작성**: 2026-04-07, 채팅 Claude → 터미널 Claude
**예상 시간**: 20-40분 (재현/검증 포함)
**위험도**: 낮음 (런타임 동작 변화 0, 타입 주석만 추가)
**의존**: 없음. P1-4(`ignoreBuildErrors=false`)의 선결 과제.

---

## 컨텍스트

`apps/web/next.config.ts`는 현재 `typescript.ignoreBuildErrors: true`로 묶여 있음. 이 가드 덕분에 production 빌드는 통과하지만, **타입 안전망이 통째로 꺼져 있는 상태**. 우리가 P0-1 ~ P0-5를 시리얼로 고치는 동안 또 다른 타입 회귀가 묻히고 있을 수 있음. 목표는 이 플래그를 `false`로 되돌리는 것(P1-4). 그러려면 먼저 가려져 있던 typecheck 에러들을 한 건씩 처리해야 함.

채팅 Claude의 cold review에서 첫 후보로 잡힌 게 `@x2/auth`의 TS2742. NextAuth v5 beta에서 흔히 발생하는 패턴.

---

## 정찰 (채팅 Claude가 본 것)

### 파일 1: `packages/auth/src/config.ts` 라인 128

```ts
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...(hasOAuth ? { adapter: PrismaAdapter(db) as any } : {}),
  providers,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: { ... },
});
```

### 파일 2: `packages/auth/src/edge.ts` 라인 98

```ts
export const { auth: authEdge } = NextAuth({ ... });
```

### TS2742 발생 원리 (예상)

`NextAuth()`의 반환 타입은 `next-auth`가 내부적으로 `@auth/core/types`의 `AdapterUser`, `Session`, `JWT` 등을 구조적으로 합성해서 돌려줌. `export const { handlers, auth, ... } = ...`로 destructure할 때, TypeScript가 각 바인딩에 대해 **인라인 추론**된 타입을 `.d.ts`에 emit해야 하는데, 그 타입이 직접 `import`되지 않은 모듈을 참조하면 TS2742 발생:

> The inferred type of 'auth' cannot be named without a reference to '../../../node_modules/@auth/core/types'. This is likely not portable. A type annotation is necessary.

추가로 `adapter: PrismaAdapter(db) as any`의 `as any`가 NextAuth 옵션 타입 추론에 잡음을 더해 TS2742가 더 시끄러워질 수 있음.

### 패키지 상태

`packages/auth/package.json`:

```json
"dependencies": {
  "@auth/prisma-adapter": "^2.11.1",
  "@x2/db": "workspace:*",
  "next-auth": "5.0.0-beta.30"
}
```

`@auth/core`는 `next-auth`의 transitive dep으로만 깔려 있음 → 컴파일러가 portable name을 만들지 못함.

---

## 1단계: 에러 재현 및 캡처

작업 시작 전에 정확한 에러를 잡아둬야 fix가 표적을 맞춘다.

```bash
cd packages/auth
pnpm typecheck 2>&1 | tee /tmp/auth-ts2742.log
```

기대 출력 예시:

```
src/config.ts:128:14 - error TS2742: The inferred type of 'handlers' cannot be named without a reference to '....@auth/core/types'. This is likely not portable. A type annotation is necessary.
src/config.ts:128:24 - error TS2742: The inferred type of 'auth' cannot be ...
...
src/edge.ts:98:18 - error TS2742: ...
```

**중요**: 만약 TS2742가 아닌 다른 에러가 먼저 뜨면 멈추고 채팅 Claude에게 로그를 공유해 줘. 가설을 다시 짤게. 그 외에 TS2742 위치/대상 모듈이 다르면 그 차이도 알려줘.

---

## 2단계: 수정안

### 옵션 A — 명시적 타입 주석 (권장, 1차)

`next-auth` v5 beta는 `NextAuthResult` 타입을 export함. 이걸로 destructure 결과를 표시하면 TS가 `.d.ts`를 portable하게 emit할 수 있음.

**`packages/auth/src/config.ts`**:

```diff
-import NextAuth from "next-auth";
+import NextAuth, { type NextAuthResult } from "next-auth";
 import Google from "next-auth/providers/google";
 ...

-export const { handlers, auth, signIn, signOut } = NextAuth({
+const result: NextAuthResult = NextAuth({
   ...(hasOAuth ? { adapter: PrismaAdapter(db) as any } : {}),
   providers,
   trustHost: true,
   session: { strategy: "jwt" },
   pages: { signIn: "/login" },
   callbacks: { ... },
 });
+
+export const handlers = result.handlers;
+export const auth = result.auth;
+export const signIn = result.signIn;
+export const signOut = result.signOut;
```

(destructure 직접 주석은 TS 문법상 못 다니까 중간 변수 경유.)

**`packages/auth/src/edge.ts`**:

```diff
-import NextAuth from "next-auth";
+import NextAuth, { type NextAuthResult } from "next-auth";
 ...

-export const { auth: authEdge } = NextAuth({ ... });
+const edgeResult: NextAuthResult = NextAuth({ ... });
+export const authEdge = edgeResult.auth;
```

### 옵션 B — `NextAuthResult`가 export되지 않거나 다른 이름이면

먼저 확인:

```bash
cd packages/auth
node -e "console.log(Object.keys(require('next-auth')))"
grep -r "NextAuthResult\|NextAuthExtends" node_modules/next-auth/index.d.ts node_modules/next-auth/lib/index.d.ts 2>/dev/null | head
```

대안 후보:

1. `import type { NextAuthConfig, NextAuthResult } from "next-auth"` — 하나라도 잡히면 그걸로
2. `as ReturnType<typeof NextAuth>` — 임시 회피, 첫 fix가 안 통하면 fallback

### 옵션 C — `@auth/core` 직접 의존성 추가

위 옵션이 다 막히면 transitive를 끊어내는 방법:

```bash
pnpm --filter @x2/auth add @auth/core
```

이렇게 하면 `@auth/core/types`가 portable한 모듈 레퍼런스로 잡힘. 단, 버전이 next-auth 내부와 정확히 일치해야 함 (`pnpm why @auth/core` 로 확인).

---

## 3단계: 검증 절차

```bash
# 1. 패키지 단독 typecheck
cd packages/auth
pnpm typecheck
# → 0 errors 기대

# 2. 모노레포 전체 영향 확인 (api, web 등에서 import한 곳 회귀 없는지)
cd ../..
pnpm --filter @x2/api typecheck 2>&1 | tail -20
pnpm --filter @x2/web typecheck 2>&1 | tail -20
# → 새 에러가 늘면 안 됨. 기존 에러 개수보다 줄거나 같아야 함.

# 3. dev/build smoke
pnpm --filter @x2/web build 2>&1 | tail -30
# → 79/79 페이지 빌드 성공
```

**주의**: P1-4 (`ignoreBuildErrors=false` 복원)은 이 핸드오프 범위 밖. 여기서는 건드리지 말 것. 채팅 Claude가 P1-2/P1-3 둘 다 끝난 뒤에 P1-4 핸드오프를 따로 발행함.

---

## 4단계: 커밋

```bash
git add packages/auth/src/config.ts packages/auth/src/edge.ts \
        docs/HANDOFF/P1-2_auth_ts2742_fix.md
# 옵션 C 갔으면 package.json + lockfile도 추가
git commit -m "fix(P1-2): @x2/auth TS2742 — NextAuth 결과에 명시적 타입 주석

next-auth v5 beta의 NextAuth() 반환 객체를 직접 destructure로 export하면
@auth/core/types가 transitive 위치에 있어서 TypeScript가 portable한
선언 파일을 emit하지 못하고 TS2742 에러가 남.

수정:
- config.ts: NextAuthResult 타입의 중간 변수 경유 후 개별 export
- edge.ts: 동일 패턴

런타임 동작 변화 없음. ignoreBuildErrors=true 가드 아래에서
숨어있던 에러 한 건 청소. P1-4(엄격 모드 복원)의 선결 과제.

핸드오프: docs/HANDOFF/P1-2_auth_ts2742_fix.md
"
git push origin master
```

---

## 롤백

```bash
git revert HEAD
git push origin master
```

런타임 영향 0이라 롤백 자체가 불필요할 가능성이 높지만, Vercel 빌드가 깨지면 즉시 revert.

---

## 채팅 Claude가 다음에 할 일

1. push 후 Vercel 배포 READY 확인
2. 회귀 없는지 `/dashboard` 스모크 확인
3. P1-3 (@x2/analyzer ioredis 충돌) 정찰 시작
