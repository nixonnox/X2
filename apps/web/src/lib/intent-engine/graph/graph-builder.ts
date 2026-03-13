// ─────────────────────────────────────────────────────────────
// Graph Builder — ECharts Force-Directed Graph 데이터 생성 (v2)
// ─────────────────────────────────────────────────────────────
// 클러스터 감지, 중심성 계산, 검색 여정 추출, 콘텐츠 갭 매트릭스

import type {
  ClassifiedKeyword,
  ExpandedKeyword,
  IntentGraphNode,
  IntentGraphLink,
  IntentGraphCategory,
  IntentGraphData,
  AnalysisSummary,
  IntentCategory,
  TemporalPhase,
  RelationshipType,
  KeywordCluster,
  SearchJourney,
  SearchJourneyPath,
  ContentGapMatrix,
  ContentGapCell,
  SearchJourneyStage,
} from "../types";
import { INTENT_CATEGORY_LABELS } from "../types";

// ── 카테고리 인덱스 매핑 ──

const CATEGORY_INDEX: Record<IntentCategory, number> = {
  discovery: 0,
  comparison: 1,
  action: 2,
  troubleshooting: 3,
  unknown: 4,
};

// ── 노드 심볼 크기 계산 ──

function calculateSymbolSize(
  searchVolume: number,
  gapScore: number,
  isSeed: boolean,
): number {
  if (isSeed) return 60;
  const volumeSize = Math.log2(Math.max(1, searchVolume)) * 4;
  const gapBonus = (gapScore / 100) * 10;
  return Math.max(15, Math.min(55, volumeSize + gapBonus));
}

// ── 링크 강도 계산 ──

function calculateLinkStrength(
  source: ClassifiedKeyword,
  target: ClassifiedKeyword,
): number {
  let strength = 0.3;
  if (source.intentCategory === target.intentCategory) strength += 0.2;
  if (source.temporalPhase === target.temporalPhase) strength += 0.15;
  const volRatio =
    Math.min(source.searchVolume, target.searchVolume) /
    Math.max(source.searchVolume, target.searchVolume, 1);
  strength += volRatio * 0.15;
  return Math.min(1.0, strength);
}

// ── 관계 유형 결정 ──

function determineRelationType(
  expanded: ExpandedKeyword,
  targetClassified: ClassifiedKeyword,
  parentClassified?: ClassifiedKeyword,
): RelationshipType {
  if (
    expanded.source === "autocomplete" ||
    expanded.source === "naver_autocomplete"
  )
    return "autocomplete";
  if (expanded.source === "related") return "related";
  if (expanded.source === "trend" || expanded.source === "co_search")
    return "co_search";
  if (expanded.source === "question") return "question";
  if (
    parentClassified &&
    targetClassified.temporalPhase !== parentClassified.temporalPhase
  )
    return "temporal";
  if (expanded.source === "suggestion" || expanded.source === "seasonal")
    return "semantic";
  return "derived";
}

// ── 검색 여정 단계 결정 ──

function deriveJourneyStage(kw: ClassifiedKeyword): SearchJourneyStage {
  const { intentCategory, temporalPhase } = kw;

  if (temporalPhase === "before") {
    if (intentCategory === "discovery") return "awareness";
    return "consideration";
  }
  if (temporalPhase === "current") {
    if (intentCategory === "action") return "decision";
    if (intentCategory === "comparison") return "consideration";
    return "consideration";
  }
  // after
  if (intentCategory === "troubleshooting") return "retention";
  if (intentCategory === "comparison" || intentCategory === "discovery")
    return "advocacy";
  return "retention";
}

// ── 클러스터 감지 (Louvain-inspired greedy modularity) ──

function detectClusters(
  keywords: ClassifiedKeyword[],
  links: IntentGraphLink[],
): { clusters: KeywordCluster[]; nodeClusterMap: Map<string, string> } {
  if (keywords.length === 0) {
    return { clusters: [], nodeClusterMap: new Map() };
  }

  // 인접 맵 구축
  const adjacency = new Map<string, Set<string>>();
  for (const kw of keywords) {
    adjacency.set(kw.keyword, new Set());
  }

  for (const link of links) {
    adjacency.get(link.source)?.add(link.target);
    adjacency.get(link.target)?.add(link.source);
  }

  // 같은 intentCategory AND temporalPhase인 키워드 연결
  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < keywords.length; j++) {
      const a = keywords[i]!;
      const b = keywords[j]!;
      if (
        a.intentCategory === b.intentCategory &&
        a.temporalPhase === b.temporalPhase
      ) {
        adjacency.get(a.keyword)?.add(b.keyword);
        adjacency.get(b.keyword)?.add(a.keyword);
      }
    }
  }

  // 각 노드를 자체 클러스터에 배치
  const clusterOf = new Map<string, number>();
  let nextId = 0;
  for (const kw of keywords) {
    clusterOf.set(kw.keyword, nextId++);
  }

  // 탐욕적 병합
  let improved = true;
  while (improved) {
    improved = false;
    const interEdges = new Map<string, number>();

    for (const [node, neighbors] of adjacency) {
      const nc = clusterOf.get(node)!;
      for (const neighbor of neighbors) {
        const nnc = clusterOf.get(neighbor)!;
        if (nc !== nnc) {
          const key = `${Math.min(nc, nnc)}:${Math.max(nc, nnc)}`;
          interEdges.set(key, (interEdges.get(key) || 0) + 1);
        }
      }
    }

    let bestPair: [number, number] | null = null;
    let bestCount = 1;

    for (const [key, count] of interEdges) {
      if (count > bestCount) {
        const parts = key.split(":");
        bestPair = [Number(parts[0]), Number(parts[1])];
        bestCount = count;
      }
    }

    if (bestPair) {
      const [from, to] = bestPair;
      for (const [kw, cid] of clusterOf) {
        if (cid === from) clusterOf.set(kw, to);
      }
      improved = true;
    }
  }

  // 클러스터 그룹화
  const groups = new Map<number, ClassifiedKeyword[]>();
  for (const kw of keywords) {
    const cid = clusterOf.get(kw.keyword)!;
    if (!groups.has(cid)) groups.set(cid, []);
    groups.get(cid)!.push(kw);
  }

  const clusters: KeywordCluster[] = [];
  const nodeClusterMap = new Map<string, string>();
  let finalIdx = 0;

  for (const [, members] of groups) {
    const centroid = members.reduce((best, kw) =>
      kw.searchVolume > best.searchVolume ? kw : best,
    );
    const avgGap =
      members.reduce((s, kw) => s + kw.gapScore, 0) / members.length;
    const avgVol =
      members.reduce((s, kw) => s + kw.searchVolume, 0) / members.length;

    const intentCounts = new Map<IntentCategory, number>();
    const phaseCounts = new Map<TemporalPhase, number>();
    for (const kw of members) {
      intentCounts.set(
        kw.intentCategory,
        (intentCounts.get(kw.intentCategory) || 0) + 1,
      );
      phaseCounts.set(
        kw.temporalPhase,
        (phaseCounts.get(kw.temporalPhase) || 0) + 1,
      );
    }

    const dominantIntent = [...intentCounts.entries()].reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0];
    const dominantPhase = [...phaseCounts.entries()].reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0];

    const clusterId = `cluster-${finalIdx}`;
    clusters.push({
      id: clusterId,
      name: centroid.keyword,
      centroid: centroid.keyword,
      keywords: members.map((kw) => kw.keyword),
      avgGapScore: Math.round(avgGap * 100) / 100,
      avgSearchVolume: Math.round(avgVol),
      dominantIntent,
      dominantPhase,
      size: members.length,
    });

    for (const kw of members) {
      nodeClusterMap.set(kw.keyword, clusterId);
    }
    finalIdx++;
  }

  return { clusters, nodeClusterMap };
}

// ── 중심성 계산 (Degree Centrality) ──

function calculateCentrality(
  keyword: string,
  links: IntentGraphLink[],
  totalNodes: number,
  isSeed: boolean,
): number {
  if (isSeed) return 1.0;
  if (totalNodes <= 1) return 0;
  let degree = 0;
  for (const link of links) {
    if (link.source === keyword || link.target === keyword) degree++;
  }
  return Math.round((degree / (totalNodes - 1)) * 1000) / 1000;
}

// ── 검색 여정 추출 ──

function extractSearchJourney(
  keywords: ClassifiedKeyword[],
  links: IntentGraphLink[],
): SearchJourney {
  const keywordPhaseMap = new Map<string, TemporalPhase>();
  const keywordIntentMap = new Map<string, IntentCategory>();
  for (const kw of keywords) {
    keywordPhaseMap.set(kw.keyword, kw.temporalPhase);
    keywordIntentMap.set(kw.keyword, kw.intentCategory);
  }

  // 단계별 키워드 그룹
  const phases: TemporalPhase[] = ["before", "current", "after"];
  const stages = phases.map((phase) => {
    const phaseKeywords = keywords.filter((kw) => kw.temporalPhase === phase);
    const intentCounts = new Map<IntentCategory, number>();
    for (const kw of phaseKeywords) {
      intentCounts.set(
        kw.intentCategory,
        (intentCounts.get(kw.intentCategory) || 0) + 1,
      );
    }
    const dominantIntent: IntentCategory =
      phaseKeywords.length > 0
        ? [...intentCounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
        : "unknown";
    const avgGapScore =
      phaseKeywords.length > 0
        ? Math.round(
            phaseKeywords.reduce((s, kw) => s + kw.gapScore, 0) /
              phaseKeywords.length,
          )
        : 0;

    return {
      phase,
      keywords: phaseKeywords.map((kw) => kw.keyword),
      dominantIntent,
      avgGapScore,
    };
  });

  // 여정 경로 추출
  const pathCounts = new Map<
    string,
    { from: string; to: string; count: number }
  >();
  for (const link of links) {
    const sourcePhase = keywordPhaseMap.get(link.source);
    const targetPhase = keywordPhaseMap.get(link.target);
    if (sourcePhase && targetPhase && sourcePhase !== targetPhase) {
      const key = `${sourcePhase}→${targetPhase}`;
      if (!pathCounts.has(key)) {
        pathCounts.set(key, { from: sourcePhase, to: targetPhase, count: 0 });
      }
      pathCounts.get(key)!.count++;
    }
  }

  const paths: SearchJourneyPath[] = [...pathCounts.values()].map((p) => {
    const hasReverse = pathCounts.has(`${p.to}→${p.from}`);
    return {
      from: p.from,
      to: p.to,
      weight: p.count,
      journeyType: hasReverse
        ? ("circular" as const)
        : p.count > 3
          ? ("branching" as const)
          : ("linear" as const),
    };
  });

  return { stages, paths };
}

// ── 콘텐츠 갭 매트릭스 생성 ──

function buildContentGapMatrix(
  keywords: ClassifiedKeyword[],
): ContentGapMatrix {
  const intents: IntentCategory[] = [
    "discovery",
    "comparison",
    "action",
    "troubleshooting",
    "unknown",
  ];
  const phases: TemporalPhase[] = ["before", "current", "after"];

  const cells: ContentGapCell[] = [];
  const hotspots: ContentGapCell[] = [];

  for (const intent of intents) {
    for (const phase of phases) {
      const matching = keywords.filter(
        (kw) => kw.intentCategory === intent && kw.temporalPhase === phase,
      );

      const avgGapScore =
        matching.length > 0
          ? Math.round(
              matching.reduce((s, kw) => s + kw.gapScore, 0) / matching.length,
            )
          : 0;
      const avgSearchVolume =
        matching.length > 0
          ? Math.round(
              matching.reduce((s, kw) => s + kw.searchVolume, 0) /
                matching.length,
            )
          : 0;

      const topKeywords = [...matching]
        .sort((a, b) => b.gapScore - a.gapScore)
        .slice(0, 5)
        .map((kw) => kw.keyword);

      const intentLabel = INTENT_CATEGORY_LABELS[intent]?.label ?? intent;
      const phaseLabels: Record<TemporalPhase, string> = {
        before: "검색 이전",
        current: "현재 검색",
        after: "검색 이후",
      };
      const phaseLabel = phaseLabels[phase];

      let recommendation: string;
      if (matching.length === 0) {
        recommendation = `${intentLabel} × ${phaseLabel}: 콘텐츠 공백 영역. 신규 콘텐츠 제작을 추천합니다.`;
      } else if (avgGapScore > 60) {
        recommendation = `${intentLabel} × ${phaseLabel}: 블루오션 영역. 우선적으로 콘텐츠를 제작하세요.`;
      } else if (avgGapScore > 30) {
        recommendation = `${intentLabel} × ${phaseLabel}: 기회 영역. 기존 콘텐츠를 보강하세요.`;
      } else {
        recommendation = `${intentLabel} × ${phaseLabel}: 콘텐츠 커버리지가 양호합니다.`;
      }

      const cell: ContentGapCell = {
        intent,
        phase,
        keywordCount: matching.length,
        avgGapScore,
        avgSearchVolume,
        topKeywords,
        recommendation,
      };

      cells.push(cell);
      if (avgGapScore > 60) hotspots.push(cell);
    }
  }

  return {
    dimensions: { intents, phases },
    cells,
    hotspots,
  };
}

// ── 메인 그래프 빌더 ──

export function buildIntentGraph(
  classifiedKeywords: ClassifiedKeyword[],
  expandedKeywords: ExpandedKeyword[],
  seedKeyword: string,
  durationMs: number,
): IntentGraphData {
  const expandedMap = new Map(expandedKeywords.map((k) => [k.keyword, k]));
  const classifiedMap = new Map(classifiedKeywords.map((k) => [k.keyword, k]));

  // ── 링크 생성 ──
  const links: IntentGraphLink[] = [];
  const linkedPairs = new Set<string>();

  for (const expanded of expandedKeywords) {
    if (!expanded.parentKeyword) continue;
    if (!classifiedMap.has(expanded.keyword)) continue;
    if (!classifiedMap.has(expanded.parentKeyword)) continue;

    const pairKey = [expanded.parentKeyword, expanded.keyword]
      .sort()
      .join("|||");
    if (linkedPairs.has(pairKey)) continue;
    linkedPairs.add(pairKey);

    const sourceClassified = classifiedMap.get(expanded.parentKeyword)!;
    const targetClassified = classifiedMap.get(expanded.keyword)!;

    links.push({
      source: expanded.parentKeyword,
      target: expanded.keyword,
      relationshipType: determineRelationType(
        expanded,
        targetClassified,
        sourceClassified,
      ),
      strength: calculateLinkStrength(sourceClassified, targetClassified),
    });
  }

  // 고립 노드를 시드에 연결
  const connectedNodes = new Set(links.flatMap((l) => [l.source, l.target]));
  for (const node of classifiedKeywords) {
    if (!connectedNodes.has(node.keyword) && node.keyword !== seedKeyword) {
      links.push({
        source: seedKeyword,
        target: node.keyword,
        relationshipType: "derived",
        strength: 0.2,
      });
    }
  }

  // ── 클러스터 감지 ──
  const { clusters, nodeClusterMap } = detectClusters(
    classifiedKeywords,
    links,
  );

  // ── 검색 여정 추출 ──
  const journey = extractSearchJourney(classifiedKeywords, links);

  // ── 콘텐츠 갭 매트릭스 ──
  const gapMatrix = buildContentGapMatrix(classifiedKeywords);

  // ── 노드 생성 ──
  const nodes: IntentGraphNode[] = classifiedKeywords.map((ck) => {
    const isSeed = ck.keyword === seedKeyword;
    return {
      id: ck.keyword,
      name: ck.keyword,
      intentCategory: ck.intentCategory,
      subIntent: ck.subIntent,
      temporalPhase: ck.temporalPhase,
      searchVolume: ck.searchVolume,
      socialVolume: ck.socialVolume,
      gapScore: ck.gapScore,
      isRising: ck.isRising,
      isSeed,
      depth: expandedMap.get(ck.keyword)?.depth ?? 0,
      symbolSize: calculateSymbolSize(ck.searchVolume, ck.gapScore, isSeed),
      category: CATEGORY_INDEX[ck.intentCategory] ?? 4,
      clusterId: nodeClusterMap.get(ck.keyword),
      centrality: calculateCentrality(
        ck.keyword,
        links,
        classifiedKeywords.length,
        isSeed,
      ),
      journeyStage: ck.journeyStage ?? deriveJourneyStage(ck),
    };
  });

  // ── 카테고리 ──
  const categories: IntentGraphCategory[] = Object.entries(
    INTENT_CATEGORY_LABELS,
  ).map(([, info]) => ({
    name: info.label,
    itemStyle: { color: info.color },
  }));

  // ── 분석 요약 ──
  const intentDist: Record<IntentCategory, number> = {
    discovery: 0,
    comparison: 0,
    action: 0,
    troubleshooting: 0,
    unknown: 0,
  };
  const temporalDist: Record<TemporalPhase, number> = {
    before: 0,
    current: 0,
    after: 0,
  };
  const journeyStageDist: Record<SearchJourneyStage, number> = {
    awareness: 0,
    consideration: 0,
    decision: 0,
    retention: 0,
    advocacy: 0,
  };

  for (const ck of classifiedKeywords) {
    intentDist[ck.intentCategory]++;
    temporalDist[ck.temporalPhase]++;
    const stage = ck.journeyStage ?? deriveJourneyStage(ck);
    journeyStageDist[stage]++;
  }

  const gapScores = classifiedKeywords.map((k) => k.gapScore);
  const avgGap =
    gapScores.length > 0
      ? Math.round(gapScores.reduce((s, v) => s + v, 0) / gapScores.length)
      : 0;

  const topBlueOceans = [...classifiedKeywords]
    .sort((a, b) => b.gapScore - a.gapScore)
    .slice(0, 5)
    .map((k) => ({ keyword: k.keyword, gapScore: k.gapScore }));

  const topRising = [...classifiedKeywords]
    .filter((k) => k.isRising)
    .sort((a, b) => b.searchVolume - a.searchVolume)
    .slice(0, 5)
    .map((k) => ({
      keyword: k.keyword,
      trendScore:
        expandedKeywords.find((e) => e.keyword === k.keyword)?.trendScore ?? 0,
    }));

  const topOpportunities = [...classifiedKeywords]
    .sort((a, b) => {
      const sa = a.gapScore * Math.log2(Math.max(1, a.searchVolume));
      const sb = b.gapScore * Math.log2(Math.max(1, b.searchVolume));
      return sb - sa;
    })
    .slice(0, 5)
    .map((k) => ({
      keyword: k.keyword,
      opportunityScore: Math.round(
        k.gapScore * Math.log2(Math.max(1, k.searchVolume)),
      ),
      reason: `${INTENT_CATEGORY_LABELS[k.intentCategory]?.label ?? k.intentCategory} 의도, 갭 점수 ${k.gapScore}점, 검색량 ${k.searchVolume}으로 콘텐츠 기회가 높음`,
    }));

  const summary: AnalysisSummary = {
    seedKeyword,
    totalKeywords: classifiedKeywords.length,
    totalNodes: nodes.length,
    totalLinks: links.length,
    totalClusters: clusters.length,
    avgGapScore: avgGap,
    topBlueOceans,
    topRising,
    topOpportunities,
    intentDistribution: intentDist,
    temporalDistribution: temporalDist,
    journeyStageDistribution: journeyStageDist,
    analyzedAt: new Date().toISOString(),
    durationMs,
  };

  return { nodes, links, categories, summary, clusters, journey, gapMatrix };
}
