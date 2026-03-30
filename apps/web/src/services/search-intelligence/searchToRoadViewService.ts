/**
 * Search → RoadView Service
 *
 * NormalizedSearchAnalyticsPayload → RoadView Engine → 저장 가능한 결과
 *
 * 파이프라인:
 * 1. buildRoadViewInput()으로 RoadViewRequest 생성
 * 2. analyzeRoadView() 엔진 호출
 * 3. 결과에 traceability 메타데이터 첨부
 * 4. analysisResultRepository에 저장
 * 5. EngineExecutionResult<RoadViewResult> 반환
 *
 * Pathfinder보다 stage-oriented:
 * 검색 흐름을 인지→관심→비교→결정→실행→옹호 6단계로 분류.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { RoadViewResult } from "@/lib/journey-engine";
import { analyzeRoadView } from "@/lib/journey-engine";
import { buildRoadViewInput } from "./input-builders/buildRoadViewInput";
import { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";
import { saveAnalysisResult } from "./repositories/analysisResultRepository";
import type { EngineExecutionResult } from "./types";

export type SearchToRoadViewOptions = {
  endKeyword?: string;
  batchId?: string;
  persist?: boolean;
};

export async function searchToRoadView(
  payload: NormalizedSearchAnalyticsPayload,
  options?: SearchToRoadViewOptions,
): Promise<EngineExecutionResult<RoadViewResult>> {
  const startTime = Date.now();
  const trace = buildTraceFromPayload(payload, {
    batchId: options?.batchId,
    engine: "roadview",
  });

  try {
    // 1. Input 빌드
    const { request, quality } = buildRoadViewInput(payload, {
      endKeyword: options?.endKeyword,
    });

    if (quality.confidence < 0.3) {
      trace.lowConfidenceReasons.push(
        `Input confidence ${quality.confidence} — ${quality.warnings.join("; ")}`,
      );
    }
    trace.warnings.push(...quality.warnings);

    // 2. 엔진 호출
    const result = await analyzeRoadView(request);

    // 3. evidence refs 수집
    const evidenceRefs = [
      ...result.stages.map((s) => `stage:${s.stageType}`),
      ...(result.primaryPath?.steps.slice(0, 5).map((s) => `pathstep:${s.keyword}`) ?? []),
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
        engine: "roadview",
        analyzedAt: finalTrace.analyzedAt,
        resultJson: result,
        traceJson: finalTrace,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      engine: "roadview",
      data: result,
      trace: finalTrace,
    };
  } catch (err) {
    const finalTrace = finalizeTrace(trace, {
      durationMs: Date.now() - startTime,
      additionalWarnings: [`RoadView 엔진 실패: ${(err as Error).message}`],
    });

    return {
      success: false,
      engine: "roadview",
      error: (err as Error).message,
      trace: finalTrace,
    };
  }
}
