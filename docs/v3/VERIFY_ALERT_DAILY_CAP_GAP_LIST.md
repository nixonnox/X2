# Verify: Alert Daily Cap Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 0 S2, 1 S3

## S0 — 핵심 흐름 불성립
**없음**

## S1 — 출시 전 수정 필요
**없음**

## S2 — 제한 오픈 가능
**없음** (이전 S2-1 count 실패 보수적 처리 + S3-1 UTC 기준 모두 이번 수정에서 해결)

## S3 — 개선 권장

### S3-1. Per-project cap 미구현
- **현상:** Daily cap이 userId 단위 (모든 프로젝트 합산)
- **영향:** 프로젝트가 많은 사용자는 일부 프로젝트 알림을 놓칠 수 있음
- **수정:** userId + projectId 기준 per-project cap 옵션
- **긴급도:** LOW
