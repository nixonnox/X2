/**
 * Journey Graph Builder
 *
 * 기존 intent-engine의 분석 결과(IntentGraphData)를
 * 패스파인더/로드뷰용 JourneyNode/JourneyEdge 그래프로 변환한다.
 *
 * 이 모듈은 기존 코드와 새 journey-engine 사이의 **브릿지** 역할을 한다.
 * Phase 1(실데이터 연동) 이전에도 기존 시뮬레이션 데이터로 동작한다.
 * Phase 3(SERP 엔진) 이후에는 실데이터 기반으로 전환된다.
 */

import type { IntentGraphData, IntentGraphNode } from "../../intent-engine/types";
import type {
  JourneyNode,
  JourneyEdge,
  JourneyPath,
  JourneyPathStep,
  PathfinderResult,
  PathfinderRequest,
  PathfinderSummary,
  PathfinderCluster,
  BranchPoint,
  NodeSourceType,
  IntentCategory,
  RoadStageType,
} from "../types";
import {
  convertFromIntentLinks,
  resetEdgeCounter,
} from "../builders/transition-builder";
import { inferStage } from "../builders/stage-inference";

// ─── IntentGraphNode → JourneyNode 변환 ──────────────────────────

let nodeCounter = 0;

function convertNode(
  igNode: IntentGraphNode,
  seedKeyword: string,
): JourneyNode {
  nodeCounter++;

  const isSeed = igNode.isSeed || igNode.name === seedKeyword;
  const direction: JourneyNode["direction"] = isSeed
    ? "seed"
    : igNode.temporalPhase === "before"
      ? "before"
      : "after";

  // 노드 유형 추론
  const nodeType: JourneyNode["nodeType"] = isSeed
    ? "seed"
    : /\?|어떻|왜|어디|언제|how|what|why/.test(igNode.name)
      ? "question"
      : "keyword";

  // source type 추론 (기존 데이터에는 없으므로 depth 기반)
  const sourceType: NodeSourceType =
    igNode.depth === 0
      ? "manual"
      : igNode.depth === 1
        ? "google_autocomplete"
        : "google_related";

  const node: JourneyNode = {
    id: `jn-${nodeCounter}`,
    label: igNode.name,
    normalizedLabel: igNode.name.toLowerCase().trim(),
    nodeType,
    depth: igNode.depth,
    direction,
    stepIndex: igNode.depth,
    intent: igNode.intentCategory,
    subIntent: igNode.subIntent,
    temporalPhase: igNode.temporalPhase,
    journeyStage: igNode.journeyStage,
    searchVolume: igNode.searchVolume,
    gapScore: igNode.gapScore,
    isRising: igNode.isRising,
    centrality: igNode.centrality,
    evidenceCount: 1,
    sources: [
      {
        type: sourceType,
        parentKeyword: isSeed ? null : seedKeyword,
        collectedAt: new Date().toISOString(),
        confidence: isSeed ? 1.0 : 0.7,
      },
    ],
    displaySize: Math.max(
      4,
      Math.min(20, Math.log2(Math.max(1, igNode.searchVolume)) * 2),
    ),
    confidenceLevel:
      igNode.centrality > 0.3
        ? "high"
        : igNode.centrality > 0.1
          ? "medium"
          : "low",
    clusterId: igNode.clusterId,
  };

  // 스테이지 추론
  node.stage = inferStage(node);

  return node;
}

// ─── 경로 추출 ───────────────────────────────────────────────────

/**
 * 그래프에서 시드 기준 주요 경로를 추출한다.
 *
 * BFS로 시드에서 도달 가능한 경로를 탐색하고,
 * weight 합이 높은 경로를 우선순위로 반환한다.
 */
function extractPaths(
  seedNode: JourneyNode,
  nodes: JourneyNode[],
  edges: JourneyEdge[],
  maxPaths: number = 10,
): JourneyPath[] {
  // 인접 리스트 구성
  const adjacency = new Map<string, { node: JourneyNode; edge: JourneyEdge }[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
    const toNode = nodes.find((n) => n.id === edge.toNodeId);
    if (!fromNode || !toNode) continue;

    adjacency.get(edge.fromNodeId)?.push({ node: toNode, edge });
    // 양방향 엣지는 반대 방향도 추가
    if (edge.direction === "bidirectional") {
      adjacency.get(edge.toNodeId)?.push({ node: fromNode, edge });
    }
  }

  // BFS로 경로 탐색 (최대 깊이 제한)
  const paths: JourneyPath[] = [];
  const maxDepth = 5;

  interface QueueItem {
    nodeId: string;
    path: JourneyPathStep[];
    visited: Set<string>;
    totalWeight: number;
  }

  const queue: QueueItem[] = [
    {
      nodeId: seedNode.id,
      path: [
        {
          stepIndex: 0,
          keyword: seedNode.label,
          nodeId: seedNode.id,
          direction: "seed",
          transitionWeight: 1.0,
          transitionType: "refinement",
          intent: seedNode.intent,
        },
      ],
      visited: new Set([seedNode.id]),
      totalWeight: 1.0,
    },
  ];

  let pathCounter = 0;

  while (queue.length > 0 && paths.length < maxPaths * 3) {
    const current = queue.shift()!;
    if (current.path.length > maxDepth) continue;

    const neighbors = adjacency.get(current.nodeId) || [];

    if (neighbors.length === 0 || current.path.length >= 3) {
      // 리프 노드이거나 3단계 이상이면 경로로 기록
      if (current.path.length >= 2) {
        pathCounter++;
        const intentFlow = current.path.map((s) => s.intent);
        const dominantIntent = getMostCommon(intentFlow);

        paths.push({
          id: `path-${pathCounter}`,
          seedKeyword: seedNode.label,
          steps: current.path,
          pathScore: current.totalWeight,
          intentFlow,
          pathType: classifyPathType(current.path),
          pathLabel: current.path.map((s) => s.keyword).join(" → "),
          dominantIntent,
          totalSteps: current.path.length,
        });
      }
    }

    for (const { node: neighbor, edge } of neighbors) {
      if (current.visited.has(neighbor.id)) continue;

      const newStep: JourneyPathStep = {
        stepIndex: current.path.length,
        keyword: neighbor.label,
        nodeId: neighbor.id,
        direction: neighbor.direction,
        transitionWeight: edge.weight,
        transitionType: edge.transitionType,
        intent: neighbor.intent,
      };

      queue.push({
        nodeId: neighbor.id,
        path: [...current.path, newStep],
        visited: new Set([...current.visited, neighbor.id]),
        totalWeight: current.totalWeight + edge.weight,
      });
    }
  }

  // pathScore 내림차순 정렬 후 상위 반환
  return paths
    .sort((a, b) => b.pathScore - a.pathScore)
    .slice(0, maxPaths);
}

function classifyPathType(
  steps: JourneyPathStep[],
): JourneyPath["pathType"] {
  const directions = steps.map((s) => s.direction);
  const hasBeforeAndAfter =
    directions.includes("before") && directions.includes("after");

  if (hasBeforeAndAfter) return "linear";
  if (steps.length > 4) return "branching";
  return "linear";
}

function getMostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();
  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }
  return [...counts.entries()].reduce((a, b) =>
    b[1] > a[1] ? b : a,
  )[0];
}

// ─── 분기점 분석 ─────────────────────────────────────────────────

function analyzeBranchPoints(
  nodes: JourneyNode[],
  edges: JourneyEdge[],
): BranchPoint[] {
  const branchPoints: BranchPoint[] = [];

  // 각 노드의 outgoing edge 수 확인
  const outDegree = new Map<string, JourneyEdge[]>();
  for (const edge of edges) {
    if (edge.direction !== "backward") {
      if (!outDegree.has(edge.fromNodeId)) outDegree.set(edge.fromNodeId, []);
      outDegree.get(edge.fromNodeId)!.push(edge);
    }
  }

  for (const [nodeId, outEdges] of outDegree.entries()) {
    if (outEdges.length < 2) continue;

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const alternatives = outEdges
      .map((edge) => {
        const target = nodes.find((n) => n.id === edge.toNodeId);
        return target
          ? { keyword: target.label, weight: edge.weight, intent: target.intent }
          : null;
      })
      .filter(Boolean) as BranchPoint["alternatives"];

    if (alternatives.length >= 2) {
      // 이탈률: 최대 weight 외 나머지의 비율
      const totalWeight = alternatives.reduce((s, a) => s + a.weight, 0);
      const maxWeight = Math.max(...alternatives.map((a) => a.weight));
      const dropOffRate = totalWeight > 0 ? (totalWeight - maxWeight) / totalWeight : 0;

      branchPoints.push({
        stepIndex: node.depth,
        keyword: node.label,
        alternatives,
        dropOffRate: Math.round(dropOffRate * 1000) / 1000,
      });
    }
  }

  return branchPoints
    .sort((a, b) => b.alternatives.length - a.alternatives.length)
    .slice(0, 10);
}

// ─── 클러스터 변환 ───────────────────────────────────────────────

function convertClusters(
  igData: IntentGraphData,
  nodeMap: Map<string, JourneyNode>,
): PathfinderCluster[] {
  return igData.clusters.map((cluster) => {
    const nodeIds = cluster.keywords
      .map((kw) => {
        for (const [, node] of nodeMap) {
          if (node.label === kw) return node.id;
        }
        return null;
      })
      .filter(Boolean) as string[];

    return {
      id: cluster.id,
      label: cluster.name,
      keywords: cluster.keywords,
      nodeIds,
      dominantIntent: cluster.dominantIntent,
      avgGapScore: cluster.avgGapScore,
      size: cluster.size,
    };
  });
}

// ─── 메인 빌더 함수 ──────────────────────────────────────────────

/**
 * 기존 IntentGraphData → PathfinderResult 변환
 *
 * 이 함수가 기존 intent-engine과 새 journey-engine 사이의 핵심 브릿지.
 * 기존 시뮬레이션 데이터로도 동작하고,
 * 실데이터가 들어오면 더 정확한 결과를 생성한다.
 */
export function buildPathfinderFromIntentGraph(
  igData: IntentGraphData,
  request: PathfinderRequest,
): PathfinderResult {
  const startTime = Date.now();
  nodeCounter = 0;
  resetEdgeCounter();

  // 1. 노드 변환
  const nodeMap = new Map<string, JourneyNode>();
  const nameToNode = new Map<string, JourneyNode>();

  for (const igNode of igData.nodes) {
    const jNode = convertNode(igNode, request.seedKeyword);
    nodeMap.set(jNode.id, jNode);
    nameToNode.set(igNode.name, jNode);
  }

  const nodes = [...nodeMap.values()];

  // 2. 엣지 변환
  const edges = convertFromIntentLinks(igData.links, nameToNode);

  // 3. 시드 노드 찾기
  const seedNode = nodes.find((n) => n.nodeType === "seed");
  if (!seedNode) {
    throw new Error(`Seed node not found for keyword: ${request.seedKeyword}`);
  }

  // 4. 경로 추출
  const paths = extractPaths(seedNode, nodes, edges, 10);

  // 5. 분기점 분석
  const branchPoints = analyzeBranchPoints(nodes, edges);

  // 6. 클러스터 변환
  const clusters = convertClusters(igData, nameToNode);

  // 7. 요약 생성
  const intentDist: Record<IntentCategory, number> = {
    discovery: 0,
    comparison: 0,
    action: 0,
    troubleshooting: 0,
    unknown: 0,
  };
  const stageDist: Record<RoadStageType, number> = {
    awareness: 0,
    interest: 0,
    comparison: 0,
    decision: 0,
    action: 0,
    advocacy: 0,
  };

  for (const node of nodes) {
    intentDist[node.intent] = (intentDist[node.intent] || 0) + 1;
    if (node.stage) {
      stageDist[node.stage] = (stageDist[node.stage] || 0) + 1;
    }
  }

  const summary: PathfinderSummary = {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalPaths: paths.length,
    totalClusters: clusters.length,
    maxDepth: Math.max(...nodes.map((n) => n.depth)),
    avgGapScore:
      Math.round(
        (nodes.reduce((s, n) => s + n.gapScore, 0) / nodes.length) * 100,
      ) / 100,
    topBlueOceans: nodes
      .filter((n) => n.gapScore > 60)
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, 5)
      .map((n) => ({ keyword: n.label, gapScore: n.gapScore })),
    topBranchPoints: branchPoints.slice(0, 5),
    intentDistribution: intentDist,
    stageDistribution: stageDist,
    analyzedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };

  return {
    seedKeyword: request.seedKeyword,
    nodes,
    edges,
    paths,
    clusters,
    summary,
    trace: {
      analysisId: `pf-${Date.now()}`,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      stages: [
        {
          name: "convert_nodes",
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          inputCount: igData.nodes.length,
          outputCount: nodes.length,
          apiCallCount: 0,
          cacheHitCount: 0,
          errorCount: 0,
        },
      ],
      dataSources: [
        {
          source: "intent_engine",
          callCount: 1,
          cacheHitRate: 0,
          avgLatencyMs: Date.now() - startTime,
        },
      ],
    },
  };
}
