/**
 * Journey Feature — Public API
 */

// ─── Hooks ───
export { usePathfinderQuery } from "./hooks/usePathfinderQuery";
export { useRoadViewQuery } from "./hooks/useRoadViewQuery";
export type { UsePathfinderQueryReturn } from "./hooks/usePathfinderQuery";
export type { UseRoadViewQueryReturn } from "./hooks/useRoadViewQuery";

// ─── View Models ───
export type {
  PathfinderNodeViewModel,
  PathfinderEdgeViewModel,
  PathfinderPathViewModel,
  PathfinderSummaryViewModel,
  RoadStageViewModel,
  RoadViewSummaryViewModel,
  BranchPointViewModel,
  JourneyScreenState,
} from "./types/viewModel";

// ─── Mappers ───
export {
  mapPathfinderResult,
  buildJourneyScreenState,
} from "./mappers/mapPathfinderToViewModel";
export { mapRoadViewResult } from "./mappers/mapRoadViewToViewModel";

// ─── Components ───
export { JourneyScreenStatePanel } from "./components/JourneyScreenStatePanel";
