"use client";

import { Hash, TrendingUp, TrendingDown, Minus } from "lucide-react";

type RelatedNode = {
  word: string;
  count: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  positive: number;
  negative: number;
  neutral: number;
};

type Props = {
  centerKeyword: string;
  nodes: RelatedNode[];
  hasData: boolean;
  warnings: string[];
};

const SENTIMENT_STYLES = {
  POSITIVE: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  NEGATIVE: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  NEUTRAL: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700" },
};

export function RelatedKeywordMap({ centerKeyword, nodes, hasData, warnings }: Props) {
  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 mb-4">
          <Hash className="h-4 w-4 text-indigo-500" />
          연관어 맵
        </h4>
        <div className="text-center py-8">
          <Hash className="mx-auto h-7 w-7 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">{warnings[0] ?? "연관어 데이터가 아직 없어요"}</p>
          <p className="mt-1 text-xs text-gray-300">키워드를 분석하면 연관어가 나타나요</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...nodes.map((n) => n.count), 1);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
          <Hash className="h-4 w-4 text-indigo-500" />
          연관어 맵
        </h4>
        <span className="text-[10px] text-gray-400">{nodes.length}개 연관어</span>
      </div>

      {/* Center keyword */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-md">
          {centerKeyword}
        </span>
      </div>

      {/* Radial nodes */}
      <div className="flex flex-wrap justify-center gap-2">
        {nodes.map((node) => {
          const style = SENTIMENT_STYLES[node.sentiment];
          const sizeClass = node.count >= maxCount * 0.7
            ? "text-[13px] px-3 py-1.5 font-semibold"
            : node.count >= maxCount * 0.3
              ? "text-[11px] px-2.5 py-1"
              : "text-[10px] px-2 py-0.5";

          return (
            <span
              key={node.word}
              className={`rounded-full border ${style.bg} ${style.border} ${style.text} ${sizeClass} transition-all hover:shadow-sm cursor-default`}
              title={`${node.word}: ${node.count}회 (긍정 ${node.positive} / 부정 ${node.negative})`}
            >
              {node.word}
              <span className="ml-1 opacity-60">{node.count}</span>
            </span>
          );
        })}
      </div>

      {/* Sentiment legend */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> 긍정 맥락</span>
        <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /> 부정 맥락</span>
        <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-gray-400" /> 중립</span>
      </div>
    </div>
  );
}
