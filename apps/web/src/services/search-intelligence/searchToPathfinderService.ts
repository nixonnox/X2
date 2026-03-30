/**
 * Search → Pathfinder Service
 *
 * NormalizedSearchAnalyticsPayload → Pathfinder Engine → 저장 가능한 결과
 *
 * 파이프라인:
 * 1. buildPathfinderInput()으로 PathfinderRequest 생성
 * 2. analyzePathfinder() 엔진 호출
 * 3. 결과에 traceability 메타데이터 첨부
 * 4. analysisResultRepository에 저장
 * 5. EngineExecutionResult<PathfinderResult> 반환
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { PathfinderResult } from "@/lib/journey-engine";
import { analyzePathfinder } from "@/lib/journey-engine";
import { buildPathfinderInput } from "./input-builders/buildPathfinderInput";
import { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";
import { saveAnalysisResult } from "./repositories/analysisResultRepository";
import type { EngineExecutionResult } from "./types";

export type SearchToPathfinderOptions = {
  maxSteps?: number;
  maxNodes?: number;
  direction?: "both" | "before" | "after";
  batchId?: string;
  /** 결과를 저장할지 여부 (기본: true) */
  persist?: boolean;
};

export async function searchToPathfinder(
  payload: NormalizedSearchAnalyticsPayload,
  options?: SearchToPathfinderOptions,
): Promise<EngineExecutionResult<PathfinderResult>> {
  const startTime = Date.now();
  const trace = buildTraceFromPayload(payload, {
    batchId: options?.batchId,
    engine: "pathfinder",
  });

  try {
    // 1. Input 빌드
    const { request, quality } = buildPathfinderInput(payload, {
      maxSteps: options?.maxSteps,
      maxNodes: options?.maxNodes,
      direction: options?.direction,
    });

    // low confidence 경고 전파
    if (quality.confidence < 0.3) {
      trace.lowConfidenceReasons.push(
        `Input confidence ${quality.confidence} — ${quality.warnings.join("; ")}`,
      );
    }
    trace.warnings.push(...quality.warnings);

    // 2. 엔진 호출
    const result = await analyzePathfinder(request);

    // 3. evidence refs 수집
    const evidenceRefs = [
      ...result.nodes.slice(0, 20).map((n) => `node:${n.id}`),
      ...result.paths.slice(0, 5).map((p) => `path:${p.steps[0]?.keyword ?? "unknown"}`),
    ];

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
        engine: "pathfinder",
        analyzedAt: finalTrace.analyzedAt,
        resultJson: result,
        traceJson: finalTrace,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      engine: "pathfinder",
      data: result,
      trace: finalTrace,
    };
  } catch (err) {
    const finalTrace = finalizeTrace(trace, {
      durationMs: Date.now() - startTime,
      additionalWarnings: [`Pathfinder 엔진 실패: ${(err as Error).message}`],
    });

    return {
      success: false,
      engine: "pathfinder",
      error: (err as Error).message,
      trace: finalTrace,
    };
  }
}
