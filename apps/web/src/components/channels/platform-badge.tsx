import {
  Youtube,
  Instagram,
  Music2,
  Twitter,
  AtSign,
  Facebook,
  Linkedin,
  BookOpen,
  Users,
  Globe,
  MoreHorizontal,
} from "lucide-react";
import type { PlatformCode } from "@/lib/channels/types";
import {
  getPlatformColor,
  getPlatformLabel,
} from "@/lib/channels/platform-registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Youtube,
  Instagram,
  Music2,
  Twitter,
  AtSign,
  Facebook,
  Linkedin,
  BookOpen,
  Users,
  Globe,
  MoreHorizontal,
};

const PLATFORM_ICON_KEY: Record<PlatformCode, string> = {
  youtube: "Youtube",
  instagram: "Instagram",
  tiktok: "Music2",
  x: "Twitter",
  threads: "AtSign",
  facebook: "Facebook",
  linkedin: "Linkedin",
  naver_blog: "BookOpen",
  naver_cafe: "Users",
  website: "Globe",
  custom: "MoreHorizontal",
};

type Props = {
  code: PlatformCode;
  customName?: string | null;
  showLabel?: boolean;
};

export function PlatformBadge({ code, customName, showLabel = true }: Props) {
  const iconKey = PLATFORM_ICON_KEY[code] ?? "MoreHorizontal";
  const Icon = ICON_MAP[iconKey] ?? MoreHorizontal;
  const colorClass = getPlatformColor(code);
  const label = customName || getPlatformLabel(code);

  return (
    <span className={`badge gap-1 ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
