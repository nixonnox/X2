# Verify: Project-Scoped Alert Preferences

> Date: 2026-03-16
> Status: PASS (정적 + 동적)

## 정적 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| projectId 컬럼 | PASS | `text`, nullable, DB에 존재 확인 |
| Unique constraint | PASS | `(userId, projectId)` — UNIQUE btree index |
| FK to projects | PASS | `projectId_fkey → projects(id) CASCADE` |
| FK to users | PASS | `userId_fkey → users(id) CASCADE` |
| userId index | PASS | `userId_idx` — global lookup용 |
| Service project-first lookup | PASS | `loadUserChannelPrefs(userId, projectId?)` — findFirst project → findFirst global |
| evaluateAndAlert prefs | PASS | project-first → global fallback |

## 동적 검증 (DB 시뮬레이션)

| 시나리오 | 기대 | 실제 | 판정 |
|----------|------|------|------|
| S1: Project A lookup | email=true, max=5 (project-specific) | email=t, max=5, projectId=ps-proj-a | PASS |
| S2: Project B lookup (no specific) | email=false, max=20 (global fallback) | email=false, max=20 | PASS |
| S3: Duplicate insert (same userId+projectId) | ON CONFLICT DO NOTHING, count=1 | INSERT 0 0, count=1 | PASS |
| S4: Global row intact | projectId=null, email=false, max=20 | 그대로 | PASS |
