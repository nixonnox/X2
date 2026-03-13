"use client";

import { PageHeader } from "@/components/shared";
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
  WifiOff,
  BarChart3,
  Brain,
  FileText,
  CreditCard,
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

// Pipeline categories matching backend ScheduledJob types
const PIPELINES = [
  {
    name: "채널 동기화",
    type: "CHANNEL_SYNC",
    schedule: "6시간마다",
    status: "healthy" as JobStatus,
    lastRun: null as string | null,
    description: "YouTube, Instagram, TikTok 등 채널 정보 수집",
  },
  {
    name: "콘텐츠 동기화",
    type: "CONTENT_SYNC",
    schedule: "4시간마다",
    status: "healthy" as JobStatus,
    lastRun: null,
    description: "등록 채널의 최신 콘텐츠 수집",
  },
  {
    name: "댓글 수집",
    type: "COMMENT_SYNC",
    schedule: "12시간마다",
    status: "healthy" as JobStatus,
    lastRun: null,
    description: "콘텐츠별 댓글 수집 및 저장",
  },
  {
    name: "댓글 분석",
    type: "COMMENT_ANALYZE",
    schedule: "30분마다",
    status: "healthy" as JobStatus,
    lastRun: null,
    description: "감성, 주제, FAQ, 리스크 자동 분석",
  },
  {
    name: "키워드 추적",
    type: "KEYWORD_TRACK",
    schedule: "매일 06:00",
    status: "healthy" as JobStatus,
    lastRun: null,
    description: "등록 키워드의 검색량, 트렌드 수집",
  },
  {
    name: "AEO 크롤링",
    type: "AEO_CRAWL",
    schedule: "매일 08:00",
    status: "healthy" as JobStatus,
    lastRun: null,
    description: "AI 검색 엔진별 인용 현황 수집",
  },
];

const MONITOR_SECTIONS = [
  {
    title: "파이프라인 모니터",
    icon: Activity,
    items: [
      { label: "채널 동기화 상태", value: "대기 중" },
      { label: "성공률", value: "—" },
      { label: "큐 대기 건수", value: "0" },
    ],
  },
  {
    title: "AI 분석 모니터",
    icon: Brain,
    items: [
      { label: "미분석 댓글", value: "—" },
      { label: "분석 오류율", value: "—" },
      { label: "평균 신뢰도", value: "—" },
    ],
  },
  {
    title: "리포트 모니터",
    icon: FileText,
    items: [
      { label: "생성된 리포트", value: "0건" },
      { label: "공유 링크 접근", value: "0회" },
    ],
  },
  {
    title: "플랜 / 사용량",
    icon: CreditCard,
    items: [
      { label: "현재 플랜", value: "—" },
      { label: "API 사용량", value: "—" },
    ],
  },
];

export default function AdminCollectionPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="데이터 수집 & 관제"
        description="데이터 파이프라인 상태, 수집 현황, 분석 엔진 상태를 모니터링합니다"
      />

      {/* Overall Status */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Wifi className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--foreground)]">
              시스템 상태: 대기 중
            </p>
            <p className="text-[12px] text-[var(--muted-foreground)]">
              데이터 수집이 설정되면 여기에 실시간 상태가 표시됩니다
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
            <Clock className="h-3.5 w-3.5" />
            마지막 확인: —
          </div>
        </div>
      </div>

      {/* Monitor Sections */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MONITOR_SECTIONS.map((section) => (
          <div key={section.title} className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <section.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
              <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                {section.title}
              </h3>
            </div>
            <div className="space-y-2">
              {section.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-[12px] text-[var(--muted-foreground)]">
                    {item.label}
                  </span>
                  <span className="text-[12px] font-medium text-[var(--foreground)]">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Jobs */}
      <div className="card p-6">
        <h2 className="mb-4 text-[15px] font-semibold">수집 파이프라인</h2>
        <div className="space-y-2">
          {PIPELINES.map((pipeline) => {
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
    </div>
  );
}
