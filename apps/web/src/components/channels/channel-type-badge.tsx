import type { ChannelType } from "@/lib/channels/types";

const TYPE_CONFIG: Record<ChannelType, { label: string; className: string }> = {
  owned: {
    label: "내 채널",
    className: "bg-[var(--secondary)] text-[var(--foreground)]",
  },
  competitor: {
    label: "경쟁사",
    className: "bg-orange-50 text-orange-700",
  },
  monitoring: { label: "모니터링", className: "bg-cyan-50 text-cyan-700" },
};

type Props = {
  type: ChannelType;
};

export function ChannelTypeBadge({ type }: Props) {
  const config = TYPE_CONFIG[type];
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
