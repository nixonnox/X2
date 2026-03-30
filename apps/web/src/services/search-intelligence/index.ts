/**
 * Search Intelligence — Public API
 *
 * 검색 데이터 어댑터 → 엔진 → 결과 저장 전체 파이프라인 진입점.
 *
 * 사용 예:
 * ```ts
 * import { runSearchIntelligence } from "@/services/search-intelligence";
 *
 * const result = await runSearchIntelligence({
 *   seedKeyword: "화장품 추천",
 *   engines: ["cluster", "persona", "pathfinder", "roadview"],
 * });
 *
 * // 개별 엔진 직접 호출
 * import { searchToPathfinder, resolveSearchData } from "@/services/search-intelligence";
 * const payload = await resolveSearchData("화장품 추천");
 * const pfResult = await searchToPathfinder(payload);
 * ```
 */

// ── Orchestrator ──
export { runSearchIntelligence } from "./searchIntelligenceOrchestrator";

// ── Individual Services ──
export { searchToPathfinder, type SearchToPathfinderOptions } from "./searchToPathfinderService";
export { searchToRoadView, type SearchToRoadViewOptions } from "./searchToRoadViewService";
export { searchToCluster, type SearchToClusterOptions } from "./searchToClusterService";
export { searchToPersona, type SearchToPersonaOptions } from "./searchToPersonaService";

// ── Input Builders ──
export {
  buildPathfinderInput,
  buildRoadViewInput,
  buildClusterInput,
  buildPersonaInput,
  type PathfinderInputBuildResult,
  type RoadViewInputBuildResult,
  type ClusterInputBuildResult,
  type PersonaInputBuildResult,
} from "./input-builders";

// ── Traceability ──
export { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";

// ── Repository ──
export {
  saveAnalysisResult,
  getAnalysisResult,
  listAnalysisResults,
  getLatestResult,
} from "./repositories/analysisResultRepository";

// ── Types ──
export type {
  SearchTraceMetadata,
  EngineExecutionResult,
  SearchIntelligenceRequest,
  SearchIntelligenceResult,
  PersistableAnalysisResult,
  AnalysisResultFilter,
} from "./types";
