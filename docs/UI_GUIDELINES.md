# UI Guidelines

컴포넌트 설계, 서버/클라이언트 분리, 대시보드 UI 일관성 규칙.

## 서버 컴포넌트 / 클라이언트 컴포넌트 분리

### 기본 원칙

Next.js App Router에서 **모든 컴포넌트는 기본적으로 서버 컴포넌트(RSC)**다. 아래 경우에만 `"use client"`를 추가한다:

| `"use client"` 필요                  | 서버 컴포넌트 유지         |
| ------------------------------------ | -------------------------- |
| useState, useEffect 사용             | 데이터 fetch (async/await) |
| onClick, onChange 등 이벤트          | DB 직접 조회               |
| useRouter, usePathname               | 메타데이터 설정            |
| 브라우저 API (localStorage 등)       | 정적 렌더링                |
| 외부 클라이언트 라이브러리 (차트 등) | 레이아웃, 페이지 껍데기    |

### 분리 패턴

```
page.tsx (서버) → 데이터 fetch
└── feature-section.tsx (서버) → 구조, 레이아웃
    └── interactive-widget.tsx (클라이언트) → 상호작용만
```

```tsx
// ✅ 좋음: 서버에서 데이터를 가져와서 클라이언트에 전달
// app/(dashboard)/channels/page.tsx (서버)
import { ChannelList } from "@/components/features/channels/channel-list";

export default async function ChannelsPage() {
  const channels = await getChannels(); // 서버에서 fetch
  return <ChannelList channels={channels} />;
}

// components/features/channels/channel-list.tsx
("use client");
// 클라이언트: 정렬, 필터, 페이지네이션 상호작용
export function ChannelList({ channels }: { channels: Channel[] }) {
  const [sortBy, setSortBy] = useState("name");
  // ...
}
```

### 금지 패턴

```tsx
// ✗ 페이지 전체를 "use client"로 만들지 않는다
"use client";
export default function ChannelsPage() { ... }

// ✗ 서버 컴포넌트에서 훅을 쓰지 않는다
export default function Page() {
  const [state, setState] = useState(""); // 에러
}

// ✗ 클라이언트 컴포넌트에서 직접 DB 접근하지 않는다
"use client";
import { db } from "@x2/db";
export function List() {
  const data = await db.channel.findMany(); // 에러
}
```

## 컴포넌트 설계 규칙

### 1. Props 규칙

```tsx
// Props 타입은 컴포넌트와 같은 파일에 정의
type ChannelCardProps = {
  channel: ChannelInfo;
  onSelect?: (id: string) => void;
};

export function ChannelCard({ channel, onSelect }: ChannelCardProps) {
  // ...
}
```

### 2. 컴포넌트 크기

- **한 파일 150줄 이하**를 목표로 한다.
- 150줄 넘으면 하위 컴포넌트로 분리를 고려한다.
- 단, 억지로 분리하지 않는다. 자연스러운 단위로 나눈다.

### 3. 조건부 렌더링

```tsx
// ✅ 좋음: 얼리 리턴
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
return <ChannelList channels={data} />;

// ✗ 나쁨: 중첩 삼항
return isLoading ? <Skeleton /> : error ? <Error /> : <List />;
```

### 4. 공유 컴포넌트 vs 기능 컴포넌트

| 위치                    | 용도                                   | 예시                        |
| ----------------------- | -------------------------------------- | --------------------------- |
| `packages/ui`           | 프로젝트 전체 공유, 비즈니스 로직 없음 | Button, Card, Input         |
| `components/shared`     | 앱 내 공유, 경량 비즈니스 로직         | EmptyState, PageHeader      |
| `components/features/*` | 특정 기능 전용                         | ChannelCard, AnalyticsChart |

## 폼 검증 규칙

### Zod 스키마를 단일 소스로 사용한다

```tsx
// 1. 스키마 정의 (서버/클라이언트 모두 사용)
// packages/types 또는 해당 feature 폴더에 위치
import { z } from "zod";

export const createChannelSchema = z.object({
  url: z.string().url("올바른 URL을 입력하세요"),
  name: z.string().min(1, "채널 이름을 입력하세요").max(100),
});

export type CreateChannelInput = z.infer<typeof createChannelSchema>;

// 2. tRPC에서 input 검증 (서버)
export const channelRouter = router({
  create: protectedProcedure
    .input(createChannelSchema)
    .mutation(({ input }) => { ... }),
});

// 3. 폼에서 클라이언트 검증
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChannelSchema, type CreateChannelInput } from "./schema";

export function CreateChannelForm() {
  const form = useForm<CreateChannelInput>({
    resolver: zodResolver(createChannelSchema),
  });
  // ...
}
```

### 검증 에러 메시지

- 한국어로 작성한다.
- 구체적으로 작성한다: "입력하세요" ✗ → "채널 URL을 입력하세요" ✅
- 최대/최소 제한은 메시지에 수치를 포함한다: "100자 이내로 입력하세요"

## 대시보드 UI 일관성

### 페이지 레이아웃

모든 대시보드 페이지는 동일한 구조를 따른다:

```tsx
export default function SomePage() {
  return (
    <div className="space-y-6">
      {/* 1. 페이지 헤더: 제목 + 액션 버튼 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">페이지 제목</h1>
          <p className="text-muted-foreground mt-1 text-sm">설명</p>
        </div>
        <Button>액션</Button>
      </div>

      {/* 2. 통계 카드 (선택) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="구독자" value="1.2M" />
      </div>

      {/* 3. 메인 콘텐츠 */}
      <Card>
        <CardContent>...</CardContent>
      </Card>
    </div>
  );
}
```

### 통계 카드 (StatCard)

```
┌──────────────────┐
│ 라벨        +12% │  ← 변화율 (선택, 초록/빨강)
│ 1,234,567        │  ← 주요 수치 (큰 폰트)
│ 전주 대비         │  ← 부가 설명 (작은 폰트, muted)
└──────────────────┘
```

- 숫자는 반드시 `toLocaleString()`으로 포맷한다: `1234567` → `1,234,567`
- 퍼센트 변화: 양수는 초록, 음수는 빨강, 0은 회색
- 단위가 큰 숫자는 축약한다: `1,234,567` → `1.2M`

### 테이블

```tsx
// 모든 테이블은 동일한 구조:
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
      <TableHead className="text-right">조회수</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell className="text-right">
          {item.views.toLocaleString()}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

- 숫자 컬럼은 `text-right`
- 빈 상태: 테이블 대신 EmptyState 컴포넌트 표시
- 로딩: Skeleton 행으로 표시 (3~5행)
- 페이지네이션: 테이블 하단에 고정 위치

### 차트

- **라이브러리**: Recharts 사용
- **색상**: CSS 변수로 통일 (`--chart-1`, `--chart-2`, ...)
- **반응형**: 반드시 `ResponsiveContainer`로 감싼다
- **툴팁**: 한국어 레이블 + 포맷된 숫자
- **빈 데이터**: "데이터가 없습니다" 메시지 표시

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip formatter={(v: number) => v.toLocaleString()} />
    <Line dataKey="views" stroke="var(--chart-1)" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

## 로딩 / 에러 / 빈 상태

모든 데이터 표시 영역은 3가지 상태를 처리한다:

| 상태    | 처리                                          |
| ------- | --------------------------------------------- |
| 로딩    | Skeleton 컴포넌트 (레이아웃과 동일한 형태)    |
| 에러    | 에러 메시지 + 재시도 버튼                     |
| 빈 상태 | 설명 문구 + CTA 버튼 ("첫 채널을 추가하세요") |

```tsx
// Next.js App Router의 loading.tsx, error.tsx 적극 활용
app/(dashboard)/channels/
├── page.tsx
├── loading.tsx    ← Skeleton UI
└── error.tsx      ← 에러 바운더리
```

## 반응형 규칙

| 브레이크포인트 | 기준     | 적용                 |
| -------------- | -------- | -------------------- |
| 기본 (< 768px) | 모바일   | 1컬럼, 사이드바 숨김 |
| `md` (768px+)  | 태블릿   | 2컬럼, 사이드바 표시 |
| `lg` (1024px+) | 데스크톱 | 3~4컬럼, 풀 레이아웃 |

모바일 퍼스트로 작성한다. 기본 스타일이 모바일이고, `md:`, `lg:`로 확장한다.
