# UX 라이팅 적용 현황 보고서

> X2 프로젝트 전체 텍스트 일관성 점검 및 표준 메시지 정의

---

## 1. UX 라이팅 규칙

### 기본 원칙

| 규칙                 | 설명                                  | 예시                                                     |
| -------------------- | ------------------------------------- | -------------------------------------------------------- |
| 전체 한국어 (해요체) | 모든 UI 텍스트는 한국어 해요체        | "분석이 완료됐어요" (O) / "Analysis Complete" (X)        |
| 쉬운 단어            | 전문 용어 사용 금지, 일반 사용자 관점 | "검색 결과" (O) / "쿼리 결과" (X)                        |
| 행동 중심 버튼       | 버튼은 동작을 명확히                  | "분석 시작하기" (O) / "Submit" (X)                       |
| 영어 라벨 금지       | 모든 라벨/제목은 한국어               | "키워드" (O) / "Keywords" (X)                            |
| 개발자 용어 금지     | 에러 메시지에 기술 용어 사용 금지     | "문제가 발생했어요" (O) / "Internal Server Error" (X)    |
| 번역체 금지          | 자연스러운 한국어                     | "데이터가 없어요" (O) / "데이터가 존재하지 않습니다" (X) |
| 일관된 상태 메시지   | 빈/에러/로딩/부분 상태 통일           | 아래 표준 메시지 참고                                    |

---

## 2. 영어 문자열 전수 조사

### 2.1 랜딩 페이지

| 파일                            | 줄  | 영어 문자열                                                       | 심각도                      |
| ------------------------------- | --- | ----------------------------------------------------------------- | --------------------------- |
| `apps/web/src/app/page.tsx`     | 11  | `"Social Media Analytics & Listening Platform"`                   | 높음 - 사용자에게 바로 노출 |
| `apps/web/src/app/layout.tsx`   | 12  | `"X2 - Social Media Analytics"` (메타 타이틀)                     | 중간                        |
| `apps/web/src/lib/constants.ts` | 2   | `APP_DESCRIPTION = "Social Media Analytics & Listening Platform"` | 중간                        |

### 2.2 설정 페이지

| 파일                                             | 줄  | 영어 문자열                            | 심각도             |
| ------------------------------------------------ | --- | -------------------------------------- | ------------------ |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | 10  | `value: "My Workspace"` (기본값)       | 높음               |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | 11  | `label: "Slug", value: "my-workspace"` | 높음 - 라벨이 영어 |

### 2.3 알림 페이지

| 파일                                                  | 줄  | 영어 문자열                                        | 심각도 |
| ----------------------------------------------------- | --- | -------------------------------------------------- | ------ |
| `apps/web/src/app/(dashboard)/notifications/page.tsx` | 378 | `"Intelligence Alert: "` (제거 시 사용되는 접두사) | 중간   |
| `apps/web/src/components/layout/top-bar.tsx`          | 235 | `"Intelligence Alert: "` (동일)                    | 중간   |

### 2.4 관리자 AI 페이지

| 파일                                                     | 줄  | 영어 문자열                       | 심각도           |
| -------------------------------------------------------- | --- | --------------------------------- | ---------------- |
| `apps/web/src/app/(dashboard)/admin/ai/page.tsx`         | 75  | `displayName: "OpenAI"`           | 낮음 (고유명사)  |
| `apps/web/src/app/(dashboard)/admin/ai/page.tsx`         | 82  | `displayName: "Anthropic Claude"` | 낮음 (고유명사)  |
| `apps/web/src/app/(dashboard)/admin/ai/prompts/page.tsx` | 113 | `en: "English"`                   | 낮음 (언어 이름) |

### 2.5 next-intl 번역 파일 미적용 페이지

다수 페이지가 `useTranslations`를 사용하지만, 다음 페이지들은 번역 시스템을 사용하지 않고 한국어를 직접 하드코딩:

| 페이지                           | i18n 사용 여부            |
| -------------------------------- | ------------------------- |
| `intelligence/page.tsx` (1292줄) | 미사용 - 한국어 직접 작성 |
| `pathfinder/page.tsx` (922줄)    | 미사용                    |
| `intent/page.tsx`                | 미사용                    |
| `cluster-finder/page.tsx`        | 미사용                    |
| `persona/page.tsx`               | 미사용                    |
| `road-view/page.tsx`             | 미사용                    |
| `demographic/page.tsx`           | 미사용                    |
| `category-entry/page.tsx`        | 미사용                    |
| `geo-aeo/page.tsx`               | 미사용                    |
| `listening-hub/page.tsx`         | 미사용                    |
| `start/page.tsx`                 | 미사용                    |
| `vertical-preview/page.tsx`      | 미사용                    |
| `notifications/page.tsx`         | 미사용                    |
| `insights/*.tsx`                 | 미사용                    |

> 참고: 현재 프로젝트는 한국어 단일 언어로 운영되므로, i18n 미적용 자체가 문제는 아니지만 메시지 일관성을 위해 상수 파일로 분리하는 것을 권장.

### 2.6 혼용 패턴

| 유형                           | 예시 파일                                   | 내용                                                                             |
| ------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------- |
| 영어 코멘트가 UI에 노출될 위험 | `dashboard/page.tsx:117`                    | `// TODO: Populate from channel snapshots`                                       |
| 영어 placeholder 접두사        | `dashboard/dashboard-view.tsx:431`          | `// Both states show empty placeholder — real actions come from tRPC in Phase 9` |
| 에러 메시지 내 영어            | `channels/[id]/channel-detail-view.tsx:449` | `error.includes("Cannot extract")`                                               |

---

## 3. 표준 메시지 템플릿

### 3.1 빈 상태 (데이터 없음)

```tsx
// 기본 빈 상태
<EmptyState
  icon={SearchIcon}
  title="아직 데이터가 없어요"
  description="분석할 데이터가 준비되면 여기에 표시돼요."
/>

// 검색 결과 없음
<EmptyState
  icon={SearchIcon}
  title="검색 결과가 없어요"
  description="다른 키워드로 다시 검색해보세요."
/>

// 첫 사용 안내
<EmptyState
  icon={PlusIcon}
  title="아직 등록된 채널이 없어요"
  description="채널을 등록하면 성과 분석이 시작돼요."
  action={<button className="btn-primary">채널 등록하기</button>}
/>

// 필터 결과 없음
<EmptyState
  icon={FilterIcon}
  title="조건에 맞는 결과가 없어요"
  description="필터를 변경하거나 초기화해보세요."
  action={<button className="btn-secondary">필터 초기화</button>}
/>
```

### 3.2 로딩 상태

```tsx
// 페이지 전체 로딩
<div className="flex h-64 items-center justify-center">
  <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
</div>

// 카드 내부 로딩
<div className="card flex h-32 items-center justify-center">
  <div className="text-center">
    <Loader2 className="mx-auto h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
    <p className="mt-2 text-xs text-[var(--muted-foreground)]">데이터를 불러오고 있어요...</p>
  </div>
</div>

// 분석 진행 중
<div className="text-center">
  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[var(--primary)]" />
  <p className="mt-2 text-sm font-medium">분석 중이에요...</p>
  <p className="mt-1 text-xs text-[var(--muted-foreground)]">잠시만 기다려주세요.</p>
</div>
```

### 3.3 에러 상태

```tsx
// 일반 에러
{
  title: "문제가 발생했어요",
  description: "데이터를 불러오는 중 오류가 있었어요. 잠시 후 다시 시도해주세요.",
  action: "다시 시도"
}

// 네트워크 에러
{
  title: "연결이 불안정해요",
  description: "인터넷 연결을 확인하고 다시 시도해주세요.",
  action: "다시 시도"
}

// 권한 에러
{
  title: "접근 권한이 없어요",
  description: "이 페이지를 보려면 관리자 권한이 필요해요.",
  action: "돌아가기"
}

// 세션 만료
{
  title: "세션이 만료됐어요",
  description: "다시 로그인해주세요.",
  action: "로그인"
}

// 페이지 로드 오류 (현재 error.tsx)
{
  title: "페이지 로드 중 오류 발생",
  description: "데이터를 불러오는 중 문제가 발생했어요.",
  action: "다시 시도"
}
```

### 3.4 부분 데이터 상태

```tsx
// 일부 데이터만 로드
{
  title: "일부 데이터만 표시되고 있어요",
  description: "전체 데이터가 준비되면 자동으로 업데이트돼요."
}

// 데이터 수집 중
{
  title: "데이터를 수집하고 있어요",
  description: "최초 분석에는 시간이 걸릴 수 있어요. 완료되면 알림을 보내드려요."
}

// 이전 데이터 표시
{
  badge: "마지막 업데이트: 2시간 전",
  description: "최신 데이터를 불러오는 중이에요."
}
```

### 3.5 성공 알림

```tsx
// 저장 성공
"저장했어요";

// 채널 등록 성공
"채널이 등록됐어요. 데이터 수집이 시작돼요.";

// 분석 완료
"분석이 완료됐어요";

// 삭제 성공
"삭제했어요";

// 내보내기 성공
"파일을 다운로드했어요";

// 복사 성공
"클립보드에 복사했어요";
```

### 3.6 확인 대화상자

```tsx
// 삭제 확인
{
  title: "정말 삭제할까요?",
  description: "삭제하면 되돌릴 수 없어요.",
  confirm: "삭제하기",
  cancel: "취소"
}

// 페이지 이탈 확인
{
  title: "변경사항이 저장되지 않았어요",
  description: "이 페이지를 떠나면 작성 중인 내용이 사라져요.",
  confirm: "떠나기",
  cancel: "계속 작성"
}

// 작업 취소 확인
{
  title: "분석을 취소할까요?",
  description: "진행 중인 분석이 중단돼요.",
  confirm: "취소하기",
  cancel: "계속 진행"
}
```

### 3.7 필터 초기화

```tsx
// 필터 초기화 버튼
"필터 초기화";

// 필터 초기화 후 메시지
"필터가 초기화됐어요";

// 날짜 범위 초기화
"기간을 초기화했어요";
```

---

## 4. 버튼 텍스트 표준

### 주요 동작

| 동작        | 표준 텍스트         | 금지 표현           |
| ----------- | ------------------- | ------------------- |
| 생성        | `~하기`, `등록하기` | Create, Add, Submit |
| 저장        | `저장하기`          | Save, Update        |
| 삭제        | `삭제하기`          | Delete, Remove      |
| 취소        | `취소`              | Cancel              |
| 확인        | `확인`              | OK, Confirm         |
| 검색        | `검색`              | Search              |
| 분석 시작   | `분석 시작하기`     | Analyze, Start      |
| 내보내기    | `내보내기`          | Export, Download    |
| 더 보기     | `더 보기`           | View More, Show All |
| 뒤로        | `뒤로 가기`         | Back, Go Back       |
| 다시 시도   | `다시 시도`         | Retry, Try Again    |
| 필터 초기화 | `필터 초기화`       | Reset, Clear        |

---

## 5. 우선 수정 대상

### 즉시 수정 (사용자 직접 노출)

1. `apps/web/src/app/page.tsx:11` - "Social Media Analytics & Listening Platform" -> "소셜 미디어 분석 & 리스닝 플랫폼"
2. `apps/web/src/app/(dashboard)/settings/page.tsx:10` - "My Workspace" -> "내 워크스페이스"
3. `apps/web/src/app/(dashboard)/settings/page.tsx:11` - 라벨 "Slug" -> "워크스페이스 주소" 또는 제거
4. `apps/web/src/lib/constants.ts:2` - APP_DESCRIPTION 한국어화

### 단기 수정 (1~2일)

5. `notifications/page.tsx:378` / `top-bar.tsx:235` - "Intelligence Alert: " 접두사 한국어화
6. 에러 메시지 내 영어 패턴 (`"Cannot extract"`) 한국어화

### 중기 수정 (표준 메시지 적용)

7. 모든 페이지의 빈 상태 메시지를 EmptyState 컴포넌트 + 표준 메시지로 통일
8. 로딩 상태 메시지 통일
9. 에러 상태 메시지 통일
