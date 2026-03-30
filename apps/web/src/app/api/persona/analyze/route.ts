/**
 * POST /api/persona/analyze
 *
 * 페르소나 뷰 분석 API.
 * persona-cluster-engine의 analyzePersonaView()를 호출한다.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzePersonaView } from "@/lib/persona-cluster-engine";
import type { PersonaViewRequest } from "@/lib/persona-cluster-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      seedKeyword,
      maxPersonas = 6,
      useLLM = false,
    } = body as Partial<PersonaViewRequest> & { seedKeyword?: string };

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

    const request: PersonaViewRequest = {
      seedKeyword: seedKeyword.trim(),
      maxPersonas: Math.min(maxPersonas, 10),
      useLLM,
    };

    const result = await analyzePersonaView(request);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Persona analysis error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "페르소나 분석 중 오류가 발생했습니다.",
        details: (err as Error).message,
      },
      { status: 500 },
    );
  }
}
