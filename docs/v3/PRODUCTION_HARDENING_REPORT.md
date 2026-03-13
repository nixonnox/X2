# Production Hardening Report (Phase 10)

## 개요

Phase 1~9까지 구축된 X2 플랫폼의 운영 안정성을 점검하고, 실서비스 출시 전 보완이 필요한 항목을 식별한 결과 보고서.

---

## 점검 결과 요약

| 심각도   | 발견 건수 | 즉시 수정 | 잔여 |
| -------- | --------- | --------- | ---- |
| CRITICAL | 4         | 4         | 0    |
| HIGH     | 10        | 3         | 7    |
| MEDIUM   | 12        | 1         | 11   |
| LOW      | 4         | 0         | 4    |

---

## CRITICAL — 즉시 수정 완료

### 1. AUTH_DEV_LOGIN 프로덕션 노출 위험 ✅ 수정됨

- **문제**: `AUTH_DEV_LOGIN=true` 설정 시 `NODE_ENV` 검증 없이 이메일만으로 로그인 가능
- **위치**: `packages/auth/src/config.ts:78`, `packages/auth/src/edge.ts:73`
- **수정**: `process.env.NODE_ENV !== "production"` 가드 추가

### 2. CRON_SECRET 미설정 시 인증 우회 ✅ 수정됨

- **문제**: `CRON_SECRET` env var 미설정 시 `/api/sync/cron` 인증을 건너뜀
- **위치**: `apps/web/src/app/api/sync/cron/route.ts:10-16`
- **수정**: 프로덕션에서 `CRON_SECRET` 미설정 시 500 에러 반환

### 3. QueueWorker devMode 기본값 ✅ 수정됨

- **문제**: `devMode = true` 하드코딩으로 프로덕션에서도 개발 모드 동작
- **위치**: `apps/web/src/lib/collection/queue.ts:89`
- **수정**: `devMode = process.env.NODE_ENV !== "production"` 으로 변경

## CRITICAL — 잔여: 없음 (모두 수정 완료)

### 4. 대시보드/댓글 Mock 데이터가 프로덕션 기본 경로 ✅ 수정됨

- **문제**: `apps/web/src/lib/mock-data.ts`, `dashboard-summary.ts`, `comment-service.ts` 등이 Mock 데이터를 프로덕션 경로에서 직접 사용
- **영향**: 실 데이터 연결 전까지 사용자에게 허위 데이터 표시
- **수정**: DemoBanner 컴포넌트를 대시보드/댓글/경쟁사 3개 페이지에 추가

---

## HIGH — 주요 항목

| #   | 항목                                    | 위치                                          | 상태                          |
| --- | --------------------------------------- | --------------------------------------------- | ----------------------------- |
| 1   | API 인바운드 Rate Limiting 부재         | Edge middleware                               | ✅ 수정됨                     |
| 2   | N+1 쿼리: risk-signal.service.ts        | `packages/api`                                | ✅ 수정됨                     |
| 3   | N+1 쿼리: listening-analysis.service.ts | `packages/api`                                | ✅ 수정됨                     |
| 4   | N+1 쿼리: reportAutomationService.ts    | `packages/api`                                | 미해결 (createMany 전환 필요) |
| 5   | 전환 단가 $50 하드코딩                  | `campaign-performance.service.ts:221`         | 미해결                        |
| 6   | 이메일 발송 Mock 구현만 존재            | `apps/web/src/lib/reports/report-delivery.ts` | 미해결                        |
| 7   | AEO 서비스 API 미연동                   | `geo-aeo.service.ts:174`                      | 미해결                        |
| 8   | WebSocket 알림 미구현                   | `notification.service.ts:77`                  | 미해결                        |
| 9   | 소셜 볼륨 수집 시뮬레이션               | `social-volume-collector.ts`                  | 미해결                        |
| 10  | AI 리스크 분류 미연동                   | `risk-signal.service.ts:118`                  | 미해결                        |

---

## MEDIUM — 보완 필요 항목

1. In-memory Rate Limiter (서버리스 환경 비호환)
2. ServiceResult 에러 코드 비표준화
3. Auth config/edge.ts 코드 중복
4. 수집 로그 in-memory 한정 (최대 500건)
5. 분석 엔진 로그 in-memory 한정 (최대 1000건)
6. AI 라우터 개발 모드 자동 감지 (NODE_ENV 의존)
7. 경쟁사 콘텐츠 유사도 AI 미연동
8. 트렌드 서비스 시즌성/조회수 null 반환
9. 리포트 내러티브 AI 생성 미구현
10. BullMQ 큐 시스템 미연동
11. 수집 오케스트레이션 소셜 플랫폼 미연동
12. 운영 모니터링 알림 미연동

---

## 코드 변경 내역 (Phase 10)

| 파일                                                                | 변경 내용                                |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `packages/auth/src/config.ts`                                       | NODE_ENV 가드 추가                       |
| `packages/auth/src/edge.ts`                                         | NODE_ENV 가드 추가                       |
| `apps/web/src/app/api/sync/cron/route.ts`                           | CRON_SECRET 필수화                       |
| `apps/web/src/lib/collection/queue.ts`                              | devMode 기본값 수정                      |
| `packages/api/src/services/comments/risk-signal.service.ts`         | N+1 쿼리 수정                            |
| `packages/api/src/services/listening/listening-analysis.service.ts` | N+1 쿼리 수정                            |
| `apps/web/src/components/shared/demo-banner.tsx`                    | 데모 데이터 배너 컴포넌트 신규           |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx`                   | DemoBanner 추가                          |
| `apps/web/src/app/(dashboard)/comments/page.tsx`                    | DemoBanner 추가                          |
| `apps/web/src/app/(dashboard)/competitors/page.tsx`                 | DemoBanner 추가                          |
| `apps/web/src/lib/rate-limit.ts`                                    | IP 기반 sliding window rate limiter 신규 |
| `apps/web/src/middleware.ts`                                        | Rate limiting 통합                       |
| `apps/web/src/app/(dashboard)/insights/reports/[id]/page.tsx`       | 이메일 발송 버튼 비활성화                |
| `apps/web/src/app/(dashboard)/insights/reports/new/page.tsx`        | 이메일 발송 옵션 비활성화                |
| `packages/social/src/tiktok.ts`                                     | DateRange 필드명 버그 수정               |
