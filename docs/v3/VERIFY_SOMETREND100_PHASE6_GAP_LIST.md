# Verify: Phase6 Gap List

> Date: 2026-03-16
> S0: 0, S1: 0, S2: 3, S3: 2

## S2

### S2-1. API key 발급/관리 UI
- 현재 workspace 기반 간단 인증 → 전용 API key 발급 필요

### S2-2. Rate limit middleware
- 현재 미구현 → Redis sliding window 권장

### S2-3. canExportData enforcement
- CSV 다운로드 시 플랜 체크 미구현

## S3

### S3-1. Usage tracking dashboard
### S3-2. Stripe 실제 결제 연동
