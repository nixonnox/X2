/**
 * Persona-Cluster Engine — Public API
 *
 * 페르소나 뷰(Persona View)와 클러스터 파인더(Cluster Finder) 분석의 진입점.
 */

// ─── Types ───────────────────────────────────────────────────
export type {
  // Cluster
  IntentCluster,
  ClusterMethod,
  ClusterCategory,
  ClusterMembership,
  ClusterMemberType,

  // Persona
  PersonaProfile,
  PersonaArchetype,
  PersonaMindset,
  PersonaTrait,
  PersonaTraitAxis,

  // Links
  PersonaClusterLink,
  PersonaJourneyLink,

  // Request/Response
  ClusterFinderRequest,
  ClusterFinderResult,
  ClusterFinderSummary,
  PersonaViewRequest,
  PersonaViewResult,
  PersonaViewSummary,

  // Traceability
  AnalysisTrace,
  AnalysisTraceStage,
} from "./types";

// ─── Constants ───────────────────────────────────────────────
export {
  PERSONA_ARCHETYPE_LABELS,
  CLUSTER_CATEGORY_LABELS,
  PERSONA_TRAIT_LABELS,
  PERSONA_MINDSET_LABELS,
  INTENT_TO_ARCHETYPE,
  SUBINTENT_TO_ARCHETYPE,
  ARCHETYPE_TO_MINDSET,
  INTENT_PHASE_TO_CLUSTER_CATEGORY,
} from "./types";

// ─── Services ────────────────────────────────────────────────
export { analyzeClusterFinder } from "./services/cluster-finder-service";
export { analyzePersonaView } from "./services/persona-view-service";

// ─── Builders ────────────────────────────────────────────────
export { buildIntentClusters } from "./builders/cluster-builder";
export { buildPersonaProfiles } from "./builders/persona-archetype-builder";
export {
  labelClusters,
  labelWithLLM,
  applyLLMLabels,
} from "./builders/cluster-labeler";
