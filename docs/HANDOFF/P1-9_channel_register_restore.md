# P1-9 — channel.register procedure 복원 (Option A: 최소 복원, no schema migration)

**작성**: 2026-04-07, 채팅 Claude (reader/diagnostician)
**대상**: 터미널 Claude Code (writer)
**전제**: 이 작업은 schema 마이그레이션을 포함하지 않는다. 풍부한 폼 필드(country/category/tags/analysisMode/customPlatformName)는 input으로 받기만 하고 DB에는 저장하지 않는다 — 이는 `3a268b8` 시점의 원본 register procedure와 동일한 동작이며, P1-9 1차분의 의도된 범위다.

---

## 0. 결정적 발견 (왜 마이그레이션이 필요 없는가)

`git show 3a268b8:packages/api/src/routers/channel.ts`를 읽어보면 옛날 register procedure는 zod input으로 `name, platformCode, channelType, country, category, tags, analysisMode, customPlatformName`을 모두 받지만, 실제 `ctx.db.channel.create({ data: ... })`에 들어간 필드는 다음 5개뿐이다:

```
projectId, platform, platformChannelId, name, url, channelType, connectionType, status
```

`country/category/tags/analysisMode/customPlatformName`은 받기만 하고 무시했다. 즉 옛날 동작도 "UI 폼만 풍부, DB 저장은 빈약"이었다. 따라서 P1-9 1차분은:

- **register procedure를 옛날 모양 그대로 부활**
- **page는 mutateAsync에 모든 폼 필드 다시 채움**
- **schema/migration은 건드리지 않음**

이렇게만 해도 사용자 관점에서 4/6 이전 동작이 100% 복원된다. 진짜 schema 마이그레이션은 별도 P2 항목.

---

## 1. 작업 1: `packages/api/src/routers/channel.ts` 수정

### 1-1. 파일 상단 helper 두 개 추가

`import { YouTubeProvider } from "@x2/social";` 줄 **다음**에 추가:

```typescript
const youtube = new YouTubeProvider();

// URL에서 platformChannelId 추출 (register용)
function extractChannelId(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const path = u.pathname.replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    return last || u.hostname;
  } catch {
    return url;
  }
}

// 플랫폼 코드 → DB SocialPlatform enum 매핑
function toPlatformEnum(
  code: string,
): "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG" {
  const map: Record<
    string,
    "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG"
  > = {
    youtube: "YOUTUBE",
    instagram: "INSTAGRAM",
    tiktok: "TIKTOK",
    x: "X",
    naver_blog: "NAVER_BLOG",
  };
  return map[code] ?? "YOUTUBE";
}
```

`youtube` 인스턴스가 이미 파일에 선언돼 있으므로 **두 번째 선언 추가하지 말 것**. helper 두 개만 추가.

### 1-2. `delete` procedure **앞에** register procedure 삽입

기존 `add` procedure는 그대로 둔다 (YouTube 자동 감지 경로로 별도 활용 가능). register는 옛날 3a268b8과 거의 동일하지만 타입 안전성을 위해 `as any` 캐스트는 제거한다.

```typescript
  /** 모든 플랫폼 채널 등록 (사용자 입력 신뢰, 풍부한 폼 지원) */
  register: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        url: z.string(),
        name: z.string().min(1),
        platformCode: z.string(),
        channelType: z
          .enum(["owned", "competitor", "monitoring"])
          .default("owned"),
        country: z.string().default("KR"),
        category: z.string().default("기타"),
        tags: z.array(z.string()).default([]),
        analysisMode: z.string().default("url_basic"),
        customPlatformName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const normalizedUrl = input.url.startsWith("http")
        ? input.url
        : `https://${input.url}`;

      const platform = toPlatformEnum(input.platformCode);
      const platformChannelId = extractChannelId(normalizedUrl);

      // 중복 확인 (URL 기준)
      const existing = await ctx.db.channel.findFirst({
        where: {
          projectId: input.projectId,
          url: normalizedUrl,
          deletedAt: null,
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "이미 등록된 채널 URL입니다.",
        });
      }

      const channelTypeMap = {
        owned: "OWNED",
        competitor: "COMPETITOR",
        monitoring: "MONITORING",
      } as const;

      // NOTE: country/category/tags/analysisMode/customPlatformName은
      // 현재 Channel 모델에 컬럼이 없어 저장하지 않는다. P1-9는 의도적으로
      // 4/6 (3a268b8) 시점의 동작을 그대로 복원한 것이며, 해당 메타데이터
      // 컬럼 추가는 별도 마이그레이션 작업(P2)으로 다룬다.
      const channel = await ctx.db.channel.create({
        data: {
          projectId: input.projectId,
          platform,
          platformChannelId,
          name: input.name,
          url: normalizedUrl,
          channelType: channelTypeMap[input.channelType],
          connectionType: "BASIC",
          status: "ACTIVE",
        },
      });

      return { success: true, channel };
    }),
```

---

## 2. 작업 2: `apps/web/src/app/(dashboard)/channels/new/page.tsx` 수정

P1-7에서 다운그레이드한 부분(commit `90e5d18`)을 되돌린다. 두 군데:

### 2-1. mutation hook (대략 105줄 부근)

**현재 (다운그레이드 코멘트 포함):**

```tsx
  // P1-7: channel.register procedure 부재로 임시로 add 호출.
  // 풍부한 필드(name/category/tags 등)는 P1-9에서 register procedure
  // 신설 후 복원 예정.
  const registerChannel = trpc.channel.add.useMutation({
```

**수정:**

```tsx
  const registerChannel = trpc.channel.register.useMutation({
```

P1-7 코멘트 두 줄도 같이 삭제.

### 2-2. submit handler (대략 308–328줄 부근)

**현재:**

```tsx
// P1-7: channel.register procedure 부재로 임시로 add 호출.
// 풍부한 필드(name/category/tags 등)는 P1-9에서 register procedure
// 신설 후 복원 예정. 현재는 URL 자동감지 기반 add만 사용.
// resolvedPlatform/form.* 필드들은 register 복원 시 다시 사용 예정이므로
// 코드는 그대로 유지하고 아래 mutateAsync 인자만 축소.
void resolvedPlatform;
const result = await registerChannel.mutateAsync({
  projectId,
  url: form.url,
});

setSuccessMsg(`✅ "${form.name}" 채널이 등록되었습니다! 분석을 시작합니다...`);
setTimeout(() => {
  router.push(`/channels/${result.id}`);
}, 1200);
```

**수정:**

```tsx
const result = await registerChannel.mutateAsync({
  projectId,
  url: form.url,
  name: form.name,
  platformCode: resolvedPlatform,
  channelType: form.channelType as "owned" | "competitor" | "monitoring",
  country: form.country,
  category: form.category,
  tags: form.tags,
  analysisMode: form.analysisMode,
  customPlatformName: form.customPlatformName || undefined,
});

setSuccessMsg(`✅ "${form.name}" 채널이 등록되었습니다! 분석을 시작합니다...`);
setTimeout(() => {
  router.push(`/channels/${result.channel.id}`);
}, 1200);
```

요점:

- P1-7 코멘트 5줄과 `void resolvedPlatform;` 삭제
- mutateAsync 인자에 풍부한 필드 10개 복원
- result 접근을 `result.id` → `result.channel.id`로 되돌림 (register는 `{ success, channel }` 반환)

---

## 3. 검증 순서

```bash
# 1. api 패키지 typecheck
pnpm --filter @x2/api typecheck
# 기대: 0 errors

# 2. web 패키지 typecheck
pnpm --filter @x2/web typecheck
# 기대: 0 errors

# 3. 전체 typecheck (회귀 확인)
pnpm typecheck
# 기대: 모든 패키지 0 errors

# 4. web build (build gate 살아있음, P1-8)
pnpm --filter @x2/web build
# 기대: PASS, ESLint 0 errors

# 5. 커밋
git add packages/api/src/routers/channel.ts \
        apps/web/src/app/\(dashboard\)/channels/new/page.tsx
git commit -m "feat(api): restore channel.register procedure (P1-9)

P1-7 잔여 해소. 4/6 (3a268b8)에서 추가됐다가 4/6 (47f2d25)
'packages/api 정비' 커밋에서 통째로 삭제됐던 channel.register
procedure를 복원.

복원 범위:
- packages/api: register procedure 신설 (옛날 3a268b8 시점 동작 그대로)
  · zod input 10개 필드 (projectId/url/name/platformCode/channelType/
    country/category/tags/analysisMode/customPlatformName)
  · DB 저장은 schema 변경 없는 5개 필드만
    (platform/platformChannelId/name/url/channelType)
  · helper extractChannelId, toPlatformEnum 추가
- apps/web channels/new/page.tsx: trpc.channel.add → channel.register
  · mutateAsync 인자 10개 필드 복원
  · result.id → result.channel.id 되돌림
  · P1-7 임시 코멘트 5줄 + void resolvedPlatform 삭제

미포함 (별도 P2):
- Channel 모델에 country/category/tags/analysisMode/customPlatformName
  컬럼 추가 + Neon migration. 이는 production schema 변경이라
  P1 안정화 라운드 범위 밖.

검증:
- pnpm --filter @x2/api typecheck: 0 errors
- pnpm --filter @x2/web typecheck: 0 errors
- pnpm --filter @x2/web build: PASS

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

git push origin master
# Vercel auto-deploy 트리거됨
```

---

## 4. 배포 후 채팅 Claude 검증 항목

터미널 Claude가 push 끝내면 채팅 Claude가:

1. Vercel 배포 상태 확인 (`mcp__vercel__get_deployment` 또는 list_deployments)
2. production URL `x2-nixonnox.vercel.app/channels/new` 에서:
   - 페이지 로드 정상
   - URL 입력 → 자동 감지 동작
   - 폼 제출 시 register procedure 호출 확인 (콘솔/네트워크)
   - 채널 등록 성공 → `/channels/{id}` 리다이렉트
3. 회귀 체크: `/channels` 목록 페이지에 새 채널 표시되는지

---

## 5. 정찰 체크리스트 자가 점검 (메모리 규칙)

| #   | 항목                       | 결과                                                                                                                                                                                         |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 소비자 package.json deps   | N/A — `@x2/api`는 web의 deps에 이미 들어가 있음 (변경 없음)                                                                                                                                  |
| 2   | pnpm why transitive        | N/A — 새 패키지 도입 없음                                                                                                                                                                    |
| 3   | schema vs code 필드 sanity | ✅ Channel 모델 컬럼 19개 직접 확인. 저장하는 5개 필드(`platform/platformChannelId/name/url/channelType`) 모두 schema에 존재. `channelType` enum은 대문자 — 코드에서 channelTypeMap으로 변환 |
| 4   | exports map 명시화         | N/A — 신규 export 없음                                                                                                                                                                       |
| 5   | 잔여물 묶기                | ✅ 동일 fix 다른 사용처 없음 (`grep -r "channel.register" apps/web` → channels/new/page.tsx 1건)                                                                                             |
| 6   | ambient stub               | N/A — 외부 모듈 추가 없음                                                                                                                                                                    |

---

## 6. Risks & Rollback

**Risks:**

- `result.channel.id` 접근이 다시 옛날 형태로 돌아가므로 register가 정확히 `{ success, channel }`을 반환하는지 typecheck가 보장 (TS 컴파일러가 잡아줌)
- `channelTypeMap`은 zod enum이 이미 좁혀줌 — 인덱스 접근 안전
- 옛날 3a268b8 register는 `as any` 캐스트가 있었음. 본 핸드오프는 `as any` 제거 — typecheck가 통과해야 함. 만약 SocialPlatform/ChannelType enum 매칭 에러가 나면, `toPlatformEnum`/`channelTypeMap` 반환 타입을 schema의 enum과 정확히 맞추는 방향으로 수정 (NOT `as any`)

**Rollback:**

- 단일 커밋 → `git revert {hash}` 한 방
- production은 GitHub auto-deploy이므로 revert push만 하면 자동 롤백 빌드

---

## 7. P1-9 완료 후 다음 후보

- **P2-N**: ESLint 298 warnings 카테고리별 청소
- **P1-9.5 (선택)**: Channel 모델 메타데이터 컬럼 추가 + Neon migration. **production schema 변경이라 별도 세션에서 신중히 다룰 것**. workflow:
  1. `prisma migrate dev --name add_channel_metadata` 로컬 검증
  2. `prisma migrate deploy` production
  3. register procedure에서 5개 필드 실제 저장
  4. list/detail 페이지에서 표시
- **인프라**: jose Edge Runtime 경고, ESLint Next.js 플러그인 미설정

이상.
