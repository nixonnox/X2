# Verify: Alert Engine Prefs Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 0 S2, 1 S3

## S0
**없음**

## S1
**없음**

## S2
**없음**

## S3

### S3-1. 타입별 cooldown 사용자 설정 미지원
- **현상:** 타입별 cooldown(WARNING_SPIKE 1h, LOW_CONFIDENCE 24h 등)은 DEFAULT_TYPE_COOLDOWNS에 고정
- **영향:** 사용자가 globalCooldownMinutes만 조절 가능. 타입별 세분화 불가
- **수정:** UserAlertPreference에 `cooldown_warningSpike`, `cooldown_lowConfidence` 등 필드 추가
- **긴급도:** LOW — globalCooldownMinutes로 충분히 조절 가능
