# P1-5: @x2/db RawSocialMention 필드 정정 + @x2/api exports map 보강

## 배경

P1-3 (analyzer typecheck) 작업 후 14건 → 7건으로 줄었고, 남은 7건 중 6건은 이 핸드오프에서 처리한다 (1건은 다른 카테고리로 추정, 정찰 시점 미확인).

남은 에러 카테고리:

- **TS2353 × 3** (D 카테고리) — `RawSocialMention.where`에 존재하지 않는 `collectedAt` 필드 사용
- **TS2307 × 3** (C-ish 카테고리) — `@x2/api/services/intelligence/...` 서브패스 import resolution 실패

두 문제는 서로 독립적이지만 한 번에 묶어서 처리한다 (둘 다 analyzer 빌드 게이트에 잡혀 있음).

---

## Part A. analyzer 코드 — `collectedAt` → `createdAt`

### 진단

`packages/db/prisma/schema.prisma` line 686~726의 `RawSocialMention` 모델:

```prisma
model RawSocialMention {
  ...
  publishedAt DateTime
  ...
  createdAt DateTime @default(now())   // ← 이게 "수집 시각"
  // collectedAt 필드는 없음
}
```

`collectedAt`은 같은 schema의 `SocialMentionSnapshot` 모델 (line 899)에만 존재. analyzer 코드가 두 모델을 헷갈려서 잘못된 필드명을 쓰고 있는 것.

### 변경

**파일**: `workers/analyzer/src/index.ts`

3곳 모두 `db.rawSocialMention.{count|findMany}`의 `where` 절 안에 있음:

```diff
@@ line 77-82
   const mentionCount = await db.rawSocialMention.count({
     where: {
       matchedKeyword: keyword,
-      collectedAt: { gte: todayDate() },
+      createdAt: { gte: todayDate() },
     },
   });
```

```diff
@@ line 86-94
     const unanalyzed = await db.rawSocialMention.findMany({
       where: {
         matchedKeyword: keyword,
-        collectedAt: { gte: todayDate() },
+        createdAt: { gte: todayDate() },
         sentiment: null,
       },
       select: { id: true, text: true },
       take: 100,
     });
```

```diff
@@ line 129-136
   const mentions = await db.rawSocialMention.findMany({
     where: {
       matchedKeyword: keyword,
-      collectedAt: { gte: todayDate() },
+      createdAt: { gte: todayDate() },
     },
     select: { sentiment: true },
     take: 500,
   });
```

### 의미 검토 (중요)

`collectedAt` (의도) vs `createdAt` (실제 컬럼):

- `RawSocialMention`은 수집 시점에 INSERT됨 → `createdAt = "수집 시각"`이 맞음.
- 의미적으로 동일. 데이터 손실/오작동 없음.
- `publishedAt` (포스트 발행 시각)과는 다른 필드. 혼동 주의.

### 검증

```bash
pnpm --filter @x2/analyzer typecheck 2>&1 | grep -c "TS2353"
# 기대: 0
```

---

## Part B. @x2/api exports map — 서브패스 패턴 + types 컨디션

### 진단

**파일**: `packages/api/package.json`

현재:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./services/*": "./src/services/*"
  }
}
```

analyzer가 다음 3개 모듈을 동적 import:

- `@x2/api/services/intelligence/intelligence-retention.service` (line 354)
- `@x2/api/services/intelligence/intelligence-backfill.service` (line 398)
- `@x2/api/services/notification/channel-dispatch.service` (line 456)

세 파일 모두 `packages/api/src/services/...` 아래에 **실재**한다. 패턴은 글로브 매칭됨. 그런데 TS가 TS2307을 던지는 이유:

- analyzer tsconfig는 `@x2/tsconfig/library.json` extends → `moduleResolution: bundler`.
- bundler resolution에서 exports 패턴의 target은 **확장자가 명시되거나 types 컨디션이 분리**되어 있어야 TS가 안정적으로 .ts/.d.ts를 찾는다.
- 현재 target `./src/services/*`는 확장자 없음 + types 컨디션 없음 → TS가 패턴 substitute 후 모듈 찾기에 실패.

`apps/web/src/types/server-modules.d.ts`에 `@x2/api/services/engines/category-entry-engine` 한정으로 ambient declare해 둔 워크어라운드가 있다 — 이게 동일 문제의 증거. 이번 fix로 그 ambient 선언도 (잠재적으로) 제거 가능하지만 P1-5 스코프에서는 건드리지 않음 (P1-7 또는 별도).

### 변경

**파일**: `packages/api/package.json`

```diff
   "exports": {
-    ".": "./src/index.ts",
-    "./services/*": "./src/services/*"
+    ".": {
+      "types": "./src/index.ts",
+      "default": "./src/index.ts"
+    },
+    "./services/*": {
+      "types": "./src/services/*.ts",
+      "default": "./src/services/*.ts"
+    }
   },
```

**왜 이 형태인가**:

- `types` 컨디션을 `default` 앞에 둬야 TS resolver가 우선적으로 잡음 (Node.js exports condition order semantic).
- target에 `*.ts` 명시 → 패턴 substitute 결과가 실제 파일 경로와 일치 (예: `intelligence/intelligence-retention.service` → `./src/services/intelligence/intelligence-retention.service.ts`).
- 우리 워크스페이스는 source-first (빌드 산출물 X) 모노레포라 .ts를 직접 가리키는 게 정상.

### 부작용 확인 (필수)

이 변경은 @x2/api를 import하는 모든 패키지에 영향. 점검 대상:

- `apps/web` — `import ... from "@x2/api"` 및 서브패스 사용처
- `workers/analyzer` — 위 3건
- `packages/api` 자체는 내부 상대경로(`../`)만 쓰므로 영향 없음

검증 명령:

```bash
# api 자체
pnpm --filter @x2/api typecheck

# api 소비자 전수
pnpm --filter @x2/analyzer typecheck
pnpm --filter @x2/web typecheck   # ← next.config.ts ignoreBuildErrors:true 상태라 별도 typecheck로 봐야 함

# 혹시 모를 잔여
pnpm -r typecheck 2>&1 | tail -50
```

### 만약 실패하면 (fallback)

`moduleResolution: bundler`가 패턴+types 컨디션을 못 처리하는 엣지 케이스가 있으면, 명시적 엔트리로 폴백:

```json
"exports": {
  ".": { "types": "./src/index.ts", "default": "./src/index.ts" },
  "./services/intelligence/intelligence-retention.service": {
    "types": "./src/services/intelligence/intelligence-retention.service.ts",
    "default": "./src/services/intelligence/intelligence-retention.service.ts"
  },
  "./services/intelligence/intelligence-backfill.service": {
    "types": "./src/services/intelligence/intelligence-backfill.service.ts",
    "default": "./src/services/intelligence/intelligence-backfill.service.ts"
  },
  "./services/notification/channel-dispatch.service": {
    "types": "./src/services/notification/channel-dispatch.service.ts",
    "default": "./src/services/notification/channel-dispatch.service.ts"
  },
  "./services/engines/category-entry-engine": {
    "types": "./src/services/engines/category-entry-engine.ts",
    "default": "./src/services/engines/category-entry-engine.ts"
  }
}
```

먼저 패턴 형태로 시도하고, 안 되면 위 폴백.

---

## 최종 검증

```bash
pnpm --filter @x2/analyzer typecheck
# 기대: TS2353 0건, TS2307 0건. 잔여 1건 (TS7006일 가능성) 있으면 별도로 보고.

pnpm --filter @x2/api typecheck
# 기대: 0 errors

pnpm -r typecheck 2>&1 | grep -E "error TS" | wc -l
# 기대: 이전 대비 6+ 감소
```

---

## 커밋 분할 권장

두 변경을 한 커밋에 묶지 말 것 (origin이 다름):

1. `fix(analyzer): use createdAt instead of nonexistent collectedAt on RawSocialMention`
2. `fix(api): expose ./services/* exports with types condition for bundler resolver`

push 후 Vercel READY 확인 → 보고.

## 보고 포맷

```
P1-5 완료
- commit A: <hash>
- commit B: <hash>
- analyzer typecheck: 7 → N (잔여 카테고리 명시)
- 부작용: web typecheck / 다른 패키지 영향 여부
- Vercel: READY
```
