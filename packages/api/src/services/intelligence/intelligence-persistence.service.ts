/**
 * IntelligencePersistenceService
 *
 * Intelligence 분석 결과를 DB에 저장/조회/비교하는 핵심 서비스.
 * - 분석 결과 저장 (IntelligenceAnalysisRun)
 * - 비교 결과 저장 (IntelligenceComparisonRun)
 * - 소셜 멘션 스냅샷 저장 (SocialMentionSnapshot)
 * - 벤치마크 스냅샷 저장 (BenchmarkSnapshot)
 * - 이력 조회
 * - 기간 비교 데이터 로드
 */

// Use any for PrismaClient to avoid Prisma generation dependency
// In production, this receives the actual Prisma instance from ctx.db

// ─── Types ───────────────────────────────────────────────────────

export type SaveAnalysisRunInput = {
  projectId: string;
  seedKeyword: string;
  industryType: string;
  industryLabel: string;
  signalQuality: Record<string, unknown>;
  fusionResult: Record<string, unknown>;
  taxonomyMapping?: Record<string, unknown> | null;
  benchmarkComparison?: Record<string, unknown> | null;
  benchmarkBaseline?: unknown[] | null;
  socialIntegration?: Record<string, unknown> | null;
  additionalInsights?: unknown[] | null;
  additionalWarnings?: string[] | null;
  additionalEvidence?: unknown[] | null;
  confidence: number;
  freshness: string;
  isPartial: boolean;
  isMockOnly: boolean;
  isStaleBased: boolean;
  providerCoverage?: Record<string, unknown> | null;
  socialMentionSnapshot?: Record<string, unknown> | null;
};

export type SaveComparisonRunInput = {
  projectId: string;
  comparisonType: string;
  leftLabel: string;
  leftKeyword: string;
  leftIndustry: string;
  leftRunId?: string;
  rightLabel: string;
  rightKeyword: string;
  rightIndustry: string;
  rightRunId?: string;
  comparisonResult: Record<string, unknown>;
  overallDifferenceScore: number;
  leftPeriodStart?: Date;
  leftPeriodEnd?: Date;
  rightPeriodStart?: Date;
  rightPeriodEnd?: Date;
};

export type SaveSocialSnapshotInput = {
  projectId: string;
  keyword: string;
  date: Date;
  totalCount: number;
  buzzLevel: string;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  unclassifiedCount: number;
  providerStatuses: unknown[];
  topicSignals?: unknown[];
  sampleMentions?: unknown[];
  freshness: string;
};

export type SaveBenchmarkSnapshotInput = {
  projectId: string;
  keyword: string;
  industryType: string;
  date: Date;
  overallScore: number;
  comparisons: unknown[];
  highlights?: string[];
  warnings?: string[];
};

export type AnalysisHistoryItem = {
  id: string;
  seedKeyword: string;
  industryType: string;
  industryLabel: string;
  confidence: number;
  freshness: string;
  isPartial: boolean;
  isMockOnly: boolean;
  signalQuality: unknown;
  benchmarkComparison: unknown;
  analyzedAt: Date;
};

export type PeriodComparisonData = {
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  runs: Array<{
    id: string;
    analyzedAt: Date;
    fusionResult: unknown;
    signalQuality: unknown;
    confidence: number;
  }>;
  socialSnapshots: Array<{
    date: Date;
    totalCount: number;
    buzzLevel: string;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
    unclassifiedCount: number;
  }>;
  benchmarkSnapshots: Array<{
    date: Date;
    overallScore: number;
    comparisons: unknown;
  }>;
};

// ─── Service ─────────────────────────────────────────────────────

export class IntelligencePersistenceService {
  private readonly prisma: any;

  constructor(prisma: any) {
    this.prisma = prisma;
  }

  // ─── Analysis Run ──────────────────────────────────────────────

  async saveAnalysisRun(input: SaveAnalysisRunInput): Promise<string> {
    const run = await this.prisma.intelligenceAnalysisRun.create({
      data: {
        projectId: input.projectId,
        seedKeyword: input.seedKeyword,
        industryType: input.industryType,
        industryLabel: input.industryLabel,
        signalQuality: input.signalQuality as any,
        fusionResult: input.fusionResult as any,
        taxonomyMapping: (input.taxonomyMapping as any) ?? undefined,
        benchmarkComparison: (input.benchmarkComparison as any) ?? undefined,
        benchmarkBaseline: (input.benchmarkBaseline as any) ?? undefined,
        socialIntegration: (input.socialIntegration as any) ?? undefined,
        additionalInsights: (input.additionalInsights as any) ?? undefined,
        additionalWarnings: (input.additionalWarnings as any) ?? undefined,
        additionalEvidence: (input.additionalEvidence as any) ?? undefined,
        confidence: input.confidence,
        freshness: input.freshness,
        isPartial: input.isPartial,
        isMockOnly: input.isMockOnly,
        isStaleBased: input.isStaleBased,
        providerCoverage: (input.providerCoverage as any) ?? undefined,
        socialMentionSnapshot:
          (input.socialMentionSnapshot as any) ?? undefined,
      },
    });
    return run.id;
  }

  async getAnalysisRun(id: string) {
    return this.prisma.intelligenceAnalysisRun.findUnique({ where: { id } });
  }

  async getAnalysisHistory(
    projectId: string,
    options?: {
      seedKeyword?: string;
      industryType?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<AnalysisHistoryItem[]> {
    const runs = await this.prisma.intelligenceAnalysisRun.findMany({
      where: {
        projectId,
        ...(options?.seedKeyword ? { seedKeyword: options.seedKeyword } : {}),
        ...(options?.industryType
          ? { industryType: options.industryType }
          : {}),
      },
      orderBy: { analyzedAt: "desc" },
      take: options?.limit ?? 20,
      skip: options?.offset ?? 0,
      select: {
        id: true,
        seedKeyword: true,
        industryType: true,
        industryLabel: true,
        confidence: true,
        freshness: true,
        isPartial: true,
        isMockOnly: true,
        signalQuality: true,
        benchmarkComparison: true,
        analyzedAt: true,
      },
    });

    return runs;
  }

  async getLatestRun(
    projectId: string,
    seedKeyword: string,
    industryType?: string,
  ) {
    return this.prisma.intelligenceAnalysisRun.findFirst({
      where: {
        projectId,
        seedKeyword,
        ...(industryType ? { industryType } : {}),
      },
      orderBy: { analyzedAt: "desc" },
    });
  }

  async getRunsForPeriod(
    projectId: string,
    seedKeyword: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.intelligenceAnalysisRun.findMany({
      where: {
        projectId,
        seedKeyword,
        analyzedAt: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { analyzedAt: "desc" },
    });
  }

  // ─── Comparison Run ────────────────────────────────────────────

  async saveComparisonRun(input: SaveComparisonRunInput): Promise<string> {
    const run = await this.prisma.intelligenceComparisonRun.create({
      data: {
        projectId: input.projectId,
        comparisonType: input.comparisonType,
        leftLabel: input.leftLabel,
        leftKeyword: input.leftKeyword,
        leftIndustry: input.leftIndustry,
        leftRunId: input.leftRunId,
        rightLabel: input.rightLabel,
        rightKeyword: input.rightKeyword,
        rightIndustry: input.rightIndustry,
        rightRunId: input.rightRunId,
        comparisonResult: input.comparisonResult as any,
        overallDifferenceScore: input.overallDifferenceScore,
        leftPeriodStart: input.leftPeriodStart,
        leftPeriodEnd: input.leftPeriodEnd,
        rightPeriodStart: input.rightPeriodStart,
        rightPeriodEnd: input.rightPeriodEnd,
      },
    });
    return run.id;
  }

  async getComparisonHistory(projectId: string, limit = 10) {
    return this.prisma.intelligenceComparisonRun.findMany({
      where: { projectId },
      orderBy: { analyzedAt: "desc" },
      take: limit,
    });
  }

  // ─── Social Mention Snapshot ───────────────────────────────────

  async saveSocialSnapshot(input: SaveSocialSnapshotInput): Promise<string> {
    const snapshot = await this.prisma.socialMentionSnapshot.upsert({
      where: {
        projectId_keyword_date: {
          projectId: input.projectId,
          keyword: input.keyword,
          date: input.date,
        },
      },
      update: {
        totalCount: input.totalCount,
        buzzLevel: input.buzzLevel,
        positiveCount: input.positiveCount,
        neutralCount: input.neutralCount,
        negativeCount: input.negativeCount,
        unclassifiedCount: input.unclassifiedCount,
        providerStatuses: input.providerStatuses as any,
        topicSignals: (input.topicSignals as any) ?? undefined,
        sampleMentions: (input.sampleMentions as any) ?? undefined,
        freshness: input.freshness,
        collectedAt: new Date(),
      },
      create: {
        projectId: input.projectId,
        keyword: input.keyword,
        date: input.date,
        totalCount: input.totalCount,
        buzzLevel: input.buzzLevel,
        positiveCount: input.positiveCount,
        neutralCount: input.neutralCount,
        negativeCount: input.negativeCount,
        unclassifiedCount: input.unclassifiedCount,
        providerStatuses: input.providerStatuses as any,
        topicSignals: (input.topicSignals as any) ?? undefined,
        sampleMentions: (input.sampleMentions as any) ?? undefined,
        freshness: input.freshness,
      },
    });
    return snapshot.id;
  }

  async getSocialSnapshots(
    projectId: string,
    keyword: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.socialMentionSnapshot.findMany({
      where: {
        projectId,
        keyword,
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { date: "desc" },
    });
  }

  // ─── Benchmark Snapshot ────────────────────────────────────────

  async saveBenchmarkSnapshot(
    input: SaveBenchmarkSnapshotInput,
  ): Promise<string> {
    const snapshot = await this.prisma.benchmarkSnapshot.upsert({
      where: {
        projectId_keyword_industryType_date: {
          projectId: input.projectId,
          keyword: input.keyword,
          industryType: input.industryType,
          date: input.date,
        },
      },
      update: {
        overallScore: input.overallScore,
        comparisons: input.comparisons as any,
        highlights: (input.highlights as any) ?? undefined,
        warnings: (input.warnings as any) ?? undefined,
      },
      create: {
        projectId: input.projectId,
        keyword: input.keyword,
        industryType: input.industryType,
        date: input.date,
        overallScore: input.overallScore,
        comparisons: input.comparisons as any,
        highlights: (input.highlights as any) ?? undefined,
        warnings: (input.warnings as any) ?? undefined,
      },
    });
    return snapshot.id;
  }

  async getBenchmarkSnapshots(
    projectId: string,
    keyword: string,
    industryType: string,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return this.prisma.benchmarkSnapshot.findMany({
      where: {
        projectId,
        keyword,
        industryType,
        date: { gte: periodStart, lte: periodEnd },
      },
      orderBy: { date: "desc" },
    });
  }

  // ─── Period Comparison ─────────────────────────────────────────

  async loadPeriodComparisonData(
    projectId: string,
    seedKeyword: string,
    periodStart: Date,
    periodEnd: Date,
    industryType?: string,
  ): Promise<PeriodComparisonData> {
    const [runs, socialSnapshots, benchmarkSnapshots] = await Promise.all([
      this.getRunsForPeriod(projectId, seedKeyword, periodStart, periodEnd),
      this.getSocialSnapshots(projectId, seedKeyword, periodStart, periodEnd),
      industryType
        ? this.getBenchmarkSnapshots(
            projectId,
            seedKeyword,
            industryType,
            periodStart,
            periodEnd,
          )
        : Promise.resolve([]),
    ]);

    return {
      periodLabel: `${periodStart.toISOString().split("T")[0]} ~ ${periodEnd.toISOString().split("T")[0]}`,
      periodStart,
      periodEnd,
      runs: runs.map((r: any) => ({
        id: r.id,
        analyzedAt: r.analyzedAt,
        fusionResult: r.fusionResult,
        signalQuality: r.signalQuality,
        confidence: r.confidence,
      })),
      socialSnapshots: socialSnapshots.map((s: any) => ({
        date: s.date,
        totalCount: s.totalCount,
        buzzLevel: s.buzzLevel,
        positiveCount: s.positiveCount,
        neutralCount: s.neutralCount,
        negativeCount: s.negativeCount,
        unclassifiedCount: s.unclassifiedCount ?? 0,
      })),
      benchmarkSnapshots: benchmarkSnapshots.map((b: any) => ({
        date: b.date,
        overallScore: b.overallScore,
        comparisons: b.comparisons,
      })),
    };
  }

  /**
   * 가장 최근 분석과 이전 분석을 비교할 수 있도록 두 개의 run을 반환
   */
  async getCurrentVsPrevious(
    projectId: string,
    seedKeyword: string,
  ): Promise<{ current: unknown | null; previous: unknown | null }> {
    const runs = await this.prisma.intelligenceAnalysisRun.findMany({
      where: { projectId, seedKeyword },
      orderBy: { analyzedAt: "desc" },
      take: 2,
    });

    return {
      current: runs[0] ?? null,
      previous: runs[1] ?? null,
    };
  }
}
