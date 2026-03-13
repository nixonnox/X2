# UX/UI 통합 현황 (Phase 8)

## 개요

Phase 7까지 구축된 백엔드 인텔리전스 파이프라인(Insight → Action → Report → Automation)을
실제 사용자가 접하는 화면과 UX로 번역한 현황을 정리한다.

---

## 네비게이션 구조 변경

### Before (Feature-Centric)

```
Dashboard / Channels / Keywords / Insights / Competitors / Reports / Admin
```

### After (Insight-Flow)

```
Start → Discover → Analyze → Intent → GEO/AEO → Insight & Action → Report → Execute
```

| 섹션                | 경로                                      | 역할                                   |
| ------------------- | ----------------------------------------- | -------------------------------------- |
| Start               | `/start`                                  | 진입점 허브 — 3가지 분석 경로 선택     |
| Discover            | `/channels`, `/channels/new`              | 소셜 채널 등록 및 탐색                 |
| Analyze             | `/keywords`, `/comments`, `/comments/faq` | 키워드·댓글·FAQ 분석                   |
| Intent              | `/intent`                                 | 검색 의도 분석, 클러스터, 저니 매핑    |
| GEO/AEO             | `/geo-aeo`                                | AI 엔진 최적화 점수 및 권고            |
| Insight & Action    | `/insights`, `/insights/evidence`         | 인사이트·액션·에비던스 탭              |
| Report & Automation | `/reports`, `/admin/collection`           | 리포트 조회·자동화·파이프라인 모니터링 |
| Execute             | `/campaigns`                              | 캠페인 실행 (인플루언서·콘텐츠·광고)   |

---

## 페이지별 통합 현황

### 1. Start Hub (`/start`)

- **상태**: ✅ 신규 생성
- **구현**: 3가지 진입 경로 카드 (소셜 채널 분석, 소셜 리스닝, 댓글/이슈 분석)
- **데이터 연결**: 정적 가이드 (진입점이므로 데이터 불필요)
- **빈 상태**: 해당 없음

### 2. Home Dashboard (`/dashboard`)

- **상태**: ✅ 전면 리디자인
- **구현**: DataStatusBar, 오늘의 인사이트 3카드, 추천 액션, GEO/AEO 준비도
- **데이터 연결**: tRPC `dashboard.overview` (기존), 인사이트/액션/GEO 섹션은 빈 상태 구조
- **빈 상태**: "분석을 시작하면 인사이트가 여기에 표시됩니다"

### 3. Insights Page (`/insights`)

- **상태**: ✅ 전면 리디자인
- **구현**: 3탭 (인사이트/액션/에비던스), 카테고리 필터
- **데이터 연결**: 빈 상태 구조 (tRPC 라우트 Phase 9에서 연결)
- **빈 상태**: 카테고리별 구조 미리보기 제공

### 4. Intent Analysis (`/intent`)

- **상태**: ✅ 신규 생성
- **구현**: 의도 분류·클러스터·저니 개요 카드, 블루오션 키워드 섹션
- **데이터 연결**: 빈 상태 구조
- **빈 상태**: 키워드 입력 프롬프트

### 5. GEO/AEO (`/geo-aeo`)

- **상태**: ✅ 신규 생성
- **구현**: 인용 준비도·답변 가능성·출처 신뢰·구조 품질 카드, 최적화 권고
- **데이터 연결**: 빈 상태 구조
- **빈 상태**: "키워드를 등록하면 AEO 점수가 여기에 표시됩니다"

### 6. Comments FAQ (`/comments/faq`)

- **상태**: ✅ 신규 생성
- **구현**: 미답변 FAQ·리스크 시그널·분석 댓글 수 카드
- **데이터 연결**: 빈 상태 구조
- **빈 상태**: 채널 등록 안내

### 7. Campaigns (`/campaigns`)

- **상태**: ✅ 신규 생성
- **구현**: 분석→실행→측정→재분석 플로우, 3가지 캠페인 유형
- **데이터 연결**: 빈 상태 구조
- **빈 상태**: 인사이트/액션 연결 CTA

### 8. Admin Collection (`/admin/collection`)

- **상태**: ✅ 전면 리디자인
- **구현**: 시스템 상태, 파이프라인·AI분석·리포트·플랜 모니터 4섹션
- **데이터 연결**: 빈 상태 구조 (운영 API Phase 9에서 연결)
- **빈 상태**: 파이프라인 구조 표시

---

## Mock 데이터 제거 현황

| 파일                        | 이전                         | 이후                                    |
| --------------------------- | ---------------------------- | --------------------------------------- |
| `insights/page.tsx`         | `@/lib/insights` mock import | 제거, 빈 상태 구조 + 리포트 연결 CTA    |
| `dashboard-view.tsx`        | 하드코딩된 수치/액션         | 전부 빈 상태 구조(`"—"`, 구조 미리보기) |
| `admin/collection/page.tsx` | 없음                         | 구조만 표시, 데이터 없음                |

## 데이터 상태 표시 현황

| 항목            | 위치                       | 구현 방식                                                 |
| --------------- | -------------------------- | --------------------------------------------------------- |
| 최근 수집 시각  | DataStatusBar              | `dataStatus.lastSyncAt` props 기반 (null이면 "대기 중")   |
| 부분 실패       | DataStatusBar              | `failedPipelines/totalPipelines` 표시, 실패 시 amber 배경 |
| Low confidence  | DataStatusBar → admin 링크 | `lowConfidenceCount > 0`이면 admin 링크 표시              |
| 평균 신뢰도     | admin/collection           | 데이터 품질 섹션 (Phase 9 연결)                           |
| Fallback 사용률 | admin/collection           | 데이터 품질 섹션 (Phase 9 연결)                           |

---

## 다국어(i18n) 현황

| 언어   | 파일               | 추가된 키            |
| ------ | ------------------ | -------------------- |
| 한국어 | `messages/ko.json` | nav 섹션 8개 그룹 키 |
| 영어   | `messages/en.json` | 동일 구조 영문 키    |

네비게이션 라벨은 `next-intl` 통해 다국어 지원. 페이지 본문은 한국어 우선 하드코딩 (Phase 9에서 i18n 키 전환).
