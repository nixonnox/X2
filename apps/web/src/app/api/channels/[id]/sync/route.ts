import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";
import { syncChannel } from "@/lib/channels/sync-service";

/**
 * POST /api/channels/[id]/sync
 * 단일 채널 데이터 동기화 트리거
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await syncChannel(id);

  const status = result.success
    ? 200
    : result.error?.includes("not configured") ||
        result.error?.includes("not found") ||
        result.error?.includes("Unsupported")
      ? 400
      : 500;

  return NextResponse.json(result, { status });
}
