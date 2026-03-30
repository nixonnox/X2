/**
 * IntelligenceBackfillService
 *
 * 기존 프로젝트의 과거 intelligence 데이터를 선택적으로 소급 수집합니다.
 *
 * 핵심 원칙:
 * - 전체 자동 backfill 금지 — 반드시 범위 지정
 * - Provider quota 고려 — 일일 한도 내에서만
 * - 기존 데이터와 충돌 없이 합치기 — upsert 기반
 * - 실패/중단/재시작 가능 — 배치 단위 추적
 */

// ─── Types ──────────────────────────────────────────────────

export type BackfillScope = {
  projectId: string;
  keyword: string;
  industryType: string;
  startDate: Date;
  endDate: Date;
  provider: string; // "youtube" | "instagram" | "all"
};

export type BackfillPlan = {
  backfillId: string;
  scope: BackfillScope;
  batches: BackfillBatch[];
  totalDays: number;
  estimatedQuota: number;
  quotaAvailable: number;
  canProceed: boolean;
  warnings: string[];
};

export type BackfillBatch = {
  index: number;
  dateStart: string;
  dateEnd: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
};

export type BackfillProgress = {
  backfillId: string;
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  skippedBatches: number;
  status:
    | "planning"
    | "running"
    | "completed"
    | "partial"
    | "failed"
    | "cancelled";
  startedAt: string;
  lastUpdatedAt: string;
};

// ─── Constants ──────────────────────────────────────────────

const MAX_BACKFILL_DAYS = 90; // Retention과 일치
const BATCH_SIZE_DAYS = 7; // 7일씩 배치
const DAILY_QUOTA_RESERVE = 0.3; // 일일 쿼터의 30%만 backfill에 사용

// ─── Provider Quota Limits ──────────────────────────────────

const PROVIDER_DAILY_QUOTA: Record<string, number> = {
  youtube: 10000, // YouTube API daily quota units
  instagram: 200, // Instagram API calls/hour → ~4800/day
  tiktok: 144000, // TikTok Research API 100/min
  x: 300, // X/Twitter Basic tier
};

// ─── Service ────────────────────────────────────────────────

export class IntelligenceBackfillService {
  constructor(private readonly prisma: any) {}

  /**
   * Backfill 계획 생성 (dry-run)
   * 실제 실행 전에 범위, 배치, 쿼터를 확인합니다.
   */
  async createPlan(scope: BackfillScope): Promise<BackfillPlan> {
    const warnings: string[] = [];
    const backfillId = `bf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 1. Validate scope
    const totalDays = Math.ceil(
      (scope.endDate.getTime() - scope.startDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (totalDays > MAX_BACKFILL_DAYS) {
      warnings.push(
        `최대 ${MAX_BACKFILL_DAYS}일까지만 backfill 가능해요. 요청: ${totalDays}일`,
      );
    }

    if (totalDays <= 0) {
      warnings.push("시작일이 종료일보다 이후예요.");
      return {
        backfillId,
        scope,
        batches: [],
        totalDays: 0,
        estimatedQuota: 0,
        quotaAvailable: 0,
        canProceed: false,
        warnings,
      };
    }

    const effectiveDays = Math.min(totalDays, MAX_BACKFILL_DAYS);

    // 2. Create batches (7일 단위)
    const batches: BackfillBatch[] = [];
    let batchStart = new Date(scope.startDate);
    let index = 0;

    while (
      batchStart < scope.endDate &&
      index < Math.ceil(effectiveDays / BATCH_SIZE_DAYS)
    ) {
      const batchEnd = new Date(batchStart);
      batchEnd.setDate(batchEnd.getDate() + BATCH_SIZE_DAYS);
      if (batchEnd > scope.endDate) batchEnd.setTime(scope.endDate.getTime());

      batches.push({
        index,
        dateStart: batchStart.toISOString().split("T")[0]!,
        dateEnd: batchEnd.toISOString().split("T")[0]!,
        status: "pending",
      });

      batchStart = new Date(batchEnd);
      index++;
    }

    // 3. Check existing data (skip already filled days)
    const existingSnapshots = await this.prisma.socialMentionSnapshot.count({
      where: {
        projectId: scope.projectId,
        keyword: scope.keyword,
        date: { gte: scope.startDate, lte: scope.endDate },
      },
    });

    if (existingSnapshots > 0) {
      warnings.push(
        `이 기간에 이미 ${existingSnapshots}개의 snapshot이 있어요. 기존 데이터는 덮어쓰지 않아요.`,
      );
    }

    // 4. Estimate quota
    const quotaPerDay =
      scope.provider === "all"
        ? Object.values(PROVIDER_DAILY_QUOTA).reduce((a, b) => a + b, 0)
        : (PROVIDER_DAILY_QUOTA[scope.provider] ?? 0);
    const availableForBackfill = Math.floor(quotaPerDay * DAILY_QUOTA_RESERVE);
    const estimatedQuota = effectiveDays * 5; // ~5 API calls per day of data

    if (estimatedQuota > availableForBackfill) {
      warnings.push(
        `예상 쿼터(${estimatedQuota})가 일일 backfill 할당(${availableForBackfill})을 초과해요. 여러 날에 걸쳐 실행돼요.`,
      );
    }

    return {
      backfillId,
      scope,
      batches,
      totalDays: effectiveDays,
      estimatedQuota,
      quotaAvailable: availableForBackfill,
      canProceed:
        batches.length > 0 && !warnings.some((w) => w.includes("시작일이")),
      warnings,
    };
  }

  /**
   * 단일 배치 실행 — Worker에서 호출
   */
  async executeBatch(
    projectId: string,
    keyword: string,
    industryType: string,
    dateStart: Date,
    dateEnd: Date,
    backfillId: string,
  ): Promise<{
    status: "completed" | "skipped" | "failed";
    snapshotsCreated: number;
    reason?: string;
  }> {
    let snapshotsCreated = 0;

    // 날짜별로 순회하며 snapshot 생성
    const current = new Date(dateStart);
    while (current <= dateEnd) {
      const dateOnly = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate(),
      );

      // 이미 존재하면 skip (기존 데이터 보호)
      const existing = await this.prisma.socialMentionSnapshot.findFirst({
        where: { projectId, keyword, date: dateOnly },
      });

      if (!existing) {
        // 해당 날짜의 rawSocialMention 집계
        const mentions = await this.prisma.rawSocialMention.findMany({
          where: {
            matchedKeyword: keyword,
            publishedAt: {
              gte: dateOnly,
              lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          select: { sentiment: true },
          take: 500,
        });

        let positive = 0,
          neutral = 0,
          negative = 0,
          unclassified = 0;
        for (const m of mentions) {
          const s = (m as any).sentiment;
          if (s === "POSITIVE") positive++;
          else if (s === "NEGATIVE") negative++;
          else if (s === "NEUTRAL") neutral++;
          else unclassified++;
        }

        const totalCount = mentions.length;
        const buzzLevel =
          totalCount >= 50
            ? "HIGH"
            : totalCount >= 10
              ? "MODERATE"
              : totalCount > 0
                ? "LOW"
                : "NONE";

        await this.prisma.socialMentionSnapshot.create({
          data: {
            projectId,
            keyword,
            date: dateOnly,
            totalCount,
            buzzLevel,
            positiveCount: positive,
            neutralCount: neutral,
            negativeCount: negative,
            unclassifiedCount: unclassified,
            providerStatuses: [],
            freshness: totalCount > 0 ? "backfill" : "no_data",
          },
        });
        snapshotsCreated++;
      }

      // Also backfill benchmark snapshot if analysisRun exists for that day
      const analysisRun = await this.prisma.intelligenceAnalysisRun.findFirst({
        where: {
          projectId,
          seedKeyword: keyword,
          analyzedAt: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { analyzedAt: "desc" },
      });

      if (analysisRun?.benchmarkComparison) {
        const bench = analysisRun.benchmarkComparison as any;
        if (bench.overallScore != null) {
          await this.prisma.benchmarkSnapshot.upsert({
            where: {
              projectId_keyword_industryType_date: {
                projectId,
                keyword,
                industryType,
                date: dateOnly,
              },
            },
            update: {
              overallScore: bench.overallScore,
              comparisons: bench.comparisons ?? [],
            },
            create: {
              projectId,
              keyword,
              industryType,
              date: dateOnly,
              overallScore: bench.overallScore,
              comparisons: bench.comparisons ?? [],
            },
          });
        }
      }

      current.setDate(current.getDate() + 1);
    }

    return {
      status: snapshotsCreated > 0 ? "completed" : "skipped",
      snapshotsCreated,
      reason: snapshotsCreated === 0 ? "all_dates_already_filled" : undefined,
    };
  }
}
