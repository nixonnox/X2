"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Loader2,
  Users,
  User,
  Sparkles,
  Target,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { PageHeader, ChartCard, EmptyState } from "@/components/shared";
import { usePersonaQuery } from "@/features/persona-cluster";
import type { PersonaViewModel } from "@/features/persona-cluster";
import { ScreenStatePanel } from "@/features/persona-cluster/components/ScreenStatePanel";
import { PERSONA_ARCHETYPE_LABELS } from "@/lib/persona-cluster-engine";

// ── Colors ──

const PERSONA_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16",
];

// ── Component ──

export default function PersonaViewPage() {
  const [inputValue, setInputValue] = useState("");
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");

  const { personas, summary, screenState, analyze } = usePersonaQuery();

  const handleAnalyze = async (kw?: string) => {
    const seed = (kw ?? inputValue).trim();
    if (!seed) return;
    setKeyword(seed);
    setSelectedPersona(null);
    setInputValue("");
    await analyze(seed);
  };

  const selectedPersonaData = useMemo(() => {
    if (personas.length === 0) return null;
    if (!selectedPersona) return personas[0];
    return personas.find((p) => p.id === selectedPersona) ?? personas[0];
  }, [personas, selectedPersona]);

  // Persona distribution for pie chart
  const pieData = useMemo(() => {
    return personas.map((p, i) => ({
      name: p.label,
      value: p.percentage,
      fill: PERSONA_COLORS[i % PERSONA_COLORS.length],
    }));
  }, [personas]);

  // Archetype distribution bar chart
  const archetypeBarData = useMemo(() => {
    if (!summary) return [];
    return summary.archetypeDistribution
      .filter((a) => a.count > 0)
      .map((a) => {
        const key = Object.entries(PERSONA_ARCHETYPE_LABELS).find(
          ([, v]) => v.label === a.label,
        );
        return {
          name: a.label,
          count: a.count,
          fill: key ? PERSONA_ARCHETYPE_LABELS[key[0] as keyof typeof PERSONA_ARCHETYPE_LABELS].color : "#6b7280",
        };
      });
  }, [summary]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="페르소나 뷰"
        description="검색 의도 기반으로 소비자 유형을 자동 분류하고, 각 페르소나의 니즈와 행동 패턴을 분석합니다."
        guide="키워드를 분석하면 검색 패턴을 분석하여 소비자 그룹을 자동으로 세분화합니다."
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
              placeholder="페르소나 분석할 키워드를 입력하세요"
              className="input w-full pl-8"
              disabled={screenState.status === "loading"}
            />
          </div>
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
                <Users className="h-3.5 w-3.5" /> 페르소나 분석
              </>
            )}
          </button>
        </div>
        <ScreenStatePanel
          state={screenState}
          keyword={keyword}
          loadingMessage="소비자 페르소나를 분석하고 있습니다..."
        />
      </div>

      {/* Empty / Idle */}
      {screenState.status === "idle" && (
        <EmptyState
          icon={Users}
          title="검색 의도 기반 소비자 페르소나"
          description="키워드를 입력하면 검색 패턴을 분석하여 소비자 유형을 자동으로 분류합니다. 각 페르소나의 관심사, 질문, 콘텐츠 전략을 확인하세요."
        />
      )}

      {/* Results */}
      {screenState.status === "success" && !screenState.isEmpty && (
        <>
          {/* Meta info */}
          {screenState.durationMs != null && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              분석 완료 · {summary?.totalPersonas}개 페르소나 · {summary?.totalClusters}개 클러스터 · {summary?.totalKeywords}개 키워드 · {(screenState.durationMs / 1000).toFixed(1)}초
            </p>
          )}

          {/* Charts Row */}
          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="페르소나 분포"
              description="키워드 비중 기반 소비자 유형 비율"
            >
              <div className="flex h-56 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value}%`}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {pieData.map((entry, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px]">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    {entry.name} ({entry.value}%)
                  </span>
                ))}
              </div>
            </ChartCard>

            <ChartCard
              title="아키타입 분포"
              description="검색 행동 기반 소비자 유형 분류"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={archetypeBarData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <Bar dataKey="count" name="페르소나 수" radius={[3, 3, 0, 0]}>
                      {archetypeBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Persona Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona, i) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                color={PERSONA_COLORS[i % PERSONA_COLORS.length]!}
                isSelected={(selectedPersona ?? personas[0]?.id) === persona.id}
                onSelect={() => setSelectedPersona(persona.id)}
              />
            ))}
          </div>

          {/* Selected Persona Detail */}
          {selectedPersonaData && (
            <div className="grid gap-3 lg:grid-cols-2">
              {/* Radar Chart */}
              <ChartCard
                title={`${selectedPersonaData.label} 특성`}
                description="페르소나 성향 레이더 차트"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={selectedPersonaData.traits}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <PolarRadiusAxis
                        tick={{ fontSize: 10 }}
                        domain={[0, 100]}
                      />
                      <Radar
                        name={selectedPersonaData.label}
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Persona Insights */}
              <div className="space-y-3">
                {/* Low confidence warning */}
                {selectedPersonaData.lowConfidenceFlag && (
                  <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
                    <p className="text-[11px] text-orange-700">
                      이 페르소나의 신뢰도가 낮습니다 (신뢰도: {Math.round(selectedPersonaData.confidence * 100)}%). 데이터가 더 축적되면 정확도가 향상됩니다.
                    </p>
                  </div>
                )}

                {/* Summary */}
                {selectedPersonaData.summary && (
                  <div className="card p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      요약
                    </h3>
                    <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                      {selectedPersonaData.summary}
                    </p>
                  </div>
                )}

                <div className="card p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                    <Target className="h-3.5 w-3.5 text-blue-500" />
                    핵심 질문
                  </h3>
                  <div className="space-y-1.5">
                    {selectedPersonaData.typicalQuestions.map((q, i) => (
                      <p
                        key={i}
                        className="flex gap-2 text-[12px] text-[var(--muted-foreground)]"
                      >
                        <span className="font-medium text-blue-500">
                          Q{i + 1}.
                        </span>{" "}
                        {q}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    콘텐츠 전략
                  </h3>
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    {selectedPersonaData.contentStrategy}
                  </p>
                  {selectedPersonaData.messagingAngle && (
                    <p className="mt-2 text-[12px] text-[var(--muted-foreground)]">
                      <span className="font-medium">메시지 각도:</span>{" "}
                      {selectedPersonaData.messagingAngle}
                    </p>
                  )}
                </div>

                <div className="card p-4">
                  <h3 className="mb-2 text-[13px] font-semibold">
                    관련 키워드
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersonaData.representativeKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Related info badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[11px]">
                    관련 클러스터 {selectedPersonaData.relatedClusterCount}개
                  </span>
                  <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[11px]">
                    여정 단계: {selectedPersonaData.likelyStageLabel}
                  </span>
                  <span className="rounded-full bg-[var(--secondary)] px-2.5 py-1 text-[11px]">
                    마인드셋: {selectedPersonaData.mindset}
                  </span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Persona Card ──

function PersonaCard({
  persona,
  color,
  isSelected,
  onSelect,
}: {
  persona: PersonaViewModel;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`card p-4 text-left transition-all ${isSelected ? "shadow-md ring-2 ring-blue-500" : "hover:shadow-sm"}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
          style={{ backgroundColor: color }}
        >
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">{persona.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--muted-foreground)]">
            {persona.description}
          </p>
        </div>
        <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium">
          {persona.percentage}%
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: color + "20",
            color,
          }}
        >
          {persona.dominantIntentLabel}
        </span>
        <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-medium">
          {persona.likelyStageLabel}
        </span>
        {persona.lowConfidenceFlag && (
          <span className="flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-600">
            <AlertTriangle className="h-2.5 w-2.5" /> 낮은 신뢰도
          </span>
        )}
      </div>

      {/* Dominant topics */}
      {persona.dominantTopics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {persona.dominantTopics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px]"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
