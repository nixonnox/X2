"use client";

import { useState } from "react";
import { Trophy, Eye, ThumbsUp, MessageSquare, TrendingUp, Flame, ExternalLink } from "lucide-react";

// ─── Types ──────────────────────────────────────────

type ChannelRank = {
  rank: number; name: string; platform: string; url: string; thumbnailUrl: string | null;
  subscriberCount: number; totalViews: number; avgEngagement: number; growth: number; viralityScore: number;
};

type ContentRank = {
  rank: number; title: string; url: string; thumbnailUrl: string | null; platform: string;
  channelName: string; publishedAt: string; views: number; likes: number; comments: number;
  engagementScore: number;
};

type Props = {
  channelRankings: ChannelRank[];
  contentRankings: ContentRank[];
  hasChannelData: boolean;
  hasContentData: boolean;
  channelWarnings: string[];
  contentWarnings: string[];
  isLoading: boolean;
};

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const RANK_COLORS = ["text-amber-500", "text-gray-500", "text-orange-400"];

// ─── Component ──────────────────────────────────────

export function RankingPanel({
  channelRankings, contentRankings,
  hasChannelData, hasContentData,
  channelWarnings, contentWarnings, isLoading,
}: Props) {
  const [tab, setTab] = useState<"channel" | "content">("content");

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header + tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Trophy className="h-4 w-4 text-amber-500" />
          랭킹
        </h4>
        <div className="flex gap-1">
          {(["content", "channel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-all ${
                tab === t ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t === "channel" ? "채널" : "콘텐츠"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {/* Content Ranking */}
        {tab === "content" && (
          !hasContentData ? (
            <div className="text-center py-8">
              <Eye className="mx-auto h-6 w-6 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">{contentWarnings[0] ?? "콘텐츠 랭킹 데이터가 아직 없어요"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contentRankings.slice(0, 10).map((c) => (
                <div key={c.rank} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                  <span className={`text-lg font-black w-6 text-center ${RANK_COLORS[c.rank - 1] ?? "text-gray-400"}`}>
                    {c.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{c.channelName}</span>
                      <span className="flex items-center gap-0.5"><Eye className="h-2.5 w-2.5" /> {formatNum(c.views)}</span>
                      <span className="flex items-center gap-0.5"><ThumbsUp className="h-2.5 w-2.5" /> {formatNum(c.likes)}</span>
                      <span className="flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> {formatNum(c.comments)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-violet-600">
                      <Flame className="h-3 w-3" /> {c.engagementScore}%
                    </span>
                  </div>
                  {c.url && (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-blue-500">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        )}

        {/* Channel Ranking */}
        {tab === "channel" && (
          !hasChannelData ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto h-6 w-6 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">{channelWarnings[0] ?? "채널 랭킹 데이터가 아직 없어요"}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {channelRankings.slice(0, 10).map((ch) => (
                <div key={ch.rank} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                  <span className={`text-lg font-black w-6 text-center ${RANK_COLORS[ch.rank - 1] ?? "text-gray-400"}`}>
                    {ch.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{ch.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                      <span>{ch.platform}</span>
                      <span>구독 {formatNum(ch.subscriberCount)}</span>
                      <span>조회 {formatNum(ch.totalViews)}</span>
                      {ch.growth !== 0 && (
                        <span className={ch.growth > 0 ? "text-emerald-600" : "text-red-600"}>
                          <TrendingUp className="inline h-2.5 w-2.5" /> {ch.growth > 0 ? "+" : ""}{ch.growth}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-[12px] font-bold text-gray-800">{ch.viralityScore}</span>
                    </div>
                    <span className="text-[9px] text-gray-400">화제성</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
