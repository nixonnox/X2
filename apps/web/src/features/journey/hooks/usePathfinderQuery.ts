/**
 * usePathfinderQuery
 *
 * 패스파인더 분석을 위한 React hook.
 * API 호출 → view model 변환 → screen state 관리를 캡슐화한다.
 */

"use client";

import { useState, useCallback } from "react";
import type {
  PathfinderNodeViewModel,
  PathfinderEdgeViewModel,
  PathfinderPathViewModel,
  PathfinderSummaryViewModel,
  JourneyScreenState,
} from "../types/viewModel";
import {
  mapPathfinderResult,
  buildJourneyScreenState,
} from "../mappers/mapPathfinderToViewModel";
import type { PathfinderResult } from "@/lib/journey-engine";

export type UsePathfinderQueryReturn = {
  nodes: PathfinderNodeViewModel[];
  edges: PathfinderEdgeViewModel[];
  paths: PathfinderPathViewModel[];
  summary: PathfinderSummaryViewModel | null;
  screenState: JourneyScreenState;
  analyze: (
    seedKeyword: string,
    options?: { maxSteps?: number; maxNodes?: number; direction?: "both" | "before" | "after" },
  ) => Promise<void>;
  reset: () => void;
};

export function usePathfinderQuery(): UsePathfinderQueryReturn {
  const [nodes, setNodes] = useState<PathfinderNodeViewModel[]>([]);
  const [edges, setEdges] = useState<PathfinderEdgeViewModel[]>([]);
  const [paths, setPaths] = useState<PathfinderPathViewModel[]>([]);
  const [summary, setSummary] = useState<PathfinderSummaryViewModel | null>(null);
  const [screenState, setScreenState] = useState<JourneyScreenState>(
    buildJourneyScreenState({}, "idle"),
  );

  const analyze = useCallback(
    async (
      seedKeyword: string,
      options?: { maxSteps?: number; maxNodes?: number; direction?: "both" | "before" | "after" },
    ) => {
      setScreenState(buildJourneyScreenState({}, "loading"));
      setNodes([]);
      setEdges([]);
      setPaths([]);
      setSummary(null);

      try {
        const res = await fetch("/api/pathfinder/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword,
            maxSteps: options?.maxSteps ?? 5,
            maxNodes: options?.maxNodes ?? 300,
            direction: options?.direction ?? "both",
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

        const result = json.data as PathfinderResult;
        const mapped = mapPathfinderResult(result);

        setNodes(mapped.nodes);
        setEdges(mapped.edges);
        setPaths(mapped.paths);
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
    setNodes([]);
    setEdges([]);
    setPaths([]);
    setSummary(null);
    setScreenState(buildJourneyScreenState({}, "idle"));
  }, []);

  return { nodes, edges, paths, summary, screenState, analyze, reset };
}
