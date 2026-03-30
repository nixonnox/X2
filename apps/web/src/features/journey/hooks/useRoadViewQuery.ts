/**
 * useRoadViewQuery
 *
 * 로드뷰 분석을 위한 React hook.
 * API 호출 → view model 변환 → screen state 관리를 캡슐화한다.
 */

"use client";

import { useState, useCallback } from "react";
import type {
  RoadStageViewModel,
  RoadViewSummaryViewModel,
  BranchPointViewModel,
  JourneyScreenState,
  PathfinderPathViewModel,
} from "../types/viewModel";
import { mapRoadViewResult } from "../mappers/mapRoadViewToViewModel";
import { buildJourneyScreenState } from "../mappers/mapPathfinderToViewModel";
import type { RoadViewResult } from "@/lib/journey-engine";

export type UseRoadViewQueryReturn = {
  stages: RoadStageViewModel[];
  primaryPath: PathfinderPathViewModel | undefined;
  alternativePaths: PathfinderPathViewModel[];
  branchPoints: BranchPointViewModel[];
  summary: RoadViewSummaryViewModel | null;
  screenState: JourneyScreenState;
  analyze: (
    seedKeyword: string,
    options?: { endKeyword?: string },
  ) => Promise<void>;
  reset: () => void;
};

export function useRoadViewQuery(): UseRoadViewQueryReturn {
  const [stages, setStages] = useState<RoadStageViewModel[]>([]);
  const [primaryPath, setPrimaryPath] = useState<PathfinderPathViewModel | undefined>();
  const [alternativePaths, setAlternativePaths] = useState<PathfinderPathViewModel[]>([]);
  const [branchPoints, setBranchPoints] = useState<BranchPointViewModel[]>([]);
  const [summary, setSummary] = useState<RoadViewSummaryViewModel | null>(null);
  const [screenState, setScreenState] = useState<JourneyScreenState>(
    buildJourneyScreenState({}, "idle"),
  );

  const analyze = useCallback(
    async (
      seedKeyword: string,
      options?: { endKeyword?: string },
    ) => {
      setScreenState(buildJourneyScreenState({}, "loading"));
      setStages([]);
      setPrimaryPath(undefined);
      setAlternativePaths([]);
      setBranchPoints([]);
      setSummary(null);

      try {
        const res = await fetch("/api/roadview/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword,
            endKeyword: options?.endKeyword,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error ?? `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error ?? "분석 결과가 없습니다.");
        }

        const result = json.data as RoadViewResult;
        const mapped = mapRoadViewResult(result);

        setStages(mapped.stages);
        setPrimaryPath(mapped.primaryPath);
        setAlternativePaths(mapped.alternativePaths);
        setBranchPoints(mapped.branchPoints);
        setSummary(mapped.summary);
        setScreenState(
          buildJourneyScreenState(
            {
              ...mapped.screenState,
              sourceCount: result.trace.dataSources.length,
            },
            "success",
          ),
        );
      } catch (err) {
        setScreenState(
          buildJourneyScreenState({}, "error", (err as Error).message),
        );
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStages([]);
    setPrimaryPath(undefined);
    setAlternativePaths([]);
    setBranchPoints([]);
    setSummary(null);
    setScreenState(buildJourneyScreenState({}, "idle"));
  }, []);

  return { stages, primaryPath, alternativePaths, branchPoints, summary, screenState, analyze, reset };
}
