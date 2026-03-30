# Partial & Remaining Tasks

> 후속 구현/작업이 필요한 항목만.

## S1 — Master QA 전 필수

| # | 작업 | 현재 | 필요한 작업 | 난이도 |
|---|------|------|-----------|--------|
| S1-1 | delivery_logs.executionId nullable | FK NOT NULL | schema migration 1줄 | LOW |
| S1-2 | Retry setTimeout → BullMQ delayed | setTimeout 동작 | queue.add with delay | MEDIUM |
| S1-3 | JobType enum 추가 | enum에 없음 | schema에 2값 추가 + migration | LOW |
| S1-4 | prisma generate | DB push 완료 | dev 서버 정지 → generate | LOW |

## S2 — 기능 완성

| # | 작업 | 필요한 작업 | 난이도 |
|---|------|-----------|--------|
| S2-1 | notification router projectId | input에 optional param 추가 | LOW |
| S2-2 | Settings UI 프로젝트 드롭다운 | 프로젝트 선택 → projectId 전달 | MEDIUM |
| S2-3 | Settings UI webhook 테스트 버튼 | testWebhook endpoint 호출 버튼 | LOW |
| S2-4 | rawSocialMention sentiment 저장 | collectLiveMentions 후 DB update | LOW |
| S2-5 | Analyzer worker sentiment 호출 | processCollection에서 sentiment 서비스 호출 | LOW |

## S3 — Polish / 개선

| # | 작업 | 난이도 |
|---|------|--------|
| S3-1 | EmptyState 공통 컴포넌트 추출 | MEDIUM |
| S3-2 | ErrorState 공통 컴포넌트 추출 | MEDIUM |
| S3-3 | 알림 채널 카드형 전환 (Settings) | MEDIUM |
| S3-4 | IntelligenceSummaryCards 문구 | LOW |
| S3-5 | SignalFusionOverlayPanel 문구 | LOW |
| S3-6 | TaxonomyHeatMatrix 문구 | LOW |
| S3-7 | BullMQ Dashboard 설치 | LOW |
| S3-8 | 타입별 cooldown 사용자 설정 | LOW |
| S3-9 | delivery_logs audit → DB 저장 | LOW |

## 외부 의존 (구현 불가 — 비즈니스 결정)

| # | 작업 | Blocker |
|---|------|---------|
| EXT-1 | Instagram 토큰 발급 | Business 계정 + OAuth |
| EXT-2 | TikTok Research API 승인 | 2~4주 |
| EXT-3 | X/Twitter 비용 결정 | $100/월 |
