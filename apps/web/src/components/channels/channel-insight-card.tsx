import {
  MessageSquare,
  ThumbsUp,
  Lightbulb,
  Target,
  CalendarCheck,
} from "lucide-react";
import type { ChannelInsight } from "@/lib/channels/types";

type Props = {
  insight: ChannelInsight;
};

export function ChannelInsightCards({ insight }: Props) {
  return (
    <div className="space-y-3">
      {/* Summary — full width */}
      <div className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--secondary)]">
            <MessageSquare className="h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
          <h3 className="text-[14px] font-semibold">현재 상태 요약</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          {insight.summary}
        </p>
      </div>

      {/* Strengths + Suggestions grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Strengths */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50">
              <ThumbsUp className="h-4 w-4 text-emerald-600" />
            </div>
            <h3 className="text-[14px] font-semibold">강점</h3>
          </div>
          <ul className="space-y-2">
            {insight.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13px] text-[var(--muted-foreground)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggestions */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50">
              <Lightbulb className="h-4 w-4 text-amber-600" />
            </div>
            <h3 className="text-[14px] font-semibold">개선 제안</h3>
          </div>
          <ul className="space-y-2">
            {insight.suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-[13px] text-[var(--muted-foreground)]"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Competitor note + Next actions */}
      {(insight.competitorNote || insight.nextActions) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {insight.competitorNote && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50">
                  <Target className="h-4 w-4 text-violet-600" />
                </div>
                <h3 className="text-[14px] font-semibold">경쟁 환경</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                {insight.competitorNote}
              </p>
            </div>
          )}

          {insight.nextActions && insight.nextActions.length > 0 && (
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                  <CalendarCheck className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="text-[14px] font-semibold">
                  향후 2주 액션 플랜
                </h3>
              </div>
              <ul className="space-y-2">
                {insight.nextActions.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[13px] text-[var(--muted-foreground)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                    <span className="leading-relaxed">{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
