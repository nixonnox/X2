# Phase 5: History/Compare Safety Verification

> Date: 2026-03-16
> Status: PASS (S0 없음)

## Compare 기능별 안전성

### currentVsPrevious
| 항목 | 상태 |
|------|------|
| 사용 데이터 | 최신 2건 (analysisRun) |
| Retention 영향 | **없음** — 최근 90일 이내 데이터 사용 |
| 최소 보존으로 보호 | **PASS** — 키워드별 3건 보호 |

### period_vs_period
| 항목 | 상태 |
|------|------|
| 사용 데이터 | 기간 내 runs + socialSnapshots + benchmarkSnapshots |
| 90일 이내 | **안전** |
| 90일 이전 | **△ 제한적** — 데이터 삭제됨, 단 최소 7건 snapshot 보호 |
| UI 대응 | PASS — `periodDataAvailability.insufficientDataWarning` 표시 |

### benchmarkTrend
| 항목 | 상태 |
|------|------|
| 기본 조회 (30일) | **안전** — 90일 이내 |
| 최대 조회 (365일) | **△ 90일 이후 데이터 부족 가능** |
| UI 대응 | PASS — `warnings: ["데이터 포인트가 N개뿐입니다"]` 표시 |

### history 목록
| 항목 | 상태 |
|------|------|
| 사용 데이터 | analysisRuns (페이지네이션) |
| Retention 영향 | 90일 이전 run 소실 |
| 최소 보존 | **PASS** — 키워드별 3건 보호 |

## 보호 메커니즘 검증

| 메커니즘 | 상태 | 근거 |
|----------|------|------|
| 키워드별 보존 계산 | PASS | `minRunsPerKeyword - recentCount` |
| 최근 데이터 우선 보호 | PASS | `slice(-totalNeeded)` — asc 정렬에서 최신 N건 |
| 보호 대상 삭제 제외 | PASS | `protectedIds` Set으로 필터링 |
| 비교 run에는 보호 없음 | PASS | comparison_runs는 재생성 가능 데이터 |

## 엣지 케이스

| 상황 | 결과 | 안전 |
|------|------|------|
| 키워드 1회만 분석 후 90일 | 1건 보호 (min 3건이므로) | ✓ |
| 최근 90일 내 분석 0건 + 이전 100건 | 3건 보호, 97건 삭제 | ✓ |
| 최근 90일 내 분석 5건 + 이전 50건 | 0건 보호 (5 ≥ 3), 50건 삭제 | ✓ |
| 프로젝트 삭제 | CASCADE 자동 정리 | ✓ |
