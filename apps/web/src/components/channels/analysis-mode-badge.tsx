import type { AnalysisMode } from "@/lib/channels/types";
import { getAnalysisModeLabel } from "@/lib/channels/platform-registry";

const MODE_CLASS: Record<AnalysisMode, string> = {
  url_basic: "bg-blue-50 text-blue-700",
  api_advanced: "bg-violet-50 text-violet-700",
  custom_manual: "bg-gray-100 text-gray-600",
};

type Props = {
  mode: AnalysisMode;
};

export function AnalysisModeBadge({ mode }: Props) {
  return (
    <span className={`badge ${MODE_CLASS[mode]}`}>
      {getAnalysisModeLabel(mode)}
    </span>
  );
}
