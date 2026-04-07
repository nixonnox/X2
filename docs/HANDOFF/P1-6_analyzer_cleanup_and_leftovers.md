# P1-6: analyzer ScheduledJob no-op + P1-5 누락 잔재 정리 + ambient cleanup + @x2/social 검증

## 배경

P1-5 후 analyzer typecheck 7→1. 잔여 1건은 `workers/analyzer/src/index.ts:317`의 `db.scheduledJob.findFirst({ where: { projectId, ... } })` — `ScheduledJob` 모델은 `workspaceId`만 가지고 `projectId` 필드 자체가 없음 (TS2353).

추가로 P1-5 정찰 시 발견한 누락분 2개:

- `apps/web/src/app/api/admin/pipeline-status/route.ts:111`도 `RawSocialMention.where`에 `collectedAt` 사용 (P1-5 같은 패턴, 같은 fix)
- `apps/web/src/types/server-modules.d.ts`의 `@x2/api/services/engines/category-entry-engine` ambient declaration이 잔존 — P1-5에서 exports map에 명시 엔트리 추가됐으니 이제 ambient 불필요

원래 cold-review의 P1-6(`@x2/social` typecheck)도 묶어서 확인.

---

## Part A. analyzer `updateJobStatus` no-op 폐기

### 진단

`packages/db/prisma/schema.prisma`의 `ScheduledJob` 모델 (line 514~535):

```prisma
model ScheduledJob {
  id          String    @id @default(cuid())
  type        JobType
  ...
  workspaceId String
  workspace   Workspace @relation(...)
  // projectId 필드 없음
}
```

다른 호출처(`automationOrchestratorService`, `automationAccessControlService`, `automationExecutionLogService`, `scheduleRegistryService`)는 모두 `findByWorkspace` 패턴 사용. **ScheduledJob은 workspace 단위가 의도된 디자인**.

analyzer의 `updateJobStatus(projectId, ...)`는 의미적으로 잘못된 코드. 그리고 함수 본체가 이미 `try/catch + log("warn", ...)`로 silent fail 설계 = best-effort 의도. 진짜 추적 기능이 살아있는 게 아님.

### 결정: no-op 폐기

이유:

1. silent fail 설계 = 운영 영향 0
2. 가장 적은 코드 변경 = 회귀 위험 최소
3. 워크스페이스 단위로 의미를 살리려면 호출 의도 재디자인 필요(어떤 잡을 갱신할지) — 이건 P1 게이트 스코프 외
4. typecheck 0건 안전하게 달성

### 변경

**파일**: `workers/analyzer/src/index.ts`

`updateJobStatus` 함수 본체를 비움. 호출부(`updateJobStatus(projectId, "MENTION_COLLECT", keyword, "SUCCESS")` 등)는 그대로 유지 — 향후 재구현 시 시그니처 보존.

```diff
 async function updateJobStatus(
   projectId: string,
   jobType: string,
   context: string,
   status: "SUCCESS" | "FAILED",
 ) {
-  try {
-    // Use scheduled_jobs table if a matching job exists
-    const job = await db.scheduledJob.findFirst({
-      where: {
-        projectId,
-        type: jobType as any,
-        status: "ACTIVE",
-      },
-    });
-
-    if (job) {
-      await db.scheduledJob.update({
-        where: { id: job.id },
-        data: {
-          lastRunAt: new Date(),
-          ...(status === "FAILED" ? { status: "FAILED" as any } : {}),
-        },
-      });
-    }
-  } catch (err) {
-    log("warn", `Failed to update job status`, {
-      projectId,
-      jobType,
-      context,
-      error: String(err),
-    });
-  }
+  // No-op. ScheduledJob is workspace-scoped, not project-scoped.
+  // Original implementation tried to query by projectId which doesn't exist
+  // on the model. Function body removed to clear the typecheck error;
+  // the original behavior was best-effort silent-fail anyway (try/catch + warn),
+  // so removing it has zero runtime impact. Signature preserved for callers.
+  // If workspace-scoped tracking is later desired, redesign the call sites
+  // to pass workspaceId and decide which job to update.
+  void projectId;
+  void jobType;
+  void context;
+  void status;
 }
```

`void` 4줄은 unused parameter 경고 회피용.

### 검증

```bash
pnpm --filter @x2/analyzer typecheck 2>&1 | tail -20
# 기대: 0 errors
```

---

## Part B. pipeline-status route — `collectedAt` → `createdAt`

### 진단

P1-5 정찰 단계에서 grep으로 잡지 못한 잔재 1건. `RawSocialMention`엔 `collectedAt` 필드가 없음 (`createdAt`만 존재). P1-5 Part A와 동일 패턴.

현재 `apps/web/.../next.config.ts`가 `typescript.ignoreBuildErrors: true` 상태라 빌드는 통과 중이지만, P1-8에서 false로 복귀할 때 잡힘. 미리 정리.

### 변경

**파일**: `apps/web/src/app/api/admin/pipeline-status/route.ts`

```diff
@@ line 111
-      db.rawSocialMention.count({ where: { collectedAt: { gte: today } } }),
+      db.rawSocialMention.count({ where: { createdAt: { gte: today } } }),
```

### 검증

```bash
pnpm --filter @x2/web typecheck 2>&1 | grep "pipeline-status"
# 기대: pipeline-status 관련 에러 0건
```

---

## Part C. server-modules.d.ts — `category-entry-engine` ambient 제거

### 진단

`apps/web/src/types/server-modules.d.ts` line 50~56:

```ts
declare module "@x2/api/services/engines/category-entry-engine" {
  export class CategoryEntryEngine {
    analyze(seedKeyword: string, keywords?: string[]): unknown;
  }
  export const CATEGORY_LABELS: Record<string, string>;
  export const ENTRY_TYPE_LABELS: Record<string, string>;
}
```

P1-5에서 `packages/api/package.json` exports map에 `./services/engines/category-entry-engine` 명시 엔트리가 추가됨 → 이 ambient declaration 불필요.

같은 파일의 `ioredis`, `bullmq` ambient는 **건드리지 말 것**. 그건 서버 전용 모듈 stub용 별개 목적.

### 변경

**파일**: `apps/web/src/types/server-modules.d.ts`

`declare module "@x2/api/services/engines/category-entry-engine" { ... }` 블록만 삭제. ioredis/bullmq 블록은 그대로 둠.

### 검증 (필수)

ambient 제거 후 실제 사용처(`apps/web/src/app/api/category-entry/route.ts`)가 exports map 기반으로 잘 resolve되는지 확인:

```bash
pnpm --filter @x2/web typecheck 2>&1 | grep -E "category-entry|CategoryEntryEngine" | head
# 기대: 0건
```

만약 TS2307이 다시 뜨면 ambient를 복구하지 말고 보고 — exports map의 명시 엔트리에 문제가 있다는 신호.

---

## Part D. `@x2/social` typecheck 검증 (no fix expected)

원래 cold-review에서 `@x2/social` 패키지가 typecheck 깨진 항목으로 분류돼 있었는데, P1-3 `pnpm overrides` 적용 후 자동 해결됐을 가능성이 큼 (ioredis/bullmq 관련 transitive 충돌이 원인이었다면).

### 검증만 수행

```bash
pnpm --filter @x2/social typecheck 2>&1 | tail -30
```

- **0 errors** → cold-review 항목 닫힘. 보고에 명시.
- **에러 잔존** → 에러 카테고리만 분류해서 보고. 별도 P1-6.5 핸드오프로 처리. 이번 P1-6에서는 fix 시도 X (스코프 외).

---

## 커밋 분할

3개 별도 커밋:

1. `fix(analyzer): no-op updateJobStatus — ScheduledJob is workspace-scoped, not project-scoped`
2. `fix(web): use createdAt instead of collectedAt in pipeline-status route (P1-5 leftover)`
3. `chore(web): remove category-entry-engine ambient now that exports map declares it`

순서대로 커밋, push 후 Vercel READY 확인.

---

## 최종 검증

```bash
pnpm --filter @x2/analyzer typecheck   # 기대: 0
pnpm --filter @x2/api typecheck        # 기대: 1 (pre-existing gdelt-news.adapter.ts)
pnpm --filter @x2/queue typecheck      # 기대: 0
pnpm --filter @x2/social typecheck     # 기대: 0 (또는 잔여 카테고리 보고)
pnpm --filter @x2/web typecheck        # 기대: pre-existing 8건만 잔존(channels/register, queues 시그니처 5건 등)
pnpm --filter @x2/web build            # 기대: 79/79 통과
```

## 보고 포맷

```
P1-6 완료
- commit A (analyzer no-op): <hash>
- commit B (pipeline-status): <hash>
- commit C (ambient cleanup): <hash>
- analyzer typecheck: 1 → 0
- api typecheck: 1 (pre-existing)
- queue typecheck: 0
- social typecheck: <결과>
- web typecheck: <pre-existing 항목 수, 신규 0 확인>
- web build: 79/79
- Vercel: READY
```
