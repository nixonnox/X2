/**
 * Journey Engine — Public API
 *
 * 패스파인더(Pathfinder)와 로드뷰(Road View) 분석의 진입점.
 */

// ─── Types ───────────────────────────────────────────────────────
export type {
  // Core data structures
  JourneyNode,
  JourneyEdge,
  JourneyPath,
  JourneyPathStep,
  RoadStage,
  StageTransition,
  BranchPoint,

  // Enums
  JourneyNodeType,
  NodeSourceType,
  EdgeRelationType,
  EdgeDirection,
  TransitionType,
  RoadStageType,

  // Traceability
  NodeSourceRecord,
  EdgeSourceRecord,
  AnalysisTrace,
  AnalysisTraceStage,

  // Request/Response
  PathfinderRequest,
  PathfinderResult,
  PathfinderCluster,
  PathfinderSummary,
  RoadViewRequest,
  RoadViewResult,
  RoadViewSummary,
} from "./types";

// ─── Constants ───────────────────────────────────────────────────
export {
  ROAD_STAGE_LABELS,
  ROAD_STAGE_COLORS,
  ROAD_STAGE_ORDER,
  INTENT_TO_STAGE,
  SUBINTENT_TO_STAGE,
} from "./types";

// ─── Services ────────────────────────────────────────────────────
export { analyzePathfinder, analyzeRoadView } from "./services/pathfinder-service";

// ─── Builders ────────────────────────────────────────────────────
export {
  buildEdge,
  convertFromIntentLinks,
  inferTransitionType,
  inferDirection,
  inferRelationType,
  calculateEdgeWeight,
} from "./builders/transition-builder";

export {
  inferStage,
  buildRoadStages,
} from "./builders/stage-inference";

// ─── Graph ───────────────────────────────────────────────────────
export { buildPathfinderFromIntentGraph } from "./graph/journey-graph-builder";
