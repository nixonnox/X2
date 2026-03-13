/**
 * Action Synthesizer Engine.
 *
 * Synthesizes analysis results from all engines into prioritized
 * actionable recommendations. This is the final convergence point
 * of the analytics pipeline.
 *
 * Upgrade path: Add LLM-based synthesis via Claude Opus for strategic judgment.
 */

import type {
  ActionCategory,
  ActionRecommendationResult,
  EngineVersion,
} from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "action-synthesizer",
  version: "1.0.0",
  model: "rule-based-synthesis-v1",
};

// ---------------------------------------------------------------------------
// Signal types from upstream engines
// ---------------------------------------------------------------------------

export type AnalysisSignal = {
  sourceModule: string;
  sourceEntityId: string | null;
  signalType: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  data?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Action Synthesizer
// ---------------------------------------------------------------------------

export class ActionSynthesizer {
  /**
   * Synthesize signals from all engines into action recommendations.
   */
  synthesize(signals: AnalysisSignal[]): ActionRecommendationResult[] {
    if (signals.length === 0) return [];

    const actions: ActionRecommendationResult[] = [];

    // 1. Process each signal and generate appropriate actions
    for (const signal of signals) {
      const action = this.signalToAction(signal);
      if (action) {
        actions.push(action);
      }
    }

    // 2. Deduplicate similar actions
    const deduped = this.deduplicateActions(actions);

    // 3. Sort by priority
    const priorityOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    deduped.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9),
    );

    return deduped;
  }

  // ---------------------------------------------------------------------------
  // Signal to action mapping
  // ---------------------------------------------------------------------------

  private signalToAction(
    signal: AnalysisSignal,
  ): ActionRecommendationResult | null {
    const { sourceModule, signalType } = signal;

    // Sentiment-based actions
    if (sourceModule === "SENTIMENT_ENGINE") {
      return this.sentimentAction(signal);
    }

    // Topic-based actions
    if (sourceModule === "TOPIC_ENGINE") {
      return this.topicAction(signal);
    }

    // FAQ-based actions
    if (sourceModule === "FAQ_ENGINE") {
      return this.faqAction(signal);
    }

    // Risk-based actions
    if (sourceModule === "RISK_ENGINE") {
      return this.riskAction(signal);
    }

    // Intent-based actions
    if (sourceModule === "INTENT_ENGINE") {
      return this.intentAction(signal);
    }

    // Competitor gap actions
    if (sourceModule === "COMPETITOR_GAP_ENGINE") {
      return this.competitorAction(signal);
    }

    // GEO/AEO actions
    if (sourceModule === "GEO_AEO_ENGINE") {
      return this.geoAeoAction(signal);
    }

    // Generic action for unrecognized modules
    return {
      title: signal.title,
      description: signal.description,
      category: "CONTENT_OPTIMIZATION",
      priority: signal.severity,
      expectedImpact: "분석 결과에 기반한 개선 필요",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private sentimentAction(signal: AnalysisSignal): ActionRecommendationResult {
    const category: ActionCategory =
      signal.severity === "CRITICAL" || signal.severity === "HIGH"
        ? "COMMUNITY_MANAGEMENT"
        : "CONTENT_OPTIMIZATION";

    return {
      title: signal.title,
      description: signal.description,
      category,
      priority: signal.severity,
      expectedImpact: "부정 감성 비율 감소 및 커뮤니티 관계 개선",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private topicAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "CONTENT_CREATION",
      priority: signal.severity,
      expectedImpact: "관심 주제 기반 콘텐츠로 참여율 향상",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private faqAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "CONTENT_CREATION",
      priority: signal.severity,
      expectedImpact: "반복 질문 해소로 고객 만족도 및 전환율 향상",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private riskAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "RISK_MITIGATION",
      priority: signal.severity,
      expectedImpact: "리스크 조기 대응으로 브랜드 평판 보호",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private intentAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "SEO_OPTIMIZATION",
      priority: signal.severity,
      expectedImpact: "검색 의도 기반 콘텐츠로 유입 증가",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private competitorAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "CONTENT_CREATION",
      priority: signal.severity,
      expectedImpact: "경쟁사 대비 약점 보완으로 시장 포지셔닝 강화",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  private geoAeoAction(signal: AnalysisSignal): ActionRecommendationResult {
    return {
      title: signal.title,
      description: signal.description,
      category: "SEO_OPTIMIZATION",
      priority: signal.severity,
      expectedImpact: "AI 검색 엔진 인용 가능성 향상",
      relatedEvidenceIds: signal.sourceEntityId ? [signal.sourceEntityId] : [],
      sourceModule: signal.sourceModule,
      sourceEntityId: signal.sourceEntityId,
      engineVersion: ENGINE_VERSION,
    };
  }

  // ---------------------------------------------------------------------------
  // Deduplication
  // ---------------------------------------------------------------------------

  private deduplicateActions(
    actions: ActionRecommendationResult[],
  ): ActionRecommendationResult[] {
    const seen = new Map<string, ActionRecommendationResult>();

    for (const action of actions) {
      // Key based on source module + category
      const key = `${action.sourceModule}:${action.category}:${action.title.slice(0, 30)}`;

      if (!seen.has(key)) {
        seen.set(key, action);
      } else {
        // Keep the higher priority one
        const existing = seen.get(key)!;
        const priorityOrder: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        if (
          (priorityOrder[action.priority] ?? 9) <
          (priorityOrder[existing.priority] ?? 9)
        ) {
          seen.set(key, action);
        }
      }
    }

    return Array.from(seen.values());
  }
}
