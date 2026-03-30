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

export type ActionCategory =
  | "CONTENT_CREATION"
  | "CONTENT_OPTIMIZATION"
  | "COMMUNITY_MANAGEMENT"
  | "ADVERTISING"
  | "INFLUENCER"
  | "REPORT_SHARE"
  | "FAQ_RESPONSE"
  | "RISK_MITIGATION"
  | "SEO_OPTIMIZATION"
  | "PRODUCT_FEEDBACK";

export type RecommendedAction = {
  title: string;
  description: string;
  category: ActionCategory;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  expectedImpact: string; // Korean description of expected outcome
  evidenceIds: string[]; // references to source entities
  sourceModules: string[];
  suggestedOwner: string | null; // "마케터", "콘텐츠 담당자", "CS 담당자", etc.
  suggestedTiming: string | null; // "즉시", "1주 이내", "다음 콘텐츠 기획 시"
  insightContext: string; // Why this action matters — Korean narrative
};

export type ActionOrchestrationInput = {
  projectId: string;
  reportId?: string; // optional — link actions to a report
  dateRange?: { from: Date; to: Date };
  ownerSuggestions?: boolean; // suggest owners based on action type
};

export type OrchestrationResult = {
  projectId: string;
  actions: RecommendedAction[];
  signalSummary: {
    totalSignals: number;
    byModule: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  generatedAt: Date;
};

// ---------------------------------------------------------------------------
// Owner & timing mappings
// ---------------------------------------------------------------------------

const OWNER_MAP: Record<ActionCategory, string> = {
  CONTENT_CREATION: "콘텐츠 담당자",
  CONTENT_OPTIMIZATION: "콘텐츠 담당자",
  COMMUNITY_MANAGEMENT: "커뮤니티 매니저",
  ADVERTISING: "광고 담당자",
  INFLUENCER: "인플루언서 매니저",
  REPORT_SHARE: "마케팅 매니저",
  FAQ_RESPONSE: "CS 담당자",
  RISK_MITIGATION: "브랜드 매니저",
  SEO_OPTIMIZATION: "SEO 담당자",
  PRODUCT_FEEDBACK: "제품 담당자",
};

const TIMING_MAP: Record<string, string> = {
  CRITICAL: "즉시 대응 필요",
  HIGH: "1주 이내",
  MEDIUM: "다음 콘텐츠 기획 시",
  LOW: "분기 리뷰 시 검토",
};

const PRIORITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ActionRecommendationOrchestrator {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * Orchestrate action recommendations from ALL analysis modules.
   */
  async orchestrate(
    input: ActionOrchestrationInput,
    trace: TraceContext,
  ): Promise<ServiceResult<OrchestrationResult>> {
    try {
      const { projectId, reportId, ownerSuggestions = true } = input;
      const actions: RecommendedAction[] = [];

      // 1. Collect signals from all modules
      await this.collectSentimentSignals(projectId, actions);
      await this.collectFAQSignals(projectId, actions);
      await this.collectRiskSignals(projectId, actions);
      await this.collectIntentSignals(projectId, actions);
      await this.collectAeoSignals(projectId, actions);
      await this.collectTrendSignals(projectId, input.dateRange, actions);
      await this.collectCampaignSignals(projectId, actions);

      // 2. Enrich with owner and timing suggestions
      if (ownerSuggestions) {
        for (const action of actions) {
          action.suggestedOwner = OWNER_MAP[action.category] ?? null;
          action.suggestedTiming = TIMING_MAP[action.priority] ?? null;
        }
      }

      // 3. Deduplicate similar actions
      const deduped = this.deduplicateActions(actions);

      // 4. Sort by priority
      deduped.sort(
        (a: any, b: any) =>
          (PRIORITY_ORDER[a.priority] ?? 99) -
          (PRIORITY_ORDER[b.priority] ?? 99),
      );

      // 5. Build signal summary
      const byModule: Record<string, number> = {};
      const bySeverity: Record<string, number> = {};
      for (const action of deduped) {
        for (const mod of action.sourceModules) {
          byModule[mod] = (byModule[mod] ?? 0) + 1;
        }
        bySeverity[action.priority] = (bySeverity[action.priority] ?? 0) + 1;
      }

      // 6. Persist to DB if reportId is provided
      if (reportId) {
        const persistResult = await this.persistActions(
          deduped,
          reportId,
          trace,
        );
        if (!persistResult.success) {
          this.logger.warn(
            "Failed to persist actions, returning in-memory results",
            {
              reportId,
              error: persistResult.error,
              requestId: trace.requestId,
            },
          );
        }
      }

      const result: OrchestrationResult = {
        projectId,
        actions: deduped,
        signalSummary: {
          totalSignals: deduped.length,
          byModule,
          bySeverity,
        },
        generatedAt: new Date(),
      };

      this.logger.info("Action orchestration completed", {
        projectId,
        actionCount: deduped.length,
        byModule,
        bySeverity,
        reportId: reportId ?? null,
        requestId: trace.requestId,
      });

      return ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Action orchestration failed", {
        projectId: input.projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ORCHESTRATION_FAILED");
    }
  }

  /**
   * Persist recommended actions to InsightAction table.
   */
  async persistActions(
    actions: RecommendedAction[],
    reportId: string,
    trace: TraceContext,
  ): Promise<ServiceResult<number>> {
    try {
      let count = 0;

      for (const action of actions) {
        await this.repositories.insightAction.create({
          title: action.title,
          description: action.description,
          priority: action.priority as any,
          status: "PENDING",
          sourceModule: (action.sourceModules[0] as any) ?? "UNKNOWN",
          sourceEntityId: action.evidenceIds[0] ?? null,
          report: { connect: { id: reportId } },
        });
        count++;
      }

      this.logger.info("Actions persisted", {
        reportId,
        count,
        requestId: trace.requestId,
      });

      return ok(count);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to persist actions", {
        reportId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "ACTION_PERSIST_FAILED");
    }
  }

  // ---------------------------------------------------------------------------
  // Signal collectors
  // ---------------------------------------------------------------------------

  private async collectSentimentSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const sentimentDistribution =
        await this.repositories.comment.countBySentiment(projectId);
      const totalComments = sentimentDistribution.reduce(
        (sum: number, s: any) => sum + s.count,
        0,
      );
      if (totalComments === 0) return;

      const negativeCount =
        sentimentDistribution.find((s: any) => s.sentiment === "NEGATIVE")
          ?.count ?? 0;
      const negativeRatio = negativeCount / totalComments;

      if (negativeRatio > 0.3) {
        const percent = Math.round(negativeRatio * 100);

        // Identify top negative topics
        const analysesResult =
          await this.repositories.comment.findAnalysisByFilters(projectId);
        const negativeAnalyses = analysesResult.data.filter(
          (a: any) => a.sentiment === "NEGATIVE",
        );

        const topicCounts: Record<string, number> = {};
        for (const a of negativeAnalyses) {
          if (a.topics && Array.isArray(a.topics)) {
            for (const topic of a.topics as string[]) {
              topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
            }
          }
        }

        const topTopics = Object.entries(topicCounts)
          .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
          .slice(0, 3)
          .map(([topic]: [string, number]) => topic);

        actions.push({
          title: "부정 댓글 비율 경고 — 커뮤니티 대응 필요",
          description: `전체 댓글의 ${percent}%가 부정적입니다. ${topTopics.length > 0 ? `주요 불만 토픽: ${topTopics.join(", ")}` : "주요 불만 토픽을 확인하세요."}`,
          category:
            negativeRatio > 0.5 ? "RISK_MITIGATION" : "COMMUNITY_MANAGEMENT",
          priority: negativeRatio > 0.5 ? "CRITICAL" : "HIGH",
          expectedImpact:
            "부정 댓글에 적극 대응 시 브랜드 이미지 개선 및 이탈률 감소 기대",
          evidenceIds: negativeAnalyses
            .slice(0, 5)
            .map((a: any) => a.id ?? "")
            .filter(Boolean),
          sourceModules: ["COMMENT_INTELLIGENCE"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `부정 비율이 ${percent}%로, 업계 평균(15~20%)을 크게 상회합니다. ${topTopics.length > 0 ? `'${topTopics[0]}' 관련 불만이 집중되어 있어 해당 영역의 개선이 시급합니다.` : "원인 분석 후 우선 대응이 필요합니다."}`,
        });
      }

      // Product feedback signal from question/risk comments
      const analysesResult2 =
        await this.repositories.comment.findAnalysisByFilters(projectId);
      const riskComments = analysesResult2.data.filter(
        (a: any) => a.isRisk === true,
      );
      if (riskComments.length >= 3) {
        actions.push({
          title: "제품/서비스 피드백 수집 — 댓글 기반 인사이트",
          description: `리스크로 분류된 댓글 ${riskComments.length}건에서 제품 개선 힌트를 확인하세요.`,
          category: "PRODUCT_FEEDBACK",
          priority: "MEDIUM",
          expectedImpact: "고객 불만 사전 파악으로 제품 개선 방향 설정 가능",
          evidenceIds: riskComments
            .slice(0, 5)
            .map((a: any) => a.id ?? "")
            .filter(Boolean),
          sourceModules: ["COMMENT_INTELLIGENCE"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `댓글 중 ${riskComments.length}건이 리스크 신호로 감지되었습니다. 이는 고객이 직접 표현한 불만이므로 제품팀과 공유할 가치가 높습니다.`,
        });
      }
    } catch {
      // Non-critical — skip sentiment signals
    }
  }

  private async collectFAQSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const unanswered =
        await this.repositories.faqCandidate.findUnanswered(projectId);

      if (unanswered.length > 0) {
        const topQuestion = unanswered[0]!.question;
        actions.push({
          title: `미답변 FAQ ${unanswered.length}건 — FAQ 콘텐츠 제작 필요`,
          description: `가장 많이 묻는 질문: "${topQuestion}". FAQ 페이지 또는 영상 콘텐츠로 제작하세요.`,
          category: "FAQ_RESPONSE",
          priority: unanswered.length > 5 ? "HIGH" : "MEDIUM",
          expectedImpact:
            "FAQ 콘텐츠 제작 시 반복 문의 감소 및 고객 만족도 향상",
          evidenceIds: unanswered.slice(0, 5).map((f: any) => f.id),
          sourceModules: ["FAQ_ENGINE"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${unanswered.length}개의 질문이 아직 답변되지 않았습니다. 상위 질문을 FAQ 콘텐츠로 전환하면 CS 부담을 줄이고 검색 유입도 기대할 수 있습니다.`,
        });

        // Content creation opportunity from FAQs
        if (unanswered.length >= 3) {
          actions.push({
            title: "FAQ 기반 콘텐츠 기획",
            description: `상위 FAQ를 활용한 교육/안내 콘텐츠 ${Math.min(unanswered.length, 5)}건을 기획하세요.`,
            category: "CONTENT_CREATION",
            priority: "MEDIUM",
            expectedImpact:
              "FAQ 기반 콘텐츠는 검색 유입이 높고 시청자 체류 시간 증가 기대",
            evidenceIds: unanswered.slice(0, 5).map((f: any) => f.id),
            sourceModules: ["FAQ_ENGINE"],
            suggestedOwner: null,
            suggestedTiming: null,
            insightContext: `시청자들이 반복적으로 묻는 질문은 콘텐츠 수요의 직접적 증거입니다. 이를 영상이나 게시물로 제작하면 높은 참여율이 예상됩니다.`,
          });
        }
      }
    } catch {
      // Non-critical — skip FAQ signals
    }
  }

  private async collectRiskSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const activeRisks =
        await this.repositories.riskSignal.findActive(projectId);

      for (const risk of activeRisks.slice(0, 5)) {
        const isCritical = risk.severity === "CRITICAL";
        actions.push({
          title: `리스크 대응: ${risk.title}`,
          description:
            risk.description ??
            "활성 리스크 신호가 감지되었습니다. 즉시 조사 및 대응이 필요합니다.",
          category: "RISK_MITIGATION",
          priority: isCritical ? "CRITICAL" : "HIGH",
          expectedImpact: isCritical
            ? "즉시 대응하지 않으면 브랜드 위기로 확대될 수 있습니다"
            : "조기 대응으로 리스크 확산 방지 가능",
          evidenceIds: [risk.id],
          sourceModules: ["RISK_ENGINE"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `"${risk.title}" 리스크가 활성 상태입니다. ${isCritical ? "심각도 CRITICAL로 분류되어 최우선 대응이 필요합니다." : "조기에 대응하면 확산을 방지할 수 있습니다."}`,
        });
      }
    } catch {
      // Non-critical — skip risk signals
    }
  }

  private async collectIntentSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const gapOpportunities =
        await this.repositories.intent.findGapOpportunities(projectId);

      if (gapOpportunities.length > 0) {
        const topGap = gapOpportunities[0]!;
        actions.push({
          title: `블루오션 키워드 발견: "${topGap.keyword}"`,
          description: `갭 스코어 ${topGap.gapScore} — 경쟁이 낮고 검색 수요가 있는 키워드입니다. 콘텐츠를 제작하세요.`,
          category: "CONTENT_CREATION",
          priority: gapOpportunities.length > 3 ? "HIGH" : "MEDIUM",
          expectedImpact:
            "경쟁 낮은 키워드 선점으로 검색 유입 증가 및 채널 성장 가속",
          evidenceIds: gapOpportunities.slice(0, 5).map((g: any) => g.id),
          sourceModules: ["SEARCH_INTENT"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${gapOpportunities.length}개의 블루오션 키워드가 발견되었습니다. "${topGap.keyword}"는 갭 스코어 ${topGap.gapScore}으로, 현재 경쟁자가 거의 없는 영역입니다.`,
        });

        // SEO optimization opportunity
        if (gapOpportunities.length >= 5) {
          actions.push({
            title: "SEO 키워드 전략 수립",
            description: `${gapOpportunities.length}개의 갭 키워드를 활용한 체계적 SEO 전략을 수립하세요.`,
            category: "SEO_OPTIMIZATION",
            priority: "MEDIUM",
            expectedImpact: "체계적 키워드 전략으로 장기적 검색 트래픽 안정화",
            evidenceIds: gapOpportunities.slice(0, 5).map((g: any) => g.id),
            sourceModules: ["SEARCH_INTENT"],
            suggestedOwner: null,
            suggestedTiming: null,
            insightContext: `발견된 ${gapOpportunities.length}개의 갭 키워드를 체계적으로 공략하면, 3~6개월 내 검색 유입이 의미 있게 증가할 수 있습니다.`,
          });
        }
      }
    } catch {
      // Non-critical — skip intent signals
    }
  }

  private async collectAeoSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const aeoKeywords =
        await this.repositories.aeo.findLatestSnapshots(projectId);

      const lowVisibility = [];
      for (const kw of aeoKeywords) {
        for (const snap of kw.snapshots) {
          if (
            snap.visibilityScore != null &&
            snap.visibilityScore < 20 &&
            snap.visibilityScore > 0
          ) {
            lowVisibility.push({
              keyword: kw.keyword,
              id: kw.id,
              engine: snap.engine,
              score: snap.visibilityScore,
            });
            break; // one per keyword
          }
        }
      }

      if (lowVisibility.length > 0) {
        const topKw = lowVisibility[0]!;
        actions.push({
          title: `AI 검색 노출 최적화 필요 — ${lowVisibility.length}개 키워드`,
          description: `"${topKw.keyword}" 등 ${lowVisibility.length}개 키워드의 AI 검색 엔진 노출이 낮습니다 (점수 ${topKw.score}).`,
          category: "SEO_OPTIMIZATION",
          priority: lowVisibility.length > 3 ? "HIGH" : "MEDIUM",
          expectedImpact:
            "AEO 최적화로 AI 검색(ChatGPT, Gemini 등)에서의 브랜드 노출 확대",
          evidenceIds: lowVisibility.map((v: any) => v.id),
          sourceModules: ["GEO_AEO"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `AI 검색 엔진에서 "${topKw.keyword}" 키워드의 노출 점수가 ${topKw.score}점으로 매우 낮습니다. AI 검색 비중이 증가하는 추세에서, AEO 최적화는 향후 트래픽 확보의 핵심입니다.`,
        });
      }
    } catch {
      // Non-critical — skip AEO signals
    }
  }

  private async collectTrendSignals(
    projectId: string,
    dateRange: { from: Date; to: Date } | undefined,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const trends = dateRange
        ? await this.repositories.trendAnalytics.findByProject(
            projectId,
            dateRange,
          )
        : await this.repositories.trendAnalytics.findLatest(projectId, 20);

      const rising = trends.filter(
        (t: any) => (t as any).searchTrend === "RISING",
      );
      const declining = trends.filter(
        (t: any) => (t as any).searchTrend === "DECLINING",
      );

      // Rising trends — content optimization opportunity
      if (rising.length > 0) {
        const topRising = rising[0]!;
        actions.push({
          title: `상승 트렌드 활용 — "${(topRising as any).keyword}" 콘텐츠 최적화`,
          description: `"${(topRising as any).keyword}" 등 ${rising.length}개 키워드가 상승 추세입니다. 관련 콘텐츠를 강화하세요.`,
          category: "CONTENT_OPTIMIZATION",
          priority: rising.length > 5 ? "HIGH" : "MEDIUM",
          expectedImpact:
            "상승 트렌드 키워드를 활용한 콘텐츠로 자연 유입 극대화",
          evidenceIds: rising.slice(0, 5).map((t: any) => t.id),
          sourceModules: ["TREND_ANALYSIS"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${rising.length}개 키워드가 상승 추세입니다. 이 트렌드에 맞춘 콘텐츠를 빠르게 제작하면, 검색량 증가의 수혜를 직접적으로 받을 수 있습니다.`,
        });
      }

      // Declining trends — risk awareness
      if (declining.length >= 3) {
        actions.push({
          title: `하락 트렌드 경고 — ${declining.length}개 키워드 검색량 감소`,
          description: `기존에 활용하던 키워드 중 ${declining.length}개가 하락 추세입니다. 콘텐츠 전략 재검토가 필요합니다.`,
          category: "CONTENT_OPTIMIZATION",
          priority: "LOW",
          expectedImpact:
            "하락 키워드에 대한 의존도를 줄이고 새로운 키워드로 전환",
          evidenceIds: declining.slice(0, 5).map((t: any) => t.id),
          sourceModules: ["TREND_ANALYSIS"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${declining.length}개 키워드의 검색량이 감소하고 있습니다. 이 키워드에 의존하는 콘텐츠의 성과도 함께 하락할 수 있으므로 대안 키워드를 준비하세요.`,
        });
      }
    } catch {
      // Non-critical — skip trend signals
    }
  }

  private async collectCampaignSignals(
    projectId: string,
    actions: RecommendedAction[],
  ): Promise<void> {
    try {
      const campaignResult =
        await this.repositories.campaign.findByProject(projectId);
      const campaigns = campaignResult.data ?? [];

      const activeCampaigns = campaigns.filter(
        (c: any) => (c as any).status === "ACTIVE",
      );

      if (activeCampaigns.length > 0) {
        actions.push({
          title: `캠페인 성과 리포트 공유 — ${activeCampaigns.length}개 진행 중`,
          description: `현재 ${activeCampaigns.length}개의 활성 캠페인이 있습니다. 성과 리포트를 이해관계자에게 공유하세요.`,
          category: "REPORT_SHARE",
          priority: "LOW",
          expectedImpact:
            "정기적 성과 공유로 의사결정 속도 향상 및 팀 얼라인먼트 강화",
          evidenceIds: activeCampaigns.slice(0, 5).map((c: any) => c.id),
          sourceModules: ["CAMPAIGN_MANAGEMENT"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${activeCampaigns.length}개의 캠페인이 진행 중입니다. 주기적으로 성과를 정리하고 공유하면 캠페인 최적화 판단이 빨라집니다.`,
        });
      }

      // Check for draft campaigns that could be activated
      const draftCampaigns = campaigns.filter(
        (c: any) => (c as any).status === "DRAFT",
      );
      if (draftCampaigns.length >= 2) {
        actions.push({
          title: `미실행 캠페인 ${draftCampaigns.length}건 — 실행 검토 필요`,
          description: `DRAFT 상태의 캠페인이 ${draftCampaigns.length}건 있습니다. 실행 여부를 검토하세요.`,
          category: "ADVERTISING",
          priority: "LOW",
          expectedImpact: "대기 중인 캠페인을 실행하면 추가 도달 및 전환 기대",
          evidenceIds: draftCampaigns.slice(0, 5).map((c: any) => c.id),
          sourceModules: ["CAMPAIGN_MANAGEMENT"],
          suggestedOwner: null,
          suggestedTiming: null,
          insightContext: `${draftCampaigns.length}개의 캠페인이 기획만 되고 실행되지 않았습니다. 타이밍을 놓치기 전에 실행 여부를 결정하세요.`,
        });
      }
    } catch {
      // Non-critical — skip campaign signals
    }
  }

  // ---------------------------------------------------------------------------
  // Deduplication
  // ---------------------------------------------------------------------------

  /**
   * Remove near-duplicate actions by comparing category + sourceModules.
   * When duplicates are found, keep the higher-priority one and merge evidenceIds.
   */
  private deduplicateActions(
    actions: RecommendedAction[],
  ): RecommendedAction[] {
    const seen = new Map<string, RecommendedAction>();

    for (const action of actions) {
      // Key by category + first source module + first 20 chars of title
      const key = `${action.category}:${action.sourceModules[0] ?? ""}:${action.title.slice(0, 20)}`;

      const existing = seen.get(key);
      if (existing) {
        // Merge evidence IDs
        const mergedIds = new Set([
          ...existing.evidenceIds,
          ...action.evidenceIds,
        ]);
        existing.evidenceIds = Array.from(mergedIds);

        // Merge source modules
        const mergedModules = new Set([
          ...existing.sourceModules,
          ...action.sourceModules,
        ]);
        existing.sourceModules = Array.from(mergedModules);

        // Keep higher priority
        if (
          (PRIORITY_ORDER[action.priority] ?? 99) <
          (PRIORITY_ORDER[existing.priority] ?? 99)
        ) {
          existing.priority = action.priority;
          existing.suggestedTiming =
            TIMING_MAP[action.priority] ?? existing.suggestedTiming;
        }
      } else {
        // Clone to avoid mutation
        seen.set(key, {
          ...action,
          evidenceIds: [...action.evidenceIds],
          sourceModules: [...action.sourceModules],
        });
      }
    }

    return Array.from(seen.values());
  }
}
