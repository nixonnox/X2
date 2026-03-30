# Phase 5: Retention Policy Verification

> Date: 2026-03-16
> Status: PASS

## 1. 정책 존재 여부

| 항목 | 상태 | 근거 |
|------|------|------|
| 90일 기준 정책 | PASS | `DEFAULT_CONFIG.retentionDays = 90` (retention.service.ts:47) |
| 대상 테이블 명확 | PASS | 5개 테이블: analysis_runs, comparison_runs, social_snapshots, benchmark_snapshots, raw_mentions |
| 삭제 방식 | PASS | Hard delete (현재 단계에 적합) |
| 설정 가능 | PASS | `RetentionConfig` 타입으로 retentionDays, minRuns, minSnapshots, dryRun 조절 가능 |

## 2. 테이블별 정책

| 테이블 | 기준 필드 | 최소 보존 | 삭제 방식 | 검증 |
|--------|----------|----------|----------|------|
| intelligence_analysis_runs | analyzedAt | 키워드별 3건 | ID 기반 선별 | PASS — line 119-158 |
| intelligence_comparison_runs | analyzedAt | 없음 | 날짜 기준 일괄 | PASS — line 163-180 |
| social_mention_snapshots | date | 키워드별 7건 | ID 기반 선별 | PASS — line 184-225 |
| benchmark_snapshots | date | 키워드별 7건 | ID 기반 선별 | PASS — line 229-268 |
| raw_social_mentions | createdAt | 없음 | 배치 (1000건씩) | PASS — line 272-296 |

## 3. 최소 보존 로직 검증

| 항목 | 상태 | 근거 |
|------|------|------|
| eligible 조회 (cutoff 이전) | PASS | `where: { analyzedAt: { lt: cutoff } }` |
| 키워드별 그루핑 | PASS | `projectId:seedKeyword` key로 Map 구성 |
| 최근(cutoff 이후) 건수 확인 | PASS | `count({ analyzedAt: { gte: cutoff } })` |
| 보호 필요량 계산 | PASS | `minRunsPerKeyword - recentCount` |
| 보호 대상 선별 (최신 N건) | PASS | `runs.slice(-totalNeeded)` (asc 정렬이므로 끝에서) |
| 보호 대상 제외 후 삭제 | PASS | `eligible.filter(r => !protectedIds.has(r.id))` |
