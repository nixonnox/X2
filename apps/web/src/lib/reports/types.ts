// ─────────────────────────────────────────────────────────────
// Report Automation System — Core Types
// ─────────────────────────────────────────────────────────────

// ── Enums ──

export type ReportType = "weekly_report" | "monthly_report" | "custom_report";
export type ReportStatus =
  | "draft"
  | "generating"
  | "ready"
  | "scheduled"
  | "sent"
  | "failed";
export type DeliveryType = "email" | "share_link" | "download";
export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly";
export type AccessScope = "private" | "team" | "public_link";
export type SectionType =
  | "overview"
  | "kpi_summary"
  | "key_findings"
  | "channel_analysis"
  | "comment_analysis"
  | "competitor_analysis"
  | "social_listening"
  | "ai_insights"
  | "recommended_actions"
  | "appendix";

// ── Report ──

export type Report = {
  id: string;
  title: string;
  description: string;
  type: ReportType;
  status: ReportStatus;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  sections: ReportSection[];
  kpiSummary: ReportKpiSummary;
  insights: ReportInsight[];
  actions: ReportActionRecommendation[];
  shareLink: ReportShareLink | null;
  deliveries: ReportDelivery[];
  scheduleId: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
};

// ── Report Section ──

export type ReportSection = {
  id: string;
  type: SectionType;
  title: string;
  order: number;
  enabled: boolean;
  content: string;
  highlights: string[];
  chartData?: unknown;
  metadata?: Record<string, unknown>;
};

// ── KPI Summary ──

export type ReportKpiSummary = {
  totalViews: { value: number; change: number; changeLabel: string };
  engagementRate: { value: number; change: number; changeLabel: string };
  followerChange: { value: number; change: number; changeLabel: string };
  commentCount: { value: number; change: number; changeLabel: string };
  negativeRatio: { value: number; change: number; changeLabel: string };
  mentionCount: { value: number; change: number; changeLabel: string };
};

// ── Report Insight ──

export type ReportInsight = {
  id: string;
  category: "positive" | "caution" | "opportunity" | "risk";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  source: string;
};

// ── Report Action ──

export type ReportActionRecommendation = {
  id: string;
  action: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  expectedImpact: string;
  deadline: string;
};

// ── Report Schedule ──

export type ReportSchedule = {
  id: string;
  name: string;
  reportType: ReportType;
  projectName: string;
  frequency: ScheduleFrequency;
  dayOfWeek: number | null; // 0-6 (일-토)
  dayOfMonth: number | null; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
  enabled: boolean;
  recipients: ReportRecipient[];
  sections: SectionType[];
  autoShare: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Report Delivery ──

export type ReportDelivery = {
  id: string;
  reportId: string;
  type: DeliveryType;
  status: "pending" | "sent" | "failed";
  recipients: ReportRecipient[];
  sentAt: string | null;
  error: string | null;
  metadata: Record<string, unknown>;
};

// ── Report Recipient ──

export type ReportRecipient = {
  email: string;
  name: string;
};

// ── Report Share Link ──

export type ReportShareLink = {
  id: string;
  reportId: string;
  token: string;
  accessScope: AccessScope;
  enabled: boolean;
  expiresAt: string | null;
  viewCount: number;
  createdAt: string;
};

// ── Report Generation Result ──

export type ReportGenerationResult = {
  success: boolean;
  reportId: string;
  durationMs: number;
  sectionCount: number;
  error?: string;
};

// ── Report Status Log ──

export type ReportStatusLog = {
  id: string;
  reportId: string;
  status: ReportStatus;
  message: string;
  timestamp: string;
};

// ── Report Creation Input ──

export type ReportCreateInput = {
  title: string;
  description: string;
  type: ReportType;
  projectName: string;
  periodStart: string;
  periodEnd: string;
  sections: SectionType[];
  sendEmail: boolean;
  recipients: ReportRecipient[];
  createShareLink: boolean;
};

// ── Labels ──

export const REPORT_TYPE_LABELS: Record<
  ReportType,
  { label: string; icon: string; description: string }
> = {
  weekly_report: {
    label: "주간 리포트",
    icon: "Calendar",
    description: "지난 7일간 채널 성과와 핵심 인사이트",
  },
  monthly_report: {
    label: "월간 리포트",
    icon: "CalendarDays",
    description: "지난 1개월 종합 분석 및 전략 제안",
  },
  custom_report: {
    label: "커스텀 리포트",
    icon: "FileEdit",
    description: "원하는 기간과 섹션을 직접 선택",
  },
};

export const REPORT_STATUS_LABELS: Record<
  ReportStatus,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "초안", color: "text-gray-600", bg: "bg-gray-50" },
  generating: { label: "생성중", color: "text-blue-600", bg: "bg-blue-50" },
  ready: { label: "완료", color: "text-emerald-600", bg: "bg-emerald-50" },
  scheduled: { label: "예약됨", color: "text-violet-600", bg: "bg-violet-50" },
  sent: { label: "발송됨", color: "text-sky-600", bg: "bg-sky-50" },
  failed: { label: "실패", color: "text-red-600", bg: "bg-red-50" },
};

export const SECTION_LABELS: Record<
  SectionType,
  { label: string; description: string }
> = {
  overview: { label: "리포트 개요", description: "기간, 대상, 요약 문구" },
  kpi_summary: {
    label: "핵심 KPI",
    description: "조회수, 참여율, 팔로워 변화 등",
  },
  key_findings: {
    label: "주요 발견",
    description: "이번 기간 핵심 변화와 주의 사항",
  },
  channel_analysis: {
    label: "채널 분석",
    description: "채널별 성과 및 트렌드",
  },
  comment_analysis: {
    label: "댓글 분석",
    description: "감성 분석, 위험 댓글, 주요 토픽",
  },
  competitor_analysis: {
    label: "경쟁 분석",
    description: "경쟁 채널 대비 성과 비교",
  },
  social_listening: {
    label: "소셜 리스닝",
    description: "키워드 언급량 및 감성 추이",
  },
  ai_insights: {
    label: "AI 인사이트",
    description: "AI가 발견한 전략적 인사이트",
  },
  recommended_actions: {
    label: "추천 액션",
    description: "실행 가능한 추천 행동 목록",
  },
  appendix: { label: "부록", description: "참고 데이터 및 메타 정보" },
};

export const SCHEDULE_FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  once: "1회성",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};

export const DAY_OF_WEEK_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export const DEFAULT_SECTIONS: SectionType[] = [
  "overview",
  "kpi_summary",
  "key_findings",
  "channel_analysis",
  "comment_analysis",
  "ai_insights",
  "recommended_actions",
];
