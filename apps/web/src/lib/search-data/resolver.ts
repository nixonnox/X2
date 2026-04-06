/**
 * Search Connector Resolver
 *
 * 여러 어댑터에서 데이터를 수집하고 통합된 NormalizedSearchAnalyticsPayload를 반환한다.
 * 각 어댑터는 독립적으로 실패할 수 있으며, partial result를 반환한다.
 *
 * 동작 흐름:
 * 1. Registry에서 활성 어댑터 조회
 * 2. capability별 최적 어댑터 선택
 * 3. 병렬 수집 (Promise.allSettled)
 * 4. 결과 통합 + 정규화
 * 5. NormalizedSearchAnalyticsPayload 반환
 */

import { SearchConnectorRegistry } from "./registry";
import type {
  ISearchDataAdapter,
  CollectOptions,
  NormalizedSearchKeyword,
  NormalizedRelatedKeyword,
  NormalizedTrendSeries,
  NormalizedSerpDocument,
  NormalizedSearchIntentCandidate,
  NormalizedSearchAnalyticsPayload,
  SearchDataSource,
  AdapterStatus,
} from "./types";

// ═══════════════════════════════════════════════════════════════
// Resolver
// ═══════════════════════════════════════════════════════════════

/**
 * 모든 활성 어댑터에서 데이터를 수집하고 통합한다.
 */
export async function resolveSearchData(
  seedKeyword: string,
  options: CollectOptions = {},
): Promise<NormalizedSearchAnalyticsPayload> {
  const locale = options.locale ?? "ko";

  // 결과 컨테이너
  let seedData: NormalizedSearchKeyword | undefined;
  const relatedKeywords: NormalizedRelatedKeyword[] = [];
  const trendSeries: NormalizedTrendSeries[] = [];
  const serpDocuments: NormalizedSerpDocument[] = [];
  const intentCandidates: NormalizedSearchIntentCandidate[] = [];
  const sourceMeta: NormalizedSearchAnalyticsPayload["sources"] = [];

  // 1. 검색량 수집 (seed_keyword_volume)
  const volumeAdapters = SearchConnectorRegistry.findByCapability(
    "seed_keyword_volume",
  );
  if (volumeAdapters.length > 0) {
    const result = await collectWithFallback(
      volumeAdapters,
      (adapter) => adapter.collectSeedKeywordData(seedKeyword, options),
      "seed_keyword_volume",
      sourceMeta,
    );
    if (result) seedData = result;
  }

  // 2. 연관 키워드 수집 (병렬)
  const relatedAdapters =
    SearchConnectorRegistry.findByCapability("related_keywords");
  const autocompleteAdapters =
    SearchConnectorRegistry.findByCapability("autocomplete");
  const allRelatedAdapters = deduplicateAdapters([
    ...relatedAdapters,
    ...autocompleteAdapters,
  ]);

  const relatedResults = await collectAllParallel(
    allRelatedAdapters,
    (adapter) => adapter.collectRelatedKeywords(seedKeyword, options),
    "related_keywords",
    sourceMeta,
  );
  for (const result of relatedResults) {
    if (Array.isArray(result)) {
      relatedKeywords.push(...result);
    }
  }

  // 3. 트렌드 수집 (병렬)
  const trendAdapters =
    SearchConnectorRegistry.findByCapability("trend_series");
  const trendResults = await collectAllParallel(
    trendAdapters,
    (adapter) => adapter.collectTrendSeries(seedKeyword, options),
    "trend_series",
    sourceMeta,
  );
  for (const result of trendResults) {
    if (result) trendSeries.push(result);
  }

  // 4. SERP 수집
  const serpAdapters =
    SearchConnectorRegistry.findByCapability("serp_documents");
  const serpResult = await collectWithFallback(
    serpAdapters,
    (adapter) => adapter.collectSerpDocuments(seedKeyword, options),
    "serp_documents",
    sourceMeta,
  );
  if (serpResult) serpDocuments.push(serpResult);

  // 5. 의도 후보 추출 (수집된 데이터에서 파생)
  const intentCandidate = extractIntentCandidates(
    seedKeyword,
    locale,
    relatedKeywords,
    serpDocuments,
  );
  if (intentCandidate) intentCandidates.push(intentCandidate);

  // 6. 저품질 확장 필터링 + 중복 제거
  const filtered = filterLowQualityExpansions(relatedKeywords, seedKeyword);
  const uniqueRelated = deduplicateRelatedKeywords(filtered);

  return {
    seedKeyword,
    locale,
    collectedAt: new Date().toISOString(),
    seedData,
    relatedKeywords: uniqueRelated,
    trendSeries,
    serpDocuments,
    intentCandidates,
    sources: sourceMeta,
  };
}

// ═══════════════════════════════════════════════════════════════
// Fallback 수집 (첫 번째 성공한 어댑터 결과 사용)
// ═══════════════════════════════════════════════════════════════

async function collectWithFallback<T>(
  adapters: ISearchDataAdapter[],
  collector: (adapter: ISearchDataAdapter) => Promise<T | null>,
  capability: string,
  sourceMeta: NormalizedSearchAnalyticsPayload["sources"],
): Promise<T | null> {
  for (const adapter of adapters) {
    const start = Date.now();
    try {
      const result = await collector(adapter);
      sourceMeta.push({
        source: adapter.source,
        status: result ? "ready" : "unavailable",
        itemCount: result ? 1 : 0,
        latencyMs: Date.now() - start,
      });
      if (result) return result;
    } catch {
      sourceMeta.push({
        source: adapter.source,
        status: "error",
        itemCount: 0,
        latencyMs: Date.now() - start,
      });
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// 병렬 수집 (모든 어댑터 동시 실행)
// ═══════════════════════════════════════════════════════════════

async function collectAllParallel<T>(
  adapters: ISearchDataAdapter[],
  collector: (adapter: ISearchDataAdapter) => Promise<T>,
  capability: string,
  sourceMeta: NormalizedSearchAnalyticsPayload["sources"],
): Promise<T[]> {
  const results = await Promise.allSettled(
    adapters.map(async (adapter) => {
      const start = Date.now();
      try {
        const result = await collector(adapter);
        const itemCount = Array.isArray(result)
          ? result.length
          : result
            ? 1
            : 0;
        sourceMeta.push({
          source: adapter.source,
          status: "ready" as AdapterStatus,
          itemCount,
          latencyMs: Date.now() - start,
        });
        return result;
      } catch (err) {
        sourceMeta.push({
          source: adapter.source,
          status: "error" as AdapterStatus,
          itemCount: 0,
          latencyMs: Date.now() - start,
        });
        throw err;
      }
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<T>> => r.status === "fulfilled",
    )
    .map((r) => r.value);
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

function deduplicateAdapters(
  adapters: ISearchDataAdapter[],
): ISearchDataAdapter[] {
  const seen = new Set<SearchDataSource>();
  return adapters.filter((a) => {
    if (seen.has(a.source)) return false;
    seen.add(a.source);
    return true;
  });
}

function deduplicateRelatedKeywords(
  keywords: NormalizedRelatedKeyword[],
): NormalizedRelatedKeyword[] {
  const seen = new Map<string, NormalizedRelatedKeyword>();
  for (const kw of keywords) {
    // Normalize: trim, lowercase, collapse whitespace
    const normalized = kw.normalizedKeyword
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const existing = seen.get(normalized);
    if (
      !existing ||
      (kw.avgMonthlySearches ?? 0) > (existing.avgMonthlySearches ?? 0)
    ) {
      seen.set(normalized, kw);
    }
  }
  return [...seen.values()];
}

/**
 * 저품질 키워드 확장을 필터링한다.
 * - 시드 키워드에 일반적인 접미사만 붙인 변형 제거
 * - 동일 단어가 반복되는 키워드 제거
 * - 너무 짧은 키워드 제거
 */
function filterLowQualityExpansions(
  keywords: NormalizedRelatedKeyword[],
  seedKeyword: string,
): NormalizedRelatedKeyword[] {
  const seedNorm = seedKeyword.trim().toLowerCase();

  return keywords.filter((kw) => {
    const kwNorm = kw.keyword.trim().toLowerCase();

    // 너무 짧은 키워드 제거 (공백 제외 2자 미만)
    if (kwNorm.replace(/\s/g, "").length < 2) return false;

    // 시드와 완전 동일하면 제거
    if (kwNorm === seedNorm) return false;

    // 동일 단어 반복 제거 (e.g., "추천 추천")
    const words = kwNorm.split(/\s+/);
    if (new Set(words).size < words.length) return false;

    // 시드 키워드 + 일반적 접미사만 붙인 저품질 확장 제거
    const diff = kwNorm.replace(seedNorm, "").trim();
    const genericSuffixes = [
      "추천",
      "외",
      "심화",
      "기타",
      "등",
      "관련",
      "종류",
    ];
    if (diff && genericSuffixes.includes(diff)) return false;

    return true;
  });
}

function extractIntentCandidates(
  seedKeyword: string,
  locale: string,
  relatedKeywords: NormalizedRelatedKeyword[],
  serpDocuments: NormalizedSerpDocument[],
): NormalizedSearchIntentCandidate | null {
  const allKeywords = relatedKeywords.map((kw) => kw.keyword);
  const allQuestions = serpDocuments.flatMap((doc) => doc.peopleAlsoAsk);
  const sources = [...new Set(relatedKeywords.map((kw) => kw.source))];

  const questionPatterns = allKeywords.filter((kw) =>
    /\?|어떻|왜|어디|언제|how|what|why|which/.test(kw),
  );
  const comparisonSignals = allKeywords.filter((kw) =>
    /vs|비교|차이|versus|대안|대체/.test(kw),
  );
  const actionSignals = allKeywords.filter((kw) =>
    /구매|주문|신청|가입|buy|order|subscribe/.test(kw),
  );

  const intentSignals: NormalizedSearchIntentCandidate["intentSignals"] = [];

  if (questionPatterns.length > 0) {
    intentSignals.push({
      signal: `${questionPatterns.length}개 질문형 키워드 발견`,
      type: "question",
      confidence: Math.min(1.0, questionPatterns.length / 10),
    });
  }
  if (comparisonSignals.length > 0) {
    intentSignals.push({
      signal: `${comparisonSignals.length}개 비교형 키워드 발견`,
      type: "comparison",
      confidence: Math.min(1.0, comparisonSignals.length / 5),
    });
  }
  if (actionSignals.length > 0) {
    intentSignals.push({
      signal: `${actionSignals.length}개 행동형 키워드 발견`,
      type: "action",
      confidence: Math.min(1.0, actionSignals.length / 5),
    });
  }

  if (intentSignals.length === 0 && allQuestions.length === 0) return null;

  return {
    keyword: seedKeyword,
    locale,
    sources,
    intentSignals,
    questionPatterns: [...questionPatterns, ...allQuestions].slice(0, 20),
    comparisonSignals: comparisonSignals.slice(0, 10),
    actionSignals: actionSignals.slice(0, 10),
  };
}
