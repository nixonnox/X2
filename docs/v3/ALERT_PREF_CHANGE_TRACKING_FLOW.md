# Alert Preference Change Tracking Flow

> Date: 2026-03-16

## 흐름

```
savePreferences(input)
  │
  ├─ [1] 기존 prefs 로드 (oldPrefs)
  │    └─ findFirst({ userId, projectId: null })
  │    └─ 없으면 null (신규 생성)
  │
  ├─ [2] DB upsert (새 값 저장)
  │
  ├─ [3] Diff 계산
  │    └─ 각 필드: JSON.stringify(old) !== JSON.stringify(new) → changes[]
  │    └─ oldPrefs === null → changes = ["신규 설정 생성"]
  │
  ├─ [4] changes.length > 0?
  │    ├─ YES:
  │    │    ├─ console.info("[PreferenceAudit]") — structured log
  │    │    └─ notification.create({ sourceType: "pref_audit" }) — DB 레코드
  │    └─ NO: skip (변경 없음)
  │
  └─ return { saved: true, warnings }
```

## 실패 격리

| 단계 | 실패 시 |
|------|--------|
| oldPrefs 로드 실패 | oldPrefs=null → 변경 비교 불가, "신규 설정 생성"으로 기록 |
| Diff 계산 실패 | catch → audit 건너뜀, 본 저장은 완료 |
| Audit log DB 실패 | catch → 건너뜀, 본 저장은 완료 |

**핵심: audit 실패가 설정 저장을 절대 차단하지 않음**
