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

export type RoleContext = "PRACTITIONER" | "MARKETER" | "ADMIN" | "EXECUTIVE";

export type SectionBuildInput = {
  reportId: string;
  sectionId: string;
  sectionType: string;
  projectId: string;
  dateRange: { from: Date; to: Date };
  roleContext?: RoleContext;
};

export type BuiltSection = {
  sectionId: string;
  narrative: string;
  evidenceAssets: EvidenceAssetRef[];
  dataPointCount: number;
};

export type EvidenceAssetRef = {
  id: string;
  dataSourceType: string;
  entityIds: string[];
  displayType: string;
  label: string;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ReportSectionBuilder {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Build a single report section with narrative and evidence assets.
   */
  async buildSection(
    input: SectionBuildInput,
    trace: TraceContext,
  ): Promise<ServiceResult<BuiltSection>> {
    try {
      if (!input.sectionId || !input.projectId) {
        return err("sectionId and projectId are required", "INVALID_INPUT");
      }

      let result: BuiltSection;

      switch (input.sectionType) {
        case "OVERVIEW":
          result = await this.buildOverviewSection(input);
          break;
        case "KPI":
          result = await this.buildKPISection(input);
          break;
        case "SENTIMENT":
          result = await this.buildSentimentSection(input);
          break;
        case "FAQ_STATUS":
          result = await this.buildFAQSection(input);
          break;
        case "RISK_SIGNALS":
          result = await this.buildRiskSection(input);
          break;
        case "INTENT_DISTRIBUTION":
        case "INTENT_TREND":
          result = await this.buildIntentSection(input);
          break;
        case "TREND_SUMMARY":
          result = await this.buildTrendSection(input);
          break;
        case "RECOMMENDED_ACTIONS":
        case "RESPONSE_RECOMMENDATIONS":
        case "STRATEGIC_RECOMMENDATIONS":
          result = await this.buildActionSection(input);
          break;
        default:
          result = {
            sectionId: input.sectionId,
            narrative: `섹션 유형 '${input.sectionType}'에 대한 빌드가 준비 중입니다.`,
            evidenceAssets: [],
            dataPointCount: 0,
          };
          break;
      }

      this.logger.info("Section built", {
        sectionId: input.sectionId,
        sectionType: input.sectionType,
        evidenceCount: result.evidenceAssets.length,
        dataPointCount: result.dataPointCount,
        requestId: trace.requestId,
      });

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to build section", {
        sectionId: input.sectionId,
        sectionType: input.sectionType,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "SECTION_BUILD_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Section builders
  // ---------------------------------------------------------------------------

  /**
   * Overview: channel count, content summary.
   */
  private async buildOverviewSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const channelsResult = await this.repositories.channel.findByProject(
      input.projectId,
    );
    const channelCount = channelsResult.data.length;
    const channelIds = channelsResult.data.map((c: any) => c.id);

    const evidenceAssets: EvidenceAssetRef[] = [];

    if (channelIds.length > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "CHANNEL_SNAPSHOT" as any,
          dataEntityIds: channelIds,
          type: "TABLE",
          title: "채널 현황",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "CHANNEL_SNAPSHOT",
        entityIds: channelIds,
        displayType: "TABLE",
        label: "채널 현황",
      });
    }

    const narrative =
      `분석 기간 ${this.formatDate(input.dateRange.from)} ~ ${this.formatDate(input.dateRange.to)} 동안 ` +
      `총 ${channelCount}개 채널의 데이터를 분석하였습니다.`;

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: channelCount,
    };
  }

  /**
   * KPI: key metrics as KPI cards.
   */
  private async buildKPISection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const channelsResult = await this.repositories.channel.findByProject(
      input.projectId,
    );
    const evidenceAssets: EvidenceAssetRef[] = [];
    let dataPointCount = 0;

    for (const channel of channelsResult.data) {
      const snapshots = await this.repositories.channel.findSnapshots(
        (channel as any).id,
      );
      if (snapshots.length > 0) {
        const snapshotIds = snapshots.map((s: any) => s.id);
        const asset = await this.repositories.evidenceAsset.create(
          input.sectionId,
          {
            dataSourceType: "CHANNEL_SNAPSHOT" as any,
            dataEntityIds: snapshotIds.slice(0, 10),
            type: "CHART" as any,
            title: `${(channel as any).name ?? "채널"} KPI`,
            order: evidenceAssets.length,
          },
        );
        evidenceAssets.push({
          id: asset.id,
          dataSourceType: "CHANNEL_SNAPSHOT",
          entityIds: snapshotIds.slice(0, 10),
          displayType: "KPI_CARD",
          label: `${(channel as any).name ?? "채널"} KPI`,
        });
        dataPointCount += snapshotIds.length;
      }
    }

    const narrative =
      `총 ${channelsResult.data.length}개 채널에 대한 핵심 성과 지표입니다. ` +
      `${dataPointCount}개의 데이터 포인트를 기반으로 산출되었습니다.`;

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount,
    };
  }

  /**
   * Sentiment: sentiment distribution + top negative topics.
   */
  private async buildSentimentSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const distribution = await this.repositories.comment.countBySentiment(
      input.projectId,
    );
    const pos = (distribution as any).positive ?? 0;
    const neu = (distribution as any).neutral ?? 0;
    const neg = (distribution as any).negative ?? 0;
    const total = pos + neu + neg;

    const evidenceAssets: EvidenceAssetRef[] = [];

    if (total > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "COMMENT_ANALYSIS" as any,
          dataEntityIds: [],
          type: "CHART" as any,
          title: "감성 분포",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "COMMENT_ANALYSIS",
        entityIds: [],
        displayType: "PIE_CHART",
        label: "감성 분포",
      });
    }

    let narrative: string;
    if (total === 0) {
      narrative = "분석 기간 내 수집된 댓글이 없습니다.";
    } else {
      const posRate = Math.round((pos / total) * 100);
      const neuRate = Math.round((neu / total) * 100);
      const negRate = Math.round((neg / total) * 100);
      const assessment =
        negRate > 30
          ? "부정 비율이 높아 주의가 필요합니다."
          : "전반적으로 긍정적인 반응입니다.";
      narrative =
        `분석 기간 내 수집된 댓글 총 ${total}건의 감성 분석 결과, ` +
        `긍정 ${pos}건(${posRate}%), 중립 ${neu}건(${neuRate}%), 부정 ${neg}건(${negRate}%)으로 나타났습니다. ` +
        assessment;
    }

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: total,
    };
  }

  /**
   * FAQ: unanswered FAQs + question distribution.
   */
  private async buildFAQSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const faqs = await this.repositories.faqCandidate.findUnanswered(
      input.projectId,
    );
    const faqIds = faqs.map((f: any) => f.id);
    const evidenceAssets: EvidenceAssetRef[] = [];

    if (faqIds.length > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "FAQ_CANDIDATE" as any,
          dataEntityIds: faqIds.slice(0, 20),
          type: "TABLE",
          title: "미답변 FAQ 목록",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "FAQ_CANDIDATE",
        entityIds: faqIds.slice(0, 20),
        displayType: "TABLE",
        label: "미답변 FAQ 목록",
      });
    }

    const narrative =
      faqIds.length > 0
        ? `현재 미답변 FAQ가 ${faqIds.length}건 존재합니다. 고객 문의에 대한 신속한 대응이 필요합니다.`
        : "현재 미답변 FAQ가 없습니다.";

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: faqIds.length,
    };
  }

  /**
   * Risk: active risks by severity.
   */
  private async buildRiskSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const risks = await this.repositories.riskSignal.findActive(
      input.projectId,
    );
    const riskIds = risks.map((r: any) => r.id);
    const evidenceAssets: EvidenceAssetRef[] = [];

    if (riskIds.length > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "RISK_SIGNAL" as any,
          dataEntityIds: riskIds.slice(0, 20),
          type: "TABLE",
          title: "활성 리스크 시그널",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "RISK_SIGNAL",
        entityIds: riskIds.slice(0, 20),
        displayType: "TABLE",
        label: "활성 리스크 시그널",
      });
    }

    let narrative: string;
    if (risks.length === 0) {
      narrative = "현재 활성화된 리스크 시그널이 없습니다.";
    } else {
      const critical = risks.filter(
        (r: any) => r.severity === "CRITICAL",
      ).length;
      const high = risks.filter((r: any) => r.severity === "HIGH").length;
      const medium = risks.filter((r: any) => r.severity === "MEDIUM").length;
      narrative =
        `현재 활성 리스크 시그널 ${risks.length}건 (심각 ${critical}건, 높음 ${high}건, 중간 ${medium}건). ` +
        `즉각적인 모니터링과 대응이 필요합니다.`;
    }

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: risks.length,
    };
  }

  /**
   * Intent: intent distribution + gap opportunities.
   */
  private async buildIntentSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const gaps = await this.repositories.intent.findGapOpportunities(
      input.projectId,
    );
    const gapIds = gaps.map((g: any) => g.id);
    const evidenceAssets: EvidenceAssetRef[] = [];

    if (gapIds.length > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "INTENT_RESULT" as any,
          dataEntityIds: gapIds.slice(0, 20),
          type: "CHART" as any,
          title: "검색 의도 갭 기회",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "INTENT_RESULT",
        entityIds: gapIds.slice(0, 20),
        displayType: "BAR_CHART",
        label: "검색 의도 갭 기회",
      });
    }

    const narrative =
      `${gaps.length}건의 갭 기회가 발견되었습니다.` +
      (gaps.length > 0
        ? " 해당 키워드에 대한 콘텐츠 제작을 검토하십시오."
        : "");

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: gaps.length,
    };
  }

  /**
   * Trend: rising/declining keywords.
   */
  private async buildTrendSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    const trends = await this.repositories.trendAnalytics.findLatest(
      input.projectId,
      10,
    );
    const trendIds = trends.map((t: any) => t.id);
    const evidenceAssets: EvidenceAssetRef[] = [];

    if (trendIds.length > 0) {
      const asset = await this.repositories.evidenceAsset.create(
        input.sectionId,
        {
          dataSourceType: "KEYWORD_METRIC" as any,
          dataEntityIds: trendIds.slice(0, 10),
          type: "CHART" as any,
          title: "트렌드 키워드",
          order: 0,
        },
      );
      evidenceAssets.push({
        id: asset.id,
        dataSourceType: "KEYWORD_METRIC",
        entityIds: trendIds.slice(0, 10),
        displayType: "LINE_CHART",
        label: "트렌드 키워드",
      });
    }

    const narrative =
      trends.length > 0
        ? `최근 트렌드 분석 결과, ${trends.length}개의 주요 키워드가 감지되었습니다.`
        : "분석 기간 내 트렌드 데이터가 없습니다.";

    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets,
      dataPointCount: trends.length,
    };
  }

  /**
   * Actions: recommended actions summary.
   */
  private async buildActionSection(
    input: SectionBuildInput,
  ): Promise<BuiltSection> {
    // Gather data from multiple sources to generate action recommendations
    const risks = await this.repositories.riskSignal.findActive(
      input.projectId,
    );
    const faqs = await this.repositories.faqCandidate.findUnanswered(
      input.projectId,
    );
    const gaps = await this.repositories.intent.findGapOpportunities(
      input.projectId,
    );

    const actionItems: string[] = [];

    if (risks.length > 0) {
      const critical = risks.filter(
        (r: any) => r.severity === "CRITICAL",
      ).length;
      if (critical > 0) {
        actionItems.push(`심각 수준 리스크 ${critical}건에 대한 즉각 대응`);
      }
      actionItems.push(`활성 리스크 ${risks.length}건 모니터링 강화`);
    }

    if (faqs.length > 0) {
      actionItems.push(`미답변 FAQ ${faqs.length}건에 대한 답변 작성`);
    }

    if (gaps.length > 0) {
      actionItems.push(`콘텐츠 갭 ${gaps.length}건에 대한 콘텐츠 기획`);
    }

    const narrative =
      actionItems.length > 0
        ? `추천 액션: ${actionItems.join(", ")}.`
        : "현재 특별히 추천할 액션이 없습니다. 지속적인 모니터링을 권장합니다.";

    // TODO: [INTEGRATION] @x2/ai — Generate detailed action items with priority
    return {
      sectionId: input.sectionId,
      narrative,
      evidenceAssets: [],
      dataPointCount: actionItems.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private formatDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}.${m}.${d}`;
  }
}
