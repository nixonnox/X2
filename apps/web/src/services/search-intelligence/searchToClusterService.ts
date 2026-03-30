/**
 * Search → Cluster Service
 *
 * NormalizedSearchAnalyticsPayload → Cluster Engine → 저장 가능한 결과
 *
 * 파이프라인:
 * 1. buildClusterInput()으로 ClusterFinderRequest 생성
 * 2. analyzeClusterFinder() 엔진 호출
 * 3. 결과에 traceability 메타데이터 첨부
 * 4. analysisResultRepository에 저장
 * 5. EngineExecutionResult<ClusterFinderResult> 반환
 *
 * 단순 키워드 묶음이 아니라
 * 의미 있는 query / need / intent 단위 클러스터 생성.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { ClusterFinderResult } from "@/lib/persona-cluster-engine";
import { analyzeClusterFinder } from "@/lib/persona-cluster-engine";
import { buildClusterInput } from "./input-builders/buildClusterInput";
import { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";
import { saveAnalysisResult } from "./repositories/analysisResultRepository";
import type { EngineExecutionResult } from "./types";

export type SearchToClusterOptions = {
  maxClusters?: number;
  minClusterSize?: number;
  clusterMethod?: "intent_phase" | "semantic" | "question" | "behavior" | "hybrid";
  includeQuestions?: boolean;
  useLLM?: boolean;
  batchId?: string;
  persist?: boolean;
};

export async function searchToCluster(
  payload: NormalizedSearchAnalyticsPayload,
  options?: SearchToClusterOptions,
): Promise<EngineExecutionResult<ClusterFinderResult>> {
  const startTime = Date.now();
  const trace = buildTraceFromPayload(payload, {
    batchId: options?.batchId,
    engine: "cluster",
  });

  try {
    // 1. Input 빌드
    const { request, quality } = buildClusterInput(payload, {
      maxClusters: options?.maxClusters,
      minClusterSize: options?.minClusterSize,
      clusterMethod: options?.clusterMethod,
      includeQuestions: options?.includeQuestions,
      useLLM: options?.useLLM,
    });

    if (quality.confidence < 0.3) {
      trace.lowConfidenceReasons.push(
        `Input confidence ${quality.confidence} — ${quality.warnings.join("; ")}`,
      );
    }
    trace.warnings.push(...quality.warnings);

    // 2. 엔진 호출
    const result = await analyzeClusterFinder(request);

    // 3. evidence refs 수집
    const evidenceRefs = result.clusters
      .slice(0, 10)
      .map((c) => `cluster:${c.id}:${c.label}`);

    // 4. trace 완료
    const finalTrace = finalizeTrace(trace, {
      durationMs: Date.now() - startTime,
      evidenceRefs,
    });

    // 5. 저장
    if (options?.persist !== false) {
      await saveAnalysisResult({
        id: finalTrace.analysisId,
        seedKeyword: payload.seedKeyword,
        engine: "cluster",
        analyzedAt: finalTrace.analyzedAt,
        resultJson: result,
        traceJson: finalTrace,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      engine: "cluster",
      data: result,
      trace: finalTrace,
    };
  } catch (err) {
    const finalTrace = finalizeTrace(trace, {
      durationMs: Date.now() - startTime,
      additionalWarnings: [`Cluster 엔진 실패: ${(err as Error).message}`],
    });

    return {
      success: false,
      engine: "cluster",
      error: (err as Error).message,
      trace: finalTrace,
    };
  }
}
