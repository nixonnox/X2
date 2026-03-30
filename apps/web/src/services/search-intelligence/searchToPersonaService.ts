/**
 * Search → Persona Service
 *
 * NormalizedSearchAnalyticsPayload → Persona Engine → 저장 가능한 결과
 *
 * 파이프라인:
 * 1. (선택) Cluster 결과 수신 또는 생성
 * 2. buildPersonaInput()으로 PersonaViewRequest 생성
 * 3. analyzePersonaView() 엔진 호출
 * 4. 결과에 traceability 메타데이터 첨부
 * 5. analysisResultRepository에 저장
 * 6. EngineExecutionResult<PersonaViewResult> 반환
 *
 * 검색 행동 기반 archetype 생성 (실제 개인 식별 아님).
 * Cluster 결과가 있으면 재사용하여 persona 정확도 향상.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { PersonaViewResult, ClusterFinderResult } from "@/lib/persona-cluster-engine";
import { analyzePersonaView } from "@/lib/persona-cluster-engine";
import { buildPersonaInput } from "./input-builders/buildPersonaInput";
import { buildTraceFromPayload, finalizeTrace } from "./traceBuilder";
import { saveAnalysisResult } from "./repositories/analysisResultRepository";
import type { EngineExecutionResult } from "./types";

export type SearchToPersonaOptions = {
  maxPersonas?: number;
  useLLM?: boolean;
  batchId?: string;
  persist?: boolean;
  /** 이미 실행된 Cluster 결과 (재사용) */
  existingClusters?: ClusterFinderResult;
};

export async function searchToPersona(
  payload: NormalizedSearchAnalyticsPayload,
  options?: SearchToPersonaOptions,
): Promise<EngineExecutionResult<PersonaViewResult>> {
  const startTime = Date.now();
  const trace = buildTraceFromPayload(payload, {
    batchId: options?.batchId,
    engine: "persona",
  });

  try {
    // 1. Input 빌드
    const { request, quality } = buildPersonaInput(
      payload,
      {
        maxPersonas: options?.maxPersonas,
        useLLM: options?.useLLM,
      },
      options?.existingClusters,
    );

    if (quality.confidence < 0.3) {
      trace.lowConfidenceReasons.push(
        `Input confidence ${quality.confidence} — ${quality.warnings.join("; ")}`,
      );
    }
    trace.warnings.push(...quality.warnings);

    if (options?.existingClusters) {
      trace.evidenceRefs.push(
        `reused:cluster_result:${options.existingClusters.clusters.length}_clusters`,
      );
    }

    // 2. 엔진 호출
    const result = await analyzePersonaView(request);

    // 3. evidence refs 수집
    const evidenceRefs = result.personas
      .slice(0, 8)
      .map((p) => `persona:${p.id}:${p.archetype}`);

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
        engine: "persona",
        analyzedAt: finalTrace.analyzedAt,
        resultJson: result,
        traceJson: finalTrace,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return {
      success: true,
      engine: "persona",
      data: result,
      trace: finalTrace,
    };
  } catch (err) {
    const finalTrace = finalizeTrace(trace, {
      durationMs: Date.now() - startTime,
      additionalWarnings: [`Persona 엔진 실패: ${(err as Error).message}`],
    });

    return {
      success: false,
      engine: "persona",
      error: (err as Error).message,
      trace: finalTrace,
    };
  }
}
