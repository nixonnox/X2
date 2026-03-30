/**
 * usePersonaClusterQuery
 *
 * persona / cluster 분석을 위한 통합 React hook.
 * API 호출 → view model 변환 → screen state 관리를 캡슐화한다.
 */

"use client";

import { useState, useCallback } from "react";
import type {
  PersonaViewModel,
  ClusterViewModel,
  ClusterSummaryViewModel,
  PersonaSummaryViewModel,
  PersonaClusterScreenState,
} from "../types/viewModel";
import {
  mapPersonaViewResult,
  mapClusterFinderResult,
  buildScreenState,
} from "../mappers/mapPersonaClusterToViewModel";
import type {
  PersonaViewResult,
  ClusterFinderResult,
} from "@/lib/persona-cluster-engine";

// ═══════════════════════════════════════════════════════════════
// Persona Query
// ═══════════════════════════════════════════════════════════════

export type UsePersonaQueryReturn = {
  personas: PersonaViewModel[];
  summary: PersonaSummaryViewModel | null;
  screenState: PersonaClusterScreenState;
  analyze: (seedKeyword: string, options?: { useLLM?: boolean }) => Promise<void>;
  reset: () => void;
};

export function usePersonaQuery(): UsePersonaQueryReturn {
  const [personas, setPersonas] = useState<PersonaViewModel[]>([]);
  const [summary, setSummary] = useState<PersonaSummaryViewModel | null>(null);
  const [screenState, setScreenState] = useState<PersonaClusterScreenState>(
    buildScreenState({}, "idle"),
  );

  const analyze = useCallback(async (seedKeyword: string, options?: { useLLM?: boolean }) => {
    setScreenState(buildScreenState({}, "loading"));
    setPersonas([]);
    setSummary(null);

    try {
      const res = await fetch("/api/persona/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword,
          maxPersonas: 6,
          useLLM: options?.useLLM ?? false,
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

      const result = json.data as PersonaViewResult;
      const mapped = mapPersonaViewResult(result);

      setPersonas(mapped.personas);
      setSummary(mapped.summary);
      setScreenState(
        buildScreenState(
          {
            ...mapped.screenState,
            sourceCount: result.trace.dataSources.length,
          },
          "success",
        ),
      );
    } catch (err) {
      setScreenState(
        buildScreenState({}, "error", (err as Error).message),
      );
    }
  }, []);

  const reset = useCallback(() => {
    setPersonas([]);
    setSummary(null);
    setScreenState(buildScreenState({}, "idle"));
  }, []);

  return { personas, summary, screenState, analyze, reset };
}

// ═══════════════════════════════════════════════════════════════
// Cluster Query
// ═══════════════════════════════════════════════════════════════

export type UseClusterQueryReturn = {
  clusters: ClusterViewModel[];
  summary: ClusterSummaryViewModel | null;
  screenState: PersonaClusterScreenState;
  analyze: (seedKeyword: string, options?: { useLLM?: boolean; maxClusters?: number }) => Promise<void>;
  reset: () => void;
};

export function useClusterQuery(): UseClusterQueryReturn {
  const [clusters, setClusters] = useState<ClusterViewModel[]>([]);
  const [summary, setSummary] = useState<ClusterSummaryViewModel | null>(null);
  const [screenState, setScreenState] = useState<PersonaClusterScreenState>(
    buildScreenState({}, "idle"),
  );

  const analyze = useCallback(async (
    seedKeyword: string,
    options?: { useLLM?: boolean; maxClusters?: number },
  ) => {
    setScreenState(buildScreenState({}, "loading"));
    setClusters([]);
    setSummary(null);

    try {
      const res = await fetch("/api/cluster/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedKeyword,
          maxClusters: options?.maxClusters ?? 20,
          includeQuestions: true,
          useLLM: options?.useLLM ?? false,
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

      const result = json.data as ClusterFinderResult;
      const mapped = mapClusterFinderResult(result);

      setClusters(mapped.clusters);
      setSummary(mapped.summary);
      setScreenState(
        buildScreenState(
          {
            ...mapped.screenState,
            sourceCount: result.trace.dataSources.length,
          },
          "success",
        ),
      );
    } catch (err) {
      setScreenState(
        buildScreenState({}, "error", (err as Error).message),
      );
    }
  }, []);

  const reset = useCallback(() => {
    setClusters([]);
    setSummary(null);
    setScreenState(buildScreenState({}, "idle"));
  }, []);

  return { clusters, summary, screenState, analyze, reset };
}
