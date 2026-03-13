# X2 v2.1 — Platform Architecture Documents

> MVP/목업 → 실서비스(실데이터) 전환 + 5대 벤치마크 DNA 통합

---

## 문서 구성

### 상위 아키텍처 (v2.1 신규)

| 문서                                                              | 내용                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [MASTER_PLATFORM_ARCHITECTURE](./MASTER_PLATFORM_ARCHITECTURE.md) | **7-Stage Loop**, Vertical/Enterprise 확장, 네비게이션 IA v2.1, 신규 엔티티 17개 후보 |
| [BENCHMARK_DNA_MAP](./BENCHMARK_DNA_MAP.md)                       | 썸트렌드/소머즈/리스닝마인드/아하트렌드/피처링 DNA → 7스테이지 매핑                   |
| [USER_JOURNEY_EXTENSIONS](./USER_JOURNEY_EXTENSIONS.md)           | 4 페르소나, 스테이지별 UI 와이어프레임, 전환 CTA, Vertical 영향도                     |
| [EXECUTION_LOOP_DESIGN](./EXECUTION_LOOP_DESIGN.md)               | Campaign/Creator/Measure 도메인, 실행→측정→재탐색 순환 파이프라인                     |
| [REPORT_EVIDENCE_UX](./REPORT_EVIDENCE_UX.md)                     | EvidenceBlock, Report Builder, Data Explorer, 차트 UX, 내보내기, 화이트라벨           |

### 기반 문서 (v2.0)

| #   | 문서                                       | 내용                  | v2.1 영향                                |
| --- | ------------------------------------------ | --------------------- | ---------------------------------------- |
| 00  | [Product Vision](./00-PRODUCT-VISION.md)   | 제품 정체성, 5대 모듈 | → MASTER_PLATFORM_ARCHITECTURE로 대체    |
| 01  | [User Journey](./01-USER-JOURNEY.md)       | 유저 여정, IA         | → USER_JOURNEY_EXTENSIONS로 확장         |
| 02  | [Data Model](./02-DATA-MODEL.md)           | Prisma 스키마 상세    | → 신규 엔티티 17개 추가 반영 필요        |
| 03  | [Data Pipeline](./03-DATA-PIPELINE.md)     | 수집 파이프라인       | → Campaign Metric Sync 추가 필요         |
| 04  | [Analysis Engine](./04-ANALYSIS-ENGINE.md) | 분석 엔진             | → Influencer Scoring, ROI 계산 추가 필요 |
| 05  | [Operations](./05-OPERATIONS.md)           | 운영 관제             | → Campaign 관제 추가 필요                |
| 06  | [Migration Plan](./06-MIGRATION-PLAN.md)   | 전환 계획             | → Phase 6~7 추가 필요                    |

---

## 불변 원칙

1. **Mock/Hardcoded 데이터 전면 금지** — 네트워크 실패 Fallback 전용만 허용
2. **공식 API 우선** — 웹 수집 시 robots.txt 및 합법적 공개 범위 준수
3. **GEO/AEO Citation 추적 필수** — AI 검색엔진 인용 트래킹 + 출처 우선순위 관리
4. **실행-측정 루프 필수** — 분석만으로 끝나지 않고 Execute → Measure → Re-Discover 순환

---

## 7-Stage Intelligence Loop

```
① Discover → ② Analyze → ③ Intent → ④ GEO/AEO
                                         ↓
⑦ Measure ← ⑥ Execute ← ⑤ Insight
    └──────────→ ① Discover (재순환)
```

---

## 벤치마크 DNA 통합

```
썸트렌드   → ② Analyze (근거 차트) + ⑤ Insight (보고서 빌더)
소머즈     → ① Discover (Data Explorer) + ② Analyze (CSV/Excel 내보내기)
리스닝마인드 → ③ Intent (인텐트 그래프, 클러스터, 저니)
아하트렌드  → Vertical Pack (산업별 벤치마크, 키워드, 템플릿)
피처링     → ① Discover (인플루언서 탐색) + ⑥ Execute (캠페인) + ⑦ Measure (성과)
```

---

## 전환 우선순위 (v2.1)

```
Phase 0: 인프라 (DB + Redis + Worker)                    ← 현재
Phase 1: Social Intelligence 실데이터 전환                ← 최우선
Phase 2: Comment Intelligence + Data Explorer (소머즈형)
Phase 3: Search Intent DB 영속화 (리스닝마인드형)
Phase 4: GEO/AEO 신규 모듈 (Citation 추적)              ← 핵심 차별화
Phase 5: Insight + Report Builder (썸트렌드형)
Phase 6: Execute — Campaign + Influencer (피처링형)
Phase 7: Measure — ROI + Benchmark (피처링+아하트렌드형)
Phase 8: Vertical Pack + Enterprise                      ← 수익 확장
```
