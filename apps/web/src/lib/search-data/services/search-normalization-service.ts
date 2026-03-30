/**
 * Search Normalization Service
 *
 * NormalizedSearchAnalyticsPayload를 각 엔진의 입력 형식으로 변환한다.
 *
 * 변환 매핑:
 * - IntentEngineInput: 키워드 확장 + 트렌드 → intent-engine
 * - ClusterEngineInput: SERP 기반 키워드 유사도 → cluster-finder
 * - JourneyEngineInput: 연관키워드 + 트렌드 + SERP → pathfinder/roadview
 */

import type {
  NormalizedSearchAnalyticsPayload,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
  NormalizedSerpDocument,
  IntentEngineInput,
  ClusterEngineInput,
  JourneyEngineInput,
  PersonaEngineInput,
  GeoAeoEngineInput,
} from "../types";

// ═══════════════════════════════════════════════════════════════
// Intent Engine Input 변환
// ═══════════════════════════════════════════════════════════════

/**
 * NormalizedSearchAnalyticsPayload → IntentEngineInput
 *
 * intent-engine의 keyword-expander + trend-aggregator를 대체할 수 있는
 * 실데이터 기반 입력을 생성한다.
 */
export function toIntentEngineInput(
  payload: NormalizedSearchAnalyticsPayload,
): IntentEngineInput {
  const { seedKeyword, relatedKeywords, trendSeries } = payload;

  // 트렌드 매핑 (키워드별 트렌드 데이터)
  const trendMap = new Map<string, NormalizedTrendSeries>();
  for (const ts of trendSeries) {
    trendMap.set(ts.keyword.toLowerCase(), ts);
  }

  // 연관 키워드 → expandedKeywords 변환
  const expandedKeywords = relatedKeywords.map((kw, _i) => {
    const trend = trendMap.get(kw.keyword.toLowerCase());
    return {
      keyword: kw.keyword,
      source: mapSourceType(kw.sourceType),
      parentKeyword: kw.parentKeyword,
      depth: kw.parentKeyword === seedKeyword ? 1 : 2,
      searchVolume: kw.avgMonthlySearches ?? 0,
      trend: trend?.overallTrend === "seasonal" ? "stable" as const : (trend?.overallTrend ?? "stable") as "rising" | "stable" | "declining",
      trendScore: trend?.trendScore ?? 0,
      isRising: (trend?.trendScore ?? 0) > 0.1,
    };
  });

  // 트렌드 시계열 → trendData 변환
  const trendData = trendSeries.map((ts) => ({
    keyword: ts.keyword,
    dataPoints: ts.timelineData.map((d) => ({
      period: d.date,
      volume: d.value,
    })),
    trendScore: ts.trendScore,
  }));

  return {
    seedKeyword,
    expandedKeywords,
    trendData,
  };
}

// ═══════════════════════════════════════════════════════════════
// Cluster Engine Input 변환
// ═══════════════════════════════════════════════════════════════

/**
 * NormalizedSearchAnalyticsPayload → ClusterEngineInput
 *
 * SERP 결과의 도메인 겹침(Jaccard similarity)을 계산하여
 * 의미적으로 유사한 키워드를 그룹화하는 데 필요한 입력을 생성한다.
 */
export function toClusterEngineInput(
  payload: NormalizedSearchAnalyticsPayload,
): ClusterEngineInput {
  const { seedKeyword, relatedKeywords, serpDocuments } = payload;

  // 키워드 리스트
  const keywords = relatedKeywords.map((kw) => kw.keyword);

  // SERP 기반 도메인 겹침 계산
  // serpDocuments는 시드 키워드의 SERP만 있으므로
  // 키워드 쌍별 유사도는 향후 배치 SERP 수집 시 계산 가능
  // 현재는 시드 키워드 대비 겹침만 계산
  const serpOverlap = computeSerpOverlap(seedKeyword, keywords, serpDocuments);

  return {
    seedKeyword,
    keywords,
    serpOverlap,
  };
}

/**
 * SERP 도메인 기반 Jaccard similarity 계산
 *
 * 현재는 시드 키워드의 SERP 도메인과 연관 키워드의 이름 기반 추정.
 * 실제 운영 시에는 각 연관 키워드의 SERP도 수집하여 쌍별 비교 필요.
 */
function computeSerpOverlap(
  seedKeyword: string,
  keywords: string[],
  serpDocuments: NormalizedSerpDocument[],
): ClusterEngineInput["serpOverlap"] {
  if (serpDocuments.length === 0) return [];

  // 시드 키워드의 도메인 집합
  const seedDoc = serpDocuments.find(
    (doc) => doc.keyword.toLowerCase() === seedKeyword.toLowerCase(),
  );
  if (!seedDoc) return [];

  // 각 키워드와 시드 간의 추정 유사도
  // (실제로는 키워드별 SERP를 수집해야 정확한 Jaccard 계산 가능)
  // 현재는 키워드가 시드 SERP 타이틀/스니펫에 등장하는지로 기초 추정
  const results: ClusterEngineInput["serpOverlap"] = [];

  for (let i = 0; i < keywords.length; i++) {
    for (let j = i + 1; j < Math.min(keywords.length, i + 10); j++) {
      // 같은 SERP에서 발견된 키워드 쌍은 유사도 높음
      const kwA = keywords[i]!.toLowerCase();
      const kwB = keywords[j]!.toLowerCase();

      const domainsA = estimateDomainsForKeyword(kwA, seedDoc);
      const domainsB = estimateDomainsForKeyword(kwB, seedDoc);

      const shared = domainsA.filter((d) => domainsB.includes(d));
      const union = [...new Set([...domainsA, ...domainsB])];
      const similarity = union.length > 0 ? shared.length / union.length : 0;

      if (similarity > 0) {
        results.push({
          keywordA: keywords[i]!,
          keywordB: keywords[j]!,
          sharedDomains: shared,
          similarity: Math.round(similarity * 100) / 100,
        });
      }
    }
  }

  return results;
}

/**
 * 시드 SERP에서 특정 키워드와 관련된 도메인 추정
 */
function estimateDomainsForKeyword(
  keyword: string,
  seedDoc: NormalizedSerpDocument,
): string[] {
  return seedDoc.organicResults
    .filter(
      (r) =>
        r.title.toLowerCase().includes(keyword) ||
        r.snippet.toLowerCase().includes(keyword),
    )
    .map((r) => r.domain);
}

// ═══════════════════════════════════════════════════════════════
// Journey Engine Input 변환
// ═══════════════════════════════════════════════════════════════

/**
 * NormalizedSearchAnalyticsPayload → JourneyEngineInput
 *
 * pathfinder/roadview 엔진이 필요로 하는 연관 키워드, 트렌드, SERP를
 * 그대로 전달한다 (이미 normalized 형태이므로 변환 최소화).
 */
export function toJourneyEngineInput(
  payload: NormalizedSearchAnalyticsPayload,
): JourneyEngineInput {
  return {
    seedKeyword: payload.seedKeyword,
    relatedKeywords: payload.relatedKeywords,
    trendSeries: payload.trendSeries,
    serpDocuments: payload.serpDocuments,
  };
}

// ═══════════════════════════════════════════════════════════════
// Persona Engine Input 변환
// ═══════════════════════════════════════════════════════════════

/**
 * NormalizedSearchAnalyticsPayload → PersonaEngineInput
 *
 * 연관 키워드의 행동 패턴 시그널을 추출하고,
 * 트렌드 데이터에서 관심 변화 패턴을 생성한다.
 *
 * 참고: keywordGroups는 cluster-engine 출력에서 채워야 하므로
 * 여기서는 빈 배열로 초기화. 호출자가 클러스터 결과를 주입해야 함.
 */
export function toPersonaEngineInput(
  payload: NormalizedSearchAnalyticsPayload,
): PersonaEngineInput {
  const { seedKeyword, relatedKeywords, trendSeries, serpDocuments } = payload;

  // 행동 시그널 추출 (연관 키워드 + PAA에서 파생)
  const allPaaQuestions = serpDocuments.flatMap((doc) => doc.peopleAlsoAsk);
  const questionPatterns = relatedKeywords
    .filter((kw) => kw.sourceType === "question" || kw.sourceType === "paa")
    .map((kw) => kw.keyword);

  const comparisonSignals = relatedKeywords
    .filter((kw) => /vs|비교|차이|versus|대안|대체/.test(kw.keyword))
    .map((kw) => kw.keyword);

  const actionSignals = relatedKeywords
    .filter((kw) => /구매|주문|신청|가입|buy|order|subscribe|후기|리뷰/.test(kw.keyword))
    .map((kw) => kw.keyword);

  const behaviorSignals: PersonaEngineInput["behaviorSignals"] = [{
    keyword: seedKeyword,
    questionPatterns: [...questionPatterns, ...allPaaQuestions].slice(0, 20),
    comparisonSignals: comparisonSignals.slice(0, 10),
    actionSignals: actionSignals.slice(0, 10),
    sourceTypes: [...new Set(relatedKeywords.map((kw) => kw.sourceType))],
  }];

  // 트렌드 패턴 추출
  const trendPatterns: PersonaEngineInput["trendPatterns"] = trendSeries.map((ts) => ({
    keyword: ts.keyword,
    overallTrend: ts.overallTrend === "seasonal" ? "stable" as const : ts.overallTrend,
    seasonality: ts.seasonality,
    isBreakout: ts.isBreakout,
  }));

  return {
    seedKeyword,
    keywordGroups: [],  // cluster-engine 결과에서 주입
    behaviorSignals,
    trendPatterns,
  };
}

// ═══════════════════════════════════════════════════════════════
// GEO/AEO Engine Input 변환
// ═══════════════════════════════════════════════════════════════

/**
 * NormalizedSearchAnalyticsPayload → GeoAeoEngineInput
 *
 * SERP 점유 분석 + 콘텐츠 갭을 추출하여
 * 생성형 검색 최적화(GEO/AEO)에 필요한 입력을 생성한다.
 */
export function toGeoAeoEngineInput(
  payload: NormalizedSearchAnalyticsPayload,
): GeoAeoEngineInput {
  const { seedKeyword, serpDocuments } = payload;

  // SERP 점유 분석
  const serpAnalysis: GeoAeoEngineInput["serpAnalysis"] = serpDocuments.map((doc) => {
    const domainPositions = new Map<string, number[]>();
    for (const result of doc.organicResults) {
      const positions = domainPositions.get(result.domain) ?? [];
      positions.push(result.position);
      domainPositions.set(result.domain, positions);
    }

    return {
      keyword: doc.keyword,
      totalOrganicResults: doc.organicResults.length,
      featuredSnippet: doc.featuredSnippet
        ? { domain: extractDomainFromUrl(doc.featuredSnippet.url), snippet: doc.featuredSnippet.snippet }
        : undefined,
      topDomains: [...domainPositions.entries()]
        .map(([domain, positions]) => ({ domain, positions }))
        .sort((a, b) => a.positions[0]! - b.positions[0]!)
        .slice(0, 10),
      paaQuestions: doc.peopleAlsoAsk,
    };
  });

  // 콘텐츠 갭 분석
  const contentGaps: GeoAeoEngineInput["contentGaps"] = [];
  for (const doc of serpDocuments) {
    // Featured snippet이 없으면 기회
    if (!doc.featuredSnippet) {
      contentGaps.push({
        keyword: doc.keyword,
        gapType: "no_snippet",
        opportunity: 0.8,
        relatedQuestions: doc.peopleAlsoAsk.slice(0, 5),
      });
    }
    // PAA가 없으면 기회
    if (doc.peopleAlsoAsk.length === 0) {
      contentGaps.push({
        keyword: doc.keyword,
        gapType: "no_paa",
        opportunity: 0.5,
        relatedQuestions: [],
      });
    }
  }

  // 키워드 메트릭
  const keywordMetrics: GeoAeoEngineInput["keywordMetrics"] = [];
  if (payload.seedData) {
    keywordMetrics.push({
      keyword: payload.seedData.keyword,
      searchVolume: payload.seedData.avgMonthlySearches,
      competitionIndex: payload.seedData.competitionIndex,
      cpc: payload.seedData.cpc,
    });
  }

  return {
    seedKeyword,
    serpAnalysis,
    contentGaps,
    keywordMetrics,
  };
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function mapSourceType(
  sourceType: NormalizedRelatedKeyword["sourceType"],
): string {
  switch (sourceType) {
    case "autocomplete":
      return "autocomplete";
    case "related":
      return "related";
    case "question":
    case "paa":
      return "question";
    case "suggestion":
      return "suggestion";
    default:
      return "related";
  }
}
