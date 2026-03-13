import { NextRequest, NextResponse } from "next/server";
import { syncAllChannels } from "@/lib/channels/sync-service";

/**
 * GET /api/sync/cron
 * 전체 활성 채널 동기화 — Vercel Cron 또는 수동 호출용
 */
export async function GET(req: NextRequest) {
  // Cron secret 검증 — 프로덕션에서는 필수, 미설정 시 요청 거부
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await syncAllChannels();
  return NextResponse.json(result);
}
