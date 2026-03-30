# Verify: P1 Notification Router Project Context

> Date: 2026-03-16
> Status: PASS

## Router Endpoints

| Endpoint | projectId | 상태 |
|----------|-----------|------|
| `getPreferences` | `input.projectId` (optional) | PASS — project→global→default |
| `savePreferences` | `input.projectId` (optional) | PASS — `targetProjectId` upsert |
| `getPreferenceAuditLog` | — (userId 전체) | PASS |
| `testWebhook` | — (URL만) | PASS |

## Project Context 일관성

| 흐름 단계 | projectId 반영 | 근거 |
|-----------|---------------|------|
| Prefs 저장 | ✓ | `upsert where: { userId_projectId: { userId, projectId: targetProjectId } }` |
| Prefs 조회 | ✓ | `findFirst({ projectId })` → `findFirst({ projectId: null })` |
| Audit log | ✓ | `sourceId: targetProjectId ?? "global"` |
| Alert engine prefs | ✓ | `evaluateAndAlert` — project→global→default |
| Channel decision | ✓ | `loadUserChannelPrefs(userId, projectId)` |
| Notification record | ✓ | `sourceId: ${projectId}:${type}:${keyword}` |
| delivery_logs | ✓ | `sourceId` 에서 projectId 추출 가능 |

## DB 시뮬레이션

| 항목 | 결과 | 판정 |
|------|------|------|
| Project-scoped pref 저장 | int2-pref, projectId=int2-proj, email=t, max=5 | PASS |
| Audit log sourceId=projectId | int2-audit, sourceId=int2-proj | PASS |
