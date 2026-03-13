/**
 * 비로그인 데모 분석 API.
 * 채널 URL을 받아 플랫폼을 감지하고 부분적인 미리보기 데이터를 반환한다.
 * 실제 API 키가 있으면 실데이터, 없으면 플랫폼 기반 샘플 데이터를 반환.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveChannelUrl } from "@/lib/channels/url";
import type { SocialPlatform, ChannelInfo } from "@x2/types";

const SUPPORTED_PLATFORMS: SocialPlatform[] = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
];

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL을 입력해주세요." },
        { status: 400 },
      );
    }

    const result = resolveChannelUrl(url.trim());

    if (!result.isValid || !result.detectedPlatformCode) {
      return NextResponse.json(
        { error: "지원하는 소셜 미디어 URL을 입력해주세요." },
        { status: 400 },
      );
    }

    const platform = result.detectedPlatformCode;
    const channelId = result.channelIdentifier || "unknown";

    // Only attempt real API for supported platforms
    let realData = null;
    if (SUPPORTED_PLATFORMS.includes(platform as SocialPlatform)) {
      try {
        const social = await import("@x2/social");
        const provider = social.createProvider(platform as SocialPlatform);
        if (provider) {
          const info: ChannelInfo = await provider.getChannelInfo(channelId);
          if (info) {
            realData = {
              name: info.name,
              description: null as string | null,
              audienceCount: info.subscriberCount ?? 0,
              totalContents: info.contentCount ?? 0,
              profileImage: info.thumbnailUrl,
            };
          }
        }
      } catch {
        // No API key or provider error — use sample data
      }
    }

    // Generate preview data (partial — to encourage signup)
    const preview = realData || generateSamplePreview(platform, channelId);

    return NextResponse.json({
      platform,
      channelIdentifier: channelId,
      normalizedUrl: result.normalizedUrl,
      preview: {
        ...preview,
        // Partial analysis results (blurred/limited for non-logged-in users)
        metrics: generatePartialMetrics(platform, preview.audienceCount),
        insights: [
          {
            type: "growth",
            text: "이 채널의 성장률과 참여율 분석 결과를 확인하세요",
            locked: true,
          },
          {
            type: "content",
            text: "콘텐츠 전략 최적화 제안을 확인하세요",
            locked: true,
          },
          {
            type: "audience",
            text: "타겟 오디언스 인사이트를 확인하세요",
            locked: true,
          },
        ],
      },
      isReal: !!realData,
    });
  } catch {
    return NextResponse.json(
      { error: "분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

function generateSamplePreview(platform: string, channelId: string) {
  const platformNames: Record<string, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    x: "X (Twitter)",
    threads: "Threads",
    facebook: "Facebook",
  };

  return {
    name: channelId.startsWith("@") ? channelId : `@${channelId}`,
    description: `${platformNames[platform] || platform} 채널`,
    audienceCount: 0,
    totalContents: 0,
    profileImage: null as string | null,
  };
}

function generatePartialMetrics(platform: string, audienceCount: number) {
  const labels: Record<
    string,
    { audience: string; content: string; engagement: string }
  > = {
    youtube: { audience: "구독자", content: "동영상", engagement: "참여율" },
    instagram: { audience: "팔로워", content: "게시물", engagement: "참여율" },
    tiktok: { audience: "팔로워", content: "동영상", engagement: "참여율" },
    x: { audience: "팔로워", content: "트윗", engagement: "참여율" },
  };

  const l = labels[platform] ?? labels.youtube!;

  return [
    {
      label: l.audience,
      value: audienceCount > 0 ? formatCount(audienceCount) : "???",
      locked: audienceCount === 0,
    },
    { label: l.content, value: "???", locked: true },
    { label: l.engagement, value: "???", locked: true },
    { label: "성장률(30일)", value: "???", locked: true },
    { label: "평균 조회수", value: "???", locked: true },
    { label: "콘텐츠 빈도", value: "???", locked: true },
  ];
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
