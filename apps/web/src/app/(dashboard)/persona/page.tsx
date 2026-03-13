"use client";

import { useState, useCallback, useMemo } from "react";
import { Search, Loader2, Users, User, Sparkles, Target } from "lucide-react";
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
import type {
  IntentGraphData,
  IntentCategory,
  TemporalPhase,
} from "@/lib/intent-engine";
import {
  INTENT_CATEGORY_LABELS,
  TEMPORAL_PHASE_LABELS,
} from "@/lib/intent-engine";

// ── Types ──

type AnalysisState =
  | { status: "idle" }
  | { status: "loading"; keyword: string }
  | { status: "error"; keyword: string; message: string }
  | { status: "success"; keyword: string; data: IntentGraphData };

type PersonaProfile = {
  id: string;
  label: string;
  description: string;
  dominantIntent: IntentCategory;
  dominantPhase: TemporalPhase;
  keywords: string[];
  traits: { axis: string; value: number }[];
  topQuestions: string[];
  contentStrategy: string;
  percentage: number;
};

// ── Colors ──

const PERSONA_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

// ── Persona Generator ──

function generatePersonas(
  data: IntentGraphData,
  seedKeyword: string,
): PersonaProfile[] {
  const { clusters, nodes } = data;
  if (clusters.length === 0) return [];

  const totalKeywords = nodes.length;
  const personas: PersonaProfile[] = [];

  // Group clusters by dominant intent + phase
  const groups = new Map<string, typeof clusters>();
  for (const cluster of clusters) {
    const key = `${cluster.dominantIntent}:${cluster.dominantPhase}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(cluster);
  }

  let idx = 0;
  for (const [key, groupClusters] of groups) {
    const [intent, phase] = key.split(":") as [IntentCategory, TemporalPhase];
    const allKeywords = groupClusters.flatMap((c) => c.keywords);
    const avgGap =
      groupClusters.reduce((s, c) => s + c.avgGapScore, 0) /
      groupClusters.length;
    const avgVol =
      groupClusters.reduce((s, c) => s + c.avgSearchVolume, 0) /
      groupClusters.length;

    const intentLabel = INTENT_CATEGORY_LABELS[intent]?.label ?? intent;
    const phaseLabel = TEMPORAL_PHASE_LABELS[phase]?.label ?? phase;

    const personaLabels: Record<
      string,
      { label: string; desc: string; questions: string[]; strategy: string }
    > = {
      "discovery:before": {
        label: "탐색 입문자",
        desc: `${seedKeyword}에 대해 처음 알아보고 있는 단계의 사용자. 기본 개념과 필요성을 파악하려 합니다.`,
        questions: [
          `${seedKeyword}이(가) 무엇인가요?`,
          "왜 필요한가요?",
          "어디서부터 시작하나요?",
        ],
        strategy: "초보자 가이드, 개념 설명, FAQ 콘텐츠 제작",
      },
      "discovery:current": {
        label: "정보 수집가",
        desc: `${seedKeyword} 관련 다양한 정보를 적극적으로 수집하고 있는 사용자입니다.`,
        questions: [
          "최신 트렌드는?",
          "주요 특징은 뭔가요?",
          "어떤 종류가 있나요?",
        ],
        strategy: "심층 분석 리포트, 트렌드 브리핑, 리스트 콘텐츠",
      },
      "comparison:current": {
        label: "비교 분석가",
        desc: "여러 옵션을 꼼꼼히 비교하고 최적의 선택을 하려는 합리적 사용자입니다.",
        questions: ["A와 B 차이점은?", "가성비가 좋은 건?", "실사용 후기는?"],
        strategy: "비교표, VS 콘텐츠, 실제 사용 리뷰",
      },
      "action:current": {
        label: "즉시 실행자",
        desc: "이미 결정을 내렸고 즉시 행동으로 옮기려는 목적 지향적 사용자입니다.",
        questions: ["어디서 구매하나요?", "가장 빠른 방법은?", "할인 정보는?"],
        strategy: "구매 가이드, 가격 비교, 프로모션 안내",
      },
      "troubleshooting:after": {
        label: "문제 해결사",
        desc: `${seedKeyword} 사용 후 문제를 겪고 해결책을 찾고 있는 사용자입니다.`,
        questions: [
          "이 에러는 왜 발생하나요?",
          "환불 절차는?",
          "대안이 있나요?",
        ],
        strategy: "문제 해결 가이드, FAQ, 고객 지원 콘텐츠",
      },
    };

    const template = personaLabels[`${intent}:${phase}`] ??
      personaLabels[`${intent}:current`] ?? {
        label: `${intentLabel} ${phaseLabel} 사용자`,
        desc: `${seedKeyword} 관련 ${intentLabel} 의도를 가진 ${phaseLabel} 단계의 사용자입니다.`,
        questions: [
          `${seedKeyword} 관련 주요 궁금증은?`,
          "어떤 콘텐츠가 필요한가요?",
          "핵심 니즈는?",
        ],
        strategy: `${intentLabel} 의도에 맞는 콘텐츠 제작`,
      };

    personas.push({
      id: `persona-${idx}`,
      label: template.label,
      description: template.desc,
      dominantIntent: intent,
      dominantPhase: phase,
      keywords: allKeywords.slice(0, 15),
      traits: [
        { axis: "정보 니즈", value: intent === "discovery" ? 90 : 50 },
        { axis: "비교 성향", value: intent === "comparison" ? 85 : 40 },
        { axis: "행동 의지", value: intent === "action" ? 95 : 35 },
        { axis: "문제 의식", value: intent === "troubleshooting" ? 90 : 30 },
        { axis: "가격 민감도", value: avgGap > 50 ? 70 : 45 },
        { axis: "트렌드 관심", value: avgVol > 1000 ? 80 : 50 },
      ],
      topQuestions: template.questions,
      contentStrategy: template.strategy,
      percentage: Math.round((allKeywords.length / totalKeywords) * 100),
    });
    idx++;
  }

  return personas.sort((a, b) => b.percentage - a.percentage).slice(0, 6);
}

// ── Component ──

export default function PersonaViewPage() {
  const [inputValue, setInputValue] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" });
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);

  const handleAnalyze = useCallback(
    async (keyword?: string) => {
      const seed = (keyword ?? inputValue).trim();
      if (!seed) return;
      setAnalysis({ status: "loading", keyword: seed });
      setSelectedPersona(null);
      try {
        const res = await fetch("/api/intent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seedKeyword: seed,
            mode: "sync",
            maxDepth: 2,
            maxKeywords: 150,
            platforms: ["youtube", "instagram", "tiktok", "naver_blog"],
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.success || !json.data)
          throw new Error(json.error ?? "분석 결과가 없습니다.");
        setAnalysis({
          status: "success",
          keyword: seed,
          data: json.data as IntentGraphData,
        });
        setInputValue("");
      } catch (err) {
        setAnalysis({
          status: "error",
          keyword: seed,
          message: (err as Error).message,
        });
      }
    },
    [inputValue],
  );

  const personas = useMemo(() => {
    if (analysis.status !== "success") return [];
    return generatePersonas(analysis.data, analysis.keyword);
  }, [analysis]);

  const selectedPersonaData = useMemo(() => {
    if (!selectedPersona) return personas[0] ?? null;
    return personas.find((p) => p.id === selectedPersona) ?? null;
  }, [personas, selectedPersona]);

  // Persona distribution for pie chart
  const pieData = useMemo(() => {
    return personas.map((p, i) => ({
      name: p.label,
      value: p.percentage,
      fill: PERSONA_COLORS[i % PERSONA_COLORS.length],
    }));
  }, [personas]);

  // Intent distribution
  const intentBarData = useMemo(() => {
    if (analysis.status !== "success") return [];
    const dist = analysis.data.summary.intentDistribution;
    return Object.entries(INTENT_CATEGORY_LABELS)
      .filter(([key]) => key !== "unknown")
      .map(([key, { label, color }]) => ({
        name: label,
        count: dist[key as IntentCategory] ?? 0,
        fill: color,
      }));
  }, [analysis]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="페르소나 뷰"
        description="검색 의도 기반으로 소비자 유형을 자동 분류하고, 각 페르소나의 니즈와 행동 패턴을 분석합니다."
        guide="키워드를 분석하면 검색 의도와 시간적 단계를 기반으로 소비자 그룹을 자동으로 세분화합니다."
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
              disabled={analysis.status === "loading"}
            />
          </div>
          <button
            onClick={() => handleAnalyze()}
            disabled={!inputValue.trim() || analysis.status === "loading"}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            {analysis.status === "loading" ? (
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
        {analysis.status === "loading" && (
          <div className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-[13px] text-blue-700">
              소비자 페르소나를 분석하고 있습니다...
            </p>
          </div>
        )}
        {analysis.status === "error" && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2">
            <p className="text-[13px] text-red-700">
              분석 실패: {analysis.message}
            </p>
          </div>
        )}
      </div>

      {/* Empty */}
      {analysis.status === "idle" && (
        <EmptyState
          icon={Users}
          title="검색 의도 기반 소비자 페르소나"
          description="키워드를 입력하면 검색 패턴을 분석하여 소비자 유형을 자동으로 분류합니다. 각 페르소나의 관심사, 질문, 콘텐츠 전략을 확인하세요."
        />
      )}

      {/* Results */}
      {analysis.status === "success" && personas.length > 0 && (
        <>
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
              title="검색 의도 분포"
              description="전체 키워드의 의도별 분류"
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentBarData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border-subtle)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
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
                    <Bar dataKey="count" name="키워드 수" radius={[3, 3, 0, 0]}>
                      {intentBarData.map((entry, i) => (
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
            {personas.map((persona, i) => {
              const isSelected =
                (selectedPersona ?? personas[0]?.id) === persona.id;
              return (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={`card p-4 text-left transition-all ${isSelected ? "shadow-md ring-2 ring-blue-500" : "hover:shadow-sm"}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
                      style={{
                        backgroundColor:
                          PERSONA_COLORS[i % PERSONA_COLORS.length],
                      }}
                    >
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">
                        {persona.label}
                      </p>
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
                        backgroundColor:
                          (INTENT_CATEGORY_LABELS[persona.dominantIntent]
                            ?.color ?? "#6b7280") + "20",
                        color:
                          INTENT_CATEGORY_LABELS[persona.dominantIntent]
                            ?.color ?? "#6b7280",
                      }}
                    >
                      {INTENT_CATEGORY_LABELS[persona.dominantIntent]?.label ??
                        persona.dominantIntent}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor:
                          (TEMPORAL_PHASE_LABELS[persona.dominantPhase]
                            ?.color ?? "#6b7280") + "20",
                        color:
                          TEMPORAL_PHASE_LABELS[persona.dominantPhase]?.color ??
                          "#6b7280",
                      }}
                    >
                      {TEMPORAL_PHASE_LABELS[persona.dominantPhase]?.label ??
                        persona.dominantPhase}
                    </span>
                  </div>
                </button>
              );
            })}
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
                        dataKey="axis"
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
                <div className="card p-4">
                  <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">
                    <Target className="h-3.5 w-3.5 text-blue-500" />
                    핵심 질문
                  </h3>
                  <div className="space-y-1.5">
                    {selectedPersonaData.topQuestions.map((q, i) => (
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
                </div>

                <div className="card p-4">
                  <h3 className="mb-2 text-[13px] font-semibold">
                    관련 키워드
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPersonaData.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-[11px] font-medium"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
