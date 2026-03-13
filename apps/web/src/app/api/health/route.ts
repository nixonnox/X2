/**
 * 헬스체크 엔드포인트.
 * 배포 후 서버 상태 확인용.
 * GET /api/health → { status: "ok" }
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
