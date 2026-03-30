# Data Retention Policy Spec

> Date: 2026-03-16
> Status: IMPLEMENTED

## 정책 개요

| 항목 | 값 |
|------|-----|
| 보존 기간 | **90일** |
| 삭제 방식 | **Hard delete** (현재 단계에 적합 — archive는 향후) |
| 최소 보존 | 키워드별 분석 run 3건 + snapshot 7건 보호 |
| 실행 주기 | **매주 일요일 03:00 UTC** |
| Dry-run | 지원 (삭제 없이 대상만 보고) |

## 대상 테이블

| 테이블 | 기준 필드 | 최소 보존 | 삭제 방식 |
|--------|----------|----------|----------|
| `intelligence_analysis_runs` | `analyzedAt` | 키워드별 3건 | ID 기반 선별 삭제 |
| `intelligence_comparison_runs` | `analyzedAt` | 없음 | 날짜 기준 일괄 삭제 |
| `social_mention_snapshots` | `date` | 키워드별 7건 | ID 기반 선별 삭제 |
| `benchmark_snapshots` | `date` | 키워드별 7건 | ID 기반 선별 삭제 |
| `raw_social_mentions` | `createdAt` | 없음 | 배치 삭제 (1000건씩) |

## 최소 보존 규칙

### Analysis Runs (키워드별 3건)
- 90일 이전 데이터 중, 키워드별로 최신 N건을 보호
- 예: 키워드 "스킨케어"의 최근 90일 내 run이 1건이면, 90일 이전에서 2건 보호

### Snapshots (키워드별 7건)
- 소셜/벤치마크 snapshot 모두 동일 규칙
- 시계열 최소 연속성 보장 (7일분)

### RawSocialMention (보호 없음)
- 가장 큰 테이블 → 적극 정리
- snapshot에 이미 집계 데이터 저장됨
- 원본 필요 시 90일 이내 조회

## Compare/History 영향도

| 기능 | 영향 | 대응 |
|------|------|------|
| `currentVsPrevious` | 최근 2건만 사용 → 영향 없음 | 키워드별 3건 보호로 충분 |
| `history` (이력 조회) | 90일 이전 이력 소실 | 최소 3건 보호 |
| `periodData` | 90일 이전 기간 비교 불가 | snapshot 7건 보호로 추세 유지 |
| `benchmarkTrend` | 90일 이전 트렌드 소실 | 7건 보호로 최소 추세 유지 |

## Hard Delete 선택 이유

| 방식 | 장점 | 단점 | 현재 적합성 |
|------|------|------|------------|
| Soft delete | 복구 가능 | 스토리지 절감 없음, 쿼리 복잡화 | ✗ |
| Archive (별도 테이블) | 복구 가능 + 성능 분리 | 구현 복잡 | ✗ (향후) |
| **Hard delete** | 간단, 즉시 스토리지 절감 | 복구 불가 | **✓ (현재 단계)** |
