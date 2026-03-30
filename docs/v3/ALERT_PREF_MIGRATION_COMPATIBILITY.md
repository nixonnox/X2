# Alert Preference Migration Compatibility

> Date: 2026-03-16

## 스키마 변경 요약

| 항목 | 이전 | 이후 |
|------|------|------|
| unique constraint | `@@unique([userId])` | `@@unique([userId, projectId])` |
| projectId | 없음 | `String?` (nullable) |
| Project relation | 없음 | `project Project? @relation(...)` |
| User relation | `1:1` (`UserAlertPreference?`) | `1:many` (`UserAlertPreference[]`) |

## 기존 데이터 영향

| 기존 레코드 | projectId 값 | 영향 |
|------------|-------------|------|
| 모든 기존 레코드 | `null` (자동) | global 설정으로 인식됨 → **동작 변화 없음** |
| unique 제약 | `@@unique([userId])` → `@@unique([userId, projectId])` | null+userId 조합은 유니크 유지 → **충돌 없음** |

## DB 적용 방식

- `prisma db push --accept-data-loss` 사용 (개발 단계)
- 기존 데이터의 projectId = null 자동 설정
- 추가 마이그레이션 불필요

## 코드 호환성

| 코드 경로 | 이전 | 이후 | 호환 |
|-----------|------|------|------|
| `findUnique({ userId })` | 작동 | **변경 필요** (unique key 변경) | `findFirst({ userId, projectId: null })` 로 전환 |
| `loadUserChannelPrefs` | userId만 | userId + projectId 선택적 | ✓ 호환 (projectId 없으면 global) |
| `evaluateAndAlert` | userId만 | projectId 포함 prefs 로드 | ✓ 호환 |
| Settings UI `getPreferences` | userId만 | **TODO**: projectId 파라미터 추가 | △ 당장은 global만 |
| Settings UI `savePreferences` | userId만 | **TODO**: projectId 파라미터 추가 | △ 당장은 global만 |

## 남은 작업

| 항목 | 우선순위 |
|------|---------|
| `prisma generate` 실행 (dev 서버 정지 후) | HIGH |
| notification router `getPreferences`에 projectId 추가 | MEDIUM |
| notification router `savePreferences`에 projectId 추가 | MEDIUM |
| Settings UI에 프로젝트 선택 드롭다운 | LOW |
