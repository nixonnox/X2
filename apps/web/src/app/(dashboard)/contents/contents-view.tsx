"use client";

import { useState, useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { PlaySquare, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader, DataTable, EmptyState } from "@/components/shared";

type ContentRow = {
  id: string;
  title: string;
  platform: string;
  platformCode: string;
  channelName: string;
  views: number;
  engagement: number;
  publishedAt: string;
  commentsCount: number;
  contentType: string;
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const col = createColumnHelper<ContentRow>();

function useColumns(t: ReturnType<typeof useTranslations<"contents">>) {
  return useMemo(
    () => [
      col.display({
        id: "thumb",
        header: "",
        cell: () => (
          <div className="flex h-8 w-14 items-center justify-center rounded bg-[var(--secondary)]">
            <PlaySquare className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          </div>
        ),
      }),
      col.accessor("title", {
        header: t("colTitle"),
        cell: (info) => (
          <p className="max-w-xs truncate font-medium">{info.getValue()}</p>
        ),
      }),
      col.accessor("platform", {
        header: t("colPlatform"),
        cell: (info) => (
          <span className="badge bg-[var(--secondary)] text-[var(--muted-foreground)]">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("channelName", {
        header: t("colChannel"),
        cell: (info) => (
          <span className="text-[var(--muted-foreground)]">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("views", {
        header: t("colViews"),
        cell: (info) => fmt(info.getValue()),
      }),
      col.accessor("engagement", {
        header: t("colEngagement"),
        cell: (info) => `${info.getValue()}%`,
      }),
      col.accessor("commentsCount", {
        header: t("colComments"),
        cell: (info) => fmt(info.getValue()),
      }),
      col.accessor("contentType", {
        header: t("colType"),
        cell: (info) => (
          <span className="badge bg-[var(--secondary)] text-[var(--muted-foreground)]">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("publishedAt", {
        header: t("colDate"),
      }),
    ],
    [t],
  );
}

type ContentsViewProps = {
  contents: ContentRow[];
};

export function ContentsView({ contents }: ContentsViewProps) {
  const t = useTranslations("contents");
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const columns = useColumns(t);

  // Unique platforms for filter dropdown
  const platforms = useMemo(() => {
    const set = new Set(contents.map((c) => c.platformCode));
    return Array.from(set).map((code) => {
      const item = contents.find((c) => c.platformCode === code);
      return { code, label: item?.platform ?? code };
    });
  }, [contents]);

  // Filtered data
  const filtered = useMemo(() => {
    let result = contents;
    if (platformFilter) {
      result = result.filter((c) => c.platformCode === platformFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.channelName.toLowerCase().includes(q) ||
          c.platform.toLowerCase().includes(q),
      );
    }
    return result;
  }, [contents, platformFilter, search]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="input h-8 w-full pl-8 pr-3 text-[12px]"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="input h-8 px-3 text-[12px]"
        >
          <option value="">{t("allPlatforms")}</option>
          {platforms.map((p) => (
            <option key={p.code} value={p.code}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PlaySquare}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <DataTable data={filtered} columns={columns} />
      )}
    </div>
  );
}
