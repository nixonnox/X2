/**
 * POST /api/pathfinder/analyze
 *
 * journey-engine의 analyzePathfinder()를 호출하여 검색 여정 그래프를 반환한다.
 */

import { NextResponse } from "next/server";
import { analyzePathfinder } from "@/lib/journey-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seedKeyword, maxSteps, maxNodes, direction } = body;

    if (!seedKeyword || typeof seedKeyword !== "string") {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 필수입니다." },
        { status: 400 },
      );
    }

    if (seedKeyword.length > 100) {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 100자 이내여야 합니다." },
        { status: 400 },
      );
    }

    const result = await analyzePathfinder({
      seedKeyword: seedKeyword.trim(),
      maxSteps: Math.min(Math.max(maxSteps ?? 5, 1), 10),
      maxNodes: Math.min(Math.max(maxNodes ?? 300, 10), 1000),
      direction: direction ?? "both",
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[/api/pathfinder/analyze] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "패스파인더 분석 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
