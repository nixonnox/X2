# Code Style

코드 스타일과 네이밍 규칙. Prettier와 ESLint가 자동으로 처리하는 부분 외에, 사람과 AI가 함께 지켜야 할 규칙을 정의한다.

## 네이밍 규칙

### 파일명

| 대상           | 규칙              | 예시                                |
| -------------- | ----------------- | ----------------------------------- |
| 컴포넌트 파일  | kebab-case.tsx    | `channel-card.tsx`                  |
| 유틸/훅/서비스 | kebab-case.ts     | `use-channels.ts`, `format-date.ts` |
| 타입 파일      | kebab-case.ts     | `channel.ts`, `common.ts`           |
| 테스트 파일    | 원본명.test.ts(x) | `channel-card.test.tsx`             |
| 상수 파일      | kebab-case.ts     | `nav-items.ts`                      |

**금지**: PascalCase 파일명 (`ChannelCard.tsx` ✗)

### 코드 네이밍

```typescript
// 컴포넌트: PascalCase
export function ChannelCard() {}

// 훅: camelCase, use 접두사
export function useChannels() {}

// 함수/변수: camelCase
const channelCount = 10;
function formatDate(date: Date) {}

// 상수: UPPER_SNAKE_CASE
const MAX_CHANNELS = 50;
const API_TIMEOUT = 5000;

// 타입/인터페이스: PascalCase
type ChannelInfo = { ... };
interface SocialProvider { ... }

// Enum 대신 union type 사용
type SocialPlatform = "youtube" | "instagram" | "tiktok" | "x";
// enum SocialPlatform { ... }  ← 사용하지 않음

// Boolean: is/has/can/should 접두사
const isLoading = true;
const hasPermission = false;
const canEdit = true;
```

### tRPC 라우터/프로시저

```typescript
// 라우터 파일명: 리소스 단수형
// packages/api/src/routers/channel.ts

// 프로시저: 동사 + 명사 (camelCase)
export const channelRouter = router({
  getById: publicProcedure.input(z.string()).query(...),
  list: protectedProcedure.query(...),
  create: protectedProcedure.input(createChannelSchema).mutation(...),
  delete: protectedProcedure.input(z.string()).mutation(...),
});
```

## 파일/폴더 구성 규칙

### 기본 원칙

1. **기능 기반(feature-based)으로 구성한다** — 기술 유형(components/, hooks/)이 아닌 기능(channels/, dashboard/) 기준
2. **깊이는 3단계까지** — `features/channels/components/` 정도가 최대
3. **한 파일에 하나의 export** — 컴포넌트 파일 하나에 컴포넌트 하나

### apps/web/src 구조

```
src/
├── app/                     # Next.js App Router (라우팅만 담당)
│   ├── (auth)/              # 인증 관련 페이지
│   ├── (dashboard)/         # 대시보드 페이지
│   ├── (marketing)/         # 마케팅/랜딩 페이지
│   └── api/                 # API 라우트
│
├── components/
│   ├── layout/              # 레이아웃 (sidebar, header)
│   ├── shared/              # 범용 공유 컴포넌트
│   └── features/            # 기능별 컴포넌트 ★
│       ├── channels/        #   채널 관련
│       ├── analytics/       #   분석 관련
│       └── settings/        #   설정 관련
│
├── hooks/                   # 범용 커스텀 훅
├── lib/                     # 유틸리티, 설정
└── styles/                  # 글로벌 스타일, 디자인 토큰
```

### 페이지 파일은 가볍게

```tsx
// ✅ 좋음: 페이지는 조합만 한다
// app/(dashboard)/channels/page.tsx
import { ChannelList } from "@/components/features/channels/channel-list";

export default function ChannelsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">채널 관리</h1>
      <ChannelList />
    </div>
  );
}

// ✗ 나쁨: 페이지에 비즈니스 로직이 있음
export default function ChannelsPage() {
  const channels = await db.channel.findMany(...);
  return channels.map(ch => <div>...</div>);
}
```

## Import 순서

자동 정렬하지 않으므로 아래 순서를 의식적으로 따른다:

```typescript
// 1. React/Next.js
import { useState } from "react";
import { useRouter } from "next/navigation";

// 2. 외부 라이브러리
import { z } from "zod";

// 3. @x2/* 내부 패키지
import { Button } from "@x2/ui";
import type { ChannelInfo } from "@x2/types";

// 4. @/ 앱 내부
import { useChannels } from "@/hooks/use-channels";
import { ChannelCard } from "@/components/features/channels/channel-card";

// 5. 상대 경로 (같은 디렉토리)
import { formatMetric } from "./utils";
```

## TypeScript 규칙

```typescript
// ✅ 명시적 반환 타입 (공개 API, 서비스 함수)
export function parseChannelUrl(url: string): string | null { ... }

// ✅ 추론에 맡김 (컴포넌트, 내부 함수)
function ChannelCard({ channel }: { channel: ChannelInfo }) { ... }

// ✅ type 사용 (일반적인 경우)
type ChannelCardProps = { channel: ChannelInfo };

// ✅ interface 사용 (구현이 필요한 계약)
interface SocialProvider { ... }

// ✗ any 사용 금지. unknown 또는 구체적 타입 사용
function process(data: any) {}      // ✗
function process(data: unknown) {}  // ✅
```

## 주석 규칙

```typescript
// ✅ 왜(Why)를 설명하는 주석
// YouTube API는 일 10,000 units 제한이 있어 캐싱 필수
const CACHE_TTL = 60 * 60; // 1시간

// ✗ 무엇(What)을 설명하는 주석 — 코드가 이미 말하고 있음
// 채널 수를 가져온다
const channelCount = channels.length;

// ✅ TODO는 구체적으로
// TODO: Phase 2에서 Instagram provider 추가
// TODO(#42): rate limit 초과 시 재시도 로직 필요
```
