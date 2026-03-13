# Engine Input/Output Schema

> Phase 6 산출물 2/4 — 엔진별 입력/출력 구조 및 저장 위치

## 1. Sentiment Engine (via TextAnalyzer)

### Input

```typescript
{ id: string; text: string; contentTitle?: string; platform?: string }
```

### Output

```typescript
SentimentResult {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;  // -1.0 to 1.0
  confidence: number;      // 0.0 to 1.0
  reason: string | null;   // e.g., "Keywords: 좋아요, 추천"
  language: string;        // "ko" | "en" | "ja" | "zh"
  qualityFlags: {
    lowConfidence: boolean;
    needsHumanReview: boolean;
    noisyData: boolean;
    usedFallback: boolean;
  };
}
```

### Storage

| Field          | DB Column                           | Table           |
| -------------- | ----------------------------------- | --------------- |
| sentiment      | `comment_analyses.sentiment`        | CommentAnalysis |
| sentimentScore | `comment_analyses.sentiment_score`  | CommentAnalysis |
| reason         | `comment_analyses.sentiment_reason` | CommentAnalysis |
| language       | `comment_analyses.language`         | CommentAnalysis |

### Downstream

- `ActionRecommendationService`: negative ratio > 30% → HIGH/CRITICAL action
- `RiskSignalService`: negative + risk words → RiskSignal creation
- `getSentimentDistribution()`: aggregated for dashboard

---

## 2. Topic Engine (via TextAnalyzer)

### Input

Same as Sentiment (bundled analysis)

### Output

```typescript
TopicResult {
  primaryTopic: string;      // from TOPIC_TAXONOMY
  secondaryTopics: string[]; // up to 3
  confidence: number;
  topicSource: string;       // "keyword_match"
}
```

### Topic Taxonomy (23 categories)

```
가격, 품질, 사용법, 비교, 일정, 지원, 불만, 칭찬,
배송, 환불, 기능, 디자인, 성능, 내구성, 사이즈, 맛,
서비스, 매장, 이벤트, 할인, 추천, 후기, 문의, 기타
```

### Storage

| Field                              | DB Column                           | Table           |
| ---------------------------------- | ----------------------------------- | --------------- |
| [primaryTopic, ...secondaryTopics] | `comment_analyses.topics`           | CommentAnalysis |
| confidence                         | `comment_analyses.topic_confidence` | CommentAnalysis |

### Downstream

- `RiskSignalService.groupByPrimaryTopic()`: groups risk comments by topic
- `extractTopNegativeTopics()`: aggregates negative sentiment topics for dashboard

---

## 3. FAQ / Question Detection (via TextAnalyzer + FAQService)

### Input (Detection)

Same as Sentiment (bundled analysis)

### Output (Detection)

```typescript
QuestionDetectionResult {
  isQuestion: boolean;
  questionType: string | null;  // "how_to"|"why"|"comparison"|"recommendation"|"price"|"availability"|"general"
  normalizedQuestion: string | null;
  confidence: number;
}
```

### Processing Flow

```
TextAnalyzer.detectQuestion() → isQuestion=true
  → FAQService.processQuestionComments(projectId, commentIds)
    → faqCandidate.upsertByQuestion() (create or increment mentionCount)
```

### Storage

| Field        | DB Column                        | Table                                      |
| ------------ | -------------------------------- | ------------------------------------------ |
| isQuestion   | `comment_analyses.is_question`   | CommentAnalysis                            |
| questionType | `comment_analyses.question_type` | CommentAnalysis                            |
| question     | `faq_candidates.question`        | FAQCandidate                               |
| mentionCount | `faq_candidates.mention_count`   | FAQCandidate                               |
| status       | `faq_candidates.status`          | FAQCandidate (DETECTED→REVIEWING→ANSWERED) |

### Downstream

- `ActionRecommendationService`: unanswered FAQs → MEDIUM/HIGH priority actions
- Report generation: top unanswered questions

---

## 4. Risk Signal Engine (via TextAnalyzer + RiskSignalService)

### Input (Detection)

Same as Sentiment (bundled analysis)

### Output (Detection)

```typescript
RiskDetectionResult {
  isRisk: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  riskIndicators: string[];  // matched escalation/critical words
  confidence: number;
}
```

### Processing Flow

```
TextAnalyzer.detectRisk() → isRisk=true + riskLevel
  → RiskSignalService.detectRisks(projectId, riskComments)
    → Group by primary topic
    → Create/update RiskSignal (escalate severity if needed)
    → Create Notification for HIGH/CRITICAL
```

### Storage

| Field            | DB Column                         | Table                                      |
| ---------------- | --------------------------------- | ------------------------------------------ |
| isRisk           | `comment_analyses.is_risk`        | CommentAnalysis                            |
| riskLevel        | `comment_analyses.risk_level`     | CommentAnalysis                            |
| title            | `risk_signals.title`              | RiskSignal                                 |
| severity         | `risk_signals.severity`           | RiskSignal                                 |
| sourceCommentIds | `risk_signals.source_comment_ids` | RiskSignal                                 |
| status           | `risk_signals.status`             | RiskSignal (ACTIVE→INVESTIGATING→RESOLVED) |

### Downstream

- `ActionRecommendationService`: active risks → CRITICAL/HIGH priority actions
- Notification system: HIGH/CRITICAL → in-app + email alert
- Ops dashboard: `getDashboardSummary()`

---

## 5. Intent Engine (via IntentClassifier)

### Input

```typescript
keyword: string;
context?: { relatedTexts?: string[] };
```

### Output

```typescript
IntentClassificationResult {
  keyword: string;
  intentCategory: "DISCOVERY"|"COMPARISON"|"ACTION"|"TROUBLESHOOTING"|"NAVIGATION"|"UNKNOWN";
  subIntent: string | null;  // "정보_탐색"|"비교_검토"|"구매_의도"|"문제_해결"|etc.
  confidence: number;
  supportingPhrases: string[];
  gapScore: number;          // 0.0 to 1.0
  gapType: "BLUE_OCEAN"|"OPPORTUNITY"|"COMPETITIVE"|"SATURATED";
  engineVersion: EngineVersion;
}
```

### Storage

| Field          | DB Column                                | Table               |
| -------------- | ---------------------------------------- | ------------------- |
| keyword        | `intent_keyword_results.keyword`         | IntentKeywordResult |
| intentCategory | `intent_keyword_results.intent_category` | IntentKeywordResult |
| subIntent      | `intent_keyword_results.sub_intent`      | IntentKeywordResult |
| confidence     | `intent_keyword_results.confidence`      | IntentKeywordResult |
| gapScore       | `intent_keyword_results.gap_score`       | IntentKeywordResult |
| gapType        | `intent_keyword_results.gap_type`        | IntentKeywordResult |

### Downstream

- `ActionRecommendationService`: BLUE_OCEAN keywords → content creation actions
- ClusterEngine: groups keywords by similarity
- JourneyEngine: maps intents to journey stages

---

## 6. Cluster Engine

### Input

```typescript
ClusterInput {
  id: string;
  text: string;
  type: "keyword" | "topic" | "intent" | "question";
}
```

### Output

```typescript
ClusterResult {
  clusterId: string;
  label: string;
  representativePhrase: string;
  memberItems: ClusterMember[];
  clusterScore: number;  // avg similarity
  engineVersion: EngineVersion;
}
```

### Storage

Stored as JSON in `IntentQuery.resultGraph.clusters`

### Downstream

- JourneyEngine: uses clusters for stage grouping
- InsightReport: cluster visualization data

---

## 7. Journey Engine

### Input

```typescript
intents: IntentClassificationResult[];
clusters?: ClusterResult[];  // optional
```

### Output

```typescript
JourneyMapResult {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  dominantPath: string[];
  engineVersion: EngineVersion;
}
```

### Journey Stages

```
AWARENESS(인지/발견) → INTEREST(관심/탐색) → COMPARISON(비교/검토)
  → DECISION(결정/구매) → ACTION(사용/실행) → ADVOCACY(추천/옹호)
```

### Storage

Stored as JSON in `IntentQuery.resultGraph.journey`

### Downstream

- InsightReport: journey visualization
- ActionRecommendationService: stage gap identification

---

## 8. Competitor Gap Engine

### Input

```typescript
ownMetrics: ChannelMetrics;
competitorMetrics: ChannelMetrics[];

ChannelMetrics {
  channelId, channelName, platform,
  subscriberCount, contentCount,
  avgViewCount, avgEngagementRate,
  topTopics, contentTypes, postingFrequency
}
```

### Output

```typescript
CompetitorGapResult {
  projectId: string;
  gapSummary: string;
  opportunityAreas: OpportunityArea[];
  missingContentFormats: string[];
  competitorStrengths: CompetitorStrength[];
  suggestedActions: string[];
  engineVersion: EngineVersion;
}
```

### Storage

Via `ActionSynthesizer` → `InsightAction` records

### Downstream

- ActionRecommendationService: gap-based content/strategy actions
- InsightReport: competitive analysis section

---

## 9. GEO/AEO Scoring Engine

### Input

```typescript
{ title: string; text: string; url?: string; metadata?: Record<string, unknown> }
```

### Output

```typescript
GeoAeoScoreResult {
  citationReadinessScore: number;   // 0-100
  answerabilityScore: number;       // 0-100
  structureQualityScore: number;    // 0-100
  sourceTrustScore: number;         // 0-100
  overallScore: number;             // 0-100
  improvementSuggestions: string[];
  engineVersion: EngineVersion;
}
```

### Scoring Dimensions

| Dimension          | Weight | Criteria                                                     |
| ------------------ | ------ | ------------------------------------------------------------ |
| Citation Readiness | 25%    | Title quality, URL quality, content length, internal linking |
| Answerability      | 30%    | Direct answers, definitions, how-to, lists, Q&A format       |
| Structure Quality  | 25%    | Headings, lists, tables, FAQ sections, schema markup         |
| Source Trust       | 20%    | Citations, author info, date, expertise indicators           |

### Storage

Results can be stored in `CitationReadyReportSource` or as `InsightAction` via ActionSynthesizer

### Downstream

- GeoAeoService: enriches AEO keyword tracking
- InsightReport: citation optimization recommendations

---

## 10. Action Recommendation Engine (via ActionSynthesizer)

### Input

```typescript
AnalysisSignal {
  sourceModule: string;
  sourceEntityId: string | null;
  signalType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  data?: Record<string, unknown>;
}
```

### Output

```typescript
ActionRecommendationResult {
  title: string;
  description: string;
  category: ActionCategory;     // 9 categories
  priority: string;
  expectedImpact: string;
  relatedEvidenceIds: string[];
  sourceModule: string;
  sourceEntityId: string | null;
  engineVersion: EngineVersion;
}
```

### Action Categories

```
CONTENT_CREATION, CONTENT_OPTIMIZATION, COMMUNITY_MANAGEMENT,
ADVERTISING, INFLUENCER, REPORT, RISK_MITIGATION,
SEO_OPTIMIZATION, PRODUCT_FEEDBACK
```

### Storage

| Field          | DB Column                          | Table                                         |
| -------------- | ---------------------------------- | --------------------------------------------- |
| title          | `insight_actions.title`            | InsightAction                                 |
| category       | `insight_actions.action_type`      | InsightAction                                 |
| priority       | `insight_actions.priority`         | InsightAction                                 |
| sourceModule   | `insight_actions.source_module`    | InsightAction                                 |
| sourceEntityId | `insight_actions.source_entity_id` | InsightAction                                 |
| status         | `insight_actions.status`           | InsightAction (PENDING→IN_PROGRESS→COMPLETED) |

### Downstream

- Campaign creation: `convertToCampaign()`
- Report generation: actions linked to InsightReport
- Ops dashboard: action status tracking
