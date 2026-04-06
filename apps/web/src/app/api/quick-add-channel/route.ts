import { NextRequest, NextResponse } from "next/server";
import { auth } from "@x2/auth";
import { db } from "@x2/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL을 입력해주세요." }, { status: 400 });
  }

  // 사용자의 첫 번째 워크스페이스 → 첫 번째 프로젝트 찾기
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: { include: { projects: { take: 1 } } } },
  });

  if (!membership || membership.workspace.projects.length === 0) {
    return NextResponse.json(
      { error: "프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요." },
      { status: 400 },
    );
  }

  const projectId = membership.workspace.projects[0]!.id;

  // URL에서 플랫폼 자동 감지
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json(
      { error: "올바른 URL 형식이 아닙니다." },
      { status: 400 },
    );
  }

  const hostname = parsedUrl.hostname.replace("www.", "");
  let platform: "YOUTUBE" | "INSTAGRAM" | "TIKTOK" | "X" | "NAVER_BLOG" =
    "NAVER_BLOG";
  let platformChannelId =
    parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ||
    hostname;
  let channelName = platformChannelId;

  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) {
    platform = "YOUTUBE";
    if (parsedUrl.pathname.startsWith("/channel/")) {
      platformChannelId =
        parsedUrl.pathname.split("/channel/")[1]?.split("/")[0] ?? "";
    } else if (parsedUrl.pathname.startsWith("/@")) {
      platformChannelId = parsedUrl.pathname.split("/")[1] ?? "";
    }
    channelName = platformChannelId;
  } else if (hostname.includes("instagram.com")) {
    platform = "INSTAGRAM";
    platformChannelId =
      parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
      "";
    channelName = `@${platformChannelId}`;
  } else if (hostname.includes("tiktok.com")) {
    platform = "TIKTOK";
    platformChannelId =
      parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
      "";
    channelName = platformChannelId;
  } else if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
    platform = "X";
    platformChannelId =
      parsedUrl.pathname.replace(/^\//, "").replace(/\/$/, "").split("/")[0] ??
      "";
    channelName = `@${platformChannelId}`;
  } else {
    channelName = hostname;
    platformChannelId = hostname;
  }

  if (!platformChannelId) {
    return NextResponse.json(
      { error: "URL에서 채널 정보를 추출할 수 없습니다." },
      { status: 400 },
    );
  }

  // 중복 확인
  const existing = await db.channel.findFirst({
    where: { projectId, platform, platformChannelId },
  });
  if (existing) {
    return NextResponse.json(
      { error: "이미 등록된 채널입니다." },
      { status: 409 },
    );
  }

  // 채널 생성
  const channel = await db.channel.create({
    data: {
      projectId,
      platform,
      platformChannelId,
      name: channelName,
      url,
      lastSyncedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, channel });
}
