# X2 전체 제품 UI/UX 감사 보고서

> 감사일: 2026-04-02  
> 대상: X2 소셜 인텔리전스 플랫폼 (Next.js 모노레포)  
> 네비게이션 기준: `apps/web/src/lib/constants.ts` (NAV_SECTIONS, NAV_ACCOUNT, NAV_ADMIN)  
> 사이드바 구현: `apps/web/src/components/layout/sidebar.tsx`

---

## 1. 시작 (Start)

| 라우트       | 페이지명        | 파일 경로                        | 상태 | E2E 동작 | 실제 데이터                           | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                             |
| ------------ | --------------- | -------------------------------- | ---- | -------- | ------------------------------------- | --------- | ------------- | ------ | --------------------------------------------------------------------- |
| `/dashboard` | 대시보드        | `(dashboard)/dashboard/page.tsx` | 정상 | Y        | Y (tRPC `analytics.dashboardSummary`) | Korean    | Good          | Fair   | 차트 데이터(chartSeries) 미구현 (TODO 주석), change 값 항상 빈 문자열 |
| `/start`     | 시작하기 허브   | `(dashboard)/start/page.tsx`     | 정상 | Y        | N (정적 카드)                         | Korean    | Good          | Good   | 하드코딩된 3개 진입점, 데이터 기반 추천 없음                          |
| `/home`      | 홈 (리다이렉트) | `(dashboard)/home/page.tsx`      | 정상 | Y        | N/A                                   | N/A       | N/A           | N/A    | `/dashboard`로 즉시 리다이렉트만 수행                                 |

---

## 2. 수집 (Discover)

| 라우트               | 페이지명    | 파일 경로                                | 상태 | E2E 동작 | 실제 데이터                                                  | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                              |
| -------------------- | ----------- | ---------------------------------------- | ---- | -------- | ------------------------------------------------------------ | --------- | ------------- | ------ | ---------------------------------------------------------------------- |
| `/channels`          | 채널 목록   | `(dashboard)/channels/page.tsx`          | 정상 | Y        | Y (tRPC `channel.list`)                                      | Korean    | Good          | Good   | snapshot 데이터 일부 0으로 표시 (totalViewsOrReach, engagementRate 등) |
| `/channels/new`      | 채널 등록   | `(dashboard)/channels/new/page.tsx`      | 정상 | Y        | Y (API 연동)                                                 | Korean    | Good          | Good   | URL 검증 및 플랫폼 자동 감지 구현 완료                                 |
| `/channels/[id]`     | 채널 상세   | `(dashboard)/channels/[id]/page.tsx`     | 정상 | Y        | Y                                                            | Korean    | Good          | Fair   | 개별 채널 상세 분석                                                    |
| `/keywords`          | 키워드 분석 | `(dashboard)/keywords/page.tsx`          | 정상 | Y        | Y (API `/api/intent/analyze`)                                | Korean    | Good          | Good   | 트렌드 차트 데이터가 시뮬레이션 기반(실제 시계열 아님), i18n 키 사용   |
| `/keywords/mentions` | 멘션 분석   | `(dashboard)/keywords/mentions/page.tsx` | 정상 | Y        | Y (tRPC `listening.getKeywordPerformance`, `getMentionFeed`) | Korean    | Good          | Fair   | 페이지네이션 UI 불완전, 기본 테이블 형태                               |

---

## 3. 분석 (Analyze)

| 라우트                  | 페이지명           | 파일 경로                                   | 상태     | E2E 동작 | 실제 데이터                                        | UX 라이팅                       | 디자인 일관성 | 사용성 | 주요 이슈                                                              |
| ----------------------- | ------------------ | ------------------------------------------- | -------- | -------- | -------------------------------------------------- | ------------------------------- | ------------- | ------ | ---------------------------------------------------------------------- |
| `/comments`             | 댓글 분석 대시보드 | `(dashboard)/comments/page.tsx`             | 정상     | Y        | Y (`useCommentsData` 훅)                           | Mixed (i18n 키 + 한글 하드코딩) | Good          | Good   | 잘 구현된 감성분석/주제분석/위험도/FAQ, 볼륨 시계열은 빌드타임 생성    |
| `/comments/list`        | 댓글 리스트        | `(dashboard)/comments/list/page.tsx`        | 정상     | Y        | Y (tRPC `comment.listByProject`, `sentimentStats`) | Korean                          | Good          | Fair   | 사이드바에 직접 노출 안됨, 기본 테이블                                 |
| `/comments/faq`         | FAQ & 이슈         | `(dashboard)/comments/faq/page.tsx`         | 임시구현 | N        | N (데이터 "—" 표시)                                | Korean                          | Good          | Poor   | 모든 KPI가 대시(—)로 하드코딩, 실제 데이터 연결 없음                   |
| `/competitors`          | 경쟁사 분석        | `(dashboard)/competitors/page.tsx`          | 부분동작 | Y        | 부분 (tRPC + mock fallback)                        | Mixed (i18n + 한글)             | Good          | Fair   | 실제 데이터 없으면 mock 데이터 fallback, `competitorService` mock 의존 |
| `/competitors/add`      | 경쟁사 추가        | `(dashboard)/competitors/add/page.tsx`      | 정상     | Y        | Y                                                  | Mixed (영어 변수명 + 한글 라벨) | Good          | Good   | URL 검증 및 플랫폼 선택 구현                                           |
| `/competitors/compare`  | 경쟁사 비교        | `(dashboard)/competitors/compare/page.tsx`  | 정상     | Y        | Y (tRPC `channel.list`, `competitor.list`)         | Korean                          | Good          | Fair   | AI 인사이트 패널 포함, 사이드바에 직접 노출 안됨                       |
| `/channels/performance` | 채널 성과          | `(dashboard)/channels/performance/page.tsx` | 임시구현 | N        | N (전부 하드코딩 mock 데이터)                      | Korean                          | Fair          | Poor   | 모든 수치 하드코딩, 차트 "Recharts 연동 예정" placeholder              |

---

## 4. 검색 인텐트 (ListeningMind)

| 라우트            | 페이지명        | 파일 경로                             | 상태 | E2E 동작 | 실제 데이터                                | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                         |
| ----------------- | --------------- | ------------------------------------- | ---- | -------- | ------------------------------------------ | --------- | ------------- | ------ | ----------------------------------------------------------------- |
| `/listening-hub`  | 리스닝 허브     | `(dashboard)/listening-hub/page.tsx`  | 정상 | Y        | Y (API `/api/search-intelligence/analyze`) | Korean    | Good          | Good   | 통합 분석 (의도→클러스터→경로→여정→페르소나→인사이트→액션) 원스톱 |
| `/intent`         | 인텐트 파인더   | `(dashboard)/intent/page.tsx`         | 정상 | Y        | Y (API `/api/intent/analyze`)              | Korean    | Good          | Good   | 의도 분류(정보/비교/행동/문제해결), 갭 매트릭스, 블루오션 발견    |
| `/pathfinder`     | 패스파인더      | `(dashboard)/pathfinder/page.tsx`     | 정상 | Y        | Y (`usePathfinderQuery`)                   | Korean    | Good          | Good   | 검색 경로 시각화, 방향 필터, 줌/패닝                              |
| `/persona`        | 페르소나 뷰     | `(dashboard)/persona/page.tsx`        | 정상 | Y        | Y (`usePersonaQuery`)                      | Korean    | Good          | Good   | 레이더 차트, 아키타입 분포, 페르소나 카드, 신뢰도 경고            |
| `/cluster-finder` | 클러스터 파인더 | `(dashboard)/cluster-finder/page.tsx` | 정상 | Y        | Y (`useClusterQuery`)                      | Korean    | Good          | Good   | 네트워크 그래프, 워드클라우드, GPT 분석, AI 인사이트 패널         |
| `/road-view`      | 로드 뷰         | `(dashboard)/road-view/page.tsx`      | 정상 | Y        | Y (`useRoadViewQuery`)                     | Korean    | Good          | Fair   | 사용자 여정 단계화, 분기점 시각화, 3개 뷰모드(stages/paths/gaps)  |
| `/category-entry` | 카테고리 엔트리 | `(dashboard)/category-entry/page.tsx` | 정상 | Y        | Y (API 호출)                               | Korean    | Good          | Fair   | 카테고리별 진입 경로 분석, 파이/바 차트                           |
| `/demographic`    | 인구통계 분석   | `(dashboard)/demographic/page.tsx`    | 정상 | Y        | Y (tRPC `demographic.analyze`)             | Korean    | Good          | Fair   | 성별/연령/지역 분석, tRPC 데이터 연동                             |

---

## 5. GEO / AEO

| 라우트     | 페이지명              | 파일 경로                      | 상태 | E2E 동작 | 실제 데이터   | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                           |
| ---------- | --------------------- | ------------------------------ | ---- | -------- | ------------- | --------- | ------------- | ------ | ------------------------------------------------------------------- |
| `/geo-aeo` | 인용 트래커 (GEO/AEO) | `(dashboard)/geo-aeo/page.tsx` | 정상 | Y        | Y (tRPC 연동) | Korean    | Good          | Fair   | 소스 등록/스코어바/트렌드, 복잡한 단일 페이지에 너무 많은 기능 집약 |

---

## 6. 인사이트 (Insight & Action)

| 라우트               | 페이지명  | 파일 경로                               | 상태     | E2E 동작 | 실제 데이터                                    | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                        |
| -------------------- | --------- | --------------------------------------- | -------- | -------- | ---------------------------------------------- | --------- | ------------- | ------ | ------------------------------------------------ |
| `/insights`          | 핵심 발견 | `(dashboard)/insights/page.tsx`         | 부분동작 | Y        | 부분 (카테고리 정의만, 데이터 로딩 미확인)     | Korean    | Good          | Fair   | 인사이트 목록 페이지, 정적 카테고리 구성         |
| `/insights/actions`  | 추천 액션 | `(dashboard)/insights/actions/page.tsx` | 정상     | Y        | Y (tRPC `insight.listActions`, `updateAction`) | Korean    | Good          | Good   | 필터/페이지네이션/상태변경 CRUD 구현 완료        |
| `/insights/evidence` | 근거 자료 | 파일 없음                               | 에러     | N        | N                                              | N/A       | N/A           | N/A    | 사이드바에 링크 있으나 page.tsx 미존재, 404 발생 |

---

## 7. 인텔리전스 (Intelligence)

| 라우트                  | 페이지명        | 파일 경로                                   | 상태 | E2E 동작 | 실제 데이터    | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                  |
| ----------------------- | --------------- | ------------------------------------------- | ---- | -------- | -------------- | --------- | ------------- | ------ | ---------------------------------------------------------- |
| `/intelligence`         | 인텔리전스 허브 | `(dashboard)/intelligence/page.tsx`         | 정상 | Y        | Y (tRPC + API) | Korean    | Good          | Fair   | 20+ 컴포넌트 임포트, 매우 복잡한 단일 페이지, 업종별 분석  |
| `/intelligence/compare` | A/B 비교 분석   | `(dashboard)/intelligence/compare/page.tsx` | 정상 | Y        | Y (tRPC)       | Korean    | Good          | Fair   | 키워드/업종/기간 비교 3가지 모드, 비교 결과 시각화         |
| `/vertical-preview`     | 업종별 프리뷰   | `(dashboard)/vertical-preview/page.tsx`     | 정상 | Y        | Y (tRPC)       | Korean    | Good          | Fair   | 업종 자동 추천 → 선택 → 비교, Intelligence 컴포넌트 재사용 |

---

## 8. 리포트 (Report & Automation)

| 라우트                        | 페이지명    | 파일 경로                                         | 상태     | E2E 동작 | 실제 데이터                         | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                       |
| ----------------------------- | ----------- | ------------------------------------------------- | -------- | -------- | ----------------------------------- | --------- | ------------- | ------ | --------------------------------------------------------------- |
| `/insights/reports`           | 리포트 목록 | `(dashboard)/insights/reports/page.tsx`           | 부분동작 | Y        | N (MOCK_REPORTS 사용)               | Korean    | Good          | Fair   | mock 데이터 기반, 실제 리포트 생성/저장 미연동                  |
| `/insights/reports/new`       | 리포트 생성 | `(dashboard)/insights/reports/new/page.tsx`       | 부분동작 | Y        | N (폼만 구현, 실제 생성 API 미확인) | Korean    | Good          | Fair   | 폼 UI 구현, 섹션 선택/이메일 발송 옵션, 실제 생성 플로우 미완성 |
| `/insights/reports/[id]`      | 리포트 상세 | `(dashboard)/insights/reports/[id]/page.tsx`      | 부분동작 | Y        | N (MOCK_REPORTS에서 조회)           | Korean    | Good          | Fair   | mock 데이터 기반 상세 보기                                      |
| `/insights/reports/schedules` | 스케줄 관리 | `(dashboard)/insights/reports/schedules/page.tsx` | 부분동작 | Y        | N (reportScheduleService mock)      | Korean    | Good          | Fair   | mock 스케줄 서비스 기반                                         |

---

## 9. 실행 (Execute)

| 라우트       | 페이지명      | 파일 경로                        | 상태     | E2E 동작 | 실제 데이터                                  | UX 라이팅 | 디자인 일관성 | 사용성 | 주요 이슈                                                      |
| ------------ | ------------- | -------------------------------- | -------- | -------- | -------------------------------------------- | --------- | ------------- | ------ | -------------------------------------------------------------- |
| `/campaigns` | 캠페인 & 실행 | `(dashboard)/campaigns/page.tsx` | 임시구현 | N        | N (정적 설명 + placeholder)                  | Korean    | Good          | Poor   | "새 캠페인" 버튼만 존재, 실제 캠페인 CRUD 없음, 기획만 된 상태 |
| `/contents`  | 콘텐츠 관리   | `(dashboard)/contents/page.tsx`  | 부분동작 | Y        | 부분 (`channelService` mock + view 컴포넌트) | Korean    | Good          | Fair   | `channelService` mock 서비스 기반, 정렬/리스트 표시            |

---

## 10. 계정 & 설정 (Account)

| 라우트                    | 페이지명  | 파일 경로                                     | 상태     | E2E 동작 | 실제 데이터                    | UX 라이팅              | 디자인 일관성 | 사용성 | 주요 이슈                                  |
| ------------------------- | --------- | --------------------------------------------- | -------- | -------- | ------------------------------ | ---------------------- | ------------- | ------ | ------------------------------------------ |
| `/notifications`          | 알림      | `(dashboard)/notifications/page.tsx`          | 정상     | Y        | Y (tRPC)                       | Korean                 | Good          | Good   | 필터/검색/페이지네이션/읽음처리 완비       |
| `/settings/notifications` | 알림 설정 | `(dashboard)/settings/notifications/page.tsx` | 정상     | Y        | Y (tRPC)                       | Korean                 | Good          | Good   | 채널/유형/임계값/가드레일 세밀한 설정      |
| `/billing`                | 요금제    | `(dashboard)/billing/page.tsx`                | 임시구현 | N        | N (하드코딩 플랜 목록)         | Korean                 | Good          | Fair   | 정적 플랜 카드만 표시, 실제 결제 연동 없음 |
| `/settings/usage`         | 사용량    | `(dashboard)/settings/usage/page.tsx`         | 정상     | Y        | Y (tRPC)                       | Korean                 | Good          | Good   | 사용량 미터/차트 구현, 프로젝트별 통계     |
| `/settings`               | 계정 설정 | `(dashboard)/settings/page.tsx`               | 부분동작 | Y        | 부분 (세션 이름/이메일만 표시) | Mixed (i18n 키 + 한글) | Good          | Fair   | 설정 변경 저장 기능 미구현, 표시만 가능    |

---

## 11. 관리자 (Admin)

| 라우트              | 페이지명            | 파일 경로                               | 상태     | E2E 동작 | 실제 데이터                          | UX 라이팅     | 디자인 일관성 | 사용성 | 주요 이슈                                      |
| ------------------- | ------------------- | --------------------------------------- | -------- | -------- | ------------------------------------ | ------------- | ------------- | ------ | ---------------------------------------------- |
| `/admin/users`      | 사용자 관리         | `(dashboard)/admin/users/page.tsx`      | 임시구현 | N        | N (AdminPageLayout 껍데기만)         | Korean (i18n) | Good          | Poor   | 설명 텍스트만 표시, 실제 사용자 목록/관리 없음 |
| `/admin/platforms`  | 플랫폼 관리         | `(dashboard)/admin/platforms/page.tsx`  | 임시구현 | N        | N (AdminPageLayout 껍데기만)         | Korean (i18n) | Good          | Poor   | 동일 패턴의 placeholder                        |
| `/admin/collection` | 데이터 수집 관리    | `(dashboard)/admin/collection/page.tsx` | 정상     | Y        | Y (tRPC)                             | Korean        | Good          | Fair   | 수집 작업 상태/파이프라인 모니터링             |
| `/admin/ai`         | AI 분석 관리        | `(dashboard)/admin/ai/page.tsx`         | 정상     | Y        | Y (API)                              | Korean        | Good          | Fair   | 프로바이더 상태/태스크별 사용량/에러 로그      |
| `/admin/ai/prompts` | 프롬프트 관리       | `(dashboard)/admin/ai/prompts/page.tsx` | 정상     | Y        | Y                                    | Korean        | Good          | Fair   | 사이드바에 직접 노출 안됨                      |
| `/admin/ai/logs`    | AI 요청 로그        | `(dashboard)/admin/ai/logs/page.tsx`    | 정상     | Y        | Y                                    | Korean        | Good          | Fair   | 사이드바에 직접 노출 안됨                      |
| `/admin/ai/evals`   | AI 품질 평가        | `(dashboard)/admin/ai/evals/page.tsx`   | 정상     | Y        | Y                                    | Korean        | Good          | Fair   | 사이드바에 직접 노출 안됨                      |
| `/admin/plans`      | 요금제 관리         | `(dashboard)/admin/plans/page.tsx`      | 임시구현 | N        | N (AdminPageLayout 껍데기만)         | Korean (i18n) | Good          | Poor   | 동일 패턴의 placeholder                        |
| `/admin/logs`       | 시스템 로그         | `(dashboard)/admin/logs/page.tsx`       | 임시구현 | N        | N (AdminPageLayout 껍데기만)         | Korean (i18n) | Good          | Poor   | 동일 패턴의 placeholder                        |
| `/admin/pipeline`   | 파이프라인 모니터링 | `(dashboard)/admin/pipeline/page.tsx`   | 정상     | Y        | Y (API `/api/admin/pipeline-status`) | Korean        | Good          | Fair   | Redis/DB/Worker/Provider 상태 모니터링         |

---

## 12. 인증 & 기타 (비사이드바)

| 라우트                    | 페이지명         | 파일 경로                                | 상태       | E2E 동작 | 실제 데이터   | UX 라이팅           | 디자인 일관성 | 사용성 | 주요 이슈                                                       |
| ------------------------- | ---------------- | ---------------------------------------- | ---------- | -------- | ------------- | ------------------- | ------------- | ------ | --------------------------------------------------------------- |
| `/`                       | 랜딩 페이지      | `app/page.tsx`                           | 재구축필요 | Y        | N             | Mixed (영어 + 한글) | Poor          | Poor   | "X2" 로고 + 한 줄 영어 설명 + 로그인 버튼만, 마케팅 페이지 없음 |
| `/login`                  | 로그인           | `(auth)/login/page.tsx`                  | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/signup`                 | 회원가입         | `(auth)/signup/page.tsx`                 | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/forgot-password`        | 비밀번호 찾기    | `(auth)/forgot-password/page.tsx`        | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/reset-password/[token]` | 비밀번호 재설정  | `(auth)/reset-password/[token]/page.tsx` | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/verify-email/[token]`   | 이메일 인증      | `(auth)/verify-email/[token]/page.tsx`   | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/onboarding`             | 온보딩           | `(auth)/onboarding/page.tsx`             | 정상       | Y        | Y             | Korean              | Good          | Good   | -                                                               |
| `/reports/shared/[token]` | 공유 리포트      | `app/reports/shared/[token]/page.tsx`    | 부분동작   | Y        | N (mock 기반) | Korean              | Good          | Fair   | -                                                               |
| `/privacy`                | 개인정보처리방침 | `app/privacy/page.tsx`                   | 정상       | Y        | N/A           | Korean              | Good          | Good   | -                                                               |
| `/terms`                  | 이용약관         | `app/terms/page.tsx`                     | 정상       | Y        | N/A           | Korean              | Good          | Good   | -                                                               |
| `/maintenance`            | 점검 페이지      | `app/maintenance/page.tsx`               | 정상       | Y        | N/A           | Korean              | Good          | Good   | -                                                               |

---

## 요약 통계

### 상태별 분류 (대시보드 페이지 기준, 인증/기타 제외)

| 상태       | 페이지 수 | 비율     |
| ---------- | --------- | -------- |
| 정상       | 28        | 57%      |
| 부분동작   | 9         | 18%      |
| 임시구현   | 9         | 18%      |
| 에러       | 1         | 2%       |
| 재구축필요 | 1         | 2%       |
| 리다이렉트 | 1         | 2%       |
| **합계**   | **49**    | **100%** |

### 실제 데이터 연결 여부

| 구분                 | 페이지 수 |
| -------------------- | --------- |
| 실제 데이터 연결 (Y) | 26        |
| 부분 연결            | 5         |
| Mock/하드코딩만 (N)  | 14        |
| N/A (리다이렉트 등)  | 4         |

### UX 라이팅 언어 상태

| 구분                     | 페이지 수 |
| ------------------------ | --------- |
| Korean (한글 통일)       | 38        |
| Mixed (한글 + 영어 혼재) | 5         |
| English                  | 0         |
| N/A                      | 6         |

### 핵심 문제 요약

1. **기능 과다**: 사이드바에 10개 섹션, 30+ 메뉴 항목. 사용자가 구조를 이해하기 어려움
2. **기능 중복**: `/keywords`와 `/intent`가 동일 API 호출, `/listening-hub`가 하위 기능 통합본 → 같은 기능 3곳 진입
3. **Mock 의존 페이지**: channels/performance, reports, campaigns, contents 등 주요 기능이 mock 데이터
4. **미구현 페이지**: `/insights/evidence` 404, admin 4개 페이지 껍데기만
5. **랜딩 페이지 부재**: 제품 가치 전달 없이 로그인 버튼만 존재
6. **인텔리전스 복잡도**: `/intelligence` 페이지에 20+ 컴포넌트 임포트, 사용자 진입 장벽 극도로 높음
7. **네비게이션 혼란**: "검색 인텐트" 섹션에 9개 하위 메뉴, ListeningMind 기능과 고유 기능 구분 불명확
