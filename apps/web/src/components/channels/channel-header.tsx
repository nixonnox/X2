import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Pencil,
  Trash2,
  Globe,
  Tag,
  Calendar,
} from "lucide-react";
import type { Channel } from "@/lib/channels/types";
import { formatRelativeDate } from "@/lib/channels/metric-resolver";
import { PlatformBadge } from "./platform-badge";
import { ChannelStatusBadge } from "./status-badge";
import { AnalysisModeBadge } from "./analysis-mode-badge";
import { ChannelTypeBadge } from "./channel-type-badge";

type Props = {
  channel: Channel;
};

const COUNTRY_LABELS: Record<string, string> = {
  KR: "한국",
  US: "미국",
  JP: "일본",
  VN: "베트남",
  TH: "태국",
  OTHER: "기타",
};

export function ChannelHeader({ channel }: Props) {
  return (
    <div className="space-y-3">
      <Link
        href="/channels"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        채널 목록
      </Link>

      <div className="card p-5">
        {/* Top row: name + actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--secondary)]">
              <PlatformBadge
                code={channel.platformCode}
                customName={channel.customPlatformName}
                showLabel={false}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-[var(--foreground)]">
                  {channel.name}
                </h1>
                <ChannelStatusBadge status={channel.status} />
              </div>
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {channel.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              className="btn-secondary h-7 gap-1 px-2.5 text-[12px]"
              title="수정"
            >
              <Pencil className="h-3 w-3" />
              <span className="hidden sm:inline">수정</span>
            </button>
            <button
              className="btn-secondary h-7 gap-1 px-2.5 text-[12px]"
              title="재분석"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">재분석</span>
            </button>
            <button
              className="btn-secondary h-7 gap-1 px-2.5 text-[12px] text-[var(--destructive)]"
              title="삭제"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Badges row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <PlatformBadge
            code={channel.platformCode}
            customName={channel.customPlatformName}
          />
          <AnalysisModeBadge mode={channel.analysisMode} />
          <ChannelTypeBadge type={channel.channelType} />
          {channel.isCompetitor && (
            <span className="badge bg-red-50 text-[11px] text-red-700">
              경쟁사
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--muted-foreground)]">
          <span className="inline-flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {COUNTRY_LABELS[channel.country] ?? channel.country}
          </span>
          <span>·</span>
          <span>{channel.category}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            업데이트 {formatRelativeDate(channel.updatedAt)}
          </span>
          {channel.tags.length > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {channel.tags.map((tag) => (
                  <span
                    key={tag}
                    className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
