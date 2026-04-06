import { Clock, Database, Settings, BarChart2 } from "lucide-react";
import type { Channel } from "@/lib/channels/types";
import { getAnalysisModeLabel } from "@/lib/channels/platform-registry";
import { formatDate } from "@/lib/channels/metric-resolver";

type Props = {
  channel: Channel;
  snapshotDate?: string;
};

export function ChannelAnalysisMeta({ channel, snapshotDate }: Props) {
  const items = [
    {
      icon: Clock,
      label: "분석 기간",
      value: "최근 30일",
    },
    {
      icon: Settings,
      label: "분석 모드",
      value: getAnalysisModeLabel(channel.analysisMode),
    },
    {
      icon: Database,
      label: "데이터 소스",
      value:
        channel.analysisMode === "url_basic"
          ? "공개 URL 분석"
          : channel.analysisMode === "api_advanced"
            ? "공식 API"
            : "수동 입력",
    },
    {
      icon: Clock,
      label: "마지막 분석",
      value: snapshotDate
        ? formatDate(snapshotDate)
        : formatDate(channel.updatedAt),
    },
    {
      icon: BarChart2,
      label: "지원 지표",
      value: "시청자 · 콘텐츠 · 참여 · 성장",
    },
  ];

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        분석 정보
      </h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-2">
            <item.icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {item.label}
              </p>
              <p className="text-[12px] font-medium text-[var(--foreground)]">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
