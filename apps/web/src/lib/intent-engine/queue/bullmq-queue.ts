/**
 * BullMQ Queue Integration (Server-only)
 *
 * 이 파일은 API route에서만 import하세요.
 * 클라이언트 컴포넌트에서 import하면 빌드 에러가 발생합니다.
 */

interface BullMQComponents {
  queue: any;
  worker: any;
  queueEvents: any;
}

export async function createBullMQQueue(
  processFn: (job: any) => Promise<any>,
): Promise<BullMQComponents | null> {
  try {
    const bullmq = await import("bullmq");

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: parseInt(url.port || "6379", 10),
      password: url.password || undefined,
    };

    const queue = new bullmq.Queue("intent-analysis", { connection });

    const worker = new bullmq.Worker(
      "intent-analysis",
      async (job: unknown) => processFn(job),
      { connection, concurrency: 3 },
    );

    const queueEvents = new bullmq.QueueEvents("intent-analysis", { connection });

    queueEvents.on("completed", ({ jobId }: { jobId: string }) => {
      console.log(`[BullMQ] 작업 완료: ${jobId}`);
    });

    queueEvents.on("failed", ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
      console.error(`[BullMQ] 작업 실패: ${jobId} — ${failedReason}`);
    });

    console.log("[intent-engine] BullMQ 큐 초기화 완료 (Redis 연결)");
    return { queue, worker, queueEvents };
  } catch (error) {
    console.log(
      "[intent-engine] BullMQ를 사용할 수 없습니다. 인메모리 큐로 폴백합니다.",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function initializeQueue(
  processFn: (job: any) => Promise<any>,
): Promise<{ type: "bullmq" | "in-memory"; components: BullMQComponents | null }> {
  const components = await createBullMQQueue(processFn);
  if (components) return { type: "bullmq", components };
  console.log("[intent-engine] 인메모리 큐 모드로 동작합니다.");
  return { type: "in-memory", components: null };
}
