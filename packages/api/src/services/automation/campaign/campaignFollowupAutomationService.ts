import { PrismaClient } from "@x2/db";
import { type ServiceResult, type Logger, ok, err } from "../../types";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CampaignSummaryItem = {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  totalBudget: number | null;
  spentBudget: number;
  daysOverdue: number;
};

type PerformanceSnapshot = {
  campaignId: string;
  date: Date;
  totalReach: number;
  totalEngagement: number;
  totalNewFollowers: number;
  spentBudget: number;
  roi: number | null;
};

type PerformanceAnomaly = {
  metric: string;
  direction: "UP" | "DOWN";
  percentage: number;
  currentValue: number;
  averageValue: number;
};

type CampaignEndResult = {
  campaignId: string;
  reportId: string | null;
  notificationsSent: number;
};

type PerformanceAlertResult = {
  campaignId: string;
  notificationId: string;
  anomaly: PerformanceAnomaly;
};

type ActiveCampaignsSummary = {
  total: number;
  overdue: CampaignSummaryItem[];
  active: CampaignSummaryItem[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ANOMALY_THRESHOLD = 0.2; // 20% 변동 감지

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class CampaignFollowupAutomationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  /**
   * endDate를 경과했지만 여전히 ACTIVE 상태인 캠페인을 스캔합니다.
   */
  async scanActiveCampaigns(
    workspaceId: string,
    executionId: string,
  ): Promise<ServiceResult<CampaignSummaryItem[]>> {
    try {
      if (!workspaceId) {
        return err("workspaceId는 필수입니다", "INVALID_INPUT");
      }

      const now = new Date();

      const overdueCampaigns = await this.prisma.campaign.findMany({
        where: {
          project: { workspaceId },
          status: "ACTIVE",
          endDate: { lt: now },
          deletedAt: null,
        },
        include: { project: true },
      });

      const result: CampaignSummaryItem[] = overdueCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        totalBudget: c.totalBudget,
        spentBudget: c.spentBudget,
        daysOverdue: c.endDate
          ? Math.floor(
              (now.getTime() - c.endDate.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0,
      }));

      this.logger.info("만료 캠페인 스캔 완료", {
        workspaceId,
        overdueCount: result.length,
        executionId,
      });

      return ok(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("캠페인 스캔 실패", { error: message, executionId });
      return err(message, "CAMPAIGN_SCAN_FAILED");
    }
  }

  /**
   * 캠페인의 최신 성과 스냅샷을 생성하고 ROI를 계산합니다.
   */
  async generatePerformanceSnapshot(
    campaignId: string,
    executionId: string,
  ): Promise<ServiceResult<PerformanceSnapshot>> {
    try {
      if (!campaignId) {
        return err("campaignId는 필수입니다", "INVALID_INPUT");
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign) {
        return err("캠페인을 찾을 수 없습니다", "CAMPAIGN_NOT_FOUND");
      }

      // 최근 메트릭 집계
      const metrics = await this.prisma.campaignMetric.findMany({
        where: { campaignId },
        orderBy: { date: "desc" },
      });

      const totalReach = metrics.reduce((sum, m) => sum + m.totalReach, 0);
      const totalEngagement = metrics.reduce(
        (sum, m) => sum + m.totalEngagement,
        0,
      );
      const totalNewFollowers = metrics.reduce(
        (sum, m) => sum + m.totalNewFollowers,
        0,
      );
      const totalSpent = metrics.reduce((sum, m) => sum + m.spentBudget, 0);

      // ROI 계산 (간단한 도달 기반 ROI)
      const roi =
        totalSpent > 0
          ? Math.round(((totalReach * 0.01 - totalSpent) / totalSpent) * 100) /
            100
          : null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 신규 CampaignMetric 생성 (당일 스냅샷)
      try {
        await this.prisma.campaignMetric.upsert({
          where: {
            campaignId_date: { campaignId, date: today },
          },
          update: {
            totalReach,
            totalEngagement,
            totalNewFollowers,
            spentBudget: totalSpent,
            derivedMetrics: { roi, snapshotType: "AUTO_GENERATED" },
          },
          create: {
            id: randomBytes(12).toString("hex"),
            campaignId,
            date: today,
            totalReach,
            totalEngagement,
            totalNewFollowers,
            spentBudget: totalSpent,
            derivedMetrics: { roi, snapshotType: "AUTO_GENERATED" },
          },
        });
      } catch {
        this.logger.warn("성과 스냅샷 메트릭 저장 실패", { campaignId });
      }

      this.logger.info("캠페인 성과 스냅샷 생성 완료", {
        campaignId,
        totalReach,
        totalEngagement,
        roi,
        executionId,
      });

      return ok({
        campaignId,
        date: today,
        totalReach,
        totalEngagement,
        totalNewFollowers,
        spentBudget: totalSpent,
        roi,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("성과 스냅샷 생성 실패", {
        error: message,
        executionId,
      });
      return err(message, "SNAPSHOT_GENERATION_FAILED");
    }
  }

  /**
   * 최근 메트릭을 캠페인 평균과 비교하여 유의미한 이상을 감지합니다 (>20% 변동).
   */
  async detectPerformanceAnomaly(
    campaignId: string,
  ): Promise<ServiceResult<PerformanceAnomaly[]>> {
    try {
      if (!campaignId) {
        return err("campaignId는 필수입니다", "INVALID_INPUT");
      }

      const metrics = await this.prisma.campaignMetric.findMany({
        where: { campaignId },
        orderBy: { date: "desc" },
      });

      if (metrics.length < 3) {
        return ok([]); // 비교할 데이터 부족
      }

      const latest = metrics[0]!;
      const previousMetrics = metrics.slice(1);

      // 각 지표의 평균 계산
      const avgReach =
        previousMetrics.reduce((s, m) => s + m.totalReach, 0) /
        previousMetrics.length;
      const avgEngagement =
        previousMetrics.reduce((s, m) => s + m.totalEngagement, 0) /
        previousMetrics.length;
      const avgFollowers =
        previousMetrics.reduce((s, m) => s + m.totalNewFollowers, 0) /
        previousMetrics.length;
      const avgSpent =
        previousMetrics.reduce((s, m) => s + m.spentBudget, 0) /
        previousMetrics.length;

      const anomalies: PerformanceAnomaly[] = [];

      const checkAnomaly = (
        metric: string,
        current: number,
        average: number,
      ) => {
        if (average === 0) return;
        const change = (current - average) / average;
        if (Math.abs(change) >= ANOMALY_THRESHOLD) {
          anomalies.push({
            metric,
            direction: change > 0 ? "UP" : "DOWN",
            percentage: Math.round(Math.abs(change) * 100),
            currentValue: current,
            averageValue: Math.round(average),
          });
        }
      };

      checkAnomaly("도달 수 (Reach)", latest.totalReach, avgReach);
      checkAnomaly(
        "참여 수 (Engagement)",
        latest.totalEngagement,
        avgEngagement,
      );
      checkAnomaly("신규 팔로워", latest.totalNewFollowers, avgFollowers);
      checkAnomaly("지출 예산", latest.spentBudget, avgSpent);

      return ok(anomalies);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("성과 이상 감지 실패", { error: message, campaignId });
      return err(message, "ANOMALY_DETECTION_FAILED");
    }
  }

  /**
   * 캠페인 종료 시 자동으로 리포트를 생성하고 팀에 알립니다.
   */
  async handleCampaignEnd(
    campaignId: string,
    executionId: string,
  ): Promise<ServiceResult<CampaignEndResult>> {
    try {
      if (!campaignId) {
        return err("campaignId는 필수입니다", "INVALID_INPUT");
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { project: true },
      });
      if (!campaign) {
        return err("캠페인을 찾을 수 없습니다", "CAMPAIGN_NOT_FOUND");
      }

      // 캠페인 상태를 COMPLETED로 변경
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: "COMPLETED" },
      });

      // 캠페인 리포트 생성
      let reportId: string | null = null;
      try {
        const report = await this.prisma.insightReport.create({
          data: {
            id: randomBytes(12).toString("hex"),
            projectId: campaign.projectId,
            type: "CAMPAIGN_REPORT",
            title: `캠페인 '${campaign.name}' 종료 리포트`,
            summary: `캠페인 '${campaign.name}'이 종료되었습니다. 자동 생성된 결과 리포트입니다.`,
            content: {
              campaignId,
              executionId,
              generatedBy: "AUTOMATION",
            },
            status: "PUBLISHED",
            confidence: 0,
          },
        });
        reportId = report.id;
      } catch {
        this.logger.warn("캠페인 종료 리포트 생성 실패", { campaignId });
      }

      // 팀 알림 전송
      const message = `\ud83d\udccb 캠페인 '${campaign.name}' 종료 \u2014 결과 리포트가 생성되었습니다`;
      let notificationsSent = 0;

      const members = await this.prisma.workspaceMember.findMany({
        where: { workspaceId: campaign.project.workspaceId },
      });

      for (const member of members) {
        try {
          await this.prisma.notification.create({
            data: {
              id: randomBytes(12).toString("hex"),
              userId: member.userId,
              workspaceId: campaign.project.workspaceId,
              type: "CAMPAIGN_UPDATE",
              title: `캠페인 종료 — ${campaign.name}`,
              message,
              priority: "NORMAL",
              sourceType: "CAMPAIGN",
              sourceId: campaignId,
              channels: ["IN_APP"],
              isRead: false,
            },
          });
          notificationsSent++;
        } catch {
          // 개별 알림 실패는 무시
        }
      }

      // 인플루언서 프로필 업데이트
      await this.updateInfluencerProfiles(campaignId);

      this.logger.info("캠페인 종료 처리 완료", {
        campaignId,
        reportId,
        notificationsSent,
        executionId,
      });

      return ok({ campaignId, reportId, notificationsSent });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("캠페인 종료 처리 실패", {
        error: message,
        executionId,
      });
      return err(message, "CAMPAIGN_END_FAILED");
    }
  }

  /**
   * 성과 이상 감지 시 알림을 생성합니다.
   */
  async handlePerformanceAlert(
    campaignId: string,
    anomaly: PerformanceAnomaly,
    executionId: string,
  ): Promise<ServiceResult<PerformanceAlertResult>> {
    try {
      if (!campaignId) {
        return err("campaignId는 필수입니다", "INVALID_INPUT");
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { project: true },
      });
      if (!campaign) {
        return err("캠페인을 찾을 수 없습니다", "CAMPAIGN_NOT_FOUND");
      }

      const directionLabel = anomaly.direction === "UP" ? "상승" : "하락";
      const message = `\ud83d\udcc8 캠페인 '${campaign.name}' 성과 이상 감지: ${anomaly.metric} ${directionLabel} ${anomaly.percentage}%`;

      const members = await this.prisma.workspaceMember.findMany({
        where: {
          workspaceId: campaign.project.workspaceId,
          role: { in: ["OWNER", "ADMIN"] },
        },
      });

      let notificationId = "";
      for (const member of members) {
        try {
          const nId = randomBytes(12).toString("hex");
          await this.prisma.notification.create({
            data: {
              id: nId,
              userId: member.userId,
              workspaceId: campaign.project.workspaceId,
              type: "CAMPAIGN_UPDATE",
              title: `캠페인 성과 이상 — ${campaign.name}`,
              message,
              priority: anomaly.percentage > 50 ? "HIGH" : "NORMAL",
              sourceType: "CAMPAIGN",
              sourceId: campaignId,
              channels: ["IN_APP"],
              isRead: false,
            },
          });
          if (!notificationId) notificationId = nId;
        } catch {
          // 개별 알림 실패는 무시
        }
      }

      this.logger.info("캠페인 성과 이상 알림 전송 완료", {
        campaignId,
        metric: anomaly.metric,
        direction: anomaly.direction,
        percentage: anomaly.percentage,
        executionId,
      });

      return ok({ campaignId, notificationId, anomaly });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("캠페인 성과 알림 실패", {
        error: message,
        executionId,
      });
      return err(message, "PERFORMANCE_ALERT_FAILED");
    }
  }

  /**
   * 캠페인 종료 후 참여 인플루언서의 프로필 통계를 업데이트합니다.
   */
  async updateInfluencerProfiles(
    campaignId: string,
  ): Promise<ServiceResult<{ updated: number }>> {
    try {
      const creators = await this.prisma.campaignCreator.findMany({
        where: { campaignId, influencerProfileId: { not: null } },
      });

      let updated = 0;

      for (const creator of creators) {
        if (!creator.influencerProfileId) continue;

        try {
          // 해당 인플루언서의 전체 캠페인 수 집계
          const totalCampaigns = await this.prisma.campaignCreator.count({
            where: { influencerProfileId: creator.influencerProfileId },
          });

          // 완료된 캠페인의 ROI 평균 계산
          const completedCampaigns = await this.prisma.campaignCreator.findMany(
            {
              where: {
                influencerProfileId: creator.influencerProfileId,
                campaign: { status: "COMPLETED" },
              },
              include: {
                campaign: {
                  include: { metrics: true },
                },
              },
            },
          );

          let totalRoi = 0;
          let roiCount = 0;

          for (const cc of completedCampaigns) {
            const campaignMetrics = cc.campaign.metrics;
            const totalReach = campaignMetrics.reduce(
              (s, m) => s + m.totalReach,
              0,
            );
            const totalSpent = campaignMetrics.reduce(
              (s, m) => s + m.spentBudget,
              0,
            );

            if (totalSpent > 0) {
              totalRoi += (totalReach * 0.01 - totalSpent) / totalSpent;
              roiCount++;
            }
          }

          const avgCampaignRoi =
            roiCount > 0 ? Math.round((totalRoi / roiCount) * 100) / 100 : null;

          await this.prisma.influencerProfile.update({
            where: { id: creator.influencerProfileId },
            data: {
              totalCampaigns,
              avgCampaignRoi,
            },
          });

          updated++;
        } catch {
          this.logger.warn("인플루언서 프로필 업데이트 실패", {
            influencerProfileId: creator.influencerProfileId,
          });
        }
      }

      this.logger.info("인플루언서 프로필 업데이트 완료", {
        campaignId,
        updated,
      });

      return ok({ updated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("인플루언서 프로필 업데이트 실패", {
        error: message,
        campaignId,
      });
      return err(message, "INFLUENCER_UPDATE_FAILED");
    }
  }

  /**
   * 워크스페이스의 활성 캠페인 요약을 반환합니다.
   */
  async getActiveCampaignsSummary(
    workspaceId: string,
  ): Promise<ServiceResult<ActiveCampaignsSummary>> {
    try {
      if (!workspaceId) {
        return err("workspaceId는 필수입니다", "INVALID_INPUT");
      }

      const now = new Date();

      const campaigns = await this.prisma.campaign.findMany({
        where: {
          project: { workspaceId },
          status: "ACTIVE",
          deletedAt: null,
        },
      });

      const overdue: CampaignSummaryItem[] = [];
      const active: CampaignSummaryItem[] = [];

      for (const c of campaigns) {
        const item: CampaignSummaryItem = {
          id: c.id,
          name: c.name,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          totalBudget: c.totalBudget,
          spentBudget: c.spentBudget,
          daysOverdue:
            c.endDate && c.endDate < now
              ? Math.floor(
                  (now.getTime() - c.endDate.getTime()) / (1000 * 60 * 60 * 24),
                )
              : 0,
        };

        if (c.endDate && c.endDate < now) {
          overdue.push(item);
        } else {
          active.push(item);
        }
      }

      return ok({
        total: campaigns.length,
        overdue,
        active,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 오류";
      this.logger.error("활성 캠페인 요약 조회 실패", {
        error: message,
        workspaceId,
      });
      return err(message, "CAMPAIGN_SUMMARY_FAILED");
    }
  }
}
