# Phase 6: Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 2 S2, 3 S3

## S0 — Provider 확장 핵심 흐름 오판

**없음** — 핵심 제품 흐름이 Instagram/TikTok에 의존하지 않음 확인.

## S1 — 출시 전 반드시 수정

**없음**

## S2 — 제한 오픈 가능

### S2-1. Instagram 토큰 미발급

- **현상:** Adapter 완전 구현이나 `INSTAGRAM_ACCESS_TOKEN` 미설정
- **영향:** Instagram 멘션 수집 불가 (providerCoverage에서 NOT_CONNECTED)
- **수정:** Business 계정 + Facebook Page + OAuth Token 발급 → `.env.local` 설정
- **난이도:** MEDIUM (외부 절차)

### S2-2. TikTok Research API 승인 미신청

- **현상:** 개발자 계정 미등록, Research API 승인 미신청
- **영향:** TikTok 멘션 수집 불가
- **수정:** TikTok 개발자 등록 → Research API 신청 (2~4주)
- **난이도:** HIGH (외부 승인 대기)

## S3 — 개선 권장

### S3-1. Instagram 토큰 자동 갱신 미구현

- **현상:** Long-lived Token이 60일 후 만료, 수동 갱신 필요
- **수정:** 자동 갱신 로직 (만료 7일 전 자동 교환)

### S3-2. X/Twitter 비용 미결정

- **현상:** Basic tier $100/월 필요, 비즈니스 의사결정 대기
- **수정:** 비용 대비 가치 평가 후 결정

### S3-3. OAuth Token DB 저장 미구현

- **현상:** 모든 토큰이 `.env` 환경변수에 저장
- **영향:** 멀티 테넌트 시 토큰 분리 어려움
- **수정:** token storage 테이블 + 암호화
