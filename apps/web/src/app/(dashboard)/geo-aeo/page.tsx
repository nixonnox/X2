"use client";

import { useState, useCallback } from "react";
import {
  Globe,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  FileText,
  BarChart3,
  AlertTriangle,
  Loader2,
  Link2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Score Bar ──────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    sky: "bg-sky-500",
  };
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-gray-600">{label}</span>
        <span className="text-[11px] font-semibold text-gray-800">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${colorMap[color] ?? "bg-gray-400"}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "RISING")
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />;
  if (trend === "DECLINING")
    return <TrendingDown className="h-3.5 w-3.5 text-red-500" />;
  return <Minus className="h-3.5 w-3.5 text-gray-400" />;
}

// ─── Page ───────────────────────────────────────────────────

export default function GeoAeoPage() {
  const projectId = "default";

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "keywords" | "citations" | "scorer"
  >("dashboard");
  const [newKeyword, setNewKeyword] = useState("");
  const [scoreUrl, setScoreUrl] = useState("");

  const dashboardQuery = trpc.geoAeo.visibilityDashboard.useQuery({
    projectId,
  });
  const keywordsQuery = trpc.geoAeo.listKeywords.useQuery({ projectId });
  const citationSourcesQuery = trpc.geoAeo.listCitationSources.useQuery({
    projectId,
  });
  const citationHealthQuery = trpc.geoAeo.citationHealth.useQuery({
    projectId,
  });

  const registerMutation = trpc.geoAeo.registerKeyword.useMutation({
    onSuccess: () => {
      keywordsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const deleteMutation = trpc.geoAeo.deleteKeyword.useMutation({
    onSuccess: () => {
      keywordsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const collectMutation = trpc.geoAeo.collectSnapshot.useMutation({
    onSuccess: () => {
      keywordsQuery.refetch();
      dashboardQuery.refetch();
    },
  });
  const scoreMutation = trpc.geoAeo.scoreUrl.useMutation();

  const dashboard = dashboardQuery.data;
  const keywords = keywordsQuery.data?.keywords ?? [];
  const citationSources = citationSourcesQuery.data?.sources ?? [];
  const citationHealth = citationHealthQuery.data;

  const handleRegister = useCallback(() => {
    if (!newKeyword.trim()) return;
    registerMutation.mutate({
      projectId,
      keyword: newKeyword.trim(),
      targetEngines: ["PERPLEXITY", "GOOGLE_AI_OVERVIEW"],
    });
    setNewKeyword("");
  }, [newKeyword, projectId, registerMutation]);

  const handleScore = useCallback(() => {
    if (!scoreUrl.trim()) return;
    scoreMutation.mutate({ url: scoreUrl.trim() });
  }, [scoreUrl, scoreMutation]);

  const tabs = [
    { id: "dashboard" as const, label: "가시성 대시보드", icon: BarChart3 },
    { id: "keywords" as const, label: "추적 키워드", icon: Search },
    { id: "citations" as const, label: "인용 소스", icon: Link2 },
    { id: "scorer" as const, label: "GEO 점수 분석", icon: Shield },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <Globe className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">GEO / AEO</h1>
        </div>
        <p className="text-sm text-gray-500">
          AI 검색 엔진에서 브랜드의 가시성과 인용 현황을 추적하고 최적화하세요.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Dashboard Tab ── */}
      {activeTab === "dashboard" && (
        <div>
          {dashboard && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {dashboard.overall.averageVisibility}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  평균 가시성 점수
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {dashboard.overall.keywordsTracked}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">추적 키워드</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {dashboard.overall.enginesTracked}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">추적 엔진</p>
              </div>
            </div>
          )}

          {dashboard &&
            (dashboard.risingKeywords.length > 0 ||
              dashboard.decliningKeywords.length > 0) && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dashboard.risingKeywords.length > 0 && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                      <TrendingUp className="h-4 w-4" /> 상승 키워드
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dashboard.risingKeywords.map((k: string) => (
                        <span
                          key={k}
                          className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {dashboard.decliningKeywords.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                      <TrendingDown className="h-4 w-4" /> 하락 키워드
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {dashboard.decliningKeywords.map((k: string) => (
                        <span
                          key={k}
                          className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-medium text-red-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          {dashboard && dashboard.byKeyword.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                      키워드
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                      평균 점수
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                      엔진별 현황
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.byKeyword.map((kw: any) => (
                    <tr
                      key={kw.keywordId}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {kw.keyword}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            kw.averageScore >= 60
                              ? "bg-emerald-100 text-emerald-700"
                              : kw.averageScore >= 30
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {kw.averageScore}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {kw.engines.map((e: any) => (
                            <div
                              key={e.engine}
                              className="flex items-center gap-1"
                            >
                              <TrendIcon trend={e.trend} />
                              <span className="text-[10px] text-gray-500">
                                {e.engine.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] font-medium text-gray-700">
                                {e.currentScore}
                              </span>
                            </div>
                          ))}
                          {kw.engines.length === 0 && (
                            <span className="text-[10px] text-gray-400">
                              스냅샷 없음
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {dashboard && dashboard.byKeyword.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <Globe className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                추적 중인 키워드가 없어요.
              </p>
              <button
                onClick={() => setActiveTab("keywords")}
                className="mt-2 text-xs text-indigo-600 hover:underline"
              >
                키워드 등록하기
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Keywords Tab ── */}
      {activeTab === "keywords" && (
        <div>
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRegister()}
              placeholder="추적할 키워드 입력..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
            />
            <button
              onClick={handleRegister}
              disabled={registerMutation.isPending || !newKeyword.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> 등록
            </button>
          </div>

          <div className="space-y-3">
            {keywords.map((kw: any) => (
              <div
                key={kw.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {kw.keyword}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      {kw.locale}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${kw.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}
                    >
                      {kw.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        collectMutation.mutate({
                          keywordId: kw.id,
                          engine: "PERPLEXITY",
                        })
                      }
                      disabled={collectMutation.isPending}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
                      title="스냅샷 수집"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${collectMutation.isPending ? "animate-spin" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate({ id: kw.id })}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {kw.snapshots && kw.snapshots.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {kw.snapshots.slice(0, 4).map((snap: any) => (
                      <div
                        key={snap.id}
                        className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10px]"
                      >
                        <span className="font-medium text-gray-700">
                          {snap.engine.replace(/_/g, " ")}
                        </span>
                        <span className="ml-1.5 text-gray-500">
                          점수: {snap.visibilityScore ?? 0}
                        </span>
                        {snap.brandMentioned && (
                          <span className="ml-1 text-emerald-600">
                            브랜드 언급
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400">
                    스냅샷 없음 — 수집 버튼을 눌러 시작하세요
                  </p>
                )}
              </div>
            ))}

            {keywords.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
                <Search className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p className="text-sm text-gray-500">등록된 키워드가 없어요</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Citations Tab ── */}
      {activeTab === "citations" && (
        <div>
          {citationHealth && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {citationHealth.total}
                </p>
                <p className="text-[11px] text-gray-500">전체 소스</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {citationHealth.cited}
                </p>
                <p className="text-[11px] text-gray-500">인용됨</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-red-500">
                  {citationHealth.uncited}
                </p>
                <p className="text-[11px] text-gray-500">미인용</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {citationHealth.citationRate}%
                </p>
                <p className="text-[11px] text-gray-500">인용률</p>
              </div>
            </div>
          )}

          {citationHealth && citationHealth.needsOptimization.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" /> 최적화 필요
              </div>
              <div className="space-y-1.5">
                {citationHealth.needsOptimization.map((s: any) => (
                  <div
                    key={s.url}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-[70%] truncate text-gray-700 hover:text-indigo-600"
                    >
                      {s.title}
                    </a>
                    <span className="text-amber-600">{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {citationSources.length > 0 ? (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                      소스
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                      유형
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                      인용 수
                    </th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">
                      GEO 최적화
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {citationSources.map((src: any) => (
                    <tr
                      key={src.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-gray-700 hover:text-indigo-600"
                        >
                          {src.title} <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px]">
                          {src.sourceType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {src.currentCitationCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {src.geoOptimized ? (
                          <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-gray-300" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                <p className="text-sm text-gray-500">
                  등록된 인용 소스가 없어요
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Scorer Tab ── */}
      {activeTab === "scorer" && (
        <div>
          <div className="mb-4 flex gap-2">
            <input
              type="url"
              value={scoreUrl}
              onChange={(e) => setScoreUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScore()}
              placeholder="분석할 URL 입력 (https://...)"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
            />
            <button
              onClick={handleScore}
              disabled={scoreMutation.isPending || !scoreUrl.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              {scoreMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              분석
            </button>
          </div>

          {scoreMutation.data?.error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {scoreMutation.data.error}
            </div>
          )}

          {scoreMutation.data?.scores && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="mb-6 text-center">
                <p className="text-4xl font-bold text-indigo-600">
                  {scoreMutation.data.scores.overall}
                </p>
                <p className="mt-1 text-sm text-gray-500">종합 GEO 점수</p>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <ScoreBar
                    label="구조 (Structure)"
                    score={scoreMutation.data.scores.structure}
                    color="indigo"
                  />
                  <ScoreBar
                    label="답변성 (Answerability)"
                    score={scoreMutation.data.scores.answerability}
                    color="emerald"
                  />
                  <ScoreBar
                    label="신뢰도 (Trust)"
                    score={scoreMutation.data.scores.trust}
                    color="amber"
                  />
                  <ScoreBar
                    label="인용 준비도 (Citation Readiness)"
                    score={scoreMutation.data.scores.citationReadiness}
                    color="sky"
                  />
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-3 text-xs font-semibold text-gray-700">
                    상세 분석
                  </h3>
                  <div className="space-y-1.5 text-[11px]">
                    {Object.entries(scoreMutation.data.scores.details).map(
                      ([key, val]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between"
                        >
                          <span className="text-gray-500">{key}</span>
                          <span
                            className={`font-medium ${val ? "text-emerald-600" : "text-gray-400"}`}
                          >
                            {typeof val === "boolean"
                              ? val
                                ? "Yes"
                                : "No"
                              : String(val)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!scoreMutation.data && !scoreMutation.isPending && (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <Shield className="mx-auto mb-3 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                URL을 입력하면 GEO/AEO 최적화 점수를 분석해드려요
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                구조, 답변성, 신뢰도, 인용 준비도 4가지 축으로 평가합니다
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
