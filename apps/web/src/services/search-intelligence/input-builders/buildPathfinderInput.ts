/**
 * buildPathfinderInput
 *
 * NormalizedSearchAnalyticsPayload → PathfinderRequest 변환.
 *
 * Pathfinder 엔진은 아래 입력을 활용한다:
 * - seed keyword (필수)
 * - related keywords → intent graph 노드 원본
 * - intent candidates → 의도 분류 힌트
 * - serp documents → 관계 강도 (SERP overlap)
 * - trend series → 트렌드/상승 키워드 식별
 * - query-like phrases → question 노드
 *
 * source-specific 포맷은 여기서 제거되고
 * engine이 이해하는 IntentGraphData 호환 구조로 변환된다.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { PathfinderRequest } from "@/lib/journey-engine";

export type PathfinderInputBuildResult = {
  request: PathfinderRequest;
  /** 빌더가 감지한 품질 정보 */
  quality: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionKeywords: boolean;
    confidence: number;
    warnings: string[];
  };
};

export function buildPathfinderInput(
  payload: NormalizedSearchAnalyticsPayload,
  options?: {
    maxSteps?: number;
    maxNodes?: number;
    direction?: "both" | "before" | "after";
  },
): PathfinderInputBuildResult {
  const warnings: string[] = [];

  // 품질 평가
  const questionKeywords = payload.relatedKeywords.filter(
    (kw) => kw.sourceType === "question" || kw.sourceType === "paa",
  );
  const hasSerpData = payload.serpDocuments.length > 0;
  const hasTrendData = payload.trendSeries.length > 0;

  if (payload.relatedKeywords.length < 5) {
    warnings.push("연관 키워드가 5개 미만 — 경로 다양성이 제한될 수 있습니다");
  }
  if (!hasSerpData) {
    warnings.push("SERP 데이터 없음 — 관계 강도가 추정치에 의존합니다");
  }
  if (!hasTrendData) {
    warnings.push("트렌드 데이터 없음 — 상승/하락 키워드 식별이 불가합니다");
  }

  // 신뢰도 계산
  let confidence = 0.3; // 기본: related keywords만 있으면 0.3
  if (payload.relatedKeywords.length >= 10) confidence += 0.2;
  if (payload.relatedKeywords.length >= 30) confidence += 0.1;
  if (hasSerpData) confidence += 0.2;
  if (hasTrendData) confidence += 0.1;
  if (questionKeywords.length >= 3) confidence += 0.1;
  confidence = Math.min(1.0, confidence);

  // PathfinderRequest 구성
  // 엔진은 existingAnalysis 또는 자체 intent-engine 호출 사용.
  // search payload 데이터를 활용하기 위해 existingAnalysis는 생략하고
  // 엔진이 내부에서 intent-engine을 호출하되,
  // 향후 IntentGraphData를 payload에서 직접 구성하는 패스 추가 예정.
  const request: PathfinderRequest = {
    seedKeyword: payload.seedKeyword,
    maxSteps: options?.maxSteps ?? 5,
    maxNodes: Math.min(
      options?.maxNodes ?? 200,
      // 연관 키워드 수 + 시드 기반으로 적절한 노드 수 계산
      Math.max(50, payload.relatedKeywords.length * 2),
    ),
    direction: options?.direction ?? "both",
    locale: payload.locale,
    // TODO: Phase 2 — payload에서 IntentGraphData를 직접 구성하여
    // existingAnalysis로 전달 (intent-engine 호출 스킵)
    // existingAnalysis: buildIntentGraphFromPayload(payload),
  };

  return {
    request,
    quality: {
      totalRelatedKeywords: payload.relatedKeywords.length,
      hasSerpData,
      hasTrendData,
      hasQuestionKeywords: questionKeywords.length > 0,
      confidence,
      warnings,
    },
  };
}
