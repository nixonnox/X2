/**
 * buildPersonaInput
 *
 * NormalizedSearchAnalyticsPayload → PersonaViewRequest 변환.
 *
 * Persona 엔진은 아래 입력을 활용한다:
 * - intent candidates → 의도 기반 archetype 추론
 * - question patterns → 정보 탐색 성향
 * - related keyword groups → 관심사 클러스터
 * - cluster hints → 클러스터 기반 persona 매핑
 * - stage hints → 여정 스테이지별 persona 연결
 * - dominant topics → 주요 관심 주제
 * - serp-derived need hints → 콘텐츠 니즈 파악
 *
 * 실제 개인 식별이 아닌 검색 행동 기반 archetype 생성.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { PersonaViewRequest, ClusterFinderResult } from "@/lib/persona-cluster-engine";

export type PersonaInputBuildResult = {
  request: PersonaViewRequest;
  quality: {
    totalRelatedKeywords: number;
    questionPatternCount: number;
    comparisonSignalCount: number;
    actionSignalCount: number;
    hasClusterHints: boolean;
    archetypeHintCount: number;
    confidence: number;
    warnings: string[];
  };
};

export function buildPersonaInput(
  payload: NormalizedSearchAnalyticsPayload,
  options?: {
    maxPersonas?: number;
    useLLM?: boolean;
  },
  /** Cluster 결과가 있으면 재사용 */
  existingClusters?: ClusterFinderResult,
): PersonaInputBuildResult {
  const warnings: string[] = [];

  // 행동 시그널 분석
  const questionKws = payload.relatedKeywords.filter(
    (kw) => kw.sourceType === "question" || kw.sourceType === "paa",
  );
  const paaQuestions = payload.serpDocuments.flatMap((doc) => doc.peopleAlsoAsk);
  const comparisonKws = payload.relatedKeywords.filter(
    (kw) => /vs|비교|차이|versus|대안|대체/.test(kw.keyword),
  );
  const actionKws = payload.relatedKeywords.filter(
    (kw) => /구매|주문|신청|가입|buy|order|subscribe/.test(kw.keyword),
  );
  const reviewKws = payload.relatedKeywords.filter(
    (kw) => /후기|리뷰|review|경험|사용기/.test(kw.keyword),
  );
  const priceKws = payload.relatedKeywords.filter(
    (kw) => /가격|비용|할인|저렴|무료|price|cheap|free/.test(kw.keyword),
  );

  // archetype 힌트 수 (다양한 persona가 나올 수 있는 지표)
  let archetypeHintCount = 0;
  if (questionKws.length > 0 || paaQuestions.length > 0) archetypeHintCount++; // information_seeker
  if (comparisonKws.length > 0) archetypeHintCount++; // price_comparator / analytical
  if (actionKws.length > 0) archetypeHintCount++;      // action_taker
  if (reviewKws.length > 0) archetypeHintCount++;       // review_validator
  if (priceKws.length > 0) archetypeHintCount++;        // price_comparator

  if (archetypeHintCount < 2) {
    warnings.push("행동 시그널이 부족합니다 — 다양한 persona 추론이 어렵습니다");
  }
  if (!existingClusters && payload.relatedKeywords.length < 15) {
    warnings.push("키워드 수 부족 — 클러스터 기반 persona 정확도가 낮을 수 있습니다");
  }

  // 신뢰도 계산
  let confidence = 0.15;
  if (payload.relatedKeywords.length >= 15) confidence += 0.15;
  if (archetypeHintCount >= 3) confidence += 0.2;
  if (questionKws.length + paaQuestions.length >= 5) confidence += 0.1;
  if (existingClusters) confidence += 0.2;
  if (options?.useLLM) confidence += 0.1;
  if (payload.serpDocuments.length > 0) confidence += 0.1;
  confidence = Math.min(1.0, confidence);

  const request: PersonaViewRequest = {
    seedKeyword: payload.seedKeyword,
    maxPersonas: options?.maxPersonas ?? Math.min(6, Math.max(2, archetypeHintCount + 1)),
    useLLM: options?.useLLM ?? false,
    existingClusters: existingClusters,
    // TODO: Phase 2 — payload에서 IntentGraphData를 직접 구성하여 전달
    // existingAnalysis: buildIntentGraphFromPayload(payload),
  };

  return {
    request,
    quality: {
      totalRelatedKeywords: payload.relatedKeywords.length,
      questionPatternCount: questionKws.length + paaQuestions.length,
      comparisonSignalCount: comparisonKws.length,
      actionSignalCount: actionKws.length,
      hasClusterHints: !!existingClusters,
      archetypeHintCount,
      confidence,
      warnings,
    },
  };
}
