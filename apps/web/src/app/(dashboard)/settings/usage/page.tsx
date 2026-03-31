"use client";

import { useState } from "react";
import {
  BarChart3,
  Zap,
  FileText,
  Database,
  MessageSquare,
  Download,
  Cpu,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
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
} from "recharts";

// ─── Usage Meter ──────────────────────────────────────────────

function UsageMeter({
  label,
  icon: Icon,
  used,
  limit,
  percent,
  color = "indigo",
}: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
  percent: number;
  color?: string;
}) {
  const colorMap: Record<string, { bar: string; bg: string; text: string }> = {
    indigo: { bar: "bg-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700" },
    emerald: { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    amber: { bar: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    rose: { bar: "bg-rose-500", bg: "bg-rose-50", text: "text-rose-700" },
    sky: { bar: "bg-sky-500", bg: "bg-sky-50", text: "text-sky-700" },
    violet: { bar: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700" },
  };
  const c = colorMap[color] ?? colorMap.indigo;
  const isWarning = percent >= 80;
  const barColor = isWarning ? "bg-red-500" : c.bar;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.text}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        {isWarning && <AlertTriangle className="h-4 w-4 text-red-500" />}
      </div>
      <div className="mb-1.5 flex items-end justify-between">
        <span className="text-2xl font-bold text-gray-900">
          {used.toLocaleString()}
        </span>
        <span className="text-xs text-gray-400">
          / {limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[11px] text-gray-400">
        {percent}%
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function UsageDashboardPage() {
  // TODO: Get workspaceId from auth context. Using placeholder for now.
  const workspaceId = "default";
  const [historyDays, setHistoryDays] = useState(30);

  const statusQuery = trpc.usage.status.useQuery({ workspaceId });
  const historyQuery = trpc.usage.history.useQuery({
    workspaceId,
    days: historyDays,
  });

  const status = statusQuery.data;
  const history = historyQuery.data?.days ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">사용량</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          워크스페이스의 리소스 사용 현황과 한도를 확인하세요.
        </p>
      </div>

      {/* Plan Badge */}
      {status && (
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
            {status.plan} 플랜
          </span>
          {status.canExportData && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600">
              Export 가능
            </span>
          )}
          {status.canAccessApi && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-medium text-sky-600">
              API 접근 가능
            </span>
          )}
        </div>
      )}

      {/* Today's Usage */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          오늘 사용량
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {status && (
            <>
              <UsageMeter
                label="API 호출"
                icon={Zap}
                used={status.today.apiCalls.used}
                limit={status.today.apiCalls.limit}
                percent={status.today.apiCalls.percent}
                color="indigo"
              />
              <UsageMeter
                label="AI 토큰"
                icon={Cpu}
                used={status.today.aiTokens.used}
                limit={status.today.aiTokens.limit}
                percent={status.today.aiTokens.percent}
                color="violet"
              />
            </>
          )}
        </div>
      </section>

      {/* Monthly Usage */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-600">
          이번 달 사용량
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {status && (
            <>
              <UsageMeter
                label="API 호출"
                icon={Zap}
                used={status.thisMonth.apiCalls.used}
                limit={status.thisMonth.apiCalls.limit}
                percent={status.thisMonth.apiCalls.percent}
                color="indigo"
              />
              <UsageMeter
                label="AI 토큰"
                icon={Cpu}
                used={status.thisMonth.aiTokens.used}
                limit={status.thisMonth.aiTokens.limit}
                percent={status.thisMonth.aiTokens.percent}
                color="violet"
              />
              <UsageMeter
                label="콘텐츠 수집"
                icon={Database}
                used={status.thisMonth.contents.used}
                limit={status.thisMonth.contents.limit}
                percent={status.thisMonth.contents.percent}
                color="emerald"
              />
              <UsageMeter
                label="댓글 수집"
                icon={MessageSquare}
                used={status.thisMonth.comments.used}
                limit={status.thisMonth.comments.limit}
                percent={status.thisMonth.comments.percent}
                color="sky"
              />
              <UsageMeter
                label="보고서 생성"
                icon={FileText}
                used={status.thisMonth.reports.used}
                limit={status.thisMonth.reports.limit}
                percent={status.thisMonth.reports.percent}
                color="amber"
              />
              <UsageMeter
                label="채널"
                icon={BarChart3}
                used={status.thisMonth.channels.used}
                limit={status.thisMonth.channels.limit}
                percent={status.thisMonth.channels.percent}
                color="rose"
              />
            </>
          )}
        </div>

        {/* Extra stats */}
        {status && (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Download className="h-3.5 w-3.5" />
              내보내기: <span className="font-medium text-gray-700">{status.thisMonth.exports.used}건</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <TrendingUp className="h-3.5 w-3.5" />
              AI 비용: <span className="font-medium text-gray-700">${status.thisMonth.aiCost}</span>
            </div>
          </div>
        )}
      </section>

      {/* Usage History Chart */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">일별 추이</h2>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setHistoryDays(d)}
                className={`rounded-md px-2.5 py-1 text-[11px] ${
                  historyDays === d
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {d}일
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: any) => String(v).slice(5)} // MM-DD
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11 }}
                  labelFormatter={(l: any) => `날짜: ${l}`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="apiCalls"
                  name="API 호출"
                  fill="#6366f1"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="aiTokens"
                  name="AI 토큰"
                  fill="#8b5cf6"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="contents"
                  name="콘텐츠"
                  fill="#10b981"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              아직 사용 기록이 없어요
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <div className="text-center">
        <p className="text-[11px] text-gray-400">
          사용량은 실시간으로 집계되며, 한도 초과 시 일부 기능이 제한될 수 있어요.
          플랜을 업그레이드하면 한도를 늘릴 수 있어요.
        </p>
      </div>
    </div>
  );
}
