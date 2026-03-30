# Vertical Intelligence Enhancement Architecture

> cluster/topic/benchmark/social/comment 맥락을 반영한 업종별 정교한 해석 아키텍처

## 1. 목적

기존 vertical template는 "같은 블록을 업종별로 재배치/리네이밍" 수준이었음.
이번 Enhancement로 **실제 데이터 맥락(cluster, social, benchmark)을 업종별로 다르게 해석**하는 구조를 추가.

## 2. 신규 서비스 4개

```
packages/api/src/services/vertical-templates/
├── topic-taxonomy-mapping.service.ts       ← 클러스터 → 업종 분류 매핑
├── benchmark-baseline.service.ts           ← 업종별 벤치마크 비교
├── vertical-social-comment-integration.service.ts  ← 소셜/댓글 → 업종별 해석
└── vertical-signal-fusion.service.ts       ← 3개 시그널 통합 (메인 오케스트레이터)
```

## 3. 데이터 흐름

```
                    ┌──────────────────────────────────────┐
                    │        SignalFusionService            │
                    │  (cluster + social + benchmark 통합)  │
                    └─────────────┬────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
┌─────────▼──────────┐ ┌─────────▼──────────┐ ┌──────────▼─────────┐
│  TopicTaxonomy     │ │  Benchmark         │ │  SocialComment     │
│  MappingService    │ │  BaselineService   │ │  IntegrationService│
│                    │ │                    │ │                    │
│ cluster.label      │ │ measured values    │ │ sentiment data     │
│ cluster.members    │ │ vs baseline        │ │ comment topics     │
│ → taxonomy match   │ │ → comparison       │ │ social mentions    │
│ → coverage map     │ │ → interpretation   │ │ → industry interpret│
└────────────────────┘ └────────────────────┘ └────────────────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                    ┌─────────────▼────────────────────────┐
                    │        SignalFusionResult             │
                    │  additionalEvidence[]                 │
                    │  additionalInsights[]                 │
                    │  additionalWarnings[]                 │
                    │  signalQuality                        │
                    └──────────────────────────────────────┘
                                  │
                    ┌─────────────▼────────────────────────┐
                    │   VerticalDocumentAssembler           │
                    │   (기존 8-step pipeline에 주입)       │
                    └──────────────────────────────────────┘
```

## 4. 서비스별 상세

### 4.1 TopicTaxonomyMappingService

| 항목 | 내용 |
|------|------|
| 입력 | ClusterInput[] (clusterId, label, memberTexts) + IndustryType |
| 출력 | TaxonomyMappingResult (매핑 결과 + 커버리지 맵 + 미매핑 수) |
| 매핑 방식 | label/member text vs 카테고리 확장 키워드 사전 (token overlap) |
| 가중치 | label 매칭 1.0, member 매칭 0.5, 카테고리명 직접매칭 +0.3 |
| confidence | totalWeight / 3.0 (정규화, max 1.0) |
| 다중 매핑 | 지원 — 하나의 클러스터가 여러 카테고리에 매핑 가능 |

### 4.2 BenchmarkBaselineService

| 항목 | 내용 |
|------|------|
| 데이터 소스 | 4개 업종 × 8개 메트릭 = 32개 벤치마크 기준 |
| 비교 방식 | actualValue vs baselineValue, ±15% 기준으로 ABOVE/AVERAGE/BELOW |
| 해석 | 업종별 한국어 해석 문장 자동 생성 |
| 점수 | overallScore (0~1) — 전체 비교 결과 요약 |

### 4.3 VerticalSocialCommentIntegrationService

| 항목 | 내용 |
|------|------|
| 입력 | SocialCommentData (감성분포, 댓글토픽, 소셜멘션) + IndustryType |
| 출력 | evidence[] + insight[] + warning[] |
| 업종별 차이 | criticalNegativeTopics, riskEscalationKeywords, sentimentFraming |
| 리스크 판정 | 업종별 에스컬레이션 키워드와 교차 → CRITICAL 상향 |
| 품질 판정 | 데이터 양 기반 HIGH/MEDIUM/LOW/NONE |

### 4.4 VerticalSignalFusionService

| 항목 | 내용 |
|------|------|
| 역할 | 3개 시그널 소스를 하나로 통합 |
| 출력 | additionalEvidence + additionalInsights + additionalWarnings |
| 품질 메타 | signalQuality.overallRichness (RICH/MODERATE/MINIMAL) |
| graceful | 어떤 시그널이 없어도 동작 (있는 것만 반영) |

## 5. tRPC 엔드포인트

| 엔드포인트 | 타입 | 용도 |
|-----------|------|------|
| verticalDocument.signalFusion | query | 시그널 통합 분석 결과 |
| verticalDocument.benchmarkBaseline | query | 업종별 벤치마크 기준 조회 |
| verticalDocument.taxonomyMapping | query | 클러스터 → taxonomy 매핑 |

## 6. 기존 코드와의 관계

| 기존 | 변경 |
|------|------|
| VerticalDocumentAssembler | 변경 없음 — fusion 결과를 입력으로 전달 |
| VerticalDocumentIntegrationService | 변경 없음 — fusion은 별도 엔드포인트 |
| beauty/fnb/finance/entertainment-template | benchmarkBaseline 데이터 추가 |
| services/index.ts | Group 13 추가 (4개 서비스) |

## 7. 연결 방식

현재: signalFusion 결과를 프론트엔드에서 apply와 함께 표시.
다음 단계: signalFusion 결과를 apply 입력에 자동 주입하여 문서에 반영.
