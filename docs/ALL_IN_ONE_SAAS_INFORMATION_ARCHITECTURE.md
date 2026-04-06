# X2 올인원 SaaS 정보 아키텍처 재설계

> 작성일: 2026-04-02  
> 목적: 48+ 페이지를 사용자 관점 3-5개 허브로 재구조화  
> 원칙: "기술 구분"이 아닌 "사용자가 하고 싶은 일" 기준

---

## 현재 문제 진단

### 사이드바 현황 (`apps/web/src/lib/constants.ts`)

- **10개 섹션**: 시작 / 수집 / 분석 / 검색 인텐트 / GEO·AEO / 인사이트 / 인텔리전스 / 리포트 / 실행 / 설정
- **30+ 메뉴 항목** + 관리자 7개 = 총 37+ 네비게이션 항목
- 같은 분석을 3곳에서 진입 가능 (키워드 → 인텐트 → 리스닝허브)
- "인텔리전스"와 "인사이트"의 차이를 사용자가 이해 불가
- "수집"과 "분석" 분리가 사용자 워크플로우와 맞지 않음

### 기능 중복 맵

```
/keywords  ──┐
/intent    ──┼── 모두 /api/intent/analyze 동일 API 호출
/listening-hub ──┘   (listening-hub은 추가로 cluster/pathfinder/roadview/persona 통합)

/competitors ──┐
/competitors/compare ──┼── 경쟁 분석 2곳 분산
/channels/performance ──┘

/insights ──┐
/insights/actions ──┼── 인사이트 3곳 분산 + evidence 404
/insights/evidence ──┘

/intelligence ──┐
/intelligence/compare ──┼── 인텔리전스 3곳 분산
/vertical-preview ──┘
```

---

## 제안: 4개 허브 + 1개 유틸리티 구조

### 허브 구조도 (텍스트)

```
┌─────────────────────────────────────────────────────────────────┐
│                        X2 플랫폼                                │
├─────────────┬─────────────┬─────────────┬──────────────────────┤
│             │             │             │                      │
│  허브 1     │  허브 2     │  허브 3     │  허브 4              │
│  채널 &     │  검색 의도  │  AI 가시성  │  실행 &              │
│  콘텐츠     │  & 여정     │  & 인용     │  리포트              │
│             │             │             │                      │
│ ·채널 관리  │ ·통합 분석  │ ·GEO/AEO   │ ·인사이트 요약       │
│ ·콘텐츠     │ ·인텐트     │ ·인용 추적  │ ·추천 액션           │
│ ·댓글 분석  │ ·패스파인더 │ ·AI 검색    │ ·리포트 생성         │
│ ·경쟁사     │ ·클러스터   │  최적화     │ ·캠페인              │
│ ·언급 분석  │ ·페르소나   │             │ ·알림                │
│ ·성과 대시  │ ·로드 뷰    │             │ ·스케줄              │
│  보드       │ ·인구통계   │             │                      │
│             │ ·카테고리   │             │                      │
│             │  엔트리     │             │                      │
└─────────────┴─────────────┴─────────────┴──────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  유틸리티          │
                    │  ·설정             │
                    │  ·요금제           │
                    │  ·사용량           │
                    │  ·관리자           │
                    └───────────────────┘
```

---

## 허브 1: 채널 & 콘텐츠 (Channel & Content)

> **사용자 질문**: "우리 채널은 잘 되고 있나? 경쟁사 대비 어떤가?"

### 포함 기능

| 기능               | 현재 라우트                  | 신규 라우트                    | 현재 파일                                   |
| ------------------ | ---------------------------- | ------------------------------ | ------------------------------------------- |
| 채널 대시보드 (홈) | `/dashboard`                 | `/channel`                     | `(dashboard)/dashboard/page.tsx`            |
| 채널 목록 & 등록   | `/channels`, `/channels/new` | `/channel/list`                | `(dashboard)/channels/page.tsx`             |
| 채널 상세          | `/channels/[id]`             | `/channel/[id]`                | `(dashboard)/channels/[id]/page.tsx`        |
| 채널 성과 비교     | `/channels/performance`      | `/channel/performance`         | `(dashboard)/channels/performance/page.tsx` |
| 댓글 분석          | `/comments`                  | `/channel/comments`            | `(dashboard)/comments/page.tsx`             |
| 댓글 리스트        | `/comments/list`             | `/channel/comments/list`       | `(dashboard)/comments/list/page.tsx`        |
| FAQ & 이슈         | `/comments/faq`              | `/channel/comments/faq`        | `(dashboard)/comments/faq/page.tsx`         |
| 경쟁사 분석        | `/competitors`               | `/channel/competitors`         | `(dashboard)/competitors/page.tsx`          |
| 경쟁사 추가        | `/competitors/add`           | `/channel/competitors/add`     | `(dashboard)/competitors/add/page.tsx`      |
| 경쟁사 비교        | `/competitors/compare`       | `/channel/competitors/compare` | `(dashboard)/competitors/compare/page.tsx`  |
| 콘텐츠 관리        | `/contents`                  | `/channel/contents`            | `(dashboard)/contents/page.tsx`             |
| 언급 분석          | `/keywords/mentions`         | `/channel/mentions`            | `(dashboard)/keywords/mentions/page.tsx`    |

### 허브 내 네비게이션

```
채널 & 콘텐츠
├── 대시보드          ← 진입 시 기본 화면
├── 채널 관리
│   ├── 채널 목록
│   ├── 채널 등록
│   └── 성과 비교
├── 댓글 분석
│   ├── 감성 대시보드
│   ├── 댓글 리스트
│   └── FAQ & 이슈
├── 경쟁사 분석
│   ├── 경쟁사 목록
│   └── 비교 분석
├── 콘텐츠
└── 언급 분석
```

---

## 허브 2: 검색 의도 & 고객 여정 (Search Intent & Journey)

> **사용자 질문**: "고객이 무엇을 찾고, 어떤 경로로 결정하나?"

### 포함 기능

| 기능               | 현재 라우트             | 신규 라우트                     | 현재 파일                                   |
| ------------------ | ----------------------- | ------------------------------- | ------------------------------------------- |
| 통합 분석 허브     | `/listening-hub`        | `/search`                       | `(dashboard)/listening-hub/page.tsx`        |
| 키워드 & 의도 분석 | `/keywords`, `/intent`  | `/search/intent`                | `(dashboard)/intent/page.tsx`               |
| 패스파인더         | `/pathfinder`           | `/search/pathfinder`            | `(dashboard)/pathfinder/page.tsx`           |
| 클러스터 파인더    | `/cluster-finder`       | `/search/cluster`               | `(dashboard)/cluster-finder/page.tsx`       |
| 페르소나 뷰        | `/persona`              | `/search/persona`               | `(dashboard)/persona/page.tsx`              |
| 로드 뷰            | `/road-view`            | `/search/journey`               | `(dashboard)/road-view/page.tsx`            |
| 카테고리 엔트리    | `/category-entry`       | `/search/category`              | `(dashboard)/category-entry/page.tsx`       |
| 인구통계 분석      | `/demographic`          | `/search/demographic`           | `(dashboard)/demographic/page.tsx`          |
| 인텔리전스 허브    | `/intelligence`         | `/search/intelligence`          | `(dashboard)/intelligence/page.tsx`         |
| A/B 비교           | `/intelligence/compare` | `/search/intelligence/compare`  | `(dashboard)/intelligence/compare/page.tsx` |
| 업종별 프리뷰      | `/vertical-preview`     | `/search/intelligence/vertical` | `(dashboard)/vertical-preview/page.tsx`     |

### 중복 제거 방안

- **`/keywords`와 `/intent` 통합**: 동일 API를 사용하므로 하나의 "키워드 & 의도 분석" 페이지로 통합. `/keywords`의 단순 검색 입력 → `/intent`의 상세 필터/차트 결과를 하나의 플로우로.
- **`/listening-hub`을 허브 홈으로**: 현재 listening-hub이 이미 intent→cluster→pathfinder→persona 통합 분석을 수행하므로, 이것을 허브 홈의 "원스톱 분석"으로 배치.
- **`/intelligence`와 나머지 분석의 관계 정리**: intelligence는 "업종 맥락을 가진 심층 분석"으로 포지셔닝.

### 허브 내 네비게이션

```
검색 의도 & 고객 여정
├── 통합 분석              ← 진입 시 기본 (키워드 입력 → 전체 결과)
├── 키워드 & 의도 분석      ← /keywords + /intent 통합
├── 검색 경로 (패스파인더)
├── 키워드 클러스터
├── 소비자 페르소나
├── 고객 여정 (로드 뷰)
├── 카테고리 진입점
├── 인구통계
└── 심층 인텔리전스
    ├── 업종별 분석
    ├── A/B 비교
    └── 업종 프리뷰
```

---

## 허브 3: AI 가시성 & 인용 (AI Visibility)

> **사용자 질문**: "AI 검색에서 우리 콘텐츠가 인용되고 있나?"

### 포함 기능

| 기능           | 현재 라우트 | 신규 라우트      | 현재 파일                      |
| -------------- | ----------- | ---------------- | ------------------------------ |
| GEO/AEO 트래커 | `/geo-aeo`  | `/ai-visibility` | `(dashboard)/geo-aeo/page.tsx` |

### 확장 가능 기능

- AI 검색 결과 모니터링 (ChatGPT, Gemini, Perplexity)
- 인용 최적화 가이드
- 경쟁사 AI 가시성 비교
- GEO 콘텐츠 생성 (vertical-preview의 GENERATED_DOCUMENT 옵션 활용)

### 허브 내 네비게이션

```
AI 가시성 & 인용
├── 인용 트래커           ← 진입 시 기본
├── 소스 관리             ← 현재 geo-aeo 페이지 내 소스 등록 분리
├── 최적화 가이드          ← 신규
└── 경쟁 비교             ← 신규
```

### 참고

현재 `/geo-aeo`는 단일 페이지에 소스 등록/스코어 확인/트렌드 모두 포함. 기능이 성장하면 하위 페이지로 분리 필요.

---

## 허브 4: 실행 & 리포트 (Action & Report)

> **사용자 질문**: "분석 결과로 무엇을 해야 하나? 보고서는?"

### 포함 기능

| 기능          | 현재 라우트                   | 신규 라우트                 | 현재 파일                                         |
| ------------- | ----------------------------- | --------------------------- | ------------------------------------------------- |
| 인사이트 요약 | `/insights`                   | `/action`                   | `(dashboard)/insights/page.tsx`                   |
| 추천 액션     | `/insights/actions`           | `/action/todo`              | `(dashboard)/insights/actions/page.tsx`           |
| 근거 자료     | `/insights/evidence`          | `/action/evidence`          | 미구현 → 신규 필요                                |
| 리포트 목록   | `/insights/reports`           | `/action/reports`           | `(dashboard)/insights/reports/page.tsx`           |
| 리포트 생성   | `/insights/reports/new`       | `/action/reports/new`       | `(dashboard)/insights/reports/new/page.tsx`       |
| 리포트 상세   | `/insights/reports/[id]`      | `/action/reports/[id]`      | `(dashboard)/insights/reports/[id]/page.tsx`      |
| 스케줄 관리   | `/insights/reports/schedules` | `/action/reports/schedules` | `(dashboard)/insights/reports/schedules/page.tsx` |
| 캠페인        | `/campaigns`                  | `/action/campaigns`         | `(dashboard)/campaigns/page.tsx`                  |

### 허브 내 네비게이션

```
실행 & 리포트
├── 인사이트 요약          ← 진입 시 기본 (전체 분석 결과에서 추출된 핵심 발견)
├── 추천 액션 (TODO)
├── 리포트
│   ├── 리포트 목록
│   ├── 리포트 생성
│   └── 스케줄 관리
└── 캠페인                ← 향후 확장
```

---

## 유틸리티 (하단 고정)

```
설정 & 관리
├── 알림
├── 알림 설정
├── 요금제
├── 사용량
├── 계정 설정
└── 관리자 (접을 수 있는 섹션)
    ├── 사용자 관리
    ├── 플랫폼 관리
    ├── 데이터 수집
    ├── AI 관리
    └── 파이프라인
```

---

## 신규 사이드바 설계안

### Before (현재 37+ 항목)

```
시작
  홈 / 시작하기
수집
  채널 목록 / 키워드 관리 / 멘션 분석
분석
  댓글 분석 / 경쟁 채널 / 채널 성과
검색 인텐트
  리스닝 허브 / 인텐트 파인더 / 패스파인더 / 페르소나 뷰 / 클러스터 파인더 / 로드 뷰 / FAQ·이슈 / 카테고리 엔트리 / 인구통계
GEO/AEO
  인용 트래커
인사이트
  핵심 발견 / 추천 액션 / 근거 자료
인텔리전스
  인텔리전스 허브 / A/B 비교 / 업종별 프리뷰
리포트
  리포트 목록 / 리포트 생성
실행
  캠페인 / 콘텐츠 관리
설정
  알림 / 알림 설정 / 요금제 / 사용량 / 설정
관리자 (7개)
```

### After (제안 14 항목 + 관리자)

```
홈                              ← 통합 대시보드 + 허브 진입점

채널 & 콘텐츠                    ← 허브 1
  대시보드
  채널 관리
  댓글 분석
  경쟁사
  콘텐츠

검색 의도 & 여정                 ← 허브 2
  통합 분석
  의도 분석
  클러스터 & 페르소나
  심층 인텔리전스

AI 가시성                       ← 허브 3
  인용 트래커

실행 & 리포트                    ← 허브 4
  인사이트
  추천 액션
  리포트

─── (구분선) ───
알림
설정
관리자 ▼
```

**메뉴 항목 수: 37+ → 14 (62% 감소)**

---

## Pre-login vs Post-login 정보 흐름

### Pre-login (랜딩 페이지)

```
방문자 도착
  │
  ├── 히어로 섹션: X2가 뭔지 한 눈에 이해
  │
  ├── 4개 허브 카드: "이런 것을 할 수 있어요"
  │   ├── 채널 & 콘텐츠 분석
  │   ├── 검색 의도 & 고객 여정
  │   ├── AI 가시성 & 인용
  │   └── 실행 & 리포트
  │
  ├── 사례/미리보기: 실제 분석 결과 스크린샷
  │
  ├── 가격: Free / Pro / Business
  │
  └── CTA → 회원가입 / 데모 요청
```

### Post-login 첫 진입

```
로그인 / 온보딩
  │
  ├── [채널 0개] → 시작하기 허브 (/start 개선)
  │   "어떤 목적으로 시작하시나요?"
  │   ├── 채널 등록하기 → 허브 1
  │   ├── 키워드 분석하기 → 허브 2
  │   └── AI 검색 모니터링 → 허브 3
  │
  ├── [채널 1+개] → 홈 대시보드
  │   ├── 최근 분석 요약
  │   ├── 추천 액션 (미완료)
  │   ├── 허브별 진입 카드
  │   └── 알림 요약
  │
  └── 허브 진입 → 기능 → 결과 → 인사이트 → 액션
```

---

## 사용자 진입 흐름: 랜딩 → 허브 → 기능 → 결과

### 시나리오 1: "채널 성과가 궁금한 마케터"

```
랜딩 "채널 & 콘텐츠 분석" 카드 클릭
  → 회원가입/로그인
  → 시작하기: "채널 등록하기" 선택
  → 채널 URL 입력 (YouTube/Instagram/TikTok)
  → 자동 수집 시작
  → 채널 대시보드: KPI + 트렌드
  → 댓글 분석: 감성/위험도
  → 경쟁사 추가 및 비교
  → 인사이트 요약 확인
  → 추천 액션 실행
  → 리포트 생성/공유
```

### 시나리오 2: "검색 트렌드가 궁금한 전략 담당자"

```
랜딩 "검색 의도 & 고객 여정" 카드 클릭
  → 회원가입/로그인
  → 시작하기: "키워드 분석하기" 선택
  → 키워드 입력 (예: "프로틴 음료")
  → 통합 분석 결과: 의도 분류 + 클러스터 + 경로
  → 페르소나 확인: "이런 사람들이 검색해요"
  → 블루오션 키워드 발견
  → 콘텐츠 전략 제안 확인
  → 리포트 생성
```

### 시나리오 3: "AI 검색 노출이 궁금한 SEO 담당자"

```
랜딩 "AI 가시성 & 인용" 카드 클릭
  → 회원가입/로그인
  → 소스 URL 등록
  → AI 검색 인용 스코어 확인
  → 최적화 필요 항목 확인
  → 리포트 생성
```

---

## 구현 시 고려사항

### 1. URL 리다이렉트 맵

기존 URL에서 신규 URL로의 301 리다이렉트 필요:

```typescript
// apps/web/next.config.ts 또는 middleware.ts
const REDIRECT_MAP = {
  "/channels": "/channel/list",
  "/channels/performance": "/channel/performance",
  "/comments": "/channel/comments",
  "/competitors": "/channel/competitors",
  "/keywords": "/search/intent",
  "/intent": "/search/intent",
  "/listening-hub": "/search",
  "/pathfinder": "/search/pathfinder",
  "/cluster-finder": "/search/cluster",
  "/persona": "/search/persona",
  "/road-view": "/search/journey",
  "/category-entry": "/search/category",
  "/demographic": "/search/demographic",
  "/intelligence": "/search/intelligence",
  "/vertical-preview": "/search/intelligence/vertical",
  "/geo-aeo": "/ai-visibility",
  "/insights": "/action",
  "/insights/actions": "/action/todo",
  "/insights/reports": "/action/reports",
  "/campaigns": "/action/campaigns",
};
```

### 2. 사이드바 상수 변경

`apps/web/src/lib/constants.ts`의 `NAV_SECTIONS` 재구성:

```typescript
export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "nav.home",
    items: [{ labelKey: "nav.home", href: "/dashboard", icon: "Home" }],
  },
  {
    titleKey: "nav.channelContent",
    items: [
      { labelKey: "nav.channelDashboard", href: "/channel", icon: "BarChart3" },
      { labelKey: "nav.channelManage", href: "/channel/list", icon: "Tv" },
      {
        labelKey: "nav.commentAnalysis",
        href: "/channel/comments",
        icon: "MessageSquare",
      },
      {
        labelKey: "nav.competitors",
        href: "/channel/competitors",
        icon: "Swords",
      },
      {
        labelKey: "nav.contents",
        href: "/channel/contents",
        icon: "PlaySquare",
      },
    ],
  },
  {
    titleKey: "nav.searchJourney",
    items: [
      { labelKey: "nav.integratedAnalysis", href: "/search", icon: "Search" },
      {
        labelKey: "nav.intentAnalysis",
        href: "/search/intent",
        icon: "Target",
      },
      {
        labelKey: "nav.clusterPersona",
        href: "/search/cluster",
        icon: "Network",
      },
      {
        labelKey: "nav.deepIntelligence",
        href: "/search/intelligence",
        icon: "Brain",
      },
    ],
  },
  {
    titleKey: "nav.aiVisibility",
    items: [
      {
        labelKey: "nav.citationTracker",
        href: "/ai-visibility",
        icon: "Globe",
      },
    ],
  },
  {
    titleKey: "nav.actionReport",
    items: [
      { labelKey: "nav.insights", href: "/action", icon: "Sparkles" },
      { labelKey: "nav.actions", href: "/action/todo", icon: "Zap" },
      { labelKey: "nav.reports", href: "/action/reports", icon: "FileText" },
    ],
  },
];
```

### 3. 허브 내 탭 네비게이션

각 허브의 하위 기능은 사이드바가 아닌 **허브 내부 탭/서브네비게이션**으로 처리:

```
예: /search 허브 내부
┌──────────────────────────────────────────────┐
│ [통합분석] [의도] [경로] [클러스터] [페르소나] │  ← 허브 내 탭
├──────────────────────────────────────────────┤
│                                              │
│              분석 결과 영역                    │
│                                              │
└──────────────────────────────────────────────┘
```

이를 위해 `apps/web/src/components/layout/` 에 `HubTabNavigation` 컴포넌트 신규 추가 필요.

### 4. 단계적 마이그레이션

| 단계    | 작업                                      | 영향도 |
| ------- | ----------------------------------------- | ------ |
| Phase 1 | 사이드바 메뉴 그룹핑만 변경 (라우트 유지) | 낮음   |
| Phase 2 | 허브 홈 페이지 4개 신규 생성              | 중간   |
| Phase 3 | URL 구조 변경 + 리다이렉트                | 높음   |
| Phase 4 | 중복 페이지 통합 (keywords + intent)      | 높음   |
| Phase 5 | 랜딩 페이지 + 앱 홈 재구축                | 중간   |
