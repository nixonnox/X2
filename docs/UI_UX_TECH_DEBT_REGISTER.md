# UI/UX 기술 부채 등록부

> X2 프로젝트의 UI/UX 관련 기술 부채를 체계적으로 관리하기 위한 문서

---

## 1. 필요하지만 없는 공통 컴포넌트

현재 `apps/web/src/components/shared/`에 8개 컴포넌트가 존재하지만, 여러 페이지에서 반복 구현되는 패턴이 다수 확인됨.

### 현재 공유 컴포넌트 (8개)

| 컴포넌트      | 파일               | 사용 현황                                                       |
| ------------- | ------------------ | --------------------------------------------------------------- |
| `PageHeader`  | `page-header.tsx`  | 다수 페이지에서 사용하지만, 9개 이상 페이지가 자체 헤더 구현    |
| `EmptyState`  | `empty-state.tsx`  | 8개 페이지에서 사용. insights 페이지는 자체 EmptyState 3개 구현 |
| `KpiCard`     | `kpi-card.tsx`     | dashboard, comments에서 사용. geo-aeo, pipeline은 자체 KPI 구현 |
| `StatCard`    | `stat-card.tsx`    | 거의 사용되지 않음                                              |
| `ChartCard`   | `chart-card.tsx`   | 일부 페이지에서 사용. 많은 페이지가 자체 차트 래퍼 구현         |
| `DataTable`   | `data-table.tsx`   | channels, contents에서 사용                                     |
| `DemoBanner`  | `demo-banner.tsx`  | dashboard에서 사용                                              |
| `InsightCard` | `insight-card.tsx` | 제한적 사용                                                     |

### 신규 생성이 필요한 공통 컴포넌트

| 컴포넌트          | 이유                                  | 현재 상태                                                          |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------ |
| **FilterBar**     | 검색 + 필터 + 정렬을 포함하는 표준 바 | comments에만 `CommentFilterBar` 존재. 다른 페이지는 모두 자체 구현 |
| **ErrorState**    | 에러 상태 표준 컴포넌트               | `error.tsx`가 페이지 레벨에만 존재. 컴포넌트 레벨 에러 표시 없음   |
| **LoadingState**  | 로딩 상태 표준 컴포넌트               | 모든 페이지에서 `Loader2` 스피너를 인라인으로 반복 구현            |
| **ConfirmDialog** | 확인/취소 대화상자                    | 존재하지 않음. 삭제 등 위험 작업에 확인 절차 없음                  |
| **SuccessToast**  | 성공 알림 토스트                      | 존재하지 않음                                                      |
| **StatusBadge**   | 상태 뱃지 (성공/경고/에러/정보)       | channels에 `status-badge.tsx` 존재하지만 공유되지 않음             |
| **SectionHeader** | 섹션 제목 + 설명 + 우측 액션          | PageHeader보다 가벼운, 섹션 내 제목 컴포넌트                       |
| **TabBar**        | 표준 탭 UI                            | 각 페이지에서 자체 탭 스타일 구현                                  |
| **SearchInput**   | 검색 입력 필드                        | `.input` 클래스 + 아이콘을 매번 조합                               |
| **NumberDisplay** | KPI 숫자 강조 표시                    | 페이지마다 `text-xl`~`text-4xl` 다른 크기 사용                     |

---

## 2. 중복 UI 패턴

### 2.1 KPI 카드 패턴 (4가지 변형 발견)

| 변형                | 사용 위치                               | 스타일                                               |
| ------------------- | --------------------------------------- | ---------------------------------------------------- |
| 공유 `KpiCard`      | dashboard, comments                     | `text-xl font-semibold` + 미니 트렌드 차트           |
| 공유 `StatCard`     | (거의 미사용)                           | `text-xl font-semibold` + 변화율 텍스트              |
| `ChannelKpiCard`    | channels/[id]                           | 채널 전용 스타일                                     |
| `CompetitorKpiCard` | competitors                             | 경쟁자 전용 스타일                                   |
| 인라인 KPI          | geo-aeo, pipeline, intelligence/compare | `text-2xl`~`text-4xl` 다양한 크기. `rounded-xl` 사용 |

**통일 필요**: 하나의 `KpiCard`에 variant prop으로 관리해야 함.

### 2.2 검색 입력 패턴 (반복 구현)

동일한 "아이콘 + input + 버튼" 패턴이 최소 12개 페이지에서 반복:

- `intelligence/page.tsx`
- `intent/page.tsx`
- `pathfinder/page.tsx`
- `keywords/page.tsx`
- `cluster-finder/page.tsx`
- `persona/page.tsx`
- `road-view/page.tsx`
- `demographic/page.tsx`
- `category-entry/page.tsx`
- `geo-aeo/page.tsx`
- `listening-hub/page.tsx`
- `vertical-preview/page.tsx`

모두 `<Search />` 아이콘 + `<input>` + 분석 버튼 구조이지만, placeholder, 크기, 스타일이 각각 다름.

### 2.3 필터 탭 패턴

다수 페이지에서 수평 탭/필터를 자체 구현:

- `intelligence/page.tsx` - 산업 선택 탭
- `comments/page.tsx` - 감성/주제 필터
- `notifications/page.tsx` - 알림 유형 필터
- `intent/page.tsx` - 의도/시간 필터
- `channels/channels-list-view.tsx` - 상태/유형 필터

### 2.4 에러 메시지 처리 패턴

`channels/[id]/channel-detail-view.tsx`의 `getErrorMessage()` 함수가 영어 에러 문자열을 한국어로 매핑하는 패턴을 사용. 이 패턴이 다른 페이지에는 없어서, 다른 곳에서는 영어 에러가 그대로 노출될 위험이 있음.

```tsx
// channels/[id]/channel-detail-view.tsx:438-453
function getErrorMessage(error?: string): string {
  if (!error) return "데이터 수집에 실패했습니다.";
  if (error.includes("not configured")) { ... }
  if (error.includes("not found")) return "채널을 찾을 수 없어요...";
  if (error.includes("Unsupported")) return "아직 지원되지 않는 플랫폼이에요.";
  if (error.includes("Cannot extract")) return "URL에서 채널 정보를 추출할 수 없어요...";
  if (error.includes("quota") || error.includes("rate")) return "API 사용량 초과...";
  return error; // <-- 매핑 안 되면 영어 에러 그대로 노출
}
```

**필요**: 공통 에러 메시지 매핑 유틸리티.

---

## 3. 임시 구현 (목업/하드코딩 데이터)

### 3.1 MOCK 데이터 사용 파일

| 파일                                                          | MOCK 변수             | 상태                                  |
| ------------------------------------------------------------- | --------------------- | ------------------------------------- |
| `apps/web/src/app/(dashboard)/admin/ai/evals/page.tsx`        | `MOCK_EVAL_CASES`     | 평가 케이스 전체가 목업. API 미연동   |
| `apps/web/src/app/(dashboard)/admin/ai/prompts/page.tsx`      | `MOCK_PROMPTS`        | 프롬프트 목록 전체가 목업. API 미연동 |
| `apps/web/src/app/(dashboard)/insights/reports/page.tsx`      | `MOCK_REPORTS` import | 리포트 목록이 목업 데이터             |
| `apps/web/src/app/(dashboard)/insights/reports/[id]/page.tsx` | `MOCK_REPORTS` import | 리포트 상세가 목업 데이터             |
| `apps/web/src/app/reports/shared/[token]/page.tsx`            | `MOCK_REPORTS` import | 공유 리포트가 목업 데이터             |
| `apps/web/src/lib/reports/mock-data.ts`                       | `MOCK_REPORTS` 정의   | 목업 데이터 소스 파일                 |
| `apps/web/src/lib/reports/report-repository.ts`               | `MOCK_REPORTS` import | 저장소까지 목업에 의존                |

### 3.2 하드코딩된 기본값

| 파일                | 줄  | 내용                                          |
| ------------------- | --- | --------------------------------------------- |
| `settings/page.tsx` | 10  | `value: "My Workspace"` - 영어 기본값         |
| `settings/page.tsx` | 11  | `value: "my-workspace"` - 영어 slug           |
| `page.tsx` (랜딩)   | 11  | "Social Media Analytics & Listening Platform" |
| `channels/page.tsx` | 31  | `country: "KR"` - 하드코딩된 국가             |
| `channels/page.tsx` | 32  | `category: ""` - 빈 카테고리                  |

### 3.3 TODO/FIXME 코멘트

| 파일                           | 줄  | 내용                                                                             |
| ------------------------------ | --- | -------------------------------------------------------------------------------- |
| `admin/ai/page.tsx`            | 160 | `// TODO: 실제 API 연동 시 fetch("/api/ai/logs?type=stats")로 교체`              |
| `dashboard/page.tsx`           | 117 | `// TODO: Populate from channel snapshots when historical data exists`           |
| `dashboard/dashboard-view.tsx` | 431 | `// Both states show empty placeholder — real actions come from tRPC in Phase 9` |

### 3.4 미완성 기능

| 파일/영역                                           | 설명                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `dashboard/dashboard-view.tsx` - RecommendedActions | Phase 9 예정으로 목업 상태. 하드코딩된 "콘텐츠 제작", "리스크 대응", "SEO 최적화" 라벨만 표시 |
| `insights/reports/*`                                | 전체 리포트 시스템이 `MOCK_REPORTS`에 의존. 생성/수정/삭제 모두 동작하지 않음                 |
| `admin/ai/evals`                                    | 평가 시스템 전체가 목업                                                                       |
| `admin/ai/prompts`                                  | 프롬프트 관리 전체가 목업                                                                     |

---

## 4. 에러 패턴 및 리스크

### 4.1 에러 바운더리

- **페이지 레벨**: `apps/web/src/app/(dashboard)/error.tsx` 1개만 존재
- **컴포넌트 레벨**: ErrorBoundary 없음
- **리스크**: 컴포넌트 내부 에러 시 전체 페이지가 에러 상태로 전환

### 4.2 에러 메시지 영어 노출 위험

```
channels/[id]/channel-detail-view.tsx:453 - return error; (매핑 안 된 에러 그대로 반환)
cluster-finder/page.tsx:131 - "GPT 분석 결과가 없습니다" (습니다 체)
channels/[id]/channel-detail-view.tsx:439 - "데이터 수집에 실패했습니다" (습니다 체)
channels/[id]/channel-detail-view.tsx:479 - "동기화 요청에 실패했습니다" (습니다 체)
```

### 4.3 세션/인증 에러 처리

- `listening-hub/page.tsx` - `res.type === "opaqueredirect"` 체크로 세션 만료 감지
- 다른 페이지에서는 세션 만료 처리가 없을 가능성
- tRPC 기반 페이지는 tRPC의 에러 처리에 의존하지만, fetch 직접 호출 페이지는 수동 처리 필요

### 4.4 Null/Undefined 접근 리스크

```tsx
// channels/page.tsx - optional chaining으로 방어하고 있으나
ch.platform?.toLowerCase() ?? "youtube"; // platform이 null이면 "youtube" 기본값
ch.channelType?.toLowerCase() ?? "owned"; // channelType이 null이면 "owned" 기본값
ch.subscriberCount ?? 0; // subscriberCount가 null이면 0
```

이 패턴은 데이터가 불완전할 때 "거짓 안전"을 제공. 실제로는 채널에 구독자 수가 0인지 데이터가 없는 건지 구분 불가.

---

## 5. 하드코딩 색상 현황 (CSS 변수 미사용)

### 가장 빈번한 하드코딩 색상

| 색상                              | 사용 횟수 (추정) | 주요 사용 위치                                                |
| --------------------------------- | ---------------- | ------------------------------------------------------------- |
| `text-gray-900`                   | 20+              | pipeline, category-entry, demographic, geo-aeo, notifications |
| `text-gray-500` / `text-gray-600` | 20+              | 동일                                                          |
| `bg-indigo-600`                   | 10+              | geo-aeo, settings/notifications, 랜딩 페이지                  |
| `text-indigo-600`                 | 10+              | geo-aeo, intelligence                                         |
| `bg-blue-50` / `text-blue-700`    | 15+              | 다수 페이지                                                   |
| `bg-white`                        | 10+              | intelligence, pathfinder (토큰: `var(--card)`)                |
| `text-emerald-600`                | 5+               | geo-aeo, settings/usage                                       |
| `bg-gray-100` / `bg-gray-300`     | 5+               | notifications, dashboard                                      |

**교체 매핑**:

```
text-gray-900     -> text-[var(--foreground)]
text-gray-500/600 -> text-[var(--muted-foreground)]
bg-gray-100       -> bg-[var(--secondary)]
bg-white          -> bg-[var(--card)]
border-gray-200   -> border-[var(--border)]
bg-indigo-600     -> bg-[var(--primary)] (또는 새 --accent 토큰)
```

---

## 6. 모서리 반경 불일치

| 반경                 | 사용 위치                                      | 표준 여부       |
| -------------------- | ---------------------------------------------- | --------------- |
| `rounded-md` (6px)   | 버튼, 입력, 뱃지, 작은 요소                    | O - 작은 요소용 |
| `rounded-lg` (8px)   | `.card` 클래스, 대부분의 카드                  | O - 카드 표준   |
| `rounded-xl` (12px)  | geo-aeo, intelligence, notifications, pipeline | X - 비표준      |
| `rounded-2xl` (16px) | intelligence (헤더)                            | X - 비표준      |
| `rounded-full`       | 뱃지, 아바타                                   | O - 원형 요소용 |

**통일 필요**: `rounded-xl`과 `rounded-2xl`을 `rounded-lg`로 교체.

---

## 7. 파일 크기 기술 부채

500줄 이상의 페이지 파일은 분리가 필요함.

| 파일                           | 줄 수 | 분리 우선순위 |
| ------------------------------ | ----- | ------------- |
| `intelligence/page.tsx`        | 1,292 | 높음          |
| `dashboard/dashboard-view.tsx` | 1,006 | 높음          |
| `vertical-preview/page.tsx`    | 1,003 | 중간          |
| `pathfinder/page.tsx`          | 922   | 중간          |
| `channels/new/page.tsx`        | 734+  | 중간          |
| `geo-aeo/page.tsx`             | 668   | 낮음          |

---

## 8. 컴포넌트 수 불균형

- `components/intelligence/` - 26개 컴포넌트 (과도한 세분화?)
- `components/shared/` - 8개 컴포넌트 (부족)
- `components/dashboard/` - 7개 컴포넌트
- `components/channels/` - 12개 컴포넌트
- `components/comments/` - 6개 컴포넌트
- `components/insights/` - 5개 컴포넌트
- `components/listening-hub/` - 8개 컴포넌트
- `components/layout/` - 4개 컴포넌트
- `components/collection/` - 5개 컴포넌트
- `components/competitors/` - 5개 컴포넌트
- `components/reports/` - 존재 (email-send-dialog 등)

**총 컴포넌트**: 약 97개 (페이지 내 인라인 컴포넌트 미포함)

### 권장 사항

1. `components/shared/`에 10~15개의 핵심 공유 컴포넌트 추가
2. 페이지 내 인라인 컴포넌트를 해당 기능 폴더로 분리
3. `intelligence/` 26개 컴포넌트 중 일부를 shared로 승격 (ChartCard 패턴 등)

---

## 9. 우선순위별 조치 계획

### 즉시 (1~2일)

1. `LoadingState`, `ErrorState` 공유 컴포넌트 생성
2. 랜딩 페이지 영어 텍스트 수정
3. settings 페이지 하드코딩 값 수정

### 단기 (1주)

4. `FilterBar`, `SearchInput`, `TabBar` 공유 컴포넌트 생성
5. KpiCard 변형 통합
6. 차트 색상 CSS 변수 추가

### 중기 (2~3주)

7. intelligence/page.tsx 파일 분리
8. dashboard-view.tsx 파일 분리
9. MOCK 데이터를 실제 API로 교체 (reports)
10. 모든 하드코딩 색상 CSS 변수로 교체

### 장기 (1개월)

11. 컴포넌트 레벨 ErrorBoundary 도입
12. 에러 메시지 매핑 유틸리티 공통화
13. ConfirmDialog, SuccessToast 도입
14. 모든 모서리 반경 표준화
