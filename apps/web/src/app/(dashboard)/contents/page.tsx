import { channelService } from "@/lib/channels/channel-service";
import { ContentsView } from "./contents-view";

export default function ContentsPage() {
  const channels = channelService.listChannels();

  // Collect all contents from all channels, sorted by views descending
  const allContents = channels
    .flatMap((ch) =>
      channelService.getContents(ch.id).map((c) => ({
        id: c.id,
        title: c.title,
        platform: ch.platformLabel,
        platformCode: ch.platformCode,
        channelName: ch.name,
        views: c.viewsOrReach,
        engagement: c.engagementRate,
        publishedAt: c.publishedAt,
        commentsCount: c.commentsCount,
        contentType: c.contentType,
      })),
    )
    .sort((a, b) => b.views - a.views);

  return <ContentsView contents={allContents} />;
}
