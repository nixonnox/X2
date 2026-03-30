/**
 * IntelligenceRetentionPolicyService
 *
 * Intelligence 데이터의 수명 주기를 관리합니다.
 * - 90일 이상 된 데이터를 정리 (hard delete)
 * - 키워드별 최소 보존 (최신 N건 보호)
 * - compare/history 안전성 검증
 * - dry-run 지원
 * - 삭제 감사 로그
 */

// ─── Types ──────────────────────────────────────────────────

export type RetentionConfig = {
  /** 보존 일수 (기본 90일) */
  retentionDays: number;
  /** 키워드별 최소 보존 분석 run 수 (기본 3건) */
  minRunsPerKeyword: number;
  /** 키워드별 최소 보존 snapshot 수 (기본 7건) */
  minSnapshotsPerKeyword: number;
  /** dry-run 모드 (삭제하지 않고 대상만 보고) */
  dryRun: boolean;
};

export type CleanupTarget = {
  table: string;
  totalEligible: number;
  protected: number;
  toDelete: number;
  oldestDate: string | null;
  newestDeleteDate: string | null;
};

export type CleanupResult = {
  config: RetentionConfig;
  targets: CleanupTarget[];
  totalDeleted: number;
  totalProtected: number;
  dryRun: boolean;
  durationMs: number;
  executedAt: string;
};

// ─── Default Config ─────────────────────────────────────────

const DEFAULT_CONFIG: RetentionConfig = {
  retentionDays: 90,
  minRunsPerKeyword: 3,
  minSnapshotsPerKeyword: 7,
  dryRun: false,
};

// ─── Service ────────────────────────────────────────────────

export class IntelligenceRetentionPolicyService {
  constructor(private readonly prisma: any) {}

  /**
   * 전체 retention cleanup 실행
   */
  async executeCleanup(
    config: Partial<RetentionConfig> = {},
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cfg.retentionDays);

    const targets: CleanupTarget[] = [];

    // 1. IntelligenceAnalysisRun
    targets.push(await this.cleanupAnalysisRuns(cutoffDate, cfg));

    // 2. IntelligenceComparisonRun
    targets.push(await this.cleanupComparisonRuns(cutoffDate, cfg));

    // 3. SocialMentionSnapshot
    targets.push(await this.cleanupSocialSnapshots(cutoffDate, cfg));

    // 4. BenchmarkSnapshot
    targets.push(await this.cleanupBenchmarkSnapshots(cutoffDate, cfg));

    // 5. RawSocialMention (가장 큰 테이블)
    targets.push(await this.cleanupRawMentions(cutoffDate, cfg));

    const totalDeleted = targets.reduce((sum, t) => sum + t.toDelete, 0);
    const totalProtected = targets.reduce((sum, t) => sum + t.protected, 0);

    const result: CleanupResult = {
      config: cfg,
      targets,
      totalDeleted,
      totalProtected,
      dryRun: cfg.dryRun,
      durationMs: Date.now() - startTime,
      executedAt: new Date().toISOString(),
    };

    // Log audit
    console.log(
      `[Retention] ${cfg.dryRun ? "DRY-RUN" : "EXECUTED"}: deleted=${totalDeleted}, protected=${totalProtected}, duration=${result.durationMs}ms`,
    );

    return result;
  }

  // ─── Analysis Runs ──────────────────────────────────────────

  private async cleanupAnalysisRuns(
    cutoff: Date,
    cfg: RetentionConfig,
  ): Promise<CleanupTarget> {
    // Find all eligible runs
    const eligible = await this.prisma.intelligenceAnalysisRun.findMany({
      where: { analyzedAt: { lt: cutoff } },
      select: {
        id: true,
        projectId: true,
        seedKeyword: true,
        analyzedAt: true,
      },
      orderBy: { analyzedAt: "asc" },
    });

    // Protect: keep at least minRunsPerKeyword per project+keyword
    const protectedIds = new Set<string>();
    const keywordGroups = new Map<string, typeof eligible>();

    for (const run of eligible) {
      const key = `${run.projectId}:${run.seedKeyword}`;
      if (!keywordGroups.has(key)) keywordGroups.set(key, []);
      keywordGroups.get(key)!.push(run);
    }

    // For each keyword, also count recent (non-eligible) runs
    for (const [key, runs] of keywordGroups) {
      const [projectId, seedKeyword] = key.split(":");
      const recentCount = await this.prisma.intelligenceAnalysisRun.count({
        where: {
          projectId,
          seedKeyword,
          analyzedAt: { gte: cutoff },
        },
      });

      // If recent + eligible < min, protect enough from eligible
      const totalNeeded = cfg.minRunsPerKeyword - recentCount;
      if (totalNeeded > 0) {
        // Protect the most recent N from eligible (they're sorted asc, so take from end)
        const toProtect = runs.slice(-totalNeeded);
        for (const r of toProtect) protectedIds.add(r.id);
      }
    }

    const toDelete = eligible.filter((r: any) => !protectedIds.has(r.id));

    if (!cfg.dryRun && toDelete.length > 0) {
      await this.prisma.intelligenceAnalysisRun.deleteMany({
        where: { id: { in: toDelete.map((r: any) => r.id) } },
      });
    }

    return {
      table: "intelligence_analysis_runs",
      totalEligible: eligible.length,
      protected: protectedIds.size,
      toDelete: toDelete.length,
      oldestDate: eligible[0]?.analyzedAt?.toISOString() ?? null,
      newestDeleteDate:
        toDelete[toDelete.length - 1]?.analyzedAt?.toISOString() ?? null,
    };
  }

  // ─── Comparison Runs ────────────────────────────────────────

  private async cleanupComparisonRuns(
    cutoff: Date,
    cfg: RetentionConfig,
  ): Promise<CleanupTarget> {
    const eligible = await this.prisma.intelligenceComparisonRun.count({
      where: { analyzedAt: { lt: cutoff } },
    });

    if (!cfg.dryRun && eligible > 0) {
      await this.prisma.intelligenceComparisonRun.deleteMany({
        where: { analyzedAt: { lt: cutoff } },
      });
    }

    return {
      table: "intelligence_comparison_runs",
      totalEligible: eligible,
      protected: 0, // Comparison runs have no minimum retention
      toDelete: eligible,
      oldestDate: null,
      newestDeleteDate: null,
    };
  }

  // ─── Social Mention Snapshots ───────────────────────────────

  private async cleanupSocialSnapshots(
    cutoff: Date,
    cfg: RetentionConfig,
  ): Promise<CleanupTarget> {
    const eligible = await this.prisma.socialMentionSnapshot.findMany({
      where: { date: { lt: cutoff } },
      select: { id: true, projectId: true, keyword: true, date: true },
      orderBy: { date: "asc" },
    });

    // Protect: keep minSnapshotsPerKeyword per project+keyword
    const protectedIds = new Set<string>();
    const groups = new Map<string, typeof eligible>();

    for (const snap of eligible) {
      const key = `${snap.projectId}:${snap.keyword}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(snap);
    }

    for (const [key, snaps] of groups) {
      const [projectId, keyword] = key.split(":");
      const recentCount = await this.prisma.socialMentionSnapshot.count({
        where: { projectId, keyword, date: { gte: cutoff } },
      });

      const totalNeeded = cfg.minSnapshotsPerKeyword - recentCount;
      if (totalNeeded > 0) {
        const toProtect = snaps.slice(-totalNeeded);
        for (const s of toProtect) protectedIds.add(s.id);
      }
    }

    const toDelete = eligible.filter((s: any) => !protectedIds.has(s.id));

    if (!cfg.dryRun && toDelete.length > 0) {
      await this.prisma.socialMentionSnapshot.deleteMany({
        where: { id: { in: toDelete.map((s: any) => s.id) } },
      });
    }

    return {
      table: "social_mention_snapshots",
      totalEligible: eligible.length,
      protected: protectedIds.size,
      toDelete: toDelete.length,
      oldestDate: eligible[0]?.date?.toISOString() ?? null,
      newestDeleteDate:
        toDelete[toDelete.length - 1]?.date?.toISOString() ?? null,
    };
  }

  // ─── Benchmark Snapshots ────────────────────────────────────

  private async cleanupBenchmarkSnapshots(
    cutoff: Date,
    cfg: RetentionConfig,
  ): Promise<CleanupTarget> {
    const eligible = await this.prisma.benchmarkSnapshot.findMany({
      where: { date: { lt: cutoff } },
      select: { id: true, projectId: true, keyword: true, date: true },
      orderBy: { date: "asc" },
    });

    const protectedIds = new Set<string>();
    const groups = new Map<string, typeof eligible>();

    for (const snap of eligible) {
      const key = `${snap.projectId}:${snap.keyword}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(snap);
    }

    for (const [key, snaps] of groups) {
      const [projectId, keyword] = key.split(":");
      const recentCount = await this.prisma.benchmarkSnapshot.count({
        where: { projectId, keyword, date: { gte: cutoff } },
      });

      const totalNeeded = cfg.minSnapshotsPerKeyword - recentCount;
      if (totalNeeded > 0) {
        const toProtect = snaps.slice(-totalNeeded);
        for (const s of toProtect) protectedIds.add(s.id);
      }
    }

    const toDelete = eligible.filter((s: any) => !protectedIds.has(s.id));

    if (!cfg.dryRun && toDelete.length > 0) {
      await this.prisma.benchmarkSnapshot.deleteMany({
        where: { id: { in: toDelete.map((s: any) => s.id) } },
      });
    }

    return {
      table: "benchmark_snapshots",
      totalEligible: eligible.length,
      protected: protectedIds.size,
      toDelete: toDelete.length,
      oldestDate: eligible[0]?.date?.toISOString() ?? null,
      newestDeleteDate:
        toDelete[toDelete.length - 1]?.date?.toISOString() ?? null,
    };
  }

  // ─── Raw Social Mentions ────────────────────────────────────

  private async cleanupRawMentions(
    cutoff: Date,
    cfg: RetentionConfig,
  ): Promise<CleanupTarget> {
    // Raw mentions are the largest table — no per-keyword protection needed
    const eligible = await this.prisma.rawSocialMention.count({
      where: { createdAt: { lt: cutoff } },
    });

    if (!cfg.dryRun && eligible > 0) {
      // Delete in batches to avoid long-running transactions
      let deleted = 0;
      const BATCH = 1000;
      while (deleted < eligible) {
        const batch = await this.prisma.rawSocialMention.findMany({
          where: { createdAt: { lt: cutoff } },
          select: { id: true },
          take: BATCH,
        });
        if (batch.length === 0) break;
        await this.prisma.rawSocialMention.deleteMany({
          where: { id: { in: batch.map((r: any) => r.id) } },
        });
        deleted += batch.length;
      }
    }

    return {
      table: "raw_social_mentions",
      totalEligible: eligible,
      protected: 0,
      toDelete: eligible,
      oldestDate: null,
      newestDeleteDate: null,
    };
  }
}
