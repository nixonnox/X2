// ─────────────────────────────────────────────────────────────
// GET /api/intent/stream/[jobId]
// ─────────────────────────────────────────────────────────────
// SSE (Server-Sent Events) 스트림
// 분석 진행 상태를 실시간으로 클라이언트에 push

import { NextRequest } from "next/server";
import { intentAnalysisService } from "@/lib/intent-engine/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  const job = intentAnalysisService.getJob(jobId);
  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  // 이미 완료된 경우 즉시 결과 전송
  if (job.status === "completed" || job.status === "failed") {
    const encoder = new TextEncoder();
    const data = JSON.stringify({
      type: job.status === "completed" ? "completed" : "error",
      jobId,
      data: {
        status: job.status,
        progress: job.progress,
        message: job.statusMessage,
        result: job.result,
        error: job.error,
      },
    });

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // 진행 중인 경우 SSE 스트림
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 현재 상태 전송
      const currentData = JSON.stringify({
        type: "progress",
        jobId,
        data: {
          status: job.status,
          progress: job.progress,
          message: job.statusMessage,
        },
      });
      controller.enqueue(encoder.encode(`data: ${currentData}\n\n`));

      // SSE 리스너 등록
      unsubscribe = intentAnalysisService.subscribe(jobId, (event) => {
        try {
          const eventData = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));

          // 완료/실패 시 스트림 종료
          if (event.type === "completed" || event.type === "error") {
            setTimeout(() => {
              try {
                controller.close();
              } catch {
                // Already closed
              }
            }, 100);
          }
        } catch {
          // Controller already closed
        }
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx proxy 버퍼링 비활성화
    },
  });
}
