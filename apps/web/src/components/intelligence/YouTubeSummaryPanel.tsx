"use client";

import { Youtube, Eye, ThumbsUp, MessageSquare, Film, ExternalLink } from "lucide-react";

type YouTubeSummary = {
  totalVideos: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  period: string;
};

type TopContent = {
  text: string;
  authorName: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  url: string | null;
  sentiment: string | null;
};

type Props = {
  summary: YouTubeSummary | null;
  topContent: TopContent[];
  hasData: boolean;
  warnings: string[];
  isLoading: boolean;
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function YouTubeSummaryPanel({ summary, topContent, hasData, warnings, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Youtube className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-800">YouTube 분석</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasData || !summary) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Youtube className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-800">YouTube 분석</h3>
        </div>
        <div className="text-center py-8">
          <Youtube className="mx-auto h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">
            {warnings[0] ?? "YouTube 데이터가 아직 없어요"}
          </p>
          <p className="mt-1 text-xs text-gray-300">
            YouTube API Key를 설정하고 키워드를 분석하면 데이터가 쌓여요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-500" />
          <h3 className="text-sm font-semibold text-gray-800">YouTube 분석</h3>
        </div>
        <span className="text-[10px] text-gray-400">최근 {summary.period}</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Film} label="영상 수" value={formatNumber(summary.totalVideos)} color="text-red-600" />
        <StatCard icon={Eye} label="총 조회수" value={formatNumber(summary.totalViews)} color="text-blue-600" />
        <StatCard icon={ThumbsUp} label="총 좋아요" value={formatNumber(summary.totalLikes)} color="text-emerald-600" />
        <StatCard icon={MessageSquare} label="총 댓글" value={formatNumber(summary.totalComments)} color="text-amber-600" />
      </div>

      {/* Sentiment mini bar */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-gray-500">감성:</span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">긍정 {summary.sentimentBreakdown.positive}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">중립 {summary.sentimentBreakdown.neutral}</span>
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">부정 {summary.sentimentBreakdown.negative}</span>
      </div>

      {/* Top Content */}
      {topContent.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-600 mb-2">인기 콘텐츠</h4>
          <div className="space-y-1.5">
            {topContent.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-gray-800 truncate">{c.text}</p>
                  <div className="flex items-center gap-2 text-[9px] text-gray-400 mt-0.5">
                    {c.authorName && <span>{c.authorName}</span>}
                    <span>조회 {formatNumber(c.viewCount)}</span>
                    <span>좋아요 {formatNumber(c.likeCount)}</span>
                  </div>
                </div>
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-400 hover:text-red-500">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Film; label: string; value: string; color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 text-center">
      <Icon className={`mx-auto h-4 w-4 ${color} mb-1`} />
      <p className="text-lg font-bold text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}
