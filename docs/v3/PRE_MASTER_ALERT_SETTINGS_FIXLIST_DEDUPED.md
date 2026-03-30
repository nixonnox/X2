# Pre-Master Alert Settings Fix List (Deduped)

> Date: 2026-03-16
> **S0/S1: 없음. Master QA 진행 가능.**

## 필수 수정: 없음

모든 P0 + P1 항목 완료 + 검증됨.

## 권장 (P2)

| # | 항목 | 난이도 |
|---|------|--------|
| 1 | Settings UI 프로젝트 드롭다운 | MEDIUM |
| 2 | Settings UI webhook 테스트 버튼 | LOW |

## Master QA 전 E2E 확인 (모두 검증됨)

- [x] 설정 저장 → audit log ✓
- [x] webhook URL 저장 → test POST ✓
- [x] 분석 → daily cap ✓
- [x] channel prefs → dispatch ✓
- [x] project-specific → global fallback ✓
- [x] email verified → delivery eligibility ✓
- [x] retry → BullMQ delayed ✓
- [x] delivery_logs DB 기록 ✓
- [x] Bell unread ≠ audit ✓
