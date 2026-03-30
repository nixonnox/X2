# Backfill Scope & Policy Spec

> Date: 2026-03-16

## Scope 정의

| 파라미터 | 필수 | 설명 | 제약 |
|----------|------|------|------|
| projectId | YES | 대상 프로젝트 | — |
| keyword | YES | 대상 키워드 | — |
| industryType | YES | 업종 (벤치마크용) | BEAUTY/FNB/FINANCE/ENTERTAINMENT |
| startDate | YES | 시작일 | — |
| endDate | YES | 종료일 | — |
| provider | YES | 수집 소스 | "youtube" / "instagram" / "all" |

## 제한 정책

| 제한 | 값 | 이유 |
|------|-----|------|
| 최대 기간 | 90일 | Retention 정책과 일치 — 90일 이전은 삭제 대상 |
| 배치 크기 | 7일 | 배치별 독립 실행 + 진행 추적 |
| 쿼터 할당 | 일일 30% | 정규 수집에 영향 주지 않기 위해 |
| 동시 실행 | 1건 | 쿼터 충돌 방지 |
| Rate limit | 2배치/분 | API rate limit 준수 |

## 기존 데이터 보호

| 상황 | 처리 |
|------|------|
| 해당 날짜에 이미 snapshot 존재 | **skip** (덮어쓰지 않음) |
| 해당 날짜에 rawSocialMention 없음 | snapshot 생성 (totalCount: 0, freshness: "no_data") |
| 해당 날짜에 analysisRun 존재 | benchmarkSnapshot upsert (기존 값 유지 또는 업데이트) |

## 쿼터 추정

| Provider | 일일 쿼터 | Backfill 할당 (30%) | 일일 가능 일수 |
|----------|----------|-------------------|---------------|
| YouTube | 10,000 units | 3,000 units | ~600일분 (충분) |
| Instagram | 4,800 calls | 1,440 calls | ~288일분 (충분) |
| TikTok | 144,000 req | 43,200 req | ~8,640일분 (충분) |

실제로는 날짜당 ~5 API call이면 충분하므로, **쿼터는 대부분 충분합니다.**
