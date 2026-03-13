# ANALYTICS_ENGINE_MAP — 분석 엔진 구조 및 연결

> 작성일: 2026-03-10
> 상태: 확정 (AI 모델 선택은 추후 검증 필요)

---

## 1. 엔진 전체 구조

```
Raw Data (수집)
   │
   ▼
┌──────────────────────────────────────────────────────┐
│                  Analysis Engines                     │
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │Sentiment│  │  Topic  │  │  Intent │  │Cluster │ │
│  │ Engine  │  │ Engine  │  │ Engine  │  │ Engine │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬───┘ │
│       │            │            │             │      │
│  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐            │
│  │ Journey │  │Comp Gap │  │ GEO/AEO │            │
│  │ Engine  │  │ Engine  │  │ Engine  │            │
│  └────┬────┘  └────┬────┘  └────┬────┘            │
│       │            │            │                   │
│       └────────────┼────────────┘                   │
│                    ▼                                 │
│           ┌──────────────┐                          │
│           │   Action     │                          │
│           │Recommendation│                          │
│           │   Engine     │                          │
│           └──────────────┘                          │
└──────────────────────────────────────────────────────┘
   │
   ▼
InsightReport / InsightAction / EvidenceAsset
```

---

## 2. 엔진별 상세 정의

### 2.1 Sentiment Engine (감성 분석)

| 항목       | 내용                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| **입력**   | Comment.text, RawSocialMention.text                                                  |
| **출력**   | sentiment (POSITIVE/NEUTRAL/NEGATIVE), sentimentScore (0~1), sentimentReason         |
| **처리**   | LLM 기반 분석 (Claude/GPT)                                                           |
| **저장**   | CommentAnalysis.sentiment/sentimentScore/sentimentReason, RawSocialMention.sentiment |
| **트리거** | 새 댓글/멘션 수집 시 비동기 큐                                                       |
| **연결**   | → Topic Engine (감성별 토픽 분포), → Journey Engine (감성 변화 추이)                 |

**구현 전략**:

```
배치 처리: 최대 50개 댓글/요청 (토큰 효율)
프롬프트: 한국어 특화 (은어, 줄임말, 이모지 해석)
비용 제어: Haiku로 초벌 → 부정/리스크만 Sonnet 재분석
캐싱: 동일 텍스트 해시 → 중복 분석 방지
```

### 2.2 Topic Engine (토픽 분류)

| 항목       | 내용                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| **입력**   | Comment.text, RawSocialMention.text, Content.title+description         |
| **출력**   | topics (string[]), topicConfidence (0~1), questionType                 |
| **처리**   | LLM + 키워드 매칭 하이브리드                                           |
| **저장**   | CommentAnalysis.topics/topicConfidence, RawSocialMention.topics        |
| **트리거** | Sentiment Engine과 동시 실행 (같은 프롬프트)                           |
| **연결**   | → Cluster Engine (토픽 기반 클러스터링), → Action Engine (토픽별 대응) |

**구현 전략**:

```
1차: LLM으로 자유 분류 (카테고리 제약 없이)
2차: VerticalPack.topicTaxonomy가 있으면 해당 분류 체계에 매핑
집계: 토픽별 빈도/감성 분포 → TrendKeywordAnalytics 반영
```

### 2.3 Intent Engine (검색 인텐트 분석)

| 항목       | 내용                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| **입력**   | IntentQuery.seedKeyword, 검색량 데이터 (Google Ads API), 자동완성/연관검색                                |
| **출력**   | IntentKeywordResult (keyword, intentCategory, gapScore, gapType)                                          |
| **처리**   | LLM 분류 + 검색량 통계 + 소셜 볼륨 교차                                                                   |
| **저장**   | IntentKeywordResult, IntentQuery.resultSummary/resultGraph                                                |
| **트리거** | 사용자 요청 (on-demand)                                                                                   |
| **연결**   | → Cluster Engine (인텐트 클러스터), → GEO/AEO Engine (키워드 인용 추적), → Action Engine (콘텐츠 갭 액션) |

**구현 전략**:

```
Step 1: 시드 키워드 → 자동완성/연관검색으로 키워드 확장
Step 2: 각 키워드의 검색량 조회 (Google Ads API)
Step 3: LLM으로 인텐트 분류 (DISCOVERY/COMPARISON/ACTION/TROUBLESHOOTING/NAVIGATION)
Step 4: 소셜 볼륨 (RawSocialMention 카운트) 대비 검색 볼륨 → gapScore 계산
Step 5: gapType 결정 (BLUE_OCEAN/OPPORTUNITY/COMPETITIVE/SATURATED)
```

### 2.4 Cluster Engine (클러스터링)

| 항목       | 내용                                                                       |
| ---------- | -------------------------------------------------------------------------- |
| **입력**   | IntentKeywordResult[], CommentAnalysis.topics, RawSocialMention.topics     |
| **출력**   | 클러스터 그룹 (JSON — 노드/엣지 그래프)                                    |
| **처리**   | LLM 기반 의미 클러스터링 + 공출현 분석                                     |
| **저장**   | IntentQuery.resultGraph, TrendKeywordAnalytics.relatedKeywords             |
| **트리거** | Intent Engine 완료 후 자동 실행                                            |
| **연결**   | → Journey Engine (클러스터 간 이동 경로), → Insight (클러스터별 기회/위험) |

**구현 전략**:

```
방법 1: LLM에게 키워드 목록을 주고 의미적 그룹핑 요청
방법 2: 임베딩 벡터 + HDBSCAN (대량 키워드 시)
시각화: 노드(키워드) + 엣지(관련도) 그래프 JSON
```

### 2.5 Journey Engine (검색 저니 분석)

| 항목       | 내용                                                                  |
| ---------- | --------------------------------------------------------------------- |
| **입력**   | IntentKeywordResult[] (클러스터링 결과), 검색 시퀀스 데이터           |
| **출력**   | 저니 맵 (JSON — 단계별 키워드 흐름)                                   |
| **처리**   | LLM 기반 경로 추론 + 인텐트 카테고리 시퀀스                           |
| **저장**   | IntentQuery.resultGraph (journey 섹션)                                |
| **트리거** | Cluster Engine 완료 후                                                |
| **연결**   | → Insight (저니 단계별 콘텐츠 갭), → Action (각 단계에 필요한 콘텐츠) |

**구현 전략**:

```
인텐트 카테고리 시퀀스: DISCOVERY → COMPARISON → ACTION
LLM 추론: "이 키워드를 검색하는 사람은 다음에 무엇을 검색할까?"
자동완성 체인: 키워드 A의 연관검색 → 키워드 B의 연관검색 → ... 경로 추적
```

### 2.6 Competitor Gap Engine (경쟁 갭 분석)

| 항목       | 내용                                                                      |
| ---------- | ------------------------------------------------------------------------- |
| **입력**   | Channel(OWNED) + Channel(COMPETITOR)의 ChannelSnapshot/ContentMetricDaily |
| **출력**   | 갭 분석 결과 (JSON — 지표별 비교, 강약점)                                 |
| **처리**   | 통계 비교 + LLM 해석                                                      |
| **저장**   | InsightReport (COMPETITOR_REPORT), EvidenceAsset                          |
| **트리거** | 주간/월간 자동 또는 사용자 요청                                           |
| **연결**   | → Action Engine (경쟁 대응 액션), → Insight (경쟁 포지셔닝)               |

**구현 전략**:

```
지표 비교: 구독자 성장률, 참여율, 콘텐츠 빈도, 댓글 감성
콘텐츠 비교: 인기 콘텐츠 유형/주제 vs 경쟁사
댓글 비교: 감성 분포, FAQ 차이
LLM 해석: "경쟁사 대비 참여율은 높지만 콘텐츠 빈도가 절반"
```

### 2.7 GEO/AEO Engine (AI 인용 분석)

| 항목       | 내용                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| **입력**   | AeoKeyword, AeoSnapshot.citedSources, CitationReadyReportSource                                         |
| **출력**   | visibilityScore, 인용 추세, 최적화 제안                                                                 |
| **처리**   | 스냅샷 비교 + LLM 최적화 제안                                                                           |
| **저장**   | AeoSnapshot.visibilityScore, CitationReadyReportSource.currentCitationCount, InsightReport (AEO_REPORT) |
| **트리거** | AEO_CRAWL 스케줄 (매일) + 사용자 요청                                                                   |
| **연결**   | → Action Engine (GEO 최적화 액션), → Insight (인용 트렌드 리포트)                                       |

**구현 전략**:

```
수집: 각 AI 엔진에 키워드 질의 → 답변 + 인용 소스 파싱
비교: 자사 소스 인용 여부 + 경쟁사 인용 순위
점수: visibilityScore = f(인용 수, 순위, 엔진 수)
최적화: LLM이 인용되지 않는 이유 분석 + 구조 개선 제안
```

### 2.8 Action Recommendation Engine (액션 추천)

| 항목       | 내용                                                            |
| ---------- | --------------------------------------------------------------- |
| **입력**   | 모든 분석 엔진의 출력 (감성, 토픽, 인텐트, 갭, GEO/AEO 등)      |
| **출력**   | InsightAction (actionType, priority, description, sourceModule) |
| **처리**   | LLM 기반 종합 판단                                              |
| **저장**   | InsightAction, InsightReport.actions                            |
| **트리거** | 인사이트 보고서 생성 시 자동                                    |
| **연결**   | → Campaign (실행 연결), → Measure (성과 추적)                   |

**구현 전략**:

```
입력 종합:
  - 감성 악화 → RISK_MITIGATE
  - FAQ 미답변 → CONTENT_CREATE
  - 키워드 갭 → KEYWORD_TARGET / SEO_UPDATE
  - GEO 미인용 → CONTENT_OPTIMIZE (GEO 구조)
  - 경쟁 갭 → COMPETITOR_WATCH / STRATEGY_ADJUST
  - 인플루언서 기회 → INFLUENCER_OUTREACH

우선순위 결정:
  - 리스크 (부정 감성 급증, 위험 이슈) → HIGH
  - 기회 (BLUE_OCEAN 키워드, GEO 갭) → MEDIUM~HIGH
  - 개선 (참여율 향상, 콘텐츠 최적화) → MEDIUM
  - 모니터링 (경쟁 추적, 트렌드 관찰) → LOW
```

---

## 3. 엔진 간 연결 흐름

```
[수집 완료]
     │
     ├──→ Sentiment Engine ──┐
     │                       ├──→ Topic Engine ──┐
     │                       │                   │
     │                       │                   ├──→ Cluster Engine
     │                       │                   │       │
     │                       │                   │       ▼
     │                       │                   │   Journey Engine
     │                       │                   │       │
     ├──→ Intent Engine ─────┘                   │       │
     │       │                                   │       │
     │       ▼                                   │       │
     │   GEO/AEO Engine                         │       │
     │       │                                   │       │
     ├──→ Competitor Gap Engine                  │       │
     │       │                                   │       │
     └───────┼───────────────────────────────────┘       │
             │                                           │
             ▼                                           │
     Action Recommendation Engine ◄──────────────────────┘
             │
             ▼
     InsightReport + InsightAction
```

---

## 4. AI 비용 관리

### 4.1 모델 선택 전략

| 작업               | 모델              | 이유                    |
| ------------------ | ----------------- | ----------------------- |
| 감성 분석 (초벌)   | Claude Haiku 4.5  | 대량 처리, 비용 효율    |
| 감성 분석 (재분석) | Claude Sonnet 4.6 | 리스크/부정만 정밀 분석 |
| 토픽 분류          | Claude Haiku 4.5  | 감성과 동시 처리        |
| 인텐트 분류        | Claude Sonnet 4.6 | 정확도 중요             |
| 클러스터링         | Claude Sonnet 4.6 | 의미적 그룹핑           |
| 저니 추론          | Claude Sonnet 4.6 | 추론 능력 필요          |
| 경쟁 분석 해석     | Claude Sonnet 4.6 | 전략적 판단             |
| GEO/AEO 분석       | Claude Sonnet 4.6 | 구조 분석 능력          |
| 액션 추천          | Claude Opus 4.6   | 최고 품질 종합 판단     |
| 리포트 생성        | Claude Sonnet 4.6 | 문서 생성               |

### 4.2 비용 제어 전략

```
1. 배칭: 개별 댓글이 아닌 50개 단위 배치 처리
2. 캐싱: 동일 텍스트 해시 → 중복 분석 방지
3. 계층 분석: Haiku 초벌 → 필요 시 Sonnet 재분석
4. 할당량: 워크스페이스/플랜별 AI 토큰 사용량 제한
5. 추적: UsageMetric.aiTokensUsed로 일별 사용량 모니터링
```

---

## 5. 확장 포인트

| 엔진      | 향후 확장                                    |
| --------- | -------------------------------------------- |
| Sentiment | 다국어 지원, 이모지/밈 해석                  |
| Topic     | VerticalPack별 커스텀 토픽 분류 체계         |
| Intent    | Naver 검색 인텐트, 다국어 키워드             |
| Cluster   | 실시간 클러스터 업데이트, 변화 감지          |
| Journey   | 실제 유저 행동 데이터 연동 (GA4)             |
| Comp Gap  | 자동 경쟁사 발견 (키워드 겹침 기반)          |
| GEO/AEO   | 새 AI 검색 엔진 추가, 인용 최적화 자동화     |
| Action    | 자동 실행 (approval workflow 후), A/B 테스트 |
