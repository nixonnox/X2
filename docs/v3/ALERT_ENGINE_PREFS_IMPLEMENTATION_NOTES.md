# Alert Engine Prefs Implementation Notes

> Date: 2026-03-16

## 이번 수정 내용

### 1. DEFAULT_COOLDOWNS → DEFAULT_TYPE_COOLDOWNS 리네임
- 명확한 의미 전달: "타입별 최소 쿨다운 floor"
- 사용 위치: `evaluateConditions` 내 `cooldownMs` 계산

### 2. DEFAULT_PREFS 단일 객체로 통합
- 이전: `DEFAULT_THRESHOLDS` + 인라인 기본값 혼재
- 이후: `DEFAULT_PREFS` 하나에 모든 기본값 집중

### 3. prefsSource 추적 추가
- `"project"` | `"global"` | `"default"` 3가지 source 구분
- `[AlertPolicy]` structured log에 포함

### 4. Policy trace log 추가
```json
[AlertPolicy] {
  userId, projectId, prefsSource,
  appliedPolicy: { maxAlertsPerDay, globalCooldownMinutes, thresholds, channels, enabledAlerts }
}
```

### 5. Cooldown 해결 로직 명확화
```typescript
const userCooldownMs = prefs.globalCooldownMinutes * 60 * 1000;
const typeCooldownMs = condition.cooldownMs; // DEFAULT_TYPE_COOLDOWNS
const cooldownMs = Math.max(userCooldownMs, typeCooldownMs);
```

## 남은 과제

| 항목 | 우선순위 |
|------|---------|
| 타입별 cooldown을 사용자가 설정 가능하게 | LOW — 현재 globalCooldownMinutes로 충분 |
| severity를 사용자가 조정 가능하게 | LOW |
| AlertPolicy log를 DB에도 저장 | LOW |
