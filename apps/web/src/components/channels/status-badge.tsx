import type { ChannelStatus } from "@/lib/channels/types";

const STATUS_CONFIG: Record<
  ChannelStatus,
  { label: string; className: string }
> = {
  active: { label: "활성", className: "bg-emerald-50 text-emerald-700" },
  syncing: { label: "동기화 중", className: "bg-amber-50 text-amber-700" },
  error: { label: "오류", className: "bg-red-50 text-red-700" },
  paused: { label: "일시정지", className: "bg-gray-100 text-gray-600" },
};

type Props = {
  status: ChannelStatus;
};

export function ChannelStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
