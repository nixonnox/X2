"use client";

import {
  Wifi,
  WifiOff,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Clock,
  Loader2,
} from "lucide-react";

type ProviderStatus = {
  provider: string;
  platform: string;
  isConnected: boolean;
  isAvailable: boolean;
  lastFetchedAt: string | null;
  mentionCount: number;
  error?: string;
};

type TopicSignal = {
  topic: string;
  mentionCount: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  trend: string;
  isNew: boolean;
};

type LiveMention = {
  id: string;
  platform: string;
  text: string;
  authorName: string | null;
  authorHandle: string | null;
  sentiment: string | null;
  publishedAt: string;
};

type LiveMentionData = {
  mentions: LiveMention[];
  totalCount: number;
  buzzLevel: string;
  topicSignals: TopicSignal[];
  providerStatuses: ProviderStatus[];
  freshness: string;
  coverage: { connectedProviders: number; totalProviders: number; isPartial: boolean };
  warnings: string[];
  collectedAt: string;
};

type Props = {
  liveMentionData: LiveMentionData | null;
  isLoading: boolean;
  keyword: string;
};

const buzzConfig: Record<string, { label: string; color: string; bg: string }> = {
  HIGH: { label: "활발", color: "text-emerald-700", bg: "bg-emerald-100" },
  MODERATE: { label: "보통", color: "text-blue-700", bg: "bg-blue-100" },
  LOW: { label: "저조", color: "text-gray-600", bg: "bg-gray-100" },
  NONE: { label: "없음", color: "text-gray-400", bg: "bg-gray-50" },
};

const sentimentColors: Record<string, string> = {
  POSITIVE: "text-emerald-600",
  NEUTRAL: "text-gray-500",
  NEGATIVE: "text-red-600",
  UNCLASSIFIED: "text-amber-500",
};

export function LiveMentionStatusPanel({
  liveMentionData,
  isLoading,
  keyword,
}: Props) {
  if (isLoading) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500 mb-2" />
        <p className="text-sm text-gray-500">
          &apos;{keyword}&apos; 실시간 반응을 모으고 있어요
        </p>
      </div>
    );
  }

  if (!liveMentionData) {
    return (
      <div className="card p-6 text-center">
        <WifiOff className="mx-auto h-8 w-8 text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">
          실시간 반응 데이터가 아직 없어요
        </p>
        <p className="mt-1 text-[11px] text-gray-400">
          키워드를 분석하면 소셜 반응이 자동으로 모여요.
        </p>
      </div>
    );
  }

  const buzz = buzzConfig[liveMentionData.buzzLevel] ?? buzzConfig.NONE!;
  const coverage = liveMentionData.coverage;

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="총 멘션"
          value={liveMentionData.totalCount.toLocaleString()}
          subtext="건"
        />
        <StatCard
          label="반응 활동"
          value={buzz.label}
          className={`${buzz.bg} ${buzz.color}`}
        />
        <StatCard
          label="데이터 연결"
          value={`${coverage.connectedProviders}/${coverage.totalProviders}`}
          subtext="연결"
          warn={coverage.isPartial}
        />
        <StatCard
          label="토픽"
          value={String(liveMentionData.topicSignals.length)}
          subtext="개 감지"
        />
      </div>

      {/* Sentiment breakdown */}
      {liveMentionData.mentions.length > 0 && (() => {
        let pos = 0, neu = 0, neg = 0, unc = 0;
        for (const m of liveMentionData.mentions) {
          if (m.sentiment === "POSITIVE") pos++;
          else if (m.sentiment === "NEGATIVE") neg++;
          else if (m.sentiment === "NEUTRAL") neu++;
          else unc++;
        }
        return (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">긍정 {pos}</span>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-gray-600">중립 {neu}</span>
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">부정 {neg}</span>
            {unc > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-700">미분류 {unc}</span>
            )}
          </div>
        );
      })()}

      {/* Provider coverage */}
      <div className="card p-4 space-y-3">
        <h4 className="text-[12px] font-semibold text-gray-700">
          소셜 플랫폼 연결 상태
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {liveMentionData.providerStatuses.map((p) => (
            <div
              key={p.provider}
              className={`flex items-center gap-2 rounded-lg border p-2.5 transition-all ${
                p.isAvailable
                  ? "border-emerald-200 bg-emerald-50/50"
                  : p.isConnected
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="relative shrink-0">
                {p.isAvailable ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </>
                ) : (
                  <WifiOff className="h-3.5 w-3.5 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-800 truncate">
                  {p.platform}
                </p>
                <p className={`text-[9px] ${p.isAvailable ? "text-emerald-600 font-medium" : "text-gray-500"}`}>
                  {p.isAvailable
                    ? `${p.mentionCount}건 실시간 연결`
                    : p.error ?? "미연결"}
                </p>
              </div>
              {p.isAvailable && p.mentionCount > 0 && (
                <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 tabular-nums">
                  {p.mentionCount}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Freshness */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <Clock className="h-3 w-3" />
          <span>
            마지막 업데이트:{" "}
            {new Date(liveMentionData.collectedAt).toLocaleString("ko-KR")}
          </span>
          {liveMentionData.freshness === "no_data" && (
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[9px]">
              데이터 없음
            </span>
          )}
        </div>
      </div>

      {/* Warnings */}
      {liveMentionData.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
          {liveMentionData.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Topic signals */}
      {liveMentionData.topicSignals.length > 0 && (
        <div className="card p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
            <TrendingUp className="h-3.5 w-3.5" />
            주요 토픽
          </h4>
          <div className="space-y-2">
            {liveMentionData.topicSignals.slice(0, 10).map((ts) => {
              const total =
                ts.sentimentBreakdown.positive +
                ts.sentimentBreakdown.neutral +
                ts.sentimentBreakdown.negative;
              const posPct =
                total > 0
                  ? Math.round((ts.sentimentBreakdown.positive / total) * 100)
                  : 0;
              const negPct =
                total > 0
                  ? Math.round((ts.sentimentBreakdown.negative / total) * 100)
                  : 0;

              return (
                <div key={ts.topic} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-gray-800">
                    {ts.topic}
                  </span>
                  <span className="text-[10px] text-gray-500 tabular-nums">
                    {ts.mentionCount}건
                  </span>
                  {/* Sentiment bar */}
                  <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="bg-emerald-400"
                      style={{ width: `${posPct}%` }}
                    />
                    <div
                      className="bg-red-400"
                      style={{ width: `${negPct}%` }}
                    />
                  </div>
                  {ts.isNew && (
                    <span className="rounded bg-blue-100 px-1 text-[8px] font-semibold text-blue-600">
                      신규
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent mentions */}
      {liveMentionData.mentions.length > 0 && (
        <div className="card p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
            <MessageSquare className="h-3.5 w-3.5" />
            최근 반응
          </h4>
          <div className="space-y-2">
            {liveMentionData.mentions.slice(0, 8).map((m) => (
              <div
                key={m.id}
                className="rounded-lg bg-gray-50 p-3"
              >
                <div className="mb-1 flex items-center gap-2 text-[10px]">
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 font-medium text-gray-600">
                    {m.platform}
                  </span>
                  <span
                    className={`font-medium ${m.sentiment ? (sentimentColors[m.sentiment] ?? "text-amber-500") : "text-amber-500"}`}
                  >
                    {m.sentiment === "POSITIVE"
                      ? "긍정"
                      : m.sentiment === "NEGATIVE"
                        ? "부정"
                        : m.sentiment === "NEUTRAL"
                          ? "중립"
                          : "미분류"}
                  </span>
                  <span className="ml-auto text-gray-400">
                    {new Date(m.publishedAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-gray-700">
                  {m.text}
                </p>
                {m.authorHandle && (
                  <p className="mt-1 text-[9px] text-gray-400">
                    @{m.authorHandle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  className,
  warn,
}: {
  label: string;
  value: string;
  subtext?: string;
  className?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${className ?? ""}`}
    >
      <p className="text-[10px] font-medium text-gray-500">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-lg font-bold text-gray-900">{value}</p>
        {subtext && (
          <span className="text-[11px] text-gray-500">{subtext}</span>
        )}
        {warn && (
          <AlertTriangle className="ml-auto h-3 w-3 text-amber-500" />
        )}
      </div>
    </div>
  );
}
