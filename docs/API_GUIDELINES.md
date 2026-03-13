# API Guidelines

tRPC 라우터, API 응답, 에러 처리 규칙.

## tRPC 구조 규칙

### 라우터 구성

```
packages/api/src/
├── index.ts          # 루트 라우터 (모든 서브 라우터 병합)
├── trpc.ts           # tRPC 인스턴스, 컨텍스트, 미들웨어
└── routers/
    ├── channel.ts    # 채널 관련 프로시저
    ├── analytics.ts  # 분석 데이터
    ├── content.ts    # 콘텐츠
    ├── insight.ts    # AI 인사이트
    ├── billing.ts    # 결제/구독
    └── user.ts       # 사용자/설정
```

### 프로시저 네이밍

| 작업      | 네이밍    | HTTP 매핑 |
| --------- | --------- | --------- |
| 목록 조회 | `list`    | GET       |
| 단건 조회 | `getById` | GET       |
| 생성      | `create`  | POST      |
| 수정      | `update`  | PATCH     |
| 삭제      | `delete`  | DELETE    |

```typescript
export const channelRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.channel.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.db.channel.findUnique({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      if (!channel) throw new TRPCError({ code: "NOT_FOUND" });
      return channel;
    }),

  create: protectedProcedure
    .input(createChannelSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.channel.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),
});
```

### 프로시저 접근 제어

```typescript
// 비인증 사용자도 접근 가능
publicProcedure    → 가격 페이지, 공개 데이터

// 로그인 필수
protectedProcedure → 대부분의 기능

// 요금제 제한 (미들웨어 체인)
proProcedure       → Pro 이상에서만 사용 가능한 기능
```

## API 응답 포맷

### 단건 응답

tRPC는 타입을 자동 추론하므로 별도 래퍼 없이 데이터를 직접 반환한다:

```typescript
// ✅ 좋음: 직접 반환
return channel;

// ✗ 나쁨: 불필요한 래퍼
return { success: true, data: channel };
```

### 목록 응답 (페이지네이션)

```typescript
// 커서 기반 페이지네이션 (무한 스크롤)
type CursorPaginatedResponse<T> = {
  items: T[];
  nextCursor: string | null;
};

// 오프셋 기반 페이지네이션 (테이블)
type OffsetPaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
```

```typescript
// 구현 예시
list: protectedProcedure
  .input(z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
  }))
  .query(async ({ ctx, input }) => {
    const { page, limit } = input;
    const [items, total] = await Promise.all([
      ctx.db.channel.findMany({
        where: { userId: ctx.session.user.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      ctx.db.channel.count({
        where: { userId: ctx.session.user.id },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }),
```

## 에러 처리

### tRPC 에러 코드 사용

tRPC의 내장 에러 코드를 사용한다. 커스텀 에러 코드를 만들지 않는다.

```typescript
import { TRPCError } from "@trpc/server";

// 404
throw new TRPCError({
  code: "NOT_FOUND",
  message: "채널을 찾을 수 없습니다",
});

// 403
throw new TRPCError({
  code: "FORBIDDEN",
  message: "이 기능은 Pro 요금제에서 사용 가능합니다",
});

// 400
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "올바른 YouTube URL을 입력하세요",
});

// 429
throw new TRPCError({
  code: "TOO_MANY_REQUESTS",
  message: "요청이 너무 많습니다. 잠시 후 다시 시도하세요",
});

// 500 (예상치 못한 에러)
throw new TRPCError({
  code: "INTERNAL_SERVER_ERROR",
  message: "분석 중 오류가 발생했습니다",
  cause: originalError, // 원본 에러 보존 (로그용)
});
```

### 에러 메시지 규칙

- **사용자용 메시지는 한국어**로 작성한다.
- 기술적 디테일은 포함하지 않는다: "DB 연결 실패" ✗ → "일시적인 오류가 발생했습니다" ✅
- 가능하면 해결 방법을 포함한다: "Pro 요금제에서 사용 가능합니다"

### 클라이언트 에러 처리

```tsx
"use client";
import { api } from "@/lib/trpc";

export function ChannelList() {
  const { data, error, isLoading } = api.channel.list.useQuery();

  if (isLoading) return <ChannelListSkeleton />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!data?.items.length) return <EmptyState />;

  return data.items.map((ch) => <ChannelCard key={ch.id} channel={ch} />);
}
```

### 뮤테이션 에러 처리

```tsx
const createChannel = api.channel.create.useMutation({
  onSuccess: () => {
    toast.success("채널이 추가되었습니다");
    router.push("/channels");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});
```

## 외부 API 에러 처리

소셜 미디어 API 호출 시 에러를 내부 형식으로 변환한다:

```typescript
// packages/social/src/providers/youtube.ts
async getChannelInfo(channelId: string): Promise<ChannelInfo> {
  try {
    const response = await fetch(`...`);
    if (!response.ok) {
      if (response.status === 403) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "YouTube API 할당량을 초과했습니다. 내일 다시 시도하세요",
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "YouTube 데이터를 가져올 수 없습니다",
      });
    }
    return parseResponse(await response.json());
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "외부 서비스 연결에 실패했습니다",
      cause: error,
    });
  }
}
```

## REST API 라우트 (webhook 등)

tRPC 외에 Next.js Route Handler가 필요한 경우:

```typescript
// app/api/webhook/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // ...처리 로직
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return NextResponse.json({ error: "Webhook 처리 실패" }, { status: 500 });
  }
}
```

REST 응답 포맷:

```json
// 성공
{ "status": "ok", ... }

// 에러
{ "error": "에러 메시지" }
```

## Input 검증 규칙

- 모든 입력은 **Zod 스키마로 검증**한다.
- 스키마는 `packages/types` 또는 해당 라우터 파일에 정의한다.
- 숫자 입력에는 반드시 min/max를 설정한다.
- 문자열 입력에는 반드시 max를 설정한다.

```typescript
// ✅ 좋음
z.object({
  url: z.string().url().max(2048),
  name: z.string().min(1).max(100),
  limit: z.number().min(1).max(100).default(20),
});

// ✗ 나쁨: 제한 없음
z.object({
  url: z.string(),
  name: z.string(),
  limit: z.number(),
});
```
