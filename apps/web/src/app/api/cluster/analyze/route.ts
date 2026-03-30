/**
 * POST /api/cluster/analyze
 *
 * 클러스터 파인더 분석 API.
 * persona-cluster-engine의 analyzeClusterFinder()를 호출한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeClusterFinder } from "@/lib/persona-cluster-engine";
import type { ClusterFinderRequest } from "@/lib/persona-cluster-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seedKeyword,
      maxClusters = 20,
      minClusterSize = 3,
      includeQuestions = true,
      useLLM = false,
    } = body as Partial<ClusterFinderRequest> & { seedKeyword?: string };

    if (!seedKeyword || typeof seedKeyword !== "string" || seedKeyword.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 필수입니다." },
        { status: 400 },
      );
    }

    if (seedKeyword.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 100자 이하여야 합니다." },
        { status: 400 },
      );
    }

    const request: ClusterFinderRequest = {
      seedKeyword: seedKeyword.trim(),
      maxClusters: Math.min(maxClusters, 50),
      minClusterSize: Math.max(minClusterSize, 2),
      includeQuestions,
      useLLM,
    };

    const result = await analyzeClusterFinder(request);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Cluster analysis error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "클러스터 분석 중 오류가 발생했습니다.",
        details: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
