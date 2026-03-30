# Benchmark Automation Backlog

> Date: 2026-03-16
> Status: **미착수 → Backlog로 구체화**

## 개념

"사용자의 분석 패턴(어떤 업종, 어떤 키워드, 어떤 빈도)을 기반으로
benchmark baseline 값을 자동으로 보정하는 학습 구조"

## 현재 상태

- `BenchmarkBaselineService` (225줄): **정적 기준선** — 업종별 하드코딩된 baseline 값
- 사용자별/프로젝트별 커스텀 baseline: **없음**
- 시계열 데이터 기반 동적 baseline: **없음**

## 구현 시 필요한 것

| 항목 | 난이도 | 설명 |
|------|--------|------|
| 프로젝트별 baseline 저장 | MEDIUM | DB 테이블 + 조회 |
| 시계열 평균 기반 동적 baseline | HIGH | 30일/90일 이동 평균 계산 |
| 사용자 피드백 기반 보정 | HIGH | "이 점수가 높은 편이에요" → baseline 조정 |
| 업종 간 cross-reference | VERY HIGH | 다른 사용자의 데이터 익명 집계 |

## 결론

**현재 단계에서 구현하지 않음.** 정적 baseline으로 운영 충분.
동적 학습은 사용자 수/데이터량이 충분해진 후 고려.
