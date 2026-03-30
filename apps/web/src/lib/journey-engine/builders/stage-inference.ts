/**
 * Stage Inference Service
 *
 * 키워드의 의도/서브인텐트/시간적 위상으로부터
 * 로드뷰 스테이지(awareness → interest → comparison → decision → action → advocacy)를
 * 추론한다.
 *
 * 기존 intent-engine의 journey extraction을 확장하여
 * 6단계 소비자 결정 여정 모델을 적용한다.
 */

import type {
  JourneyNode,
  JourneyEdge,
  RoadStage,
  RoadStageType,
  StageTransition,
  IntentCategory,
} from "../types";

import {
  ROAD_STAGE_LABELS,
  ROAD_STAGE_ORDER,
  INTENT_TO_STAGE,
  SUBINTENT_TO_STAGE,
} from "../types";

// ─── 개별 키워드 → 스테이지 추론 ─────────────────────────────────

/**
 * 단일 키워드의 스테이지를 추론한다.
 *
 * 우선순위:
 * 1. subIntent 기반 (가장 정밀)
 * 2. intent + temporalPhase 조합
 * 3. 키워드 패턴 매칭 (한국어 접미사)
 * 4. intent 기본 매핑
 */
export function inferStage(node: JourneyNode): RoadStageType {
  // 1. subIntent 기반
  if (node.subIntent && SUBINTENT_TO_STAGE[node.subIntent]) {
    return SUBINTENT_TO_STAGE[node.subIntent]!;
  }

  // 2. intent + temporalPhase 조합
  const stageByCombo = inferByIntentPhase(node.intent, node.temporalPhase);
  if (stageByCombo) return stageByCombo;

  // 3. 키워드 패턴 매칭
  const stageByPattern = inferByKeywordPattern(node.label);
  if (stageByPattern) return stageByPattern;

  // 4. 기본 매핑
  return INTENT_TO_STAGE[node.intent] || "interest";
}

function inferByIntentPhase(
  intent: IntentCategory,
  phase: string,
): RoadStageType | null {
  // before 단계는 보통 인지/관심
  if (phase === "before") {
    if (intent === "discovery") return "awareness";
    if (intent === "comparison") return "interest";
    return "awareness";
  }

  // after 단계는 보통 실행/옹호
  if (phase === "after") {
    if (intent === "action") return "action";
    if (intent === "troubleshooting") return "advocacy";
    return "advocacy";
  }

  return null;
}

/** 한국어 키워드 패턴으로 스테이지 추론 */
const KEYWORD_STAGE_PATTERNS: [RegExp, RoadStageType][] = [
  // awareness
  [/(?:이란|뜻|의미|정의|개념|what is)/i, "awareness"],
  [/(?:종류|유형|분류|카테고리)/i, "awareness"],
  // interest
  [/(?:추천|방법|하는 법|how to|팁|노하우)/i, "interest"],
  [/(?:장점|단점|특징|효과|효능)/i, "interest"],
  // comparison
  [/(?:vs|비교|차이|versus|대안|대체)/i, "comparison"],
  [/(?:순위|랭킹|top|베스트|best)/i, "comparison"],
  [/(?:리뷰|후기|평가|사용기)/i, "comparison"],
  // decision
  [/(?:가격|비용|요금|할인|쿠폰|price)/i, "decision"],
  [/(?:선택|고르는|고르기|선택법)/i, "decision"],
  // action
  [/(?:구매|주문|신청|가입|등록|buy|order)/i, "action"],
  [/(?:다운로드|설치|시작)/i, "action"],
  // advocacy
  [/(?:후기|경험|결과|성공|실패|부작용)/i, "advocacy"],
  [/(?:환불|반품|취소|해지|탈퇴)/i, "advocacy"],
  [/(?:에러|오류|문제|해결|fix)/i, "advocacy"],
];

function inferByKeywordPattern(keyword: string): RoadStageType | null {
  for (const [pattern, stage] of KEYWORD_STAGE_PATTERNS) {
    if (pattern.test(keyword)) return stage;
  }
  return null;
}

// ─── 노드 그룹 → RoadStage 빌드 ─────────────────────────────────

let stageCounter = 0;

/**
 * JourneyNode 배열에서 RoadStage 배열을 생성한다.
 *
 * 1. 각 노드에 스테이지를 추론
 * 2. 스테이지별로 노드를 그룹핑
 * 3. 각 그룹에서 대표 키워드, dominant intent, 질문 추출
 * 4. 스테이지 간 전환 정보 생성
 */
export function buildRoadStages(
  nodes: JourneyNode[],
  edges: JourneyEdge[],
): RoadStage[] {
  stageCounter = 0;

  // 1. 각 노드에 스테이지 추론
  const nodeStages = new Map<string, RoadStageType>();
  for (const node of nodes) {
    const stage = node.stage || inferStage(node);
    nodeStages.set(node.id, stage);
  }

  // 2. 스테이지별 그룹핑
  const stageGroups = new Map<RoadStageType, JourneyNode[]>();
  for (const node of nodes) {
    const stage = nodeStages.get(node.id)!;
    if (!stageGroups.has(stage)) stageGroups.set(stage, []);
    stageGroups.get(stage)!.push(node);
  }

  // 3. ROAD_STAGE_ORDER 순서대로 RoadStage 생성
  const stages: RoadStage[] = [];

  for (const stageType of ROAD_STAGE_ORDER) {
    const stageNodes = stageGroups.get(stageType);
    if (!stageNodes || stageNodes.length === 0) continue;

    stageCounter++;
    const stage = buildSingleStage(stageType, stageNodes, stageCounter);
    stages.push(stage);
  }

  // 4. 스테이지 간 전환 정보 생성
  for (let i = 0; i < stages.length - 1; i++) {
    stages[i]!.nextTransition = buildTransition(
      stages[i]!,
      stages[i + 1]!,
      edges,
      nodeStages,
    );
  }

  return stages;
}

function buildSingleStage(
  stageType: RoadStageType,
  nodes: JourneyNode[],
  order: number,
): RoadStage {
  // 대표 키워드: 검색량 상위 10개
  const sorted = [...nodes].sort((a, b) => b.searchVolume - a.searchVolume);
  const representativeKeywords = sorted.slice(0, 10).map((n) => n.label);

  // dominant intent
  const intentCounts = new Map<IntentCategory, number>();
  for (const node of nodes) {
    intentCounts.set(
      node.intent,
      (intentCounts.get(node.intent) || 0) + 1,
    );
  }
  const dominantIntent = [...intentCounts.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];

  // 질문형 키워드 추출
  const questions = nodes
    .filter((n) => n.nodeType === "question" || /\?|어떻|왜|어디|언제|how|what|why/.test(n.label))
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)
    .map((n) => n.label);

  // 평균 지표
  const avgSearchVolume = Math.round(
    nodes.reduce((s, n) => s + n.searchVolume, 0) / nodes.length,
  );
  const avgGapScore = Math.round(
    (nodes.reduce((s, n) => s + n.gapScore, 0) / nodes.length) * 100,
  ) / 100;

  // 관련 클러스터
  const clusterIds = [
    ...new Set(nodes.filter((n) => n.clusterId).map((n) => n.clusterId!)),
  ];

  return {
    id: `stage-${stageType}-${order}`,
    stageType,
    label: ROAD_STAGE_LABELS[stageType],
    description: generateStageDescription(stageType, representativeKeywords),
    order,
    representativeKeywords,
    dominantIntent,
    majorQuestions: questions,
    relatedClusterIds: clusterIds,
    keywordCount: nodes.length,
    avgSearchVolume,
    avgGapScore,
    evidenceNodeIds: nodes.map((n) => n.id),
  };
}

function buildTransition(
  fromStage: RoadStage,
  toStage: RoadStage,
  edges: JourneyEdge[],
  nodeStages: Map<string, RoadStageType>,
): StageTransition {
  // 스테이지 간 엣지 수로 전환 강도 계산
  const fromNodeIds = new Set(fromStage.evidenceNodeIds);
  const toNodeIds = new Set(toStage.evidenceNodeIds);

  let crossEdgeCount = 0;
  const transitionKeywords: string[] = [];

  for (const edge of edges) {
    const fromInSource = fromNodeIds.has(edge.fromNodeId);
    const toInTarget = toNodeIds.has(edge.toNodeId);
    if (fromInSource && toInTarget) {
      crossEdgeCount++;
    }
  }

  const maxPossibleEdges = fromStage.keywordCount * toStage.keywordCount;
  const strength = maxPossibleEdges > 0
    ? Math.min(1.0, crossEdgeCount / Math.sqrt(maxPossibleEdges))
    : 0.5;

  return {
    toStageId: toStage.id,
    strength: Math.round(strength * 1000) / 1000,
    reason: `${fromStage.label}에서 ${toStage.label}로 전환 (${crossEdgeCount}개 연결)`,
    intentShift: {
      from: fromStage.dominantIntent,
      to: toStage.dominantIntent,
    },
    transitionKeywords: transitionKeywords.slice(0, 5),
  };
}

function generateStageDescription(
  stageType: RoadStageType,
  keywords: string[],
): string {
  const kwPreview = keywords.slice(0, 3).join(", ");
  const descriptions: Record<RoadStageType, string> = {
    awareness: `사용자가 "${kwPreview}" 등을 검색하며 주제를 처음 인지하는 단계`,
    interest: `"${kwPreview}" 등 구체적인 정보를 탐색하며 관심을 키우는 단계`,
    comparison: `"${kwPreview}" 등으로 대안을 비교하고 평가하는 단계`,
    decision: `"${kwPreview}" 등 가격/조건을 확인하며 최종 결정을 내리는 단계`,
    action: `"${kwPreview}" 등으로 구매/신청을 실행하는 단계`,
    advocacy: `"${kwPreview}" 등 사용 후 경험을 공유하거나 문제를 해결하는 단계`,
  };
  return descriptions[stageType];
}
