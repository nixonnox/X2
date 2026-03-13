// ─────────────────────────────────────────────────────────────
// Analysis Queue — BullMQ 지원 + 인메모리 폴백 + SSE
// ─────────────────────────────────────────────────────────────
// BullMQ + Redis가 설치된 환경에서는 분산 큐를 사용하고,
// 설치되지 않은 경우 인메모리 큐로 자동 폴백한다.
//
// SSE 지원:
// - subscribe(jobId, listener) → unsubscribe 함수 반환
// - updateJob 호출 시 자동으로 SSE 이벤트 발행
// - progress / completed / error 이벤트 타입

import type {
  AnalysisJob,
  AnalysisJobStatus,
  AnalysisRequest,
  SSEEvent,
} from "../types";

// ── 분석 단계 정의 (12단계) ──

export const ANALYSIS_STAGES: {
  status: AnalysisJobStatus;
  progress: number;
  message: string;
}[] = [
  { status: "processing", progress: 5, message: "분석을 시작합니다..." },
  {
    status: "expanding_keywords",
    progress: 10,
    message: "키워드를 확장하고 있습니다...",
  },
  {
    status: "expanding_keywords",
    progress: 25,
    message: "자동완성 및 연관 검색어를 수집 중입니다...",
  },
  {
    status: "aggregating_trends",
    progress: 35,
    message: "트렌드 데이터를 집계하고 있습니다...",
  },
  {
    status: "collecting_volumes",
    progress: 45,
    message: "소셜 미디어 볼륨 데이터를 수집 중입니다...",
  },
  {
    status: "collecting_volumes",
    progress: 55,
    message: "플랫폼별 콘텐츠 발행량을 분석 중입니다...",
  },
  {
    status: "classifying_intents",
    progress: 65,
    message: "검색 의도를 분류하고 있습니다...",
  },
  {
    status: "classifying_intents",
    progress: 75,
    message: "소셜 갭 지수를 계산 중입니다...",
  },
  {
    status: "detecting_clusters",
    progress: 82,
    message: "키워드 클러스터를 탐지하고 있습니다...",
  },
  {
    status: "building_graph",
    progress: 90,
    message: "그래프 데이터를 구성하고 있습니다...",
  },
  {
    status: "building_graph",
    progress: 95,
    message: "검색 여정과 콘텐츠 갭 매트릭스를 분석 중입니다...",
  },
  { status: "completed", progress: 100, message: "분석이 완료되었습니다." },
];

// ── SSE 리스너 타입 ──

type SSEListener = (event: SSEEvent) => void;

// ── 분석 작업 저장소 ──

export class AnalysisJobStore {
  private jobs = new Map<string, AnalysisJob>();
  private listeners = new Map<string, Set<SSEListener>>();
  private insertionOrder: string[] = []; // LRU 추적용
  private maxJobs: number;

  constructor(maxJobs = 500) {
    this.maxJobs = maxJobs;
  }

  /** 새 분석 작업 생성 */
  createJob(request: AnalysisRequest): AnalysisJob {
    this.cleanupIfNeeded();

    const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const job: AnalysisJob = {
      id,
      seedKeyword: request.seedKeyword,
      status: "queued",
      progress: 0,
      statusMessage: "분석 작업이 대기열에 추가되었습니다.",
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(id, job);
    this.insertionOrder.push(id);
    return job;
  }

  /** 작업 조회 */
  getJob(id: string): AnalysisJob | undefined {
    return this.jobs.get(id);
  }

  /** 작업 상태 업데이트 + SSE 이벤트 자동 발행 */
  updateJob(
    id: string,
    update: Partial<
      Pick<
        AnalysisJob,
        | "status"
        | "progress"
        | "statusMessage"
        | "result"
        | "error"
        | "startedAt"
        | "completedAt"
      >
    >,
  ): AnalysisJob | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    Object.assign(job, update);

    // SSE 이벤트 자동 발행
    this.emit(id, {
      type:
        job.status === "completed"
          ? "completed"
          : job.status === "failed"
            ? "error"
            : "progress",
      jobId: id,
      data: {
        status: job.status,
        progress: job.progress,
        message: job.statusMessage,
        result:
          job.status === "completed" ? job.result || undefined : undefined,
        error: job.status === "failed" ? job.error || undefined : undefined,
      },
    });

    return job;
  }

  // ── SSE 리스너 관리 ──

  /** SSE 구독 — unsubscribe 함수 반환 */
  subscribe(jobId: string, listener: SSEListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      const set = this.listeners.get(jobId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(jobId);
        }
      }
    };
  }

  /** SSE 이벤트 발행 */
  private emit(jobId: string, event: SSEEvent): void {
    const set = this.listeners.get(jobId);
    if (!set) return;
    for (const listener of set) {
      try {
        listener(event);
      } catch {
        // 리스너 오류 (클라이언트 연결 끊김 등) — 자동 제거
        set.delete(listener);
      }
    }
  }

  // ── 큐 관리 ──

  /** 대기 중 + 처리 중인 작업 목록 */
  getQueuedJobs(): AnalysisJob[] {
    return Array.from(this.jobs.values())
      .filter(
        (j) =>
          j.status === "queued" ||
          j.status === "processing" ||
          j.status === "expanding_keywords" ||
          j.status === "collecting_volumes" ||
          j.status === "aggregating_trends" ||
          j.status === "classifying_intents" ||
          j.status === "detecting_clusters" ||
          j.status === "building_graph",
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  /** 최근 작업 목록 (최신 순) */
  getRecentJobs(limit = 20): AnalysisJob[] {
    return Array.from(this.jobs.values())
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit);
  }

  /** 큐 통계 */
  getStats(): {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const all = Array.from(this.jobs.values());
    const processingStatuses: AnalysisJobStatus[] = [
      "processing",
      "expanding_keywords",
      "collecting_volumes",
      "aggregating_trends",
      "classifying_intents",
      "detecting_clusters",
      "building_graph",
    ];

    return {
      total: all.length,
      queued: all.filter((j) => j.status === "queued").length,
      processing: all.filter((j) => processingStatuses.includes(j.status))
        .length,
      completed: all.filter((j) => j.status === "completed").length,
      failed: all.filter((j) => j.status === "failed").length,
    };
  }

  /** LRU 정리 — maxJobs 초과 시 가장 오래된 완료/실패 작업 제거 */
  private cleanupIfNeeded(): void {
    if (this.jobs.size < this.maxJobs) return;

    // 완료 또는 실패한 작업만 제거 대상
    const removable = this.insertionOrder.filter((id) => {
      const job = this.jobs.get(id);
      return job && (job.status === "completed" || job.status === "failed");
    });

    // 전체의 20% 또는 최소 1개 제거
    const removeCount = Math.max(1, Math.floor(this.maxJobs * 0.2));
    const toRemove = removable.slice(0, removeCount);

    for (const id of toRemove) {
      this.jobs.delete(id);
      this.listeners.delete(id);
    }

    this.insertionOrder = this.insertionOrder.filter(
      (id) => !toRemove.includes(id),
    );
  }
}

// ── BullMQ 통합 (동적 임포트 — 미설치 시 graceful degradation) ──

interface BullMQComponents {
  queue: any;
  worker: any;
  queueEvents: any;
}

/**
 * BullMQ 큐 생성
 * bullmq 패키지가 없거나 Redis 연결에 실패하면 null 반환
 */
export async function createBullMQQueue(
  processFn: (job: any) => Promise<any>,
): Promise<BullMQComponents | null> {
  try {
    // @ts-expect-error -- bullmq is an optional dependency (graceful degradation)
    const bullmq = await import("bullmq");

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
    };

    // 큐 생성
    const queue = new bullmq.Queue("intent-analysis", { connection });

    // 워커 생성 (동시 처리 3개)
    const worker = new bullmq.Worker(
      "intent-analysis",
      async (job: unknown) => {
        return processFn(job);
      },
      {
        connection,
        concurrency: 3,
      },
    );

    // 큐 이벤트 리스너
    const queueEvents = new bullmq.QueueEvents("intent-analysis", {
      connection,
    });

    queueEvents.on("completed", ({ jobId }: { jobId: string }) => {
      console.log(`[BullMQ] 작업 완료: ${jobId}`);
    });

    queueEvents.on(
      "failed",
      ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        console.error(`[BullMQ] 작업 실패: ${jobId} — ${failedReason}`);
      },
    );

    queueEvents.on(
      "progress",
      ({ jobId, data }: { jobId: string; data: any }) => {
        console.log(`[BullMQ] 작업 진행: ${jobId} — ${JSON.stringify(data)}`);
      },
    );

    console.log("[intent-engine] BullMQ 큐 초기화 완료 (Redis 연결)");
    return { queue, worker, queueEvents };
  } catch (error) {
    // bullmq 미설치 또는 Redis 연결 실패 — 정상적 폴백
    console.log(
      "[intent-engine] BullMQ를 사용할 수 없습니다. 인메모리 큐로 폴백합니다.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

/**
 * 큐 초기화
 * BullMQ 연결을 시도하고, 실패 시 인메모리 모드로 동작
 */
export async function initializeQueue(
  processFn: (job: any) => Promise<any>,
): Promise<{
  type: "bullmq" | "in-memory";
  components: BullMQComponents | null;
}> {
  const components = await createBullMQQueue(processFn);

  if (components) {
    return { type: "bullmq", components };
  }

  console.log("[intent-engine] 인메모리 큐 모드로 동작합니다.");
  return { type: "in-memory", components: null };
}

// ── 싱글톤 인스턴스 ──

export const analysisJobStore = new AnalysisJobStore();
