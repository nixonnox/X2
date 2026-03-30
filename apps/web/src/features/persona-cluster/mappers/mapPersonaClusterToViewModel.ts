/**
 * Engine Output → ViewModel Mapper
 *
 * persona-cluster-engine의 출력을 프론트엔드 view model로 변환한다.
 * UI 컴포넌트는 엔진 타입을 직접 참조하지 않는다.
 */

import type {
  ClusterFinderResult,
  PersonaViewResult,
  PersonaProfile,
  IntentCluster,
  ClusterMembership,
  PersonaClusterLink,
} from "@/lib/persona-cluster-engine";
import {
  PERSONA_ARCHETYPE_LABELS,
  CLUSTER_CATEGORY_LABELS,
  PERSONA_TRAIT_LABELS,
} from "@/lib/persona-cluster-engine";
import { INTENT_CATEGORY_LABELS } from "@/lib/intent-engine";
import type {
  PersonaViewModel,
  ClusterViewModel,
  ClusterMemberViewModel,
  ClusterSummaryViewModel,
  PersonaSummaryViewModel,
  PersonaClusterScreenState,
} from "../types/viewModel";

// ─── 신뢰도 임계값 ──────────────────────────────────────────
const LOW_CONFIDENCE_THRESHOLD = 0.4;
const STALE_DATA_HOURS = 24;

// ═══════════════════════════════════════════════════════════════
// Persona Mapping
// ═══════════════════════════════════════════════════════════════

export function mapPersonaToViewModel(
  persona: PersonaProfile,
  clusterLinks: PersonaClusterLink[],
): PersonaViewModel {
  const intentInfo = INTENT_CATEGORY_LABELS[persona.dominantIntent];

  return {
    id: persona.id,
    label: persona.label,
    description: persona.description,
    archetype: persona.archetype,
    mindset: persona.mindset,
    dominantIntent: persona.dominantIntent,
    dominantIntentLabel: intentInfo?.label ?? persona.dominantIntent,
    dominantTopics: persona.dominantTopics,
    typicalQuestions: persona.typicalQuestions,
    representativeKeywords: persona.representativeKeywords,
    likelyStage: persona.likelyStage,
    likelyStageLabel: mapStageLabel(persona.likelyStage),
    traits: persona.traits.map((t) => ({
      axis: t.axis,
      label: PERSONA_TRAIT_LABELS[t.axis] ?? t.axis,
      value: t.value,
    })),
    contentStrategy: persona.contentStrategy,
    messagingAngle: persona.messagingAngle,
    summary: persona.summary,
    percentage: persona.percentage,
    confidence: persona.confidence,
    relatedClusterCount: clusterLinks.filter(
      (l) => l.personaId === persona.id,
    ).length,
    lowConfidenceFlag: persona.confidence < LOW_CONFIDENCE_THRESHOLD,
  };
}

export function mapPersonaViewResult(
  result: PersonaViewResult,
): {
  personas: PersonaViewModel[];
  summary: PersonaSummaryViewModel;
  screenState: Partial<PersonaClusterScreenState>;
} {
  const personas = result.personas.map((p) =>
    mapPersonaToViewModel(p, result.personaClusterLinks),
  );

  const lowConfidenceItems = personas.filter((p) => p.lowConfidenceFlag).length;

  const summary: PersonaSummaryViewModel = {
    seedKeyword: result.seedKeyword,
    totalPersonas: result.summary.totalPersonas,
    totalClusters: result.summary.totalClusters,
    totalKeywords: result.summary.totalKeywords,
    dominantArchetypeLabel:
      PERSONA_ARCHETYPE_LABELS[result.summary.dominantArchetype]?.label ??
      result.summary.dominantArchetype,
    archetypeDistribution: Object.entries(
      result.summary.archetypeDistribution,
    ).map(([key, count]) => ({
      label: PERSONA_ARCHETYPE_LABELS[key as keyof typeof PERSONA_ARCHETYPE_LABELS]?.label ?? key,
      count: count ?? 0,
    })),
    stageDistribution: Object.entries(
      result.summary.stageDistribution,
    ).map(([key, count]) => ({
      label: mapStageLabel(key),
      count: count ?? 0,
    })),
  };

  return {
    personas,
    summary,
    screenState: {
      isEmpty: personas.length === 0,
      lowConfidenceItems,
      lastUpdatedAt: result.summary.analyzedAt,
      durationMs: result.summary.durationMs,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Cluster Mapping
// ═══════════════════════════════════════════════════════════════

export function mapClusterToViewModel(
  cluster: IntentCluster,
  memberships: ClusterMembership[],
  personaLinks: PersonaClusterLink[],
): ClusterViewModel {
  const categoryInfo = CLUSTER_CATEGORY_LABELS[cluster.category];
  const intentInfo = INTENT_CATEGORY_LABELS[cluster.dominantIntent];

  const members = memberships
    .filter((m) => m.clusterId === cluster.id)
    .map((m) => mapMemberToViewModel(m));

  return {
    id: cluster.id,
    label: cluster.label,
    description: cluster.description,
    category: cluster.category,
    categoryLabel: categoryInfo?.label ?? cluster.category,
    dominantIntent: cluster.dominantIntent,
    dominantIntentLabel: intentInfo?.label ?? cluster.dominantIntent,
    dominantPhase: cluster.dominantPhase,
    dominantStage: cluster.dominantStage,
    representativeKeywords: cluster.representativeKeywords,
    representativeQuestions: cluster.representativeQuestions,
    themes: cluster.themes,
    memberCount: cluster.memberCount,
    score: cluster.score,
    avgGapScore: cluster.avgGapScore,
    avgSearchVolume: cluster.avgSearchVolume,
    risingCount: cluster.risingCount,
    relatedPersonaCount: personaLinks.filter(
      (l) => l.clusterId === cluster.id,
    ).length,
    lowConfidenceFlag: cluster.score < 20,
    members,
  };
}

function mapMemberToViewModel(m: ClusterMembership): ClusterMemberViewModel {
  return {
    id: m.itemId,
    label: m.itemLabel,
    type: m.itemType,
    intent: m.intent,
    searchVolume: m.searchVolume,
    gapScore: m.gapScore,
    isRising: m.isRising,
    membershipScore: m.membershipScore,
  };
}

export function mapClusterFinderResult(
  result: ClusterFinderResult,
  personaLinks?: PersonaClusterLink[],
): {
  clusters: ClusterViewModel[];
  summary: ClusterSummaryViewModel;
  screenState: Partial<PersonaClusterScreenState>;
} {
  const links = personaLinks ?? [];

  const clusters = result.clusters.map((c) =>
    mapClusterToViewModel(c, result.memberships, links),
  );

  const lowConfidenceItems = clusters.filter((c) => c.lowConfidenceFlag).length;

  const summary: ClusterSummaryViewModel = {
    seedKeyword: result.seedKeyword,
    totalClusters: result.summary.totalClusters,
    totalKeywords: result.summary.totalKeywords,
    avgClusterSize: result.summary.avgClusterSize,
    avgGapScore: result.summary.avgGapScore,
    topCategories: result.summary.topCategories.map((tc) => ({
      label: CLUSTER_CATEGORY_LABELS[tc.category]?.label ?? tc.category,
      count: tc.count,
    })),
    intentDistribution: Object.entries(result.summary.intentDistribution)
      .filter(([key]) => key !== "unknown")
      .map(([key, count]) => ({
        label: INTENT_CATEGORY_LABELS[key as keyof typeof INTENT_CATEGORY_LABELS]?.label ?? key,
        count,
        color: INTENT_CATEGORY_LABELS[key as keyof typeof INTENT_CATEGORY_LABELS]?.color ?? "#6b7280",
      })),
  };

  return {
    clusters,
    summary,
    screenState: {
      isEmpty: clusters.length === 0,
      lowConfidenceItems,
      lastUpdatedAt: result.summary.analyzedAt,
      durationMs: result.summary.durationMs,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Screen State Builder
// ═══════════════════════════════════════════════════════════════

export function buildScreenState(
  partial: Partial<PersonaClusterScreenState>,
  status: PersonaClusterScreenState["status"],
  errorMessage?: string,
): PersonaClusterScreenState {
  const lastUpdatedAt = partial.lastUpdatedAt;
  const isStale = lastUpdatedAt
    ? Date.now() - new Date(lastUpdatedAt).getTime() > STALE_DATA_HOURS * 60 * 60 * 1000
    : false;

  return {
    status,
    isEmpty: partial.isEmpty ?? false,
    isPartial: partial.isPartial ?? false,
    hasError: status === "error",
    errorMessage,
    lowConfidenceItems: partial.lowConfidenceItems ?? 0,
    staleData: isStale,
    lastUpdatedAt,
    durationMs: partial.durationMs,
    sourceCount: partial.sourceCount,
  };
}

// ═══════════════════════════════════════════════════════════════
// Utility
// ═══════════════════════════════════════════════════════════════

function mapStageLabel(stage: string): string {
  const labels: Record<string, string> = {
    interest: "관심",
    research: "탐색",
    evaluation: "평가",
    decision: "결정",
    purchase: "구매",
    advocacy: "옹호",
  };
  return labels[stage] ?? stage;
}
