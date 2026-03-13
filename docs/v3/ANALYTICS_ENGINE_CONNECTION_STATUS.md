# Analytics Engine Connection Status

> Phase 6 산출물 1/4 — 분석 엔진 연결 현황

## 1. Engine Connection Summary

| Engine                         | Status        | Engine Class                                        | Version                 | Storage                                 |
| ------------------------------ | ------------- | --------------------------------------------------- | ----------------------- | --------------------------------------- |
| Sentiment Engine               | **Connected** | `TextAnalyzer`                                      | rule-based-ko-en-v1     | `CommentAnalysis.sentiment*`            |
| Topic Engine                   | **Connected** | `TextAnalyzer`                                      | rule-based-ko-en-v1     | `CommentAnalysis.topics`                |
| FAQ / Repeated Question Engine | **Connected** | `TextAnalyzer` + `FAQService`                       | rule-based-ko-en-v1     | `FAQCandidate`                          |
| Risk Signal Engine             | **Connected** | `TextAnalyzer` + `RiskSignalService`                | rule-based-ko-en-v1     | `RiskSignal`                            |
| Intent Engine                  | **Connected** | `IntentClassifier`                                  | rule-based-ko-en-v1     | `IntentKeywordResult`                   |
| Cluster Engine                 | **Connected** | `ClusterEngine`                                     | jaccard-similarity-v1   | `IntentQuery.resultGraph`               |
| Journey Engine                 | **Connected** | `JourneyEngine`                                     | stage-mapping-v1        | `IntentQuery.resultGraph`               |
| Competitor Gap Engine          | **Ready**     | `CompetitorGapEngine`                               | metric-comparison-v1    | `InsightAction` (via ActionSynthesizer) |
| GEO/AEO Scoring Engine         | **Ready**     | `GeoAeoScorer`                                      | structure-analysis-v1   | `AeoSnapshot` + `InsightAction`         |
| Action Recommendation Engine   | **Connected** | `ActionSynthesizer` + `ActionRecommendationService` | rule-based-synthesis-v1 | `InsightAction`                         |

### Status Legend

| Status         | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Connected**  | 실데이터 입력 → 분석 → DB 저장까지 end-to-end 연결 완료              |
| **Ready**      | 엔진 구현 완료, 서비스 호출로 바로 사용 가능, 자동 파이프라인 미연결 |
| **Scaffolded** | 인터페이스만 존재, 구현 미완                                         |

## 2. Connection Architecture

```
Collection Pipeline (Phase 5)
    │
    ▼
┌─────────────────────────────────────────────────┐
│ CommentAnalysisService                          │
│   └── TextAnalyzer (sentiment+topic+question+risk+spam) │
│         │                                       │
│         ├── sentiment → CommentAnalysis          │
│         ├── topics → CommentAnalysis.topics      │
│         ├── isQuestion → FAQService.processQuestionComments() │
│         │                 └── FAQCandidate upsert│
│         └── isRisk → RiskSignalService.detectRisks() │
│                       └── RiskSignal create      │
│                       └── Notification (HIGH/CRITICAL) │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ IntentAnalysisService                           │
│   ├── IntentClassifier.expandAndClassify()      │
│   │     └── IntentKeywordResult records         │
│   ├── ClusterEngine.cluster()                   │
│   │     └── resultGraph.clusters                │
│   └── JourneyEngine.buildJourneyMap()           │
│         └── resultGraph.journey (nodes + edges) │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ ActionRecommendationService                     │
│   ├── Collects signals from:                    │
│   │     CommentAnalysis (sentiment distribution)│
│   │     FAQCandidate (unanswered questions)     │
│   │     RiskSignal (active risks)               │
│   │     IntentKeywordResult (gap opportunities) │
│   │     AeoSnapshot (visibility drops)          │
│   ├── ActionSynthesizer.synthesize()            │
│   └── InsightAction records                     │
└─────────────────────────────────────────────────┘

Standalone engines (ready for on-demand use):
┌─────────────────────────────────────────────────┐
│ CompetitorGapEngine.analyze(own, competitors)   │
│ GeoAeoScorer.score(content)                     │
│ ClusterEngine.cluster(items) — standalone mode  │
│ JourneyEngine.buildJourneyMap(intents)          │
│ ActionSynthesizer.synthesize(signals)           │
└─────────────────────────────────────────────────┘
```

## 3. Cross-Service Wiring (Phase 6)

### 3.1 Service Injection in `createServices()`

```typescript
// CommentAnalysis → FAQ + RiskSignal (downstream dispatch)
commentAnalysis.setDownstreamServices({
  faqService: faq,
  riskSignalService: riskSignal,
});

// AnalyticsInputBuilder → Analysis Services (collection dispatch)
analyticsInputBuilder.setServices({
  commentAnalyzer: commentAnalysis,
  listeningCollector: listeningAnalysis,
  intentProcessor: intentAnalysis,
  geoAeoCollector: geoAeo,
});
```

### 3.2 Data Flow: Comment → Sentiment → FAQ/Risk → Action

```
1. CollectionRunner collects YouTube comments
2. AnalyticsInputBuilder.dispatchCommentAnalysis()
3. CommentAnalysisService.analyzeComments()
4. TextAnalyzer.analyzeBatch() — real analysis
5. Results saved to CommentAnalysis (DB)
6. Questions → FAQService.processQuestionComments() → FAQCandidate (DB)
7. Risks → RiskSignalService.detectRisks() → RiskSignal (DB) + Notification
8. ActionRecommendationService.generateActions() reads all signals → InsightAction (DB)
```

### 3.3 Data Flow: Keyword → Intent → Cluster → Journey

```
1. IntentAnalysisService.processIntentAnalysis(queryId)
2. IntentClassifier.expandAndClassify(seedKeyword) — real classification
3. IntentKeywordResult records saved (DB)
4. ClusterEngine.cluster() → resultGraph.clusters
5. JourneyEngine.buildJourneyMap() → resultGraph.journey
6. IntentQuery updated with resultGraph + resultSummary (DB)
```

## 4. Engine Instances in Service Factory

```typescript
services.engines = {
  textAnalyzer: new TextAnalyzer(),
  intentClassifier: new IntentClassifier(),
  clusterEngine: new ClusterEngine(),
  journeyEngine: new JourneyEngine(),
  competitorGapEngine: new CompetitorGapEngine(),
  geoAeoScorer: new GeoAeoScorer(),
  actionSynthesizer: new ActionSynthesizer(),
  engineLogger: new EngineLogger(logger),
};
```

## 5. Files Created/Modified (Phase 6)

### New Files (engines/)

| File                                                         | Purpose                                             |
| ------------------------------------------------------------ | --------------------------------------------------- |
| `packages/api/src/services/engines/types.ts`                 | All engine type definitions                         |
| `packages/api/src/services/engines/engine-logger.ts`         | Engine execution logging + quality tracking         |
| `packages/api/src/services/engines/text-analyzer.ts`         | Sentiment + Topic + Question + Risk + Spam analysis |
| `packages/api/src/services/engines/intent-classifier.ts`     | Intent classification + gap scoring                 |
| `packages/api/src/services/engines/cluster-engine.ts`        | Jaccard similarity-based clustering                 |
| `packages/api/src/services/engines/journey-engine.ts`        | Journey stage mapping from intents                  |
| `packages/api/src/services/engines/competitor-gap-engine.ts` | Competitor metric gap analysis                      |
| `packages/api/src/services/engines/geo-aeo-scorer.ts`        | AI citation readiness scoring                       |
| `packages/api/src/services/engines/action-synthesizer.ts`    | Cross-engine action synthesis                       |
| `packages/api/src/services/engines/index.ts`                 | Barrel exports                                      |

### Modified Files

| File                                                             | Change                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/api/src/services/comments/comment-analysis.service.ts` | Replaced placeholder with TextAnalyzer, added FAQ/Risk dispatch            |
| `packages/api/src/services/intent/intent-analysis.service.ts`    | Replaced placeholder with IntentClassifier + ClusterEngine + JourneyEngine |
| `packages/api/src/services/index.ts`                             | Added engine imports, cross-service wiring, engines object                 |

## 6. Known Limitations

| Limitation               | Current State                                          | Upgrade Path                         |
| ------------------------ | ------------------------------------------------------ | ------------------------------------ |
| Korean NLP precision     | Rule-based keyword matching (70-80% accuracy estimate) | Claude Haiku API via @x2/ai          |
| Intent keyword expansion | Suffix-based expansion (15 patterns)                   | Claude Sonnet + Google Ads API       |
| Clustering quality       | Jaccard similarity on tokens                           | Embedding vectors + HDBSCAN          |
| Journey inference        | Stage mapping by intent category                       | LLM-based pathway inference          |
| Competitor data          | Requires manual metric input                           | Auto-sync from competitor channels   |
| GEO/AEO querying         | Content structure scoring only                         | Perplexity/Google AI API integration |
| Action synthesis         | Rule-based signal-to-action mapping                    | Claude Opus strategic synthesis      |
