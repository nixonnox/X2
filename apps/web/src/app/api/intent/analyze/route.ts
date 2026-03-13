// ─────────────────────────────────────────────────────────────
// POST /api/intent/analyze
// ─────────────────────────────────────────────────────────────
// 검색 의도 분석 요청 (ListeningMind-grade)
//
// 동기 모드 (mode=sync): 결과를 직접 반환 (캐시 히트 시 <1초)
// 비동기 모드 (mode=async, 기본): Job ID 반환 → SSE로 결과 push

import { NextRequest, NextResponse } from "next/server";
import { intentAnalysisService } from "@/lib/intent-engine";
import type { AnalysisRequest } from "@/lib/intent-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seedKeyword,
      maxDepth = 2,
      maxKeywords = 150,
      platforms,
      useLLM = false,
      forceRefresh = false,
      includeQuestions = true,
      includeSeasonality = true,
      mode = "async",
    } = body as AnalysisRequest & { mode?: "sync" | "async" };

    if (
      !seedKeyword ||
      typeof seedKeyword !== "string" ||
      seedKeyword.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "seedKeyword는 필수입니다." },
        { status: 400 },
      );
    }

    if (seedKeyword.trim().length > 100) {
      return NextResponse.json(
        { error: "seedKeyword는 100자 이하여야 합니다." },
        { status: 400 },
      );
    }

    const request: AnalysisRequest = {
      seedKeyword: seedKeyword.trim(),
      maxDepth: Math.min(maxDepth, 3),
      maxKeywords: Math.min(maxKeywords, 300),
      platforms,
      useLLM,
      forceRefresh,
      includeQuestions,
      includeSeasonality,
    };

    if (mode === "sync") {
      // 동기 모드: 직접 결과 반환
      const result = await intentAnalysisService.analyze(request);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // 비동기 모드: Job ID 반환
    const job = await intentAnalysisService.analyzeAsync(request);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: job.statusMessage,
      // 이미 완료된 경우 (캐시 히트)
      ...(job.status === "completed" && { data: job.result }),
    });
  } catch (err) {
    console.error("Intent analysis error:", err);
    return NextResponse.json(
      {
        error: "분석 요청 처리 중 오류가 발생했습니다.",
        details: (err as Error).message,
      },
      { status: 500 },
    );
  }
}

// GET /api/intent/analyze — 캐시 통계 및 큐 상태 조회
export async function GET() {
  return NextResponse.json({
    cache: intentAnalysisService.cacheStats(),
    queue: intentAnalysisService.queueStats(),
    recentJobs: intentAnalysisService.recentJobs(10),
  });
}
