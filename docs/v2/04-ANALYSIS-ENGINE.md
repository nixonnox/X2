# X2 v2 — Analysis Engine Architecture

> 작성일: 2026-03-10
> 상태: Draft

---

## 0. 불변 원칙

1. **실데이터 기반**: 모든 분석은 수집된 실데이터에서 출발. 데이터 없으면 분석 불가 상태 표시
2. **비용 인식 AI**: 모든 AI 호출에 토큰/비용 추적. 불필요한 호출 차단
3. **규칙 기반 우선**: AI 없이 계산 가능한 지표는 규칙 기반. AI는 해석/생성에만 사용
4. **Fallback 체인**: AI 실패 시 규칙 기반 → 데이터만 표시 (mock 금지)

---

## 1. 분석 계층 구조

```
┌─────────────────────────────────────────────────────┐
│ Layer 4: Strategic Synthesis (AI Premium)            │
│ "무엇을 해야 하는가?"                                │
│ - 크로스 모듈 전략 제안                               │
│ - 콘텐츠 캘린더 생성                                  │
│ - 경쟁 포지셔닝 분석                                  │
│ - GEO/AEO 최적화 전략                                │
│ 비용: $$$ | 빈도: 주 1회 | 모델: Claude Sonnet+      │
├─────────────────────────────────────────────────────┤
│ Layer 3: Pattern Recognition (AI Standard)          │
│ "왜 이런 현상이 발생하는가?"                          │
│ - 댓글 감성/토픽 분류                                 │
│ - 검색 의도 분류                                      │
│ - FAQ 추출                                            │
│ - 리스크 감지                                         │
│ 비용: $$ | 빈도: 일~주 | 모델: Claude Haiku/Sonnet   │
├─────────────────────────────────────────────────────┤
│ Layer 2: Trend & Comparison (규칙 기반 + 통계)       │
│ "어떻게 변하고 있는가?"                               │
│ - 시계열 트렌드 (증가/감소/안정)                       │
│ - 벤치마크 비교 (채널 vs 채널)                         │
│ - 이상치 감지 (z-score, IQR)                          │
│ - 시즈널 패턴                                         │
│ 비용: 무료 | 빈도: 일 1회                             │
├─────────────────────────────────────────────────────┤
│ Layer 1: Metric Computation (순수 계산)              │
│ "지금 수치가 어떤가?"                                 │
│ - KPI 집계 (구독자, 조회수, 참여율)                    │
│ - 증감률 계산                                         │
│ - 기간별 합산/평균                                    │
│ - 비정규화 필드 갱신                                  │
│ 비용: 무료 | 빈도: 수집 시                            │
└─────────────────────────────────────────────────────┘
```

---

## 2. 모듈별 분석 엔진 상세

### 2.1 Search Intent Engine

#### 입력 → 출력

```
입력: seed keyword (string), locale, config
출력: IntentAnalysisResult
  ├─ keywords: ClassifiedKeyword[]     (의도 분류된 키워드 목록)
  ├─ graph: IntentGraph                (노드/링크 시각화)
  ├─ gaps: GapAnalysis[]               (검색-소셜 갭)
  ├─ journey: SearchJourney            (인식→비교→행동 매핑)
  ├─ kpis: IntentKpis                  (요약 지표)
  └─ seasonality: SeasonalPattern[]    (시즈널 패턴)
```

#### 분석 단계별 엔진

| 단계           | 방식       | 데이터 소스                           | AI 사용        |
| -------------- | ---------- | ------------------------------------- | -------------- |
| 키워드 확장    | API 호출   | Google Autocomplete, Related Searches | No             |
| 검색량 수집    | API 호출   | Google Trends / DataForSEO            | No             |
| 소셜 볼륨 수집 | API 호출   | YouTube/Instagram/TikTok Search API   | No             |
| 의도 분류      | AI (batch) | 키워드 텍스트                         | Yes (Standard) |
| 갭 점수 계산   | 규칙 기반  | 검색량 vs 소셜 콘텐츠 수              | No             |
| 그래프 구축    | 알고리즘   | 키워드 공출현 + 의도 유사성           | No             |
| 여정 매핑      | AI         | 키워드 클러스터                       | Yes (Fast)     |
| 전략 제안      | AI         | 전체 분석 결과                        | Yes (Premium)  |

#### 갭 분석 로직 (규칙 기반)

```typescript
function calculateGapType(
  searchVolume: number,
  socialContentCount: number,
): GapType {
  const ratio = socialContentCount / Math.max(searchVolume / 1000, 1);

  if (ratio < 0.1) return "BLUE_OCEAN"; // 검색 수요 대비 콘텐츠 거의 없음
  if (ratio < 0.5) return "OPPORTUNITY"; // 콘텐츠 있지만 부족
  if (ratio < 2.0) return "COMPETITIVE"; // 적절한 경쟁
  return "SATURATED"; // 콘텐츠 과포화
}

function calculateGapScore(searchVolume: number, socialVolume: number): number {
  // 0~100. 높을수록 기회가 큼 (검색 수요 높고 콘텐츠 적음)
  if (searchVolume === 0) return 0;
  const supplyRatio = socialVolume / searchVolume;
  return Math.max(0, Math.min(100, 100 * (1 - supplyRatio)));
}
```

### 2.2 Social Intelligence Engine

#### 지표 계산 (Layer 1 — 규칙 기반)

```typescript
// 참여율 계산 (플랫폼별)
function calculateEngagementRate(
  platform: PlatformType,
  content: ContentMetrics,
): number {
  switch (platform) {
    case "YOUTUBE":
      // (likes + comments) / views * 100
      return content.viewCount > 0
        ? ((content.likeCount + content.commentCount) / content.viewCount) * 100
        : 0;
    case "INSTAGRAM":
      // (likes + comments + saves) / followers * 100
      return content.followerCount > 0
        ? ((content.likeCount +
            content.commentCount +
            (content.saveCount ?? 0)) /
            content.followerCount) *
            100
        : 0;
    case "TIKTOK":
      // (likes + comments + shares) / views * 100
      return content.viewCount > 0
        ? ((content.likeCount +
            content.commentCount +
            (content.shareCount ?? 0)) /
            content.viewCount) *
            100
        : 0;
    case "X":
      // (likes + retweets + replies) / impressions * 100
      return content.impressionCount > 0
        ? ((content.likeCount +
            (content.retweetCount ?? 0) +
            content.commentCount) /
            content.impressionCount) *
            100
        : 0;
  }
}

// 성장률 계산 (30일)
function calculateGrowthRate(snapshots: ChannelSnapshot[]): number {
  const sorted = snapshots.sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length < 2) return 0;
  const oldest = sorted[0].followerCount;
  const newest = sorted[sorted.length - 1].followerCount;
  return oldest > 0 ? ((newest - oldest) / oldest) * 100 : 0;
}
```

#### 트렌드 감지 (Layer 2 — 통계)

```typescript
function detectTrend(values: number[], windowSize: number = 7): TrendDirection {
  if (values.length < windowSize) return "STABLE";

  const recent = values.slice(-windowSize);
  const previous = values.slice(-windowSize * 2, -windowSize);
  if (previous.length === 0) return "STABLE";

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

  const changeRate =
    previousAvg > 0 ? (recentAvg - previousAvg) / previousAvg : 0;

  if (changeRate > 0.05) return "RISING";
  if (changeRate < -0.05) return "DECLINING";
  return "STABLE";
}

function detectAnomaly(values: number[], latest: number): boolean {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
  );
  const zScore = std > 0 ? Math.abs(latest - mean) / std : 0;
  return zScore > 2.5; // 2.5 표준편차 초과 = 이상치
}
```

#### 경쟁 벤치마크 (Layer 2 — 비교)

```typescript
interface BenchmarkResult {
  channel: string;
  metrics: {
    followers: { value: number; rank: number; percentile: number };
    engagementRate: { value: number; rank: number; percentile: number };
    contentFrequency: { value: number; rank: number; percentile: number };
    growthRate: { value: number; rank: number; percentile: number };
  };
  overallScore: number; // 0~100
}

// 카테고리/플랫폼 벤치마크 (동일 카테고리 평균 대비)
interface CategoryBenchmark {
  category: string;
  platform: PlatformType;
  avgFollowers: number;
  avgEngagement: number;
  avgContentFrequency: number;
  sampleSize: number;
}
```

### 2.3 Comment Intelligence Engine

#### 감성 분석 (Layer 3 — AI)

```typescript
// AI 분석 요청 스키마
interface CommentBatchAnalysisRequest {
  comments: Array<{
    id: string;
    text: string;
    platform: string;
    contentTitle: string;
  }>;
}

// AI 분석 응답 스키마
interface CommentBatchAnalysisResponse {
  results: Array<{
    id: string;
    sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    sentimentScore: number; // -1.0 ~ 1.0
    sentimentReason: string; // "제품 품질에 대한 긍정적 평가"
    topics: string[]; // ["제품 품질", "고객 서비스"]
    isQuestion: boolean;
    questionType?: string; // "pricing" | "feature" | "how_to" | "complaint"
    isSpam: boolean;
    isRisk: boolean;
    riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }>;
}
```

#### 감성 트렌드 집계 (Layer 2 — 규칙 기반)

```typescript
interface SentimentTrend {
  date: string;
  positive: number; // 비율 (0~1)
  neutral: number;
  negative: number;
  totalComments: number;
  avgScore: number; // -1.0 ~ 1.0
}

// 감성 급변 감지
function detectSentimentShift(
  trends: SentimentTrend[],
  windowSize: number = 3,
): SentimentAlert | null {
  if (trends.length < windowSize * 2) return null;

  const recent = trends.slice(-windowSize);
  const previous = trends.slice(-windowSize * 2, -windowSize);

  const recentAvg = recent.reduce((s, t) => s + t.avgScore, 0) / windowSize;
  const previousAvg = previous.reduce((s, t) => s + t.avgScore, 0) / windowSize;

  const shift = recentAvg - previousAvg;

  if (Math.abs(shift) > 0.3) {
    return {
      type: shift < 0 ? "NEGATIVE_SHIFT" : "POSITIVE_SHIFT",
      magnitude: Math.abs(shift),
      previousAvg,
      currentAvg: recentAvg,
    };
  }
  return null;
}
```

### 2.4 GEO/AEO Engine

#### Citation 분석 (Layer 2 — 규칙 기반)

```typescript
interface CitationAnalysis {
  keyword: string;
  engine: AeoEngine;
  date: Date;

  // 가시성 점수
  visibilityScore: number; // 0~100

  // 인용 상세
  totalCitations: number;
  brandCitations: number;
  brandRank: number | null; // 인용 순위 (1=최상위)
  competitorCitations: Array<{
    brand: string;
    rank: number;
    url: string;
  }>;

  // 트렌드
  visibilityTrend: TrendDirection;
  rankChange: number; // +2 = 2단계 상승
}

// 가시성 점수 계산
function calculateVisibilityScore(snapshot: AeoSnapshot): number {
  let score = 0;

  // 브랜드 언급 (40%)
  if (snapshot.brandMentioned) score += 40;

  // 인용 순위 (30%)
  if (snapshot.brandCitedRank) {
    const rankScore = Math.max(0, 100 - (snapshot.brandCitedRank - 1) * 20);
    score += rankScore * 0.3;
  }

  // 반복 인용 (20%) - 여러 엔진에서 인용되는 경우
  // (크로스 엔진 분석에서 계산)

  // 답변 내 비중 (10%)
  // (AI 답변 텍스트 분석에서 계산)

  return Math.round(score);
}
```

#### GEO 최적화 제안 (Layer 4 — AI)

```typescript
// AI에게 전달할 컨텍스트
interface GeoOptimizationContext {
  keyword: string;
  currentVisibility: number;
  currentRank: number | null;
  citedSources: CitedSource[]; // 현재 인용되는 소스들
  competitorVisibility: Array<{
    brand: string;
    score: number;
    rank: number | null;
  }>;
  brandContent: Array<{
    // 우리 브랜드의 관련 콘텐츠
    url: string;
    title: string;
    type: string;
  }>;
}

// AI 응답 스키마
interface GeoOptimizationSuggestion {
  priority: "HIGH" | "MEDIUM" | "LOW";
  category:
    | "content_creation"
    | "content_update"
    | "technical_seo"
    | "authority_building";
  title: string;
  description: string;
  expectedImpact: string;
  effort: "LOW" | "MEDIUM" | "HIGH";
}
```

### 2.5 Action Synthesis Engine (Layer 4)

#### 크로스 모듈 인사이트 생성

```typescript
// 전체 모듈 데이터를 종합하여 액션 생성
interface ActionSynthesisInput {
  // Search Intent
  topGapKeywords: IntentKeywordResult[]; // BLUE_OCEAN/OPPORTUNITY 키워드

  // Social Intelligence
  channelTrends: Array<{
    channel: string;
    metric: string;
    trend: TrendDirection;
    anomaly: boolean;
  }>;

  // Comment Intelligence
  sentimentShifts: SentimentAlert[];
  topFaqs: FaqCluster[];
  risks: RiskAlert[];

  // GEO/AEO
  visibilityChanges: Array<{
    keyword: string;
    engine: AeoEngine;
    change: number;
    direction: "UP" | "DOWN";
  }>;
}

// 출력: 우선순위화된 액션 목록
interface SynthesizedAction {
  title: string;
  description: string;
  actionType: ActionType;
  priority: Priority;
  sourceModule: ModuleType;
  reasoning: string; // 왜 이 액션이 필요한가
  expectedOutcome: string; // 예상 결과
  relatedData: {
    // 근거 데이터 링크
    module: ModuleType;
    entityId: string;
    summary: string;
  }[];
}
```

---

## 3. AI 모델 라우팅

### 모델 선택 매트릭스

| 작업 유형        | 모델 Tier | 모델 예시         | 비용/1K토큰 | 배치 크기 |
| ---------------- | --------- | ----------------- | ----------- | --------- |
| 댓글 감성 (대량) | Fast      | Claude Haiku 4.5  | $0.001      | 50~100건  |
| 의도 분류        | Standard  | Claude Sonnet 4.6 | $0.003      | 20~50건   |
| 토픽 추출        | Standard  | Claude Sonnet 4.6 | $0.003      | 20~50건   |
| FAQ 추출         | Standard  | Claude Sonnet 4.6 | $0.003      | 전체 배치 |
| 전략 제안        | Premium   | Claude Opus 4.6   | $0.015      | 1건       |
| 리포트 생성      | Premium   | Claude Opus 4.6   | $0.015      | 1건       |
| GEO 최적화       | Standard  | Claude Sonnet 4.6 | $0.003      | 키워드당  |

### Fallback 체인

```
Primary AI Provider (설정에 따라)
  ↓ 실패 시
Secondary AI Provider
  ↓ 실패 시
Rule-based Fallback (AI 없이 가능한 부분만)
  ↓
"AI 분석 일시 불가" 상태 표시 (Mock 데이터 금지)
```

---

## 4. 비용 추적 & 제어

### 비용 추적 구조

```typescript
interface AiCostRecord {
  taskType: AiTaskType;
  provider: "anthropic" | "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  projectId: string;
  timestamp: Date;
}

// 일별 비용 집계
interface DailyCostSummary {
  date: string;
  totalCostUsd: number;
  byTask: Record<
    AiTaskType,
    { calls: number; tokens: number; costUsd: number }
  >;
  byProject: Record<string, number>;
}
```

### 비용 제어 장치

1. **일별 한도**: 프로젝트/워크스페이스별 일일 AI 비용 상한
2. **작업별 한도**: 단일 작업의 최대 토큰 수 제한
3. **자동 차단**: 일별 한도 80% 도달 시 경고, 100% 도달 시 차단
4. **우선순위 큐**: 한도 근접 시 Premium 작업만 허용, Fast 작업 일시 중단
