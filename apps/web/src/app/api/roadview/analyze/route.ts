/**
 * POST /api/roadview/analyze
 *
 * journey-engine의 analyzeRoadView()를 호출하여 6단계 소비자 여정을 반환한다.
 */

import { NextResponse } from "next/server";
import { analyzeRoadView } from "@/lib/journey-engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seedKeyword, endKeyword } = body;

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

    const result = await analyzeRoadView({
      seedKeyword: seedKeyword.trim(),
      endKeyword: endKeyword?.trim() || undefined,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[/api/roadview/analyze] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: (err as Error).message || "로드뷰 분석 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
