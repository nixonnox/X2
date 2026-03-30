/**
 * Transition Builder
 *
 * 키워드 간의 전환 관계를 분석하여 JourneyEdge를 생성한다.
 * 기존 intent-engine의 graph-builder.ts 링크 생성 로직을 확장하여
 * 방향성(direction)과 전환유형(transitionType)을 추론한다.
 */

import type {
  JourneyNode,
  JourneyEdge,
  EdgeRelationType,
  EdgeDirection,
  TransitionType,
  IntentCategory,
} from "../types";

// ─── 전환 유형 추론 규칙 ─────────────────────────────────────────

/**
 * 두 노드 사이의 전환 유형을 추론한다.
 *
 * 규칙:
 * - 같은 의도, depth 증가 → deepening
 * - 다른 의도, discovery→comparison → comparison
 * - 다른 의도, *→action → action
 * - depth 감소 → broadening
 * - 완전히 다른 토픽 → pivot
 * - 같은 의도, 비슷한 depth → refinement
 */
export function inferTransitionType(
  from: JourneyNode,
  to: JourneyNode,
): TransitionType {
  const sameIntent = from.intent === to.intent;
  const depthDelta = to.depth - from.depth;

  // 의도 전환 패턴
  if (!sameIntent) {
    if (to.intent === "action") return "action";
    if (to.intent === "comparison") return "comparison";
    if (from.intent === "discovery" && to.intent === "troubleshooting")
      return "pivot";
    return "pivot";
  }

  // 같은 의도 내 전환
  if (depthDelta > 0) return "deepening";
  if (depthDelta < 0) return "broadening";
  return "refinement";
}

/**
 * 엣지의 방향성을 추론한다.
 *
 * before → seed: forward
 * seed → after: forward
 * 같은 phase 내: bidirectional (연관 검색어는 양방향)
 * source가 autocomplete → forward (검색 정제)
 */
export function inferDirection(
  from: JourneyNode,
  to: JourneyNode,
  sourceType: string,
): EdgeDirection {
  // before → seed → after 는 항상 forward
  if (
    from.direction === "before" &&
    (to.direction === "seed" || to.direction === "after")
  ) {
    return "forward";
  }
  if (from.direction === "seed" && to.direction === "after") {
    return "forward";
  }

  // 자동완성은 단방향 (검색어 정제)
  if (
    sourceType === "google_autocomplete" ||
    sourceType === "naver_autocomplete"
  ) {
    return "forward";
  }

  // 연관 검색어는 양방향
  if (sourceType === "google_related" || sourceType === "naver_related") {
    return "bidirectional";
  }

  // 기본: 양방향
  return "bidirectional";
}

/**
 * source type에서 relation type 추론
 */
export function inferRelationType(
  from: JourneyNode,
  to: JourneyNode,
  sourceType: string,
): EdgeRelationType {
  // source type 기반
  if (
    sourceType === "google_autocomplete" ||
    sourceType === "naver_autocomplete"
  ) {
    return "search_refinement";
  }
  if (sourceType === "google_related" || sourceType === "naver_related") {
    return "search_continuation";
  }
  if (sourceType === "google_paa") {
    return "topic_exploration";
  }
  if (sourceType === "serp_suggestion") {
    return "serp_overlap";
  }

  // 의도 기반
  if (to.intent === "comparison" || to.subIntent === "versus") {
    return "brand_comparison";
  }
  if (
    from.intent === "troubleshooting" ||
    to.intent === "troubleshooting"
  ) {
    return "problem_solution";
  }
  if (to.intent === "action") {
    return "purchase_journey";
  }

  // 시간적 전환
  if (from.temporalPhase !== to.temporalPhase) {
    return "temporal_transition";
  }

  return "semantic";
}

// ─── 엣지 강도 계산 ──────────────────────────────────────────────

/**
 * 엣지의 강도를 계산한다.
 *
 * 기존 graph-builder.ts의 strength 계산을 확장:
 * - 기본 0.3
 * - 같은 의도: +0.2
 * - 같은 phase: +0.15
 * - 볼륨 비율: +0.15
 * - 같은 클러스터: +0.1
 * - 방향 일치: +0.1
 */
export function calculateEdgeWeight(
  from: JourneyNode,
  to: JourneyNode,
): number {
  let weight = 0.3;

  // 의도 일치
  if (from.intent === to.intent) weight += 0.2;

  // 시간적 위상 일치
  if (from.temporalPhase === to.temporalPhase) weight += 0.15;

  // 검색량 비율 (비슷할수록 높음)
  const volumeRatio =
    Math.min(from.searchVolume, to.searchVolume) /
    Math.max(from.searchVolume, to.searchVolume, 1);
  weight += volumeRatio * 0.15;

  // 같은 클러스터
  if (from.clusterId && from.clusterId === to.clusterId) weight += 0.1;

  // 방향 순서 (before→seed→after 순서 맞으면 가산)
  const dirOrder = { before: 0, seed: 1, after: 2 };
  if (dirOrder[from.direction] < dirOrder[to.direction]) weight += 0.1;

  return Math.min(1.0, Math.round(weight * 1000) / 1000);
}

// ─── 메인 빌더 ───────────────────────────────────────────────────

let edgeCounter = 0;

/**
 * 두 노드 사이의 JourneyEdge를 생성한다.
 */
export function buildEdge(
  from: JourneyNode,
  to: JourneyNode,
  sourceType: string,
  confidence: number = 0.7,
): JourneyEdge {
  edgeCounter++;
  return {
    id: `edge-${edgeCounter}`,
    fromNodeId: from.id,
    toNodeId: to.id,
    relationType: inferRelationType(from, to, sourceType),
    direction: inferDirection(from, to, sourceType),
    transitionType: inferTransitionType(from, to),
    weight: calculateEdgeWeight(from, to),
    confidence,
    evidenceCount: 1,
    source: {
      type: sourceType as JourneyEdge["source"]["type"],
      confidence,
      collectedAt: new Date().toISOString(),
    },
  };
}

/**
 * 기존 IntentGraphLink 배열에서 JourneyEdge 배열로 변환한다.
 * (기존 intent-engine 결과를 journey-engine으로 마이그레이션할 때 사용)
 */
export function convertFromIntentLinks(
  links: { source: string; target: string; relationshipType: string; strength: number }[],
  nodeMap: Map<string, JourneyNode>,
): JourneyEdge[] {
  const edges: JourneyEdge[] = [];

  for (const link of links) {
    const from = nodeMap.get(link.source);
    const to = nodeMap.get(link.target);
    if (!from || !to) continue;

    // 기존 relationshipType → 새 sourceType 매핑
    const sourceTypeMap: Record<string, string> = {
      autocomplete: "google_autocomplete",
      related: "google_related",
      question: "google_paa",
      temporal: "intent_classifier",
      semantic: "intent_classifier",
      co_search: "google_related",
      cluster: "cluster_engine",
      derived: "intent_classifier",
    };

    const sourceType = sourceTypeMap[link.relationshipType] || "intent_classifier";

    const edge = buildEdge(from, to, sourceType, link.strength);
    edge.weight = link.strength; // 기존 강도 보존
    edges.push(edge);
  }

  return edges;
}

/**
 * edgeCounter 리셋 (테스트용)
 */
export function resetEdgeCounter(): void {
  edgeCounter = 0;
}
