/**
 * buildClusterInput
 *
 * NormalizedSearchAnalyticsPayload → ClusterFinderRequest 변환.
 *
 * Cluster 엔진은 아래 입력을 활용한다:
 * - related keywords → 클러스터 멤버 후보
 * - query-like phrases → question 그룹 별도 클러스터
 * - serp snippets/titles → 의미적 유사도 (SERP Jaccard)
 * - intent candidates → 의도 기반 그룹핑 힌트
 * - trend keyword groups → 상승/계절 키워드 그룹
 *
 * 단순 키워드 묶음이 아니라
 * 의미 있는 query / need / intent 단위 클러스터를 생성.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { ClusterFinderRequest } from "@/lib/persona-cluster-engine";

export type ClusterInputBuildResult = {
  request: ClusterFinderRequest;
  quality: {
    totalRelatedKeywords: number;
    uniqueSourceTypes: number;
    hasSerpOverlap: boolean;
    hasQuestionKeywords: boolean;
    estimatedClusterCount: number;
    confidence: number;
    warnings: string[];
  };
};

export function buildClusterInput(
  payload: NormalizedSearchAnalyticsPayload,
  options?: {
    maxClusters?: number;
    minClusterSize?: number;
    clusterMethod?: "intent_phase" | "semantic" | "question" | "behavior" | "hybrid";
    includeQuestions?: boolean;
    useLLM?: boolean;
  },
): ClusterInputBuildResult {
  const warnings: string[] = [];

  const questionKws = payload.relatedKeywords.filter(
    (kw) => kw.sourceType === "question" || kw.sourceType === "paa",
  );
  const uniqueSourceTypes = new Set(payload.relatedKeywords.map((kw) => kw.sourceType)).size;
  const hasSerpOverlap = payload.serpDocuments.length > 0;

  // 예상 클러스터 수 추정 (키워드 수 / 최소 클러스터 크기)
  const minSize = options?.minClusterSize ?? 3;
  const estimatedClusterCount = Math.min(
    options?.maxClusters ?? 20,
    Math.max(2, Math.floor(payload.relatedKeywords.length / minSize)),
  );

  if (payload.relatedKeywords.length < 10) {
    warnings.push("연관 키워드 10개 미만 — 의미 있는 클러스터 수가 제한됩니다");
  }
  if (!hasSerpOverlap) {
    warnings.push("SERP 데이터 없음 — Jaccard 유사도 대신 의도 기반 클러스터링에 의존합니다");
  }
  if (uniqueSourceTypes < 2) {
    warnings.push("단일 소스 유형 — 다양한 소스의 키워드가 품질을 향상시킵니다");
  }

  // 신뢰도 계산
  let confidence = 0.2;
  if (payload.relatedKeywords.length >= 15) confidence += 0.2;
  if (payload.relatedKeywords.length >= 40) confidence += 0.1;
  if (hasSerpOverlap) confidence += 0.2;
  if (uniqueSourceTypes >= 3) confidence += 0.1;
  if (questionKws.length >= 3) confidence += 0.1;
  if (options?.useLLM) confidence += 0.1;
  confidence = Math.min(1.0, confidence);

  const request: ClusterFinderRequest = {
    seedKeyword: payload.seedKeyword,
    maxClusters: options?.maxClusters ?? Math.min(20, estimatedClusterCount + 5),
    minClusterSize: minSize,
    clusterMethod: options?.clusterMethod ?? "hybrid",
    includeQuestions: options?.includeQuestions ?? (questionKws.length >= 3),
    useLLM: options?.useLLM ?? false,
    // TODO: Phase 2 — payload에서 IntentGraphData를 직접 구성하여 전달
    // existingAnalysis: buildIntentGraphFromPayload(payload),
  };

  return {
    request,
    quality: {
      totalRelatedKeywords: payload.relatedKeywords.length,
      uniqueSourceTypes,
      hasSerpOverlap,
      hasQuestionKeywords: questionKws.length > 0,
      estimatedClusterCount,
      confidence,
      warnings,
    },
  };
}
