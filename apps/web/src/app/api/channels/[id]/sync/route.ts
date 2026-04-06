import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";
import { db } from "@x2/db";

/**
 * POST /api/channels/[id]/sync
 * 채널 데이터 동기화 트리거
 * 현재는 API 키 미설정 시 안내 메시지 반환
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

  // DB에서 채널 확인
  const channel = await db.channel.findUnique({
    where: { id },
    select: { id: true, platform: true, url: true, name: true },
  });

  if (!channel) {
    return NextResponse.json(
      { success: false, error: "채널을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // TODO: 실제 API 연동 시 여기서 소셜 플랫폼 API 호출
  // 현재는 기본 등록 상태 유지 (API 키 설정 필요)
  const platformEnvMap: Record<string, string> = {
    YOUTUBE: "YOUTUBE_API_KEY",
    INSTAGRAM: "INSTAGRAM_ACCESS_TOKEN",
    TIKTOK: "TIKTOK_API_KEY",
    X: "TWITTER_BEARER_TOKEN",
  };

  const requiredEnv = platformEnvMap[channel.platform] ?? "API_KEY";
  const isConfigured = !!process.env[requiredEnv];

  if (!isConfigured) {
    return NextResponse.json({
      success: false,
      channelId: id,
      error: `${channel.platform} API 키가 설정되지 않았습니다. .env.local에 ${requiredEnv}를 추가해주세요.`,
      snapshotCreated: false,
      contentsUpdated: 0,
    });
  }

  // API 키가 있으면 실제 동기화 (추후 구현)
  return NextResponse.json({
    success: true,
    channelId: id,
    snapshotCreated: false,
    contentsUpdated: 0,
  });
}
