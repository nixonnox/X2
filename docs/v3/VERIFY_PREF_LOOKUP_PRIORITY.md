# Verify: Preference Lookup Priority

> Date: 2026-03-16

## 우선순위 동작 증거

### Project A (project-specific 존재)
```
loadUserChannelPrefs("ps-user", "ps-proj-a")
  → findFirst({ userId: "ps-user", projectId: "ps-proj-a" })
  → { channelEmail: true, maxAlertsPerDay: 5 }  ← project-specific
```

### Project B (project-specific 미존재)
```
loadUserChannelPrefs("ps-user", "ps-proj-b")
  → findFirst({ userId: "ps-user", projectId: "ps-proj-b" })
  → null
  → findFirst({ userId: "ps-user", projectId: null })
  → { channelEmail: false, maxAlertsPerDay: 20 }  ← global fallback
```

### 설정 없는 사용자
```
loadUserChannelPrefs("new-user", "any-proj")
  → findFirst project → null
  → findFirst global → null
  → { channelInApp: true, channelEmail: false, channelWebhook: false }  ← hardcoded default
```

## evaluateAndAlert 내 prefs 로드 (동일 패턴)

```typescript
// 1차: project-specific thresholds/channels
let userPref = await prisma.userAlertPreference.findFirst({
  where: { userId, projectId },
});
// 2차: global
if (!userPref) {
  userPref = await prisma.userAlertPreference.findFirst({
    where: { userId, projectId: null },
  });
}
// 3차: hardcoded defaults
```
