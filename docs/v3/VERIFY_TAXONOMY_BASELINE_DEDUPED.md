# Verify: Taxonomy & Baseline (Deduped)

> Date: 2026-03-16
> Status: 완료 — 실제 데이터 기반

## TopicTaxonomyMapping (240줄)
- 입력: cluster label + memberTexts
- 출력: taxonomyCoverage (카테고리별 클러스터 수), unmappedCount
- Mock: **아님** — 업종별 카테고리 사전 + 키워드 매칭

## BenchmarkBaseline (225줄)
- 입력: industryType
- 출력: BenchmarkMetric[] (key, label, value, unit, description)
- 비교: actual vs baseline → rating (ABOVE/MEETS/BELOW)
- Mock: **아님** — 업종별 기준선 데이터 (FAQ비율, 비교검색률 등)
