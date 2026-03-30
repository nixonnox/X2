# Bell Deep Link & Context Spec

> Date: 2026-03-16
> Status: VERIFIED

## Deep Link 구조

### Intelligence Alert → Intelligence 화면
```
actionUrl: /intelligence?keyword={keyword}
sourceId: {projectId}:{alertType}:{keyword}
sourceType: "intelligence_alert"
```

### Alert Types → Deep Link
| Alert Type | actionUrl | 목적지 |
|-----------|-----------|--------|
| WARNING_SPIKE | `/intelligence?keyword={kw}` | Intelligence 메인 (해당 키워드) |
| LOW_CONFIDENCE | `/intelligence?keyword={kw}` | Intelligence 메인 |
| BENCHMARK_DECLINE | `/intelligence?keyword={kw}` | Intelligence 메인 |
| PROVIDER_COVERAGE_LOW | `/intelligence?keyword={kw}` | Intelligence 메인 |

### 클릭 동작
1. `markRead({ id })` — 읽음 처리
2. `router.push(actionUrl)` — 해당 화면으로 이동
3. `setBellOpen(false)` — 드롭다운 닫기

## Context 추적

### sourceId 구조
```
{projectId}:{alertType}:{keyword}
예: proj-001:WARNING_SPIKE:스킨케어
```

- projectId 포함으로 **프로젝트 간 알림 격리**
- 동일 sourceId로 **쿨다운 중복 방지**
- alertType 포함으로 **알림 유형 구분**

### 사용자 추적 흐름
```
알림 수신
  → 알림에서 sourceId 확인
  → projectId + alertType + keyword 파싱
  → 관련 분석 결과로 이동 가능
  → "이 알림을 왜 받았는지" 추적 가능
```

## 미래 확장

| 기능 | Deep Link | 구현 상태 |
|------|-----------|----------|
| 비교 결과 알림 | `/intelligence/compare?runId={id}` | TODO |
| 리포트 생성 알림 | `/reports/{id}` | TODO |
| 수집 실패 알림 | `/admin/collection` | TODO |
| OAuth 만료 알림 | `/settings/connections` | TODO |
