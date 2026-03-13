# CODE_REUSE_AUDIT — 기존 코드베이스 재사용/폐기 판단

> 작성일: 2026-03-10
> 상태: 확정
> 분석 대상: X2 프로젝트 전체 (200+ 소스 파일, 8 패키지, 1 앱)

---

## 1. 현재 상태 요약

| 항목            | 평가                                                       |
| --------------- | ---------------------------------------------------------- |
| 아키텍처 품질   | 9/10 — Turborepo 모노레포, 깔끔한 관심사 분리, 타입 안전성 |
| 구현 완성도     | 4/10 — UI 셸 완성, 데이터 계층 대부분 Mock/Hardcoded       |
| 프로덕션 준비도 | 3/10 — Auth 동작, DB 스키마 준비, 나머지 미연결            |
| 코드 재사용률   | 70% — 인프라/아키텍처 대부분 유지, 비즈니스 로직 재작성    |

---

## 2. 판정 기준

| Tier          | 판정                | 기준                                           |
| ------------- | ------------------- | ---------------------------------------------- |
| ✅ **Tier 1** | 유지 및 즉시 재사용 | 프로덕션 수준, 변경 불필요                     |
| 🔧 **Tier 2** | 리팩토링 후 재사용  | 아키텍처 유지, 데이터 계층/구현 교체           |
| ❌ **Tier 3** | 폐기 후 재작성      | Mock/Hardcoded 중심, 실데이터로 완전 교체 필요 |
| 🆕 **Tier 4** | 신규 구현 필요      | 현재 빈 플레이스홀더 또는 미존재               |

---

## 3. 패키지별 판정

### 3.1 `@x2/db` (packages/db)

| 파일                   | Tier      | 근거                                                               |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| `prisma/schema.prisma` | ✅ Tier 1 | v2.1 스키마 완성 (50+ 모델, 50+ enum). 8단계 Phase 설계 반영 완료. |
| `prisma/seed.ts`       | ✅ Tier 1 | Dev 시드 데이터 생성. 추후 확장만 필요.                            |
| `src/index.ts`         | ✅ Tier 1 | Prisma 싱글턴 + 타입 re-export.                                    |

**종합**: 전체 유지. Migration 실행만 하면 즉시 프로덕션 사용 가능.

### 3.2 `@x2/auth` (packages/auth)

| 파일            | Tier      | 근거                                                                      |
| --------------- | --------- | ------------------------------------------------------------------------- |
| `src/config.ts` | ✅ Tier 1 | Auth.js v5 + PrismaAdapter. Google/Naver/Kakao OAuth 완전 구현. JWT 전략. |
| `src/edge.ts`   | ✅ Tier 1 | Edge Runtime 호환 인증. Middleware용.                                     |
| `src/index.ts`  | ✅ Tier 1 | Export barrel.                                                            |

**종합**: 전체 유지. 환경변수 설정만 하면 즉시 동작.

### 3.3 `@x2/api` (packages/api)

| 파일                     | Tier      | 근거                                                        |
| ------------------------ | --------- | ----------------------------------------------------------- |
| `src/trpc.ts`            | ✅ Tier 1 | tRPC 인프라 (context, publicProcedure, protectedProcedure). |
| `src/root.ts`            | 🔧 Tier 2 | channelRouter만 존재. 20+ 라우터 추가 필요.                 |
| `src/routers/channel.ts` | 🔧 Tier 2 | 실제 Prisma 쿼리 사용. CRUD 확장 필요.                      |

**종합**: 인프라 유지, 라우터 대폭 확장 필요.

### 3.4 `@x2/social` (packages/social)

| 파일                      | Tier      | 근거                                             |
| ------------------------- | --------- | ------------------------------------------------ |
| `src/types.ts`            | ✅ Tier 1 | SocialProvider 인터페이스. 깔끔한 추상화.        |
| `src/youtube.ts`          | ✅ Tier 1 | YouTube Data API v3 완전 구현. 실API 연동.       |
| `src/instagram.ts`        | 🔧 Tier 2 | Graph API 구조 있음. 실 토큰 테스트 필요.        |
| `src/tiktok.ts`           | 🔧 Tier 2 | Display API 구조 있음. API 승인 후 완성 필요.    |
| `src/x.ts`                | 🔧 Tier 2 | X API v2 구조 있음. 실 토큰 테스트 필요.         |
| `src/rate-limiter.ts`     | ✅ Tier 1 | 토큰 버킷 알고리즘. 프로덕션 수준.               |
| `src/errors.ts`           | ✅ Tier 1 | 에러 계층 (PlatformApiError, RateLimitError 등). |
| `src/provider-factory.ts` | ✅ Tier 1 | 팩토리 패턴.                                     |

**종합**: YouTube 즉시 사용 가능. Instagram/TikTok/X API 완성만 필요.

### 3.5 `@x2/ui` (packages/ui)

| 파일                        | Tier      | 근거                        |
| --------------------------- | --------- | --------------------------- |
| `src/utils.ts`              | ✅ Tier 1 | cn() 유틸리티.              |
| `src/primitives/button.tsx` | ✅ Tier 1 | CVA 기반 버튼. shadcn 패턴. |
| `src/primitives/card.tsx`   | ✅ Tier 1 | 카드 컴포넌트.              |

**종합**: 유지. 공통 컴포넌트 추가 확장 필요 (DataTable, StatCard 등을 앱에서 이동).

### 3.6 `@x2/types` (packages/types)

| 파일              | Tier      | 근거                             |
| ----------------- | --------- | -------------------------------- |
| `src/common.ts`   | ✅ Tier 1 | Pagination, DateRange, ApiError. |
| `src/platform.ts` | ✅ Tier 1 | SocialPlatform, ChannelInfo 등.  |

**종합**: 전체 유지, 확장.

### 3.7 `@x2/queue` (packages/queue)

| 파일           | Tier      | 근거                               |
| -------------- | --------- | ---------------------------------- |
| `src/index.ts` | 🆕 Tier 4 | 빈 파일. BullMQ + Redis 구현 필요. |

### 3.8 `@x2/ai` (packages/ai)

| 파일           | Tier      | 근거                                           |
| -------------- | --------- | ---------------------------------------------- |
| `src/index.ts` | 🆕 Tier 4 | 빈 파일. `apps/web/src/lib/ai/`에서 추출 필요. |

### 3.9 `workers/analyzer`

| 파일           | Tier      | 근거                                           |
| -------------- | --------- | ---------------------------------------------- |
| `src/index.ts` | 🆕 Tier 4 | console.log만 존재. 백그라운드 워커 구현 필요. |

---

## 4. 앱 코드 판정 (apps/web)

### 4.1 인프라/설정 — ✅ Tier 1 (전체 유지)

| 파일                                   | 근거                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `middleware.ts`                        | Auth 미들웨어, public path 정의. 프로덕션 수준.      |
| `components/providers.tsx`             | SessionProvider + QueryClient + tRPC. 프로덕션 수준. |
| `i18n/config.ts`, `i18n/request.ts`    | next-intl v4 설정.                                   |
| `messages/ko.json`, `messages/en.json` | 번역 파일 200+ 키.                                   |
| `styles/tokens.css`, `app/globals.css` | 디자인 토큰, 전역 스타일.                            |
| `app/layout.tsx`                       | 루트 레이아웃.                                       |
| `lib/trpc.ts`                          | 클라이언트 tRPC 훅.                                  |
| `lib/auth.ts`                          | 세션 헬퍼.                                           |
| `lib/utils.ts`                         | 유틸리티.                                            |
| `lib/constants.ts`                     | 네비게이션 상수.                                     |
| `hooks/use-mounted.ts`                 | 하이드레이션 방지 훅.                                |

### 4.2 인증 페이지 — ✅ Tier 1

| 파일                          | 근거                               |
| ----------------------------- | ---------------------------------- |
| `app/(auth)/layout.tsx`       | 인증 레이아웃.                     |
| `app/(auth)/login/`           | Google/Naver/Kakao 로그인. 실동작. |
| `app/(auth)/signup/`          | 가입 페이지.                       |
| `app/(auth)/forgot-password/` | 비밀번호 찾기.                     |
| `app/(auth)/onboarding/`      | 온보딩 위자드.                     |

### 4.3 레이아웃 컴포넌트 — ✅ Tier 1

| 파일                              | 근거                                                |
| --------------------------------- | --------------------------------------------------- |
| `components/layout/app-shell.tsx` | Sidebar + TopBar + 메인 영역. Suspense 경계 포함.   |
| `components/layout/sidebar.tsx`   | 네비게이션, 워크스페이스 스위처, 어드민 패널, i18n. |
| `components/layout/top-bar.tsx`   | 검색, 로케일 스위처, 사용자 아바타.                 |
| `components/layout/header.tsx`    | 재사용 가능 페이지 헤더.                            |

### 4.4 공통 컴포넌트 — ✅ Tier 1

| 파일                                 | 근거                                 |
| ------------------------------------ | ------------------------------------ |
| `components/shared/page-header.tsx`  | 페이지 헤더 (제목, 설명, 가이드 팁). |
| `components/shared/stat-card.tsx`    | KPI 카드 (값, 변화율, 아이콘).       |
| `components/shared/kpi-card.tsx`     | KPI 표시 변형.                       |
| `components/shared/chart-card.tsx`   | 차트 래퍼 카드.                      |
| `components/shared/data-table.tsx`   | 재사용 데이터 테이블.                |
| `components/shared/empty-state.tsx`  | 빈 상태 표시.                        |
| `components/shared/insight-card.tsx` | 인사이트 카드.                       |

### 4.5 도메인 컴포넌트 — 🔧 Tier 2 (UI 유지, 데이터 바인딩 교체)

| 컴포넌트 그룹             | 파일 수 | 현재 상태              | 필요 작업                 |
| ------------------------- | ------- | ---------------------- | ------------------------- |
| `components/channels/`    | 11      | UI 완성, Mock 데이터   | tRPC/Prisma 데이터로 교체 |
| `components/comments/`    | 6       | UI 완성, Mock 데이터   | tRPC/Prisma 데이터로 교체 |
| `components/competitors/` | 5       | UI 완성, Mock 데이터   | tRPC/Prisma 데이터로 교체 |
| `components/insights/`    | 5       | UI 완성, Mock 인사이트 | AI 기반 인사이트로 교체   |
| `components/collection/`  | 5       | UI 완성, Mock 상태     | BullMQ 상태로 교체        |
| `components/reports/`     | 7       | UI 완성, Mock 데이터   | tRPC/Prisma 데이터로 교체 |
| `components/admin/`       | 1       | 레이아웃만             | 관리 기능 구현            |

**총 51개 UI 컴포넌트** — 모두 UI 코드는 유지. 데이터 소스만 교체.

### 4.6 대시보드 페이지 — 🔧 Tier 2 (구조 유지, 데이터 교체)

| 페이지                   | 현재                      | 필요 작업                 |
| ------------------------ | ------------------------- | ------------------------- |
| `dashboard/page.tsx`     | channelService(Mock) 집계 | tRPC 쿼리로 교체          |
| `channels/page.tsx`      | channelService(Mock) 목록 | tRPC 쿼리로 교체          |
| `channels/[id]/page.tsx` | channelService(Mock) 상세 | tRPC 쿼리로 교체          |
| `comments/page.tsx`      | commentService(Mock)      | tRPC 쿼리로 교체          |
| `competitors/page.tsx`   | Mock 비교 데이터          | tRPC 쿼리로 교체          |
| `keywords/page.tsx`      | Mock 키워드 데이터        | tRPC 쿼리로 교체          |
| `insights/page.tsx`      | Mock 인사이트             | AI 생성 인사이트로 교체   |
| `insights/reports/`      | Mock 리포트               | tRPC + 리포트 빌더로 교체 |
| `billing/page.tsx`       | Hardcoded 가격            | Stripe 연동               |
| `settings/page.tsx`      | Hardcoded 워크스페이스    | tRPC 쿼리로 교체          |

### 4.7 서비스 계층 — 혼합 판정

#### ✅ Tier 1 (유지)

| 파일                                   | 근거                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `lib/channels/url/` (8파일)            | URL 파싱/정규화. YouTube/Instagram/TikTok/X 패턴 완전 커버. 프로덕션 수준. |
| `lib/channels/platform-registry.ts`    | 플랫폼 메타데이터 레지스트리.                                              |
| `lib/channels/validation.ts`           | 입력 검증.                                                                 |
| `lib/collection/connectors/base.ts`    | 추상 커넥터 베이스 클래스. 프로덕션 수준.                                  |
| `lib/collection/connectors/youtube.ts` | YouTube Data API v3 실연동. 프로덕션 수준.                                 |
| `lib/collection/registry.ts`           | 커넥터 레지스트리 (factory + fallback).                                    |
| `lib/collection/types.ts`              | 수집 타입 정의.                                                            |

#### 🔧 Tier 2 (아키텍처 유지, 데이터 교체)

| 파일                                     | 필요 작업                                          |
| ---------------------------------------- | -------------------------------------------------- |
| `lib/channels/channel-service.ts`        | globalThis Mock → Prisma 쿼리 교체                 |
| `lib/channels/types.ts`                  | Prisma 타입과 정렬                                 |
| `lib/comments/comment-service.ts`        | Mock 캐시 → Prisma 쿼리 교체                       |
| `lib/comments/types.ts`                  | 유지                                               |
| `lib/ai/` (23파일 전체)                  | `@x2/ai` 패키지로 추출 + Mock → 실 프로바이더 전환 |
| `lib/intent-engine/` (11파일 전체)       | Mock API → 실 API 교체 (Google Trends, Naver 등)   |
| `lib/reports/types.ts`                   | 유지 (228줄 타입 정의)                             |
| `lib/collection/connectors/instagram.ts` | API 구현 완성                                      |
| `lib/collection/connectors/tiktok.ts`    | API 구현 완성                                      |
| `lib/collection/connectors/x.ts`         | API 구현 완성                                      |

#### ❌ Tier 3 (폐기 후 재작성)

| 파일                                            | 근거                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `lib/insights/insight-generator.ts`             | **전체 Hardcoded**. 12개 인사이트가 문자열 리터럴. 실데이터 기반 AI 생성으로 완전 교체. |
| `lib/insights/action-generator.ts`              | Hardcoded 액션 추천. AI 기반 재작성.                                                    |
| `lib/insights/strategy-generator.ts`            | Hardcoded 전략 제안. AI 기반 재작성.                                                    |
| `lib/insights/report-generator.ts`              | Stub. ReportSection + EvidenceAsset 기반 재작성.                                        |
| `lib/competitors/comparison-service.ts`         | Hardcoded 비교 데이터. Prisma 기반 재작성.                                              |
| `lib/competitors/content-analyzer.ts`           | Hardcoded. 재작성.                                                                      |
| `lib/competitors/insight-generator.ts`          | Hardcoded. 재작성.                                                                      |
| `lib/comments/analyzers/sentiment.ts`           | 키워드 매칭. LLM 교체.                                                                  |
| `lib/comments/analyzers/topic.ts`               | 키워드 매칭. LLM 교체.                                                                  |
| `lib/comments/analyzers/risk.ts`                | 규칙 기반. LLM 교체.                                                                    |
| `lib/comments/analyzers/response-suggestion.ts` | 템플릿 기반. LLM 교체.                                                                  |
| `lib/comments/analyzers/faq-extractor.ts`       | 패턴 매칭. LLM 교체.                                                                    |
| 모든 `mock-data.ts` 파일 (6개)                  | DB 연결 후 삭제.                                                                        |

#### 🆕 Tier 4 (신규 구현)

| 대상                          | 필요 내용                            |
| ----------------------------- | ------------------------------------ |
| `lib/collection/scheduler.ts` | BullMQ 기반 스케줄링                 |
| `lib/collection/queue.ts`     | Job 큐 연동                          |
| GEO/AEO 서비스                | AeoKeyword, AeoSnapshot 수집/분석    |
| 캠페인 서비스                 | Campaign CRUD, CampaignCreator 관리  |
| 인플루언서 서비스             | InfluencerProfile 스코어링, 검색     |
| 데이터 내보내기 서비스        | DataExportJob 처리                   |
| Vertical Pack 서비스          | VerticalPack 관리, 벤치마크 적용     |
| 리포트 빌더 서비스            | ReportSection + EvidenceAsset 조합   |
| ROI 계산 서비스               | RoiCalculation 산출                  |
| 알림 시스템                   | Notification 모델 + WebSocket/이메일 |

### 4.8 API Routes — 혼합 판정

| Route                        | Tier | 근거                                |
| ---------------------------- | ---- | ----------------------------------- |
| `api/auth/[...nextauth]/`    | ✅   | Auth.js 핸들러. 프로덕션.           |
| `api/trpc/[trpc]/`           | ✅   | tRPC 엔드포인트. 프로덕션.          |
| `api/health/`                | ✅   | 헬스 체크.                          |
| `api/locale/`                | ✅   | 로케일 설정.                        |
| `api/demo/analyze/`          | 🔧   | 실 API + 샘플 혼합. 정리 필요.      |
| `api/ai/execute/`            | 🔧   | AI 실행. Mock → 실 프로바이더 전환. |
| `api/intent/analyze/`        | 🔧   | 인텐트 분석. Mock → 실 API 전환.    |
| `api/channels/`, `api/sync/` | ❌   | Stub. tRPC로 통합 또는 재작성.      |

---

## 5. 수치 요약

### 파일 수 기준

| Tier                 | 파일 수 | 비율 | 의미                       |
| -------------------- | ------- | ---- | -------------------------- |
| ✅ Tier 1 (유지)     | ~80     | 40%  | 즉시 재사용                |
| 🔧 Tier 2 (리팩토링) | ~85     | 42%  | 아키텍처 유지, 데이터 교체 |
| ❌ Tier 3 (재작성)   | ~18     | 9%   | Mock/Hardcoded 완전 교체   |
| 🆕 Tier 4 (신규)     | ~18+    | 9%   | 새로 만들어야 할 것        |

### 코드량 기준

| 영역              | 현재 LOC | 재사용률                   |
| ----------------- | -------- | -------------------------- |
| Prisma Schema     | ~1,500   | 100%                       |
| Auth 패키지       | ~300     | 100%                       |
| Social 커넥터     | ~800     | 80%                        |
| tRPC 인프라       | ~200     | 90%                        |
| AI 오케스트레이션 | ~2,000   | 85% (추출 후)              |
| Intent 엔진       | ~1,500   | 70% (API 교체)             |
| UI 컴포넌트       | ~5,000   | 90% (데이터 바인딩만 교체) |
| 서비스 계층       | ~3,000   | 50% (Mock 제거)            |
| Mock 데이터       | ~2,000   | 0% (전체 삭제)             |
| 설정/인프라       | ~1,000   | 100%                       |

---

## 6. 핵심 판단

### 6.1 지금 당장 부족한 점

1. **실데이터 연결 0%**: 모든 대시보드가 Mock/globalThis 기반. DB 연결 시 즉시 전환 가능.
2. **AI 분석 Mock 모드**: 감성/토픽/인사이트 모두 규칙 기반 또는 Hardcoded. LLM 교체 필수.
3. **수집 파이프라인 미완성**: YouTube 커넥터만 구현. 스케줄링/큐 미구현.
4. **GEO/AEO/캠페인/인플루언서**: 스키마만 존재. 서비스/UI 전무.
5. **결제**: Stripe 미연동. 가격표 Hardcoded.
6. **알림/모니터링**: 시스템 없음.

### 6.2 코드 폐기 기준

**폐기 이유가 되는 것**:

- 코드 내 Hardcoded 데이터 리터럴 (인사이트 문자열, Mock 객체)
- 규칙 기반 분석기 (키워드 매칭 감성 분석 등)
- globalThis 인메모리 스토어

**폐기 이유가 되지 않는 것**:

- Mock 프로바이더 (AI mock-provider.ts): 테스트/dev 용도로 유지
- 타입 정의: Hardcoded 데이터 옆의 타입은 유지
- UI 컴포넌트: 데이터 소스만 교체하면 재사용

### 6.3 다음 단계 권고

```
Phase 0 (인프라):
  PostgreSQL 연결 → prisma migrate deploy
  Redis 연결 → BullMQ 설정
  → 이후 모든 작업의 기반

Phase 1 (실데이터 전환):
  channelService → tRPC + Prisma 교체
  YouTube 수집 파이프라인 연결
  UI 데이터 바인딩 교체

Phase 2 (AI 전환):
  lib/ai/ → @x2/ai 패키지 추출
  Mock 프로바이더 → Claude/GPT 실연동
  댓글 분석기 LLM 교체
```
