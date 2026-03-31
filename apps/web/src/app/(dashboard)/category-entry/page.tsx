"use client";

import { useState, useCallback } from "react";
import { Layers, Search, Loader2, ArrowRight } from "lucide-react";
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
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  BEAUTY: "#ec4899", FASHION: "#8b5cf6", FOOD: "#f59e0b",
  TECH: "#3b82f6", HEALTH: "#10b981", FINANCE: "#6366f1",
  TRAVEL: "#14b8a6", EDUCATION: "#f97316", ENTERTAINMENT: "#ef4444",
  HOME_LIVING: "#84cc16", AUTO: "#64748b", BABY_KIDS: "#fb923c",
  SPORTS: "#0ea5e9", PET: "#a855f7", GENERAL: "#9ca3af",
};

const CATEGORY_LABELS: Record<string, string> = {
  BEAUTY: "뷰티", FASHION: "패션", FOOD: "식음료",
  TECH: "테크/IT", HEALTH: "건강", FINANCE: "금융/투자",
  TRAVEL: "여행", EDUCATION: "교육", ENTERTAINMENT: "엔터",
  HOME_LIVING: "홈/리빙", AUTO: "자동차", BABY_KIDS: "유아/키즈",
  SPORTS: "스포츠", PET: "반려동물", GENERAL: "일반",
};

const ENTRY_LABELS: Record<string, string> = {
  BRAND: "브랜드", NEED: "니즈/문제", FEATURE: "기능/속성",
  PRICE: "가격", TREND: "트렌드", COMPARISON: "비교", REVIEW: "후기",
};

const ENTRY_COLORS: Record<string, string> = {
  BRAND: "#6366f1", NEED: "#10b981", FEATURE: "#3b82f6",
  PRICE: "#f59e0b", TREND: "#ec4899", COMPARISON: "#f97316", REVIEW: "#8b5cf6",
};

type AnalysisResult = {
  seedKeyword: string;
  primaryCategory: string;
  categoryDistribution: { category: string; count: number; percent: number }[];
  entryTypeDistribution: { entryType: string; count: number; percent: number }[];
  topEntryPaths: { from: string; to: string; via: string; strength: number }[];
};

export default function CategoryEntryPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/category-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seedKeyword: keyword.trim() }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [keyword]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">카테고리 엔트리 포인트</h1>
        </div>
        <p className="text-sm text-gray-500">
          검색 키워드가 어떤 카테고리로, 어떤 경로로 진입하는지 분석합니다.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          placeholder="분석할 키워드 입력..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !keyword.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          분석
        </button>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Primary Category Badge */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">주요 카테고리:</span>
            <span
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white"
              style={{ backgroundColor: CATEGORY_COLORS[result.primaryCategory] ?? "#999" }}
            >
              {CATEGORY_LABELS[result.primaryCategory] ?? result.primaryCategory}
            </span>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Category Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold text-gray-600">카테고리 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={result.categoryDistribution.filter((d) => d.category !== "GENERAL")}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    dataKey="count"
                    label={({ category, percent }: any) =>
                      `${CATEGORY_LABELS[category] ?? category} ${percent}%`
                    }
                  >
                    {result.categoryDistribution.map((d, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? "#999"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v}건`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Entry Type Distribution */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-xs font-semibold text-gray-600">진입 유형 분포</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={result.entryTypeDistribution}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="entryType"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: any) => ENTRY_LABELS[v] ?? v}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v: any) => `${v}건`}
                    labelFormatter={(l: any) => ENTRY_LABELS[l] ?? l}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {result.entryTypeDistribution.map((d, i) => (
                      <Cell key={i} fill={ENTRY_COLORS[d.entryType] ?? "#999"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Entry Paths */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-xs font-semibold text-gray-600">주요 진입 경로</h3>
            <div className="space-y-2">
              {result.topEntryPaths.map((path, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span className="text-[12px] font-medium text-gray-700 min-w-[100px] truncate">
                    {path.from}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: ENTRY_COLORS[path.via] ?? "#999" }}
                    >
                      {ENTRY_LABELS[path.via] ?? path.via}
                    </span>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[path.to] ?? "#999" }}
                  >
                    {CATEGORY_LABELS[path.to] ?? path.to}
                  </span>
                  <div className="ml-auto h-1.5 w-20 rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${Math.round(path.strength * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {result.topEntryPaths.length === 0 && (
                <p className="text-center text-[11px] text-gray-400 py-4">
                  카테고리를 특정할 수 없는 키워드입니다
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Layers className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">키워드를 입력하면 카테고리 진입 경로를 분석해드려요</p>
        </div>
      )}
    </div>
  );
}
