"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type {
  CommentFilters,
  SentimentLabel,
  TopicLabel,
  RiskLevel,
  ResponseStatus,
} from "@/lib/comments/types";
import type { PlatformCode } from "@/lib/channels/types";

type Props = {
  filters: CommentFilters;
  onChange: (filters: CommentFilters) => void;
  channels: { id: string; name: string; platformCode: string }[];
};

const PLATFORMS: { value: PlatformCode; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "custom", label: "Custom" },
];

const SENTIMENTS: { value: SentimentLabel; label: string }[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const RISK_LEVELS: { value: RiskLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const RESPONSE_STATUSES: { value: ResponseStatus; label: string }[] = [
  { value: "unanswered", label: "Unanswered" },
  { value: "reviewing", label: "Reviewing" },
  { value: "responded", label: "Responded" },
  { value: "dismissed", label: "Dismissed" },
];

const TOPICS: { value: TopicLabel; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "quality", label: "Quality" },
  { value: "delivery", label: "Delivery" },
  { value: "schedule", label: "Schedule" },
  { value: "inquiry", label: "Inquiry" },
  { value: "support", label: "Support" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function CommentFilterBar({ filters, onChange, channels }: Props) {
  const [expanded, setExpanded] = useState(false);

  function update(partial: Partial<CommentFilters>) {
    onChange({ ...filters, ...partial });
  }

  function clearAll() {
    onChange({});
  }

  const hasFilters = Object.values(filters).some(
    (v) => v !== undefined && v !== "",
  );

  return (
    <div className="card space-y-2 p-3">
      {/* Primary row: search + platform + sentiment */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            placeholder="Search comments..."
            className="input h-8 w-full pl-8 text-[12px]"
          />
        </div>

        <select
          value={filters.platform ?? ""}
          onChange={(e) =>
            update({
              platform: (e.target.value || undefined) as
                | PlatformCode
                | undefined,
            })
          }
          className="input h-8 w-[120px] text-[12px]"
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sentiment ?? ""}
          onChange={(e) =>
            update({
              sentiment: (e.target.value || undefined) as
                | SentimentLabel
                | undefined,
            })
          }
          className="input h-8 w-[120px] text-[12px]"
        >
          <option value="">All Sentiment</option>
          {SENTIMENTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={filters.riskLevel ?? ""}
          onChange={(e) =>
            update({
              riskLevel: (e.target.value || undefined) as RiskLevel | undefined,
            })
          }
          className="input h-8 w-[110px] text-[12px]"
        >
          <option value="">All Risk</option>
          {RISK_LEVELS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="btn-secondary h-8 gap-1 px-2.5 text-[12px]"
        >
          <SlidersHorizontal className="h-3 w-3" />
          {expanded ? "Less" : "More"}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="btn-secondary h-8 gap-1 px-2.5 text-[12px] text-[var(--destructive)]"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Expanded row */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-1">
          <select
            value={filters.channelId ?? ""}
            onChange={(e) => update({ channelId: e.target.value || undefined })}
            className="input h-8 w-[160px] text-[12px]"
          >
            <option value="">All Channels</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.name}
              </option>
            ))}
          </select>

          <select
            value={filters.topic ?? ""}
            onChange={(e) =>
              update({
                topic: (e.target.value || undefined) as TopicLabel | undefined,
              })
            }
            className="input h-8 w-[120px] text-[12px]"
          >
            <option value="">All Topics</option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={filters.responseStatus ?? ""}
            onChange={(e) =>
              update({
                responseStatus: (e.target.value || undefined) as
                  | ResponseStatus
                  | undefined,
              })
            }
            className="input h-8 w-[130px] text-[12px]"
          >
            <option value="">All Status</option>
            {RESPONSE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
