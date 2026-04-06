/**
 * Cluster Builder
 *
 * 기존 intent-engine의 클러스터링 결과를 강화하여
 * IntentCluster 구조로 변환한다.
 *
 * 동작 흐름:
 * 1. 기존 KeywordCluster → IntentCluster 변환
 * 2. 클러스터 카테고리 자동 추론
 * 3. 대표 질문 추출
 * 4. 테마/토픽 추출
 * 5. 클러스터 점수 계산
 * 6. ClusterMembership 생성
 */

import type {
  IntentGraphData,
  IntentGraphNode,
  KeywordCluster,
  IntentCategory,
  TemporalPhase,
  SubIntent,
} from "../../intent-engine/types";
import type { RoadStageType } from "../../journey-engine/types";
import {
  INTENT_TO_STAGE,
  SUBINTENT_TO_STAGE,
} from "../../journey-engine/types";
import type {
  IntentCluster,
  ClusterMembership,
  ClusterCategory,
  ClusterMemberType,
} from "../types";
import { INTENT_PHASE_TO_CLUSTER_CATEGORY } from "../types";

// ─── 메인 변환 함수 ─────────────────────────────────────────

/**
 * IntentGraphData → IntentCluster[] 변환
 *
 * 기존 intent-engine 클러스터를 강화된 IntentCluster로 변환한다.
 */
export function buildIntentClusters(
  igData: IntentGraphData,
  seedKeyword: string,
  options: {
    minClusterSize?: number;
    includeQuestions?: boolean;
  } = {},
): { clusters: IntentCluster[]; memberships: ClusterMembership[] } {
  const { minClusterSize = 3, includeQuestions = true } = options;
  const allMemberships: ClusterMembership[] = [];

  // 노드 맵 (이름 → 노드)
  const nodeMap = new Map<string, IntentGraphNode>();
  for (const node of igData.nodes) {
    nodeMap.set(node.name, node);
  }

  // 기존 클러스터 변환
  const clusters: IntentCluster[] = [];

  for (const rawCluster of igData.clusters) {
    if (rawCluster.size < minClusterSize) continue;

    // 클러스터 멤버 노드 수집
    const memberNodes = rawCluster.keywords
      .map((kw) => nodeMap.get(kw))
      .filter(Boolean) as IntentGraphNode[];

    if (memberNodes.length < minClusterSize) continue;

    const cluster = buildSingleCluster(
      rawCluster,
      memberNodes,
      seedKeyword,
      clusters.length,
    );
    clusters.push(cluster);

    // Membership 생성
    const memberships = buildMemberships(cluster.id, memberNodes);
    allMemberships.push(...memberships);
  }

  // 질문형 키워드 별도 클러스터 (선택)
  if (includeQuestions) {
    const questionNodes = igData.nodes.filter(
      (n) =>
        /\?|어떻|왜|어디|언제|how|what|why|which|방법|하는 법/.test(n.name) &&
        !allMemberships.some((m) => m.itemLabel === n.name),
    );

    if (questionNodes.length >= minClusterSize) {
      const qCluster = buildQuestionCluster(
        questionNodes,
        seedKeyword,
        clusters.length,
      );
      clusters.push(qCluster);
      allMemberships.push(...buildMemberships(qCluster.id, questionNodes));
    }
  }

  // 점수 기준 내림차순 정렬
  clusters.sort((a, b) => b.score - a.score);

  return { clusters, memberships: allMemberships };
}

// ─── 단일 클러스터 빌드 ──────────────────────────────────────

function buildSingleCluster(
  rawCluster: KeywordCluster,
  memberNodes: IntentGraphNode[],
  seedKeyword: string,
  index: number,
): IntentCluster {
  // 분포 계산
  const intentDist = countDistribution(
    memberNodes,
    (n) => n.intentCategory,
  ) as Record<IntentCategory, number>;
  const phaseDist = countDistribution(
    memberNodes,
    (n) => n.temporalPhase,
  ) as Record<TemporalPhase, number>;

  // dominant 값 계산
  const dominantIntent = getMaxKey(intentDist) as IntentCategory;
  const dominantPhase = getMaxKey(phaseDist) as TemporalPhase;
  const dominantStage = inferDominantStage(memberNodes);

  // 카테고리 추론
  const category = inferClusterCategory(
    dominantIntent,
    dominantPhase,
    memberNodes,
  );

  // 대표 키워드 (검색량 상위)
  const sortedByVolume = [...memberNodes].sort(
    (a, b) => b.searchVolume - a.searchVolume,
  );
  const representativeKeywords = sortedByVolume.slice(0, 10).map((n) => n.name);

  // 대표 질문 추출
  const representativeQuestions = memberNodes
    .filter((n) => /\?|어떻|왜|어디|언제|how|what|why|방법/.test(n.name))
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)
    .map((n) => n.name);

  // 메트릭
  const avgGapScore =
    Math.round(
      (memberNodes.reduce((s, n) => s + n.gapScore, 0) / memberNodes.length) *
        100,
    ) / 100;
  const avgSearchVolume = Math.round(
    memberNodes.reduce((s, n) => s + n.searchVolume, 0) / memberNodes.length,
  );
  const risingCount = memberNodes.filter((n) => n.isRising).length;

  // SubIntent 분포
  const subIntentCounts = new Map<SubIntent, number>();
  for (const node of memberNodes) {
    if (node.subIntent) {
      subIntentCounts.set(
        node.subIntent,
        (subIntentCounts.get(node.subIntent) || 0) + 1,
      );
    }
  }
  const topSubIntents = [...subIntentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([subIntent, count]) => ({ subIntent, count }));

  // 테마 추출
  const themes = extractThemes(memberNodes, seedKeyword);

  // 클러스터 점수 계산 (다양성 평가를 위해 키워드 목록 전달)
  const allKeywordNames = memberNodes.map((n) => n.name);
  const score = calculateClusterScore(
    memberNodes.length,
    avgGapScore,
    avgSearchVolume,
    risingCount,
    allKeywordNames,
  );

  // 스테이지 분포
  const stageDist: Partial<Record<RoadStageType, number>> = {};
  for (const node of memberNodes) {
    const stage = inferNodeStage(node);
    stageDist[stage] = (stageDist[stage] || 0) + 1;
  }

  // 라벨 생성
  const label = generateClusterLabel(
    category,
    rawCluster.centroid,
    dominantIntent,
  );

  return {
    id: `ic-${index}`,
    label,
    description: generateClusterDescription(
      category,
      representativeKeywords,
      seedKeyword,
    ),
    category,
    dominantIntent,
    dominantPhase,
    dominantStage,
    memberCount: memberNodes.length,
    representativeKeywords,
    representativeQuestions,
    allKeywords: memberNodes.map((n) => n.name),
    centroid: rawCluster.centroid,
    avgGapScore,
    avgSearchVolume,
    avgDifficultyScore: 0, // 현재 미사용, Phase 3에서 추가
    risingCount,
    score,
    clusterMethod: "intent_phase",
    themes,
    metadata: {
      intentDistribution: intentDist,
      phaseDistribution: phaseDist,
      stageDistribution: stageDist,
      topSubIntents,
      createdAt: new Date().toISOString(),
    },
  };
}

// ─── 질문형 클러스터 빌드 ─────────────────────────────────────

function buildQuestionCluster(
  questionNodes: IntentGraphNode[],
  seedKeyword: string,
  index: number,
): IntentCluster {
  const intentDist = countDistribution(
    questionNodes,
    (n) => n.intentCategory,
  ) as Record<IntentCategory, number>;
  const phaseDist = countDistribution(
    questionNodes,
    (n) => n.temporalPhase,
  ) as Record<TemporalPhase, number>;
  const dominantIntent = getMaxKey(intentDist) as IntentCategory;
  const dominantPhase = getMaxKey(phaseDist) as TemporalPhase;

  const sorted = [...questionNodes].sort(
    (a, b) => b.searchVolume - a.searchVolume,
  );
  const avgGapScore =
    Math.round(
      (questionNodes.reduce((s, n) => s + n.gapScore, 0) /
        questionNodes.length) *
        100,
    ) / 100;

  return {
    id: `ic-${index}`,
    label: `${seedKeyword} 관련 핵심 질문`,
    description: `"${seedKeyword}"에 대해 사용자들이 자주 묻는 질문을 모은 클러스터`,
    category: "exploratory",
    dominantIntent,
    dominantPhase,
    dominantStage: inferDominantStage(questionNodes),
    memberCount: questionNodes.length,
    representativeKeywords: sorted.slice(0, 10).map((n) => n.name),
    representativeQuestions: sorted.slice(0, 5).map((n) => n.name),
    allKeywords: questionNodes.map((n) => n.name),
    centroid: sorted[0]?.name ?? seedKeyword,
    avgGapScore,
    avgSearchVolume: Math.round(
      questionNodes.reduce((s, n) => s + n.searchVolume, 0) /
        questionNodes.length,
    ),
    avgDifficultyScore: 0,
    risingCount: questionNodes.filter((n) => n.isRising).length,
    score: calculateClusterScore(
      questionNodes.length,
      avgGapScore,
      questionNodes.reduce((s, n) => s + n.searchVolume, 0) /
        questionNodes.length,
      questionNodes.filter((n) => n.isRising).length,
      questionNodes.map((n) => n.name),
    ),
    clusterMethod: "question",
    themes: ["FAQ", "사용자 궁금증", "핵심 질문"],
    metadata: {
      intentDistribution: intentDist,
      phaseDistribution: phaseDist,
      stageDistribution: {},
      topSubIntents: [],
      createdAt: new Date().toISOString(),
    },
  };
}

// ─── ClusterMembership 생성 ──────────────────────────────────

function buildMemberships(
  clusterId: string,
  memberNodes: IntentGraphNode[],
): ClusterMembership[] {
  const maxVolume = Math.max(...memberNodes.map((n) => n.searchVolume), 1);

  return memberNodes.map((node) => {
    const itemType: ClusterMemberType =
      /\?|어떻|왜|어디|언제|how|what|why/.test(node.name)
        ? "question"
        : "keyword";

    return {
      itemId: node.id,
      itemLabel: node.name,
      itemType,
      clusterId,
      membershipScore:
        Math.round(
          ((node.centrality + node.searchVolume / maxVolume) / 2) * 1000,
        ) / 1000,
      intent: node.intentCategory,
      phase: node.temporalPhase,
      searchVolume: node.searchVolume,
      gapScore: node.gapScore,
      isRising: node.isRising,
    };
  });
}

// ─── 유틸리티 ────────────────────────────────────────────────

function countDistribution<T>(
  nodes: IntentGraphNode[],
  accessor: (n: IntentGraphNode) => T,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    const key = String(accessor(node));
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function getMaxKey(dist: Record<string, number>): string {
  return Object.entries(dist).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function inferNodeStage(node: IntentGraphNode): RoadStageType {
  if (node.subIntent && SUBINTENT_TO_STAGE[node.subIntent]) {
    return SUBINTENT_TO_STAGE[node.subIntent]!;
  }
  return INTENT_TO_STAGE[node.intentCategory] || "interest";
}

function inferDominantStage(nodes: IntentGraphNode[]): RoadStageType {
  const stageCounts: Partial<Record<RoadStageType, number>> = {};
  for (const node of nodes) {
    const stage = inferNodeStage(node);
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
  }
  const entries = Object.entries(stageCounts) as [RoadStageType, number][];
  if (entries.length === 0) return "interest";
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function inferClusterCategory(
  dominantIntent: IntentCategory,
  dominantPhase: TemporalPhase,
  nodes: IntentGraphNode[],
): ClusterCategory {
  const key = `${dominantIntent}:${dominantPhase}`;
  const baseCategory = INTENT_PHASE_TO_CLUSTER_CATEGORY[key] ?? "general";

  // 키워드 패턴으로 보정
  const keywords = nodes.map((n) => n.name.toLowerCase());
  const joined = keywords.join(" ");

  if (/추천|순위|best|top|ranking/.test(joined)) return "recommendation";
  if (/가격|비용|비교|vs|versus/.test(joined)) return "price_sensitive";
  if (/후기|리뷰|경험|사용기/.test(joined)) return "experience";
  if (/에러|오류|문제|해결|fix/.test(joined)) return "problem_solving";

  return baseCategory;
}

function extractThemes(
  nodes: IntentGraphNode[],
  seedKeyword: string,
): string[] {
  const themes: string[] = [];
  const keywords = nodes.map((n) => n.name.toLowerCase());
  const joined = keywords.join(" ");

  // 패턴 기반 테마 추출
  if (/추천|순위|베스트|best/.test(joined)) themes.push("추천/순위");
  if (/가격|비용|요금|할인/.test(joined)) themes.push("가격/비용");
  if (/비교|vs|차이|versus/.test(joined)) themes.push("비교 분석");
  if (/후기|리뷰|평가|사용기/.test(joined)) themes.push("후기/리뷰");
  if (/방법|하는 법|how|가이드/.test(joined)) themes.push("방법/가이드");
  if (/에러|오류|문제|해결/.test(joined)) themes.push("문제 해결");
  if (/트렌드|동향|최신/.test(joined)) themes.push("트렌드");
  if (/구매|주문|신청|가입/.test(joined)) themes.push("구매/행동");

  if (themes.length === 0) themes.push(`${seedKeyword} 관련 탐색`);

  return themes.slice(0, 5);
}

function calculateClusterScore(
  memberCount: number,
  avgGapScore: number,
  avgSearchVolume: number,
  risingCount: number,
  allKeywords?: string[],
): number {
  // 기본 점수 컴포넌트
  const sizeScore = Math.min(100, memberCount * 5);
  const gapScore = avgGapScore;
  const volumeScore = Math.min(
    100,
    Math.log2(Math.max(1, avgSearchVolume)) * 8,
  );
  const trendScore = Math.min(100, risingCount * 20);

  // 다양성 점수: 클러스터 내 키워드들이 얼마나 다양한 단어를 포함하는지
  // 유사 키워드가 많으면 점수가 낮아짐
  let diversityScore = 100;
  if (allKeywords && allKeywords.length > 0) {
    const uniqueTerms = new Set(allKeywords.flatMap((kw) => kw.split(/\s+/)));
    diversityScore = Math.min(
      100,
      (uniqueTerms.size / allKeywords.length) * 100,
    );
  }

  // 가중 합산: 규모(20%) + 갭(25%) + 볼륨(20%) + 트렌드(15%) + 다양성(20%)
  return Math.round(
    sizeScore * 0.2 +
      gapScore * 0.25 +
      volumeScore * 0.2 +
      trendScore * 0.15 +
      diversityScore * 0.2,
  );
}

function generateClusterLabel(
  category: ClusterCategory,
  centroid: string,
  _dominantIntent: IntentCategory,
): string {
  const categoryLabels: Record<ClusterCategory, string> = {
    exploratory: "탐색",
    comparative: "비교",
    price_sensitive: "가격",
    problem_solving: "문제 해결",
    recommendation: "추천",
    action_oriented: "실행",
    experience: "경험",
    general: "일반",
  };
  return `${centroid} ${categoryLabels[category]} 클러스터`;
}

function generateClusterDescription(
  category: ClusterCategory,
  keywords: string[],
  seedKeyword: string,
): string {
  const kwPreview = keywords.slice(0, 3).join(", ");
  const descriptions: Record<ClusterCategory, string> = {
    exploratory: `"${kwPreview}" 등 ${seedKeyword}에 대한 기초 정보를 탐색하는 검색 그룹`,
    comparative: `"${kwPreview}" 등 옵션을 비교하고 평가하는 검색 그룹`,
    price_sensitive: `"${kwPreview}" 등 가격과 비용을 중심으로 검색하는 그룹`,
    problem_solving: `"${kwPreview}" 등 문제 해결을 위해 검색하는 그룹`,
    recommendation: `"${kwPreview}" 등 추천과 순위를 탐색하는 검색 그룹`,
    action_oriented: `"${kwPreview}" 등 구매/가입 등 행동을 위해 검색하는 그룹`,
    experience: `"${kwPreview}" 등 사용 경험과 후기를 검색하는 그룹`,
    general: `"${kwPreview}" 등 ${seedKeyword} 관련 일반 검색 그룹`,
  };
  return descriptions[category];
}
