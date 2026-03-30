# Phase 6: Provider Coverage Verification

> Date: 2026-03-16
> Status: PASS

## Coverage 계산 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| Registry에 4개 provider 등록 | PASS | YouTube, Instagram, TikTok, X — `bridge.service.ts:84-87` |
| getAllStatuses() 전체 provider 반환 | PASS | `registry.service.ts:108-153` — 모든 adapter 순회 |
| isConfigured() 체크 | PASS | 각 adapter에서 env 변수 존재 + placeholder 아닌지 확인 |
| NOT_CONNECTED 상태 | PASS | `isConfigured()=false` → `"NOT_CONNECTED"`, `isAvailable: false` |
| CONNECTED 상태 | PASS | `testConnection().ok=true` → `"CONNECTED"`, `isAvailable: true` |
| 5분 캐시 | PASS | `staleThreshold = 5 * 60 * 1000` — 반복 호출 방지 |

## providerCoverage 반영 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| `connectedProviders` 계산 | PASS | `statuses.filter(s => s.isAvailable).length` — `intelligence.ts:239` |
| `totalProviders` 계산 | PASS | `statuses.length` (4개 + Comments) |
| `isPartial` 계산 | PASS | `connected < total && connected > 0` — `intelligence.ts:243` |
| provider별 상태 배열 | PASS | `providers: statuses.map(...)` — name, platform, status, error |
| 분석 결과에 포함 | PASS | `metadata.providerCoverage` — `intelligence.ts:263` |
| DB 저장 | PASS | `IntelligencePersistenceService.saveAnalysisRun({ providerCoverage })` |

## 현재 현실적 Coverage 상태

| 시나리오 | connectedProviders | totalProviders | isPartial |
|----------|-------------------|----------------|-----------|
| 토큰 전혀 없음 | 0 (+Comments 1) | 5 | true |
| YouTube만 설정 | 1 (+Comments 1) | 5 | true |
| YouTube + Instagram | 2 (+Comments 1) | 5 | true |
| 전체 설정 | 4 (+Comments 1) | 5 | false |

## UI 반영 검증

| 컴포넌트 | 표시 | 상태 |
|----------|------|------|
| Intelligence 헤더 뱃지 | "일부 데이터" (isPartial=true) | PASS |
| LiveMentionStatusPanel | provider별 연결/미연결 카드 | PASS |
| IntelligenceStatePanel | "일부 데이터만 먼저 반영했어요" | PASS |
| Alert 조건 | PROVIDER_COVERAGE_LOW (isPartial && confidence<0.5) | PASS |

## 핵심 제품 흐름 dependency

| 흐름 | Instagram/TikTok 없이 작동 | 검증 |
|------|--------------------------|------|
| 분석 (analyze) | **작동** — 클러스터+벤치마크만으로 가능 | PASS |
| 비교 (compare) | **작동** — 소셜 없어도 비교 가능 | PASS |
| 이력 (history) | **작동** — analysisRun 기반 | PASS |
| 알림 (alerts) | **작동** — WARNING_SPIKE, LOW_CONFIDENCE 등 소셜 무관 | PASS |
| Bell dropdown | **작동** — notification 테이블 기반 | PASS |
