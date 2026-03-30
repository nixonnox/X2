# Phase 4: Sentiment Category Verification

> Date: 2026-03-16
> Status: PASS

## Category 정의

| 카테고리 | 타입 정의 | LLM 출력 | Rule 출력 | 상태 |
|----------|----------|----------|-----------|------|
| POSITIVE | PASS | PASS | PASS (키워드 매칭) | ✓ |
| NEGATIVE | PASS | PASS | PASS (키워드 매칭) | ✓ |
| NEUTRAL | PASS | PASS | PASS (매칭 없음 시) | ✓ |
| MIXED | PASS | PASS | PASS (양쪽 매칭 시) | ✓ |
| UNCLASSIFIED | PASS | PASS (파싱 실패 시) | PASS (짧은 텍스트) | ✓ |
| ANALYSIS_FAILED | PASS (타입 정의) | — | — | 타입만 존재, Bridge에서 UNCLASSIFIED로 매핑 |

## Null → NEUTRAL 흡수 방지 검증

| 검증 항목 | 상태 | 근거 |
|-----------|------|------|
| null sentiment 멘션이 분석을 거치는가? | PASS | `bridge:166` — `filter((m) => !m.sentiment)` |
| 분석 실패 시 NEUTRAL이 아닌 UNCLASSIFIED인가? | PASS | `bridge:179,186` — `sentiment = "UNCLASSIFIED"` |
| ANALYSIS_FAILED가 NEUTRAL로 매핑되지 않는가? | PASS | `bridge:176-179` — ANALYSIS_FAILED → UNCLASSIFIED |
| Snapshot 저장 시 unclassified 별도 카운트인가? | PASS | `intelligence.ts:389` — `else unclassified++` |
| DB에 unclassifiedCount 별도 컬럼인가? | PASS | schema `unclassifiedCount Int @default(0)` |

## Snapshot 카운트 매핑

```
mention.sentiment === "POSITIVE"  → positiveCount++
mention.sentiment === "NEGATIVE"  → negativeCount++
mention.sentiment === "NEUTRAL"   → neutralCount++
else (MIXED, UNCLASSIFIED, null)  → unclassifiedCount++
```

**MIXED는 현재 unclassified에 포함됨** — 향후 별도 컬럼 추가 가능 (S3)
