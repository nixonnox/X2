"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search,
  Loader2,
  Route,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import {
  useRoadViewQuery,
  JourneyScreenStatePanel,
} from "@/features/journey";
import type {
  RoadStageViewModel,
  BranchPointViewModel,
} from "@/features/journey";

// ── Component ──

export default function RoadViewPage() {
  const [inputValue, setInputValue] = useState("");
  const [endKeyword, setEndKeyword] = useState("");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"stages" | "paths" | "gaps">("stages");

  const {
    stages,
    primaryPath,
    alternativePaths,
    branchPoints,
    summary,
    screenState,
    analyze,
  } = useRoadViewQuery();

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;
      setExpandedStage(null);
      await analyze(seed, {
        endKeyword: endKeyword.trim() || undefined,
      });
      setInputValue("");
    },
    [inputValue, endKeyword, analyze],
  );

  // Stage chart data
  const stageChartData = useMemo(() => {
    return stages.map((s) => ({
      name: s.label,
      keywords: s.keywordCount,
      avgGap: s.avgGapScore,
      fill: s.color,
    }));
  }, [stages]);

  // Top content gaps (sorted by gapScore)
  const topGaps = useMemo(() => {
    if (!summary) return [];
    return summary.topContentGaps;
  }, [summary]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="로드 뷰"
        description="6단계 소비자 결정 여정(인지→관심→비교→결정→실행→옹호)을 시각화합니다."
        guide="키워드를 입력하면 소비자가 해당 키워드를 중심으로 어떤 여정을 거치는지 분석합니다."
      />

      {/* Input */}
      <div className="card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="분석할 키워드를 입력하세요"
              className="input w-full pl-8"
              disabled={screenState.status === "loading"}
            />
          </div>
          <input
            type="text"
            value={endKeyword}
            onChange={(e) => setEndKeyword(e.target.value)}
            placeholder="도착 키워드 (선택)"
            className="input w-40"
            disabled={screenState.status === "loading"}
          />
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || screenState.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {screenState.status === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> 분석 중...
              </>
            ) : (
              <>
                <Route className="h-3.5 w-3.5" /> 로드 뷰 분석
              </>
            )}
          </button>
        </div>
        <JourneyScreenStatePanel
          state={screenState}
          keyword={summary?.seedKeyword}
          loadingMessage="소비자 결정 여정을 분석하고 있습니다..."
        />
      </div>

      {/* Empty */}
      {screenState.status === "idle" && (
        <EmptyState
          icon={Route}
          title="소비자 결정 여정을 추적합니다"
          description="키워드를 입력하면 인지→관심→비교→결정→실행→옹호 6단계로 소비자 여정을 분석합니다. 도착 키워드를 지정하면 A→B 방향성 경로 분석도 가능합니다."
        />
      )}

      {/* Results */}
      {screenState.status === "success" && summary && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">분석 키워드</p>
              <p className="mt-0.5 truncate text-[14px] font-semibold">
                {summary.seedKeyword}
                {summary.endKeyword && (
                  <span className="text-[11px] font-normal text-[var(--muted-foreground)]">
                    {" → "}{summary.endKeyword}
                  </span>
                )}
              </p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">여정 단계</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.totalStages}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">전체 키워드</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.totalKeywords}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">분기점</p>
              <p className="mt-0.5 text-[14px] font-semibold">{branchPoints.length}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">평균 갭 스코어</p>
              <p className="mt-0.5 text-[14px] font-semibold">{summary.avgGapScore}</p>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-1 rounded-lg bg-[var(--secondary)] p-1">
            {(
              [
                { key: "stages", label: "여정 단계" },
                { key: "paths", label: "경로 분석" },
                { key: "gaps", label: "콘텐츠 갭" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  viewMode === key
                    ? "bg-white text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Stages View */}
          {viewMode === "stages" && (
            <>
              {/* Stage Flow Visualization */}
              <div className="card p-4">
                <h3 className="mb-4 text-[13px] font-semibold">소비자 결정 여정 흐름</h3>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {stages.map((stage, i) => (
                    <div key={stage.id} className="flex items-center">
                      <button
                        onClick={() =>
                          setExpandedStage(
                            expandedStage === stage.id ? null : stage.id,
                          )
                        }
                        className={`flex min-w-[120px] flex-col items-center rounded-lg border-2 p-3 transition-colors ${
                          expandedStage === stage.id
                            ? "border-blue-300 bg-blue-50/50"
                            : "border-transparent hover:bg-[var(--secondary)]"
                        }`}
                      >
                        <div
                          className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
                          style={{ backgroundColor: stage.color }}
                        >
                          {stage.order + 1}
                        </div>
                        <span className="text-[12px] font-medium">{stage.label}</span>
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          {stage.keywordCount}개 키워드
                        </span>
                        {stage.lowConfidenceFlag && (
                          <AlertTriangle className="mt-1 h-3 w-3 text-orange-400" />
                        )}
                      </button>
                      {i < stages.length - 1 && (
                        <div className="flex flex-col items-center px-1">
                          <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                          {stage.nextTransition && (
                            <span className="text-[9px] text-[var(--muted-foreground)]">
                              {Math.round(stage.nextTransition.strength * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Expanded Stage Detail */}
              {expandedStage && (() => {
                const stage = stages.find((s) => s.id === expandedStage);
                if (!stage) return null;
                return (
                  <div className="card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.order + 1}
                      </div>
                      <h3 className="text-[13px] font-semibold">{stage.label}</h3>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {stage.dominantIntentLabel}
                      </span>
                    </div>
                    <p className="mb-3 text-[12px] text-[var(--muted-foreground)]">
                      {stage.description}
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {/* Keywords */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                          대표 키워드
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {stage.representativeKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                backgroundColor: stage.color + "20",
                                color: stage.color,
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Questions */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                          주요 질문
                        </p>
                        <div className="space-y-0.5">
                          {stage.majorQuestions.slice(0, 5).map((q, qi) => (
                            <p key={qi} className="text-[11px]">{q}</p>
                          ))}
                          {stage.majorQuestions.length === 0 && (
                            <p className="text-[11px] text-[var(--muted-foreground)]">질문 데이터 없음</p>
                          )}
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">키워드 수</span>
                          <span className="font-medium">{stage.keywordCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">평균 검색량</span>
                          <span className="font-medium">{stage.avgSearchVolume.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">평균 갭 스코어</span>
                          <span className="font-medium">{stage.avgGapScore}</span>
                        </div>
                        {stage.nextTransition && (
                          <div className="mt-2 rounded-md bg-[var(--secondary)] p-2">
                            <p className="text-[10px] font-medium text-[var(--muted-foreground)]">
                              다음 단계: {stage.nextTransition.toStageLabel}
                            </p>
                            <p className="text-[10px]">{stage.nextTransition.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Stage Chart */}
              <ChartCard
                title="단계별 키워드 분포"
                description="각 여정 단계의 키워드 수와 갭 스코어"
              >
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid var(--border)" }} />
                      <Bar dataKey="keywords" fill="#3b82f6" radius={[3, 3, 0, 0]} name="키워드 수">
                        {stageChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                      <Bar dataKey="avgGap" fill="#10b981" radius={[3, 3, 0, 0]} name="평균 갭 스코어" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </>
          )}

          {/* Paths View */}
          {viewMode === "paths" && (
            <>
              {/* Primary Path */}
              {primaryPath && (
                <div className="card overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-[13px] font-semibold">주요 경로</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {primaryPath.pathLabel} — {primaryPath.dominantIntentLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    {primaryPath.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-1.5">
                        {si > 0 && <ArrowRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />}
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          {step.keyword}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Paths */}
              {alternativePaths.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-[13px] font-semibold">대안 경로</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {alternativePaths.length}개의 대안 여정 경로
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {alternativePaths.map((path) => (
                      <div key={path.id} className="px-4 py-2.5">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[12px] font-medium">{path.pathLabel}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            path.pathType === "circular"
                              ? "bg-amber-50 text-amber-700"
                              : path.pathType === "branching"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-gray-50 text-gray-700"
                          }`}>
                            {path.pathTypeLabel}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {path.steps.slice(0, 6).map((step, si) => (
                            <span key={si} className="flex items-center gap-0.5 text-[10px] text-[var(--muted-foreground)]">
                              {si > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                              {step.keyword}
                            </span>
                          ))}
                          {path.steps.length > 6 && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">+{path.steps.length - 6}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch Points */}
              {branchPoints.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-[13px] font-semibold">분기점 분석</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      소비자가 다른 경로로 이탈하는 지점
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {branchPoints.map((bp, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[12px] font-medium">{bp.keyword}</span>
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            이탈률 {Math.round(bp.dropOffRate * 100)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {bp.alternatives.map((alt, ai) => (
                            <span
                              key={ai}
                              className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px]"
                            >
                              {alt.keyword}
                              <span className="ml-1 text-[var(--muted-foreground)]">
                                ({alt.intentLabel})
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!primaryPath && alternativePaths.length === 0 && (
                <div className="card px-4 py-8 text-center text-[12px] text-[var(--muted-foreground)]">
                  경로 데이터가 없습니다. 도착 키워드를 지정하면 A→B 경로 분석을 수행합니다.
                </div>
              )}
            </>
          )}

          {/* Gaps View */}
          {viewMode === "gaps" && (
            <>
              {/* Top Content Gaps */}
              {topGaps.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-[13px] font-semibold">콘텐츠 갭 Top 키워드</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      여정 단계별 콘텐츠 기회가 큰 키워드
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {topGaps.map((gap, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-700">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-medium">{gap.keyword}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            {gap.stageLabel} 단계
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                          갭 {gap.gapScore}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Questions */}
              {summary.topQuestions.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="border-b border-[var(--border)] px-4 py-3">
                    <h3 className="text-[13px] font-semibold">주요 질문</h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      소비자가 여정 중 묻는 핵심 질문
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {summary.topQuestions.map((q, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-50 text-[10px] font-bold text-purple-700">
                          Q
                        </span>
                        <p className="text-[12px]">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topGaps.length === 0 && summary.topQuestions.length === 0 && (
                <div className="card px-4 py-8 text-center text-[12px] text-[var(--muted-foreground)]">
                  콘텐츠 갭 데이터가 없습니다.
                </div>
              )}
            </>
          )}

          {/* Dominant Journey Summary */}
          <div className="card p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
              <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
              지배적 여정 흐름
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              {summary.dominantJourney.map((stageLabel, i) => (
                <span key={i} className="flex items-center gap-1 text-[12px]">
                  {i > 0 && <ArrowRight className="h-3 w-3 text-[var(--muted-foreground)]" />}
                  <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 font-medium">
                    {stageLabel}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
