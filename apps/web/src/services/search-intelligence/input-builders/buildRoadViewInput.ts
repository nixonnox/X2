/**
 * buildRoadViewInput
 *
 * NormalizedSearchAnalyticsPayload → RoadViewRequest 변환.
 *
 * RoadView 엔진은 아래 입력을 활용한다:
 * - seed keyword + optional end keyword (필수)
 * - intent candidates → 스테이지 추론 힌트
 * - query family → 각 스테이지의 대표 키워드
 * - cluster hints → 클러스터 기반 스테이지 그룹핑
 * - trend changes → 트렌드 변화에 따른 스테이지 전환
 * - stage hints → 질문/비교/행동 패턴으로 스테이지 추론
 * - repeated question patterns → 주요 질문 추출
 *
 * Pathfinder보다 stage-oriented 구조에 집중.
 * 관심→비교→검토→실행 등 6단계로 검색 흐름을 분류.
 */

import type { NormalizedSearchAnalyticsPayload } from "@/lib/search-data/types";
import type { RoadViewRequest } from "@/lib/journey-engine";
import type { PathfinderInputBuildResult } from "./buildPathfinderInput";

export type RoadViewInputBuildResult = {
  request: RoadViewRequest;
  quality: {
    totalRelatedKeywords: number;
    hasSerpData: boolean;
    hasTrendData: boolean;
    hasQuestionKeywords: boolean;
    hasEndKeyword: boolean;
    stageHintCount: number;
    confidence: number;
    warnings: string[];
  };
};

export function buildRoadViewInput(
  payload: NormalizedSearchAnalyticsPayload,
  options?: {
    endKeyword?: string;
  },
  /** Pathfinder 결과가 있으면 재사용 */
  _existingPathfinderBuild?: PathfinderInputBuildResult,
): RoadViewInputBuildResult {
  const warnings: string[] = [];

  // 스테이지 힌트 감지
  // 질문형 → awareness/interest, 비교형 → comparison, 행동형 → decision/action
  const questionKws = payload.relatedKeywords.filter(
    (kw) => kw.sourceType === "question" || kw.sourceType === "paa",
  );
  const comparisonKws = payload.relatedKeywords.filter(
    (kw) => /vs|비교|차이|versus|대안|대체/.test(kw.keyword),
  );
  const actionKws = payload.relatedKeywords.filter(
    (kw) => /구매|주문|신청|가입|buy|order|subscribe|후기|리뷰/.test(kw.keyword),
  );
  const stageHintCount = Math.min(
    6,
    (questionKws.length > 0 ? 2 : 0) +
    (comparisonKws.length > 0 ? 2 : 0) +
    (actionKws.length > 0 ? 2 : 0),
  );

  const hasSerpData = payload.serpDocuments.length > 0;
  const hasTrendData = payload.trendSeries.length > 0;

  if (stageHintCount < 2) {
    warnings.push("스테이지 힌트가 부족합니다 — 질문/비교/행동 키워드가 적습니다");
  }
  if (!hasSerpData) {
    warnings.push("SERP 데이터 없음 — 스테이지 전환 강도가 추정치에 의존합니다");
  }

  // 신뢰도 계산 (RoadView는 스테이지 다양성이 핵심)
  let confidence = 0.2;
  if (payload.relatedKeywords.length >= 10) confidence += 0.15;
  if (stageHintCount >= 4) confidence += 0.2;
  if (hasSerpData) confidence += 0.15;
  if (hasTrendData) confidence += 0.1;
  if (questionKws.length >= 5) confidence += 0.1;
  if (options?.endKeyword) confidence += 0.1;
  confidence = Math.min(1.0, confidence);

  const request: RoadViewRequest = {
    seedKeyword: payload.seedKeyword,
    endKeyword: options?.endKeyword,
    locale: payload.locale,
    // TODO: Phase 2 — pathfinder 결과를 재사용
    // existingPathfinder: pathfinderResult,
  };

  return {
    request,
    quality: {
      totalRelatedKeywords: payload.relatedKeywords.length,
      hasSerpData,
      hasTrendData,
      hasQuestionKeywords: questionKws.length > 0,
      hasEndKeyword: !!options?.endKeyword,
      stageHintCount,
      confidence,
      warnings,
    },
  };
}
