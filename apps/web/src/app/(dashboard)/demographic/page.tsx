"use client";

import { useState } from "react";
import { Users, Search, Loader2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const GENDER_COLORS: Record<string, string> = {
  all: "#6366f1",
  male: "#3b82f6",
  female: "#ec4899",
};

const AGE_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#3b82f6", "#60a5fa", "#93c5fd",
  "#10b981", "#34d399", "#6ee7b7",
];

export default function DemographicPage() {
  const [keyword, setKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  const query = trpc.demographic.analyze.useQuery(
    { keyword: searchKeyword, months: 12 },
    { enabled: !!searchKeyword },
  );

  const data = query.data;

  const handleSearch = () => {
    if (keyword.trim()) setSearchKeyword(keyword.trim());
  };

  // Gender pie data
  const genderPieData = (data?.genderBreakdown ?? [])
    .filter((g) => g.key !== "all")
    .map((g) => ({
      name: g.label,
      value: g.avgRatio,
      color: GENDER_COLORS[g.key] ?? "#999",
    }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">인구통계 분석</h1>
        </div>
        <p className="text-sm text-gray-500">
          키워드의 성별/연령별 검색 트렌드를 분석합니다. (네이버 DataLab 기반)
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="분석할 키워드 입력..."
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
        />
        <button
          onClick={handleSearch}
          disabled={query.isFetching || !keyword.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          분석
        </button>
      </div>

      {/* Error */}
      {data && !data.available && data.error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {data.error}. 네이버 개발자센터에서 DataLab API 권한을 추가해주세요.
        </div>
      )}

      {/* Results */}
      {data && data.available && (
        <div className="space-y-6">
          {/* Gender Section */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">성별 검색 비율</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Gender Pie */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-xs font-medium text-gray-500">성별 비율</h3>
                {genderPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={genderPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }: any) => `${name} ${value}`}
                      >
                        {genderPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">데이터 없음</div>
                )}
              </div>

              {/* Gender KPI Cards */}
              <div className="space-y-3">
                {(data.genderBreakdown ?? []).map((g) => (
                  <div key={g.key} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: GENDER_COLORS[g.key] ?? "#999" }}
                      />
                      <span className="text-sm font-medium text-gray-700">{g.label}</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">{g.avgRatio}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Gender Timeline */}
          {(data.genderTimeline ?? []).length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">성별 검색 트렌드 (월별)</h2>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={(data.genderTimeline?.[0]?.data ?? []).map((d: any, i: number) => {
                      const point: any = { date: d.date };
                      for (const gt of data.genderTimeline ?? []) {
                        point[gt.key] = gt.data[i]?.value ?? 0;
                      }
                      return point;
                    })}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {(data.genderTimeline ?? []).map((gt) => (
                      <Line
                        key={gt.key}
                        type="monotone"
                        dataKey={gt.key}
                        name={gt.label}
                        stroke={GENDER_COLORS[gt.key] ?? "#999"}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Age Section */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">연령대별 검색 관심도</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              {(data.ageBreakdown ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ageBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l: string) => `연령대: ${l}`} />
                    <Bar dataKey="avgRatio" name="평균 관심도" radius={[4, 4, 0, 0]}>
                      {(data.ageBreakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={AGE_COLORS[i % AGE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">데이터 없음</div>
              )}
            </div>
          </section>

          {/* Insight */}
          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-[11px] text-gray-500">
              네이버 DataLab 기준 상대적 검색 관심도 (0-100). 특정 기간의 최고 검색량을 100으로 환산한 상대값입니다.
              성별/연령 필터는 네이버 개발자센터에서 DataLab API 권한이 활성화되어 있어야 합니다.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!data && !query.isFetching && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Users className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">키워드를 입력하면 성별/연령별 검색 트렌드를 분석해드려요</p>
        </div>
      )}
    </div>
  );
}
