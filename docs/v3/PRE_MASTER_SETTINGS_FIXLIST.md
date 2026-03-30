# Pre-Master Settings Fix List

> Date: 2026-03-16
> Master QA/QC 전 반드시 확인/수정할 항목

## 반드시 수정 (S1)

| # | 항목 | 수정 방향 | 난이도 |
|---|------|----------|--------|
| 1 | delivery_logs.executionId nullable | schema migration | LOW |
| 2 | retry setTimeout → BullMQ delayed | queue 패키지 활용 | MEDIUM |

## 권장 수정 (S2)

| # | 항목 | 수정 방향 | 난이도 |
|---|------|----------|--------|
| 3 | prisma generate 실행 | dev 서버 정지 후 실행 | LOW |
| 4 | notification router projectId 추가 | input에 optional param | LOW |
| 5 | Settings UI project 선택 | 드롭다운 컴포넌트 | MEDIUM |

## Master QA 전 E2E 확인

- [ ] 설정 저장 → audit log 생성 확인
- [ ] webhook URL 저장 → test POST 실행 확인
- [ ] 분석 실행 → daily cap 동작 확인
- [ ] channel prefs ON → 해당 채널 dispatch 확인
- [ ] channel prefs OFF → 해당 채널 미시도 확인
- [ ] project-specific 설정 → global과 분리 확인
- [ ] Bell unreadCount에 audit 미포함 확인
