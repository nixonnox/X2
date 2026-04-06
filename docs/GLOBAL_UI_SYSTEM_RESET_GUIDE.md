# 글로벌 UI 시스템 리셋 가이드

> X2 프로젝트 전체에 적용할 통합 디자인 시스템 정의서
> 모든 페이지가 이 기준을 따라야 한다.

---

## 1. 폰트 시스템

현재 X2는 `Inter` 폰트를 기본으로 사용하며 (`apps/web/src/app/layout.tsx`), `font-sans`로 적용된다.

### 타이포그래피 스케일

| 역할          | Tailwind 클래스                | 크기 | 용도                    | 현재 상태                                                                               |
| ------------- | ------------------------------ | ---- | ----------------------- | --------------------------------------------------------------------------------------- |
| 페이지 타이틀 | `text-2xl font-bold`           | 24px | 각 페이지의 최상위 제목 | 현재 `text-xl`~`text-2xl` 혼용. PageHeader 컴포넌트는 `text-lg font-semibold`를 사용 중 |
| 섹션 타이틀   | `text-lg font-semibold`        | 18px | 카드 그룹, 영역 제목    | `text-lg`로 비교적 일관적                                                               |
| 카드 타이틀   | `text-sm font-semibold` (14px) | 14px | 개별 카드 내부 제목     | ChartCard는 `text-[13px] font-semibold` 사용 중                                         |
| 본문 텍스트   | `text-sm`                      | 14px | 설명, 단락 텍스트       | `text-[13px]`과 `text-sm` 혼용                                                          |
| 캡션/도움말   | `text-xs`                      | 12px | 보조 설명, 타임스탬프   | `text-[11px]`~`text-xs` 혼용                                                            |
| 소형 라벨     | `text-[11px]`                  | 11px | KPI 라벨, 뱃지, 변화율  | KpiCard/StatCard에서 일관 사용                                                          |
| 숫자 강조     | `text-3xl font-bold`           | 30px | KPI 대형 숫자           | `text-xl`~`text-4xl` 혼용                                                               |
| 필터/태그     | `text-xs font-medium`          | 12px | 필터 버튼, 태그 라벨    | `text-[11px]`~`text-xs` 혼용                                                            |

### 표준 적용 규칙

```
페이지 타이틀:  text-2xl font-bold tracking-tight text-[var(--foreground)]
섹션 타이틀:    text-lg font-semibold text-[var(--foreground)]
카드 타이틀:    text-sm font-semibold text-[var(--foreground)]
본문:          text-sm text-[var(--foreground)]
본문 보조:      text-sm text-[var(--muted-foreground)]
캡션:          text-xs text-[var(--muted-foreground)]
라벨:          text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]
숫자 강조:      text-3xl font-bold text-[var(--foreground)]
필터/태그:      text-xs font-medium
```

### 현재 문제점 및 조정 제안

1. **PageHeader 컴포넌트** (`components/shared/page-header.tsx`)가 `text-lg font-semibold`를 사용하지만, 개별 페이지에서 `text-xl font-bold`로 직접 제목을 만드는 경우가 다수 (pipeline, category-entry, geo-aeo, notifications 등). PageHeader를 `text-2xl font-bold`로 통일하고, 모든 페이지가 PageHeader를 사용해야 한다.
2. **본문 텍스트**에서 `text-[13px]`와 `text-sm`(14px)이 혼용. `text-sm`으로 통일한다.
3. **캡션**에서 `text-[11px]`와 `text-xs`(12px)이 혼용. 뱃지/라벨은 `text-[11px]`, 도움말 텍스트는 `text-xs`로 구분한다.

---

## 2. 레이아웃 계층 구조

모든 대시보드 페이지는 다음 계층을 따른다.

```
<main className="space-y-6">
  <!-- 1. 페이지 헤더 영역 -->
  <PageHeader title="..." description="..." guide="..." />

  <!-- 2. 요약/KPI 영역 (선택) -->
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    <KpiCard ... />
  </div>

  <!-- 3. 필터 바 (선택) -->
  <div className="flex items-center gap-3">
    <!-- 검색, 필터, 정렬 -->
  </div>

  <!-- 4. 메인 콘텐츠 -->
  <div className="grid gap-4 lg:grid-cols-2">
    <!-- 차트, 테이블, 카드 등 -->
  </div>

  <!-- 5. 상세 패널 (선택) -->
  <!-- 슬라이드 오버 또는 하단 확장 -->
</main>
```

### 섹션 간 간격 규칙

| 위치                    | 간격 | Tailwind                 |
| ----------------------- | ---- | ------------------------ |
| 페이지 최상위 섹션 간격 | 24px | `space-y-6`              |
| 카드 그리드 간격        | 16px | `gap-4`                  |
| 카드 내부 요소 간격     | 12px | `space-y-3`              |
| 긴밀 관련 요소          | 8px  | `space-y-2` 또는 `gap-2` |
| 라벨-값 간격            | 4px  | `mt-1`                   |

### 현재 문제점

- `space-y-2`, `space-y-3`, `space-y-4`, `space-y-6`, `space-y-8`이 페이지마다 다르게 사용됨
- 일부 페이지는 PageHeader를 사용하지 않고 직접 `<h1>` 태그를 작성
- KPI 그리드 열 수가 페이지마다 다름 (2열, 3열, 4열, 5열, 6열)

---

## 3. 카드 구조 표준

### 기본 카드 (.card 클래스)

현재 `globals.css`에 정의됨: `rounded-lg border border-[var(--border)] bg-white`

### 카드 유형별 구조

#### KPI 카드

```
<div className="card p-4">
  <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
    {라벨}
  </p>
  <p className="mt-2 text-xl font-semibold text-[var(--foreground)]">
    {값}
  </p>
  <p className="mt-0.5 text-[11px] font-medium text-[var(--success)]">
    {변화율}
  </p>
</div>
```

#### 차트 카드

```
<div className="card p-4">
  <h3 className="text-sm font-semibold text-[var(--foreground)]">{제목}</h3>
  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{설명}</p>
  <div className="mt-3">{차트}</div>
</div>
```

#### 인사이트 카드

```
<div className="card p-4">
  <div className="flex items-start gap-3">
    <div className="아이콘 영역" />
    <div className="flex-1">
      <h3 className="text-sm font-semibold">{제목}</h3>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{설명 1줄}</p>
      <div className="mt-3">{CTA 버튼 또는 상태 라벨}</div>
    </div>
  </div>
</div>
```

### 카드 표준 속성

| 속성      | 값                              | 비고                           |
| --------- | ------------------------------- | ------------------------------ |
| 내부 패딩 | `p-4` (16px) 또는 `p-5` (20px)  | 작은 카드는 p-4, 큰 카드는 p-5 |
| 테두리    | `border border-[var(--border)]` | 기본. 강조 시 `border-2`       |
| 모서리    | `rounded-lg` (8px)              | 전체 통일                      |
| 배경      | `bg-white`                      | 토큰: `var(--card)`            |
| 그림자    | 없음 (기본)                     | hover 시 `shadow-sm` 선택적    |

### 현재 문제점

- `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`이 페이지마다 혼용
- 일부 페이지에서 `.card` 클래스 대신 직접 스타일링
- 카드 내부 패딩이 `p-3`~`p-6`까지 다양

---

## 4. 간격 & 밀도

### 기본 원칙: "여유 있게, 답답하지 않게"

| 항목              | 표준               | 허용 범위          |
| ----------------- | ------------------ | ------------------ |
| 섹션 간격         | `space-y-6` (24px) | space-y-6 고정     |
| 카드 그리드 간격  | `gap-4` (16px)     | gap-4 고정         |
| 카드 내부 패딩    | `p-4` (16px)       | p-4 또는 p-5       |
| 필터 바 내부 간격 | `gap-3` (12px)     | gap-2 ~ gap-3      |
| 텍스트 줄 간격    | `leading-relaxed`  | 설명 텍스트에 적용 |
| 버튼 패딩         | `px-3.5 py-1.5`    | 기본 버튼 기준     |

---

## 5. 시각화 스타일

### 차트 색상 팔레트 (6색)

```css
--chart-1: #3b82f6; /* 파랑 - 주요 지표 */
--chart-2: #10b981; /* 에메랄드 - 긍정/성장 */
--chart-3: #f59e0b; /* 앰버 - 경고/비교 */
--chart-4: #8b5cf6; /* 보라 - 보조 지표 */
--chart-5: #ef4444; /* 빨강 - 부정/하락 */
--chart-6: #6b7280; /* 회색 - 비활성/기타 */
```

### 현재 사용 중인 색상 분석

- Intelligence 페이지: `bg-pink-500`, `bg-orange-500`, `bg-blue-500`, `bg-purple-500`
- Intent 페이지: `#3b82f6`, `#f59e0b`, `#10b981`, `#ef4444`, `#6b7280`
- Pathfinder 페이지: `#8b5cf6`, `#3b82f6`, `#10b981`
- Geo-AEO 페이지: `bg-indigo-600`, `bg-emerald-600`, `bg-red-500`

### 시각화 규칙

1. **범례(Legend)**: 차트 하단에 배치. `text-xs text-[var(--muted-foreground)]`
2. **라벨**: X/Y축 라벨은 `text-[11px]` 사용
3. **툴팁 스타일**:
   ```
   배경: bg-white
   테두리: border border-[var(--border)]
   모서리: rounded-lg
   그림자: shadow-lg
   텍스트: text-xs
   패딩: px-3 py-2
   ```
4. **"해석 우선, 장식 배제"** 원칙:
   - 불필요한 그리드 라인 제거
   - 데이터 포인트에 의미 있는 라벨만 표시
   - 차트 제목에 "무엇을 보여주는지" 명시
   - 차트 하단에 1줄 해석 추가

---

## 6. 필터/탭/테이블 규칙

### 필터 바

- **위치**: 항상 메인 콘텐츠 위 (KPI 카드 아래)
- **구조**: 수평 정렬 (`flex items-center gap-3`)
- **검색 입력**: `.input` 클래스 사용
- **필터 버튼**: `btn-secondary` 또는 드롭다운
- **초기화 버튼**: 우측 끝에 배치, 보조 스타일

### 탭

- **기본 스타일**: 하단 보더 탭
  ```
  활성: border-b-2 border-[var(--foreground)] font-semibold text-[var(--foreground)]
  비활성: text-[var(--muted-foreground)] hover:text-[var(--foreground)]
  텍스트: text-sm
  간격: gap-6
  ```

### 테이블

- **원칙**: "가독성 > 원시 데이터"
- **헤더**: `text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]`
- **셀**: `text-sm text-[var(--foreground)]`
- **행 간격**: `py-3 px-4`
- **구분선**: `border-b border-[var(--border-subtle)]`
- **호버**: `hover:bg-[var(--secondary)]`
- **빈 상태**: EmptyState 컴포넌트 사용

---

## 7. 현재 CSS 변수 분석 및 조정 제안

### 현재 디자인 토큰 (`apps/web/src/styles/tokens.css`)

```css
:root {
  /* Surface */
  --background: #fafafa;
  --foreground: #171717;
  --card: #ffffff;
  --card-foreground: #171717;

  /* Brand */
  --primary: #171717;
  --primary-foreground: #ffffff;

  /* Subtle surfaces */
  --secondary: #f5f5f5;
  --muted: #f5f5f5;
  --muted-foreground: #737373;

  /* Semantic */
  --destructive: #dc2626;
  --success: #16a34a;
  --warning: #d97706;

  /* Chrome */
  --border: #e5e5e5;
  --border-subtle: #f0f0f0;

  /* Radius */
  --radius: 0.375rem;
  --radius-lg: 0.5rem;
}
```

### 조정 제안

1. **차트 색상 토큰 추가** (현재 없음):

   ```css
   --chart-1: #3b82f6;
   --chart-2: #10b981;
   --chart-3: #f59e0b;
   --chart-4: #8b5cf6;
   --chart-5: #ef4444;
   --chart-6: #6b7280;
   ```

2. **하드코딩된 색상 제거**: 현재 `text-gray-900`, `bg-indigo-600`, `text-blue-700` 등 Tailwind 기본 색상이 토큰 없이 직접 사용됨. 모두 CSS 변수로 교체해야 함.
   - `text-gray-900` -> `text-[var(--foreground)]`
   - `bg-indigo-600` -> `bg-[var(--primary)]` 또는 새로운 `--accent` 토큰
   - `text-gray-500` -> `text-[var(--muted-foreground)]`

3. **강조 색상 토큰 추가**:

   ```css
   --accent-blue: #3b82f6;
   --accent-blue-bg: #eff6ff;
   ```

4. **globals.css의 `.card` 클래스 보강**:
   ```css
   .card-hover {
     @apply card transition-shadow hover:shadow-sm;
   }
   ```

---

## 8. 컴포넌트 사용 규칙

### 필수 사용 공유 컴포넌트

| 컴포넌트     | 파일                                | 용도        | 사용하지 않는 페이지                                                                                                                 |
| ------------ | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `PageHeader` | `components/shared/page-header.tsx` | 페이지 제목 | pipeline, category-entry, geo-aeo, demographic, notifications, settings/notifications, settings/usage, intelligence/compare, billing |
| `EmptyState` | `components/shared/empty-state.tsx` | 빈 상태     | 일부 페이지에서 인라인 빈 상태                                                                                                       |
| `KpiCard`    | `components/shared/kpi-card.tsx`    | KPI 표시    | geo-aeo, pipeline에서 자체 KPI 구현                                                                                                  |
| `ChartCard`  | `components/shared/chart-card.tsx`  | 차트 래퍼   | 다수 페이지에서 직접 차트 영역 구현                                                                                                  |
| `StatCard`   | `components/shared/stat-card.tsx`   | 통계 카드   | 거의 사용되지 않음                                                                                                                   |

### 금지 패턴

- 직접 `<h1>` 태그로 페이지 제목 작성 (PageHeader 사용할 것)
- `text-gray-*`, `bg-gray-*` 등 Tailwind 기본 색상 직접 사용 (CSS 변수 사용할 것)
- `rounded-xl`, `rounded-2xl` 등 카드에 사용 (통일: `rounded-lg`)
- 인라인 빈 상태 UI (EmptyState 컴포넌트 사용할 것)
