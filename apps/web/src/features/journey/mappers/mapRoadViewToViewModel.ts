/**
 * RoadView Engine Output → ViewModel Mapper
 *
 * journey-engine의 RoadViewResult를 프론트엔드 view model로 변환한다.
 */

import type {
  RoadViewResult,
  RoadStage,
  BranchPoint,
} from "@/lib/journey-engine";
import {
  ROAD_STAGE_LABELS,
  ROAD_STAGE_COLORS,
} from "@/lib/journey-engine";
import { INTENT_CATEGORY_LABELS } from "@/lib/intent-engine";
import type {
  RoadStageViewModel,
  RoadViewSummaryViewModel,
  BranchPointViewModel,
  JourneyScreenState,
} from "../types/viewModel";
import { mapPathToViewModel } from "./mapPathfinderToViewModel";
import type { PathfinderPathViewModel } from "../types/viewModel";

// ─── 낮은 신뢰도 기준 ──────────────────────────────────────────
const LOW_GAP_THRESHOLD = 15;

// ═══════════════════════════════════════════════════════════════
// Stage Mapping
// ═══════════════════════════════════════════════════════════════

export function mapStageToViewModel(stage: RoadStage): RoadStageViewModel {
  const intentInfo = INTENT_CATEGORY_LABELS[stage.dominantIntent];

  return {
    id: stage.id,
    stageType: stage.stageType,
    label: stage.label,
    description: stage.description,
    order: stage.order,
    color: ROAD_STAGE_COLORS[stage.stageType] ?? "#6b7280",
    representativeKeywords: stage.representativeKeywords,
    dominantIntent: stage.dominantIntent,
    dominantIntentLabel: intentInfo?.label ?? stage.dominantIntent,
    majorQuestions: stage.majorQuestions,
    keywordCount: stage.keywordCount,
    avgSearchVolume: stage.avgSearchVolume,
    avgGapScore: stage.avgGapScore,
    nextTransition: stage.nextTransition
      ? {
          toStageLabel:
            ROAD_STAGE_LABELS[
              // 다음 스테이지 ID에서 stageType 추출
              stage.nextTransition.toStageId as keyof typeof ROAD_STAGE_LABELS
            ] ?? stage.nextTransition.toStageId,
          strength: stage.nextTransition.strength,
          reason: stage.nextTransition.reason,
          transitionKeywords: stage.nextTransition.transitionKeywords,
        }
      : undefined,
    lowConfidenceFlag: stage.avgGapScore < LOW_GAP_THRESHOLD && stage.keywordCount < 3,
  };
}

// ═══════════════════════════════════════════════════════════════
// Branch Point Mapping
// ═══════════════════════════════════════════════════════════════

export function mapBranchPointToViewModel(bp: BranchPoint): BranchPointViewModel {
  return {
    stepIndex: bp.stepIndex,
    keyword: bp.keyword,
    dropOffRate: bp.dropOffRate,
    alternatives: bp.alternatives.map((alt) => ({
      keyword: alt.keyword,
      weight: alt.weight,
      intentLabel:
        INTENT_CATEGORY_LABELS[alt.intent]?.label ?? alt.intent,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// Full Result Mapping
// ═══════════════════════════════════════════════════════════════

export function mapRoadViewResult(result: RoadViewResult): {
  stages: RoadStageViewModel[];
  primaryPath?: PathfinderPathViewModel;
  alternativePaths: PathfinderPathViewModel[];
  branchPoints: BranchPointViewModel[];
  summary: RoadViewSummaryViewModel;
  screenState: Partial<JourneyScreenState>;
} {
  const stages = result.stages.map(mapStageToViewModel);
  const primaryPath = result.primaryPath
    ? mapPathToViewModel(result.primaryPath)
    : undefined;
  const alternativePaths = (result.alternativePaths ?? []).map(mapPathToViewModel);
  const branchPoints = result.branchPoints.map(mapBranchPointToViewModel);

  const lowConfidenceItems = stages.filter((s) => s.lowConfidenceFlag).length;

  const summary: RoadViewSummaryViewModel = {
    seedKeyword: result.seedKeyword,
    endKeyword: result.endKeyword,
    totalStages: result.summary.totalStages,
    totalKeywords: result.summary.totalKeywords,
    avgGapScore: result.summary.avgGapScore,
    dominantJourney: result.summary.dominantJourney.map(
      (st) => ROAD_STAGE_LABELS[st] ?? st,
    ),
    topContentGaps: result.summary.topContentGaps.map((g) => ({
      stageLabel: ROAD_STAGE_LABELS[g.stage] ?? g.stage,
      keyword: g.keyword,
      gapScore: g.gapScore,
    })),
    topQuestions: result.summary.topQuestions,
  };

  return {
    stages,
    primaryPath,
    alternativePaths,
    branchPoints,
    summary,
    screenState: {
      isEmpty: stages.length === 0,
      lowConfidenceItems,
      lastUpdatedAt: result.summary.analyzedAt,
      durationMs: result.summary.durationMs,
    },
  };
}
