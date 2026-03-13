"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  ClipboardList,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
} from "lucide-react";

// ── 타입 ──

type LogEntry = {
  id: string;
  requestId: string;
  taskType: string;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

// ── Mock 로그 데이터 ──

function generateMockLogs(): LogEntry[] {
  const tasks = [
    { type: "comment_sentiment_analysis", name: "댓글 감성 분석" },
    { type: "strategy_insight_generation", name: "전략 인사이트" },
    { type: "report_summary_generation", name: "리포트 요약" },
    { type: "reply_suggestion_generation", name: "답변 추천" },
    { type: "dashboard_explanation", name: "대시보드 설명" },
    { type: "competitor_insight_generation", name: "경쟁사 인사이트" },
  ];
  const providers = ["mock", "mock", "mock", "openai", "anthropic"];
  const models = [
    "mock-v1",
    "mock-v1",
    "mock-v1",
    "gpt-4o-mini",
    "claude-sonnet-4-20250514",
  ];
  const statuses = [
    "completed",
    "completed",
    "completed",
    "completed",
    "failed",
    "fallback_used",
  ];

  return Array.from({ length: 30 }, (_, i) => {
    const task = tasks[i % tasks.length]!;
    const provIdx = i % providers.length;
    const status = statuses[i % statuses.length]!;
    const date = new Date(2026, 2, 9, 14 - Math.floor(i / 3), (i * 7) % 60);

    return {
      id: `log-${String(i + 1).padStart(3, "0")}`,
      requestId: `req-${Date.now()}-${i}`,
      taskType: task.type,
      provider: providers[provIdx]!,
      model: models[provIdx]!,
      promptVersion: "1.0",
      inputTokens: 200 + i * 30,
      outputTokens: 100 + i * 15,
      latencyMs: 400 + i * 120,
      estimatedCostUsd: Math.round((0.001 + i * 0.0008) * 10000) / 10000,
      status,
      errorMessage: status === "failed" ? "API 키가 설정되지 않았습니다" : null,
      createdAt: date.toISOString(),
    };
  });
}

// ── 상태 배지 ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; cls: string; icon: React.ElementType }
  > = {
    completed: {
      label: "성공",
      cls: "bg-green-50 text-green-700",
      icon: CheckCircle2,
    },
    failed: { label: "실패", cls: "bg-red-50 text-red-700", icon: XCircle },
    fallback_used: {
      label: "폴백",
      cls: "bg-amber-50 text-amber-700",
      icon: Zap,
    },
    timeout: {
      label: "시간초과",
      cls: "bg-orange-50 text-orange-700",
      icon: Clock,
    },
  };
  const c = config[status] ?? {
    label: status,
    cls: "bg-gray-50 text-gray-600",
    icon: Clock,
  };
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${c.cls}`}
    >
      <Icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

// ── 페이지 ──

export default function AdminAiLogsPage() {
  const t = useTranslations("admin");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTask, setFilterTask] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLogs(generateMockLogs());
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    if (filterTask !== "all" && log.taskType !== filterTask) return false;
    return true;
  });

  const totalCost = filteredLogs.reduce((s, l) => s + l.estimatedCostUsd, 0);
  const totalTokens = filteredLogs.reduce(
    (s, l) => s + l.inputTokens + l.outputTokens,
    0,
  );

  return (
    <AdminPageLayout
      title="AI 요청 로그"
      description="AI 분석 요청 기록과 토큰 사용량, 비용을 확인합니다."
      infoText="각 AI 요청의 provider, 모델, 토큰 사용량, 응답 시간, 비용이 기록됩니다. 실패한 요청의 원인도 확인할 수 있습니다."
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          <span className="ml-2 text-sm text-[var(--muted-foreground)]">
            로그를 불러오는 중...
          </span>
        </div>
      ) : (
        <>
          {/* 필터 & 요약 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-md border bg-[var(--background)] px-2 py-1 text-[12px]"
              >
                <option value="all">전체 상태</option>
                <option value="completed">성공</option>
                <option value="failed">실패</option>
                <option value="fallback_used">폴백</option>
                <option value="timeout">시간초과</option>
              </select>
              <select
                value={filterTask}
                onChange={(e) => setFilterTask(e.target.value)}
                className="rounded-md border bg-[var(--background)] px-2 py-1 text-[12px]"
              >
                <option value="all">전체 작업</option>
                <option value="comment_sentiment_analysis">
                  댓글 감성 분석
                </option>
                <option value="strategy_insight_generation">
                  전략 인사이트
                </option>
                <option value="report_summary_generation">리포트 요약</option>
                <option value="reply_suggestion_generation">답변 추천</option>
                <option value="dashboard_explanation">대시보드 설명</option>
                <option value="competitor_insight_generation">
                  경쟁사 인사이트
                </option>
              </select>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
              <span>{filteredLogs.length}건</span>
              <span>토큰: {totalTokens.toLocaleString()}</span>
              <span>비용: ${totalCost.toFixed(4)}</span>
            </div>
          </div>

          {/* 테이블 */}
          <div className="card overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b text-left text-[var(--muted-foreground)]">
                  <th className="px-3 py-2 font-medium">시각</th>
                  <th className="px-3 py-2 font-medium">작업</th>
                  <th className="px-3 py-2 font-medium">Provider</th>
                  <th className="px-3 py-2 font-medium">모델</th>
                  <th className="px-3 py-2 text-right font-medium">토큰</th>
                  <th className="px-3 py-2 text-right font-medium">응답시간</th>
                  <th className="px-3 py-2 text-right font-medium">비용</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-[var(--muted)]/30 border-b last:border-0"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[var(--muted-foreground)]">
                      {new Date(log.createdAt).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {log.taskType.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">{log.provider}</td>
                    <td className="px-3 py-2 text-[var(--muted-foreground)]">
                      {log.model}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {(log.inputTokens + log.outputTokens).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.latencyMs < 1000
                        ? `${log.latencyMs}ms`
                        : `${(log.latencyMs / 1000).toFixed(1)}s`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      ${log.estimatedCostUsd.toFixed(4)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={log.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="py-8 text-center text-[12px] text-[var(--muted-foreground)]">
              조건에 맞는 로그가 없습니다.
            </div>
          )}
        </>
      )}
    </AdminPageLayout>
  );
}
