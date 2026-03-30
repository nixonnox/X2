# Verify: Industry Detection (Deduped)

> Date: 2026-03-16
> Status: 완료 — 하드코딩 아닌 실제 추론

## 호출 경로
```
intelligence.analyze → ctx.services.verticalIndustrySuggester.suggest({
  seedKeyword, relatedKeywords, clusterTopics
}) → suggestedIndustry
```

## 추론 로직 (280줄)
- seedKeyword 패턴 매칭 (뷰티/금융/엔터/식품 키워드)
- cluster topic 분석 (성분/효능 → BEAUTY, 메뉴/맛 → FNB 등)
- 복수 신호 가중 합산 → 최고 점수 업종
- 정적 하드코딩: **아님** — 입력 데이터 기반 동적 추론
