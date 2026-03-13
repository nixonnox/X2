import { PrismaClient } from "@x2/db";
import { type ServiceResult, type Logger, ok, err } from "../../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportScheduleConfig = {
  reportType:
    | "WEEKLY_REPORT"
    | "MONTHLY_REPORT"
    | "CAMPAIGN_REPORT"
    | "EXECUTIVE_SUMMARY"
    | "RISK_REPORT";
  projectId: string;
  roleContext?: "PRACTITIONER" | "MARKETER" | "ADMIN" | "EXECUTIVE";
  recipients: Array<{
    userId?: string;
    email?: string;
    channel: "IN_APP" | "EMAIL";
  }>;
  templateId?: string;
};

type GeneratedReport = {
  reportId: string;
  title: string;
  type: string;
  sectionCount: number;
  evidenceCount: number;
  status: string;
};

type DeliveryResult = {
  reportId: string;
  deliveredCount: number;
  failedCount: number;
};

type GenerateAndDeliverResult = {
  report: GeneratedReport;
  delivery: DeliveryResult;
};

type QuotaCheckResult = {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
};

// ---------------------------------------------------------------------------
// Section definitions per report type
// ---------------------------------------------------------------------------

const SECTION_DEFS: Record<
  string,
  Array<{ title: string; type: string; order: number }>
> = {
  WEEKLY_REPORT: [
    { title: "개요", type: "OVERVIEW", order: 0 },
    { title: "주요 KPI", type: "KPI", order: 1 },
    { title: "핵심 발견사항", type: "KEY_FINDINGS", order: 2 },
    { title: "권장 조치 사항", type: "RECOMMENDED_ACTIONS", order: 3 },
    { title: "채널 성과 요약", type: "CHANNEL_SUMMARY", order: 4 },
  ],
  MONTHLY_REPORT: [
    { title: "개요", type: "OVERVIEW", order: 0 },
    { title: "주요 KPI", type: "KPI", order: 1 },
    { title: "핵심 발견사항", type: "KEY_FINDINGS", order: 2 },
    { title: "권장 조치 사항", type: "RECOMMENDED_ACTIONS", order: 3 },
    { title: "트렌드 분석", type: "TREND_ANALYSIS", order: 4 },
    { title: "경쟁사 비교", type: "COMPETITOR_COMPARISON", order: 5 },
  ],
  CAMPAIGN_REPORT: [
    { title: "개요", type: "OVERVIEW", order: 0 },
    { title: "캠페인 KPI", type: "KPI", order: 1 },
    { title: "핵심 발견사항", type: "KEY_FINDINGS", order: 2 },
    { title: "권장 조치 사항", type: "RECOMMENDED_ACTIONS", order: 3 },
    { title: "ROI 분석", type: "ROI_ANALYSIS", order: 4 },
  ],
  EXECUTIVE_SUMMARY: [
    { title: "개요", type: "OVERVIEW", order: 0 },
    { title: "주요 KPI", type: "KPI", order: 1 },
    { title: "핵심 발견사항", type: "KEY_FINDINGS", order: 2 },
    { title: "권장 조치 사항", type: "RECOMMENDED_ACTIONS", order: 3 },
  ],
  RISK_REPORT: [
    { title: "개요", type: "OVERVIEW", order: 0 },
    { title: "위험 지표 KPI", type: "KPI", order: 1 },
    { title: "핵심 발견사항", type: "KEY_FINDINGS", order: 2 },
    { title: "권장 조치 사항", type: "RECOMMENDED_ACTIONS", order: 3 },
    { title: "위험 신호 상세", type: "RISK_DETAIL", order: 4 },
  ],
};

const MAX_REPORTS_PER_MONTH = 50;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ReportAutomationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  /**
   * 스케줄 설정에 따라 자동 리포트를 생성합니다.
   */
  async generateScheduledReport(
    workspaceId: string,
    config: ReportScheduleConfig,
    executionId: string,
  ): Promise<ServiceResult<GeneratedReport>> {
    try {
      if (!workspaceId || !config.projectId) {
        return err("workspaceId와 projectId는 필수입니다", "INVALID_INPUT");
      }

      // 프로젝트 존재 확인
      const project = await this.prisma.project.findFirst({
        where: { id: config.projectId, workspace: { id: workspaceId } },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      // 쿼터 확인
      const quota = await this.checkReportQuota(workspaceId);
      if (quota.success && !quota.data.allowed) {
        return err(
          `월간 리포트 한도 초과 (${quota.data.currentCount}/${quota.data.maxAllowed})`,
          "QUOTA_EXCEEDED",
        );
      }

      // 날짜 범위 결정
      const now = new Date();
      const dateRange = this.getDateRange(config.reportType, now);

      // 리포트 타이틀 생성
      const title = this.generateTitle(
        config.reportType,
        project.name,
        dateRange,
      );

      // InsightReport 생성
      const reportId = randomBytes(12).toString("hex");
      const report = await this.prisma.insightReport.create({
        data: {
          id: reportId,
          projectId: config.projectId,
          type: config.reportType as any,
          title,
          summary: `${project.name} — ${config.reportType} 자동 생성 리포트`,
          content: {
            generatedBy: "AUTOMATION",
            executionId,
            roleContext: config.roleContext ?? "PRACTITIONER",
            templateId: config.templateId ?? null,
          },
          period: `${dateRange.from.toISOString().slice(0, 10)}~${dateRange.to.toISOString().slice(0, 10)}`,
          status: "DRAFT",
          confidence: 0,
        },
      });

      // 섹션 생성 + 증거 자산 연결
      const sectionDefs =
        SECTION_DEFS[config.reportType] ?? SECTION_DEFS.WEEKLY_REPORT;
      let totalEvidenceCount = 0;

      for (const def of sectionDefs) {
        const sectionId = randomBytes(12).toString("hex");
        const narrative = await this.buildNarrative(
          def.type,
          config.projectId,
          dateRange,
        );

        const section = await this.prisma.reportSection.create({
          data: {
            id: sectionId,
            reportId: report.id,
            title: def.title,
            order: def.order,
            narrative,
            isAutoGenerated: true,
          },
        });

        // 증거 자산 연결
        const evidenceCount = await this.attachEvidence(
          section.id,
          def.type,
          config.projectId,
          dateRange,
        );
        totalEvidenceCount += evidenceCount;
      }

      // DRAFT → PUBLISHED
      await this.prisma.insightReport.update({
        where: { id: report.id },
        data: { status: "PUBLISHED" },
      });

      this.logger.info("자동 리포트 생성 완료", {
        reportId: report.id,
        type: config.reportType,
        projectId: config.projectId,
        sectionCount: sectionDefs.length,
        evidenceCount: totalEvidenceCount,
        executionId,
      });

      return ok({
        reportId: report.id,
        title,
        type: config.reportType,
        sectionCount: sectionDefs.length,
        evidenceCount: totalEvidenceCount,
        status: "PUBLISHED",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("자동 리포트 생성 실패", {
        error: message,
        executionId,
      });
      return err(message, "REPORT_GENERATION_FAILED");
    }
  }

  /**
   * 생성된 리포트를 수신자에게 전달합니다.
   */
  async deliverReport(
    reportId: string,
    recipients: ReportScheduleConfig["recipients"],
    executionId: string,
  ): Promise<ServiceResult<DeliveryResult>> {
    try {
      if (!reportId || !recipients.length) {
        return err("reportId와 수신자 목록은 필수입니다", "INVALID_INPUT");
      }

      let deliveredCount = 0;
      let failedCount = 0;

      for (const recipient of recipients) {
        try {
          await this.prisma.deliveryLog.create({
            data: {
              id: randomBytes(12).toString("hex"),
              executionId,
              channel: recipient.channel as any,
              recipientId: recipient.userId ?? null,
              recipientEmail: recipient.email ?? null,
              status: "PENDING",
              sourceType: "INSIGHT_REPORT",
              sourceId: reportId,
              retryCount: 0,
            },
          });
          deliveredCount++;
        } catch {
          failedCount++;
        }
      }

      this.logger.info("리포트 전달 로그 생성 완료", {
        reportId,
        deliveredCount,
        failedCount,
        executionId,
      });

      return ok({ reportId, deliveredCount, failedCount });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("리포트 전달 실패", { error: message, executionId });
      return err(message, "REPORT_DELIVERY_FAILED");
    }
  }

  /**
   * 리포트 생성과 전달을 통합 실행합니다.
   */
  async generateAndDeliver(
    workspaceId: string,
    config: ReportScheduleConfig,
    executionId: string,
  ): Promise<ServiceResult<GenerateAndDeliverResult>> {
    try {
      const genResult = await this.generateScheduledReport(
        workspaceId,
        config,
        executionId,
      );
      if (!genResult.success) {
        return err(genResult.error, genResult.code);
      }

      const delResult = await this.deliverReport(
        genResult.data.reportId,
        config.recipients,
        executionId,
      );
      if (!delResult.success) {
        return err(delResult.error, delResult.code);
      }

      this.logger.info("리포트 생성 및 전달 완료", {
        reportId: genResult.data.reportId,
        executionId,
      });

      return ok({ report: genResult.data, delivery: delResult.data });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("리포트 생성 및 전달 실패", {
        error: message,
        executionId,
      });
      return err(message, "GENERATE_AND_DELIVER_FAILED");
    }
  }

  /**
   * 기본 주간 리포트 설정을 반환합니다.
   */
  getDefaultWeeklyConfig(projectId: string): ReportScheduleConfig {
    return {
      reportType: "WEEKLY_REPORT",
      projectId,
      roleContext: "PRACTITIONER",
      recipients: [],
    };
  }

  /**
   * 기본 월간 리포트 설정을 반환합니다.
   */
  getDefaultMonthlyConfig(projectId: string): ReportScheduleConfig {
    return {
      reportType: "MONTHLY_REPORT",
      projectId,
      roleContext: "EXECUTIVE",
      recipients: [],
    };
  }

  /**
   * 워크스페이스의 월간 리포트 쿼터를 확인합니다.
   */
  async checkReportQuota(
    workspaceId: string,
  ): Promise<ServiceResult<QuotaCheckResult>> {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const usageMetrics = await this.prisma.usageMetric.findMany({
        where: {
          workspaceId,
          date: { gte: monthStart },
        },
      });

      const currentCount = usageMetrics.reduce(
        (sum, m) => sum + m.reportCount,
        0,
      );

      return ok({
        allowed: currentCount < MAX_REPORTS_PER_MONTH,
        currentCount,
        maxAllowed: MAX_REPORTS_PER_MONTH,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("리포트 쿼터 확인 실패", {
        error: message,
        workspaceId,
      });
      return err(message, "QUOTA_CHECK_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getDateRange(
    reportType: string,
    now: Date,
  ): { from: Date; to: Date } {
    const to = new Date(now);
    const from = new Date(now);

    switch (reportType) {
      case "WEEKLY_REPORT":
        from.setDate(from.getDate() - 7);
        break;
      case "MONTHLY_REPORT":
        from.setMonth(from.getMonth() - 1);
        break;
      case "CAMPAIGN_REPORT":
        from.setDate(from.getDate() - 30);
        break;
      case "EXECUTIVE_SUMMARY":
        from.setDate(from.getDate() - 30);
        break;
      case "RISK_REPORT":
        from.setDate(from.getDate() - 14);
        break;
      default:
        from.setDate(from.getDate() - 7);
    }

    return { from, to };
  }

  private generateTitle(
    reportType: string,
    projectName: string,
    dateRange: { from: Date; to: Date },
  ): string {
    const fromStr = dateRange.from.toISOString().slice(0, 10);
    const toStr = dateRange.to.toISOString().slice(0, 10);

    const typeLabels: Record<string, string> = {
      WEEKLY_REPORT: "주간 리포트",
      MONTHLY_REPORT: "월간 리포트",
      CAMPAIGN_REPORT: "캠페인 리포트",
      EXECUTIVE_SUMMARY: "경영진 요약",
      RISK_REPORT: "위험 분석 리포트",
    };

    const label = typeLabels[reportType] ?? "리포트";
    return `[${projectName}] ${label} (${fromStr} ~ ${toStr})`;
  }

  private async buildNarrative(
    sectionType: string,
    projectId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<string> {
    switch (sectionType) {
      case "OVERVIEW":
        return `프로젝트 분석 기간: ${dateRange.from.toISOString().slice(0, 10)} ~ ${dateRange.to.toISOString().slice(0, 10)}. 자동 생성된 개요입니다.`;
      case "KPI": {
        const riskCount = await this.prisma.riskSignal.count({
          where: {
            projectId,
            detectedAt: { gte: dateRange.from, lte: dateRange.to },
          },
        });
        const faqCount = await this.prisma.fAQCandidate.count({
          where: {
            projectId,
            firstSeenAt: { gte: dateRange.from, lte: dateRange.to },
          },
        });
        return `해당 기간 위험 신호 ${riskCount}건, FAQ 후보 ${faqCount}건이 감지되었습니다.`;
      }
      case "KEY_FINDINGS": {
        const risks = await this.prisma.riskSignal.findMany({
          where: {
            projectId,
            detectedAt: { gte: dateRange.from, lte: dateRange.to },
          },
          orderBy: { severity: "desc" },
          take: 5,
        });
        if (risks.length === 0) return "해당 기간 특이사항이 없습니다.";
        return `주요 위험 신호: ${risks.map((r) => `${r.title} (${r.severity})`).join(", ")}`;
      }
      case "RECOMMENDED_ACTIONS": {
        const actions = await this.prisma.insightAction.findMany({
          where: {
            report: { projectId },
            status: "PENDING",
            createdAt: { gte: dateRange.from, lte: dateRange.to },
          },
          take: 5,
        });
        if (actions.length === 0) return "현재 대기 중인 액션이 없습니다.";
        return `권장 조치: ${actions.map((a) => a.title).join(", ")}`;
      }
      default:
        return `${sectionType} 섹션 자동 생성 내용입니다.`;
    }
  }

  private async attachEvidence(
    sectionId: string,
    sectionType: string,
    projectId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<number> {
    let count = 0;

    try {
      switch (sectionType) {
        case "KPI":
        case "OVERVIEW": {
          // 채널 스냅샷 근거
          const channels = await this.prisma.channel.findMany({
            where: { projectId },
            take: 3,
          });
          if (channels.length > 0) {
            await this.prisma.evidenceAsset.create({
              data: {
                id: randomBytes(12).toString("hex"),
                sectionId,
                type: "METRIC",
                order: 0,
                title: "채널 현황",
                narrative: `모니터링 중인 채널 ${channels.length}개`,
                dataSourceType: "CHANNEL_SNAPSHOT",
                dataEntityIds: channels.map((c) => c.id),
              },
            });
            count++;
          }
          break;
        }
        case "KEY_FINDINGS": {
          // 위험 신호 근거
          const risks = await this.prisma.riskSignal.findMany({
            where: {
              projectId,
              detectedAt: { gte: dateRange.from, lte: dateRange.to },
            },
            take: 5,
          });
          if (risks.length > 0) {
            await this.prisma.evidenceAsset.create({
              data: {
                id: randomBytes(12).toString("hex"),
                sectionId,
                type: "TABLE",
                order: 0,
                title: "위험 신호 목록",
                narrative: `${risks.length}건의 위험 신호가 감지되었습니다`,
                dataSourceType: "RISK_SIGNAL",
                dataEntityIds: risks.map((r) => r.id),
              },
            });
            count++;
          }

          // FAQ 후보 근거
          const faqs = await this.prisma.fAQCandidate.findMany({
            where: {
              projectId,
              firstSeenAt: { gte: dateRange.from, lte: dateRange.to },
            },
            take: 5,
          });
          if (faqs.length > 0) {
            await this.prisma.evidenceAsset.create({
              data: {
                id: randomBytes(12).toString("hex"),
                sectionId,
                type: "TABLE",
                order: 1,
                title: "FAQ 후보",
                narrative: `${faqs.length}건의 FAQ 후보가 감지되었습니다`,
                dataSourceType: "FAQ_CANDIDATE",
                dataEntityIds: faqs.map((f) => f.id),
              },
            });
            count++;
          }
          break;
        }
        case "RECOMMENDED_ACTIONS": {
          // 댓글 분석 근거
          const comments = await this.prisma.comment.findMany({
            where: {
              content: { channel: { projectId } },
              createdAt: { gte: dateRange.from, lte: dateRange.to },
            },
            take: 5,
          });
          if (comments.length > 0) {
            await this.prisma.evidenceAsset.create({
              data: {
                id: randomBytes(12).toString("hex"),
                sectionId,
                type: "TABLE",
                order: 0,
                title: "관련 댓글 분석",
                narrative: `${comments.length}건의 댓글이 분석에 포함되었습니다`,
                dataSourceType: "COMMENT_ANALYSIS",
                dataEntityIds: comments.map((c) => c.id),
              },
            });
            count++;
          }
          break;
        }
      }
    } catch (error) {
      this.logger.warn("증거 자산 연결 중 오류", {
        sectionId,
        sectionType,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    return count;
  }
}
