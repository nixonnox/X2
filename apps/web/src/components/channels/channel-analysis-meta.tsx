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
      label: "Analysis Period",
      value: "Last 30 days",
    },
    {
      icon: Settings,
      label: "Analysis Mode",
      value: getAnalysisModeLabel(channel.analysisMode),
    },
    {
      icon: Database,
      label: "Data Source",
      value:
        channel.analysisMode === "url_basic"
          ? "Public URL analysis (mock)"
          : channel.analysisMode === "api_advanced"
            ? "Official API"
            : "Manual input",
    },
    {
      icon: Clock,
      label: "Last Analyzed",
      value: snapshotDate
        ? formatDate(snapshotDate)
        : formatDate(channel.updatedAt),
    },
    {
      icon: BarChart2,
      label: "Supported Metrics",
      value: "Audience · Content · Engagement · Growth",
    },
  ];

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Analysis Information
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
