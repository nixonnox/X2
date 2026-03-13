// ─────────────────────────────────────────────────────────────
// Mock Reports for UI
// ─────────────────────────────────────────────────────────────

import type { Report, ReportCreateInput } from "./types";
import { buildReport } from "./report-builder";
import { DEFAULT_SECTIONS } from "./types";

const now = Date.now();
const day = 86400000;

function buildMockReport(
  overrides: Partial<Report> & { input: ReportCreateInput },
): Report {
  const report = buildReport(overrides.input);
  return {
    ...report,
    ...overrides,
    sections: report.sections,
    kpiSummary: report.kpiSummary,
    insights: report.insights,
    actions: report.actions,
  };
}

export const MOCK_REPORTS: Report[] = [
  buildMockReport({
    input: {
      title: "주간 성과 리포트 (3월 1주차)",
      description: "3월 첫째 주 채널 성과 분석",
      type: "weekly_report",
      projectName: "X2 Analytics",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-07",
      sections: DEFAULT_SECTIONS,
      sendEmail: false,
      recipients: [],
      createShareLink: false,
    },
    id: "rpt-001",
    status: "ready",
    createdAt: new Date(now - day * 1).toISOString(),
    generatedAt: new Date(now - day * 1).toISOString(),
  }),
  buildMockReport({
    input: {
      title: "2월 월간 종합 리포트",
      description: "2월 전체 채널 종합 분석",
      type: "monthly_report",
      projectName: "X2 Analytics",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      sections: [
        ...DEFAULT_SECTIONS,
        "competitor_analysis",
        "social_listening",
      ],
      sendEmail: true,
      recipients: [{ email: "team@example.com", name: "팀 전체" }],
      createShareLink: true,
    },
    id: "rpt-002",
    status: "sent",
    createdAt: new Date(now - day * 8).toISOString(),
    generatedAt: new Date(now - day * 8).toISOString(),
    shareLink: {
      id: "share-001",
      reportId: "rpt-002",
      token: "abc123def456",
      accessScope: "public_link",
      enabled: true,
      expiresAt: new Date(now + day * 30).toISOString(),
      viewCount: 15,
      createdAt: new Date(now - day * 8).toISOString(),
    },
  }),
  buildMockReport({
    input: {
      title: "주간 성과 리포트 (2월 4주차)",
      description: "2월 마지막 주 분석",
      type: "weekly_report",
      projectName: "X2 Analytics",
      periodStart: "2026-02-22",
      periodEnd: "2026-02-28",
      sections: DEFAULT_SECTIONS,
      sendEmail: true,
      recipients: [{ email: "manager@example.com", name: "매니저" }],
      createShareLink: false,
    },
    id: "rpt-003",
    status: "sent",
    createdAt: new Date(now - day * 9).toISOString(),
    generatedAt: new Date(now - day * 9).toISOString(),
  }),
  buildMockReport({
    input: {
      title: "경쟁 분석 커스텀 리포트",
      description: "Q1 경쟁사 비교 분석",
      type: "custom_report",
      projectName: "X2 Analytics",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-07",
      sections: [
        "overview",
        "kpi_summary",
        "competitor_analysis",
        "ai_insights",
        "recommended_actions",
      ],
      sendEmail: false,
      recipients: [],
      createShareLink: true,
    },
    id: "rpt-004",
    status: "ready",
    createdAt: new Date(now - day * 2).toISOString(),
    generatedAt: new Date(now - day * 2).toISOString(),
    shareLink: {
      id: "share-002",
      reportId: "rpt-004",
      token: "xyz789ghi012",
      accessScope: "public_link",
      enabled: true,
      expiresAt: null,
      viewCount: 3,
      createdAt: new Date(now - day * 2).toISOString(),
    },
  }),
  buildMockReport({
    input: {
      title: "주간 성과 리포트 (2월 3주차)",
      description: "",
      type: "weekly_report",
      projectName: "X2 Analytics",
      periodStart: "2026-02-15",
      periodEnd: "2026-02-21",
      sections: DEFAULT_SECTIONS,
      sendEmail: false,
      recipients: [],
      createShareLink: false,
    },
    id: "rpt-005",
    status: "ready",
    createdAt: new Date(now - day * 16).toISOString(),
    generatedAt: new Date(now - day * 16).toISOString(),
  }),
];
