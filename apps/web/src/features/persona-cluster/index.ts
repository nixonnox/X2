/**
 * Persona-Cluster Feature — Public API
 */

// ─── Hooks ───
export { usePersonaQuery, useClusterQuery } from "./hooks/usePersonaClusterQuery";
export type { UsePersonaQueryReturn, UseClusterQueryReturn } from "./hooks/usePersonaClusterQuery";

// ─── View Models ───
export type {
  PersonaViewModel,
  ClusterViewModel,
  ClusterMemberViewModel,
  PersonaClusterScreenState,
  ClusterSummaryViewModel,
  PersonaSummaryViewModel,
} from "./types/viewModel";

// ─── Mappers ───
export {
  mapPersonaViewResult,
  mapClusterFinderResult,
  buildScreenState,
} from "./mappers/mapPersonaClusterToViewModel";
