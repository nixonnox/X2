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

export type TriggerContext = {
  projectId?: string;
  workspaceId?: string;
  payload?: Record<string, unknown>;
};

export type TriggerEvaluationResult = {
  shouldFire: boolean;
  payload: Record<string, unknown>;
  evaluator: string;
  description: string;
};

export type AutomationRule = {
  id: string;
  triggerType: string;
  triggerCondition: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  isEnabled: boolean;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TriggerEvaluationService {
  constructor(
    private readonly repositories: Repositories,
    private readonly logger: Logger,
  ) {}

  /**
   * 규칙의 트리거 조건이 현재 컨텍스트에서 충족되는지 평가합니다.
   */
  async evaluate(
    rule: AutomationRule,
    context: TriggerContext,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const triggerType = rule.triggerType;

      switch (triggerType) {
        case "EVENT_RISK_SPIKE":
          return this.evaluateRiskSpike(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_SENTIMENT_SPIKE":
          return this.evaluateSentimentSpike(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_FAQ_SURGE":
          return this.evaluateFaqSurge(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_KEYWORD_TREND":
          return this.evaluateKeywordTrend(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_CAMPAIGN_ANOMALY":
          return this.evaluateCampaignAnomaly(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_GEO_SCORE_CHANGE":
          return this.evaluateGeoScoreChange(
            context.projectId!,
            rule.triggerCondition,
            trace,
          );
        case "EVENT_COLLECTION_HEALTH":
          return this.evaluateCollectionHealth(
            context.workspaceId!,
            rule.triggerCondition,
            trace,
          );
        default:
          return ok({
            shouldFire: false,
            payload: {},
            evaluator: "unknown",
            description: `알 수 없는 트리거 타입: ${triggerType}`,
          });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("트리거 평가 실패", {
        ruleId: rule.id,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "TRIGGER_EVALUATION_FAILED");
    }
  }

  /**
   * CRITICAL/HIGH 리스크 시그널이 크게 증가했는지 확인합니다.
   */
  async evaluateRiskSpike(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const threshold = (condition.threshold as number) ?? 3;
      const risks = await this.repositories.riskSignal.findActive(projectId);
      const criticalHighRisks = risks.filter(
        (r: any) => r.severity === "CRITICAL" || r.severity === "HIGH",
      );

      const shouldFire = criticalHighRisks.length >= threshold;

      this.logger.info("리스크 스파이크 평가 완료", {
        projectId,
        riskCount: criticalHighRisks.length,
        threshold,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          riskCount: criticalHighRisks.length,
          threshold,
          riskIds: criticalHighRisks.map((r: any) => r.id),
          severities: criticalHighRisks.map((r: any) => r.severity),
        },
        evaluator: "evaluateRiskSpike",
        description: shouldFire
          ? `심각/높음 수준 리스크 시그널이 ${criticalHighRisks.length}건 감지되었습니다 (기준: ${threshold}건).`
          : `리스크 시그널 수(${criticalHighRisks.length}건)가 기준치(${threshold}건) 미만입니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("리스크 스파이크 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "RISK_SPIKE_EVAL_FAILED");
    }
  }

  /**
   * 부정 감성 비율이 기준치를 초과했는지 확인합니다.
   */
  async evaluateSentimentSpike(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const thresholdPercent = (condition.thresholdPercent as number) ?? 40;
      const sentimentDist =
        await this.repositories.comment.countBySentiment(projectId);
      const pos = (sentimentDist as any).positive ?? 0;
      const neu = (sentimentDist as any).neutral ?? 0;
      const neg = (sentimentDist as any).negative ?? 0;
      const total = pos + neu + neg;

      if (total === 0) {
        return ok({
          shouldFire: false,
          payload: { total: 0 },
          evaluator: "evaluateSentimentSpike",
          description: "분석 대상 댓글이 없습니다.",
        });
      }

      const negRate = Math.round((neg / total) * 100);
      const shouldFire = negRate > thresholdPercent;

      this.logger.info("감성 스파이크 평가 완료", {
        projectId,
        negRate,
        thresholdPercent,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          negativeRate: negRate,
          negativeCount: neg,
          totalCount: total,
          thresholdPercent,
        },
        evaluator: "evaluateSentimentSpike",
        description: shouldFire
          ? `부정 댓글 비율이 ${negRate}%로 기준치(${thresholdPercent}%)를 초과했습니다.`
          : `부정 댓글 비율(${negRate}%)이 기준치(${thresholdPercent}%) 이내입니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("감성 스파이크 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "SENTIMENT_SPIKE_EVAL_FAILED");
    }
  }

  /**
   * 미답변 FAQ 수가 기준치를 초과했는지 확인합니다.
   */
  async evaluateFaqSurge(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const threshold = (condition.threshold as number) ?? 10;
      const unansweredFaqs =
        await this.repositories.faqCandidate.findUnanswered(projectId);
      const shouldFire = unansweredFaqs.length > threshold;

      this.logger.info("FAQ 급증 평가 완료", {
        projectId,
        unansweredCount: unansweredFaqs.length,
        threshold,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          unansweredCount: unansweredFaqs.length,
          threshold,
          faqIds: unansweredFaqs.slice(0, 20).map((f: any) => f.id),
        },
        evaluator: "evaluateFaqSurge",
        description: shouldFire
          ? `미답변 FAQ가 ${unansweredFaqs.length}건으로 기준치(${threshold}건)를 초과했습니다.`
          : `미답변 FAQ(${unansweredFaqs.length}건)가 기준치(${threshold}건) 이내입니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("FAQ 급증 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "FAQ_SURGE_EVAL_FAILED");
    }
  }

  /**
   * 키워드 트렌드에 급격한 변화가 있는지 확인합니다.
   */
  async evaluateKeywordTrend(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const changeThreshold =
        (condition.changeThresholdPercent as number) ?? 50;

      // 최근 트렌드 데이터 조회
      let trendData: any[] = [];
      try {
        const result = await (
          this.repositories as any
        ).trendAnalytics.findByProject?.(projectId);
        trendData = Array.isArray(result) ? result : [];
      } catch {
        trendData = [];
      }

      // 이전 기간 대비 변화율 계산
      const significantChanges = trendData.filter((t: any) => {
        const change = t.changePercent ?? t.percentChange ?? 0;
        return Math.abs(change) >= changeThreshold;
      });

      const shouldFire = significantChanges.length > 0;

      this.logger.info("키워드 트렌드 평가 완료", {
        projectId,
        significantChanges: significantChanges.length,
        changeThreshold,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          significantChangeCount: significantChanges.length,
          changeThresholdPercent: changeThreshold,
          keywords: significantChanges.slice(0, 10).map((t: any) => ({
            keyword: t.keyword ?? t.name,
            change: t.changePercent ?? t.percentChange,
          })),
        },
        evaluator: "evaluateKeywordTrend",
        description: shouldFire
          ? `${significantChanges.length}개 키워드에서 급격한 트렌드 변화가 감지되었습니다 (변화율 ≥ ${changeThreshold}%).`
          : `키워드 트렌드에 유의미한 변화가 없습니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("키워드 트렌드 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "KEYWORD_TREND_EVAL_FAILED");
    }
  }

  /**
   * 캠페인 성과 이상 징후를 확인합니다.
   */
  async evaluateCampaignAnomaly(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const performanceDropThreshold =
        (condition.performanceDropPercent as number) ?? 30;

      const campaignResult =
        await this.repositories.campaign.findByProject(projectId);
      const campaigns = campaignResult.data ?? [];

      const anomalies = campaigns.filter((c: any) => {
        // 종료일 경과 여부 또는 성과 급락 감지
        const endDate = c.endDate ? new Date(c.endDate) : null;
        const isOverdue =
          endDate && endDate < new Date() && c.status === "ACTIVE";
        const performanceDrop =
          (c.performanceChange ?? 0) < -performanceDropThreshold;
        return isOverdue || performanceDrop;
      });

      const shouldFire = anomalies.length > 0;

      this.logger.info("캠페인 이상 징후 평가 완료", {
        projectId,
        anomalyCount: anomalies.length,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          anomalyCount: anomalies.length,
          campaignIds: anomalies.map((c: any) => c.id),
          performanceDropThreshold,
        },
        evaluator: "evaluateCampaignAnomaly",
        description: shouldFire
          ? `${anomalies.length}건의 캠페인에서 이상 징후가 감지되었습니다.`
          : `캠페인 성과에 이상 징후가 없습니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("캠페인 이상 징후 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "CAMPAIGN_ANOMALY_EVAL_FAILED");
    }
  }

  /**
   * AEO 가시성 점수 하락을 확인합니다.
   */
  async evaluateGeoScoreChange(
    projectId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const minScore = (condition.minVisibilityScore as number) ?? 20;
      const dropThreshold = (condition.dropThreshold as number) ?? 10;

      const aeoSnapshots =
        await this.repositories.aeo.findLatestSnapshots(projectId);
      const lowVisibility = aeoSnapshots.filter(
        (s: any) => s.visibilityScore != null && s.visibilityScore < minScore,
      );

      // 점수 하락 감지
      const significantDrops = aeoSnapshots.filter((s: any) => {
        const change = s.scoreChange ?? s.visibilityChange ?? 0;
        return change < -dropThreshold;
      });

      const shouldFire =
        lowVisibility.length > 0 || significantDrops.length > 0;

      this.logger.info("AEO 가시성 점수 변화 평가 완료", {
        projectId,
        lowVisibilityCount: lowVisibility.length,
        significantDropCount: significantDrops.length,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          lowVisibilityCount: lowVisibility.length,
          significantDropCount: significantDrops.length,
          minScore,
          dropThreshold,
          affectedKeywords: lowVisibility.slice(0, 10).map((s: any) => ({
            keyword: s.keyword ?? s.query,
            score: s.visibilityScore,
          })),
        },
        evaluator: "evaluateGeoScoreChange",
        description: shouldFire
          ? `AEO 가시성 점수가 기준치(${minScore}) 미만이거나 급격히 하락한 키워드가 감지되었습니다.`
          : `AEO 가시성 점수가 정상 범위입니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("AEO 가시성 점수 평가 오류", {
        projectId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "GEO_SCORE_EVAL_FAILED");
    }
  }

  /**
   * 수집 파이프라인 상태를 확인합니다 (수집 실패 감지).
   */
  async evaluateCollectionHealth(
    workspaceId: string,
    condition: Record<string, unknown>,
    trace: TraceContext,
  ): Promise<ServiceResult<TriggerEvaluationResult>> {
    try {
      const failureThreshold = (condition.failureThreshold as number) ?? 3;
      const hoursLookback = (condition.hoursLookback as number) ?? 24;

      let recentJobs: any[] = [];
      try {
        recentJobs =
          (await (this.repositories as any).scheduledJob.findRecent?.(
            workspaceId,
            hoursLookback,
          )) ?? [];
      } catch {
        recentJobs = [];
      }

      const failedJobs = recentJobs.filter(
        (j: any) => j.status === "FAILED" || j.status === "ERROR",
      );
      const shouldFire = failedJobs.length >= failureThreshold;

      this.logger.info("수집 상태 평가 완료", {
        workspaceId,
        failedCount: failedJobs.length,
        failureThreshold,
        shouldFire,
        requestId: trace.requestId,
      });

      return ok({
        shouldFire,
        payload: {
          failedJobCount: failedJobs.length,
          failureThreshold,
          hoursLookback,
          failedJobIds: failedJobs.slice(0, 10).map((j: any) => j.id),
        },
        evaluator: "evaluateCollectionHealth",
        description: shouldFire
          ? `최근 ${hoursLookback}시간 내 수집 실패가 ${failedJobs.length}건 발생했습니다 (기준: ${failureThreshold}건).`
          : `수집 파이프라인이 정상 운영 중입니다.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("수집 상태 평가 오류", {
        workspaceId,
        error: message,
        requestId: trace.requestId,
      });
      return err(message, "COLLECTION_HEALTH_EVAL_FAILED");
    }
  }
}
