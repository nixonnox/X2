// ─────────────────────────────────────────────────────────────
// Report Delivery — 이메일 발송 및 공유 링크 서비스
// ─────────────────────────────────────────────────────────────

import type {
  ReportDelivery,
  ReportRecipient,
  ReportShareLink,
  Report,
} from "./types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Email Provider Interface ──

interface IEmailProvider {
  send(params: {
    to: string[];
    subject: string;
    body: string;
    reportUrl?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

// ── Mock Email Provider ──

class MockEmailProvider implements IEmailProvider {
  private sentLog: { to: string[]; subject: string; sentAt: string }[] = [];

  async send(params: { to: string[]; subject: string; body: string }) {
    // Mock: 항상 성공 (dev mode)
    await new Promise((r) => setTimeout(r, 200));
    this.sentLog.push({
      to: params.to,
      subject: params.subject,
      sentAt: new Date().toISOString(),
    });
    return { success: true, messageId: `mock-msg-${uid()}` };
  }

  getSentLog() {
    return [...this.sentLog];
  }
}

// ── Production Email Provider Scaffold ──
// import { Resend } from 'resend';
// class ResendEmailProvider implements IEmailProvider {
//   private client: Resend;
//   constructor(apiKey: string) { this.client = new Resend(apiKey); }
//   async send(params) {
//     const { data, error } = await this.client.emails.send({
//       from: 'X2 Reports <reports@x2.app>',
//       to: params.to,
//       subject: params.subject,
//       html: params.body,
//     });
//     return { success: !error, messageId: data?.id, error: error?.message };
//   }
// }

// ── Report Delivery Service ──

class ReportDeliveryService {
  private emailProvider: IEmailProvider;
  private deliveries: ReportDelivery[] = [];

  constructor(provider?: IEmailProvider) {
    this.emailProvider = provider || new MockEmailProvider();
  }

  async sendEmail(
    report: Report,
    recipients: ReportRecipient[],
  ): Promise<ReportDelivery> {
    const delivery: ReportDelivery = {
      id: `dlv-${uid()}`,
      reportId: report.id,
      type: "email",
      status: "pending",
      recipients,
      sentAt: null,
      error: null,
      metadata: {},
    };

    try {
      const subject = `[X2] ${report.title} — ${report.periodStart} ~ ${report.periodEnd}`;
      const body = composeEmailBody(report);
      const result = await this.emailProvider.send({
        to: recipients.map((r) => r.email),
        subject,
        body,
      });

      delivery.status = result.success ? "sent" : "failed";
      delivery.sentAt = new Date().toISOString();
      delivery.error = result.error || null;
      delivery.metadata = { messageId: result.messageId };
    } catch (err) {
      delivery.status = "failed";
      delivery.error = (err as Error).message;
    }

    this.deliveries.push(delivery);
    return delivery;
  }

  getDeliveries(reportId?: string): ReportDelivery[] {
    if (reportId) return this.deliveries.filter((d) => d.reportId === reportId);
    return [...this.deliveries];
  }

  getRecentDeliveries(limit = 20): ReportDelivery[] {
    return this.deliveries.slice(-limit).reverse();
  }
}

// ── Email Body Composer ──

function composeEmailBody(report: Report): string {
  const kpi = report.kpiSummary;
  return `
안녕하세요,

${report.projectName}의 ${report.type === "weekly_report" ? "주간" : report.type === "monthly_report" ? "월간" : "커스텀"} 리포트가 준비되었습니다.

📊 핵심 KPI
• 총 조회수: ${kpi.totalViews.value.toLocaleString()} (${kpi.totalViews.changeLabel})
• 참여율: ${kpi.engagementRate.value}% (${kpi.engagementRate.changeLabel})
• 팔로워 변화: ${kpi.followerChange.value > 0 ? "+" : ""}${kpi.followerChange.value.toLocaleString()} (${kpi.followerChange.changeLabel})
• 댓글: ${kpi.commentCount.value.toLocaleString()}건 (${kpi.commentCount.changeLabel})

📋 주요 발견
${report.insights
  .slice(0, 3)
  .map((i) => `• ${i.title}`)
  .join("\n")}

자세한 내용은 리포트 전문을 확인해 주세요.

—
X2 Report Engine
이 이메일은 자동으로 생성되었습니다.
  `.trim();
}

// ── Share Link Service ──

class ShareLinkService {
  private links: Map<string, ReportShareLink> = new Map();

  create(reportId: string, expiresInDays?: number): ReportShareLink {
    const token = generateToken();
    const link: ReportShareLink = {
      id: `share-${uid()}`,
      reportId,
      token,
      accessScope: "public_link",
      enabled: true,
      expiresAt: expiresInDays
        ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
        : null,
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.links.set(token, link);
    return link;
  }

  getByToken(token: string): ReportShareLink | undefined {
    const link = this.links.get(token);
    if (!link) return undefined;

    // 만료 확인
    if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
      link.enabled = false;
    }

    return link;
  }

  getByReportId(reportId: string): ReportShareLink | undefined {
    return Array.from(this.links.values()).find((l) => l.reportId === reportId);
  }

  incrementViewCount(token: string): void {
    const link = this.links.get(token);
    if (link) link.viewCount++;
  }

  disable(token: string): void {
    const link = this.links.get(token);
    if (link) link.enabled = false;
  }

  enable(token: string): void {
    const link = this.links.get(token);
    if (link) link.enabled = true;
  }
}

function generateToken(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

// ── Singletons ──

export const reportDeliveryService = new ReportDeliveryService();
export const shareLinkService = new ShareLinkService();
