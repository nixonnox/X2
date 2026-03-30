import { randomUUID } from "crypto";
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

export type InsightCategory =
  | "KEY_FINDING"
  | "OPPORTUNITY"
  | "RISK"
  | "TREND_CHANGE"
  | "PERFORMANCE";

export type EvidenceRef = {
  dataSourceType: string;
  entityId: string;
  label: string;
  snippet?: string;
};

export type GeneratedInsight = {
  id: string;
  category: InsightCategory;
  title: string;
  narrative: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  evidenceRefs: EvidenceRef[];
  relatedEntityIds: string[];
  sourceModules: string[];
  generatedAt: Date;
};

export type InsightGenerationInput = {
  projectId: string;
  dateRange?: { from: Date; to: Date };
  focusAreas?: InsightCategory[];
};

export type InsightGenerationResult = {
  projectId: string;
  insights: GeneratedInsight[];
  generatedAt: Date;
  dataCompleteness: {
    sentiment: boolean;
    topics: boolean;
    faq: boolean;
    risk: boolean;
    intent: boolean;
    trend: boolean;
    aeo: boolean;
    campaign: boolean;
  };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class InsightGenerationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Generate structured insights from all analysis results for a project.
   * Collects data from every repository module and synthesizes human-readable insights.
   */
  async generateInsights(
    input: InsightGenerationInput,
    trace: TraceContext,
  ): Promise<ServiceResult<InsightGenerationResult>> {
    const { projectId, dateRange, focusAreas } = input;

    try {
      this.logger.info("Starting insight generation", {
        projectId,
        focusAreas: focusAreas ?? "all",
        requestId: trace.requestId,
      });

      const dataCompleteness = {
        sentiment: false,
        topics: false,
        faq: false,
        risk: false,
        intent: false,
        trend: false,
        aeo: false,
        campaign: false,
      };

      const allInsights: GeneratedInsight[] = [];

      // Collect insights from each module — skip if focusAreas is set and doesn't include category
      const shouldCollect = (category: InsightCategory) =>
        !focusAreas || focusAreas.includes(category);

      // 1. Sentiment insights
      if (shouldCollect("KEY_FINDING")) {
        try {
          const sentimentInsights = await this.collectSentimentInsights(
            projectId,
            dateRange,
          );
          allInsights.push(...sentimentInsights);
          dataCompleteness.sentiment = true;
          dataCompleteness.topics = true;
        } catch (e) {
          this.logger.warn("Sentiment insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 2. FAQ insights
      if (shouldCollect("OPPORTUNITY")) {
        try {
          const faqInsights = await this.collectFAQInsights(projectId);
          allInsights.push(...faqInsights);
          dataCompleteness.faq = true;
        } catch (e) {
          this.logger.warn("FAQ insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 3. Risk insights
      if (shouldCollect("RISK")) {
        try {
          const riskInsights = await this.collectRiskInsights(projectId);
          allInsights.push(...riskInsights);
          dataCompleteness.risk = true;
        } catch (e) {
          this.logger.warn("Risk insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 4. Intent gap insights
      if (shouldCollect("OPPORTUNITY")) {
        try {
          const intentInsights = await this.collectIntentInsights(projectId);
          allInsights.push(...intentInsights);
          dataCompleteness.intent = true;
        } catch (e) {
          this.logger.warn("Intent insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 5. Trend insights
      if (shouldCollect("TREND_CHANGE") || shouldCollect("RISK")) {
        try {
          const trendInsights = await this.collectTrendInsights(
            projectId,
            dateRange,
          );
          allInsights.push(...trendInsights);
          dataCompleteness.trend = true;
        } catch (e) {
          this.logger.warn("Trend insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 6. AEO insights
      if (shouldCollect("OPPORTUNITY")) {
        try {
          const aeoInsights = await this.collectAeoInsights(projectId);
          allInsights.push(...aeoInsights);
          dataCompleteness.aeo = true;
        } catch (e) {
          this.logger.warn("AEO insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // 7. Campaign performance insights
      if (shouldCollect("PERFORMANCE")) {
        try {
          const campaignInsights =
            await this.collectCampaignInsights(projectId);
          allInsights.push(...campaignInsights);
          dataCompleteness.campaign = true;
        } catch (e) {
          this.logger.warn("Campaign insight collection failed", {
            projectId,
            error: e instanceof Error ? e.message : "Unknown",
            requestId: trace.requestId,
          });
        }
      }

      // Sort by severity (CRITICAL first) then by confidence (descending)
      const severityOrder: Record<string, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };
      allInsights.sort((a, b) => {
        const severityDiff =
          (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      });

      this.logger.info("Insight generation completed", {
        projectId,
        insightCount: allInsights.length,
        dataCompleteness,
        requestId: trace.requestId,
      });

      return ok({
        projectId,
        insights: allInsights,
        generatedAt: new Date(),
        dataCompleteness,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to generate insights", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "INSIGHT_GENERATION_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Private collectors
  // ---------------------------------------------------------------------------

  private async collectSentimentInsights(
    projectId: string,
    _dateRange?: { from: Date; to: Date },
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const sentimentCounts =
      await this.repositories.comment.countBySentiment(projectId);
    const positive =
      sentimentCounts.find((s: any) => s.sentiment === "POSITIVE")?.count ?? 0;
    const neutral =
      sentimentCounts.find((s: any) => s.sentiment === "NEUTRAL")?.count ?? 0;
    const negative =
      sentimentCounts.find((s: any) => s.sentiment === "NEGATIVE")?.count ?? 0;
    const total = positive + neutral + negative;

    if (total === 0) return insights;

    const negativePercent = Math.round((negative / total) * 100);
    const positivePercent = Math.round((positive / total) * 100);

    // Extract top negative topics for context
    const analyses = await this.repositories.comment.findAnalysisByFilters(
      projectId,
      {},
      {
        page: 1,
        pageSize: 100,
      },
    );

    const topicCounts = new Map<string, number>();
    const negativeTopicCounts = new Map<string, number>();
    for (const analysis of analyses.data) {
      const topics = (analysis as any).topics as string[] | undefined;
      const sentiment = (analysis as any).sentiment as string | undefined;
      if (topics) {
        for (const topic of topics) {
          if (topic && topic !== "기타") {
            topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
            if (sentiment === "NEGATIVE") {
              negativeTopicCounts.set(
                topic,
                (negativeTopicCounts.get(topic) ?? 0) + 1,
              );
            }
          }
        }
      }
    }

    const topNegativeTopics = Array.from(negativeTopicCounts.entries())
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 3)
      .map(([topic]: [string, number]) => topic);

    const topTopics = Array.from(topicCounts.entries())
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, 5);

    // Sentiment distribution insight
    if (negativePercent > 30) {
      const topicDescription =
        topNegativeTopics.length > 0
          ? ` 주요 불만 주제는 '${topNegativeTopics.join("', '")}'입니다.`
          : "";

      insights.push({
        id: randomUUID(),
        category: "KEY_FINDING",
        title: `부정 댓글 비율 급증 (${negativePercent}%)`,
        narrative:
          `전체 댓글 ${total}건 중 부정 댓글이 ${negative}건(${negativePercent}%)으로 경고 수준입니다.` +
          topicDescription +
          ` 신속한 대응 전략이 필요합니다.`,
        severity: negativePercent > 50 ? "CRITICAL" : "HIGH",
        confidence: 0.9,
        evidenceRefs: [
          {
            dataSourceType: "COMMENT_SENTIMENT",
            entityId: projectId,
            label: `감성 분석 결과 (총 ${total}건)`,
            snippet: `긍정 ${positive}건(${positivePercent}%), 중립 ${neutral}건, 부정 ${negative}건(${negativePercent}%)`,
          },
          ...topNegativeTopics.map((topic: string) => ({
            dataSourceType: "COMMENT_TOPIC",
            entityId: projectId,
            label: `부정 댓글 주제: ${topic}`,
            snippet: `${negativeTopicCounts.get(topic) ?? 0}건의 부정 댓글에서 언급`,
          })),
        ],
        relatedEntityIds: [],
        sourceModules: ["COMMENT_INTELLIGENCE"],
        generatedAt: new Date(),
      });
    } else if (positivePercent > 70) {
      insights.push({
        id: randomUUID(),
        category: "KEY_FINDING",
        title: `긍정 반응 우세 (${positivePercent}%)`,
        narrative:
          `전체 댓글 ${total}건 중 긍정 댓글이 ${positive}건(${positivePercent}%)으로 매우 우호적인 반응을 보이고 있습니다. ` +
          `현재 콘텐츠 전략이 효과적으로 작동하고 있습니다.`,
        severity: "LOW",
        confidence: 0.85,
        evidenceRefs: [
          {
            dataSourceType: "COMMENT_SENTIMENT",
            entityId: projectId,
            label: `감성 분석 결과 (총 ${total}건)`,
            snippet: `긍정 ${positive}건(${positivePercent}%), 중립 ${neutral}건, 부정 ${negative}건(${negativePercent}%)`,
          },
        ],
        relatedEntityIds: [],
        sourceModules: ["COMMENT_INTELLIGENCE"],
        generatedAt: new Date(),
      });
    }

    // Topic concentration insight
    if (topTopics.length > 0) {
      const dominantTopic = topTopics[0]!;
      const dominantPercent =
        total > 0 ? Math.round((dominantTopic[1] / total) * 100) : 0;

      if (dominantPercent > 40) {
        insights.push({
          id: randomUUID(),
          category: "KEY_FINDING",
          title: `주제 집중도 높음: '${dominantTopic[0]}' (${dominantPercent}%)`,
          narrative:
            `댓글의 ${dominantPercent}%가 '${dominantTopic[0]}' 주제에 집중되어 있습니다. ` +
            `이 주제에 대한 심층 콘텐츠를 제작하거나, 관련 FAQ를 준비하면 고객 만족도를 높일 수 있습니다.`,
          severity: "MEDIUM",
          confidence: 0.8,
          evidenceRefs: topTopics.map(([topic, count]: [string, number]) => ({
            dataSourceType: "COMMENT_TOPIC",
            entityId: projectId,
            label: `주제: ${topic}`,
            snippet: `${count}건의 댓글에서 언급 (${Math.round((count / total) * 100)}%)`,
          })),
          relatedEntityIds: [],
          sourceModules: ["COMMENT_INTELLIGENCE"],
          generatedAt: new Date(),
        });
      }
    }

    return insights;
  }

  private async collectTopicInsights(
    projectId: string,
    _dateRange?: { from: Date; to: Date },
  ): Promise<GeneratedInsight[]> {
    // Topic insights are collected as part of sentiment insights
    // This method exists for explicit invocation when needed
    return this.collectSentimentInsights(projectId, _dateRange);
  }

  private async collectFAQInsights(
    projectId: string,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const unanswered =
      await this.repositories.faqCandidate.findUnanswered(projectId);
    const allFaqs =
      await this.repositories.faqCandidate.findByProject(projectId);

    if (unanswered.length === 0) return insights;

    const unansweredCount = unanswered.length;
    const totalCount = allFaqs.data.length;
    const unansweredPercent =
      totalCount > 0 ? Math.round((unansweredCount / totalCount) * 100) : 0;

    // Group unanswered FAQs by theme (using question text similarity — simplified via keyword overlap)
    const topQuestions = unanswered.slice(0, 5);
    const questionList = topQuestions
      .map((faq: any, i: number) => `${i + 1}. "${faq.question}"`)
      .join(" ");

    insights.push({
      id: randomUUID(),
      category: "OPPORTUNITY",
      title: `미답변 FAQ ${unansweredCount}건 감지`,
      narrative:
        `전체 FAQ ${totalCount}건 중 ${unansweredCount}건(${unansweredPercent}%)이 미답변 상태입니다. ` +
        `가장 빈번한 질문: ${topQuestions[0]?.question ?? "N/A"}. ` +
        `FAQ 페이지를 업데이트하거나 콘텐츠에서 직접 답변하면 고객 문의를 줄일 수 있습니다.`,
      severity: unansweredCount > 10 ? "HIGH" : "MEDIUM",
      confidence: 0.85,
      evidenceRefs: topQuestions.map((faq: any) => ({
        dataSourceType: "FAQ_CANDIDATE",
        entityId: faq.id,
        label: `미답변 질문: "${faq.question}"`,
        snippet: faq.question,
      })),
      relatedEntityIds: topQuestions.map((faq: any) => faq.id),
      sourceModules: ["FAQ_ENGINE"],
      generatedAt: new Date(),
    });

    // If many unanswered FAQs, suggest content creation
    if (unansweredCount > 5) {
      insights.push({
        id: randomUUID(),
        category: "OPPORTUNITY",
        title: `FAQ 기반 콘텐츠 제작 기회`,
        narrative:
          `${unansweredCount}건의 미답변 질문이 반복적으로 등장하고 있습니다. ` +
          `이를 주제별로 묶어 Q&A 영상이나 블로그 포스트를 제작하면 오가닉 트래픽을 확보할 수 있습니다.`,
        severity: "MEDIUM",
        confidence: 0.75,
        evidenceRefs: [
          {
            dataSourceType: "FAQ_CANDIDATE",
            entityId: projectId,
            label: `미답변 FAQ 현황`,
            snippet: questionList,
          },
        ],
        relatedEntityIds: unanswered.map((faq: any) => faq.id),
        sourceModules: ["FAQ_ENGINE"],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  private async collectRiskInsights(
    projectId: string,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const activeRisks =
      await this.repositories.riskSignal.findActive(projectId);

    if (activeRisks.length === 0) return insights;

    // Generate an insight for each active risk signal
    for (const risk of activeRisks) {
      const severity =
        risk.severity === "CRITICAL"
          ? ("CRITICAL" as const)
          : risk.severity === "HIGH"
            ? ("HIGH" as const)
            : ("MEDIUM" as const);

      insights.push({
        id: randomUUID(),
        category: "RISK",
        title: `위험 신호: ${risk.title}`,
        narrative:
          `${risk.description ?? "활성 위험 신호가 감지되었습니다."}` +
          ` 심각도: ${risk.severity}. 즉각적인 모니터링과 대응이 필요합니다.`,
        severity,
        confidence: 0.9,
        evidenceRefs: [
          {
            dataSourceType: "RISK_SIGNAL",
            entityId: risk.id,
            label: `위험 신호: ${risk.title}`,
            snippet: risk.description ?? undefined,
          },
        ],
        relatedEntityIds: [risk.id],
        sourceModules: ["RISK_ENGINE"],
        generatedAt: new Date(),
      });
    }

    // Summary insight when multiple risks active
    if (activeRisks.length >= 3) {
      const criticalCount = activeRisks.filter(
        (r: any) => r.severity === "CRITICAL",
      ).length;
      const highCount = activeRisks.filter(
        (r: any) => r.severity === "HIGH",
      ).length;

      insights.push({
        id: randomUUID(),
        category: "RISK",
        title: `복합 위험 상황: 활성 신호 ${activeRisks.length}건`,
        narrative:
          `현재 ${activeRisks.length}건의 위험 신호가 활성 상태입니다` +
          (criticalCount > 0
            ? ` (치명적 ${criticalCount}건, 높음 ${highCount}건).`
            : `.`) +
          ` 위험 요인이 누적되고 있어, 종합적인 위기 대응 계획 수립이 권장됩니다.`,
        severity: criticalCount > 0 ? "CRITICAL" : "HIGH",
        confidence: 0.95,
        evidenceRefs: activeRisks.map((r: any) => ({
          dataSourceType: "RISK_SIGNAL",
          entityId: r.id,
          label: r.title,
          snippet: r.description ?? undefined,
        })),
        relatedEntityIds: activeRisks.map((r: any) => r.id),
        sourceModules: ["RISK_ENGINE"],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  private async collectIntentInsights(
    projectId: string,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const gapOpportunities =
      await this.repositories.intent.findGapOpportunities(projectId);

    if (gapOpportunities.length === 0) return insights;

    // Blue ocean keywords
    const topGaps = gapOpportunities.slice(0, 5);
    const keywordList = topGaps.map((g: any) => g.keyword).join(", ");

    insights.push({
      id: randomUUID(),
      category: "OPPORTUNITY",
      title: `블루오션 키워드 ${gapOpportunities.length}건 발견`,
      narrative:
        `경쟁이 낮고 검색 수요가 있는 블루오션 키워드가 ${gapOpportunities.length}건 발견되었습니다. ` +
        `상위 키워드: ${keywordList}. ` +
        `해당 키워드를 타겟으로 한 콘텐츠를 우선 제작하면 검색 유입을 효과적으로 확보할 수 있습니다.`,
      severity: gapOpportunities.length > 10 ? "HIGH" : "MEDIUM",
      confidence: 0.8,
      evidenceRefs: topGaps.map((gap: any) => ({
        dataSourceType: "INTENT_GAP",
        entityId: gap.id,
        label: `키워드: "${gap.keyword}"`,
        snippet: `갭 스코어: ${gap.gapScore}`,
      })),
      relatedEntityIds: topGaps.map((g: any) => g.id),
      sourceModules: ["SEARCH_INTENT"],
      generatedAt: new Date(),
    });

    // Highlight top opportunity
    if (topGaps.length > 0) {
      const best = topGaps[0]!;
      insights.push({
        id: randomUUID(),
        category: "OPPORTUNITY",
        title: `최우선 키워드 기회: "${best.keyword}"`,
        narrative:
          `"${best.keyword}"는 갭 스코어 ${best.gapScore}으로 가장 높은 기회를 보이고 있습니다. ` +
          `현재 경쟁사 콘텐츠가 부족한 영역으로, 선점 효과를 기대할 수 있습니다.`,
        severity: "MEDIUM",
        confidence: 0.75,
        evidenceRefs: [
          {
            dataSourceType: "INTENT_GAP",
            entityId: best.id,
            label: `키워드: "${best.keyword}"`,
            snippet: `갭 스코어: ${best.gapScore}`,
          },
        ],
        relatedEntityIds: [best.id],
        sourceModules: ["SEARCH_INTENT"],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  private async collectTrendInsights(
    projectId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const trends = dateRange
      ? await this.repositories.trendAnalytics.findByProject(
          projectId,
          dateRange,
        )
      : await this.repositories.trendAnalytics.findLatest(projectId, 50);

    if (trends.length === 0) return insights;

    const rising = trends.filter((t: any) => t.searchTrend === "RISING");
    const declining = trends.filter((t: any) => t.searchTrend === "DECLINING");

    // Rising keywords insight
    if (rising.length > 0) {
      const topRising = rising.slice(0, 5);
      const risingKeywords = topRising.map((t: any) => t.keyword).join(", ");

      insights.push({
        id: randomUUID(),
        category: "TREND_CHANGE",
        title: `상승 트렌드 키워드 ${rising.length}건`,
        narrative:
          `${rising.length}개의 키워드가 상승 트렌드를 보이고 있습니다: ${risingKeywords}. ` +
          `이 트렌드에 맞춘 콘텐츠를 빠르게 제작하면 트래픽 증가를 기대할 수 있습니다.`,
        severity: "MEDIUM",
        confidence: 0.8,
        evidenceRefs: topRising.map((t: any) => ({
          dataSourceType: "TREND_KEYWORD",
          entityId: t.id,
          label: `키워드: "${t.keyword}"`,
          snippet: `평균 검색량: ${t.avgSearchVolume ?? "N/A"}, 트렌드: 상승`,
        })),
        relatedEntityIds: topRising.map((t: any) => t.id),
        sourceModules: ["TREND_ENGINE"],
        generatedAt: new Date(),
      });
    }

    // Declining keywords insight
    if (declining.length > 0) {
      const topDeclining = declining.slice(0, 5);
      const decliningKeywords = topDeclining
        .map((t: any) => t.keyword)
        .join(", ");

      insights.push({
        id: randomUUID(),
        category: "RISK",
        title: `하락 트렌드 키워드 ${declining.length}건`,
        narrative:
          `${declining.length}개의 키워드가 하락 트렌드를 보이고 있습니다: ${decliningKeywords}. ` +
          `해당 키워드에 의존하는 콘텐츠가 있다면 대체 키워드 전략을 수립해야 합니다.`,
        severity: declining.length > 5 ? "HIGH" : "MEDIUM",
        confidence: 0.75,
        evidenceRefs: topDeclining.map((t: any) => ({
          dataSourceType: "TREND_KEYWORD",
          entityId: t.id,
          label: `키워드: "${t.keyword}"`,
          snippet: `평균 검색량: ${t.avgSearchVolume ?? "N/A"}, 트렌드: 하락`,
        })),
        relatedEntityIds: topDeclining.map((t: any) => t.id),
        sourceModules: ["TREND_ENGINE"],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  private async collectAeoInsights(
    projectId: string,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const aeoKeywords =
      await this.repositories.aeo.findLatestSnapshots(projectId);

    if (aeoKeywords.length === 0) return insights;

    // Find keywords with low visibility
    const lowVisibility: Array<{
      keyword: string;
      engine: string;
      score: number;
      id: string;
    }> = [];

    for (const kw of aeoKeywords) {
      for (const snap of kw.snapshots) {
        if (
          snap.visibilityScore != null &&
          snap.visibilityScore < 30 &&
          snap.visibilityScore > 0
        ) {
          lowVisibility.push({
            keyword: kw.keyword,
            engine: snap.engine,
            score: snap.visibilityScore!,
            id: kw.id,
          });
        }
      }
    }

    if (lowVisibility.length > 0) {
      const topLow = lowVisibility
        .sort((a: any, b: any) => a.score - b.score)
        .slice(0, 5);

      const keywordSummary = topLow
        .map((l: any) => `"${l.keyword}" (${l.engine}: ${l.score}점)`)
        .join(", ");

      insights.push({
        id: randomUUID(),
        category: "OPPORTUNITY",
        title: `AI 검색 노출도 낮음: ${lowVisibility.length}건`,
        narrative:
          `${lowVisibility.length}개의 키워드에서 AI 검색 엔진 노출 점수가 30점 미만입니다. ` +
          `주요 대상: ${keywordSummary}. ` +
          `콘텐츠를 AI 검색 최적화(AEO) 기준에 맞게 구조화하면 노출을 개선할 수 있습니다.`,
        severity: lowVisibility.length > 5 ? "HIGH" : "MEDIUM",
        confidence: 0.7,
        evidenceRefs: topLow.map((l: any) => ({
          dataSourceType: "AEO_SNAPSHOT",
          entityId: l.id,
          label: `${l.keyword} (${l.engine})`,
          snippet: `노출 점수: ${l.score}/100`,
        })),
        relatedEntityIds: [...new Set(topLow.map((l: any) => l.id))],
        sourceModules: ["GEO_AEO"],
        generatedAt: new Date(),
      });
    }

    // High visibility keywords (positive finding)
    const highVisibility = aeoKeywords.filter((kw: any) =>
      kw.snapshots.some((s: any) => s.visibilityScore >= 70),
    );

    if (highVisibility.length > 0) {
      insights.push({
        id: randomUUID(),
        category: "KEY_FINDING",
        title: `AI 검색 상위 노출 키워드 ${highVisibility.length}건`,
        narrative:
          `${highVisibility.length}개의 키워드에서 AI 검색 엔진 노출 점수가 70점 이상으로, ` +
          `현재 AEO 전략이 잘 작동하고 있습니다. 이 키워드들의 성과를 유지하세요.`,
        severity: "LOW",
        confidence: 0.8,
        evidenceRefs: highVisibility.slice(0, 3).map((kw: any) => ({
          dataSourceType: "AEO_SNAPSHOT",
          entityId: kw.id,
          label: `키워드: "${kw.keyword}"`,
          snippet: `최고 노출 점수: ${Math.max(...kw.snapshots.map((s: any) => s.visibilityScore))}/100`,
        })),
        relatedEntityIds: highVisibility.map((kw: any) => kw.id),
        sourceModules: ["GEO_AEO"],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  private async collectCampaignInsights(
    projectId: string,
  ): Promise<GeneratedInsight[]> {
    const insights: GeneratedInsight[] = [];

    const campaignResult =
      await this.repositories.campaign.findByProject(projectId);
    const campaigns = campaignResult.data;

    if (campaigns.length === 0) return insights;

    const activeCampaigns = campaigns.filter(
      (c: any) => c.status === "ACTIVE" || c.status === "IN_PROGRESS",
    );

    for (const campaign of activeCampaigns) {
      const budget = Number((campaign as any).totalBudget ?? 0);
      const creators = (campaign as any).creators ?? [];
      let totalEngagements = 0;
      let totalViews = 0;

      for (const creator of creators) {
        const contents = (creator as any).contents ?? [];
        for (const content of contents) {
          totalViews += Number(content.views ?? 0);
          totalEngagements +=
            Number(content.likes ?? 0) +
            Number(content.comments ?? 0) +
            Number(content.shares ?? 0);
        }
      }

      const engagementRate =
        totalViews > 0
          ? Math.round((totalEngagements / totalViews) * 10000) / 100
          : 0;

      if (totalViews > 0) {
        const cpe =
          totalEngagements > 0
            ? Math.round((budget / totalEngagements) * 100) / 100
            : 0;

        insights.push({
          id: randomUUID(),
          category: "PERFORMANCE",
          title: `캠페인 "${campaign.name}" 성과 현황`,
          narrative:
            `캠페인 "${campaign.name}"의 현재 성과: 총 조회수 ${totalViews.toLocaleString()}회, ` +
            `참여 ${totalEngagements.toLocaleString()}건(참여율 ${engagementRate}%). ` +
            (budget > 0
              ? `참여당 비용(CPE) ${cpe}원으로, ` +
                (engagementRate > 5
                  ? `효율적인 성과를 보이고 있습니다.`
                  : `참여율 개선이 필요합니다.`)
              : `예산 정보가 없어 비용 효율 분석이 불가합니다.`),
          severity:
            engagementRate < 2 ? "HIGH" : engagementRate < 5 ? "MEDIUM" : "LOW",
          confidence: 0.85,
          evidenceRefs: [
            {
              dataSourceType: "CAMPAIGN",
              entityId: campaign.id,
              label: `캠페인: ${campaign.name}`,
              snippet: `조회수 ${totalViews.toLocaleString()}, 참여 ${totalEngagements.toLocaleString()}, 참여율 ${engagementRate}%`,
            },
          ],
          relatedEntityIds: [campaign.id],
          sourceModules: ["CAMPAIGN_PERFORMANCE"],
          generatedAt: new Date(),
        });
      }
    }

    return insights;
  }
}
