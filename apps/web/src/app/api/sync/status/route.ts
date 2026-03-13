import { NextResponse } from "next/server";
import { getApiKeyStatusSummary } from "@/lib/channels/sync-service";

/**
 * GET /api/sync/status
 * API 키 설정 상태 확인
 */
export async function GET() {
  const status = getApiKeyStatusSummary();
  return NextResponse.json(status);
}
