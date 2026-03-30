# Retention Safety & Compare Impact

> Date: 2026-03-16

## Compare 안전성

### currentVsPrevious
- **사용 데이터:** 최신 2건 (analysisRun)
- **Retention 영향:** 없음 — 최소 3건 보호
- **안전:** ✓

### period_vs_period
- **사용 데이터:** 기간 내 runs + socialSnapshots + benchmarkSnapshots
- **Retention 영향:** 90일 이전 기간 비교 불가
- **최소 보호:** 키워드별 snapshot 7건으로 짧은 추세 유지
- **안전:** ✓ (90일 이내), △ (90일 이전)

### benchmarkTrend
- **사용 데이터:** benchmarkSnapshots (기간별)
- **Retention 영향:** 90일 이전 데이터 포인트 소실
- **최소 보호:** 7건으로 최소 추세 유지
- **안전:** ✓ (30일 default), △ (365일 요청 시)

### history 목록
- **사용 데이터:** analysisRuns (페이지네이션)
- **Retention 영향:** 90일 이전 run 소실
- **최소 보호:** 키워드별 3건
- **안전:** ✓

## 보호 로직 상세

### Analysis Runs 보호

```
1. 90일 이전 eligible runs 조회
2. 키워드별 그루핑 (projectId:seedKeyword)
3. 각 키워드의 최근 90일 내 run 수 확인
4. 최근 run + eligible 합계 < minRunsPerKeyword(3) 이면
   → eligible에서 최신 N건 보호
5. 보호 대상 제외하고 삭제
```

### Snapshot 보호 (동일 로직)

```
소셜/벤치마크 모두 minSnapshotsPerKeyword(7) 기준
키워드별로 최소 7건의 시계열 데이터 보장
```

## 엣지 케이스

| 상황 | 처리 |
|------|------|
| 키워드 분석 1회만 하고 90일 경과 | 보호 (minRuns=3이므로 1건 보호) |
| 키워드 분석 100회 후 90일 경과 | 최신 3건 보호, 97건 삭제 |
| snapshot 0건인 채로 90일 경과 | 삭제할 것 없음 |
| 프로젝트 삭제 시 | CASCADE로 자동 정리 (Prisma schema) |
