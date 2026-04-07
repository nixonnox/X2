# P1-3 Handoff — @x2/analyzer typecheck 정리

**작성**: 2026-04-07, 채팅 Claude → 터미널 Claude
**예상 시간**: 30-60분 (실제 에러 양에 따라)
**위험도**: 낮음 (런타임 변화 거의 없음. 의존성 추가 + 공유 connection 재사용 + 작은 캐스트 정리)
**의존**: P1-2 완료. P1-8(`ignoreBuildErrors=false`)의 선결 과제 중 하나.

---

## 컨텍스트

`workers/analyzer`는 BullMQ 워커. cold review에서 "ioredis 충돌" 1건으로 분류했으나, 채팅 Claude가 정찰해 보니 잠재 원인이 여러 개 겹쳐 있음. 한 번에 묶어서 처리하는 게 효율적.

---

## 정찰 (채팅 Claude가 본 것)

### 의심 원인 1 — `@types/node` 누락 (가장 강력한 가설)

`workers/analyzer/package.json`:

```json
"devDependencies": {
  "@x2/tsconfig": "workspace:*",
  "tsx": "^4.0.0",
  "typescript": "^5.7.0"
}
```

`@types/node`가 **없음**. 그런데 `src/index.ts`/`scheduler.ts`는 `process.env.REDIS_URL`, `process.on("SIGINT", ...)`, `process.exit(0)`, `console.error`, `Date`, `setInterval` 같은 Node 글로벌을 광범위하게 씀. tsconfig에 `"types": ["node"]`가 있어도 패키지가 없으면 resolve 실패.

**기대 에러**:

```
src/index.ts:23:21 - error TS2580: Cannot find name 'process'. Do you need to install type definitions for node?
src/index.ts:40:5 - error TS2584: Cannot find name 'console'. ...
src/index.ts:517:1 - error TS2580: Cannot find name 'process'. ...
```

이 한 가지로 수십 건이 한꺼번에 터질 것. 가장 먼저 잡아야 함.

### 의심 원인 2 — 중복 ioredis 인스턴스 + bullmq Worker 시그니처

`workers/analyzer/src/index.ts` 라인 25:

```ts
import IORedis from "ioredis";
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
```

그리고 라인 338-450에서 5개 Worker가 모두 `{ connection }`로 이걸 받음.

**문제**: analyzer는 자체 `ioredis: ^5.10.0` 의존성이 있고, `@x2/queue`도 동일 의존성을 따로 갖고 있음. pnpm 설치 결과에 따라 두 패키지가 서로 다른 ioredis 인스턴스/타입을 가질 수 있음. bullmq의 `Worker<T>`는 `connection: ConnectionOptions | IORedis`로 받지만, IORedis 클래스 identity가 다르면 TS는 같다고 인정 안 함.

`packages/queue/src/connection.ts` 라인 19:

```ts
return _connection as unknown as ConnectionOptions;
```

이미 queue 쪽에서 `as unknown as`로 회피해 둔 흔적. 이 cast 자체가 잠재 버그의 신호.

**수정 방향**: analyzer가 자체 IORedis 인스턴스를 만들지 말고 `@x2/queue`의 `getRedisConnection()`을 그대로 재사용. 이렇게 하면:

- ioredis 클래스 identity가 한 곳에서만 제공됨 → 타입 일치
- 5개 Worker가 모두 동일한 connection을 공유 (현재 코드와 동일한 동작)
- analyzer의 `ioredis` 직접 의존성을 제거 가능

### 의심 원인 3 — `(db as any)` 캐스트 + 크로스 패키지 import

라인 367, 390-401: `(db as any).deliveryLog.create(...)`. Prisma 클라이언트가 `deliveryLog` 모델을 인식하지 못한다는 신호. P1-5(@x2/db)에서 따로 처리할 예정이라 이 핸드오프에서는 캐스트를 그대로 두고, 주석으로 "P1-5에서 제거" 메모만 남기면 됨.

라인 290, 315, 365의 dynamic import:

```ts
const { IntelligenceRetentionPolicyService } =
  await import("@x2/api/services/intelligence/intelligence-retention.service");
```

`@x2/api`의 subpath import. 이 경로가 `@x2/api/package.json`의 exports map에 등록돼 있어야 함. typecheck가 깨지면 P1-5/P1-7 묶어서 따로 처리. 우선 이 핸드오프 범위 밖.

### 의심 원인 4 — bullmq `repeat.pattern` 옵션 시그니처

`workers/analyzer/src/scheduler.ts` 라인 69, 88, 113:

```ts
{ repeat: { pattern: "0 */6 * * *" }, jobId: "..." }
```

bullmq 5.x에서 `RepeatOptions`의 cron 필드가 `cron`/`pattern`/`every`로 변경 이력이 있음. 5.71에서는 `pattern`이 정상 (or `every`). 만약 에러가 뜨면 5.71의 d.ts 확인 필요.

---

## 1단계: 에러 재현 및 분류

```bash
cd workers/analyzer
pnpm typecheck 2>&1 | tee /tmp/analyzer-typecheck.log
```

로그를 보고 에러를 다음 4 카테고리로 분류:

1. `Cannot find name 'process'/'console'/...` → 카테고리 A (@types/node 누락)
2. `Type 'IORedis' is not assignable to type 'ConnectionOptions | ...'` 또는 `Argument of type 'Redis' is not assignable...` → 카테고리 B (ioredis 충돌)
3. `Property '...' does not exist on type 'PrismaClient'` 또는 `(db as any)` 관련 → 카테고리 C (Prisma — P1-5로 위임)
4. 기타 (bullmq 옵션, 크로스패키지 import, 시그니처 변경) → 카테고리 D

**카테고리 A가 압도적이면(예상) 우선 그것만 고치고 다시 typecheck 돌려서 잔존 에러 양을 다시 분류.**

---

## 2단계: 수정안

### Step 1 — `@types/node` 추가 (카테고리 A 해소)

```bash
pnpm --filter @x2/analyzer add -D @types/node@^20.0.0
```

루트 `package.json`의 `engines.node: ">=20.0.0"`과 일치하는 메이저 버전 사용. 다른 패키지(`@x2/api`, `@x2/web`, `@x2/db`)에 들어 있는 버전과 맞춰도 좋음 — 가능하면 `pnpm why @types/node`로 확인 후 동일 메이저로.

**검증**:

```bash
cd workers/analyzer
pnpm typecheck 2>&1 | tee /tmp/analyzer-typecheck-step1.log
```

카테고리 A 에러가 사라졌어야 함. 잔존 건수 다시 카운트.

### Step 2 — 공유 connection 사용 (카테고리 B 해소)

**`workers/analyzer/src/index.ts`** 수정:

```diff
 import { Worker, type Job } from "bullmq";
-import IORedis from "ioredis";
 import { db } from "@x2/db";
 import {
+  getRedisConnection,
   QUEUE_NAMES,
   type CollectionJobData,
   ...
 } from "@x2/queue";

-const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
-
-const connection = new IORedis(REDIS_URL, {
-  maxRetriesPerRequest: null,
-  enableReadyCheck: false,
-});
+const connection = getRedisConnection();
```

shutdown 핸들러도 정리:

```diff
 async function shutdown() {
   log("info", "Shutting down workers...");
   await collectionWorker.close();
   ...
   await retentionWorker.close();
-  await connection.quit();
+  // connection.quit()은 @x2/queue가 소유. 워커 close만으로 충분.
   process.exit(0);
 }
```

(또는 `getRedisConnection()`이 IORedis 인스턴스를 반환한다면 `(connection as any).quit?.()` 식으로 안전 호출. 아래 Step 3에서 타입을 정리하면 더 깔끔해짐.)

마지막 startup 로그의 `REDIS_URL` 마스킹은 `@x2/queue`에서 export된 `REDIS_URL` 사용:

```diff
+import { REDIS_URL } from "@x2/queue";
 ...
 log("info", "X2 Analyzer Worker started", {
   queues: [QUEUE_NAMES.INTELLIGENCE_COLLECTION, QUEUE_NAMES.INTELLIGENCE_SNAPSHOT],
   redis: REDIS_URL.replace(/\/\/.*@/, "//***@"),
 });
```

### Step 3 — `@x2/queue` connection 타입 정리 (카테고리 B 해소 보강)

`packages/queue/src/connection.ts` 현재:

```ts
export function getRedisConnection(): ConnectionOptions {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, { ... });
  }
  return _connection as unknown as ConnectionOptions;
}
```

bullmq 5의 `Worker`/`Queue`는 `connection: ConnectionOptions | IORedis | Cluster`를 받음. `as unknown as` 캐스트 대신 IORedis로 정직하게 반환:

```diff
-import type { ConnectionOptions } from "bullmq";
+// bullmq Worker/Queue는 IORedis 인스턴스를 직접 받을 수 있음
 import IORedis from "ioredis";
 ...

-export function getRedisConnection(): ConnectionOptions {
+export function getRedisConnection(): IORedis {
   if (!_connection) {
     _connection = new IORedis(REDIS_URL, {
       maxRetriesPerRequest: null,
       enableReadyCheck: false,
     });
   }
-  return _connection as unknown as ConnectionOptions;
+  return _connection;
 }
```

이러면 `queues.ts`에서 `connection: getRedisConnection()`을 그대로 받아도 타입이 맞음 (`Queue` 옵션의 union에 IORedis가 포함). analyzer에서도 워커 옵션에 동일하게 통과.

만약 typecheck가 `Queue<T>(name, { connection: IORedis })`에서 깨지면 옵션 객체를 약하게 유지하기 위해 `as IORedis`/`satisfies` 등 fallback 사용. (이 경우 패턴은 핸드오프의 옵션 B를 참조.)

### Step 4 — analyzer `ioredis` 직접 의존성 제거

Step 2가 적용되면 `import IORedis from "ioredis"`가 사라지므로 analyzer가 `ioredis`를 직접 import할 이유가 없음.

```bash
pnpm --filter @x2/analyzer remove ioredis
```

`pnpm install`로 lockfile 정리. 대신 `@x2/queue`가 transitive로 ioredis를 갖고 있어야 함 (이미 queue/package.json에 있음).

### Step 5 — `(db as any)` 캐스트는 보존 + 메모

라인 367, 390-401, 270 등의 `as any`는 P1-5(@x2/db Prisma 타입 정리) 범위. 이 핸드오프에서 건드리지 말고 짧은 주석만 추가:

```ts
// TODO(P1-5): @x2/db 타입 정리되면 'as any' 제거
```

### Step 6 — bullmq `repeat.pattern` 시그니처

Step 1-3 적용 후 typecheck를 다시 돌려 카테고리 D 잔존 확인. 만약 `RepeatOptions`에서 `pattern` 필드가 깨지면:

```bash
grep -A 10 "RepeatOptions" workers/analyzer/node_modules/bullmq/dist/esm/types/index.d.ts 2>/dev/null
```

실제 타입 본 다음 5.71에서 사용 중인 키(`pattern` vs `cron` vs `every`)로 맞춤.

---

## 3단계: 검증 절차

```bash
# 1. analyzer 단독 typecheck
cd workers/analyzer
pnpm typecheck
# → 0 errors 기대 (카테고리 C 잔존은 OK, P1-5에서 처리)

# 2. queue 회귀 확인
cd ../../packages/queue
pnpm typecheck
# → 0 errors 기대

# 3. 모노레포 전체에서 회귀 없는지
cd ../..
pnpm --filter @x2/web typecheck 2>&1 | tail -20
# → 새 에러 0건

# 4. 빌드 (Vercel에서 실제로 빌드되는 web만)
pnpm --filter @x2/web build 2>&1 | tail -30
# → 79/79 페이지

# 5. analyzer가 실제로 dev에서 떠야 함 (런타임 회귀 체크)
pnpm --filter @x2/analyzer dev &
# → "X2 Analyzer Worker started" 로그 확인 후 Ctrl+C
```

**주의**: production은 analyzer를 직접 호스팅하지 않음 (Vercel에는 web만 배포). 그래서 analyzer의 typecheck/build는 P1-8(`ignoreBuildErrors=false`)을 안전하게 복원하기 위한 사전 정리 작업. 런타임은 별도 Redis가 떠 있을 때만 검증.

---

## 4단계: 커밋

```bash
git add workers/analyzer/package.json workers/analyzer/src/index.ts \
        packages/queue/src/connection.ts \
        pnpm-lock.yaml \
        docs/HANDOFF/P1-3_analyzer_typecheck_fix.md
git commit -m "fix(P1-3): @x2/analyzer typecheck — @types/node 추가 + 공유 connection 사용

ignoreBuildErrors=true 가드 아래 숨어있던 에러 청소.

수정:
- workers/analyzer: @types/node devDep 추가 (process/console/setInterval
  등 글로벌 타입 누락 대량 해소)
- workers/analyzer/src/index.ts: 자체 IORedis 인스턴스 제거하고
  @x2/queue의 getRedisConnection() 재사용 → 중복 ioredis 클래스 identity
  충돌 해소 + connection 공유로 코드 단순화
- workers/analyzer: ioredis 직접 의존성 제거 (queue 통해 transitive)
- packages/queue/src/connection.ts: 'as unknown as ConnectionOptions'
  캐스트 제거. bullmq Worker/Queue는 IORedis 인스턴스를 직접 받으므로
  반환 타입을 IORedis로 정직하게 변경

런타임 동작 변화 없음. analyzer dev 시 동일한 워커 부팅.

(db as any) 캐스트는 P1-5(@x2/db)에서 별도 처리, TODO 주석만 추가.

핸드오프: docs/HANDOFF/P1-3_analyzer_typecheck_fix.md
"
git push origin master
```

---

## 롤백

```bash
git revert HEAD
git push origin master
```

production은 analyzer를 호스팅하지 않으므로 web 빌드에 영향 없음 → 롤백 트리거가 발생할 가능성 자체가 거의 0.

---

## 채팅 Claude가 다음에 할 일

1. push 후 Vercel READY 확인 (web 빌드 회귀 없음만 보면 됨)
2. P1-4 (@x2/queue bullmq 시그니처 잔존 이슈) 정찰 — Step 6에서 발견된 게 있으면 분리, 없으면 P1-4를 P1-3에 흡수해서 백로그 1건 줄임
3. 그 다음 P1-5 (@x2/db Prisma 타입) 정찰
