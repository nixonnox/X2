# Alert Preference Audit Log Spec

> Date: 2026-03-16
> Status: IMPLEMENTED

## 구조

### 2단계 기록

**1단계: Structured Console Log (항상)**
```json
[PreferenceAudit] {
  "userId": "usr-001",
  "projectId": null,
  "changedAt": "2026-03-16T10:00:00Z",
  "changes": [
    "channelEmail: false → true",
    "maxAlertsPerDay: 20 → 10"
  ],
  "isNew": false
}
```

**2단계: DB 감사 레코드 (notification 테이블 활용)**
```
notification {
  userId: "usr-001",
  type: "SYSTEM_ALERT",
  title: "알림 설정 변경",
  message: "channelEmail: false → true; maxAlertsPerDay: 20 → 10",
  sourceType: "pref_audit",
  sourceId: "global" | projectId,
  isRead: true,
  priority: "LOW"
}
```

## 기록 항목

| 필드 | 기록 |
|------|------|
| 변경 주체 (who) | `ctx.userId` |
| 변경 시점 (when) | `changedAt` / `createdAt` |
| 이전값 (old) | 필드별 old value |
| 새값 (new) | 필드별 new value |
| 프로젝트 (where) | `sourceId` = "global" 또는 projectId |
| 변경된 필드 (what) | `changes[]` 배열 |
| 신규/수정 (type) | `isNew` flag |

## 추적 대상 필드

| 필드 | 추적 |
|------|------|
| channelEmail | ✓ |
| channelWebhook | ✓ |
| webhookUrl | ✓ (URL은 유무만, 전체 값 아님은 아닌 — 현재 전체 기록) |
| enableWarningSpike | ✓ |
| enableLowConfidence | ✓ |
| enableBenchmarkDecline | ✓ |
| enableProviderCoverage | ✓ |
| warningSpike_minCount | ✓ |
| lowConfidence_threshold | ✓ |
| benchmarkDecline_threshold | ✓ |
| globalCooldownMinutes | ✓ |
| maxAlertsPerDay | ✓ |
| channelInApp | ✗ (항상 true이므로 제외) |

## 조회

```typescript
// tRPC endpoint
notification.getPreferenceAuditLog({ limit: 10 })
// → { logs: [{ id, title, message, sourceId, createdAt }] }
```
