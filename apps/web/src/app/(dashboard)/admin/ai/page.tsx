"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  Brain,
  Activity,
  AlertTriangle,
  Clock,
  DollarSign,
  Cpu,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  FileText,
  BarChart3,
  ClipboardList,
  Zap,
  Shield,
} from "lucide-react";

// ── 타입 ──

type ProviderStatus = {
  type: string;
  displayName: string;
  isAvailable: boolean;
  isHealthy: boolean;
  modelCount: number;
};

type TaskTypeUsage = {
  taskType: string;
  displayName: string;
  count: number;
  costUsd: number;
};

type RecentError = {
  id: string;
  taskType: string;
  provider: string;
  errorMessage: string;
  createdAt: string;
};

type AiDashboardData = {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  fallbackCount: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  isDevMode: boolean;
  providers: ProviderStatus[];
  taskTypeUsage: TaskTypeUsage[];
  recentErrors: RecentError[];
};

// ── Mock 대시보드 데이터 ──

// ── 페이지 ──

export default function AdminAiPage() {
  const t = useTranslations("admin");
  const [data, setData] = useState<AiDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ai/logs?type=stats")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const stats = json?.stats;
        if (stats) {
          setData({
            totalRequests: stats.totalRequests ?? 0,
            successCount: stats.successCount ?? 0,
            failureCount: stats.failureCount ?? 0,
            fallbackCount: stats.fallbackCount ?? 0,
            avgLatencyMs: stats.avgLatencyMs ?? 0,
            totalCostUsd: stats.totalCostUsd ?? 0,
            isDevMode: stats.isDevMode ?? false,
            providers: stats.providers ?? [],
            taskTypeUsage: stats.taskTypeUsage ?? [],
            recentErrors: stats.recentErrors ?? [],
          });
        } else {
          setData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !data) {
    return (
      <AdminPageLayout
        title={t("aiAnalysis")}
        description={t("aiAnalysisDesc")}
        infoText={t("aiAnalysisDesc")}
      >
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          <span className="ml-2 text-sm text-[var(--muted-foreground)]">
            AI 운영 현황을 불러오는 중...
          </span>
        </div>
      </AdminPageLayout>
    );
  }

  const successRate =
    data.totalRequests > 0
      ? ((data.successCount / data.totalRequests) * 100).toFixed(1)
      : "0.0";

  return (
    <AdminPageLayout
      title={t("aiAnalysis")}
      description={t("aiAnalysisDesc")}
      infoText="AI 분석 시스템의 운영 상태, 사용량, 비용을 모니터링합니다. 개발 모드에서는 Mock 응답이 사용됩니다."
    >
      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          icon={Brain}
          label="총 요청"
          value={data.totalRequests.toLocaleString()}
        />
        <SummaryCard
          icon={Activity}
          label="성공률"
          value={`${successRate}%`}
          accent="green"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="실패"
          value={data.failureCount.toString()}
          accent={data.failureCount > 0 ? "red" : undefined}
        />
        <SummaryCard
          icon={Zap}
          label="폴백 사용"
          value={data.fallbackCount.toString()}
          accent="amber"
        />
        <SummaryCard
          icon={Clock}
          label="평균 응답"
          value={`${(data.avgLatencyMs / 1000).toFixed(1)}초`}
        />
        <SummaryCard
          icon={DollarSign}
          label="추정 비용"
          value={`$${data.totalCostUsd.toFixed(2)}`}
        />
      </div>

      {/* ── Dev Mode 배너 ── */}
      {data.isDevMode && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
          <ToggleRight className="h-4 w-4 text-blue-600" />
          <div>
            <p className="text-[13px] font-medium text-blue-800">
              개발 모드 활성화
            </p>
            <p className="text-[11px] text-blue-600">
              실제 AI API 대신 Mock 응답이 사용됩니다. 운영 전환 시 환경 변수에
              API 키를 설정하고 AI_DEV_MODE=false로 변경하세요.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Provider 상태 ── */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h3 className="text-sm font-semibold">AI Provider 상태</h3>
          </div>
          <div className="space-y-2">
            {data.providers.map((p) => (
              <div
                key={p.type}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${p.isHealthy ? "bg-green-500" : p.isAvailable ? "bg-amber-500" : "bg-gray-300"}`}
                  />
                  <span className="text-[13px] font-medium">
                    {p.displayName}
                  </span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {p.modelCount}개 모델
                  </span>
                </div>
                <span
                  className={`text-[11px] font-medium ${p.isHealthy ? "text-green-600" : p.isAvailable ? "text-amber-600" : "text-gray-400"}`}
                >
                  {p.isHealthy ? "정상" : p.isAvailable ? "불안정" : "미연결"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
            Provider 연결 상태는 환경 변수의 API 키 설정에 따라 달라집니다.
          </p>
        </div>

        {/* ── Task Type 사용량 ── */}
        <div className="card p-4">
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h3 className="text-sm font-semibold">작업 유형별 사용량</h3>
          </div>
          <div className="space-y-1.5">
            {data.taskTypeUsage.map((tu) => {
              const maxCount = Math.max(
                ...data.taskTypeUsage.map((x) => x.count),
              );
              const pct = maxCount > 0 ? (tu.count / maxCount) * 100 : 0;
              return (
                <div key={tu.taskType} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]">{tu.displayName}</span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {tu.count}회 · ${tu.costUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 최근 실패 로그 ── */}
      <div className="card p-4">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--muted-foreground)]" />
          <h3 className="text-sm font-semibold">최근 실패 로그</h3>
        </div>
        {data.recentErrors.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-[var(--muted-foreground)]">
            최근 실패 기록이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b text-left text-[var(--muted-foreground)]">
                  <th className="pb-2 font-medium">시각</th>
                  <th className="pb-2 font-medium">작업 유형</th>
                  <th className="pb-2 font-medium">Provider</th>
                  <th className="pb-2 font-medium">오류 내용</th>
                </tr>
              </thead>
              <tbody>
                {data.recentErrors.map((err) => (
                  <tr key={err.id} className="border-b last:border-0">
                    <td className="py-2 text-[var(--muted-foreground)]">
                      {new Date(err.createdAt).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2">{err.taskType}</td>
                    <td className="py-2">{err.provider}</td>
                    <td className="py-2 text-red-600">{err.errorMessage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 퀵 링크 ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickLink
          href="/admin/ai/prompts"
          icon={FileText}
          label="프롬프트 관리"
          desc="프롬프트 템플릿 목록 및 버전 관리"
        />
        <QuickLink
          href="/admin/ai/logs"
          icon={ClipboardList}
          label="요청 로그"
          desc="AI 요청 기록 및 비용 추적"
        />
        <QuickLink
          href="/admin/ai/evals"
          icon={Shield}
          label="품질 평가"
          desc="AI 결과 품질 평가 및 테스트"
        />
      </div>
    </AdminPageLayout>
  );
}

// ── 서브 컴포넌트 ──

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: "green" | "red" | "amber";
}) {
  const accentColor =
    accent === "green"
      ? "text-green-600"
      : accent === "red"
        ? "text-red-600"
        : accent === "amber"
          ? "text-amber-600"
          : "text-[var(--foreground)]";

  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
        <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
          {label}
        </span>
      </div>
      <p className={`mt-1 text-lg font-semibold ${accentColor}`}>{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      className="card hover:bg-[var(--muted)]/50 flex items-start gap-3 p-4 transition-colors"
    >
      <Icon className="mt-0.5 h-4 w-4 text-blue-600" />
      <div>
        <p className="text-[13px] font-semibold">{label}</p>
        <p className="text-[11px] text-[var(--muted-foreground)]">{desc}</p>
      </div>
    </a>
  );
}
