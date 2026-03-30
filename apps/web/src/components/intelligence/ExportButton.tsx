"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = {
  projectId: string;
  keyword: string;
  type: "mention_trend" | "channel_trend" | "youtube_summary" | "benchmark_trend";
  days?: number;
  label?: string;
};

export function ExportButton({ projectId, keyword, type, days = 30, label }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const exportQuery = trpc.intelligence.exportData.useQuery(
    { projectId, keyword, type, days },
    { enabled: false }, // Manual trigger
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data?.csv) {
        // Create and download CSV file
        const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
        const blob = new Blob([bom + result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent fail — can add toast later
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !keyword}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
      title={`${label ?? "데이터"} 내려받기`}
    >
      {isExporting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Download className="h-3 w-3" />
      )}
      {label ?? "내려받기"}
    </button>
  );
}
