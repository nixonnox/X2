"use client";

import { useState } from "react";
import { FileText, ExternalLink, ChevronLeft, ChevronRight, Filter, Eye, ThumbsUp, MessageSquare } from "lucide-react";

type RawMention = {
  id: string;
  platform: string;
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  url: string | null;
  publishedAt: string;
  sentiment: string | null;
  topics: string[];
  engagement: { views: number; likes: number; comments: number; shares: number };
};

type Props = {
  mentions: RawMention[];
  total: number;
  page: number;
  totalPages: number;
  hasData: boolean;
  warnings: string[];
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPlatformFilter?: (platform: string | undefined) => void;
  onSentimentFilter?: (sentiment: string | undefined) => void;
};

const SENTIMENT_BADGE: Record<string, { label: string; color: string }> = {
  POSITIVE: { label: "긍정", color: "bg-emerald-100 text-emerald-700" },
  NEGATIVE: { label: "부정", color: "bg-red-100 text-red-700" },
  NEUTRAL: { label: "중립", color: "bg-gray-100 text-gray-600" },
};

const PLATFORM_COLORS: Record<string, string> = {
  YOUTUBE: "bg-red-100 text-red-700",
  INSTAGRAM: "bg-pink-100 text-pink-700",
  TIKTOK: "bg-cyan-100 text-cyan-700",
  X: "bg-blue-100 text-blue-700",
};

export function RawMentionList({
  mentions, total, page, totalPages, hasData, warnings, isLoading,
  onPageChange, onPlatformFilter, onSentimentFilter,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  if (!hasData && !isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center py-10">
        <FileText className="mx-auto h-7 w-7 text-gray-300 mb-2" />
        <p className="text-sm text-gray-400">{warnings[0] ?? "원문 데이터가 아직 없어요"}</p>
        <p className="mt-1 text-xs text-gray-300">키워드를 분석하면 관련 원문이 여기에 나타나요</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <FileText className="h-4 w-4 text-indigo-500" />
          원문 보기
          <span className="text-[10px] text-gray-400 font-normal ml-1">{total}건</span>
        </h4>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] text-gray-500 hover:bg-gray-50"
        >
          <Filter className="h-3 w-3" />
          필터
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex gap-2 border-b border-gray-100 px-5 py-2">
          <select
            onChange={(e) => onPlatformFilter?.(e.target.value || undefined)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px]"
          >
            <option value="">전체 채널</option>
            <option value="YOUTUBE">YouTube</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="TIKTOK">TikTok</option>
            <option value="X">X</option>
          </select>
          <select
            onChange={(e) => onSentimentFilter?.(e.target.value || undefined)}
            className="rounded border border-gray-200 px-2 py-1 text-[11px]"
          >
            <option value="">전체 감성</option>
            <option value="POSITIVE">긍정</option>
            <option value="NEGATIVE">부정</option>
            <option value="NEUTRAL">중립</option>
          </select>
        </div>
      )}

      {/* Mentions */}
      <div className="divide-y divide-gray-50">
        {mentions.map((m) => {
          const sentBadge = SENTIMENT_BADGE[m.sentiment ?? ""];
          const platColor = PLATFORM_COLORS[m.platform] ?? "bg-gray-100 text-gray-600";
          return (
            <div key={m.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-800 leading-relaxed">{m.text}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${platColor}`}>
                      {m.platform}
                    </span>
                    {sentBadge && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${sentBadge.color}`}>
                        {sentBadge.label}
                      </span>
                    )}
                    {m.authorName && <span className="text-[10px] text-gray-400">{m.authorName}</span>}
                    <span className="text-[10px] text-gray-400">
                      {new Date(m.publishedAt).toLocaleDateString("ko-KR")}
                    </span>
                    {m.engagement.views > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                        <Eye className="h-2.5 w-2.5" />{m.engagement.views.toLocaleString()}
                      </span>
                    )}
                    {m.engagement.likes > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-gray-400">
                        <ThumbsUp className="h-2.5 w-2.5" />{m.engagement.likes}
                      </span>
                    )}
                  </div>
                </div>
                {m.url && (
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-blue-500 mt-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-2">
          <span className="text-[10px] text-gray-400">{total}건 중 {((page-1)*20+1)}-{Math.min(page*20,total)}건</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-gray-600 px-2">{page}/{totalPages}</span>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
