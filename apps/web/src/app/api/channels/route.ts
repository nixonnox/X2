import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";
import { channelService } from "@/lib/channels/channel-service";
import { validateChannelForm } from "@/lib/channels/validation";
import { syncChannel } from "@/lib/channels/sync-service";

// GET: 채널 목록 / 단일 채널 조회
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const channel = channelService.getChannel(id);
    return channel
      ? NextResponse.json(channel)
      : NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const channels = channelService.listChannels();
  return NextResponse.json({ count: channels.length, channels });
}

// POST: 채널 등록
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const input = await req.json();

  const validation = validateChannelForm(input);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, errors: validation.errors },
      { status: 400 },
    );
  }

  if (channelService.isDuplicate(input.url)) {
    return NextResponse.json(
      { success: false, error: "이미 등록된 채널 URL입니다." },
      { status: 409 },
    );
  }

  try {
    const channel = channelService.addChannel(input);

    // 자동 데이터 수집 시작 (비동기, 실패해도 채널 등록은 성공)
    syncChannel(channel.id)
      .then((syncResult) => {
        if (syncResult.success) {
          console.log(
            `[Auto-sync] Channel ${channel.id} synced: ${syncResult.contentsUpdated} contents`,
          );
        } else {
          console.log(
            `[Auto-sync] Channel ${channel.id} sync failed: ${syncResult.error}`,
          );
        }
      })
      .catch((err) => {
        console.error(`[Auto-sync] Channel ${channel.id} error:`, err);
      });

    return NextResponse.json({ success: true, channel });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: String(e) },
      { status: 500 },
    );
  }
}
