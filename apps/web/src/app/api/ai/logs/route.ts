// ─────────────────────────────────────────────────────────────
// GET /api/ai/logs — AI 사용 로그 및 통계 API
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "logs"; // "logs" | "stats" | "cost"
    const taskType = searchParams.get("taskType") ?? undefined;
    const provider = searchParams.get("provider") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const workspaceId = searchParams.get("workspaceId") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const { usageLogger } = await import("@/lib/ai/logging/usage-logger");

    if (type === "stats") {
      const stats = usageLogger.getStats(workspaceId);
      return NextResponse.json({ stats });
    }

    if (type === "cost") {
      const cost = usageLogger.getCostEstimate(workspaceId);
      return NextResponse.json({ cost });
    }

    // 기본: 로그 목록
    const result = usageLogger.getLogs({
      workspaceId,
      taskType: taskType as any,
      provider: provider as any,
      status: status as any,
      limit: Math.min(limit, 200),
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /ai/logs] 오류:", error);
    return NextResponse.json(
      { error: "AI 로그를 조회하는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
