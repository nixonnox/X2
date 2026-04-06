"use client";

import { PageHeader } from "@/components/shared";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks/use-current-project";
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Pause,
  Activity,
  Wifi,
  Loader2,
} from "lucide-react";

type JobStatus = "healthy" | "warning" | "error" | "paused";

const STATUS_CONFIG: Record<
  JobStatus,
  { icon: any; color: string; bgColor: string; label: string }
> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    label: "정상",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "주의",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    label: "오류",
  },
  paused: {
    icon: Pause,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    label: "일시 중지",
  },
};

const PIPELINE_INFO: Record<
  string,
  { name: string; schedule: string; description: string }
> = {
  CHANNEL_SYNC: {
    name: "채널 동기화",
    schedule: "6시간마다",
    description: "YouTube, Instagram, TikTok 등 채널 정보 수집",
  },
  CONTENT_SYNC: {
    name: "콘텐츠 동기화",
    schedule: "4시간마다",
    description: "등록 채널의 최신 콘텐츠 수집",
  },
  COMMENT_SYNC: {
    name: "댓글 수집",
    schedule: "12시간마다",
    description: "콘텐츠별 댓글 수집 및 저장",
  },
  COMMENT_ANALYZE: {
    name: "댓글 분석",
    schedule: "30분마다",
    description: "감성, 주제, FAQ, 리스크 자동 분석",
  },
  KEYWORD_TRACK: {
    name: "키워드 추적",
    schedule: "매일 06:00",
    description: "등록 키워드의 검색량, 트렌드 수집",
  },
  AEO_CRAWL: {
    name: "AEO 크롤링",
    schedule: "매일 08:00",
    description: "AI 검색 엔진별 인용 현황 수집",
  },
};

export default function AdminCollectionPage() {
  const { workspaceId, isLoading: projectLoading } = useCurrentProject();

  const healthQuery = trpc.collection.healthStatus.useQuery();
  const logsQuery = trpc.collection.recentLogs.useQuery(
    { workspaceId: workspaceId ?? "", limit: 50 },
    { enabled: !!workspaceId },
  );

  const health = healthQuery.data;
  const logs = logsQuery.data ?? [];
  const isLoading = projectLoading || healthQuery.isLoading;

  // Derive pipeline statuses from health data
  const pipelines = Object.entries(PIPELINE_INFO).map(([type, info]) => {
    const platformHealth = health as any;
    let status: JobStatus = "paused";
    const lastRun: string | null = null;

    if (platformHealth?.platforms) {
      // If we have platform health data, derive status
      const hasErrors = Object.values(platformHealth.platforms).some(
        (p: any) => p?.status === "error",
      );
      const hasWarnings = Object.values(platformHealth.platforms).some(
        (p: any) => p?.status === "warning",
      );
      status = hasErrors ? "error" : hasWarnings ? "warning" : "healthy";
    }

    return { ...info, type, status, lastRun };
  });

  // Derive monitor stats from logs
  const successLogs = Array.isArray(logs)
    ? logs.filter((l: any) => l.status === "success")
    : [];
  const failedLogs = Array.isArray(logs)
    ? logs.filter((l: any) => l.status === "failed")
    : [];
  const totalLogs = Array.isArray(logs) ? logs.length : 0;
  const successRate =
    totalLogs > 0 ? Math.round((successLogs.length / totalLogs) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="데이터 수집 & 관제"
        description="데이터 파이프라인 상태, 수집 현황, 분석 엔진 상태를 모니터링합니다"
      />

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-400">상태 로딩 중...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Overall Status */}
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  failedLogs.length > 0 ? "bg-red-50" : "bg-emerald-50"
                }`}
              >
                <Wifi
                  className={`h-5 w-5 ${failedLogs.length > 0 ? "text-red-600" : "text-emerald-600"}`}
                />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[var(--foreground)]">
                  시스템 상태:{" "}
                  {failedLogs.length > 0
                    ? "일부 오류 발생"
                    : totalLogs > 0
                      ? "정상"
                      : "대기 중"}
                </p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  {totalLogs > 0
                    ? `최근 수집 ${totalLogs}건 · 성공률 ${successRate}%`
                    : "데이터 수집이 설정되면 여기에 실시간 상태가 표시됩니다"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
                <Clock className="h-3.5 w-3.5" />
                마지막 확인:{" "}
                {healthQuery.dataUpdatedAt
                  ? new Date(healthQuery.dataUpdatedAt).toLocaleString(
                      "ko-KR",
                      { hour: "2-digit", minute: "2-digit" },
                    )
                  : "—"}
              </div>
            </div>
          </div>

          {/* Monitor Summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--muted-foreground)]" />
                <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                  수집 현황
                </h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    전체 수집
                  </span>
                  <span className="text-[12px] font-medium text-[var(--foreground)]">
                    {totalLogs}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    성공률
                  </span>
                  <span className="text-[12px] font-medium text-[var(--foreground)]">
                    {totalLogs > 0 ? `${successRate}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    실패
                  </span>
                  <span
                    className={`text-[12px] font-medium ${failedLogs.length > 0 ? "text-red-600" : "text-[var(--foreground)]"}`}
                  >
                    {failedLogs.length}건
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Jobs */}
          <div className="card p-6">
            <h2 className="mb-4 text-[15px] font-semibold">수집 파이프라인</h2>
            <div className="space-y-2">
              {pipelines.map((pipeline) => {
                const statusConfig = STATUS_CONFIG[pipeline.status];
                return (
                  <div
                    key={pipeline.type}
                    className="flex items-center gap-4 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--secondary)]"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${statusConfig.bgColor}`}
                    >
                      <statusConfig.icon
                        className={`h-4 w-4 ${statusConfig.color}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-[var(--foreground)]">
                          {pipeline.name}
                        </p>
                        <span
                          className={`badge ${statusConfig.bgColor} ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        {pipeline.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {pipeline.schedule}
                      </p>
                      <p className="text-[11px] text-[var(--muted-foreground)]">
                        {pipeline.lastRun
                          ? `마지막: ${pipeline.lastRun}`
                          : "아직 실행되지 않음"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Logs */}
          {Array.isArray(logs) && logs.length > 0 && (
            <div className="card p-6">
              <h2 className="mb-4 text-[15px] font-semibold">최근 수집 로그</h2>
              <div className="space-y-1">
                {logs.slice(0, 20).map((log: any, i: number) => (
                  <div
                    key={log.id ?? i}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-[12px] hover:bg-[var(--secondary)]"
                  >
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : log.status === "failed" ? (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                    <span className="flex-1 text-[var(--foreground)]">
                      {log.message ?? log.platform ?? "수집"}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString("ko-KR", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Quality */}
          <div className="card p-6">
            <h2 className="mb-1 text-[15px] font-semibold">데이터 품질</h2>
            <p className="mb-4 text-[12px] text-[var(--muted-foreground)]">
              분석 엔진의 신뢰도 및 품질 지표
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  평균 신뢰도
                </p>
                <p className="mt-1 text-[18px] font-bold">—</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  0.8 이상이면 양호
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Low Confidence 항목
                </p>
                <p className="mt-1 text-[18px] font-bold">—</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  검토가 필요한 분석 결과
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                  Fallback 사용률
                </p>
                <p className="mt-1 text-[18px] font-bold">—</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  기본 엔진 대신 대체 엔진 사용 비율
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
