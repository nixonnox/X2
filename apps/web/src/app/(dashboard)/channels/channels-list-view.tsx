"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Tv, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader, EmptyState } from "@/components/shared";
import {
  PlatformBadge,
  ChannelStatusBadge,
  AnalysisModeBadge,
  ChannelTypeBadge,
} from "@/components/channels";
import { formatCount, getEnabledPlatforms } from "@/lib/channels";
import type {
  Channel,
  ChannelSnapshot,
  PlatformCode,
  AnalysisMode,
  ChannelStatus,
  ChannelType,
} from "@/lib/channels";

const ANALYSIS_MODES: { value: AnalysisMode; label: string }[] = [
  { value: "url_basic", label: "기본 분석" },
  { value: "api_advanced", label: "고급 분석" },
  { value: "custom_manual", label: "수동 입력" },
];

const STATUSES: { value: ChannelStatus; label: string }[] = [
  { value: "active", label: "활성" },
  { value: "syncing", label: "동기화 중" },
  { value: "error", label: "오류" },
  { value: "paused", label: "일시정지" },
];

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: "owned", label: "내 채널" },
  { value: "competitor", label: "경쟁사" },
  { value: "monitoring", label: "모니터링" },
];

type Props = {
  initialChannels: Channel[];
  snapshots: Record<string, ChannelSnapshot | undefined>;
};

export function ChannelsListView({ initialChannels, snapshots }: Props) {
  const t = useTranslations("channels");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformCode | "">("");
  const [modeFilter, setModeFilter] = useState<AnalysisMode | "">("");
  const [statusFilter, setStatusFilter] = useState<ChannelStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<ChannelType | "">("");

  const channels = useMemo(() => {
    let result = [...initialChannels];

    if (platformFilter)
      result = result.filter((c) => c.platformCode === platformFilter);
    if (modeFilter)
      result = result.filter((c) => c.analysisMode === modeFilter);
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    if (typeFilter) result = result.filter((c) => c.channelType === typeFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.url.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [
    initialChannels,
    search,
    platformFilter,
    modeFilter,
    statusFilter,
    typeFilter,
  ]);

  const enabledPlatforms = getEnabledPlatforms();

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      >
        <Link href="/channels/new" className="btn-primary">
          <Plus className="h-3.5 w-3.5" />
          {t("addChannel")}
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input h-7 w-48 pl-8 text-[12px]"
          />
        </div>

        <select
          value={platformFilter}
          onChange={(e) =>
            setPlatformFilter(e.target.value as PlatformCode | "")
          }
          className="input h-7 text-[12px]"
        >
          <option value="">전체 플랫폼</option>
          {enabledPlatforms.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value as AnalysisMode | "")}
          className="input h-7 text-[12px]"
        >
          <option value="">전체 분석 방식</option>
          {ANALYSIS_MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ChannelStatus | "")
          }
          className="input h-7 text-[12px]"
        >
          <option value="">전체 상태</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ChannelType | "")}
          className="input h-7 text-[12px]"
        >
          <option value="">전체 유형</option>
          {CHANNEL_TYPES.map((ct) => (
            <option key={ct.value} value={ct.value}>
              {ct.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table or Empty State */}
      {channels.length === 0 ? (
        <EmptyState
          icon={Tv}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            !search &&
            !platformFilter &&
            !modeFilter &&
            !statusFilter &&
            !typeFilter ? (
              <Link href="/channels/new" className="btn-primary">
                <Plus className="h-3.5 w-3.5" />
                {t("emptyAction")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    채널
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    플랫폼
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    분석 방식
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    상태
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    유형
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    구독자
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    콘텐츠
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    최근 분석일
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    참여율
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => {
                  const snap = snapshots[ch.id];
                  return (
                    <tr
                      key={ch.id}
                      className="border-b border-[var(--border-subtle)] transition-colors last:border-0 hover:bg-[var(--secondary)]"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/channels/${ch.id}`}
                          className="font-medium text-[var(--foreground)] hover:underline"
                        >
                          {ch.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <PlatformBadge
                          code={ch.platformCode}
                          customName={ch.customPlatformName}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <AnalysisModeBadge mode={ch.analysisMode} />
                      </td>
                      <td className="px-4 py-2.5">
                        <ChannelStatusBadge status={ch.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <ChannelTypeBadge type={ch.channelType} />
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">
                        {snap && snap.audienceCount != null
                          ? formatCount(snap.audienceCount)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                        {snap && snap.totalContents != null
                          ? formatCount(snap.totalContents)
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                        {snap?.snapshotDate ?? "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--muted-foreground)]">
                        {snap && snap.engagementRate != null
                          ? `${snap.engagementRate}%`
                          : "\u2014"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/channels/${ch.id}`}
                          className="inline-flex items-center gap-1 text-[12px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                        >
                          상세
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
