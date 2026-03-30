"use client";

import { TrendingUp, TrendingDown, AlertTriangle, Award, Clock } from "lucide-react";

type IssueEvent = {
  date: string;
  type: "spike" | "drop" | "sentiment_shift" | "new_peak";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  value: number;
  previousValue: number;
};

type Props = {
  events: IssueEvent[];
  hasData: boolean;
  warnings: string[];
};

const TYPE_CONFIG: Record<string, { icon: typeof TrendingUp; color: string; bg: string; border: string }> = {
  spike: { icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  drop: { icon: TrendingDown, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  sentiment_shift: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  new_peak: { icon: Award, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

export function IssueTimeline({ events, hasData, warnings }: Props) {
  if (!hasData || events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-4">
          <Clock className="h-4 w-4 text-violet-500" />
          이슈 히스토리
        </h4>
        <div className="text-center py-8">
          <Clock className="mx-auto h-7 w-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{warnings[0] ?? "특별한 이슈가 감지되지 않았어요"}</p>
          <p className="mt-1 text-xs text-gray-300">데이터가 더 쌓이면 급증/급감/감성 변화를 감지해요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Clock className="h-4 w-4 text-violet-500" />
          이슈 히스토리
        </h4>
        <span className="text-[10px] text-gray-400">{events.length}건 감지</span>
      </div>

      <div className="space-y-2">
        {events.slice(0, 10).map((event, i) => {
          const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.spike!;
          const Icon = config.icon;

          return (
            <div
              key={`${event.date}-${event.type}-${i}`}
              className={`flex items-start gap-3 rounded-lg border p-3 ${config.bg} ${config.border}`}
            >
              <div className={`mt-0.5 shrink-0 ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[12px] font-semibold ${config.color}`}>{event.title}</span>
                  {event.severity === "high" && (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-medium text-red-700">주의</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600">{event.description}</p>
                <span className="text-[10px] text-gray-400">{event.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
