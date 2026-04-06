"use client";

/**
 * Vertical Preview Page
 *
 * 업종별 비교 프리뷰의 진입점.
 * seedKeyword 입력 → 업종 자동 추천 → 업종 선택 → 결과 비교/적용
 */

import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import {
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  FileText,
  Presentation,
  Globe,
  Info,
  Brain,
} from "lucide-react";

// Intelligence 시각화 컴포넌트
import { IntelligenceSummaryCards } from "@/components/intelligence/IntelligenceSummaryCards";
import { IntelligenceRadialGraph } from "@/components/intelligence/IntelligenceRadialGraph";
import { BenchmarkDifferentialRing } from "@/components/intelligence/BenchmarkDifferentialRing";
import { SignalFusionOverlayPanel } from "@/components/intelligence/SignalFusionOverlayPanel";
import { TaxonomyHeatMatrix } from "@/components/intelligence/TaxonomyHeatMatrix";
import { IntelligenceStatePanel } from "@/components/intelligence/IntelligenceStatePanel";
import { EvidenceSidePanel } from "@/components/intelligence/EvidenceSidePanel";

// ─── 상수 ──────────────────────────────────────────────────────────

const INDUSTRIES = [
  {
    value: "BEAUTY" as const,
    label: "뷰티",
    color: "pink",
    desc: "성분/효능/비교/후기 중심",
  },
  {
    value: "FNB" as const,
    label: "F&B",
    color: "orange",
    desc: "메뉴/맛/가격/방문 중심",
  },
  {
    value: "FINANCE" as const,
    label: "금융",
    color: "blue",
    desc: "조건/신뢰/리스크/절차 중심",
  },
  {
    value: "ENTERTAINMENT" as const,
    label: "엔터",
    color: "purple",
    desc: "팬덤/반응/확산/타이밍 중심",
  },
] as const;

const OUTPUT_TYPES = [
  { value: "WORKDOC" as const, label: "실무형 보고서", icon: FileText },
  { value: "PT_DECK" as const, label: "PT 자료", icon: Presentation },
  { value: "GENERATED_DOCUMENT" as const, label: "GEO/AEO 문서", icon: Globe },
] as const;

type IndustryType = "BEAUTY" | "FNB" | "FINANCE" | "ENTERTAINMENT";
type OutputType = "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT";

const INDUSTRY_COLORS: Record<
  string,
  { bg: string; border: string; text: string; ring: string }
> = {
  BEAUTY: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    ring: "ring-pink-300",
  },
  FNB: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    ring: "ring-orange-300",
  },
  FINANCE: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    ring: "ring-blue-300",
  },
  ENTERTAINMENT: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-700",
    ring: "ring-purple-300",
  },
};

// ─── Page Component ─────────────────────────────────────────────────

export default function VerticalPreviewPage() {
  // ─── State ──────────────────────────────────────────────────────
  const [seedKeyword, setSeedKeyword] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("WORKDOC");
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType | null>(
    null,
  );
  const [showComparison, setShowComparison] = useState(false);
  const [activeIntelligenceTab, setActiveIntelligenceTab] =
    useState<string>("summary");

  // ─── Social/Comment 데이터 가져오기 ───────────────────────────
  const { projectId } = useCurrentProject();

  const { data: commentStatsData } = trpc.comment.sentimentStats.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId },
  );

  const { data: commentsData } = trpc.comment.listByProject.useQuery(
    { projectId: projectId!, pageSize: 50 },
    { enabled: !!projectId },
  );

  // 리스닝(소셜 멘션) 데이터 가져오기
  const { data: mentionFeedData } = trpc.listening.getMentionFeed.useQuery(
    {
      projectId: projectId!,
      filters: { pagination: { page: 1, pageSize: 30 } },
    },
    { enabled: !!projectId },
  );

  // 댓글 + 소셜 멘션 데이터를 social/comment payload로 변환
  const socialDataPayload = useMemo(() => {
    if (!commentStatsData && !commentsData && !mentionFeedData)
      return undefined;

    const stats = commentStatsData ?? [];
    const total = stats.reduce(
      (sum: number, s: any) => sum + (s.count ?? 0),
      0,
    );
    const positive =
      stats.find((s: any) => s.sentiment === "POSITIVE")?.count ?? 0;
    const neutral =
      stats.find((s: any) => s.sentiment === "NEUTRAL")?.count ?? 0;
    const negative =
      stats.find((s: any) => s.sentiment === "NEGATIVE")?.count ?? 0;

    if (
      total === 0 &&
      (!commentsData?.items || commentsData.items.length === 0)
    ) {
      return undefined;
    }

    // 댓글에서 토픽 추출
    const topicMap = new Map<
      string,
      {
        count: number;
        sentiment: string;
        isQuestion: boolean;
        isRisk: boolean;
        riskLevel?: string;
      }
    >();
    for (const item of commentsData?.items ?? []) {
      const analysis = (item as any).analysis;
      if (!analysis?.topics) continue;
      for (const topic of analysis.topics) {
        const existing = topicMap.get(topic);
        if (existing) {
          existing.count++;
        } else {
          topicMap.set(topic, {
            count: 1,
            sentiment: analysis.sentiment ?? "NEUTRAL",
            isQuestion: analysis.isQuestion ?? false,
            isRisk: analysis.isRisk ?? false,
            riskLevel: analysis.riskLevel,
          });
        }
      }
    }

    // 부정 토픽 추출
    const negativeItems = (commentsData?.items ?? []).filter(
      (item: any) => item.analysis?.sentiment === "NEGATIVE",
    );
    const topNegativeTopics: string[] = [
      ...new Set(
        negativeItems.flatMap(
          (item: any) => (item.analysis?.topics ?? []) as string[],
        ),
      ),
    ].slice(0, 5);

    const positiveItems = (commentsData?.items ?? []).filter(
      (item: any) => item.analysis?.sentiment === "POSITIVE",
    );
    const topPositiveTopics: string[] = [
      ...new Set(
        positiveItems.flatMap(
          (item: any) => (item.analysis?.topics ?? []) as string[],
        ),
      ),
    ].slice(0, 5);

    return {
      sentiment: {
        total,
        positive,
        neutral,
        negative,
        topNegativeTopics,
        topPositiveTopics,
      },
      commentTopics: Array.from(topicMap.entries()).map(([topic, data]) => ({
        topic,
        count: data.count,
        sentiment:
          (data.sentiment as "POSITIVE" | "NEUTRAL" | "NEGATIVE") ?? "NEUTRAL",
        isQuestion: data.isQuestion,
        isRisk: data.isRisk,
        riskLevel: data.riskLevel as
          | "LOW"
          | "MEDIUM"
          | "HIGH"
          | "CRITICAL"
          | undefined,
      })),
      // 소셜 멘션 데이터 (ListeningAnalysisService에서)
      recentMentions: (mentionFeedData?.data ?? []).map((m: any) => ({
        platform: m.platform ?? "unknown",
        text: m.text ?? "",
        sentiment: m.sentiment ?? "neutral",
        topics: m.topics ?? [],
        engagementRate: m.engagementRate ?? 0,
        publishedAt: m.publishedAt ?? new Date().toISOString(),
      })),
    };
  }, [commentStatsData, commentsData, mentionFeedData]);

  // ─── tRPC Queries ───────────────────────────────────────────────

  // 1. 업종 추천 (seedKeyword 입력 후)
  const suggestionQuery = trpc.verticalDocument.suggestIndustry.useQuery(
    { seedKeyword: seedKeyword.trim() },
    { enabled: seedKeyword.trim().length >= 2 },
  );

  // 2. Apply (업종 선택 후 문서 생성)
  const applyMutation = trpc.verticalDocument.applyIndustry.useMutation();

  // 3. 4개 업종 비교 (비교 모드)
  const comparisonQuery = trpc.verticalDocument.comparisonPreview.useQuery(
    {
      result: {
        seedKeyword: seedKeyword.trim(),
        analyzedAt: new Date().toISOString(),
        trace: { confidence: 0.7, freshness: "fresh" },
      },
      quality: { level: "MEDIUM", confidence: 0.7, freshness: "fresh" },
      evidenceItems: [],
      insights: [],
      actions: [],
      outputType,
      audience: "OPERATIONS",
    },
    { enabled: showComparison && seedKeyword.trim().length >= 2 },
  );

  // ─── Handlers ──────────────────────────────────────────────────

  const handleApply = useCallback(() => {
    if (!seedKeyword.trim()) return;

    const industry =
      selectedIndustry ?? suggestionQuery.data?.suggestedIndustry ?? undefined;

    applyMutation.mutate({
      seedKeyword: seedKeyword.trim(),
      selectedIndustry: industry as IndustryType | undefined,
      outputType,
      audience: "OPERATIONS",
      // Social/Comment 데이터 실제 전달
      socialData: socialDataPayload,
    });
  }, [
    seedKeyword,
    selectedIndustry,
    outputType,
    suggestionQuery.data,
    applyMutation,
    socialDataPayload,
  ]);

  const handleCompare = useCallback(() => {
    if (!seedKeyword.trim()) return;
    setShowComparison(true);
  }, [seedKeyword]);

  const suggestion = suggestionQuery.data;
  const applyResult = applyMutation.data;
  const isApplying = applyMutation.isPending;
  const hasSuggestion = suggestion?.suggestedIndustry != null;
  const hasKeyword = seedKeyword.trim().length >= 2;

  return (
    <div className="space-y-5">
      <PageHeader
        title="업종별 문서 프리뷰"
        description="같은 데이터를 4개 업종 템플릿으로 비교하고, 선택한 업종으로 문서를 생성합니다."
      />

      {/* ─── 1. 키워드 입력 ──────────────────────────────────────── */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={seedKeyword}
              onChange={(e) => {
                setSeedKeyword(e.target.value);
                setShowComparison(false);
                applyMutation.reset();
              }}
              placeholder="분석할 시드 키워드를 입력하세요 (예: 레티놀 세럼, 프로틴 음료)"
              className="input h-10 w-full pl-10 text-[13px]"
            />
          </div>
        </div>

        {/* ─── 2. 문서 유형 선택 ───────────────────────────────── */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-500">
            문서 유형
          </label>
          <div className="flex gap-2">
            {OUTPUT_TYPES.map((ot) => {
              const Icon = ot.icon;
              const isSelected = outputType === ot.value;
              return (
                <button
                  key={ot.value}
                  onClick={() => setOutputType(ot.value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all ${
                    isSelected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {ot.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 3. 업종 추천 결과 ───────────────────────────────────── */}
      {hasKeyword && (
        <IndustrySuggestionPanel
          suggestion={suggestion}
          isLoading={suggestionQuery.isLoading}
          selectedIndustry={selectedIndustry}
          onSelect={setSelectedIndustry}
        />
      )}

      {/* ─── 4. 액션 버튼 ────────────────────────────────────────── */}
      {hasKeyword && (
        <div className="flex gap-3">
          <button
            onClick={handleApply}
            disabled={isApplying}
            className="btn-primary h-10 px-5 text-[13px] disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                적용 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {selectedIndustry
                  ? `${INDUSTRIES.find((i) => i.value === selectedIndustry)?.label} 업종 적용`
                  : suggestion?.suggestedIndustry
                    ? `${INDUSTRIES.find((i) => i.value === suggestion.suggestedIndustry)?.label} 업종 적용 (추천)`
                    : "업종 적용"}
              </>
            )}
          </button>
          <button
            onClick={handleCompare}
            disabled={showComparison && comparisonQuery.isLoading}
            className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-[13px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            4개 업종 비교
          </button>
        </div>
      )}

      {/* ─── 5. Apply 결과 ───────────────────────────────────────── */}
      {applyMutation.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <div>
            <p className="text-[13px] font-medium text-red-700">
              문서 생성 오류
            </p>
            <p className="mt-0.5 text-[12px] text-red-600">
              {applyMutation.error?.message ?? "알 수 없는 오류가 발생했습니다"}
            </p>
          </div>
        </div>
      )}

      {applyResult && <ApplyResultPanel result={applyResult} />}

      {/* ─── 5.5 Intelligence 시각화 ───────────────────────────────── */}
      {applyResult?.intelligence && (
        <IntelligencePanel
          result={applyResult}
          seedKeyword={seedKeyword.trim()}
          activeTab={activeIntelligenceTab}
          onTabChange={setActiveIntelligenceTab}
        />
      )}

      {/* ─── 6. 4개 업종 비교 (선택 시) ──────────────────────────── */}
      {showComparison && (
        <ComparisonPanel
          isLoading={comparisonQuery.isLoading}
          data={comparisonQuery.data}
          error={comparisonQuery.error}
        />
      )}
    </div>
  );
}

// ─── Sub Components ────────────────────────────────────────────────

function IndustrySuggestionPanel({
  suggestion,
  isLoading,
  selectedIndustry,
  onSelect,
}: {
  suggestion: any;
  isLoading: boolean;
  selectedIndustry: IndustryType | null;
  onSelect: (industry: IndustryType | null) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-4">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">
          업종을 분석하고 있습니다...
        </span>
      </div>
    );
  }

  const recommended = suggestion?.suggestedIndustry;
  const scores: Record<string, number> = suggestion?.scores ?? {};
  const confidence = suggestion?.confidence ?? 0;
  const isLowConfidence = confidence < 0.5;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-medium text-gray-900">업종 추천</h3>
        </div>
        {recommended && (
          <span className="text-xs text-gray-500">{suggestion?.reasoning}</span>
        )}
      </div>

      {/* 추천 상태 메시지 */}
      {!recommended && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
          <p className="text-xs text-amber-700">
            추천 업종의 신뢰도가 낮아 여러 업종을 함께 비교해보는 것을
            권장합니다.
          </p>
        </div>
      )}
      {recommended && isLowConfidence && (
        <div className="flex items-start gap-2 rounded-md bg-blue-50 px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
          <p className="text-xs text-blue-700">
            현재 키워드 기준으로 가장 유력한 업종은{" "}
            {INDUSTRIES.find((i) => i.value === recommended)?.label}입니다.
            신뢰도가 높지 않으므로 다른 업종도 확인해 보세요.
          </p>
        </div>
      )}
      {recommended && !isLowConfidence && (
        <div className="flex items-start gap-2 rounded-md bg-green-50 px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
          <p className="text-xs text-green-700">
            현재 키워드 기준으로 가장 유력한 업종은{" "}
            <strong>
              {INDUSTRIES.find((i) => i.value === recommended)?.label}
            </strong>
            입니다. (신뢰도: {Math.round(confidence * 100)}%)
          </p>
        </div>
      )}

      {/* 매칭 근거 상세 */}
      {suggestion?.matchedSignals && suggestion.matchedSignals.length > 0 && (
        <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
          <p className="mb-1 text-[11px] font-medium text-gray-500">
            추천 근거
          </p>
          <div className="flex flex-wrap gap-1">
            {suggestion.matchedSignals.map((sig: any, i: number) => {
              const sigColors: Record<string, string> = {
                KEYWORD: "bg-violet-100 text-violet-700",
                CLUSTER: "bg-cyan-100 text-cyan-700",
                CATEGORY: "bg-emerald-100 text-emerald-700",
              };
              const indLabel =
                INDUSTRIES.find((ind) => ind.value === sig.industry)?.label ??
                sig.industry;
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${sigColors[sig.source] ?? "bg-gray-100 text-gray-600"}`}
                >
                  <span className="font-medium">{sig.source}</span>
                  <span>&quot;{sig.matchedTerm}&quot;</span>
                  <span className="opacity-60">→ {indLabel}</span>
                  <span className="opacity-40">({sig.weight})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 4개 업종 카드 */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {INDUSTRIES.map((ind) => {
          const isRecommended = recommended === ind.value;
          const isSelected = selectedIndustry === ind.value;
          const score = scores[ind.value] ?? 0;
          const colors = INDUSTRY_COLORS[ind.value]!;

          return (
            <button
              key={ind.value}
              onClick={() => onSelect(isSelected ? null : ind.value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}`
                  : isRecommended
                    ? `${colors.bg} ${colors.border} ring-1 ${colors.ring}`
                    : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${isSelected || isRecommended ? colors.text : "text-gray-900"}`}
                >
                  {ind.label}
                </span>
                {isRecommended && (
                  <span
                    className={`text-[10px] font-medium ${colors.text} ${colors.bg} rounded-full px-1.5 py-0.5`}
                  >
                    추천
                  </span>
                )}
              </div>
              <p className="mb-2 text-[11px] text-gray-500">{ind.desc}</p>
              {/* 스코어 바 */}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isSelected || isRecommended
                        ? colors.bg.replace("50", "400")
                        : "bg-gray-400"
                    }`}
                    style={{ width: `${Math.round(score * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {Math.round(score * 100)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Apply Result Panel ──────────────────────────────────────────────

function ApplyResultPanel({ result }: { result: any }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["summary", "data"]),
  );

  const toggle = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const colors =
    INDUSTRY_COLORS[result.selectedIndustry] ?? INDUSTRY_COLORS.BEAUTY!;
  const meta = result.metadata;

  const blockGroups = [
    {
      key: "summary",
      label: "요약/핵심 발견",
      blocks: result.summaryBlocks,
      icon: "S",
    },
    {
      key: "data",
      label: "데이터 블록 (페르소나/클러스터/경로 등)",
      blocks: result.dataBlocks,
      icon: "D",
    },
    {
      key: "evidence",
      label: "Evidence",
      blocks: result.evidenceBlocks,
      icon: "E",
    },
    { key: "action", label: "Action", blocks: result.actionBlocks, icon: "A" },
    {
      key: "warning",
      label: "경고/리스크",
      blocks: result.warningBlocks,
      icon: "W",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── 품질 경고 배너 (눈에 띄게) ────────────────────────────── */}
      {(meta.isMockOnly || meta.isStaleBased || meta.isPartial) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <div className="space-y-1">
              {meta.isMockOnly && (
                <p className="text-sm font-medium text-amber-800">
                  Mock 데이터 기반 — 실제 검색 결과가 아닌 샘플 데이터로 생성된
                  결과입니다.
                </p>
              )}
              {meta.isStaleBased && (
                <p className="text-sm font-medium text-amber-800">
                  최신 데이터가 아니므로 해석에 주의가 필요합니다.
                </p>
              )}
              {meta.isPartial && (
                <p className="text-sm font-medium text-amber-800">
                  일부 데이터만 반영된 결과입니다. 누락된 소스가 있을 수
                  있습니다.
                </p>
              )}
              {meta.confidence < 0.5 && (
                <p className="text-sm text-amber-700">
                  데이터 신뢰도가 낮습니다 ({Math.round(meta.confidence * 100)}
                  %). 결과를 참고 수준으로 활용하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 메타데이터 헤더 ─────────────────────────────────────────── */}
      <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${colors.text}`}>
              {result.industryLabel}
            </span>
            <span className="text-xs text-gray-500">업종 적용 결과</span>
          </div>
          <span className="text-xs text-gray-400">{result.generatedAt}</span>
        </div>

        {/* 업종별 정책 요약 (업종 간 차이를 명확히 보여줌) */}
        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-md bg-white/70 p-2 text-center">
            <div className="text-[10px] text-gray-500">문서 톤</div>
            <div className={`text-sm font-bold ${colors.text}`}>
              {meta.toneStyle === "FORMAL"
                ? "공식 보고서"
                : meta.toneStyle === "REPORT"
                  ? "실무 보고서"
                  : meta.toneStyle}
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-2 text-center">
            <div className="text-[10px] text-gray-500">액션 스타일</div>
            <div className={`text-sm font-bold ${colors.text}`}>
              {meta.actionToneStyle === "DIRECTIVE"
                ? "지시형"
                : meta.actionToneStyle === "SUGGESTIVE"
                  ? "권유형"
                  : meta.actionToneStyle === "CONSERVATIVE"
                    ? "보수적"
                    : meta.actionToneStyle}
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-2 text-center">
            <div className="text-[10px] text-gray-500">신뢰도 기준</div>
            <div className={`text-sm font-bold ${colors.text}`}>
              {Math.round(meta.evidenceThreshold * 100)}%
            </div>
          </div>
          <div className="rounded-md bg-white/70 p-2 text-center">
            <div className="text-[10px] text-gray-500">Stale 데이터</div>
            <div
              className={`text-sm font-bold ${meta.staleAllowed ? "text-green-600" : "text-red-600"}`}
            >
              {meta.staleAllowed ? "허용" : "불가"}
            </div>
          </div>
        </div>

        {/* 메타데이터 뱃지 */}
        <div className="flex flex-wrap gap-1.5">
          <MetaBadge label={`블록: ${meta.blockCount}개`} />
          {meta.warningCount > 0 && (
            <MetaBadge
              label={`경고 ${meta.warningCount}건`}
              variant="warning"
            />
          )}
          {meta.isMockOnly && (
            <MetaBadge label="Mock 데이터" variant="warning" />
          )}
          {meta.isStaleBased && <MetaBadge label="Stale" variant="warning" />}
          {meta.isPartial && <MetaBadge label="Partial" variant="warning" />}
        </div>

        {/* 추천 vs 선택 비교 */}
        {result.recommendedIndustry &&
          result.recommendedIndustry !== result.selectedIndustry && (
            <div className="mt-2 flex items-start gap-2 rounded-md bg-white/60 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
              <p className="text-xs text-gray-600">
                추천 업종은{" "}
                {
                  INDUSTRIES.find((i) => i.value === result.recommendedIndustry)
                    ?.label
                }
                이었으나, {result.industryLabel} 업종을 선택하여 적용했습니다.
              </p>
            </div>
          )}
      </div>

      {/* 추가 경고 */}
      {result.additionalWarnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            <div className="space-y-1">
              {result.additionalWarnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-amber-700">
                  {w}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 블록 그룹별 아코디언 */}
      {blockGroups.map((group) => {
        if (!group.blocks || group.blocks.length === 0) return null;
        const isExpanded = expandedSections.has(group.key);

        return (
          <div
            key={group.key}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          >
            <button
              onClick={() => toggle(group.key)}
              className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
                  {group.icon}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {group.label}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  {group.blocks.length}개
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
            {isExpanded && (
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                {group.blocks.map((block: any, i: number) => (
                  <div key={block.id ?? i} className="px-4 py-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        {block.blockType}
                      </span>
                      {block.emphasis && block.emphasis !== "OPTIONAL" && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                            block.emphasis === "REQUIRED"
                              ? "bg-red-100 text-red-600"
                              : block.emphasis === "EMPHASIZED"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {block.emphasis}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {block.title}
                    </h4>
                    {block.oneLiner && (
                      <p className="mt-0.5 text-xs text-gray-600">
                        {block.oneLiner}
                      </p>
                    )}
                    {block.sentences && block.sentences.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {block.sentences
                          .slice(0, 5)
                          .map((s: any, j: number) => (
                            <li key={j} className="text-xs text-gray-700">
                              {s.qualityNote && (
                                <span className="mr-1 text-amber-500">
                                  [{s.qualityNote}]
                                </span>
                              )}
                              {s.sentence}
                            </li>
                          ))}
                        {block.sentences.length > 5 && (
                          <li className="text-xs text-gray-400">
                            ...외 {block.sentences.length - 5}건
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Intelligence Panel ─────────────────────────────────────────────

const INTELLIGENCE_TABS = [
  { key: "summary", label: "Intelligence 요약" },
  { key: "radial", label: "키워드 확장 그래프" },
  { key: "benchmark", label: "벤치마크 비교" },
  { key: "signal", label: "시그널 융합" },
  { key: "taxonomy", label: "Taxonomy 분포" },
] as const;

function IntelligencePanel({
  result,
  seedKeyword,
  activeTab,
  onTabChange,
}: {
  result: any;
  seedKeyword: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const [selectedNode, setSelectedNode] = useState<{
    type: string;
    label: string;
    category?: string;
    clusterCount?: number;
    taxonomyTags?: string[];
  } | null>(null);

  const intel = result.intelligence;
  if (!intel) return null;

  const signalQuality = intel.signalQuality ?? {
    hasClusterData: false,
    hasSocialData: false,
    hasBenchmarkData: false,
    overallRichness: "MINIMAL",
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-violet-500" />
        <h2 className="text-lg font-bold text-gray-900">
          Vertical Intelligence
        </h2>
        <span
          className={`ml-2 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            signalQuality.overallRichness === "RICH"
              ? "bg-emerald-100 text-emerald-700"
              : signalQuality.overallRichness === "MODERATE"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {signalQuality.overallRichness === "RICH"
            ? "풍부"
            : signalQuality.overallRichness === "MODERATE"
              ? "보통"
              : "최소"}
        </span>
      </div>

      {/* 상태 패널 */}
      <IntelligenceStatePanel
        confidence={result.metadata.confidence}
        isPartial={result.metadata.isPartial}
        isStaleBased={result.metadata.isStaleBased}
        isMockOnly={result.metadata.isMockOnly}
        signalQuality={signalQuality}
        warnings={result.additionalWarnings}
      />

      {/* 탭 네비게이션 */}
      <div className="scrollbar-none -mx-1 overflow-x-auto px-1">
        <div className="flex min-w-max gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 sm:min-w-0">
          {INTELLIGENCE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-md px-3 py-2.5 text-xs font-medium transition-all sm:flex-1 ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        {activeTab === "summary" && (
          <IntelligenceSummaryCards
            industryType={result.selectedIndustry}
            industryLabel={result.industryLabel}
            signalQuality={signalQuality}
            taxonomyMapping={intel.taxonomyMapping}
            benchmarkBaseline={intel.benchmarkBaseline ?? []}
            benchmarkComparison={intel.benchmarkComparison}
            socialIntegration={intel.socialIntegration}
            fusedEvidenceCount={intel.fusedEvidenceCount ?? 0}
            fusedInsightCount={intel.fusedInsightCount ?? 0}
            fusedWarningCount={intel.fusedWarningCount ?? 0}
            metadata={result.metadata}
          />
        )}

        {activeTab === "radial" && (
          <IntelligenceRadialGraph
            seedKeyword={seedKeyword}
            industryType={result.selectedIndustry}
            taxonomyCategories={
              intel.taxonomyMapping?.coveredCategories?.map((c: any) => ({
                category: c.category,
                clusterCount: c.clusterCount,
              })) ?? []
            }
            dataBlocks={(result.dataBlocks ?? []).map((b: any) => ({
              blockType: b.blockType,
              title: b.title,
              taxonomyTags: b.taxonomyTags,
            }))}
            signalQuality={signalQuality}
            onNodeClick={(node) => setSelectedNode(node)}
          />
        )}

        {activeTab === "benchmark" && (
          <BenchmarkDifferentialRing
            industryType={result.selectedIndustry}
            industryLabel={result.industryLabel}
            comparisons={
              intel.benchmarkComparison?.comparisons?.map((c: any) => ({
                key: c.metricKey ?? c.key,
                label: c.metricLabel ?? c.label,
                rating: c.rating,
                baseline: c.baselineValue ?? c.baseline,
                actual: c.actualValue ?? c.actual,
                deviation: c.deviation ?? c.deviationPercent ?? 0,
                interpretation: c.interpretation ?? "",
              })) ?? null
            }
            baseline={intel.benchmarkBaseline ?? []}
          />
        )}

        {activeTab === "signal" && (
          <SignalFusionOverlayPanel
            signalQuality={signalQuality}
            fusedEvidenceCount={intel.fusedEvidenceCount ?? 0}
            fusedInsightCount={intel.fusedInsightCount ?? 0}
            fusedWarningCount={intel.fusedWarningCount ?? 0}
            socialIntegration={intel.socialIntegration}
            taxonomyMapping={intel.taxonomyMapping}
          />
        )}

        {activeTab === "taxonomy" && intel.taxonomyMapping && (
          <TaxonomyHeatMatrix
            industryType={result.selectedIndustry}
            coveredCategories={intel.taxonomyMapping.coveredCategories ?? []}
            uncoveredCategories={
              intel.taxonomyMapping.uncoveredCategories ?? []
            }
            totalClusters={intel.taxonomyMapping.totalClusters ?? 0}
          />
        )}

        {activeTab === "taxonomy" && !intel.taxonomyMapping && (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">
            클러스터 데이터가 없어 Taxonomy 매핑을 수행할 수 없습니다.
          </div>
        )}
      </div>

      {/* Evidence Side Panel — 노드 클릭 시 열림 */}
      <EvidenceSidePanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        industryType={result.selectedIndustry}
        industryLabel={result.industryLabel}
        dataBlocks={result.dataBlocks}
        benchmarkBaseline={intel.benchmarkBaseline}
        socialIntegration={intel.socialIntegration}
      />
    </div>
  );
}

// ─── Comparison Panel ────────────────────────────────────────────────

function ComparisonPanel({
  isLoading,
  data,
  error,
}: {
  isLoading: boolean;
  data: any;
  error: any;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="space-y-3 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">
            4개 업종 비교 프리뷰 생성 중...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
        <div>
          <p className="text-[13px] font-medium text-red-700">
            비교 프리뷰 생성 오류
          </p>
          <p className="mt-0.5 text-[12px] text-red-600">
            {error?.message ?? "알 수 없는 오류"}
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // comparisonPreview returns the comparison result
  const preview = data;

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-bold text-gray-900">4개 업종 비교</h3>

      {/* 업종 추천 */}
      {preview.suggestion && (
        <div className="text-sm text-gray-600">
          추천 업종:{" "}
          <strong>{preview.suggestion.suggestedIndustry ?? "없음"}</strong>{" "}
          (신뢰도: {Math.round((preview.suggestion.confidence ?? 0) * 100)}%)
        </div>
      )}

      {/* 업종별 프리뷰 카드 */}
      {preview.previews && preview.previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {preview.previews.map((pv: any) => {
            const ind = INDUSTRIES.find((i) => i.value === pv.industry);
            const colors =
              INDUSTRY_COLORS[pv.industry] ?? INDUSTRY_COLORS.BEAUTY!;
            return (
              <div
                key={pv.industry}
                className={`rounded-lg border ${colors.border} ${colors.bg} p-3`}
              >
                <div className={`text-sm font-bold ${colors.text} mb-1`}>
                  {ind?.label ?? pv.industry}
                </div>
                <div className="space-y-0.5 text-xs text-gray-600">
                  <div>블록: {pv.blockPreview?.length ?? 0}개</div>
                  <div>경고: {pv.warningPreview?.length ?? 0}건</div>
                  <div>톤: {pv.tonePreview?.defaultTone ?? "N/A"}</div>
                  {pv.keyDifferences?.length > 0 && (
                    <div className="mt-1 border-t border-gray-200/50 pt-1">
                      {pv.keyDifferences
                        .slice(0, 2)
                        .map((d: string, i: number) => (
                          <div key={i} className="text-[10px] text-gray-500">
                            - {d}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 차이점 매트릭스 */}
      {preview.differenceMatrix && preview.differenceMatrix.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  항목
                </th>
                {INDUSTRIES.map((ind) => (
                  <th
                    key={ind.value}
                    className={`px-3 py-2 text-left text-xs font-medium ${INDUSTRY_COLORS[ind.value]!.text}`}
                  >
                    {ind.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {preview.differenceMatrix.map((row: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-medium text-gray-700">
                    {row.dimension}
                  </td>
                  {INDUSTRIES.map((ind) => (
                    <td key={ind.value} className="px-3 py-2 text-gray-600">
                      {row.values?.[ind.value] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Utility Components ─────────────────────────────────────────────

function MetaBadge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "warning" | "info";
}) {
  const cls =
    variant === "warning"
      ? "bg-amber-100 text-amber-700"
      : variant === "info"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${cls}`}
    >
      {label}
    </span>
  );
}
