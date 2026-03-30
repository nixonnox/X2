"use client";

import { ThumbsUp, ThumbsDown, Minus } from "lucide-react";

type Term = { word: string; count: number };

type Props = {
  positive: Term[];
  negative: Term[];
  neutral: Term[];
  hasData: boolean;
  warnings: string[];
};

export function SentimentTermsPanel({ positive, negative, neutral, hasData, warnings }: Props) {
  if (!hasData) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center py-8">
        <p className="text-sm text-gray-400">{warnings[0] ?? "감성별 연관어 데이터가 아직 없어요"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-semibold text-gray-800">감성 연관어</h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Positive */}
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700">긍정 맥락</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {positive.slice(0, 10).map((t) => (
              <span key={t.word} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                {t.word} <span className="opacity-60">{t.count}</span>
              </span>
            ))}
            {positive.length === 0 && <span className="text-[10px] text-gray-400">아직 없어요</span>}
          </div>
        </div>

        {/* Negative */}
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ThumbsDown className="h-3.5 w-3.5 text-red-600" />
            <span className="text-[11px] font-semibold text-red-700">부정 맥락</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {negative.slice(0, 10).map((t) => (
              <span key={t.word} className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                {t.word} <span className="opacity-60">{t.count}</span>
              </span>
            ))}
            {negative.length === 0 && <span className="text-[10px] text-gray-400">아직 없어요</span>}
          </div>
        </div>

        {/* Neutral */}
        <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Minus className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[11px] font-semibold text-gray-600">중립 맥락</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {neutral.slice(0, 10).map((t) => (
              <span key={t.word} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                {t.word} <span className="opacity-60">{t.count}</span>
              </span>
            ))}
            {neutral.length === 0 && <span className="text-[10px] text-gray-400">아직 없어요</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
