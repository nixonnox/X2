# P1-7: web typecheck 7건 + tiktok latent 2건 = 총 9건 처리

목표: apps/web typecheck 7건 + tiktok latent 2건 = 총 9건 처리. 끝나면 P1-8(next.config.ts ignoreBuildErrors false)로 게이트 복구 가능.

---

## Part A. packages/queue/src/connection.ts — maxRetriesPerRequest: null 타입 충돌

진단: bullmq는 `maxRetriesPerRequest: null`을 강제하지만 ioredis `RedisOptions.maxRetriesPerRequest`는 `number | undefined`. 이게 사용자 보고 "null → number | undefined"의 정체.

수정: `as unknown as RedisOptions` 캐스팅으로 의도된 강제 사용 명시.

---

## Part B. packages/queue/src/queues.ts — 5× Queue<T> 에러

먼저 정확한 에러 메시지부터 캡처:

```bash
pnpm --filter @x2/queue typecheck 2>&1 | tee /tmp/queue-errors.txt
```

가설: bullmq 5.x ConnectionOptions가 더 좁아져서 `IORedis` 인스턴스를 직접 받는 게 broken일 가능성. 또는 `defaultJobOptions.backoff` 형태가 stricter.

에러 메시지 보고 패턴 정해서 처리. **추측 fix 금지**.

---

## Part C. apps/web/src/app/(dashboard)/channels/new/page.tsx — channel.register 부재

진단: page는 `trpc.channel.register.useMutation()`을 부르며 10개 필드를 보냄. 하지만 채널 라우터에는 `register` 없음. 존재 procedures: `list`, `get`, `add`, `delete`. `add`는 `{ projectId, url }`만 받음.

어제 merge에서 page는 들어왔고 라우터는 안 들어온 잔재.

**Option 1 (권장)**: page를 임시 다운그레이드해서 `add`를 호출. 풍부한 폼 필드는 P1-9에서 정식 register procedure 추가 시 복원.

---

## Part D (Bonus, 별도 커밋). packages/social/src/tiktok.ts — latent 2건

P1-6.5에서 @types/node 추가하면서 `await res.json()`이 `unknown`으로 정직하게 잡힘. 두 곳 캐스팅 추가.

---

## 검증

```bash
pnpm --filter @x2/queue typecheck
pnpm --filter @x2/social typecheck
pnpm --filter @x2/web typecheck
pnpm -r typecheck 2>&1 | grep -E "error TS" | wc -l
```

---

## 커밋 분할 (4커밋)

1. `fix(queue): cast IORedis options for bullmq maxRetriesPerRequest: null requirement`
2. `fix(queue): <queues.ts 에러 진단 후 결정>`
3. `fix(web): downgrade channels/new page to channel.add (register procedure pending P1-9)`
4. `fix(social): cast tiktok res.json() to typed shape (P1-6.5 latent)`
