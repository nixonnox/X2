"use client";

import {
  X,
  ExternalLink,
  Heart,
  MessageSquare,
  User,
  Hash,
} from "lucide-react";
import { PlatformBadge } from "@/components/channels";
import type { EnrichedComment } from "@/lib/comments/types";
import {
  SentimentBadge,
  TopicBadge,
  RiskBadge,
  ResponseStatusBadge,
} from "./badges";

type Props = {
  comment: EnrichedComment;
  onClose: () => void;
};

const TONE_LABELS = {
  formal: "Formal",
  friendly: "Friendly",
  "brand-safe": "Brand-safe",
};

export function CommentDetailPanel({ comment, onClose }: Props) {
  const { analysis, replySuggestions } = comment;

  return (
    <div className="card h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
        <h3 className="text-[14px] font-semibold">Comment Detail</h3>
        <button onClick={onClose} className="btn-secondary h-6 w-6 p-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* Comment body */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--secondary)]">
              <User className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold">{comment.authorName}</p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {new Date(comment.postedAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="rounded-md bg-[var(--secondary)] p-3">
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
              {comment.commentText}
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" /> {comment.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {comment.replyCount}
            </span>
          </div>
        </div>

        {/* Source info */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Source
          </h4>
          <div className="flex items-center gap-2">
            <PlatformBadge code={comment.platformCode} />
          </div>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">
              {comment.channelName}
            </span>
            {" · "}
            {comment.contentTitle}
          </p>
        </div>

        {/* Analysis results */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Analysis
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[var(--border)] p-2.5">
              <p className="mb-1 text-[10px] text-[var(--muted-foreground)]">
                Sentiment
              </p>
              <SentimentBadge sentiment={analysis.sentimentLabel} />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Score: {analysis.sentimentScore.toFixed(2)}
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] p-2.5">
              <p className="mb-1 text-[10px] text-[var(--muted-foreground)]">
                Topic
              </p>
              <TopicBadge topic={analysis.topicLabel} />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Confidence: {(analysis.topicConfidence * 100).toFixed(0)}%
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] p-2.5">
              <p className="mb-1 text-[10px] text-[var(--muted-foreground)]">
                Risk Level
              </p>
              <RiskBadge risk={analysis.riskLevel} />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Score: {analysis.riskScore}/100
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] p-2.5">
              <p className="mb-1 text-[10px] text-[var(--muted-foreground)]">
                Response Status
              </p>
              <ResponseStatusBadge status={comment.status} />
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                Priority:{" "}
                <span className="capitalize">{analysis.responsePriority}</span>
              </p>
            </div>
          </div>

          {analysis.needsResponse && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[12px] font-medium text-amber-700">
                Response needed — {analysis.responsePriority} priority
              </p>
            </div>
          )}

          {analysis.faqCandidate && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-[12px] font-medium text-blue-700">
                FAQ candidate — this is a frequently asked question type
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {comment.tags.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {comment.tags.map((tag) => (
                <span
                  key={tag}
                  className="badge gap-0.5 bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]"
                >
                  <Hash className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reply suggestions */}
        {replySuggestions && replySuggestions.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Suggested Replies
            </h4>
            {replySuggestions.suggestions.map((sug) => (
              <div
                key={sug.id}
                className={`rounded-md border p-3 ${sug.recommended ? "border-blue-200 bg-blue-50/50" : "border-[var(--border)]"}`}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className={`badge text-[9px] ${sug.recommended ? "bg-blue-100 text-blue-700" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}
                  >
                    {TONE_LABELS[sug.tone]}
                  </span>
                  {sug.recommended && (
                    <span className="badge bg-blue-100 text-[9px] text-blue-700">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--foreground)]">
                  {sug.text}
                </p>
                <button className="mt-2 text-[11px] font-medium text-blue-600 hover:text-blue-700">
                  Copy reply
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions (UI only) */}
        <div className="space-y-2 border-t border-[var(--border)] pt-2">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Actions
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <button className="btn-secondary h-7 px-2.5 text-[11px]">
              Mark as Reviewed
            </button>
            <button className="btn-secondary h-7 px-2.5 text-[11px]">
              Mark as Responded
            </button>
            <button className="btn-secondary h-7 px-2.5 text-[11px]">
              Dismiss
            </button>
            <button className="btn-secondary h-7 px-2.5 text-[11px]">
              Assign
            </button>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
          >
            View original comment <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
