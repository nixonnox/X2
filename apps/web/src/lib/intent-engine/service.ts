// ─────────────────────────────────────────────────────────────
// Intent Analysis Service — Main Orchestrator (v2)
// ─────────────────────────────────────────────────────────────
// 전체 분석 파이프라인을 조율하는 중앙 서비스
//
// 파이프라인 흐름 (v2):
// 1. 캐시 확인
// 2. Job 생성 → 즉시 Job ID 반환 (비동기)
// 3. 키워드 확장 (keyword-expander)
// 4. 트렌드 집계 (trend-aggregator) — NEW
// 5. 소셜 볼륨 수집 (social-volume-collector)
// 6. 트렌드 데이터 병합 (trendScore, isRising 업데이트)
// 7. 인텐트 분류 (intent-classifier)
// 8. 그래프 빌드 (graph-builder)
// 9. 캐시 저장
// 10. SSE로 결과 push

import type {
  AnalysisRequest,
  AnalysisJob,
  IntentGraphData,
  IntentEngineConfig,
} from "./types";
import { expandKeywords } from "./pipeline/keyword-expander";
import { collectSocialVolumes } from "./pipeline/social-volume-collector";
import { aggregateTrends } from "./pipeline/trend-aggregator";
import { classifyKeywords } from "./classifier/intent-classifier";
import { buildIntentGraph } from "./graph/graph-builder";
import { cacheManager } from "./cache/cache-manager";
import { analysisJobStore, ANALYSIS_STAGES } from "./queue/analysis-queue";

// ── Config ──

const config: IntentEngineConfig = {
  maxDepth: 2,
  maxKeywords: 150,
  defaultPlatforms: ["youtube", "instagram", "tiktok", "naver_blog"],
  cacheTTLMs: 24 * 60 * 60 * 1000, // 24시간
  useLLM: false,
  openaiModel: "gpt-4o",
  openaiApiKey: process.env.OPENAI_API_KEY,
  redisUrl: process.env.REDIS_URL,
  enableClustering: true,
  enableJourneyMapping: true,
  enableSeasonality: true,
};

// ── Main Service ──

export const intentAnalysisService = {
  /**
   * 동기 분석 — 캐시 히트 시 즉시 반환, 미스 시 파이프라인 실행 (블로킹)
   */
  async analyze(request: AnalysisRequest): Promise<IntentGraphData> {
    const cacheKey = cacheManager.buildKey(request.seedKeyword, {
      maxDepth: request.maxDepth,
      maxKeywords: request.maxKeywords,
      platforms: request.platforms,
    });

    // 캐시 확인
    if (!request.forceRefresh) {
      const cached = await cacheManager.get<IntentGraphData>(cacheKey);
      if (cached) return cached;
    }

    // 파이프라인 실행
    const result = await runPipeline(request);

    // 캐시 저장
    await cacheManager.set(cacheKey, result, config.cacheTTLMs);

    return result;
  },

  /**
   * 비동기 분석 — Job ID 즉시 반환, 백그라운드에서 파이프라인 실행
   * SSE로 진행 상태를 실시간 push
   */
  async analyzeAsync(request: AnalysisRequest): Promise<AnalysisJob> {
    const cacheKey = cacheManager.buildKey(request.seedKeyword, {
      maxDepth: request.maxDepth,
      maxKeywords: request.maxKeywords,
      platforms: request.platforms,
    });

    // 캐시 확인
    if (!request.forceRefresh) {
      const cached = await cacheManager.get<IntentGraphData>(cacheKey);
      if (cached) {
        const job = analysisJobStore.createJob(request);
        analysisJobStore.updateJob(job.id, {
          status: "completed",
          progress: 100,
          statusMessage: "캐시에서 결과를 반환합니다.",
          result: cached,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
        return analysisJobStore.getJob(job.id)!;
      }
    }

    // Job 생성
    const job = analysisJobStore.createJob(request);

    // 백그라운드 실행 (non-blocking)
    runPipelineAsync(job.id, request, cacheKey).catch((err) => {
      analysisJobStore.updateJob(job.id, {
        status: "failed",
        error: (err as Error).message,
        statusMessage: "분석 중 오류가 발생했습니다.",
        completedAt: new Date().toISOString(),
      });
    });

    return job;
  },

  /** Job 상태 조회 */
  getJob(jobId: string): AnalysisJob | undefined {
    return analysisJobStore.getJob(jobId);
  },

  /** SSE 리스너 등록 */
  subscribe(
    jobId: string,
    listener: (event: { type: string; data: unknown }) => void,
  ): () => void {
    return analysisJobStore.subscribe(jobId, listener);
  },

  /** 캐시 통계 */
  cacheStats() {
    return cacheManager.stats();
  },

  /** 큐 통계 */
  queueStats() {
    return analysisJobStore.getStats();
  },

  /** 최근 작업 목록 */
  recentJobs(limit = 20) {
    return analysisJobStore.getRecentJobs(limit);
  },

  /** 특정 시드 키워드에 대한 캐시 무효화 */
  async invalidateCache(seedKeyword: string): Promise<void> {
    const key = cacheManager.buildKey(seedKeyword);
    await cacheManager.invalidate(key);
  },
};

// ── 동기 파이프라인 실행 ──

async function runPipeline(request: AnalysisRequest): Promise<IntentGraphData> {
  const startTime = Date.now();
  const maxDepth = request.maxDepth ?? config.maxDepth;
  const maxKeywords = request.maxKeywords ?? config.maxKeywords;
  const platforms = request.platforms ?? config.defaultPlatforms;

  // Step 1: 키워드 확장
  const expandedKeywords = await expandKeywords(
    request.seedKeyword,
    maxDepth,
    maxKeywords,
  );

  // Step 2: 트렌드 집계
  const trendMap = await aggregateTrends(
    expandedKeywords.map((k) => k.keyword),
  );

  // Step 3: 소셜 볼륨 수집
  const socialVolumes = await collectSocialVolumes(
    expandedKeywords.map((k) => k.keyword),
    platforms,
  );

  // Step 4: 트렌드 데이터를 확장 키워드에 병합
  const mergedKeywords = expandedKeywords.map((kw) => {
    const trend = trendMap.get(kw.keyword);
    if (!trend) return kw;
    return {
      ...kw,
      trendScore: trend.trendScore,
      isRising: trend.isBreakout || trend.overallTrend === "rising",
    };
  });

  // Step 5: 인텐트 분류
  const classifiedKeywords = await classifyKeywords(
    mergedKeywords,
    socialVolumes,
    request.seedKeyword,
    {
      useLLM: request.useLLM ?? config.useLLM,
      openaiApiKey: config.openaiApiKey,
      openaiModel: config.openaiModel,
    },
  );

  // Step 6: 그래프 빌드
  const durationMs = Date.now() - startTime;
  return buildIntentGraph(
    classifiedKeywords,
    mergedKeywords,
    request.seedKeyword,
    durationMs,
  );
}

// ── 비동기 파이프라인 실행 (진행 상태 업데이트 포함) ──

async function runPipelineAsync(
  jobId: string,
  request: AnalysisRequest,
  cacheKey: string,
): Promise<void> {
  const startTime = Date.now();
  const maxDepth = request.maxDepth ?? config.maxDepth;
  const maxKeywords = request.maxKeywords ?? config.maxKeywords;
  const platforms = request.platforms ?? config.defaultPlatforms;

  /** 단계별 진행 상태 업데이트 헬퍼 */
  const updateStage = (index: number) => {
    const stage = ANALYSIS_STAGES[index];
    if (stage) {
      analysisJobStore.updateJob(jobId, {
        status: stage.status,
        progress: stage.progress,
        statusMessage: stage.message,
      });
    }
  };

  try {
    // Stage 0: 분석 시작
    analysisJobStore.updateJob(jobId, {
      startedAt: new Date().toISOString(),
    });
    updateStage(0);

    // Stage 1-2: 키워드 확장
    updateStage(1);
    const expandedKeywords = await expandKeywords(
      request.seedKeyword,
      maxDepth,
      maxKeywords,
    );
    updateStage(2);

    // Stage 3: 트렌드 집계
    updateStage(3);
    const trendMap = await aggregateTrends(
      expandedKeywords.map((k) => k.keyword),
    );

    // Stage 4-5: 소셜 볼륨 수집
    updateStage(4);
    const socialVolumes = await collectSocialVolumes(
      expandedKeywords.map((k) => k.keyword),
      platforms,
    );
    updateStage(5);

    // 트렌드 데이터를 확장 키워드에 병합
    const mergedKeywords = expandedKeywords.map((kw) => {
      const trend = trendMap.get(kw.keyword);
      if (!trend) return kw;
      return {
        ...kw,
        trendScore: trend.trendScore,
        isRising: trend.isBreakout || trend.overallTrend === "rising",
      };
    });

    // Stage 6-7: 인텐트 분류
    updateStage(6);
    const classifiedKeywords = await classifyKeywords(
      mergedKeywords,
      socialVolumes,
      request.seedKeyword,
      {
        useLLM: request.useLLM ?? config.useLLM,
        openaiApiKey: config.openaiApiKey,
        openaiModel: config.openaiModel,
      },
    );
    updateStage(7);

    // Stage 8: 클러스터 탐지 (그래프 빌드에 포함)
    updateStage(8);

    // Stage 9-10: 그래프 빌드
    updateStage(9);
    const durationMs = Date.now() - startTime;
    const result = buildIntentGraph(
      classifiedKeywords,
      mergedKeywords,
      request.seedKeyword,
      durationMs,
    );
    updateStage(10);

    // 캐시 저장
    await cacheManager.set(cacheKey, result, config.cacheTTLMs);

    // Stage 11: 완료
    analysisJobStore.updateJob(jobId, {
      status: "completed",
      progress: 100,
      statusMessage: `분석 완료 (${result.summary.totalKeywords}개 키워드, ${(durationMs / 1000).toFixed(1)}초 소요)`,
      result,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    // 실패 시 에러 상태 업데이트
    analysisJobStore.updateJob(jobId, {
      status: "failed",
      error: (err as Error).message,
      statusMessage: "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      completedAt: new Date().toISOString(),
    });
  }
}
