# Task Status Classification

> Date: 2026-03-16

## A. 완료 + 검증 완료 (제외 가능)

| 축 | 작업 | 구현 | 검증 |
|----|------|------|------|
| 1 | PostgreSQL + Prisma migration (62 tables) | ✓ | DB smoke test PASS |
| 1 | History/Compare UI (AnalysisHistoryPanel, CurrentVsPrevious, period) | ✓ | Phase2 47항목 PASS |
| 1 | History query 종속성 수정 | ✓ | 코드 검증 PASS |
| 3 | maxAlertsPerDay 일일 한도 (UTC + 보수적) | ✓ | DB 시뮬레이션 4시나리오 PASS |
| 3 | Channel prefs → dispatch 연결 | ✓ | DB 시뮬레이션 3시나리오 PASS |
| 3 | AlertService prefs 연동 (DEFAULT_PREFS, prefsSource) | ✓ | 코드 검증 PASS |
| 3 | Cooldown/dedup/daily cap 통합 정합성 | ✓ | 통합 6시나리오 PASS |
| 4 | Bell dropdown (전체 기능) | ✓ | E2E 6항목 PASS |
| 4 | /notifications 페이지 | ✓ | 코드 확인 |
| 4 | /settings/notifications | ✓ | 코드 확인 |
| 5 | Webhook test POST | ✓ | 코드 검증 9에러 타입 PASS |
| 5 | External delivery retry (5/15/60분, 3회) | ✓ | 코드 검증 PASS |
| 5 | Persistent delivery log (structured log) | ✓ | 코드 검증 PASS |
| 6 | UX 정책 전역 파일 (5개) | ✓ | 파일 확인 |
| 6 | 13개 화면 UX 문구 교체 | ✓ | 코드 확인 |
| 6 | Compare 타입 카드 선택 / 업종 카드 | ✓ | 코드 확인 |
| 7 | BullMQ queue + Worker + Scheduler | ✓ | Phase3 검증 PASS |
| 8 | Retention policy + cleanup job | ✓ | Phase5 검증 PASS |
| 8 | Backfill service + worker | ✓ | Phase7 검증 PASS |
| 9 | UserAlertPreference projectId (DB schema) | ✓ | DB 시뮬레이션 4시나리오 PASS |
| 9 | 설정 변경 감사 로그 | ✓ | DB 시뮬레이션 6항목 PASS |
| 10 | Sentiment 분석 파이프라인 (LLM + Rule) | ✓ | Phase4 검증 PASS |

## B. 완료 + 검증 미완료

| 축 | 작업 | 상태 | 필요한 검증 |
|----|------|------|-----------|
| 없음 | — | — | — |

## C. 일부 완료 (후속 작업 필요)

| 축 | 작업 | 완료된 부분 | 남은 부분 |
|----|------|-----------|----------|
| 2 | Instagram 연결 | Adapter 완전 구현 | **토큰 미발급** (외부 절차) |
| 2 | TikTok 연결 | Adapter scaffold | **Research API 승인** (외부 2~4주) |
| 2 | X/Twitter 연결 | Adapter 완전 구현 | **비용 결정** ($100/월) |
| 5 | delivery_logs 테이블 직접 사용 | 테이블 존재 | **executionId nullable migration** (S1) |
| 5 | Retry setTimeout → BullMQ | setTimeout 동작 | **BullMQ delayed job 전환** (S1) |
| 7 | JobType enum 불일치 | snapshot 생성 동작 | **MENTION_COLLECT/SNAPSHOT_GEN 추가** (S1) |
| 9 | prisma generate | DB push 완료 | **dev 서버 정지 후 generate** |
| 9 | notification router projectId | 서비스 레이어 완료 | **tRPC endpoint 파라미터 추가** |
| 9 | Settings UI 프로젝트 선택 | — | **드롭다운 UI 추가** |

## D. 미착수

| 축 | 작업 | 비고 |
|----|------|------|
| 6 | EmptyState 공통 컴포넌트 추출 | 문구는 적용됨, 컴포넌트화 미완 |
| 6 | ErrorState 공통 컴포넌트 추출 | 동일 |
| 4 | Settings UI webhook "테스트" 버튼 | endpoint 있음, UI 미연결 |
| 10 | rawSocialMention에 sentiment 저장 | 분석은 됨, DB 저장 미완 |
| 10 | Analyzer worker에서 sentiment 호출 | bridge만 연동 |
