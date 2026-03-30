"use client";

import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Equal,
  AlertTriangle,
  Clock,
  Shield,
  BarChart3,
  Loader2,
  GitCompareArrows,
  Info,
} from "lucide-react";

type RunSnapshot = {
  id: string;
  seedKeyword: string;
  industryType: string;
  confidence: number;
  freshness: string;
  isPartial: boolean;
  isMockOnly: boolean;
  analyzedAt: string | Date;
  signalQuality?: any;
  benchmarkComparison?: any;
  fusionResult?: any;
};

type CurrentVsPreviousPanelProps = {
  hasPreviousRun: boolean;
  current: RunSnapshot | null;
  previous: RunSnapshot | null;
  isLoading: boolean;
  onOpenFullCompare?: () => void;
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

function DeltaIndicator({ current, previous, label, suffix = "" }: {
  current: number;
  previous: number;
  label: string;
  suffix?: string;
}) {
  const delta = current - previous;
  const isUp = delta > 0;
  const isDown = delta < 0;
  const absDelta = Math.abs(delta);

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-400">
          {typeof previous === "number" ? (previous * (suffix === "%" ? 100 : 1)).toFixed(suffix === "%" ? 0 : 1) : "—"}{suffix}
        </span>
        <ArrowRight className="h-3 w-3 text-gray-300" />
        <span className="text-[11px] font-semibold text-gray-800">
          {typeof current === "number" ? (current * (suffix === "%" ? 100 : 1)).toFixed(suffix === "%" ? 0 : 1) : "—"}{suffix}
        </span>
        {delta !== 0 && (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
            isUp ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}>
            {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {isUp ? "+" : ""}{(absDelta * (suffix === "%" ? 100 : 1)).toFixed(suffix === "%" ? 0 : 1)}
          </span>
        )}
        {delta === 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-50 px-1.5 py-0.5 text-[9px] text-gray-400">
            <Equal className="h-2.5 w-2.5" />
            동일
          </span>
        )}
      </div>
    </div>
  );
}

export function CurrentVsPreviousPanel({
  hasPreviousRun,
  current,
  previous,
  isLoading,
  onOpenFullCompare,
}: CurrentVsPreviousPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <GitCompareArrows className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-800">이전과 비교</h3>
        </div>
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // No history state
  if (!hasPreviousRun || !current) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-500">이전과 비교</h3>
        </div>
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-400 leading-relaxed">
            비교할 이전 결과가 아직 없어요. 같은 키워드를 한 번 더 분석하면 바로 비교할 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  // Insufficient previous data
  if (!previous) {
    return (
      <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/30 p-5">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-amber-700">이전과 비교</h3>
        </div>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-600 leading-relaxed">
            이전 데이터를 불러오지 못했어요. 잠시 후 다시 시도하면 볼 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  // Extract comparison values
  const currentConf = current.confidence;
  const previousConf = previous.confidence;

  const currentBenchScore = current.benchmarkComparison?.overallScore ?? null;
  const previousBenchScore = previous.benchmarkComparison?.overallScore ?? null;

  const currentSignal = current.signalQuality ?? current.fusionResult?.signalQuality;
  const previousSignal = previous.signalQuality ?? previous.fusionResult?.signalQuality;

  // Signal richness comparison
  const richnessMap: Record<string, number> = { RICH: 3, MODERATE: 2, MINIMAL: 1 };
  const richnessLabel: Record<string, string> = { RICH: "풍부", MODERATE: "보통", MINIMAL: "최소" };
  const currentRichness = currentSignal?.overallRichness ?? "MINIMAL";
  const previousRichness = previousSignal?.overallRichness ?? "MINIMAL";
  const richnessChanged = currentRichness !== previousRichness;
  const richnessImproved = (richnessMap[currentRichness] ?? 0) > (richnessMap[previousRichness] ?? 0);

  // Partial/stale warnings
  const warnings: string[] = [];
  if (current.isPartial) warnings.push("현재 분석이 부분 데이터 기반입니다.");
  if (previous.isPartial) warnings.push("이전 분석이 부분 데이터 기반이었습니다.");
  if (current.isMockOnly) warnings.push("현재 분석이 샘플 데이터 기반입니다.");
  if (previous.isMockOnly) warnings.push("이전 분석이 샘플 데이터 기반이었습니다.");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-800">이전과 비교</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <span>{formatDate(previous.analyzedAt)}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="font-medium text-gray-600">{formatDate(current.analyzedAt)}</span>
        </div>
      </div>

      {/* Signal richness change */}
      {richnessChanged && (
        <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 ${
          richnessImproved ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"
        }`}>
          {richnessImproved ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span className={`text-[11px] font-medium ${richnessImproved ? "text-emerald-700" : "text-amber-700"}`}>
            시그널 품질: {richnessLabel[previousRichness]} → {richnessLabel[currentRichness]}
          </span>
        </div>
      )}

      {/* Delta metrics */}
      <div className="divide-y divide-gray-100">
        <DeltaIndicator
          label="신뢰도"
          current={currentConf}
          previous={previousConf}
          suffix="%"
        />
        {currentBenchScore !== null && previousBenchScore !== null && (
          <DeltaIndicator
            label="벤치마크 점수"
            current={currentBenchScore}
            previous={previousBenchScore}
          />
        )}
      </div>

      {/* Data source comparison */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gray-50 p-2.5">
          <p className="text-[9px] font-medium text-gray-400 mb-1">이전</p>
          <div className="flex flex-wrap gap-1">
            {previousSignal?.hasClusterData && (
              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] text-emerald-700">검색</span>
            )}
            {previousSignal?.hasSocialData && (
              <span className="rounded bg-blue-100 px-1 py-0.5 text-[8px] text-blue-700">소셜</span>
            )}
            {previousSignal?.hasBenchmarkData && (
              <span className="rounded bg-violet-100 px-1 py-0.5 text-[8px] text-violet-700">벤치마크</span>
            )}
            {!previousSignal?.hasClusterData && !previousSignal?.hasSocialData && (
              <span className="text-[9px] text-gray-400">데이터 없음</span>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-violet-50/50 p-2.5">
          <p className="text-[9px] font-medium text-violet-400 mb-1">현재</p>
          <div className="flex flex-wrap gap-1">
            {currentSignal?.hasClusterData && (
              <span className="rounded bg-emerald-100 px-1 py-0.5 text-[8px] text-emerald-700">검색</span>
            )}
            {currentSignal?.hasSocialData && (
              <span className="rounded bg-blue-100 px-1 py-0.5 text-[8px] text-blue-700">소셜</span>
            )}
            {currentSignal?.hasBenchmarkData && (
              <span className="rounded bg-violet-100 px-1 py-0.5 text-[8px] text-violet-700">벤치마크</span>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[10px] text-amber-600">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Full compare CTA */}
      {onOpenFullCompare && (
        <button
          onClick={onOpenFullCompare}
          className="mt-4 w-full rounded-lg border border-violet-200 bg-violet-50 py-2 text-xs font-medium text-violet-700 hover:bg-violet-100 transition-colors flex items-center justify-center gap-1.5"
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          자세히 비교하기
        </button>
      )}
    </div>
  );
}
