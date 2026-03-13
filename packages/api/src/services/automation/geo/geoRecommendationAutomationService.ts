import { PrismaClient } from "@x2/db";
import { type ServiceResult, type Logger, ok, err } from "../../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OptimizationGap = {
  keywordId: string;
  keyword: string;
  gapType: "LOW_VISIBILITY" | "NO_CITATION" | "STRUCTURE_ISSUE";
  currentScore?: number;
  details: string;
};

type ScanResult = {
  scanned: number;
  lowVisibility: number;
  noCitation: number;
  answerabilityGaps: number;
  actionsCreated: number;
};

type LowCitationSource = {
  id: string;
  url: string;
  title: string;
  currentCitationCount: number;
  targetKeywords: string[];
};

type AnswerabilityGap = {
  keywordId: string;
  keyword: string;
  snapshotCount: number;
  brandMentionedCount: number;
};

type OptimizationProgress = {
  keywordId: string;
  keyword: string;
  previousScore: number | null;
  currentScore: number | null;
  delta: number;
  improving: boolean;
};

type GeoHealthSummary = {
  totalKeywords: number;
  activeKeywords: number;
  avgVisibilityScore: number;
  brandMentionRate: number;
  lowVisibilityCount: number;
  noCitationSourceCount: number;
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GeoRecommendationAutomationService {
  /** 가시성 점수 임계값 — 이 점수 미만이면 최적화 필요 */
  private static readonly LOW_VISIBILITY_THRESHOLD = 30;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  /**
   * 프로젝트의 AEO 키워드를 스캔하여 최적화가 필요한 항목을 식별합니다.
   */
  async scanForOptimizationNeeds(
    workspaceId: string,
    projectId: string,
    executionId: string,
  ): Promise<ServiceResult<ScanResult>> {
    try {
      if (!workspaceId || !projectId) {
        return err("workspaceId와 projectId는 필수입니다", "INVALID_INPUT");
      }

      const project = await this.prisma.project.findFirst({
        where: { id: projectId, workspace: { id: workspaceId } },
      });
      if (!project) {
        return err("프로젝트를 찾을 수 없습니다", "PROJECT_NOT_FOUND");
      }

      // 활성 키워드 조회
      const keywords = await this.prisma.aeoKeyword.findMany({
        where: { projectId, status: "ACTIVE" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      });

      const gaps: OptimizationGap[] = [];

      // 1. 가시성 점수 낮은 키워드 식별
      for (const kw of keywords) {
        const latestSnapshot = kw.snapshots[0];
        if (
          latestSnapshot &&
          latestSnapshot.visibilityScore !== null &&
          latestSnapshot.visibilityScore <
            GeoRecommendationAutomationService.LOW_VISIBILITY_THRESHOLD
        ) {
          gaps.push({
            keywordId: kw.id,
            keyword: kw.keyword,
            gapType: "LOW_VISIBILITY",
            currentScore: latestSnapshot.visibilityScore,
            details: `가시성 점수 ${latestSnapshot.visibilityScore}/100 — 최적화 필요`,
          });
        }
      }

      // 2. 인용 소스 미등록 키워드
      const lowCitationResult =
        await this.identifyLowCitationSources(projectId);
      const noCitationCount = lowCitationResult.success
        ? lowCitationResult.data.length
        : 0;

      // 3. 브랜드 언급 없는 키워드 (응답성 갭)
      const answerabilityResult =
        await this.identifyAnswerabilityGaps(projectId);
      const answerabilityGaps = answerabilityResult.success
        ? answerabilityResult.data
        : [];

      for (const gap of answerabilityGaps) {
        gaps.push({
          keywordId: gap.keywordId,
          keyword: gap.keyword,
          gapType: "STRUCTURE_ISSUE",
          details: `브랜드 언급률 0% — FAQ 구조 전환 권고`,
        });
      }

      // 4. 최적화 액션 생성
      const actionResult = await this.generateOptimizationActions(
        projectId,
        gaps,
        executionId,
      );
      const actionsCreated = actionResult.success
        ? actionResult.data.created
        : 0;

      this.logger.info("GEO 최적화 스캔 완료", {
        projectId,
        scanned: keywords.length,
        lowVisibility: gaps.filter((g) => g.gapType === "LOW_VISIBILITY")
          .length,
        noCitation: noCitationCount,
        answerabilityGaps: answerabilityGaps.length,
        actionsCreated,
        executionId,
      });

      return ok({
        scanned: keywords.length,
        lowVisibility: gaps.filter((g) => g.gapType === "LOW_VISIBILITY")
          .length,
        noCitation: noCitationCount,
        answerabilityGaps: answerabilityGaps.length,
        actionsCreated,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("GEO 최적화 스캔 실패", {
        error: message,
        executionId,
      });
      return err(message, "GEO_SCAN_FAILED");
    }
  }

  /**
   * 인용 횟수가 0이거나 감소하는 CitationReadyReportSource를 식별합니다.
   */
  async identifyLowCitationSources(
    projectId: string,
  ): Promise<ServiceResult<LowCitationSource[]>> {
    try {
      const sources = await this.prisma.citationReadyReportSource.findMany({
        where: {
          projectId,
          isActive: true,
          currentCitationCount: 0,
        },
      });

      const result: LowCitationSource[] = sources.map((s) => ({
        id: s.id,
        url: s.url,
        title: s.title,
        currentCitationCount: s.currentCitationCount,
        targetKeywords: s.targetKeywords,
      }));

      return ok(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("인용 소스 분석 실패", { error: message, projectId });
      return err(message, "CITATION_ANALYSIS_FAILED");
    }
  }

  /**
   * brandMentioned가 일관되게 false인 AeoKeyword를 식별합니다.
   */
  async identifyAnswerabilityGaps(
    projectId: string,
  ): Promise<ServiceResult<AnswerabilityGap[]>> {
    try {
      const keywords = await this.prisma.aeoKeyword.findMany({
        where: { projectId, status: "ACTIVE" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 5,
          },
        },
      });

      const gaps: AnswerabilityGap[] = [];

      for (const kw of keywords) {
        if (kw.snapshots.length === 0) continue;

        const mentionedCount = kw.snapshots.filter(
          (s) => s.brandMentioned,
        ).length;

        // 모든 최근 스냅샷에서 브랜드 언급이 없는 경우
        if (mentionedCount === 0 && kw.snapshots.length >= 2) {
          gaps.push({
            keywordId: kw.id,
            keyword: kw.keyword,
            snapshotCount: kw.snapshots.length,
            brandMentionedCount: 0,
          });
        }
      }

      return ok(gaps);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("응답성 갭 분석 실패", { error: message, projectId });
      return err(message, "ANSWERABILITY_ANALYSIS_FAILED");
    }
  }

  /**
   * 식별된 갭에 대해 InsightAction 항목을 생성합니다.
   */
  async generateOptimizationActions(
    projectId: string,
    gaps: OptimizationGap[],
    executionId: string,
  ): Promise<ServiceResult<{ created: number }>> {
    try {
      let created = 0;

      for (const gap of gaps) {
        let title: string;
        let description: string;
        let actionType: string;

        switch (gap.gapType) {
          case "LOW_VISIBILITY":
            title = `AI 검색 최적화: ${gap.keyword} \u2014 현재 가시성 점수 ${gap.currentScore ?? 0}/100`;
            description = `키워드 '${gap.keyword}'의 AI 검색 가시성이 낮습니다. 콘텐츠 구조 개선 및 FAQ 형태의 정보 제공을 권고합니다.`;
            actionType = "SEO_UPDATE";
            break;
          case "NO_CITATION":
            title = `인용 소스 등록 필요: ${gap.keyword} \u2014 경쟁사만 인용되고 있습니다`;
            description = `키워드 '${gap.keyword}'에 대해 경쟁사 콘텐츠만 인용되고 있습니다. 자사 콘텐츠의 인용 소스 등록이 필요합니다.`;
            actionType = "CONTENT_OPTIMIZE";
            break;
          case "STRUCTURE_ISSUE":
            title = `FAQ 구조 전환 권고: ${gap.keyword}`;
            description = `키워드 '${gap.keyword}'에 대한 AI 검색 응답에서 브랜드가 언급되지 않습니다. FAQ 구조로 콘텐츠를 재구성하여 가시성을 높일 것을 권고합니다.`;
            actionType = "CONTENT_OPTIMIZE";
            break;
          default:
            continue;
        }

        try {
          await this.prisma.insightAction.create({
            data: {
              id: randomBytes(12).toString("hex"),
              title,
              description,
              actionType: actionType as any,
              priority:
                gap.gapType === "LOW_VISIBILITY" && (gap.currentScore ?? 0) < 10
                  ? "HIGH"
                  : "MEDIUM",
              status: "PENDING",
              sourceModule: "GEO_AEO",
              sourceEntityId: gap.keywordId,
              sourceReason: gap.details,
            },
          });
          created++;
        } catch (createError) {
          this.logger.warn("최적화 액션 생성 실패", {
            keywordId: gap.keywordId,
            error:
              createError instanceof Error ? createError.message : "unknown",
          });
        }
      }

      this.logger.info("최적화 액션 생성 완료", {
        projectId,
        created,
        totalGaps: gaps.length,
        executionId,
      });

      return ok({ created });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("최적화 액션 생성 실패", {
        error: message,
        executionId,
      });
      return err(message, "ACTION_GENERATION_FAILED");
    }
  }

  /**
   * 최근 AeoSnapshot을 비교하여 최적화 진행 상황을 추적합니다.
   */
  async trackOptimizationProgress(
    projectId: string,
  ): Promise<ServiceResult<OptimizationProgress[]>> {
    try {
      const keywords = await this.prisma.aeoKeyword.findMany({
        where: { projectId, status: "ACTIVE" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 2,
          },
        },
      });

      const progress: OptimizationProgress[] = [];

      for (const kw of keywords) {
        if (kw.snapshots.length < 2) continue;

        const current = kw.snapshots[0]!;
        const previous = kw.snapshots[1]!;

        const currentScore = current.visibilityScore;
        const previousScore = previous.visibilityScore;

        if (currentScore === null || previousScore === null) continue;

        const delta = currentScore - previousScore;

        progress.push({
          keywordId: kw.id,
          keyword: kw.keyword,
          previousScore,
          currentScore,
          delta,
          improving: delta > 0,
        });
      }

      return ok(progress);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("최적화 진행 상황 추적 실패", {
        error: message,
        projectId,
      });
      return err(message, "PROGRESS_TRACKING_FAILED");
    }
  }

  /**
   * 프로젝트의 전반적인 GEO 건강 지표를 반환합니다.
   */
  async getGeoHealthSummary(
    projectId: string,
  ): Promise<ServiceResult<GeoHealthSummary>> {
    try {
      const allKeywords = await this.prisma.aeoKeyword.findMany({
        where: { projectId },
      });

      const activeKeywords = await this.prisma.aeoKeyword.findMany({
        where: { projectId, status: "ACTIVE" },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      });

      // 평균 가시성 점수 계산
      let totalScore = 0;
      let scoreCount = 0;
      let brandMentionedCount = 0;
      let lowVisibilityCount = 0;

      for (const kw of activeKeywords) {
        const snapshot = kw.snapshots[0];
        if (!snapshot) continue;

        if (snapshot.visibilityScore !== null) {
          totalScore += snapshot.visibilityScore;
          scoreCount++;
          if (
            snapshot.visibilityScore <
            GeoRecommendationAutomationService.LOW_VISIBILITY_THRESHOLD
          ) {
            lowVisibilityCount++;
          }
        }

        if (snapshot.brandMentioned) {
          brandMentionedCount++;
        }
      }

      const avgVisibilityScore = scoreCount > 0 ? totalScore / scoreCount : 0;
      const brandMentionRate =
        activeKeywords.length > 0
          ? brandMentionedCount / activeKeywords.length
          : 0;

      // 인용 소스 미등록 수
      const noCitationSourceCount =
        await this.prisma.citationReadyReportSource.count({
          where: { projectId, isActive: true, currentCitationCount: 0 },
        });

      return ok({
        totalKeywords: allKeywords.length,
        activeKeywords: activeKeywords.length,
        avgVisibilityScore: Math.round(avgVisibilityScore * 100) / 100,
        brandMentionRate: Math.round(brandMentionRate * 100) / 100,
        lowVisibilityCount,
        noCitationSourceCount,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("GEO 건강 요약 조회 실패", {
        error: message,
        projectId,
      });
      return err(message, "GEO_HEALTH_SUMMARY_FAILED");
    }
  }
}
