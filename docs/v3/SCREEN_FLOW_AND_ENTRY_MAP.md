# Screen Flow & Entry Map (Phase 8)

## 3가지 진입 경로

USER_JOURNEY_3PATHS.md에 정의된 3가지 분석 시작점을 `/start` 허브에서 제공한다.

```
/start
  ├─ Path A: 소셜 채널 분석 → /channels/new → /channels → /dashboard
  ├─ Path B: 소셜 리스닝    → /keywords → /intent → /insights
  └─ Path C: 댓글/이슈 분석  → /comments → /comments/faq → /insights
```

---

## 전체 화면 흐름도

```
Landing (/start)
    │
    ├─→ [A] Channel Registration (/channels/new)
    │       → Channel List (/channels)
    │       → Channel Detail (/channels/[id])
    │
    ├─→ [B] Keyword Analysis (/keywords)
    │       → Intent Analysis (/intent)
    │       → GEO/AEO (/geo-aeo)
    │
    └─→ [C] Comment Analysis (/comments)
            → FAQ & Issues (/comments/faq)

        ↓ (모든 경로 수렴)

    Home Dashboard (/dashboard)
        │
        ├─→ Insights (/insights)
        │       ├─ Tab: 인사이트 목록
        │       ├─ Tab: 액션 목록
        │       ├─ Tab: 에비던스 번들 → "근거 기반 리포트 생성" CTA
        │       └─ Footer: "분석 결과를 리포트로 정리하세요" → /insights/reports/new
        │
        ├─→ Reports (/reports)
        │       └─ Report Detail (/reports/[id])
        │
        ├─→ Campaigns (/campaigns)
        │       └─ 인플루언서 / 콘텐츠 / 광고
        │
        └─→ Admin (/admin/collection)
                └─ 파이프라인 / AI분석 / 리포트 / 플랜
```

---

## 페이지별 Entry/Exit 매핑

| 페이지              | 진입 경로                    | 주요 CTA (Exit)                               |
| ------------------- | ---------------------------- | --------------------------------------------- |
| `/start`            | 네비게이션, 첫 방문          | → `/channels/new`, `/keywords`, `/comments`   |
| `/dashboard`        | 네비게이션, 분석 완료 후     | → `/insights`, `/reports`, `/campaigns`       |
| `/channels/new`     | Start Hub Path A             | → `/channels` (등록 완료)                     |
| `/channels`         | 네비게이션                   | → `/channels/[id]` (상세)                     |
| `/keywords`         | Start Hub Path B, 네비게이션 | → `/intent` (의도 분석)                       |
| `/intent`           | 키워드 분석 후               | → `/geo-aeo`, `/insights`                     |
| `/geo-aeo`          | 의도 분석 후, 대시보드       | → `/insights` (최적화 액션)                   |
| `/comments`         | Start Hub Path C, 네비게이션 | → `/comments/faq`                             |
| `/comments/faq`     | 댓글 분석 후                 | → `/insights` (액션 확인)                     |
| `/insights`         | 대시보드, 분석 완료 후       | → `/reports` (리포트 생성), Evidence 드릴다운 |
| `/reports`          | 인사이트 후, 네비게이션      | → 리포트 상세, PDF/PPT 다운로드               |
| `/campaigns`        | 대시보드, 액션에서           | → 캠페인 상세 (Phase 9)                       |
| `/admin/collection` | 네비게이션 (Admin)           | → 파이프라인 상세 (Phase 9)                   |

---

## 데이터 상태별 화면 분기

```
사용자 방문
    │
    ├─ 채널 0개 → /start (허브)
    │
    ├─ 채널 있음 + 수집 전 → /dashboard (수집 대기 안내)
    │
    ├─ 수집 완료 + 분석 전 → /dashboard (분석 진행 안내)
    │
    └─ 분석 완료 → /dashboard (인사이트 + 액션 표시)
```

---

## 인사이트 플로우 상세

```
InsightGenerationService
    → 8개 소스에서 인사이트 생성
    → /insights Tab 1: 인사이트 목록
        │
        ├─→ 인사이트 클릭 → 상세 (evidenceRefs 표시)
        │       └─→ Evidence 클릭 → 원본 데이터 (댓글/키워드/캠페인)
        │
        └─→ Tab 2: 액션 목록
                ├─→ 액션 상세 (owner, timing, evidence)
                └─→ "실행하기" → /campaigns

    → /insights Tab 3: 에비던스 번들
        ├─→ 번들 유형별 필터 (SENTIMENT_OVERVIEW, FAQ_SUMMARY 등)
        └─→ 항목 클릭 → displayType별 시각화 (TABLE, PIE_CHART 등)
```

---

## 역할별 화면 접근 (Phase 9 예정)

| 역할         | 기본 랜딩           | 접근 가능                        | 숨김             |
| ------------ | ------------------- | -------------------------------- | ---------------- |
| EXECUTIVE    | `/dashboard`        | 대시보드, 인사이트(요약), 리포트 | admin, 상세 분석 |
| PRACTITIONER | `/dashboard`        | 전체                             | —                |
| MARKETER     | `/dashboard`        | 대시보드, 인사이트, 액션, 캠페인 | admin            |
| ADMIN        | `/admin/collection` | 전체                             | —                |
