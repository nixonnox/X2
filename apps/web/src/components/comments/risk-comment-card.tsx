import { ShieldAlert } from "lucide-react";
import type { EnrichedComment } from "@/lib/comments/types";
import { SentimentBadge, RiskBadge, ResponseStatusBadge } from "./badges";
import { PlatformBadge } from "@/components/channels";

type Props = {
  comments: EnrichedComment[];
  onSelect: (comment: EnrichedComment) => void;
};

export function RiskCommentCard({ comments, onSelect }: Props) {
  if (comments.length === 0) {
    return (
      <div className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50">
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <h3 className="text-[13px] font-semibold">High-Risk Comments</h3>
        </div>
        <p className="text-[12px] text-[var(--muted-foreground)]">
          No high-risk comments detected.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
        </div>
        <h3 className="text-[13px] font-semibold">High-Risk Comments</h3>
        <span className="badge bg-red-50 text-[10px] text-red-700">
          {comments.length}
        </span>
      </div>
      <div className="space-y-2">
        {comments.slice(0, 5).map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c)}
            className="cursor-pointer rounded-md border border-red-200 bg-red-50/30 p-3 transition-colors hover:bg-red-50/60"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <PlatformBadge code={c.platformCode} showLabel={false} />
              <span className="text-[12px] font-medium">{c.authorName}</span>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                ·
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)]">
                {c.channelName}
              </span>
            </div>
            <p className="line-clamp-2 text-[12px] text-[var(--foreground)]">
              {c.commentText}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <SentimentBadge sentiment={c.analysis.sentimentLabel} />
              <RiskBadge risk={c.analysis.riskLevel} />
              <ResponseStatusBadge status={c.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
