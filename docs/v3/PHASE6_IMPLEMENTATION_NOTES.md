# Phase 6 Implementation Notes

> Phase 6 산출물 4/4 — 구현 결정 사항 및 기술 노트

## 1. Architecture Decisions

### 1.1 Engine Placement

**Decision**: `packages/api/src/services/engines/` (inside api package, parallel to services)

**Rationale**:

- Engines are pure computation modules (no DB access, no DI)
- Services orchestrate engines + repository access
- Clean separation: engines produce results, services persist them
- Engines are stateless and reusable across services

### 1.2 Rule-Based vs LLM

**Decision**: Rule-based analysis as primary engine path (not mock/placeholder)

**Rationale**:

- No external AI API dependency required — engines work immediately
- Korean-aware keyword dictionaries provide meaningful (not random) results
- Results are deterministic, reproducible, and debuggable
- LLM integration is an upgrade, not a prerequisite
- Rule-based engines remain as permanent fallback after LLM integration

### 1.3 Cross-Service Wiring

**Decision**: `setDownstreamServices()` injection pattern

**Rationale**:

- `CommentAnalysisService` needs to dispatch to `FAQService` and `RiskSignalService`
- Circular dependency avoided: services don't import each other at module level
- Factory (`createServices()`) handles injection after all services are constructed
- Same pattern as Phase 5's `AnalyticsInputBuilder.setServices()`

### 1.4 Engine Logger vs System Logger

**Decision**: Separate `EngineLogger` for engine-specific metrics

**Rationale**:

- Engine execution metrics (confidence, input/output counts, duration) differ from application logs
- `EngineLogger` stores structured `EngineExecutionLog` entries with quality metrics
- System `Logger` (info/warn/error) used for operational messages
- Both are used together: EngineLogger records structured data, Logger logs human-readable messages

## 2. Implementation Details

### 2.1 File Structure

```
packages/api/src/services/engines/
├── types.ts                    # All engine type definitions
├── engine-logger.ts            # EngineLogger + EngineLogBuilder
├── text-analyzer.ts            # Sentiment + Topic + Question + Risk + Spam
├── intent-classifier.ts        # Intent classification + gap scoring
├── cluster-engine.ts           # Jaccard similarity clustering
├── journey-engine.ts           # Journey stage mapping
├── competitor-gap-engine.ts    # Metric gap analysis
├── geo-aeo-scorer.ts           # Citation readiness scoring
├── action-synthesizer.ts       # Cross-engine action synthesis
└── index.ts                    # Barrel exports
```

### 2.2 Dependency Graph

```
TextAnalyzer (standalone, no deps)
IntentClassifier (standalone, no deps)
ClusterEngine (standalone, no deps)
JourneyEngine (standalone, no deps)
CompetitorGapEngine (standalone, no deps)
GeoAeoScorer (standalone, no deps)
ActionSynthesizer (standalone, no deps)
EngineLogger (Logger injection only)

CommentAnalysisService
  ├── TextAnalyzer (creates internally)
  ├── EngineLogger (creates internally)
  ├── FAQService (injected via setDownstreamServices)
  └── RiskSignalService (injected via setDownstreamServices)

IntentAnalysisService
  ├── IntentClassifier (creates internally)
  ├── ClusterEngine (creates internally)
  ├── JourneyEngine (creates internally)
  └── EngineLogger (creates internally)

ActionRecommendationService
  └── Repositories (direct queries for signals)

createServices()
  ├── Creates all service + engine instances
  ├── commentAnalysis.setDownstreamServices({ faq, riskSignal })
  ├── analyticsInputBuilder.setServices({ commentAnalyzer, ... })
  └── services.engines = { textAnalyzer, intentClassifier, ... }
```

### 2.3 Korean Language Support

| Feature            | Implementation                               |
| ------------------ | -------------------------------------------- |
| Sentiment keywords | 60+ positive, 60+ negative Korean keywords   |
| Topic taxonomy     | 23 business-relevant categories in Korean    |
| Question patterns  | 7 Korean question regex patterns             |
| Risk escalation    | 25+ Korean risk/escalation keywords          |
| Spam detection     | Korean spam patterns (카톡, 부업, etc.)      |
| Language detection | Korean character ratio analysis              |
| Negation handling  | 안/못/없/아니 patterns swap sentiment scores |

## 3. What Works End-to-End

### 3.1 Comment → Sentiment/Topic/FAQ/Risk → Action

```
1. YouTube comment collected via CollectionRunner
2. AnalyticsInputBuilder dispatches to CommentAnalysisService
3. TextAnalyzer.analyzeBatch() performs real analysis:
   - Sentiment: POSITIVE/NEUTRAL/NEGATIVE with score and reason
   - Topics: 가격/품질/사용법/etc. with confidence
   - Questions: detection + type classification
   - Risks: detection + severity level
   - Spam: pattern detection
4. CommentAnalysis records saved with engine version
5. Questions → FAQService → FAQCandidate upserted
6. Risks → RiskSignalService → RiskSignal created + Notification
7. ActionRecommendationService reads all signals → InsightAction
```

### 3.2 Keyword → Intent → Cluster → Journey

```
1. IntentAnalysisService.processIntentAnalysis(queryId)
2. IntentClassifier.expandAndClassify(seedKeyword):
   - Generates 16 expanded keywords (seed + 15 suffixes)
   - Classifies each: DISCOVERY/COMPARISON/ACTION/TROUBLESHOOTING/NAVIGATION
   - Assigns sub-intent: 정보_탐색/비교_검토/구매_의도/문제_해결/etc.
   - Calculates gap score + gap type per keyword
3. ClusterEngine.cluster() groups by Jaccard similarity
4. JourneyEngine.buildJourneyMap() maps to journey stages
5. IntentQuery updated with resultGraph (clusters + journey) and resultSummary
```

## 4. Review Fixes Applied (Phase 6)

| Issue                                                               | Fix                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Placeholder analysis (`createPlaceholderAnalysis`) was default path | Replaced with `TextAnalyzer.analyzeBatch()` — real analysis             |
| Random intent keywords (`generatePlaceholderKeywords`)              | Replaced with `IntentClassifier.expandAndClassify()` — pattern-based    |
| FAQ dispatch commented out (`TODO: [CROSS-SERVICE]`)                | Wired via `setDownstreamServices()` — FAQService called directly        |
| Risk dispatch commented out (`TODO: [CROSS-SERVICE]`)               | Wired via `setDownstreamServices()` — RiskSignalService called directly |
| `analyzerModel: "placeholder"` in DB records                        | Changed to `"text-analyzer-v1.0.0"`                                     |
| No engine execution logging                                         | Added EngineLogger with per-execution quality metrics                   |
| No `topNegativeTopics` in sentiment distribution                    | Implemented `extractTopNegativeTopics()` from DB                        |
| No cross-engine action synthesis                                    | Added ActionSynthesizer engine                                          |
| No clustering or journey in intent analysis                         | Added ClusterEngine + JourneyEngine integration                         |

## 5. What's Pending / TODO

| Item                                         | Status           | Blocker                             |
| -------------------------------------------- | ---------------- | ----------------------------------- |
| Comment analysis (sentiment/topic/FAQ/risk)  | **Working**      | None                                |
| Intent classification + clustering + journey | **Working**      | None                                |
| Action recommendation from all signals       | **Working**      | None                                |
| Competitor gap analysis                      | **Engine ready** | Needs competitor channel data in DB |
| GEO/AEO content scoring                      | **Engine ready** | Needs content text input            |
| LLM-based analysis (Claude Haiku)            | **TODO**         | @x2/ai module not created           |
| Embedding-based clustering                   | **TODO**         | Needs vector DB or embedding API    |
| Google Ads API (search volume)               | **TODO**         | API credentials needed              |
| Perplexity API (AEO querying)                | **TODO**         | API key needed                      |
| BullMQ queue for async analysis              | **TODO**         | @x2/queue package empty             |
| Persistent engine logs                       | **TODO**         | Currently in-memory only            |

## 6. TypeScript Compilation

0 new errors from Phase 6 code. All errors are pre-existing:

- 22 `@prisma/client` not found (prisma generate not run)
- 2 `@x2/social` export mismatches
- 4 Instagram constructor bugs
- 2 TikTok DateRange bugs

## 7. Migration Path

### Phase 6.1 (Current) — Rule-Based Engines ✅

- [x] TextAnalyzer (sentiment, topic, question, risk, spam)
- [x] IntentClassifier (intent classification, gap scoring)
- [x] ClusterEngine (Jaccard similarity clustering)
- [x] JourneyEngine (stage mapping from intents)
- [x] CompetitorGapEngine (metric comparison)
- [x] GeoAeoScorer (citation readiness scoring)
- [x] ActionSynthesizer (cross-engine action synthesis)
- [x] EngineLogger (execution logging, quality tracking)
- [x] Cross-service wiring (CommentAnalysis → FAQ + Risk)
- [x] Engine execution logging and quality metrics

### Phase 6.2 (Next) — LLM Integration

- [ ] Create @x2/ai module (Claude Haiku + Sonnet clients)
- [ ] Replace TextAnalyzer internals with Haiku batch calls
- [ ] Add Sonnet re-analysis for negative/risk comments
- [ ] Keep rule-based as fallback (usedFallback flag)
- [ ] Add token usage tracking to UsageMetric

### Phase 6.3 (Future) — Advanced Engines

- [ ] Embedding vectors for semantic clustering
- [ ] Google Ads API for search volume data
- [ ] Perplexity API for AEO querying
- [ ] Claude Opus for action synthesis
- [ ] Persistent engine logs (DB table)

### Phase 7 (Next Phase) — Insight/Action/Report Integration

- [ ] Connect engine results to InsightReport generation
- [ ] Auto-generate reports from analysis signals
- [ ] Action-to-Campaign conversion flow
- [ ] Dashboard data endpoints for engine results
- [ ] Real-time alert system for risk signals
