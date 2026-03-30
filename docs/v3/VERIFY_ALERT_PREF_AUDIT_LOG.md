# Verify: Alert Preference Audit Log

> Date: 2026-03-16
> Status: PASS (정적 + 동적)

## 정적 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| 기존값 로드 | PASS | `findFirst({ userId, projectId: null })` — line 203-204 |
| Diff 계산 | PASS | `JSON.stringify(old) !== JSON.stringify(new)` — line 269 |
| 변경 기록 형식 | PASS | `"key: oldVal → newVal"` — line 270 |
| 신규 설정 구분 | PASS | `oldPrefs === null → "신규 설정 생성"` — line 274 |
| Structured log | PASS | `[PreferenceAudit] JSON` — line 279-285 |
| DB 레코드 생성 | PASS | `notification.create({ sourceType: "pref_audit" })` — line 288-297 |
| isRead=true | PASS | Bell unreadCount에 영향 없음 — line 295 |
| 실패 격리 | PASS | 전체 audit 블록이 try-catch — line 248, 299 |
| 조회 endpoint | PASS | `getPreferenceAuditLog` — line 114-130 |

## 동적 검증 (DB 시뮬레이션)

| 시나리오 | 기대 | 실제 | 판정 |
|----------|------|------|------|
| Audit 레코드 생성 | notification with sourceType="pref_audit" | 1건 생성 확인 | PASS |
| message에 old→new 포함 | "channelEmail: false → true" | has_email_change=t, has_arrow=t | PASS |
| message에 복수 변경 포함 | "maxAlertsPerDay: 20 → 10" | has_max_change=t | PASS |
| sourceId = "global" | global context | sourceId="global" | PASS |
| isRead=true → Bell 미영향 | unread=0 | unread=0 | PASS |
| 조회 쿼리 작동 | sourceType="pref_audit" 필터 | 1건 정확히 반환 | PASS |
