# Reprioritized Backlog

> Date: 2026-03-16
> 남은 작업만. 완료+검증된 19개 작업 제외.

## P0 — Master QA 전 필수 (4건)

| 기능 축 | 작업 | 현재 | 구현/검증 | 선행 | 영향 |
|---------|------|------|----------|------|------|
| Delivery | delivery_logs.executionId nullable | FK 제약 | 구현 | — | 발송 이력 DB 쿼리 |
| Delivery | setTimeout → BullMQ delayed job | setTimeout | 구현 | — | 재시도 영속성 |
| Scheduled | JobType enum MENTION_COLLECT/SNAPSHOT_GEN | 미존재 | 구현 | — | job 상태 추적 |
| Project | prisma generate | DB push 완료 | 실행만 | dev 서버 정지 | TypeScript 타입 |

## P1 — 기능 완성 (5건)

| 기능 축 | 작업 | 구현/검증 | 선행 | 영향 |
|---------|------|----------|------|------|
| Project | notification router projectId | 구현 | P0-4 | Settings에서 project 설정 |
| Project | Settings UI 프로젝트 드롭다운 | 구현 | P1-1 | 사용자가 project 설정 가능 |
| Notification | Settings webhook 테스트 버튼 | 구현 | — | UX 완성 |
| Sentiment | rawSocialMention sentiment DB 저장 | 구현 | — | 재분석 방지 |
| Sentiment | Analyzer worker sentiment 호출 | 구현 | P1-4 | 스케줄 수집 시 sentiment |

## P2 — Polish (9건)

| 기능 축 | 작업 | 구현/검증 | 영향 |
|---------|------|----------|------|
| UX | EmptyState 공통 컴포넌트 | 구현 | 재사용성 |
| UX | ErrorState 공통 컴포넌트 | 구현 | 재사용성 |
| UX | 알림 채널 카드형 전환 | 구현 | Settings UX |
| UX | SummaryCards/FusionPanel/HeatMatrix 문구 | 구현 | 일관성 |
| Ops | BullMQ Dashboard 설치 | 구현 | 모니터링 |
| Alert | 타입별 cooldown 사용자 설정 | 구현 | 세분화 |
| Delivery | delivery log DB 저장 (S1 이후) | 구현 | 감사 |
| Provider | Instagram 토큰 발급 | 외부 | coverage |
| Provider | TikTok Research API 신청 | 외부 | coverage |
