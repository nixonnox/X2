/**
 * POST /api/search-intelligence/analyze
 *
 * 통합 검색 인텔리전스 분석 API.
 * 하나의 시드 키워드로 4개 엔진(cluster, persona, pathfinder, roadview)을 실행한다.
 *
 * Request Body:
 * {
 *   seedKeyword: string;          // 필수
 *   engines?: string[];           // 기본: ["cluster", "persona", "pathfinder", "roadview"]
 *   pathfinderOptions?: { maxSteps?, maxNodes?, direction? };
 *   roadviewOptions?: { endKeyword? };
 *   personaOptions?: { maxPersonas?, useLLM? };
 *   clusterOptions?: { maxClusters?, minClusterSize?, clusterMethod?, useLLM? };
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   data: SearchIntelligenceResult;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { runSearchIntelligence } from "@/services/search-intelligence";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 입력 검증
    if (!body.seedKeyword || typeof body.seedKeyword !== "string") {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 필수 문자열입니다" },
        { status: 400 },
      );
    }

    if (body.seedKeyword.length > 100) {
      return NextResponse.json(
        { success: false, error: "seedKeyword는 100자 이하여야 합니다" },
        { status: 400 },
      );
    }

    // 엔진 목록 검증
    const validEngines = ["cluster", "persona", "pathfinder", "roadview"] as const;
    const engines = body.engines ?? [...validEngines];
    for (const e of engines) {
      if (!validEngines.includes(e)) {
        return NextResponse.json(
          { success: false, error: `잘못된 엔진: ${e}. 허용: ${validEngines.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const result = await runSearchIntelligence({
      seedKeyword: body.seedKeyword.trim(),
      locale: body.locale,
      engines,
      pathfinderOptions: body.pathfinderOptions,
      roadviewOptions: body.roadviewOptions,
      personaOptions: body.personaOptions,
      clusterOptions: body.clusterOptions,
      batchId: body.batchId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[search-intelligence] analyze error:", err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
