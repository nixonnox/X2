/**
 * Journey Engine.
 *
 * Maps intent clusters to customer journey stages
 * and infers transition paths between stages.
 *
 * Upgrade path: Replace with LLM-based pathway inference.
 */

import type {
  IntentCategory,
  JourneyStage,
  JourneyNode,
  JourneyEdge,
  JourneyMapResult,
  EngineVersion,
  ClusterResult,
  IntentClassificationResult,
} from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "journey-engine",
  version: "1.0.0",
  model: "stage-mapping-v1",
};

// ---------------------------------------------------------------------------
// Stage mapping
// ---------------------------------------------------------------------------

const INTENT_TO_STAGE: Record<IntentCategory, JourneyStage> = {
  DISCOVERY: "AWARENESS",
  COMPARISON: "COMPARISON",
  ACTION: "DECISION",
  TROUBLESHOOTING: "ACTION", // post-purchase
  NAVIGATION: "ACTION",
  UNKNOWN: "INTEREST",
};

const STAGE_ORDER: JourneyStage[] = [
  "AWARENESS",
  "INTEREST",
  "COMPARISON",
  "DECISION",
  "ACTION",
  "ADVOCACY",
];

const STAGE_LABELS: Record<JourneyStage, string> = {
  AWARENESS: "인지/발견",
  INTEREST: "관심/탐색",
  COMPARISON: "비교/검토",
  DECISION: "결정/구매",
  ACTION: "사용/실행",
  ADVOCACY: "추천/옹호",
};

// ---------------------------------------------------------------------------
// Journey Engine
// ---------------------------------------------------------------------------

export class JourneyEngine {
  /**
   * Build a journey map from intent classifications and clusters.
   */
  buildJourneyMap(
    intents: IntentClassificationResult[],
    clusters?: ClusterResult[],
  ): JourneyMapResult {
    if (intents.length === 0) {
      return {
        nodes: [],
        edges: [],
        dominantPath: [],
        engineVersion: ENGINE_VERSION,
      };
    }

    // 1. Group intents by journey stage
    const stageGroups = new Map<JourneyStage, IntentClassificationResult[]>();

    for (const intent of intents) {
      const stage = INTENT_TO_STAGE[intent.intentCategory] ?? "INTEREST";
      const group = stageGroups.get(stage) ?? [];
      group.push(intent);
      stageGroups.set(stage, group);
    }

    // 2. Create journey nodes for each active stage
    const nodes: JourneyNode[] = [];
    const nodeIdMap = new Map<JourneyStage, string>();

    for (const stage of STAGE_ORDER) {
      const stageIntents = stageGroups.get(stage);
      if (!stageIntents || stageIntents.length === 0) continue;

      const nodeId = `journey-${stage.toLowerCase()}`;
      nodeIdMap.set(stage, nodeId);

      // Find the most confident intent for this stage
      const topIntent = stageIntents.sort(
        (a, b) => b.confidence - a.confidence,
      )[0]!;

      nodes.push({
        id: nodeId,
        stage,
        label: STAGE_LABELS[stage],
        keywords: [...new Set(stageIntents.map((i) => i.keyword))].slice(0, 10),
        intentCategory: topIntent.intentCategory,
        weight: stageIntents.length,
      });
    }

    // 3. Create edges between adjacent stages
    const edges: JourneyEdge[] = [];
    const activeStages = STAGE_ORDER.filter((s) => nodeIdMap.has(s));

    for (let i = 0; i < activeStages.length - 1; i++) {
      const fromStage = activeStages[i]!;
      const toStage = activeStages[i + 1]!;
      const fromId = nodeIdMap.get(fromStage)!;
      const toId = nodeIdMap.get(toStage)!;

      // Transition score based on volume of intents in both stages
      const fromCount = stageGroups.get(fromStage)?.length ?? 0;
      const toCount = stageGroups.get(toStage)?.length ?? 0;
      const transitionScore =
        Math.min(fromCount, toCount) / Math.max(fromCount, toCount, 1);

      // Supporting evidence from keywords
      const fromKeywords = (stageGroups.get(fromStage) ?? []).map(
        (i) => i.keyword,
      );
      const toKeywords = (stageGroups.get(toStage) ?? []).map((i) => i.keyword);

      edges.push({
        fromNodeId: fromId,
        toNodeId: toId,
        transitionScore: Math.round(transitionScore * 100) / 100,
        supportingEvidence: [
          `${fromKeywords.slice(0, 3).join(", ")} → ${toKeywords.slice(0, 3).join(", ")}`,
        ],
      });
    }

    // Also add non-adjacent transitions (skip stages) if volume supports it
    for (let i = 0; i < activeStages.length; i++) {
      for (let j = i + 2; j < activeStages.length; j++) {
        const fromStage = activeStages[i]!;
        const toStage = activeStages[j]!;
        const fromId = nodeIdMap.get(fromStage)!;
        const toId = nodeIdMap.get(toStage)!;

        const fromCount = stageGroups.get(fromStage)?.length ?? 0;
        const toCount = stageGroups.get(toStage)?.length ?? 0;

        // Only add skip edges if both stages are well-represented
        if (fromCount >= 2 && toCount >= 2) {
          const transitionScore =
            (Math.min(fromCount, toCount) / Math.max(fromCount, toCount, 1)) *
            0.5;

          edges.push({
            fromNodeId: fromId,
            toNodeId: toId,
            transitionScore: Math.round(transitionScore * 100) / 100,
            supportingEvidence: [`Stage skip: ${fromStage} → ${toStage}`],
          });
        }
      }
    }

    // 4. Determine dominant path (most weighted sequence)
    const dominantPath = nodes
      .sort((a, b) => {
        const aIdx = STAGE_ORDER.indexOf(a.stage);
        const bIdx = STAGE_ORDER.indexOf(b.stage);
        return aIdx - bIdx;
      })
      .map((n) => n.id);

    return {
      nodes,
      edges,
      dominantPath,
      engineVersion: ENGINE_VERSION,
    };
  }
}
