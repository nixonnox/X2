"use client";

import { TrendingUp, TrendingDown, Plus, Minus, Equal } from "lucide-react";

type ChangeNode = { word: string; currentCount: number; previousCount: number; change: "new" | "rising" | "declining" | "stable" | "gone" };
type Summary = { new: number; rising: number; declining: number; stable: number; gone: number };

type Props = {
  nodes: ChangeNode[];
  summary: Summary | null;
  periods: { current: string; previous: string } | null;
  hasData: boolean;
  warnings: string[];
};

const CHANGE_CONFIG = {
  new: { label: "신규", icon: Plus, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  rising: { label: "상승", icon: TrendingUp, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  declining: { label: "하락", icon: TrendingDown, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  stable: { label: "유지", icon: Equal, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
  gone: { label: "사라짐", icon: Minus, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200" },
};

export function RelatedKeywordChangePanel({ nodes, summary, periods, hasData, warnings }: Props) {
  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center py-8">
        <p className="text-sm text-gray-400">{warnings[0] ?? "연관어 변화 데이터가 아직 없어요"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800">연관어 변화</h4>
        {periods && <span className="text-[10px] text-gray-400">{periods.previous} → {periods.current}</span>}
      </div>

      {/* Summary badges */}
      {summary && (
        <div className="flex gap-2 text-[10px]">
          {summary.new > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">신규 {summary.new}</span>}
          {summary.rising > 0 && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">상승 {summary.rising}</span>}
          {summary.declining > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">하락 {summary.declining}</span>}
          {summary.gone > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">사라짐 {summary.gone}</span>}
        </div>
      )}

      {/* Nodes */}
      <div className="space-y-1.5">
        {nodes.filter((n) => n.change !== "stable").slice(0, 15).map((node) => {
          const cfg = CHANGE_CONFIG[node.change];
          const Icon = cfg.icon;
          return (
            <div key={node.word} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${cfg.bg} ${cfg.border}`}>
              <Icon className={`h-3 w-3 shrink-0 ${cfg.color}`} />
              <span className={`text-[12px] font-medium ${cfg.color} flex-1`}>{node.word}</span>
              <span className="text-[10px] text-gray-400">{node.previousCount} → {node.currentCount}</span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
