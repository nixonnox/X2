# Completed & Excluded Tasks

> 이 목록의 작업은 구현 + 검증 완료되었으므로, 향후 프롬프트에서 **재요청 불필요**.

| # | 작업 | 제외 가능 이유 |
|---|------|---------------|
| 1 | PostgreSQL + Prisma migration | DB smoke test PASS, 62 tables |
| 2 | History/Compare UI 연결 | Phase2 47항목 PASS, S1 수정 완료 |
| 3 | Notification Bell 전체 | E2E 6항목 PASS, 21/21 검증 |
| 4 | maxAlertsPerDay 일일 한도 | DB 시뮬레이션 PASS, UTC + 보수적 처리 |
| 5 | Channel prefs → dispatch | DB 시뮬레이션 PASS, false 채널 미시도 확인 |
| 6 | AlertService prefs 연동 | 코드 검증 PASS, prefsSource 추적 |
| 7 | BullMQ queue + workers | Phase3 검증 PASS |
| 8 | Sentiment 파이프라인 | Phase4 검증 PASS |
| 9 | Retention policy | Phase5 검증 PASS |
| 10 | Backfill 메커니즘 | Phase7 검증 PASS |
| 11 | Provider 확장 문서화 | Phase6 검증 PASS |
| 12 | Webhook test POST | 코드 검증 PASS, 9에러 타입 |
| 13 | Delivery retry | 코드 검증 PASS, 5/15/60분 3회 |
| 14 | 설정 변경 감사 로그 | DB 시뮬레이션 PASS |
| 15 | Project-scoped prefs (DB) | DB 시뮬레이션 PASS |
| 16 | UX 정책 + 문구 교체 (13파일) | 코드 확인 |
| 17 | 카드 선택 UI (비교 타입 + 업종) | 코드 확인 |
| 18 | 통합 검증 (Alert P1/P2) | 6시나리오 PASS |
| 19 | 통합 검증 (Settings+Delivery) | 6 Step PASS |
