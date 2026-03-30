# Sometrend 100% Phase 6 Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `apps/web/src/app/api/v1/intelligence/route.ts` | 외부 REST API (trend/mentions/sentiment) |

## 기존 활용 구조

| 구조 | 상태 | 활용 |
|------|------|------|
| Workspace.canAccessApi | 이미 존재 | API 인증 게이트 |
| Workspace.plan | 이미 존재 | 플랜별 차등 |
| Subscription 모델 | 이미 존재 | Stripe 연동 준비 |
| UsageMetric 모델 | 이미 존재 | 사용량 추적 |
| canExportData | 이미 존재 | 다운로드 권한 |
| tRPC 20+ endpoints | 이미 존재 | 내부 API |

## 상품화 준비 상태

| 계층 | 상태 |
|------|------|
| 내부 분석 API (tRPC) | **완료** — 20+ endpoints |
| 외부 데이터 API (REST) | **구현** — /api/v1/intelligence 3 actions |
| 플랜/쿼터 정책 | **구조 완료** — DB 필드 존재, 플랜별 차등 |
| 결제 연동 | **구조 준비** — Stripe 필드 존재 |
| API key 관리 | **미구현** — 현재 workspace 기반 간단 인증 |
| Rate limit | **미구현** — 향후 Redis middleware |
| 사용량 대시보드 | **부분** — UsageMetric 모델 존재, UI 미구현 |
