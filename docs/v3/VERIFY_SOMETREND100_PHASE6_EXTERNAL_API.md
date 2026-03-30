# Verify: External API

> Date: 2026-03-16
> Status: 완료 (기본 구조)

## External REST API

| 항목 | 상태 | 근거 |
|------|------|------|
| Endpoint | PASS | `/api/v1/intelligence` — route.ts |
| Bearer 인증 | PASS | `Authorization: Bearer {token}` — line 23-27 |
| canAccessApi 게이트 | PASS | workspace.canAccessApi 체크 — line 62 |
| action=trend | PASS | socialMentionSnapshot 조회 |
| action=mentions | PASS | rawSocialMention 조회, limit 파라미터 |
| action=sentiment | PASS | sentiment 분포 집계 |
| 에러 응답 5종 | PASS | UNAUTHORIZED/PLAN_RESTRICTED/MISSING_PARAM/INVALID_ACTION/INTERNAL_ERROR |
| 한국어 에러 메시지 | PASS | 해요체 |
| Mock 아님 | PASS | 실제 Prisma DB 조회 |

## Internal vs External 구분

| API | 유형 | 경로 |
|-----|------|------|
| tRPC 20+ endpoints | **Internal** | `/api/trpc/*` |
| `/api/v1/intelligence` | **External** | REST, Bearer auth |
