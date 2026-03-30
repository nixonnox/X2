"use client";

import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import {
  Brain,
  GitCompareArrows,
  Loader2,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Equal,
  Sparkles,
  Shield,
  Clock,
  Search,
  MessageSquare,
  BarChart3,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

type DiffLevel = "CRITICAL" | "WARNING" | "INFO" | "NEUTRAL";

const INDUSTRIES = [
  { value: "BEAUTY" as const, label: "뷰티" },
  { value: "FNB" as const, label: "F&B" },
  { value: "FINANCE" as const, label: "금융" },
  { value: "ENTERTAINMENT" as const, label: "엔터" },
];

const COMPARISON_TYPES = [
  { value: "keyword_vs_keyword" as const, label: "키워드 비교", desc: "다른 키워드와 인사이트를 비교해요", icon: "🔍" },
  { value: "industry_vs_industry" as const, label: "업종 비교", desc: "같은 키워드를 다른 업종에서 봐요", icon: "🏢" },
  { value: "period_vs_period" as const, label: "기간 비교", desc: "시간에 따라 어떻게 달라졌는지 봐요", icon: "📅" },
];

const levelStyles: Record<DiffLevel, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    glow: "shadow-red-200/50 shadow-md",
  },
  WARNING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    glow: "shadow-amber-200/50 shadow-sm",
  },
  INFO: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    glow: "",
  },
  NEUTRAL: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    border: "border-gray-200",
    glow: "",
  },
};

// ─── Page ────────────────────────────────────────────────────────

export default function IntelligenceComparePage() {
  const searchParams = useSearchParams();
  const { projectId, isLoading: projectLoading } = useCurrentProject();

  const initialKeyword = searchParams.get("keyword") ?? "";
  const initialType = searchParams.get("type") as "keyword_vs_keyword" | "industry_vs_industry" | "period_vs_period" | null;
  const initialLeftRunId = searchParams.get("leftRunId") ?? "";
  const initialRightRunId = searchParams.get("rightRunId") ?? "";

  // Input state
  const [comparisonType, setComparisonType] =
    useState<"keyword_vs_keyword" | "industry_vs_industry" | "period_vs_period">(
      initialType ?? "keyword_vs_keyword",
    );
  const [leftKeyword, setLeftKeyword] = useState(initialKeyword);
  const [rightKeyword, setRightKeyword] = useState(
    initialType === "period_vs_period" ? initialKeyword : "",
  );
  const [leftIndustry, setLeftIndustry] = useState<
    "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT" | undefined
  >(undefined);
  const [rightIndustry, setRightIndustry] = useState<
    "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT" | undefined
  >(undefined);

  // Period comparison state
  const [leftPeriodStart, setLeftPeriodStart] = useState("");
  const [leftPeriodEnd, setLeftPeriodEnd] = useState("");
  const [rightPeriodStart, setRightPeriodStart] = useState("");
  const [rightPeriodEnd, setRightPeriodEnd] = useState("");
  const [leftRunId, setLeftRunId] = useState(initialLeftRunId);
  const [rightRunId, setRightRunId] = useState(initialRightRunId);

  const compareMutation = trpc.intelligence.compare.useMutation();

  const handleCompare = useCallback(() => {
    if (!projectId) return;
    if (!leftKeyword.trim()) return;
    if (comparisonType !== "period_vs_period" && !rightKeyword.trim()) return;

    const rightKw =
      comparisonType === "period_vs_period"
        ? leftKeyword.trim()
        : comparisonType === "keyword_vs_keyword"
          ? rightKeyword.trim()
          : leftKeyword.trim();

    compareMutation.mutate({
      projectId,
      comparisonType,
      left: {
        label:
          comparisonType === "period_vs_period"
            ? leftPeriodStart && leftPeriodEnd
              ? `${leftPeriodStart} ~ ${leftPeriodEnd}`
              : "기간 A"
            : comparisonType === "industry_vs_industry"
              ? leftIndustry ?? leftKeyword
              : leftKeyword,
        seedKeyword: leftKeyword.trim(),
        industryType: leftIndustry,
        ...(comparisonType === "period_vs_period" && {
          periodStart: leftPeriodStart || undefined,
          periodEnd: leftPeriodEnd || undefined,
          runId: leftRunId || undefined,
        }),
      },
      right: {
        label:
          comparisonType === "period_vs_period"
            ? rightPeriodStart && rightPeriodEnd
              ? `${rightPeriodStart} ~ ${rightPeriodEnd}`
              : "기간 B"
            : comparisonType === "industry_vs_industry"
              ? rightIndustry ?? rightKeyword
              : rightKeyword,
        seedKeyword: rightKw,
        industryType:
          comparisonType === "industry_vs_industry"
            ? rightIndustry
            : leftIndustry,
        ...(comparisonType === "period_vs_period" && {
          periodStart: rightPeriodStart || undefined,
          periodEnd: rightPeriodEnd || undefined,
          runId: rightRunId || undefined,
        }),
      },
    });
  }, [
    projectId,
    comparisonType,
    leftKeyword,
    rightKeyword,
    leftIndustry,
    rightIndustry,
    leftPeriodStart,
    leftPeriodEnd,
    rightPeriodStart,
    rightPeriodEnd,
    leftRunId,
    rightRunId,
    compareMutation,
  ]);

  const result = compareMutation.data;
  const comparison = result?.comparison;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <a
          href="/intelligence"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 text-gray-500" />
        </a>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <GitCompareArrows className="h-5 w-5 text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            비교 분석
          </h1>
          <p className="text-sm text-gray-500">
            키워드, 업종, 기간별로 어떻게 다른지 비교해요
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Comparison type selector — card style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COMPARISON_TYPES.map((ct) => (
            <button
              key={ct.value}
              onClick={() => setComparisonType(ct.value)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                comparisonType === ct.value
                  ? "border-violet-500 bg-violet-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm">{ct.icon}</span>
                <span className={`text-xs font-semibold ${
                  comparisonType === ct.value ? "text-violet-700" : "text-gray-800"
                }`}>
                  {ct.label}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {ct.desc}
              </p>
            </button>
          ))}
        </div>

        {/* A/B input fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Side A */}
          <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              A
            </span>
            <input
              type="text"
              value={leftKeyword}
              onChange={(e) => setLeftKeyword(e.target.value)}
              placeholder={comparisonType === "period_vs_period" ? "비교할 키워드" : "키워드 A"}
              className="w-full rounded-lg border border-blue-200 bg-white py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
            {(comparisonType === "industry_vs_industry" ||
              comparisonType === "keyword_vs_keyword") && (
              <div className="flex gap-1">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() =>
                      setLeftIndustry(
                        leftIndustry === ind.value ? undefined : ind.value,
                      )
                    }
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      leftIndustry === ind.value
                        ? "bg-blue-500 text-white"
                        : "bg-white text-gray-500 border border-gray-200"
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            )}
            {comparisonType === "period_vs_period" && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-blue-600">기간 A</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={leftPeriodStart}
                    onChange={(e) => setLeftPeriodStart(e.target.value)}
                    className="flex-1 rounded border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <span className="self-center text-xs text-gray-400">~</span>
                  <input
                    type="date"
                    value={leftPeriodEnd}
                    onChange={(e) => setLeftPeriodEnd(e.target.value)}
                    className="flex-1 rounded border border-blue-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                {leftRunId && (
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-600">
                    <Clock className="h-3 w-3" />
                    <span>저장된 분석 사용 중</span>
                    <button
                      onClick={() => setLeftRunId("")}
                      className="ml-1 text-blue-400 hover:text-blue-600 underline"
                    >
                      해제
                    </button>
                  </div>
                )}
                {!leftRunId && !leftPeriodStart && !leftPeriodEnd && (
                  <p className="text-[10px] text-blue-400">
                    기간을 선택하거나 저장된 분석을 사용해요. 비워두면 현재 시점으로 분석해요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Side B */}
          <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/30 p-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
              B
            </span>
            {comparisonType !== "period_vs_period" && (
              <input
                type="text"
                value={rightKeyword}
                onChange={(e) => setRightKeyword(e.target.value)}
                placeholder="키워드 B"
                className="w-full rounded-lg border border-violet-200 bg-white py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-200"
              />
            )}
            {comparisonType === "period_vs_period" && (
              <p className="text-xs text-violet-600 font-medium py-1">
                같은 키워드: {leftKeyword || "—"}
              </p>
            )}
            {(comparisonType === "industry_vs_industry" ||
              comparisonType === "keyword_vs_keyword") && (
              <div className="flex gap-1">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() =>
                      setRightIndustry(
                        rightIndustry === ind.value ? undefined : ind.value,
                      )
                    }
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      rightIndustry === ind.value
                        ? "bg-violet-500 text-white"
                        : "bg-white text-gray-500 border border-gray-200"
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </div>
            )}
            {comparisonType === "period_vs_period" && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium text-violet-600">기간 B</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={rightPeriodStart}
                    onChange={(e) => setRightPeriodStart(e.target.value)}
                    className="flex-1 rounded border border-violet-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-200"
                  />
                  <span className="self-center text-xs text-gray-400">~</span>
                  <input
                    type="date"
                    value={rightPeriodEnd}
                    onChange={(e) => setRightPeriodEnd(e.target.value)}
                    className="flex-1 rounded border border-violet-200 bg-white px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-violet-200"
                  />
                </div>
                {rightRunId && (
                  <div className="flex items-center gap-1.5 text-[10px] text-violet-600">
                    <Clock className="h-3 w-3" />
                    <span>저장된 분석 사용 중</span>
                    <button
                      onClick={() => setRightRunId("")}
                      className="ml-1 text-violet-400 hover:text-violet-600 underline"
                    >
                      해제
                    </button>
                  </div>
                )}
                {!rightRunId && !rightPeriodStart && !rightPeriodEnd && (
                  <p className="text-[10px] text-violet-400">
                    비워두면 현재 시점으로 분석해요.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={
            !leftKeyword.trim() ||
            (comparisonType !== "period_vs_period" && !rightKeyword.trim()) ||
            compareMutation.isPending
          }
          className="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {compareMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitCompareArrows className="h-4 w-4" />
          )}
          비교 시작
        </button>
      </div>

      {/* Error */}
      {compareMutation.error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            {compareMutation.error.message}
          </p>
        </div>
      )}

      {/* Loading */}
      {compareMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-3" />
          <p className="text-sm text-gray-500">비교하고 있어요</p>
        </div>
      )}

      {/* ─── Comparison Result ────────────────────────────────── */}
      {comparison && !compareMutation.isPending && (
        <div className="space-y-6">
          {/* Period data availability warning */}
          {result?.periodDataAvailability?.insufficientDataWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">기간 비교에 필요한 데이터가 부족해요</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {result.periodDataAvailability.insufficientDataWarning}
                </p>
                <div className="mt-2 flex gap-3 text-[11px]">
                  <span className={`rounded px-2 py-0.5 ${
                    result.periodDataAvailability.leftHasHistoricalData
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    A: {result.periodDataAvailability.leftHasHistoricalData ? "과거 데이터 있음" : "과거 데이터 없음 (라이브)"}
                  </span>
                  <span className={`rounded px-2 py-0.5 ${
                    result.periodDataAvailability.rightHasHistoricalData
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    B: {result.periodDataAvailability.rightHasHistoricalData ? "과거 데이터 있음" : "과거 데이터 없음 (라이브)"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Stale snapshot indicators */}
          {(result?.left?.metadata?.isStaleBased || result?.right?.metadata?.isStaleBased) && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <Clock className="mt-0.5 h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex flex-wrap gap-2 text-[11px]">
                {result?.left?.metadata?.isStaleBased && (
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                    A: 과거 저장 데이터 ({new Date(result.left.metadata.generatedAt).toLocaleDateString("ko-KR")})
                  </span>
                )}
                {result?.right?.metadata?.isStaleBased && (
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-violet-700">
                    B: 과거 저장 데이터 ({new Date(result.right.metadata.generatedAt).toLocaleDateString("ko-KR")})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Overall difference score */}
          <DifferenceScoreBanner
            score={comparison.overallDifferenceScore}
            summary={comparison.summary}
            leftLabel={comparison.leftLabel}
            rightLabel={comparison.rightLabel}
          />

          {/* Difference warnings */}
          {comparison.differenceWarnings.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              {comparison.differenceWarnings.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Key Differences — visual highlight */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              주요 차이
            </h3>
            {comparison.keyDifferences.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {comparison.keyDifferences.map((diff: any, i: number) => (
                  <DifferenceCard key={i} diff={diff} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-400">
                눈에 띄는 차이가 없어요. 거의 비슷한 결과예요.
              </p>
            )}
          </div>

          {/* Highlighted Changes */}
          {comparison.highlightedChanges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                눈에 띄는 변화
              </h3>
              <div className="space-y-2">
                {comparison.highlightedChanges.map(
                  (change: any, i: number) => (
                    <HighlightCard key={i} change={change} />
                  ),
                )}
              </div>
            </div>
          )}

          {/* Action Delta */}
          <ActionDeltaPanel actionDelta={comparison.actionDelta} />

          {/* Side-by-side signal quality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SignalSummaryCard
              label={result.left.label}
              side="A"
              sideColor="blue"
              signalQuality={result.left.intelligence.signalQuality}
              metadata={result.left.metadata}
            />
            <SignalSummaryCard
              label={result.right.label}
              side="B"
              sideColor="violet"
              signalQuality={result.right.intelligence.signalQuality}
              metadata={result.right.metadata}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function DifferenceScoreBanner({
  score,
  summary,
  leftLabel,
  rightLabel,
}: {
  score: number;
  summary: string;
  leftLabel: string;
  rightLabel: string;
}) {
  const color =
    score >= 60
      ? "from-red-500 to-rose-500"
      : score >= 30
        ? "from-amber-500 to-orange-500"
        : score >= 10
          ? "from-blue-500 to-cyan-500"
          : "from-gray-400 to-gray-500";

  const label =
    score >= 60
      ? "큰 차이"
      : score >= 30
        ? "주목할 차이"
        : score >= 10
          ? "일부 차이"
          : "유사";

  return (
    <div className={`rounded-2xl border-2 bg-white p-6 shadow-sm ${
      score >= 60
        ? "border-red-200 shadow-red-100/50"
        : score >= 30
          ? "border-amber-200 shadow-amber-100/50"
          : "border-gray-200"
    }`}>
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        {/* Score ring — larger */}
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center self-center">
          {/* Outer glow ring for high scores */}
          {score >= 60 && (
            <div className="absolute inset-0 rounded-full bg-red-100/60 animate-pulse" />
          )}
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90 relative z-10">
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="5"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                <stop
                  offset="0%"
                  stopColor={
                    score >= 60
                      ? "#ef4444"
                      : score >= 30
                        ? "#f59e0b"
                        : "#3b82f6"
                  }
                />
                <stop
                  offset="100%"
                  stopColor={
                    score >= 60
                      ? "#f43f5e"
                      : score >= 30
                        ? "#f97316"
                        : "#06b6d4"
                  }
                />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <span className="text-2xl font-black text-gray-900">{score}</span>
            <span className="text-[9px] font-medium text-gray-500">차이점수</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2.5">
            <span
              className={`inline-block rounded-full bg-gradient-to-r ${color} px-3 py-1 text-xs font-bold text-white shadow-sm`}
            >
              {label}
            </span>
            <span className="text-sm text-gray-500">
              <span className="font-semibold text-blue-600">{leftLabel}</span>
              {" vs "}
              <span className="font-semibold text-violet-600">{rightLabel}</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{summary}</p>

          {/* Score breakdown bar */}
          <div className="mt-3 flex gap-1">
            {[
              { threshold: 20, color: "bg-blue-400" },
              { threshold: 40, color: "bg-amber-400" },
              { threshold: 60, color: "bg-orange-400" },
              { threshold: 80, color: "bg-red-400" },
              { threshold: 100, color: "bg-red-600" },
            ].map((seg) => (
              <div
                key={seg.threshold}
                className={`h-1.5 flex-1 rounded-full ${
                  score >= seg.threshold - 20 ? seg.color : "bg-gray-100"
                }`}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-gray-400">
            <span>유사</span>
            <span>일부 차이</span>
            <span>주목</span>
            <span>큰 차이</span>
            <span>극심</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DifferenceCard({ diff }: { diff: any }) {
  const style = levelStyles[diff.level as DiffLevel] ?? levelStyles.NEUTRAL;
  const isCritical = diff.level === "CRITICAL";
  const isWarning = diff.level === "WARNING";
  const DirIcon =
    diff.deltaDirection === "UP"
      ? ArrowUp
      : diff.deltaDirection === "DOWN"
        ? ArrowDown
        : diff.deltaDirection === "NEW"
          ? Plus
          : diff.deltaDirection === "REMOVED"
            ? Minus
            : Equal;

  const dirColor =
    diff.deltaDirection === "UP"
      ? "text-emerald-600"
      : diff.deltaDirection === "DOWN"
        ? "text-red-600"
        : diff.deltaDirection === "NEW"
          ? "text-blue-600"
          : diff.deltaDirection === "REMOVED"
            ? "text-gray-500"
            : "text-gray-400";

  const dirBg =
    diff.deltaDirection === "UP"
      ? "bg-emerald-50"
      : diff.deltaDirection === "DOWN"
        ? "bg-red-50"
        : "bg-gray-50";

  // Compute visual bar width for delta
  const absDelta = Math.abs(typeof diff.delta === "number" ? diff.delta : 0);
  const barWidth = Math.min(absDelta * 2, 100); // scale for visibility

  const areaIcons: Record<string, any> = {
    SIGNAL_QUALITY: Shield,
    TAXONOMY: Search,
    BENCHMARK: TrendingUp,
    SOCIAL: MessageSquare,
    WARNING: AlertTriangle,
  };
  const AreaIcon = areaIcons[diff.area] ?? Brain;

  return (
    <div
      className={`rounded-xl border-2 transition-all ${style.border} ${style.bg} ${
        isCritical
          ? "shadow-lg shadow-red-200/60 ring-1 ring-red-300/50 p-5"
          : isWarning
            ? "shadow-md shadow-amber-200/40 p-4"
            : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${style.text} bg-white/60`}
            >
              <AreaIcon className="h-3 w-3" />
              {diff.area}
            </span>
            <span className={`text-[13px] font-bold ${isCritical ? "text-red-900" : "text-gray-900"}`}>
              {diff.label}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed ${isCritical ? "text-red-700 font-medium" : "text-gray-600"}`}>
            {diff.interpretation}
          </p>
        </div>

        {/* Delta indicator — enlarged for critical */}
        <div className={`flex flex-col items-center gap-1 rounded-lg p-2 ${dirBg}`}>
          <DirIcon className={`${isCritical ? "h-7 w-7" : "h-5 w-5"} ${dirColor}`} />
          {diff.delta !== null && (
            <span className={`${isCritical ? "text-sm" : "text-[11px]"} font-bold tabular-nums ${dirColor}`}>
              {diff.delta > 0 ? "+" : ""}
              {typeof diff.delta === "number"
                ? diff.delta % 1 === 0
                  ? diff.delta
                  : diff.delta.toFixed(1)
                : diff.delta}
            </span>
          )}
        </div>
      </div>

      {/* Delta magnitude bar */}
      {diff.delta !== null && barWidth > 0 && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/60">
            <div
              className={`h-full rounded-full transition-all ${
                diff.deltaDirection === "UP"
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : diff.deltaDirection === "DOWN"
                    ? "bg-gradient-to-r from-red-400 to-red-500"
                    : "bg-gradient-to-r from-gray-300 to-gray-400"
              }`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Before → After strip */}
      {diff.leftValue !== null && diff.rightValue !== null && (
        <div className="mt-3 flex items-center gap-2 text-[11px]">
          <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-700 font-mono font-semibold">
            A: {String(diff.leftValue)}
          </span>
          <ArrowLeft className="h-3.5 w-3.5 text-gray-400 rotate-180" />
          <span className="rounded-md bg-violet-100 px-2 py-1 text-violet-700 font-mono font-semibold">
            B: {String(diff.rightValue)}
          </span>
        </div>
      )}
    </div>
  );
}

function HighlightCard({ change }: { change: any }) {
  const style =
    levelStyles[change.level as DiffLevel] ?? levelStyles.NEUTRAL;
  const isCritical = change.level === "CRITICAL";

  const typeConfig: Record<string, { label: string; icon: any; accent: string }> = {
    taxonomy: { label: "분류", icon: Search, accent: "text-teal-600 bg-teal-50" },
    benchmark: { label: "벤치마크", icon: BarChart3, accent: "text-violet-600 bg-violet-50" },
    social: { label: "소셜", icon: MessageSquare, accent: "text-blue-600 bg-blue-50" },
    signal: { label: "시그널", icon: Shield, accent: "text-emerald-600 bg-emerald-50" },
    warning: { label: "경고", icon: AlertTriangle, accent: "text-amber-600 bg-amber-50" },
  };
  const tc = typeConfig[change.type] ?? { label: change.type, icon: Sparkles, accent: "text-gray-600 bg-gray-50" };
  const TypeIcon = tc.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border-2 p-4 transition-all ${style.border} ${style.bg} ${
        isCritical ? "shadow-md shadow-red-200/40" : ""
      }`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tc.accent}`}>
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${tc.accent}`}
          >
            {tc.label}
          </span>
          <span className={`text-[13px] font-semibold ${isCritical ? "text-red-900" : "text-gray-900"}`}>
            {change.title}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
          {change.description}
        </p>
        {(change.leftDetail || change.rightDetail) && (
          <div className="mt-2 flex gap-3 text-[11px]">
            {change.leftDetail && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-medium text-blue-700">
                A: {change.leftDetail}
              </span>
            )}
            {change.rightDetail && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
                B: {change.rightDetail}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionDeltaPanel({ actionDelta }: { actionDelta: any }) {
  if (
    !actionDelta ||
    (actionDelta.newInsights.length === 0 &&
      actionDelta.removedInsights.length === 0 &&
      actionDelta.escalatedWarnings.length === 0 &&
      actionDelta.resolvedWarnings.length === 0 &&
      actionDelta.recommendations.length === 0)
  ) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">달라진 점</h3>

      {actionDelta.recommendations.length > 0 && (
        <div className="space-y-1.5">
          {actionDelta.recommendations.map((r: string, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 text-violet-500 shrink-0" />
              <p className="text-[11px] text-gray-700">{r}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actionDelta.newInsights.length > 0 && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="mb-1.5 text-[10px] font-semibold text-emerald-700">
              <Plus className="inline h-3 w-3" /> 새 인사이트
            </p>
            {actionDelta.newInsights.map((ins: string, i: number) => (
              <p key={i} className="text-[10px] text-emerald-700">
                {ins}
              </p>
            ))}
          </div>
        )}
        {actionDelta.removedInsights.length > 0 && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
            <p className="mb-1.5 text-[10px] font-semibold text-gray-500">
              <Minus className="inline h-3 w-3" /> 사라진 인사이트
            </p>
            {actionDelta.removedInsights.map((ins: string, i: number) => (
              <p key={i} className="text-[10px] text-gray-500">
                {ins}
              </p>
            ))}
          </div>
        )}
        {actionDelta.escalatedWarnings.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="mb-1.5 text-[10px] font-semibold text-red-700">
              <AlertTriangle className="inline h-3 w-3" /> 새 경고
            </p>
            {actionDelta.escalatedWarnings.map((w: string, i: number) => (
              <p key={i} className="text-[10px] text-red-700 line-clamp-2">
                {w}
              </p>
            ))}
          </div>
        )}
        {actionDelta.resolvedWarnings.length > 0 && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="mb-1.5 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="inline h-3 w-3" /> 해소된 경고
            </p>
            {actionDelta.resolvedWarnings.map((w: string, i: number) => (
              <p key={i} className="text-[10px] text-emerald-700 line-clamp-2">
                {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SignalSummaryCard({
  label,
  side,
  sideColor,
  signalQuality,
  metadata,
}: {
  label: string;
  side: string;
  sideColor: string;
  signalQuality: any;
  metadata: any;
}) {
  const richnessLabel =
    signalQuality.overallRichness === "RICH"
      ? "풍부"
      : signalQuality.overallRichness === "MODERATE"
        ? "보통"
        : "최소";

  const richnessColor =
    signalQuality.overallRichness === "RICH"
      ? "text-emerald-600"
      : signalQuality.overallRichness === "MODERATE"
        ? "text-blue-600"
        : "text-gray-500";

  return (
    <div className={`rounded-xl border border-${sideColor}-200 bg-${sideColor}-50/30 p-4 space-y-3`}>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-${sideColor}-100 text-[10px] font-bold text-${sideColor}-700`}
        >
          {side}
        </span>
        <span className="text-sm font-semibold text-gray-900 truncate">
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <span className="text-gray-500">시그널 품질</span>
          <p className={`font-semibold ${richnessColor}`}>{richnessLabel}</p>
        </div>
        <div>
          <span className="text-gray-500">신뢰도</span>
          <p className="font-semibold text-gray-800">
            {Math.round(metadata.confidence * 100)}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {signalQuality.hasClusterData && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700">
            검색 ✓
          </span>
        )}
        {!signalQuality.hasClusterData && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
            검색 ✗
          </span>
        )}
        {signalQuality.hasSocialData && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] text-blue-700">
            소셜 ✓
          </span>
        )}
        {!signalQuality.hasSocialData && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
            소셜 ✗
          </span>
        )}
        {signalQuality.hasBenchmarkData && (
          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] text-violet-700">
            벤치마크 ✓
          </span>
        )}
        {!signalQuality.hasBenchmarkData && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500">
            벤치마크 ✗
          </span>
        )}
      </div>

      {/* State badges */}
      <div className="flex flex-wrap gap-1">
        {metadata.isStaleBased && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">
            <Clock className="h-2.5 w-2.5" />
            과거 데이터
          </span>
        )}
        {metadata.isPartial && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">
            부분 데이터
          </span>
        )}
        {metadata.isMockOnly && (
          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] text-red-700">
            샘플 데이터
          </span>
        )}
        {metadata.confidence < 0.5 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">
            <Shield className="h-2.5 w-2.5" />
            낮은 신뢰도
          </span>
        )}
      </div>
    </div>
  );
}
