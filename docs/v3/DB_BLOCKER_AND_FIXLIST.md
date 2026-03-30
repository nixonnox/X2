# DB Blocker & Fix List

> Date: 2026-03-15
> Status: 0 Blockers, 2 S1 Open, 4 Improvements

## Blockers

**없음** (B-1 해결 완료)

## S1 Issues (DB/Persistence 관련)

### S1-3. providerCoverage 항상 null로 저장
- **위치:** `intelligence_analysis_runs.providerCoverage`
- **영향:** 어떤 소셜 provider가 기여했는지 추적 불가
- **현상:** analyze router에서 providerCoverage를 계산하지만, liveMentionService registry가 empty일 수 있음
- **우선순위:** MEDIUM

### S1-4. Null sentiment → NEUTRAL 처리
- **위치:** 소셜 멘션 → `social_mention_snapshots` 저장 시
- **영향:** 감성 분포가 왜곡 (100% neutral로 표시)
- **현상:** 이미 unclassifiedCount 분리 저장으로 부분 수정됨 (liveMentions route). 하지만 analyze route의 socialData.sentiment에서는 아직 미분리
- **우선순위:** MEDIUM

## Improvements (Non-blocking)

### I-1. Docker 데이터 영속성
- **현상:** 현재 Docker 기본 anonymous volume 사용. `docker rm x2-postgres` 시 데이터 소실
- **수정 방향:** named volume 또는 `docker-compose.yml`로 관리
- **우선순위:** MEDIUM

### I-2. IntelligenceHistoryRepository 명시적 클래스 부재
- **현상:** 문서에서 `IntelligenceHistoryRepository`를 언급하나, 실제로는 `IntelligencePersistenceService`가 history 조회까지 담당
- **영향:** 기능적 문제 없음
- **우선순위:** LOW

### I-3. Prisma deprecated warning
- **현상:** `package.json#prisma` 설정이 Prisma 7에서 제거 예정
- **우선순위:** LOW

### I-4. delivery_logs FK 제약 — automation_executions 필수
- **현상:** `delivery_logs` 테이블이 `executionId` FK로 `automation_executions`를 참조. 직접 alert에서는 execution record가 없으므로 delivery_logs에 직접 INSERT 불가
- **수정 방향:** schema 변경 (executionId nullable) 또는 lightweight execution record 자동 생성
- **우선순위:** LOW — ChannelDispatchService에 prisma 주입 완료, 구조적 수정만 남음

## 해결 완료

| Item | Description | Resolved |
|------|-------------|----------|
| DB 연결 | PostgreSQL Docker 컨테이너 실행 + 연결 확인 | 2026-03-15 |
| Migration | `20260315132456_init` 적용 (62 tables) | 2026-03-15 |
| ENV 일관성 | 3개 .env 파일 모두 동일 DATABASE_URL | 2026-03-15 |
| Smoke test | intelligence + notification 저장/조회 검증 | 2026-03-15 |
| B-1 | ChannelDispatchService에 prisma 주입 경로 추가 | 2026-03-15 |
| S1-1 | createAlertNotification try-catch — 이미 구현되어 있음 확인 | 2026-03-15 |
| S1-2 | maxAlertsPerDay — 이미 enforce 구현되어 있음 확인 (line 153-158) | 2026-03-15 |
| S1-5 | sourceId에 projectId 포함 — 이미 구현되어 있음 확인 (line 182) | 2026-03-15 |
| S0-1 | Notification Bell — 이미 완전 구현되어 있음 확인 (top-bar.tsx) | 2026-03-15 |
| E2E | DB 데이터 삽입 → history/compare/notification 조회 검증 | 2026-03-15 |
| Phase2 | History/Compare UI S1 쿼리 종속성 수정 | 2026-03-15 |
