# Pre-Master Alert Fix List

> Date: 2026-03-16
> Master QA/QC 전에 반드시 확인/수정할 항목

## 반드시 수정 (S1)

| # | 항목 | 현재 상태 | 수정 방향 | 난이도 |
|---|------|----------|----------|--------|
| 1 | delivery_logs.executionId nullable | FK NOT NULL | schema migration | LOW |
| 2 | retry setTimeout → BullMQ | 서버 재시작 시 소실 | delayed job 전환 | MEDIUM |

## 권장 수정 (S2)

| # | 항목 | 수정 방향 | 난이도 |
|---|------|----------|--------|
| 3 | Daily cap count 실패 시 보수적 처리 | count 실패 → cap 적용 | LOW |
| 4 | webhookSentAt 필드 추가 | schema 추가 | LOW |
| 5 | Retry catch에 delivery log 추가 | 1줄 추가 | LOW |

## 확인만 (S3)

| # | 항목 | 비고 |
|---|------|------|
| 6 | UTC 기준 통일 | 운영 환경 timezone 확인 후 결정 |
| 7 | Retry projectId 전달 | 파라미터 1개 추가 |
| 8 | Skip/cap delivery log | 로그 추가 |
| 9 | 비-intelligence guardrail | 향후 범용화 |

## Master QA/QC 전 E2E 확인 항목

- [ ] analyze → alert 생성 → Bell 표시 확인
- [ ] 같은 키워드 반복 → cooldown으로 중복 차단 확인
- [ ] maxAlertsPerDay 초과 → dailyCapped 확인
- [ ] channelEmail ON → 이메일 발송 시도 확인 (API key 필요)
- [ ] channelEmail OFF → 이메일 미시도 확인
- [ ] 이메일 실패 → retry 예약 확인 (로그)
- [ ] Bell unreadCount = Dashboard count 확인
- [ ] /notifications 페이지에서 알림 목록 확인
