# Measured Metrics Bridge Spec

## 개요

벤치마크 시각화를 위한 실제 측정값 전달 경로

## autoMetrics 자동 산출 (apply 엔드포인트)

- **avgClusterCount**: 클러스터 수
- **faqFrequency**: FAQ 패턴 클러스터 비율 ("어떻게", "왜", "비교", "추천" 등)
- **comparisonClusterRatio**: 비교 패턴 클러스터 비율 ("비교", "vs", "차이")
- **reviewMentionRate**: 리뷰 패턴 클러스터 비율 ("후기", "리뷰", "평가")

## 전달 경로

```
clusterData 추출 → autoMetrics 자동 산출
→ input.measuredMetrics와 병합 (명시값 우선)
→ finalMetrics → verticalSignalFusion.fuse()
→ benchmarkService.compare() → BenchmarkComparisonResult
→ API response intelligence.benchmarkComparison.comparisons[]
→ BenchmarkDifferentialRing 컴포넌트 (필드명 매핑 적용)
```

## 필드명 매핑

| API | UI |
|-----|-----|
| metricKey | key |
| metricLabel | label |
| baselineValue | baseline |
| actualValue | actual |
| deviationPercent | deviation |

vertical-preview page에서 map() 변환 수행

## 값 없는 경우

- **클러스터 없음** → autoMetrics 빈 객체 → benchmarkComparison null → baseline-only 모드
- **일부 메트릭만 있음** → 해당 메트릭만 비교, 나머지 baseline 표시
