/**
 * Analysis Result Repository
 *
 * 엔진 실행 결과를 저장/조회하는 공통 리포지토리.
 *
 * 현재: 인메모리 Map 기반 구현 (개발/테스트용)
 * 향후: Prisma → DB 저장으로 전환
 *
 * 저장 대상:
 * - PathfinderResult → JourneyNode[] / JourneyEdge[] / JourneyPath[]
 * - RoadViewResult → RoadStage[]
 * - PersonaViewResult → PersonaProfile[]
 * - ClusterFinderResult → IntentCluster[] / ClusterMembership[]
 *
 * TODO: Prisma schema 정의 후 아래로 교체
 * - SearchPath / SearchPathSequence 테이블
 * - Persona / PersonaKeyword 테이블
 * - KeywordClusterResult 테이블
 * - ConsumerJourney 테이블
 */

import type {
  PersistableAnalysisResult,
  AnalysisResultFilter,
} from "../types";

// ─── In-Memory Store (dev/test) ─────────────────────────────

const store = new Map<string, PersistableAnalysisResult>();

/**
 * 분석 결과 저장
 */
export async function saveAnalysisResult(
  result: PersistableAnalysisResult,
): Promise<{ id: string; savedAt: string }> {
  store.set(result.id, result);

  // TODO: Prisma 저장
  // await prisma.analysisResult.upsert({
  //   where: { id: result.id },
  //   create: { ...result, resultJson: JSON.stringify(result.resultJson) },
  //   update: { resultJson: JSON.stringify(result.resultJson), traceJson: JSON.stringify(result.traceJson) },
  // });

  return { id: result.id, savedAt: new Date().toISOString() };
}

/**
 * 분석 결과 조회 (단건)
 */
export async function getAnalysisResult(
  id: string,
): Promise<PersistableAnalysisResult | null> {
  return store.get(id) ?? null;
}

/**
 * 분석 결과 목록 조회
 */
export async function listAnalysisResults(
  filter: AnalysisResultFilter,
): Promise<PersistableAnalysisResult[]> {
  let results = [...store.values()];

  if (filter.seedKeyword) {
    results = results.filter((r) => r.seedKeyword === filter.seedKeyword);
  }
  if (filter.engine) {
    results = results.filter((r) => r.engine === filter.engine);
  }
  if (filter.batchId) {
    results = results.filter((r) => r.traceJson.batchId === filter.batchId);
  }
  if (filter.since) {
    results = results.filter((r) => r.analyzedAt >= filter.since!);
  }

  results.sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt));

  if (filter.limit) {
    results = results.slice(0, filter.limit);
  }

  return results;
}

/**
 * 특정 키워드의 최신 결과 조회
 */
export async function getLatestResult(
  seedKeyword: string,
  engine: string,
): Promise<PersistableAnalysisResult | null> {
  const results = await listAnalysisResults({
    seedKeyword,
    engine,
    limit: 1,
  });
  return results[0] ?? null;
}

/**
 * 만료된 결과 정리
 */
export async function pruneExpiredResults(): Promise<number> {
  const now = new Date().toISOString();
  let pruned = 0;
  for (const [id, result] of store) {
    if (result.expiresAt && result.expiresAt < now) {
      store.delete(id);
      pruned++;
    }
  }
  return pruned;
}

/**
 * 전체 저장소 크기 (디버그용)
 */
export function getStoreSize(): number {
  return store.size;
}
