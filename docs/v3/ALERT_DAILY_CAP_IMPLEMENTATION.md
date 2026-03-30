# Alert Daily Cap Implementation

> Date: 2026-03-16
> Status: ALREADY IMPLEMENTED (이전 세션에서 확인)

## 구현 위치

`intelligence-alert.service.ts` — `evaluateAndAlert()` 메서드

## 동작 방식

```
1. 사용자 설정 로드 (maxAlertsPerDay, 기본 20)
2. 오늘 00:00 이후 intelligence_alert 수 카운트
3. dailyAlertCount >= maxAlertsPerDay → 전체 skip, dailyCapped: true
4. 조건 평가 중에도 remainingDailyCap 추적 → 0 도달 시 중단
```

## 검증 포인트

| 항목 | 상태 |
|------|------|
| 반복 분석 시 alert 폭주 방지 | PASS — dailyCapped=true 시 모든 알림 skip |
| cooldown과 독립 | PASS — daily cap은 evaluateConditions 전에, cooldown은 조건별로 |
| dedup과 독립 | PASS — sourceId 기반 cooldown과 별도의 일일 상한 |
| cap 도달 로그 | PASS — `console.info("[IntelligenceAlert] Daily cap reached...")` |
| 반환값에 상태 포함 | PASS — `{ alertsTriggered: [], dailyCapped: true }` |
