import type { Repositories } from "../../repositories";
import {
  type ServiceResult,
  type TraceContext,
  type Logger,
  ok,
  err,
} from "../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportType =
  | "WEEKLY_REPORT"
  | "MONTHLY_REPORT"
  | "CAMPAIGN_REPORT"
  | "LISTENING_REPORT"
  | "EXECUTIVE_SUMMARY"
  | "COMMENT_ISSUE_REPORT"
  | "INTENT_REPORT"
  | "FAQ_REPORT"
  | "RISK_REPORT";

export type RoleContext = "PRACTITIONER" | "MARKETER" | "ADMIN" | "EXECUTIVE";

export type ReportCompositionInput = {
  projectId: string;
  reportType: ReportType;
  title?: string;
  dateRange: { from: Date; to: Date };
  generatedBy?: string;
  options?: {
    includeSections?: string[];
    roleContext?: RoleContext;
    language?: "ko" | "en";
  };
};

export type ComposedReport = {
  reportId: string;
  title: string;
  type: ReportType;
  status: "DRAFT";
  sections: ComposedSection[];
  summary: string;
  actionCount: number;
  evidenceCount: number;
  generatedAt: Date;
};

export type ComposedSection = {
  sectionId: string;
  title: string;
  order: number;
  narrative: string;
  evidenceCount: number;
};

type SectionDef = {
  title: string;
  type: string;
  order: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ReportCompositionService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Compose a full report by orchestrating section building and evidence collection.
   */
  async composeReport(
    input: ReportCompositionInput,
    trace: TraceContext,
  ): Promise<ServiceResult<ComposedReport>> {
    try {
      if (!input.projectId) {
        return err("projectId is required", "INVALID_INPUT");
      }

      // 1. Determine sections based on reportType
      const roleContext = input.options?.roleContext;
      let sectionDefs = this.getSectionDefinitions(
        input.reportType,
        roleContext,
      );

      // Filter to specific sections if requested
      if (
        input.options?.includeSections &&
        input.options.includeSections.length > 0
      ) {
        const included = new Set(input.options.includeSections);
        sectionDefs = sectionDefs.filter((d) => included.has(d.type));
      }

      // 2. Generate title if not provided
      const title =
        input.title ??
        this.generateReportTitle(input.reportType, input.dateRange);

      // 3. Create InsightReport via repository
      const report = await this.repositories.report.create({
        title,
        type: input.reportType as any,
        status: "DRAFT",
        summary: "",
        content: {},
        period: `${input.dateRange.from.toISOString()}~${input.dateRange.to.toISOString()}`,
        project: { connect: { id: input.projectId } },
        sections: {
          create: sectionDefs.map((def) => ({
            title: def.title,
            type: def.type,
            order: def.order,
            narrative: null,
          })),
        },
      });

      // 4. Build each section with narrative + evidence
      const composedSections: ComposedSection[] = [];
      let totalEvidenceCount = 0;

      if (report.sections) {
        for (const section of report.sections) {
          const narrative = await this.buildSectionNarrative(
            (section as any).type,
            input.projectId,
            input.dateRange,
          );

          composedSections.push({
            sectionId: section.id,
            title: section.title,
            order: section.order,
            narrative,
            evidenceCount: 0,
          });
        }
      }

      // Count total evidence across sections
      for (const cs of composedSections) {
        totalEvidenceCount += cs.evidenceCount;
      }

      // 5. Generate report summary from section narratives
      const summary = this.generateReportSummary(composedSections);

      // 6. Count actions (currently none generated at composition time)
      const actionCount = 0;

      this.logger.info("Report composed", {
        reportId: report.id,
        type: input.reportType,
        sectionCount: composedSections.length,
        evidenceCount: totalEvidenceCount,
        requestId: trace.requestId,
      });

      return ok({
        reportId: report.id,
        title,
        type: input.reportType,
        status: "DRAFT" as const,
        sections: composedSections,
        summary,
        actionCount,
        evidenceCount: totalEvidenceCount,
        generatedAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to compose report", {
        projectId: input.projectId,
        reportType: input.reportType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "REPORT_COMPOSITION_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns section definitions based on report type and optional role context.
   */
  private getSectionDefinitions(
    reportType: ReportType,
    roleContext?: RoleContext,
  ): SectionDef[] {
    // For EXECUTIVE role, reduce to strategic sections only
    if (roleContext === "EXECUTIVE") {
      return [
        { title: "전략 개요", type: "STRATEGIC_OVERVIEW", order: 0 },
        { title: "핵심 성과 지표", type: "KPI", order: 1 },
        { title: "전략적 권고", type: "STRATEGIC_RECOMMENDATIONS", order: 2 },
      ];
    }

    switch (reportType) {
      case "WEEKLY_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "핵심 KPI", type: "KPI", order: 1 },
          { title: "주요 발견", type: "KEY_FINDINGS", order: 2 },
          { title: "댓글/이슈 요약", type: "COMMENT_ISSUE", order: 3 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 4 },
        ];

      case "MONTHLY_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "핵심 KPI", type: "KPI", order: 1 },
          { title: "주요 발견", type: "KEY_FINDINGS", order: 2 },
          { title: "고객 의도/트렌드 요약", type: "INTENT_TREND", order: 3 },
          { title: "댓글/이슈 요약", type: "COMMENT_ISSUE", order: 4 },
          { title: "경쟁 분석 요약", type: "COMPETITIVE_ANALYSIS", order: 5 },
          { title: "GEO/AEO 시사점", type: "GEO_AEO", order: 6 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 7 },
          { title: "근거 자료", type: "EVIDENCE_MATERIALS", order: 8 },
        ];

      case "EXECUTIVE_SUMMARY":
        return [
          { title: "전략 개요", type: "STRATEGIC_OVERVIEW", order: 0 },
          { title: "핵심 성과 지표", type: "KPI", order: 1 },
          { title: "주요 변화 및 위험", type: "CHANGES_RISKS", order: 2 },
          { title: "전략적 권고", type: "STRATEGIC_RECOMMENDATIONS", order: 3 },
        ];

      case "COMMENT_ISSUE_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "감성 분포", type: "SENTIMENT", order: 1 },
          { title: "주요 이슈", type: "KEY_ISSUES", order: 2 },
          { title: "리스크 시그널", type: "RISK_SIGNALS", order: 3 },
          { title: "FAQ 현황", type: "FAQ_STATUS", order: 4 },
          { title: "대응 권고", type: "RESPONSE_RECOMMENDATIONS", order: 5 },
        ];

      case "INTENT_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "의도 분포", type: "INTENT_DISTRIBUTION", order: 1 },
          { title: "갭 기회", type: "GAP_OPPORTUNITIES", order: 2 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 3 },
        ];

      case "FAQ_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "FAQ 현황", type: "FAQ_STATUS", order: 1 },
          { title: "미답변 질문", type: "UNANSWERED", order: 2 },
          { title: "대응 권고", type: "RESPONSE_RECOMMENDATIONS", order: 3 },
        ];

      case "RISK_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "리스크 시그널", type: "RISK_SIGNALS", order: 1 },
          { title: "감성 분포", type: "SENTIMENT", order: 2 },
          { title: "대응 권고", type: "RESPONSE_RECOMMENDATIONS", order: 3 },
        ];

      case "CAMPAIGN_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "핵심 KPI", type: "KPI", order: 1 },
          { title: "캠페인 성과", type: "CAMPAIGN_PERFORMANCE", order: 2 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 3 },
        ];

      case "LISTENING_REPORT":
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "트렌드 요약", type: "TREND_SUMMARY", order: 1 },
          { title: "감성 분포", type: "SENTIMENT", order: 2 },
          { title: "주요 발견", type: "KEY_FINDINGS", order: 3 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 4 },
        ];

      default:
        return [
          { title: "개요", type: "OVERVIEW", order: 0 },
          { title: "주요 발견", type: "KEY_FINDINGS", order: 1 },
          { title: "추천 액션", type: "RECOMMENDED_ACTIONS", order: 2 },
        ];
    }
  }

  /**
   * Generate narrative text for a given section type using real data from repositories.
   */
  private async buildSectionNarrative(
    sectionType: string,
    projectId: string,
    dateRange: { from: Date; to: Date },
  ): Promise<string> {
    try {
      switch (sectionType) {
        case "OVERVIEW": {
          const channelsResult =
            await this.repositories.channel.findByProject(projectId);
          const channelCount = channelsResult.data.length;
          return `분석 기간 ${this.formatDate(dateRange.from)} ~ ${this.formatDate(dateRange.to)} 동안 총 ${channelCount}개 채널의 데이터를 분석하였습니다.`;
        }

        case "KPI": {
          const channelsResult =
            await this.repositories.channel.findByProject(projectId);
          const channelCount = channelsResult.data.length;
          return `핵심 KPI: 총 ${channelCount}개 채널 운영 중. 상세 지표는 근거 자료를 참조하십시오.`;
        }

        case "SENTIMENT": {
          const distribution =
            await this.repositories.comment.countBySentiment(projectId);
          const pos = (distribution as any).positive ?? 0;
          const neu = (distribution as any).neutral ?? 0;
          const neg = (distribution as any).negative ?? 0;
          const total = pos + neu + neg;
          if (total === 0) {
            return "분석 기간 내 수집된 댓글이 없습니다.";
          }
          const posRate = Math.round((pos / total) * 100);
          const neuRate = Math.round((neu / total) * 100);
          const negRate = Math.round((neg / total) * 100);
          const assessment =
            negRate > 30
              ? "부정 비율이 높아 주의가 필요합니다."
              : "전반적으로 긍정적인 반응입니다.";
          return `분석 기간 내 수집된 댓글 총 ${total}건의 감성 분석 결과, 긍정 ${pos}건(${posRate}%), 중립 ${neu}건(${neuRate}%), 부정 ${neg}건(${negRate}%)으로 나타났습니다. ${assessment}`;
        }

        case "FAQ_STATUS": {
          const faqs =
            await this.repositories.faqCandidate.findUnanswered(projectId);
          const count = faqs.length;
          return count > 0
            ? `현재 미답변 FAQ가 ${count}건 존재합니다. 고객 문의에 대한 신속한 대응이 필요합니다.`
            : "현재 미답변 FAQ가 없습니다.";
        }

        case "RISK_SIGNALS": {
          const risks =
            await this.repositories.riskSignal.findActive(projectId);
          const count = risks.length;
          if (count === 0) {
            return "현재 활성화된 리스크 시그널이 없습니다.";
          }
          const critical = risks.filter(
            (r: any) => r.severity === "CRITICAL",
          ).length;
          const high = risks.filter((r: any) => r.severity === "HIGH").length;
          return `현재 활성 리스크 시그널 ${count}건 (심각 ${critical}건, 높음 ${high}건). 즉각적인 모니터링과 대응이 필요합니다.`;
        }

        case "INTENT_DISTRIBUTION":
        case "INTENT_TREND": {
          const gaps =
            await this.repositories.intent.findGapOpportunities(projectId);
          return `${gaps.length}건의 갭 기회가 발견되었습니다.`;
        }

        case "GAP_OPPORTUNITIES": {
          const gaps =
            await this.repositories.intent.findGapOpportunities(projectId);
          if (gaps.length === 0) {
            return "현재 발견된 갭 기회가 없습니다.";
          }
          return `${gaps.length}건의 콘텐츠 갭 기회가 발견되었습니다. 해당 키워드에 대한 콘텐츠 제작을 검토하십시오.`;
        }

        case "TREND_SUMMARY": {
          const trends = await this.repositories.trendAnalytics.findLatest(
            projectId,
            10,
          );
          if (trends.length === 0) {
            return "분석 기간 내 트렌드 데이터가 없습니다.";
          }
          return `최근 트렌드 분석 결과, ${trends.length}개의 주요 키워드가 감지되었습니다.`;
        }

        case "GEO_AEO": {
          const snapshots =
            await this.repositories.aeo.findLatestSnapshots(projectId);
          if (snapshots.length === 0) {
            return "GEO/AEO 모니터링 데이터가 없습니다.";
          }
          return `총 ${snapshots.length}개 키워드에 대한 AEO 가시성을 모니터링 중입니다.`;
        }

        case "KEY_FINDINGS":
        case "COMMENT_ISSUE":
        case "KEY_ISSUES":
        case "CHANGES_RISKS":
        case "COMPETITIVE_ANALYSIS":
        case "CAMPAIGN_PERFORMANCE":
        case "EVIDENCE_MATERIALS":
        case "STRATEGIC_OVERVIEW":
        case "STRATEGIC_RECOMMENDATIONS":
        case "RECOMMENDED_ACTIONS":
        case "RESPONSE_RECOMMENDATIONS":
        case "UNANSWERED":
          // TODO: [INTEGRATION] @x2/ai — Generate detailed narrative from aggregated data
          return `이 섹션은 AI 분석 엔진 연동 후 자동 생성됩니다.`;

        default:
          return `섹션 유형 '${sectionType}'에 대한 내러티브 생성이 준비 중입니다.`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn("Failed to build section narrative, using fallback", {
        sectionType,
        projectId,
        error: message,
      });
      return `데이터 조회 중 오류가 발생하여 내러티브를 생성할 수 없습니다.`;
    }
  }

  /**
   * Auto-generate report title based on type and date range.
   */
  private generateReportTitle(
    reportType: ReportType,
    dateRange: { from: Date; to: Date },
  ): string {
    const fromStr = this.formatDate(dateRange.from);
    const toStr = this.formatDate(dateRange.to);

    const typeLabels: Record<ReportType, string> = {
      WEEKLY_REPORT: "주간 분석 리포트",
      MONTHLY_REPORT: "월간 분석 리포트",
      CAMPAIGN_REPORT: "캠페인 분석 리포트",
      LISTENING_REPORT: "소셜 리스닝 리포트",
      EXECUTIVE_SUMMARY: "경영진 요약 리포트",
      COMMENT_ISSUE_REPORT: "댓글/이슈 분석 리포트",
      INTENT_REPORT: "검색 의도 분석 리포트",
      FAQ_REPORT: "FAQ 분석 리포트",
      RISK_REPORT: "리스크 분석 리포트",
    };

    const label = typeLabels[reportType] ?? "분석 리포트";
    return `${label} (${fromStr} ~ ${toStr})`;
  }

  /**
   * Generate a 3-4 sentence summary from composed section narratives.
   */
  private generateReportSummary(sections: ComposedSection[]): string {
    if (sections.length === 0) {
      return "분석 결과가 없습니다.";
    }

    // Take the first 3 sections with meaningful narratives
    const meaningful = sections
      .filter(
        (s) =>
          s.narrative &&
          !s.narrative.includes("준비 중") &&
          !s.narrative.includes("오류"),
      )
      .slice(0, 3);

    if (meaningful.length === 0) {
      return "리포트가 생성되었습니다. 상세 내용은 각 섹션을 참조하십시오.";
    }

    const summaryParts = meaningful.map((s) => s.narrative);
    return summaryParts.join(" ");
  }

  /**
   * Format a Date to "YYYY.MM.DD" string.
   */
  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  }
}
