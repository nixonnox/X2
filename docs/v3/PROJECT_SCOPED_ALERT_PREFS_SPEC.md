# Project-Scoped Alert Preferences Spec

> Date: 2026-03-16
> Status: SCHEMA APPLIED + SERVICE UPDATED

## 스키마 변경

### 이전
```prisma
model UserAlertPreference {
  userId String
  @@unique([userId])  // 사용자당 1개
}
```

### 이후
```prisma
model UserAlertPreference {
  userId    String
  projectId String?  // null = global, 값 = project-specific
  project   Project? @relation(...)
  @@unique([userId, projectId])  // 사용자+프로젝트 조합 유니크
  @@index([userId])
}
```

## Lookup Priority

```
1차: project-specific (userId + projectId)
  └─ 있으면 사용
2차: global (userId + projectId=null)
  └─ 있으면 사용
3차: 하드코드 기본값
  └─ { channelInApp: true, channelEmail: false, channelWebhook: false, maxAlertsPerDay: 20 }
```

## 적용 위치

| 서비스 | 메서드 | projectId 사용 | 상태 |
|--------|--------|---------------|------|
| `intelligence-alert.service.ts` | `evaluateAndAlert()` | prefs 로드 시 project-first 조회 | DONE |
| `intelligence-alert.service.ts` | `loadUserChannelPrefs()` | project → global → default | DONE |
| `notification.ts` router | `getPreferences` | **TODO** — projectId 파라미터 추가 필요 |
| `notification.ts` router | `savePreferences` | **TODO** — projectId 파라미터 추가 필요 |
| Settings UI | `/settings/notifications` | **TODO** — 프로젝트 선택 UI |

## 기존 데이터 호환

| 시나리오 | 처리 |
|----------|------|
| 기존 레코드 (projectId=null) | global 설정으로 자동 인식 |
| 새 project-specific 레코드 | userId+projectId 조합으로 생성 |
| project-specific 없을 때 | global fallback |
| global도 없을 때 | 하드코드 기본값 |
