# P0 Blocker 진단 — 2026-04-06

> 작성: 채팅 Claude 세션 (읽기 전용 분석)
> 목적: `RELEASE_READINESS_DECISION.md`의 P0 3건에 대해 코드 레벨에서 원인을 찾고, 터미널 Claude Code가 바로 고칠 수 있도록 구체적 수정 가이드를 제공.
> 범위: 커밋하지 않음. 이 문서는 진단·제안일 뿐 실제 수정은 터미널 세션이 집행.

---

## 조사 대상 파일 (read-only)

| 파일                                                        | 라인 수 | 역할                                                  |
| ----------------------------------------------------------- | ------- | ----------------------------------------------------- |
| `apps/web/src/app/(dashboard)/listening-hub/page.tsx`       | 189     | 리스닝 허브 엔트리                                    |
| `apps/web/src/app/(dashboard)/intelligence/page.tsx`        | 1292    | 인텔리전스 허브 엔트리 (거대)                         |
| `apps/web/src/app/page.tsx`                                 | 292     | 현재 렌더링되는 랜딩                                  |
| `apps/web/src/app/landing.tsx`                              | 1719    | **신규 랜딩 후보, 어디서도 import 안 됨 (dead code)** |
| `apps/web/src/hooks/use-current-project.ts`                 | 37      | 프로젝트 해석 훅                                      |
| `apps/web/src/app/api/search-intelligence/analyze/route.ts` | ~80     | 리스닝 허브 분석 API                                  |
| `apps/web/src/components/listening-hub/*.tsx`               | 9       | 8개 섹션 컴포넌트                                     |
| `apps/web/src/components/intelligence/*.tsx`                | 30+     | 인텔리전스 컴포넌트                                   |

---

## P0-1. 리스닝 허브 분석 결과 렌더링 안정화

### 결론

**코드 자체는 대부분 정상.** 각 섹션이 `ErrorBoundary`로 감싸져 있고, `undefined` 가드도 들어있어요. 보고된 "렌더링 이슈"의 실제 원인은 **렌더링 로직이 아니라 데이터 스키마 불일치**일 가능성이 높습니다.

### 증거

`listening-hub/page.tsx` L146-186에서 8개 섹션이 모두 ErrorBoundary로 감싸져 있음:

```tsx
<ErrorBoundary>
  <IntentSummarySection result={result} />
</ErrorBoundary>
<ErrorBoundary>
  <ClusterSection clusterResult={result?.cluster} />
</ErrorBoundary>
// ... 8개 모두 동일 패턴
```

`ClusterSection.tsx`도 방어적으로 작성돼 있음 (L22-34, L87-89):

- `clusterResult` 없으면 빈 상태 카드
- `clusters.length === 0` 분기 있음
- 심지어 `topKeywords` 항목이 문자열이 아니라 객체일 경우까지 처리 (`L109`):
  ```tsx
  const kwLabel =
    typeof rawKw === "string"
      ? rawKw
      : ((rawKw as any)?.keyword ?? (rawKw as any)?.label ?? String(rawKw));
  ```
  이 `any` 캐스팅 자체가 **과거에 스키마 불일치로 런타임 에러가 났다는 흔적**.

### 진짜 원인(추정)

API 응답 `data` 안의 cluster/persona/pathfinder/roadview/insight/action/evidence의 **실제 필드가 TypeScript 타입과 어긋남**. 특히:

1. `result.trace.confidence`, `result.trace.freshness`가 있다고 가정하고 쓰는데 (L134-140) 서비스가 일관되게 돌려주지 않을 수 있음.
2. `insight` / `action` / `evidence`는 `EngineExecutionResult<unknown>` 타입으로 `data`가 `unknown`. 각 섹션이 자기 멋대로 캐스팅하면서 필드가 없으면 터짐.
3. `/api/search-intelligence/analyze` 라우트(`route.ts`)는 응답을 `{ success: true, data: result }`로 감싸는데, page에서는 `json.data ?? json` (L69)로 받음 — **이중 안전망이 있다는 것 자체가 한 번 이상 어긋났다는 신호**.

### 수정 가이드 (터미널 Claude Code용)

**Step 1**: 런타임 로깅 추가로 실제 응답 구조 확인

- `page.tsx` L68 직후에 `console.debug("[listening-hub] raw response", json)` 추가
- 브라우저 콘솔에서 실제 `cluster`, `pathfinder`, `persona` shape 확인

**Step 2**: 섹션별 `as any` 캐스팅 제거 + 제대로 된 타입 정의

- `packages/api/src/services/` 또는 `apps/web/src/services/search-intelligence/` 에서 각 엔진의 **실제 반환 타입**을 export 하고, 섹션 컴포넌트에서 그 타입을 import 해서 쓰기
- `unknown` → 구체 타입으로 좁히면 빌드 시점에 불일치를 잡을 수 있음

**Step 3**: 백엔드 응답 래핑 통일

- `/api/search-intelligence/analyze` 라우트가 항상 `{ success, data }`를 반환하도록 되어 있다면, page에서 `json.data ?? json` fallback 제거
- `!res.ok`일 때 `json.error` 읽어서 화면에 표시 (현재는 하드코딩된 "분석에 실패했어요")

**Step 4**: `redirect: "manual"` 로직 (L55-61) 재검토

- 미들웨어 리다이렉트 감지는 좋은 접근이지만, 307은 `type === "opaqueredirect"`로는 안 잡힐 수 있음. 테스트 필요.

**예상 공수**: 2-4시간 (진단 로깅 1h, 타입 정리 2h, 응답 래핑 통일 1h)

---

## P0-2. 인텔리전스 허브 projectId 의존성

### 결론

**실제 근본 원인 발견**: `useCurrentProject` 훅이 "첫 번째 워크스페이스의 첫 번째 프로젝트"를 하드코딩으로 반환함. 프로젝트가 없거나 여러 개일 때, 또는 다른 프로젝트를 고르고 싶을 때 **선택 수단이 전혀 없음**.

### 증거

`apps/web/src/hooks/use-current-project.ts` 전체 (37 lines):

```ts
export function useCurrentProject() {
  const { data: workspaces } = trpc.workspace.list.useQuery(...);
  const firstWorkspace = workspaces?.[0];  // ← 첫 번째
  const { data: projects } = trpc.project.list.useQuery(...);
  const firstProject = projects?.[0];       // ← 첫 번째
  return {
    projectId: firstProject?.id ?? null,
    isLoading: wsLoading || (!!firstWorkspace?.id && projLoading),
    hasData: !!firstProject,
  };
}
```

파일 상단 주석 자체가 인정: _"추후 워크스페이스/프로젝트 선택 UI와 연동 예정"_. 즉 이건 **임시 구현인데 아직 영구화돼 있음**.

### 인텔리전스 페이지에서 터지는 지점

`intelligence/page.tsx` L76:

```ts
const { projectId, isLoading: projectLoading } = useCurrentProject();
```

그리고 **`projectLoading`은 destructure만 하고 이후 코드에서 단 한 번도 사용되지 않음**. 즉:

- 프로젝트가 아직 로딩 중일 때: `projectId = null` → 모든 쿼리가 `enabled: !!projectId` 로 막혀서 "빈 상태"로 렌더링됨 → 사용자가 로딩 스피너도 못 봄
- 로딩이 끝나면: 갑자기 모든 쿼리가 flush → 빈 화면이 확 바뀜 (hydration flash 느낌)
- 프로젝트가 **아예 없는 사용자**의 경우: 영원히 `projectId = null`. "분석 시작" 클릭 시 L328의 `if (!projectId)` 가드에서 에러 메시지만 뜨고 끝

또한 L114:

```ts
const activeKeywordForHistory =
  analyzeMutation.data?.seedKeyword || seedKeyword.trim() || undefined;
```

이 한 줄 때문에, 사용자가 키워드를 타이핑하는 동안 history 쿼리가 매 글자마다 refetch됨. **디바운스 없음**.

### 수정 가이드 (터미널 Claude Code용)

**Step 1 (필수)**: 프로젝트 선택 상태를 URL 또는 세션에 보존

```ts
// 예: use-current-project.ts
const searchParams = useSearchParams();
const paramProjectId = searchParams.get("projectId");
const selectedProjectId =
  paramProjectId ??
  localStorage.getItem("x2_current_project") ??
  firstProject?.id;
```

- URL 쿼리 파라미터 우선 → localStorage → 기본값(첫 번째) 순
- 프로젝트가 바뀌면 localStorage에 저장
- 이렇게 하면 새로고침해도 선택이 유지되고, 링크 공유도 가능

**Step 2 (필수)**: 프로젝트 없는 사용자를 위한 명시적 안내 컴포넌트

- 현재는 "프로젝트를 먼저 선택해주세요" 에러만 뜸
- 대신 페이지 상단에서 `!isLoading && !projectId`일 때 **"프로젝트 만들기" CTA 카드**를 full-page로 보여주기
- 이미 `/settings`에 프로젝트 생성 기능이 있으니 (`4e4c19f` 커밋) 그쪽으로 링크

**Step 3 (필수)**: `projectLoading` 상태를 실제로 사용

```tsx
if (projectLoading) {
  return <FullPageSpinner message="워크스페이스 로딩 중..." />;
}
if (!projectId) {
  return <NoProjectEmptyState />;
}
// 이하 실제 페이지 렌더
```

**Step 4 (권장)**: `activeKeywordForHistory` 디바운스

- `seedKeyword` 를 `useDeferredValue` 또는 `useDebouncedValue` 로 감싸서 300ms 디바운스
- 쿼리 과부하 방지

**Step 5 (권장)**: 워크스페이스 전환 드롭다운을 사이드바 상단에 배치

- 현재는 선택 UI 자체가 없음 — 사용자 혼란의 가장 큰 원인
- `WorkspaceSwitcher` 컴포넌트 신규 생성

**예상 공수**: 6-10시간 (Step 1-3 필수 4h, Step 4-5 권장 4-6h)

---

## P0-3. 로그인 전 랜딩 페이지 제품 수준 재설계

### 결론

**가장 심각한 발견**: `apps/web/src/app/landing.tsx` (1719 라인)이 존재하지만 **어디서도 import 되지 않고 있음**. 즉 "새 랜딩"을 누군가 쓰다가 중단했고, 현재 운영되는 랜딩은 여전히 `apps/web/src/app/page.tsx` (292 라인)의 옛 버전입니다.

### 증거

1. `(marketing)/` 디렉토리는 삭제됨 (`git status`: `D apps/web/src/app/(marketing)/page.tsx`, `D apps/web/src/app/(marketing)/layout.tsx`)
2. `apps/web/src/app/landing.tsx` 상단:
   ```tsx
   "use client";
   export function LandingPage() {
     // named export
     return (
       <div>
         <Navbar />
         <HeroWithDualDemo />
         ...
       </div>
     );
   }
   ```
3. `apps/web/src/app/page.tsx` 하단:
   ```tsx
   export default function LandingPage() {
     // default export, 별개 구현
     return (
       <main>
         <Hero />
         <HubCards />
         ...
       </main>
     );
   }
   ```
4. `grep -rn "from.*landing\"" apps/web/src` → **결과 0건**. `landing.tsx`를 import 하는 파일이 존재하지 않음.

### 상태 해석

누군가(아마 지난 주 작업) 다음 순서로 일하다 중단됨:

1. `(marketing)/` 폴더의 옛 랜딩 삭제
2. `landing.tsx` 파일에 새 랜딩 기능 풀세트 작성 (HeroWithDualDemo, ChannelDemoSection, IntentDemoSection, Pricing, Faq 등 1719 라인)
3. **`page.tsx`에서 `landing.tsx`를 import 해서 default export로 연결하는 마지막 한 줄을 안 함**
4. 그 사이 `page.tsx`가 어찌어찌 다시 복구돼서 옛날 Hero/HubCards 기반 랜딩이 여전히 렌더링 중

**의미**: 393개 uncommitted 변경 중 적어도 1719 라인은 "어차피 연결 안 돼 있어서 빌드에 영향 없음"이지만, 동시에 **"버려질 가능성이 높은 작업"**. 이대로 방치하면 계속 dead code로 남음.

### 수정 가이드 (터미널 Claude Code용)

**두 가지 길이 있습니다. 선택 필요:**

#### 옵션 A: `landing.tsx`를 살리기 (1719 라인 작업 활용)

1. `apps/web/src/app/landing.tsx` 내용을 빠르게 훑어 디자인 품질 확인
2. 괜찮으면 `page.tsx`를 다음처럼 단순화:
   ```tsx
   import { LandingPage } from "./landing";
   export default LandingPage;
   ```
3. 기존 `page.tsx`의 Hero/HubCards/HowItWorks/UseCases/CtaFooter/Footer는 제거 (또는 `landing.tsx`가 이미 커버하면 그냥 삭제)
4. `components/landing/scroll-link.tsx`와의 호환성 확인
5. 배포 후 `https://x2-nixonnox.vercel.app` 육안 확인

**장점**: 기존 작업 재활용. 시간 절약.
**리스크**: 1719 라인짜리 거대 단일 파일 — 누구도 전체를 리뷰 안 했을 가능성. 반응형·접근성·i18n 구멍 있을 수 있음.

#### 옵션 B: `landing.tsx`를 과감히 삭제하고 처음부터 다시 (추천)

1. `landing.tsx`는 `backup/` 디렉토리로 이동(또는 git history에 남기고 삭제)
2. 새 랜딩을 **훨씬 작은 단위**로 재구성:
   - `apps/web/src/app/page.tsx` → 얇은 서버 컴포넌트 (레이아웃만)
   - `apps/web/src/components/landing/sections/Hero.tsx`
   - `.../Features.tsx`
   - `.../Pricing.tsx`
   - `.../Faq.tsx`
   - 등 파일 당 100-200 라인
3. MVP는 Hero + Features + CTA 3개 섹션만으로 출발. Pricing/FAQ는 나중에.
4. 반응형/다크모드/a11y는 처음부터 테스트
5. i18n 기본 한국어만, 영어는 후순위

**장점**: 유지보수 가능한 구조. 작은 커밋으로 점진적 진화 가능.
**리스크**: 1719 라인의 기존 작업이 (아마도) 버려짐. 시간 더 소요.

**저의 추천: 옵션 B**. 이유:

- 1719 라인 한 파일은 그 자체로 유지보수 부채
- 어차피 이 상태로 프로덕션 못 나감 (리뷰 안 된 dead code)
- 작은 컴포넌트로 쪼개면 이후 A/B 테스트나 섹션 교체가 쉬움
- 대표님이 "제너스(GENUS)" 같은 구체 케이스 스터디를 나중에 추가하기 쉬움

**예상 공수**:

- 옵션 A: 2-4시간 (검토 + 배선 + QA)
- 옵션 B: 8-16시간 (재설계 + 구현 + QA)

---

## 세 P0 공통 테마: "매달림(suspended work)"

세 건 모두 패턴이 동일해요:

1. **누군가 작업을 시작했음** (랜딩 신규 파일, intelligence 기능 확장, 리스닝 허브 스키마 확장)
2. **중간에 멈췄음** (배선 누락, UI 미연결, 타입 미정의)
3. **그 상태가 uncommitted로 쌓여있음** (393개 중 상당수가 이런 "반쯤 된 것들")
4. **운영 코드는 옛 버전이 계속 동작** — 그래서 급한 버그는 안 나지만, 근본 문제는 점점 눈에 안 띄게 쌓임

**이 패턴을 끊는 방법**: 새 작업을 시작하기 전에 "완결 기준(definition of done)" 선언. 예:

- 랜딩 작업 = 반드시 `page.tsx`에 연결돼서 `/`에 실제 렌더링될 때까지가 한 단위
- 프로젝트 선택 UI = 반드시 사이드바에 드롭다운이 뜨고 새로고침해도 유지될 때까지가 한 단위
- 어느 것도 중간 상태로 다른 작업에 손대지 말 것

이걸 지키는 가장 쉬운 방법은 **한 번에 하나의 P0만 작업**하고, 끝날 때까지 다른 파일 안 건드리기.

---

## 권장 실행 순서 (터미널 Claude Code가 집행)

1. **먼저 이 문서(`P0_BLOCKER_DIAGNOSIS_2026-04-06.md`) 를 처음부터 끝까지 읽기**
2. **그 다음 `COMMIT_PLAN_2026-04-06.md` 로 워킹카피 정리** (안전 저장이 먼저)
3. 그 위에서:
   - **P0-2 (intelligence projectId)** 부터 시작 — 가장 작고, 가장 사용자 임팩트 큼
   - 이어서 **P0-1 (listening hub)** — 타입 정리만 하면 됨
   - 마지막으로 **P0-3 (랜딩)** — 가장 큰 작업이고, 기간 필요
4. 각 P0 완료 후 `pnpm typecheck && pnpm build` 통과 확인
5. Vercel 배포 → `x2-nixonnox.vercel.app` 육안 검증
6. `RELEASE_READINESS_DECISION.md` 에 진행 상황 업데이트

---

## 참고 — 이 세션의 한계

이 진단은 **읽기만으로** 작성됐어요. 실제 브라우저에서 재현하거나 런타임 로그를 본 건 아닙니다. 따라서:

- 추정(estimate) 부분은 "증거"가 아니라 "가설"로 읽어주세요
- 실제 수정 전에 터미널에서 `pnpm dev` 띄워서 재현부터 해주세요
- 수정 후에는 **같은 진단을 한 번 더 돌려서** 새로운 이슈가 드러나는지 체크

이 문서는 참고 자료이며, 절대 진리가 아닙니다.
