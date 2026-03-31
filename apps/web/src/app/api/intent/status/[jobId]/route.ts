// ─────────────────────────────────────────────────────────────
// GET /api/intent/status/[jobId]
// ─────────────────────────────────────────────────────────────
// 분석 작업 상태 조회

import { NextRequest, NextResponse } from "next/server";
import { intentAnalysisService } from "@/lib/intent-engine/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: "jobId가 필요합니다." }, { status: 400 });
  }

  const job = intentAnalysisService.getJob(jobId);

  if (!job) {
    return NextResponse.json(
      { error: "작업을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    job: {
      id: job.id,
      seedKeyword: job.seedKeyword,
      status: job.status,
      progress: job.progress,
      statusMessage: job.statusMessage,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      // 완료된 경우에만 결과 포함
      ...(job.status === "completed" && { result: job.result }),
    },
  });
}
