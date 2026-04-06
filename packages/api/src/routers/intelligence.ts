import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { verifyProjectAccess } from "./_helpers";
import {
  IntelligenceComparisonService,
  type ComparisonSide,
} from "../services/intelligence/intelligence-comparison.service";
import { LiveSocialMentionBridgeService } from "../services/intelligence/live-social-mention-bridge.service";
import { IntelligencePersistenceService } from "../services/intelligence/intelligence-persistence.service";
import { IntelligenceAlertService } from "../services/intelligence/intelligence-alert.service";
import type { IndustryType } from "../services/vertical-templates/types";
import type { ClusterInput } from "../services/vertical-templates/topic-taxonomy-mapping.service";
import type { SocialCommentData } from "../services/vertical-templates/vertical-social-comment-integration.service";

const comparisonService = new IntelligenceComparisonService();
const liveMentionService = new LiveSocialMentionBridgeService();

const industryEnum = z.enum(["BEAUTY", "FNB", "FINANCE", "ENTERTAINMENT"]);

/** Convert zod cluster array to ClusterInput[] with required clusterId */
function toClusterInputs(
  data?: Array<{ label: string; memberTexts: string[] }>,
): ClusterInput[] | undefined {
  if (!data?.length) return undefined;
  return data.map((c, i) => ({
    clusterId: `cluster-${i}`,
    label: c.label,
    memberTexts: c.memberTexts,
  }));
}

/** Get today as Date (date-only, no time) */
function todayDate(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const intelligenceRouter = router({
  /**
   * 단일 키워드 intelligence 분석
   * — signal fusion을 직접 호출하여 intelligence 전용 결과를 반환
   * — 결과를 DB에 자동 저장
   */
  analyze: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().min(1),
        industryType: industryEnum.optional(),
        socialData: z
          .object({
            sentiment: z
              .object({
                total: z.number(),
                positive: z.number(),
                neutral: z.number(),
                negative: z.number(),
                topNegativeTopics: z.array(z.string()).optional(),
                topPositiveTopics: z.array(z.string()).optional(),
              })
              .optional(),
            commentTopics: z
              .array(
                z.object({
                  topic: z.string(),
                  count: z.number(),
                  sentiment: z.string(),
                  isQuestion: z.boolean().optional(),
                  isRisk: z.boolean().optional(),
                }),
              )
              .optional(),
            recentMentions: z
              .array(
                z.object({
                  text: z.string(),
                  platform: z.string(),
                  date: z.string(),
                }),
              )
              .optional(),
          })
          .optional(),
        measuredMetrics: z.record(z.number()).optional(),
        clusterData: z
          .array(
            z.object({
              label: z.string(),
              memberTexts: z.array(z.string()),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      // 1. Industry suggestion
      const suggested = ctx.services.verticalIndustrySuggester.suggest({
        seedKeyword: input.seedKeyword,
        relatedKeywords: [],
        clusterTopics: input.clusterData?.map((c) => c.label) ?? [],
      }).suggestedIndustry;
      const industryType: IndustryType =
        input.industryType ?? suggested ?? "BEAUTY";

      const clusterInputs = toClusterInputs(input.clusterData);

      // 2. Auto metrics from clusters
      const autoMetrics: Record<string, number> = {};
      if (input.clusterData && input.clusterData.length > 0) {
        autoMetrics.avgClusterCount = input.clusterData.length;

        const faqPatterns = [
          "어떻게",
          "왜",
          "뭐",
          "추천",
          "비교",
          "차이",
          "방법",
          "가격",
          "후기",
        ];
        const faqClusters = input.clusterData.filter((c) =>
          faqPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        autoMetrics.faqFrequency =
          faqClusters.length / input.clusterData.length;

        const compPatterns = ["비교", "vs", "차이", "대", "어디", "뭐가"];
        const compClusters = input.clusterData.filter((c) =>
          compPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        autoMetrics.comparisonClusterRatio =
          compClusters.length / input.clusterData.length;
        autoMetrics.comparisonSearchRate =
          compClusters.length / input.clusterData.length;

        const reviewPatterns = ["후기", "리뷰", "사용감", "평가", "추천"];
        const reviewClusters = input.clusterData.filter((c) =>
          reviewPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        autoMetrics.reviewMentionRate =
          reviewClusters.length / input.clusterData.length;
        autoMetrics.reviewInfluenceRate =
          reviewClusters.length / input.clusterData.length;
      }

      const finalMetrics = input.measuredMetrics
        ? { ...autoMetrics, ...input.measuredMetrics }
        : Object.keys(autoMetrics).length > 0
          ? autoMetrics
          : undefined;

      // 3. Signal Fusion
      const fusionResult = ctx.services.verticalSignalFusion.fuse({
        industryType,
        clusters: clusterInputs,
        socialData: input.socialData as SocialCommentData | undefined,
        measuredMetrics: finalMetrics,
      });

      // 4. Benchmark baseline
      const benchmarkBaseline =
        ctx.services.benchmarkBaseline.getBaseline(industryType);

      // 5. Industry template label
      const template =
        ctx.services.verticalTemplateRegistry.getTemplate(industryType);

      const confidence =
        fusionResult.signalQuality.overallRichness === "RICH"
          ? 0.85
          : fusionResult.signalQuality.overallRichness === "MODERATE"
            ? 0.65
            : 0.4;

      const intel = {
        taxonomyMapping: fusionResult.taxonomyMapping
          ? {
              coveredCategories: Object.entries(
                fusionResult.taxonomyMapping.taxonomyCoverage,
              )
                .filter(([, count]) => count > 0)
                .map(([cat, count]) => ({
                  category: cat,
                  clusterCount: count,
                })),
              uncoveredCategories: Object.entries(
                fusionResult.taxonomyMapping.taxonomyCoverage,
              )
                .filter(([, count]) => count === 0)
                .map(([cat]) => cat),
              unmappedClusters: fusionResult.taxonomyMapping.unmappedCount,
              totalClusters: fusionResult.taxonomyMapping.totalClusters,
            }
          : null,
        benchmarkBaseline: benchmarkBaseline.map((m) => ({
          key: m.key,
          label: m.label,
          value: m.value,
          unit: m.unit,
          description: m.description,
        })),
        benchmarkComparison: fusionResult.benchmarkComparison
          ? {
              overallScore: fusionResult.benchmarkComparison.overallScore,
              highlights: fusionResult.benchmarkComparison.highlights,
              warnings: fusionResult.benchmarkComparison.warnings,
              comparisons: fusionResult.benchmarkComparison.comparisons,
            }
          : null,
        socialIntegration: fusionResult.socialIntegration
          ? {
              hasSocialData: fusionResult.socialIntegration.hasSocialData,
              socialDataQuality:
                fusionResult.socialIntegration.socialDataQuality,
              evidenceCount:
                fusionResult.socialIntegration.evidenceItems.length,
              insightCount: fusionResult.socialIntegration.insights.length,
              warningCount: fusionResult.socialIntegration.warnings.length,
            }
          : null,
        hasMetrics: finalMetrics !== undefined,
        signalQuality: fusionResult.signalQuality,
        fusedEvidenceCount: fusionResult.additionalEvidence.length,
        fusedInsightCount: fusionResult.additionalInsights.length,
        fusedWarningCount: fusionResult.additionalWarnings.length,
      };

      // Compute provider coverage from registry
      let providerCoverage: Record<string, unknown> | null = null;
      try {
        const statuses = await liveMentionService
          .getRegistry()
          .getAllStatuses();
        const connected = statuses.filter((s) => s.isAvailable).length;
        providerCoverage = {
          connectedProviders: connected,
          totalProviders: statuses.length,
          isPartial: connected < statuses.length && connected > 0,
          providers: statuses.map((s) => ({
            name: s.provider,
            platform: s.platform,
            status: s.connectionStatus,
            error: s.error ?? null,
          })),
        };
      } catch {
        // Provider status check failure is non-critical
      }

      const metadata = {
        confidence,
        freshness: "fresh",
        isPartial:
          !fusionResult.signalQuality.hasClusterData ||
          !fusionResult.signalQuality.hasSocialData,
        isMockOnly: !input.clusterData?.length && !input.socialData,
        isStaleBased: false,
        providerCoverage,
      };

      // 6. Persist analysis run to DB
      let savedRunId: string | null = null;
      try {
        const persistence = new IntelligencePersistenceService(ctx.db as any);
        savedRunId = await persistence.saveAnalysisRun({
          projectId: input.projectId,
          seedKeyword: input.seedKeyword,
          industryType,
          industryLabel: template?.label ?? industryType,
          signalQuality: fusionResult.signalQuality as any,
          fusionResult: fusionResult as any,
          taxonomyMapping: intel.taxonomyMapping as any,
          benchmarkComparison: intel.benchmarkComparison as any,
          benchmarkBaseline: intel.benchmarkBaseline as any,
          socialIntegration: intel.socialIntegration as any,
          additionalInsights: fusionResult.additionalInsights as any,
          additionalWarnings: fusionResult.additionalWarnings as any,
          additionalEvidence: fusionResult.additionalEvidence as any,
          confidence,
          freshness: "fresh",
          isPartial: metadata.isPartial,
          isMockOnly: metadata.isMockOnly,
          isStaleBased: false,
          providerCoverage: providerCoverage as any,
        });

        // Also save benchmark snapshot if available
        if (intel.benchmarkComparison) {
          await persistence.saveBenchmarkSnapshot({
            projectId: input.projectId,
            keyword: input.seedKeyword,
            industryType,
            date: todayDate(),
            overallScore: intel.benchmarkComparison.overallScore ?? 0,
            comparisons: intel.benchmarkComparison.comparisons ?? [],
            highlights: intel.benchmarkComparison.highlights,
            warnings: intel.benchmarkComparison.warnings,
          });
        }
      } catch {
        // Persistence failure should not block analysis response
      }

      // 7. Evaluate alerts (non-blocking)
      let alertsTriggered: string[] = [];
      try {
        const alertService = new IntelligenceAlertService(ctx.db as any);
        const alertResult = await alertService.evaluateAndAlert({
          projectId: input.projectId,
          userId: ctx.userId,
          seedKeyword: input.seedKeyword,
          industryType,
          currentResult: {
            confidence,
            isPartial: metadata.isPartial,
            warnings: fusionResult.additionalWarnings,
            benchmarkComparison: intel.benchmarkComparison as any,
            signalQuality: fusionResult.signalQuality,
          },
        });
        alertsTriggered = alertResult.alertsTriggered;
      } catch {
        // Alert evaluation failure should not block response
      }

      return {
        seedKeyword: input.seedKeyword,
        industryType,
        industryLabel: template?.label ?? industryType,
        intelligence: intel,
        additionalInsights: fusionResult.additionalInsights,
        additionalWarnings: fusionResult.additionalWarnings,
        additionalEvidence: fusionResult.additionalEvidence,
        fusionResult, // raw for comparison use
        metadata: {
          ...metadata,
          savedRunId,
          alertsTriggered,
        },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * 실시간 소셜 멘션 수집
   * — 결과를 소셜 멘션 스냅샷으로 자동 저장
   */
  liveMentions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        existingComments: z
          .array(
            z.object({
              text: z.string(),
              sentiment: z.string().optional(),
              topic: z.string().optional(),
              createdAt: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const result = await liveMentionService.collectLiveMentions(
        input.keyword,
        input.projectId,
        input.existingComments,
      );

      // Persist social mention snapshot (daily)
      try {
        const persistence = new IntelligencePersistenceService(ctx.db as any);

        // Count sentiments — null/unknown separated from NEUTRAL
        let positive = 0,
          neutral = 0,
          negative = 0,
          unclassified = 0;
        for (const m of result.mentions) {
          if (m.sentiment === "POSITIVE") positive++;
          else if (m.sentiment === "NEGATIVE") negative++;
          else if (m.sentiment === "NEUTRAL") neutral++;
          else unclassified++; // null, undefined, or unknown sentiment
        }

        await persistence.saveSocialSnapshot({
          projectId: input.projectId,
          keyword: input.keyword,
          date: todayDate(),
          totalCount: result.totalCount,
          buzzLevel: result.buzzLevel,
          positiveCount: positive,
          neutralCount: neutral,
          negativeCount: negative,
          unclassifiedCount: unclassified,
          providerStatuses: result.providerStatuses,
          topicSignals: result.topicSignals,
          sampleMentions: result.mentions.slice(0, 20).map((m) => ({
            text: m.text.slice(0, 300),
            platform: m.platform,
            sentiment: m.sentiment,
            publishedAt: m.publishedAt,
          })),
          freshness: result.freshness,
        });
      } catch {
        // Don't block response on snapshot failure
      }

      return result;
    }),

  /**
   * Provider 상태 조회
   */
  providerStatuses: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const statuses = await liveMentionService.getRegistry().getAllStatuses();
      return statuses.map((s) => ({
        provider: s.provider,
        platform: s.platform,
        connectionStatus: s.connectionStatus,
        isAvailable: s.isAvailable,
        error: s.error,
        authType: s.config.authType,
        envKeyName: s.config.envKeyName,
        documentation: s.config.documentation,
        rateLimitPerDay: s.config.rateLimitPerDay,
      }));
    }),

  /**
   * 분석 이력 조회
   */
  history: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().optional(),
        industryType: industryEnum.optional(),
        limit: z.number().min(1).max(50).optional(),
        offset: z.number().min(0).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const persistence = new IntelligencePersistenceService(ctx.db as any);
      const runs = await persistence.getAnalysisHistory(input.projectId, {
        seedKeyword: input.seedKeyword,
        industryType: input.industryType,
        limit: input.limit,
        offset: input.offset,
      });
      return {
        runs,
        totalCount: runs.length,
        hasMore: runs.length === (input.limit ?? 20),
      };
    }),

  /**
   * 저장된 분석 결과 로드
   */
  loadRun: protectedProcedure
    .input(z.object({ projectId: z.string(), runId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const persistence = new IntelligencePersistenceService(ctx.db as any);
      const run = await persistence.getAnalysisRun(input.runId);
      if (!run || run.projectId !== input.projectId) {
        return null;
      }
      return run;
    }),

  /**
   * A/B 비교 분석
   * — 비교 결과를 DB에 자동 저장
   * — period_vs_period 시 historical data 활용
   */
  compare: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        comparisonType: z.enum([
          "keyword_vs_keyword",
          "industry_vs_industry",
          "period_vs_period",
        ]),
        left: z.object({
          label: z.string(),
          seedKeyword: z.string().min(1),
          industryType: industryEnum.optional(),
          socialData: z.any().optional(),
          measuredMetrics: z.record(z.number()).optional(),
          clusterData: z
            .array(
              z.object({
                label: z.string(),
                memberTexts: z.array(z.string()),
              }),
            )
            .optional(),
          // Period comparison fields
          periodStart: z.string().optional(), // ISO date string
          periodEnd: z.string().optional(),
          runId: z.string().optional(), // Use a saved run instead of live analysis
        }),
        right: z.object({
          label: z.string(),
          seedKeyword: z.string().min(1),
          industryType: industryEnum.optional(),
          socialData: z.any().optional(),
          measuredMetrics: z.record(z.number()).optional(),
          clusterData: z
            .array(
              z.object({
                label: z.string(),
                memberTexts: z.array(z.string()),
              }),
            )
            .optional(),
          periodStart: z.string().optional(),
          periodEnd: z.string().optional(),
          runId: z.string().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const persistence = new IntelligencePersistenceService(ctx.db as any);

      // Helper: analyze a side (live) or load from saved run
      const analyzeOne = async (
        side: typeof input.left,
      ): Promise<ComparisonSide> => {
        // If a saved run ID is provided, load from DB
        if (side.runId) {
          const savedRun = await persistence.getAnalysisRun(side.runId);
          if (savedRun && savedRun.projectId === input.projectId) {
            const fusionResult = savedRun.fusionResult as any;
            return {
              label: side.label,
              seedKeyword: savedRun.seedKeyword,
              industryType: savedRun.industryType as IndustryType,
              fusionResult,
              metadata: {
                confidence: savedRun.confidence,
                freshness: savedRun.freshness,
                isPartial: savedRun.isPartial,
                isMockOnly: savedRun.isMockOnly,
                isStaleBased: true, // It's from a past run
                generatedAt: savedRun.analyzedAt.toISOString(),
              },
            };
          }
        }

        // For period_vs_period, try loading the most recent run in the period
        if (
          input.comparisonType === "period_vs_period" &&
          side.periodStart &&
          side.periodEnd
        ) {
          const runs = await persistence.getRunsForPeriod(
            input.projectId,
            side.seedKeyword,
            new Date(side.periodStart),
            new Date(side.periodEnd),
          );
          if (runs.length > 0) {
            const latestRun = runs[0]!;
            const fusionResult = latestRun.fusionResult as any;
            return {
              label: side.label,
              seedKeyword: latestRun.seedKeyword,
              industryType: latestRun.industryType as IndustryType,
              fusionResult,
              metadata: {
                confidence: latestRun.confidence,
                freshness: latestRun.freshness,
                isPartial: latestRun.isPartial,
                isMockOnly: latestRun.isMockOnly,
                isStaleBased: true,
                generatedAt: latestRun.analyzedAt.toISOString(),
              },
            };
          }
        }

        // Live analysis
        const suggested = ctx.services.verticalIndustrySuggester.suggest({
          seedKeyword: side.seedKeyword,
          relatedKeywords: [],
          clusterTopics: side.clusterData?.map((c) => c.label) ?? [],
        }).suggestedIndustry;
        const sideIndustry: IndustryType =
          side.industryType ?? suggested ?? "BEAUTY";

        const sideClusterInputs = toClusterInputs(side.clusterData);

        // Auto metrics
        const autoMetrics: Record<string, number> = {};
        if (side.clusterData && side.clusterData.length > 0) {
          autoMetrics.avgClusterCount = side.clusterData.length;
          const faqPatterns = [
            "어떻게",
            "왜",
            "뭐",
            "추천",
            "비교",
            "차이",
            "방법",
            "가격",
            "후기",
          ];
          const faqClusters = side.clusterData.filter((c) =>
            faqPatterns.some(
              (p) =>
                c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
            ),
          );
          autoMetrics.faqFrequency =
            faqClusters.length / side.clusterData.length;
        }
        const finalMetrics = side.measuredMetrics
          ? { ...autoMetrics, ...side.measuredMetrics }
          : Object.keys(autoMetrics).length > 0
            ? autoMetrics
            : undefined;

        const fusionResult = ctx.services.verticalSignalFusion.fuse({
          industryType: sideIndustry,
          clusters: sideClusterInputs,
          socialData: side.socialData as SocialCommentData | undefined,
          measuredMetrics: finalMetrics,
        });

        const confidence =
          fusionResult.signalQuality.overallRichness === "RICH"
            ? 0.85
            : fusionResult.signalQuality.overallRichness === "MODERATE"
              ? 0.65
              : 0.4;

        return {
          label: side.label,
          seedKeyword: side.seedKeyword,
          industryType: sideIndustry,
          fusionResult,
          metadata: {
            confidence,
            freshness: "fresh",
            isPartial:
              !fusionResult.signalQuality.hasClusterData ||
              !fusionResult.signalQuality.hasSocialData,
            isMockOnly: !side.clusterData?.length && !side.socialData,
            isStaleBased: false,
            generatedAt: new Date().toISOString(),
          },
        };
      };

      const leftResult = await analyzeOne(input.left);
      const rightResult = await analyzeOne(input.right);

      // Compare
      const comparison = comparisonService.compare(
        leftResult,
        rightResult,
        input.comparisonType,
      );

      // Period comparison data availability check
      let periodDataAvailability:
        | {
            leftHasHistoricalData: boolean;
            rightHasHistoricalData: boolean;
            insufficientDataWarning?: string;
          }
        | undefined;

      if (input.comparisonType === "period_vs_period") {
        const leftHas = leftResult.metadata.isStaleBased || !!input.left.runId;
        const rightHas =
          rightResult.metadata.isStaleBased || !!input.right.runId;

        periodDataAvailability = {
          leftHasHistoricalData: leftHas,
          rightHasHistoricalData: rightHas,
        };

        if (!leftHas && !rightHas) {
          periodDataAvailability.insufficientDataWarning =
            "양쪽 모두 저장된 과거 데이터가 없습니다. 기간 비교를 위해 먼저 분석을 실행하고 결과를 누적하세요.";
        } else if (!leftHas || !rightHas) {
          periodDataAvailability.insufficientDataWarning =
            "한쪽의 과거 데이터가 부족합니다. 현재 분석 결과로 대체되었습니다.";
        }
      }

      // Persist comparison run
      let savedComparisonId: string | null = null;
      try {
        savedComparisonId = await persistence.saveComparisonRun({
          projectId: input.projectId,
          comparisonType: input.comparisonType,
          leftLabel: leftResult.label,
          leftKeyword: leftResult.seedKeyword,
          leftIndustry: leftResult.industryType,
          leftRunId: input.left.runId,
          rightLabel: rightResult.label,
          rightKeyword: rightResult.seedKeyword,
          rightIndustry: rightResult.industryType,
          rightRunId: input.right.runId,
          comparisonResult: comparison as any,
          overallDifferenceScore: comparison.overallDifferenceScore,
          leftPeriodStart: input.left.periodStart
            ? new Date(input.left.periodStart)
            : undefined,
          leftPeriodEnd: input.left.periodEnd
            ? new Date(input.left.periodEnd)
            : undefined,
          rightPeriodStart: input.right.periodStart
            ? new Date(input.right.periodStart)
            : undefined,
          rightPeriodEnd: input.right.periodEnd
            ? new Date(input.right.periodEnd)
            : undefined,
        });
      } catch {
        // Don't block on persistence failure
      }

      // Benchmark baselines for both sides
      const leftBaseline = ctx.services.benchmarkBaseline.getBaseline(
        leftResult.industryType as IndustryType,
      );
      const rightBaseline = ctx.services.benchmarkBaseline.getBaseline(
        rightResult.industryType as IndustryType,
      );

      const leftTemplate = ctx.services.verticalTemplateRegistry.getTemplate(
        leftResult.industryType as IndustryType,
      );
      const rightTemplate = ctx.services.verticalTemplateRegistry.getTemplate(
        rightResult.industryType as IndustryType,
      );

      return {
        comparison,
        periodDataAvailability,
        savedComparisonId,
        left: {
          ...leftResult,
          industryLabel: leftTemplate?.label ?? leftResult.industryType,
          benchmarkBaseline: leftBaseline.map((m) => ({
            key: m.key,
            label: m.label,
            value: m.value,
            unit: m.unit,
            description: m.description,
          })),
          intelligence: {
            signalQuality: leftResult.fusionResult.signalQuality,
            taxonomyMapping: leftResult.fusionResult.taxonomyMapping,
            benchmarkComparison: leftResult.fusionResult.benchmarkComparison,
            socialIntegration: leftResult.fusionResult.socialIntegration,
          },
        },
        right: {
          ...rightResult,
          industryLabel: rightTemplate?.label ?? rightResult.industryType,
          benchmarkBaseline: rightBaseline.map((m) => ({
            key: m.key,
            label: m.label,
            value: m.value,
            unit: m.unit,
            description: m.description,
          })),
          intelligence: {
            signalQuality: rightResult.fusionResult.signalQuality,
            taxonomyMapping: rightResult.fusionResult.taxonomyMapping,
            benchmarkComparison: rightResult.fusionResult.benchmarkComparison,
            socialIntegration: rightResult.fusionResult.socialIntegration,
          },
        },
      };
    }),

  /**
   * 기간별 비교 데이터 로드 (period_vs_period 전용)
   */
  periodData: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().min(1),
        periodStart: z.string(),
        periodEnd: z.string(),
        industryType: industryEnum.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const persistence = new IntelligencePersistenceService(ctx.db as any);
      const data = await persistence.loadPeriodComparisonData(
        input.projectId,
        input.seedKeyword,
        new Date(input.periodStart),
        new Date(input.periodEnd),
        input.industryType,
      );

      return {
        ...data,
        hasData: data.runs.length > 0,
        runCount: data.runs.length,
        socialSnapshotCount: data.socialSnapshots.length,
        benchmarkSnapshotCount: data.benchmarkSnapshots.length,
      };
    }),

  /**
   * 현재 vs 이전 비교 (quick comparison)
   */
  currentVsPrevious: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const persistence = new IntelligencePersistenceService(ctx.db as any);
      const result = await persistence.getCurrentVsPrevious(
        input.projectId,
        input.seedKeyword,
      );

      return {
        hasPreviousRun: result.previous !== null,
        current: result.current,
        previous: result.previous,
      };
    }),

  // ─── Benchmark Time-Series ──────────────────────────────────

  /**
   * Benchmark score 시계열 데이터 조회
   * — BenchmarkSnapshot에서 기간별 overallScore + comparisons를 반환
   */
  benchmarkTrend: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        seedKeyword: z.string().min(1),
        industryType: industryEnum,
        days: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);
      const persistence = new IntelligencePersistenceService(ctx.db as any);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      const snapshots = await persistence.getBenchmarkSnapshots(
        input.projectId,
        input.seedKeyword,
        input.industryType,
        startDate,
        endDate,
      );

      if (snapshots.length === 0) {
        return {
          hasData: false,
          dataPoints: [],
          trendSummary: {
            direction: "INSUFFICIENT_DATA" as const,
            changePercent: 0,
            volatility: "UNKNOWN" as const,
            dataPointCount: 0,
            periodDays: input.days,
          },
          warnings: [
            "이 기간에 저장된 벤치마크 데이터가 없습니다. 분석을 실행하여 데이터를 누적하세요.",
          ],
        };
      }

      // Build data points
      const dataPoints = snapshots
        .map((s: any) => ({
          date: s.date.toISOString().split("T")[0]!,
          overallScore: s.overallScore as number,
          comparisons: s.comparisons as unknown[],
          highlights: s.highlights as string[] | null,
          warnings: s.warnings as string[] | null,
        }))
        .sort((a: { date: string }, b: { date: string }) =>
          a.date.localeCompare(b.date),
        );

      // Compute trend summary
      const scores = dataPoints.map(
        (d: { overallScore: number }) => d.overallScore,
      );
      const firstScore = scores[0]!;
      const lastScore = scores[scores.length - 1]!;
      const changePercent =
        firstScore > 0
          ? Math.round(((lastScore - firstScore) / firstScore) * 1000) / 10
          : 0;

      // Volatility: stddev / mean
      const mean =
        scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      const stddev = Math.sqrt(
        scores.reduce((sum: number, s: number) => sum + (s - mean) ** 2, 0) /
          scores.length,
      );
      const cv = mean > 0 ? stddev / mean : 0;

      let direction:
        | "RISING"
        | "DECLINING"
        | "STABLE"
        | "VOLATILE"
        | "INSUFFICIENT_DATA";
      if (scores.length < 3) {
        direction = "INSUFFICIENT_DATA";
      } else if (cv > 0.25) {
        direction = "VOLATILE";
      } else if (changePercent > 10) {
        direction = "RISING";
      } else if (changePercent < -10) {
        direction = "DECLINING";
      } else {
        direction = "STABLE";
      }

      let volatility: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
      if (scores.length < 3) {
        volatility = "UNKNOWN";
      } else if (cv > 0.3) {
        volatility = "HIGH";
      } else if (cv > 0.1) {
        volatility = "MODERATE";
      } else {
        volatility = "LOW";
      }

      const warnings: string[] = [];
      if (scores.length < 7) {
        warnings.push(
          `데이터 포인트가 ${scores.length}개뿐입니다. 최소 7일 이상의 데이터가 있어야 신뢰할 수 있는 트렌드를 보여줍니다.`,
        );
      }
      if (direction === "VOLATILE") {
        warnings.push(
          "벤치마크 점수의 변동성이 큽니다. 안정적인 추세가 형성되지 않았습니다.",
        );
      }

      return {
        hasData: true,
        dataPoints,
        trendSummary: {
          direction,
          changePercent,
          volatility,
          dataPointCount: scores.length,
          periodDays: input.days,
          latestScore: lastScore,
          previousScore: scores.length >= 2 ? scores[scores.length - 2] : null,
        },
        warnings,
      };
    }),

  // ─── Trend Aggregation (weekly/monthly + channel) ───────────

  /**
   * 소셜 멘션 추이 — 일별/주별/월별 집계 + 채널별 분리
   */
  mentionTrend: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(365).default(30),
        granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      // Fetch daily snapshots
      const snapshots = await ctx.db.socialMentionSnapshot.findMany({
        where: {
          projectId: input.projectId,
          keyword: input.keyword,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "asc" },
      });

      if (snapshots.length === 0) {
        return {
          hasData: false,
          granularity: input.granularity,
          dataPoints: [],
          warnings: [
            "이 기간에 소셜 반응 데이터가 아직 없어요. 키워드를 분석하면 데이터가 쌓여요.",
          ],
        };
      }

      // Aggregate by granularity
      type AggPoint = {
        period: string;
        totalCount: number;
        positiveCount: number;
        neutralCount: number;
        negativeCount: number;
        unclassifiedCount: number;
        days: number;
      };

      const buckets = new Map<string, AggPoint>();

      for (const s of snapshots) {
        const d = new Date(s.date);
        let key: string;

        if (input.granularity === "weekly") {
          // ISO week: Monday-based
          const dayOfWeek = d.getUTCDay();
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() - ((dayOfWeek + 6) % 7));
          key = monday.toISOString().split("T")[0]!;
        } else if (input.granularity === "monthly") {
          key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        } else {
          key = d.toISOString().split("T")[0]!;
        }

        const existing = buckets.get(key) ?? {
          period: key,
          totalCount: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          unclassifiedCount: 0,
          days: 0,
        };
        existing.totalCount += s.totalCount;
        existing.positiveCount += s.positiveCount;
        existing.neutralCount += s.neutralCount;
        existing.negativeCount += s.negativeCount;
        existing.unclassifiedCount += (s as any).unclassifiedCount ?? 0;
        existing.days += 1;
        buckets.set(key, existing);
      }

      return {
        hasData: true,
        granularity: input.granularity,
        dataPoints: [...buckets.values()],
        periodCount: buckets.size,
        totalMentions: snapshots.reduce((sum, s) => sum + s.totalCount, 0),
        warnings: [],
      };
    }),

  /**
   * 채널별 멘션 시계열 — provider별 일별 추이
   */
  channelTrend: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      // Fetch raw mentions grouped by platform + date
      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          publishedAt: { gte: startDate, lte: endDate },
        },
        select: {
          platform: true,
          publishedAt: true,
          sentiment: true,
        },
      });

      if (mentions.length === 0) {
        return {
          hasData: false,
          channels: [],
          warnings: ["이 기간에 채널별 데이터가 아직 없어요."],
        };
      }

      // Group by platform + date
      type ChannelDay = {
        date: string;
        count: number;
        positive: number;
        negative: number;
      };
      const channelMap = new Map<string, Map<string, ChannelDay>>();

      for (const m of mentions) {
        const platform = m.platform as string;
        const dateKey = new Date(m.publishedAt).toISOString().split("T")[0]!;

        if (!channelMap.has(platform)) channelMap.set(platform, new Map());
        const days = channelMap.get(platform)!;
        const day = days.get(dateKey) ?? {
          date: dateKey,
          count: 0,
          positive: 0,
          negative: 0,
        };
        day.count++;
        if (m.sentiment === "POSITIVE") day.positive++;
        if (m.sentiment === "NEGATIVE") day.negative++;
        days.set(dateKey, day);
      }

      const channels = [...channelMap.entries()].map(([platform, days]) => ({
        platform,
        totalCount: [...days.values()].reduce((s, d) => s + d.count, 0),
        dataPoints: [...days.values()].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      }));

      return {
        hasData: true,
        channels: channels.sort((a, b) => b.totalCount - a.totalCount),
        totalMentions: mentions.length,
        warnings: [],
      };
    }),

  /**
   * YouTube 키워드 분석 요약 — 화제성 카드
   */
  youtubeSummary: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      // YouTube mentions from rawSocialMention
      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          platform: "YOUTUBE",
          publishedAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          text: true,
          authorName: true,
          publishedAt: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          sentiment: true,
          postUrl: true,
        },
        orderBy: { publishedAt: "desc" },
        take: 100,
      });

      if (mentions.length === 0) {
        return {
          hasData: false,
          summary: null,
          topContent: [],
          warnings: [
            "이 키워드의 YouTube 데이터가 아직 없어요. YouTube API Key를 설정하고 분석하면 데이터가 쌓여요.",
          ],
        };
      }

      // Summary stats
      const totalVideos = mentions.length;
      const totalViews = mentions.reduce((s, m) => s + (m.viewCount ?? 0), 0);
      const totalLikes = mentions.reduce((s, m) => s + (m.likeCount ?? 0), 0);
      const totalComments = mentions.reduce(
        (s, m) => s + (m.commentCount ?? 0),
        0,
      );
      let positive = 0,
        negative = 0,
        neutral = 0;
      for (const m of mentions) {
        if (m.sentiment === "POSITIVE") positive++;
        else if (m.sentiment === "NEGATIVE") negative++;
        else if (m.sentiment === "NEUTRAL") neutral++;
      }

      // Top content by views
      const topContent = mentions
        .filter((m) => (m.viewCount ?? 0) > 0)
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
        .slice(0, 10)
        .map((m) => ({
          text: m.text?.slice(0, 100) ?? "",
          authorName: m.authorName,
          viewCount: m.viewCount ?? 0,
          likeCount: m.likeCount ?? 0,
          commentCount: m.commentCount ?? 0,
          publishedAt: m.publishedAt.toISOString(),
          url: m.postUrl,
          sentiment: m.sentiment,
        }));

      return {
        hasData: true,
        summary: {
          totalVideos,
          totalViews,
          totalLikes,
          totalComments,
          sentimentBreakdown: { positive, negative, neutral },
          period: `${input.days}일`,
        },
        topContent,
        warnings: [],
      };
    }),

  /**
   * 연관어 맵 — keyword의 관련 토픽/클러스터 기반 연관어 네트워크
   */
  relatedKeywords: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      // 1. Collect topics from rawSocialMention
      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          publishedAt: { gte: startDate, lte: endDate },
        },
        select: { topics: true, sentiment: true, text: true },
        take: 500,
      });

      // 2. Extract co-occurring words from topics + text
      const topicCounts = new Map<
        string,
        { count: number; positive: number; negative: number; neutral: number }
      >();

      for (const m of mentions) {
        const topics = (m.topics as string[]) ?? [];
        for (const t of topics) {
          if (!t || t === input.keyword) continue;
          const existing = topicCounts.get(t) ?? {
            count: 0,
            positive: 0,
            negative: 0,
            neutral: 0,
          };
          existing.count++;
          if (m.sentiment === "POSITIVE") existing.positive++;
          else if (m.sentiment === "NEGATIVE") existing.negative++;
          else if (m.sentiment === "NEUTRAL") existing.neutral++;
          topicCounts.set(t, existing);
        }
      }

      // 3. Also extract from taxonomy if available (latest analysis run)
      const latestRun = await ctx.db.intelligenceAnalysisRun.findFirst({
        where: { projectId: input.projectId, seedKeyword: input.keyword },
        orderBy: { analyzedAt: "desc" },
        select: { taxonomyMapping: true, analyzedAt: true },
      });

      if (latestRun?.taxonomyMapping) {
        const taxonomy = latestRun.taxonomyMapping as any;
        if (taxonomy.coveredCategories) {
          for (const cat of taxonomy.coveredCategories) {
            if (!topicCounts.has(cat.category)) {
              topicCounts.set(cat.category, {
                count: cat.clusterCount ?? 1,
                positive: 0,
                negative: 0,
                neutral: 0,
              });
            }
          }
        }
      }

      if (topicCounts.size === 0) {
        return {
          hasData: false,
          nodes: [],
          warnings: [
            "연관어 데이터가 아직 없어요. 키워드를 분석하면 연관어가 나타나요.",
          ],
        };
      }

      // 4. Build nodes sorted by count
      const nodes = [...topicCounts.entries()]
        .map(([word, stats]) => ({
          word,
          count: stats.count,
          sentiment:
            stats.positive > stats.negative
              ? ("POSITIVE" as const)
              : stats.negative > stats.positive
                ? ("NEGATIVE" as const)
                : ("NEUTRAL" as const),
          positive: stats.positive,
          negative: stats.negative,
          neutral: stats.neutral,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);

      return {
        hasData: true,
        centerKeyword: input.keyword,
        nodes,
        totalTopics: topicCounts.size,
        warnings: [],
      };
    }),

  /**
   * 연관어 시계열 변화 — 기간 A vs 기간 B에서 연관어 변화
   */
  relatedKeywordChange: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        currentDays: z.number().min(1).max(30).default(7),
        previousDays: z.number().min(1).max(30).default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const now = todayDate();
      const currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - input.currentDays);
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - input.previousDays);

      // Helper: count topics in a period
      async function countTopics(start: Date, end: Date) {
        const mentions = await ctx.db.rawSocialMention.findMany({
          where: {
            matchedKeyword: input.keyword,
            publishedAt: { gte: start, lt: end },
          },
          select: { topics: true },
          take: 500,
        });
        const counts = new Map<string, number>();
        for (const m of mentions) {
          for (const t of (m.topics as string[]) ?? []) {
            if (t && t !== input.keyword)
              counts.set(t, (counts.get(t) ?? 0) + 1);
          }
        }
        return counts;
      }

      const current = await countTopics(currentStart, now);
      const previous = await countTopics(previousStart, currentStart);

      // Classify: new / rising / declining / stable / gone
      type ChangeNode = {
        word: string;
        currentCount: number;
        previousCount: number;
        change: "new" | "rising" | "declining" | "stable" | "gone";
      };
      const allWords = new Set([...current.keys(), ...previous.keys()]);
      const nodes: ChangeNode[] = [];

      for (const word of allWords) {
        const cur = current.get(word) ?? 0;
        const prev = previous.get(word) ?? 0;
        let change: ChangeNode["change"];
        if (prev === 0 && cur > 0) change = "new";
        else if (cur === 0 && prev > 0) change = "gone";
        else if (cur > prev * 1.5) change = "rising";
        else if (cur < prev * 0.5) change = "declining";
        else change = "stable";
        nodes.push({ word, currentCount: cur, previousCount: prev, change });
      }

      nodes.sort((a, b) => b.currentCount - a.currentCount);

      return {
        hasData: nodes.length > 0,
        nodes: nodes.slice(0, 30),
        summary: {
          new: nodes.filter((n) => n.change === "new").length,
          rising: nodes.filter((n) => n.change === "rising").length,
          declining: nodes.filter((n) => n.change === "declining").length,
          stable: nodes.filter((n) => n.change === "stable").length,
          gone: nodes.filter((n) => n.change === "gone").length,
        },
        periods: {
          current: `최근 ${input.currentDays}일`,
          previous: `그 전 ${input.previousDays}일`,
        },
        warnings:
          nodes.length === 0 ? ["연관어 변화 데이터가 아직 없어요."] : [],
      };
    }),

  /**
   * 감성 연관어 — 긍정/부정 맥락별 자주 등장하는 단어
   */
  sentimentTerms: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const startDate = new Date(todayDate());
      startDate.setDate(startDate.getDate() - input.days);

      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          publishedAt: { gte: startDate },
          sentiment: { not: null },
        },
        select: { topics: true, sentiment: true },
        take: 500,
      });

      const positiveTerms = new Map<string, number>();
      const negativeTerms = new Map<string, number>();
      const neutralTerms = new Map<string, number>();

      for (const m of mentions) {
        const topics = (m.topics as string[]) ?? [];
        for (const t of topics) {
          if (!t || t === input.keyword) continue;
          if (m.sentiment === "POSITIVE")
            positiveTerms.set(t, (positiveTerms.get(t) ?? 0) + 1);
          else if (m.sentiment === "NEGATIVE")
            negativeTerms.set(t, (negativeTerms.get(t) ?? 0) + 1);
          else neutralTerms.set(t, (neutralTerms.get(t) ?? 0) + 1);
        }
      }

      const toArray = (map: Map<string, number>) =>
        [...map.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15)
          .map(([word, count]) => ({ word, count }));

      return {
        hasData: mentions.length > 0,
        positive: toArray(positiveTerms),
        negative: toArray(negativeTerms),
        neutral: toArray(neutralTerms),
        totalMentions: mentions.length,
        warnings:
          mentions.length === 0 ? ["감성별 연관어 데이터가 아직 없어요."] : [],
      };
    }),

  /**
   * 속성별 강점/약점 분석 — attribute-based strength/weakness
   */
  attributeAnalysis: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      // Attribute categories (domain-extensible)
      const ATTRIBUTES: Record<string, string[]> = {
        가격: [
          "가격",
          "비싸",
          "싸",
          "저렴",
          "가성비",
          "할인",
          "세일",
          "원",
          "비용",
        ],
        품질: [
          "품질",
          "퀄리티",
          "내구성",
          "튼튼",
          "약하",
          "불량",
          "고급",
          "최고",
        ],
        디자인: [
          "디자인",
          "예쁘",
          "이쁘",
          "못생",
          "색상",
          "컬러",
          "깔끔",
          "세련",
        ],
        서비스: [
          "서비스",
          "배송",
          "응대",
          "친절",
          "불친절",
          "느리",
          "빠르",
          "교환",
          "환불",
        ],
        기능: [
          "기능",
          "성능",
          "효과",
          "효능",
          "사용감",
          "편리",
          "불편",
          "작동",
        ],
      };

      const startDate = new Date(todayDate());
      startDate.setDate(startDate.getDate() - input.days);

      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          publishedAt: { gte: startDate },
        },
        select: { text: true, sentiment: true },
        take: 500,
      });

      type AttrResult = {
        attribute: string;
        total: number;
        positive: number;
        negative: number;
        neutral: number;
        score: number;
      };
      const results: AttrResult[] = [];

      for (const [attr, keywords] of Object.entries(ATTRIBUTES)) {
        let total = 0,
          positive = 0,
          negative = 0,
          neutral = 0;
        for (const m of mentions) {
          const text = (m.text ?? "").toLowerCase();
          if (keywords.some((k) => text.includes(k))) {
            total++;
            if (m.sentiment === "POSITIVE") positive++;
            else if (m.sentiment === "NEGATIVE") negative++;
            else neutral++;
          }
        }
        if (total > 0) {
          const score =
            total > 0 ? Math.round(((positive - negative) / total) * 100) : 0;
          results.push({
            attribute: attr,
            total,
            positive,
            negative,
            neutral,
            score,
          });
        }
      }

      results.sort((a, b) => b.total - a.total);

      return {
        hasData: results.length > 0,
        attributes: results,
        strengths: results.filter((r) => r.score > 20).map((r) => r.attribute),
        weaknesses: results
          .filter((r) => r.score < -20)
          .map((r) => r.attribute),
        totalMentions: mentions.length,
        warnings:
          results.length === 0 ? ["속성별 분석 데이터가 아직 없어요."] : [],
      };
    }),

  /**
   * 채널 랭킹 — 조회수/반응/성장률 기준 채널 순위
   */
  channelRanking: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        days: z.number().min(1).max(90).default(30),
        sortBy: z
          .enum(["views", "engagement", "growth", "virality"])
          .default("virality"),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const channels = await ctx.db.channel.findMany({
        where: { projectId: input.projectId },
        include: {
          snapshots: {
            orderBy: { date: "desc" },
            take: 2, // Latest + previous for growth
          },
        },
      });

      if (channels.length === 0) {
        return {
          hasData: false,
          rankings: [],
          warnings: [
            "등록된 채널이 아직 없어요. 채널을 등록하면 랭킹이 나타나요.",
          ],
        };
      }

      type RankedChannel = {
        id: string;
        name: string;
        platform: string;
        url: string;
        thumbnailUrl: string | null;
        subscriberCount: number;
        totalViews: number;
        avgEngagement: number;
        growth: number; // subscriber growth %
        viralityScore: number; // composite score 0-100
        rank: number;
      };

      const ranked: RankedChannel[] = channels.map((ch) => {
        const latest = ch.snapshots[0];
        const prev = ch.snapshots[1];
        const totalViews = Number(latest?.totalViews ?? 0);
        const avgEngagement = latest?.avgEngagement ?? 0;
        const subCount = latest?.subscriberCount ?? ch.subscriberCount ?? 0;
        const prevSub = prev?.subscriberCount ?? subCount;
        const growth =
          prevSub > 0
            ? Math.round(((subCount - prevSub) / prevSub) * 1000) / 10
            : 0;

        // Virality = weighted composite (views 40% + engagement 30% + growth 20% + subscriber 10%)
        const viewScore = Math.min(100, totalViews / 10000);
        const engScore = Math.min(100, avgEngagement * 100);
        const growthScore = Math.min(100, Math.max(0, growth * 5 + 50));
        const subScore = Math.min(100, subCount / 10000);
        const viralityScore = Math.round(
          viewScore * 0.4 + engScore * 0.3 + growthScore * 0.2 + subScore * 0.1,
        );

        return {
          id: ch.id,
          name: ch.name,
          platform: ch.platform,
          url: ch.url,
          thumbnailUrl: ch.thumbnailUrl,
          subscriberCount: subCount,
          totalViews,
          avgEngagement,
          growth,
          viralityScore,
          rank: 0,
        };
      });

      // Sort
      const sortKey =
        input.sortBy === "views"
          ? "totalViews"
          : input.sortBy === "engagement"
            ? "avgEngagement"
            : input.sortBy === "growth"
              ? "growth"
              : "viralityScore";
      ranked.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
      ranked.forEach((r, i) => {
        r.rank = i + 1;
      });

      return {
        hasData: true,
        rankings: ranked.slice(0, input.limit),
        sortBy: input.sortBy,
        warnings: [],
      };
    }),

  /**
   * 콘텐츠 랭킹 — 상위 영상/포스트 + engagement score
   */
  contentRanking: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        days: z.number().min(1).max(90).default(30),
        sortBy: z
          .enum(["views", "likes", "comments", "engagement"])
          .default("views"),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const startDate = new Date(todayDate());
      startDate.setDate(startDate.getDate() - input.days);

      const contents = await ctx.db.content.findMany({
        where: {
          channel: { projectId: input.projectId },
          publishedAt: { gte: startDate },
        },
        include: {
          metrics: { orderBy: { date: "desc" }, take: 1 },
          channel: { select: { name: true, platform: true } },
        },
        take: 100,
      });

      if (contents.length === 0) {
        return {
          hasData: false,
          rankings: [],
          warnings: ["이 기간에 콘텐츠가 아직 없어요."],
        };
      }

      const ranked = contents.map((c) => {
        const m = c.metrics[0];
        const views = Number(m?.viewCount ?? 0);
        const likes = m?.likeCount ?? 0;
        const comments = m?.commentCount ?? 0;
        const shares = m?.shareCount ?? 0;
        const engagementRate = m?.engagementRate ?? 0;
        const engagementScore =
          views > 0
            ? Math.round(
                ((likes + comments * 2 + shares * 3) / views) * 10000,
              ) / 100
            : 0;

        return {
          id: c.id,
          title: c.title,
          url: c.url,
          thumbnailUrl: c.thumbnailUrl,
          platform: c.channel?.platform ?? c.platform,
          channelName: c.channel?.name ?? "",
          publishedAt: c.publishedAt?.toISOString() ?? "",
          views,
          likes,
          comments,
          shares,
          engagementRate,
          engagementScore,
          rank: 0,
        };
      });

      const sortKey =
        input.sortBy === "views"
          ? "views"
          : input.sortBy === "likes"
            ? "likes"
            : input.sortBy === "comments"
              ? "comments"
              : "engagementScore";
      ranked.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
      ranked.forEach((r, i) => {
        r.rank = i + 1;
      });

      return {
        hasData: true,
        rankings: ranked.slice(0, input.limit),
        sortBy: input.sortBy,
        warnings: [],
      };
    }),

  /**
   * 원문/근거 상세 조회 — drill-down용 raw mention 리스트
   */
  rawMentions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
        platform: z.string().optional(),
        sentiment: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const startDate = new Date(todayDate());
      startDate.setDate(startDate.getDate() - input.days);

      const where: any = {
        matchedKeyword: input.keyword,
        publishedAt: { gte: startDate },
      };
      if (input.platform) where.platform = input.platform;
      if (input.sentiment) where.sentiment = input.sentiment;

      const [mentions, total] = await Promise.all([
        ctx.db.rawSocialMention.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip: input.offset,
          take: input.limit,
          select: {
            id: true,
            platform: true,
            text: true,
            authorName: true,
            authorHandle: true,
            postUrl: true,
            publishedAt: true,
            sentiment: true,
            topics: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            shareCount: true,
          },
        }),
        ctx.db.rawSocialMention.count({ where }),
      ]);

      return {
        hasData: mentions.length > 0,
        mentions: mentions.map((m: any) => ({
          id: m.id,
          platform: m.platform,
          text: m.text,
          authorName: m.authorName,
          authorHandle: m.authorHandle,
          url: m.postUrl,
          publishedAt: m.publishedAt?.toISOString(),
          sentiment: m.sentiment,
          topics: m.topics ?? [],
          engagement: {
            views: m.viewCount ?? 0,
            likes: m.likeCount ?? 0,
            comments: m.commentCount ?? 0,
            shares: m.shareCount ?? 0,
          },
        })),
        total,
        page: Math.floor(input.offset / input.limit) + 1,
        totalPages: Math.ceil(total / input.limit),
        warnings:
          mentions.length === 0 ? ["조건에 맞는 원문이 아직 없어요."] : [],
      };
    }),

  /**
   * 데이터 내보내기 — CSV 형태로 집계 데이터 반환
   */
  exportData: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        type: z.enum([
          "mention_trend",
          "channel_trend",
          "youtube_summary",
          "benchmark_trend",
        ]),
        days: z.number().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = "";

      if (input.type === "mention_trend") {
        const snapshots = await ctx.db.socialMentionSnapshot.findMany({
          where: {
            projectId: input.projectId,
            keyword: input.keyword,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        });
        headers = [
          "날짜",
          "전체",
          "긍정",
          "중립",
          "부정",
          "미분류",
          "반응수준",
        ];
        rows = snapshots.map((s: any) => [
          new Date(s.date).toISOString().split("T")[0],
          String(s.totalCount),
          String(s.positiveCount),
          String(s.neutralCount),
          String(s.negativeCount),
          String(s.unclassifiedCount ?? 0),
          s.buzzLevel,
        ]);
        filename = `${input.keyword}_소셜반응추이_${input.days}일`;
      } else if (input.type === "channel_trend") {
        const mentions = await ctx.db.rawSocialMention.findMany({
          where: {
            matchedKeyword: input.keyword,
            publishedAt: { gte: startDate, lte: endDate },
          },
          select: { platform: true, publishedAt: true, sentiment: true },
        });
        headers = ["날짜", "채널", "감성"];
        rows = mentions.map((m: any) => [
          new Date(m.publishedAt).toISOString().split("T")[0],
          m.platform,
          m.sentiment ?? "UNCLASSIFIED",
        ]);
        filename = `${input.keyword}_채널별추이_${input.days}일`;
      } else if (input.type === "youtube_summary") {
        const mentions = await ctx.db.rawSocialMention.findMany({
          where: {
            matchedKeyword: input.keyword,
            platform: "YOUTUBE",
            publishedAt: { gte: startDate, lte: endDate },
          },
          select: {
            text: true,
            authorName: true,
            viewCount: true,
            likeCount: true,
            commentCount: true,
            publishedAt: true,
            sentiment: true,
          },
          orderBy: { publishedAt: "desc" },
        });
        headers = [
          "날짜",
          "내용",
          "작성자",
          "조회수",
          "좋아요",
          "댓글수",
          "감성",
        ];
        rows = mentions.map((m: any) => [
          new Date(m.publishedAt).toISOString().split("T")[0],
          (m.text ?? "").slice(0, 200),
          m.authorName ?? "",
          String(m.viewCount ?? 0),
          String(m.likeCount ?? 0),
          String(m.commentCount ?? 0),
          m.sentiment ?? "UNCLASSIFIED",
        ]);
        filename = `${input.keyword}_YouTube분석_${input.days}일`;
      } else if (input.type === "benchmark_trend") {
        const snapshots = await ctx.db.benchmarkSnapshot.findMany({
          where: {
            projectId: input.projectId,
            keyword: input.keyword,
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        });
        headers = ["날짜", "전체점수"];
        rows = snapshots.map((s: any) => [
          new Date(s.date).toISOString().split("T")[0] ?? "",
          String(s.overallScore),
        ]);
        filename = `${input.keyword}_기준비교추이_${input.days}일`;
      }

      // Build CSV string
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      return {
        csv,
        filename: `${filename}.csv`,
        headers,
        rowCount: rows.length,
      };
    }),

  // ─── Hourly Trend + Spike Detection + Issue Timeline ────────

  /**
   * 시간별 추이 — hourly granularity + spike detection
   */
  hourlyTrend: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        hours: z.number().min(1).max(168).default(24), // max 7 days
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = new Date();
      const startDate = new Date(
        endDate.getTime() - input.hours * 60 * 60 * 1000,
      );

      const mentions = await ctx.db.rawSocialMention.findMany({
        where: {
          matchedKeyword: input.keyword,
          publishedAt: { gte: startDate, lte: endDate },
        },
        select: { publishedAt: true, platform: true, sentiment: true },
      });

      if (mentions.length === 0) {
        return {
          hasData: false,
          dataPoints: [],
          spikes: [],
          warnings: ["이 기간에 시간별 데이터가 아직 없어요."],
        };
      }

      // Group by hour
      type HourBucket = {
        hour: string; // ISO hour "2026-03-16T14"
        count: number;
        positive: number;
        negative: number;
        platforms: Record<string, number>;
      };

      const buckets = new Map<string, HourBucket>();

      for (const m of mentions) {
        const d = new Date(m.publishedAt);
        const hourKey = d.toISOString().slice(0, 13); // "2026-03-16T14"

        const b = buckets.get(hourKey) ?? {
          hour: hourKey,
          count: 0,
          positive: 0,
          negative: 0,
          platforms: {},
        };
        b.count++;
        if (m.sentiment === "POSITIVE") b.positive++;
        if (m.sentiment === "NEGATIVE") b.negative++;
        const plat = m.platform as string;
        b.platforms[plat] = (b.platforms[plat] ?? 0) + 1;
        buckets.set(hourKey, b);
      }

      const dataPoints = [...buckets.values()].sort((a, b) =>
        a.hour.localeCompare(b.hour),
      );

      // Spike detection: points > mean + 2*stddev
      const counts = dataPoints.map((d) => d.count);
      const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const stddev = Math.sqrt(
        counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length,
      );
      const spikeThreshold = mean + 2 * stddev;

      const spikes = dataPoints
        .filter((d) => d.count > spikeThreshold && d.count > 3) // min 3 to avoid noise
        .map((d) => ({
          hour: d.hour,
          count: d.count,
          ratio: mean > 0 ? Math.round((d.count / mean) * 10) / 10 : 0,
          label: `${d.hour.slice(11, 13)}시 — 평균 대비 ${mean > 0 ? Math.round((d.count / mean) * 100) : 0}%`,
        }));

      return {
        hasData: true,
        dataPoints: dataPoints.map((d) => ({
          hour: d.hour,
          label: `${d.hour.slice(11, 13)}시`,
          count: d.count,
          positive: d.positive,
          negative: d.negative,
          isSpike: d.count > spikeThreshold,
        })),
        spikes,
        stats: {
          mean: Math.round(mean * 10) / 10,
          spikeThreshold: Math.round(spikeThreshold * 10) / 10,
          totalMentions: mentions.length,
          peakHour:
            dataPoints.length > 0
              ? dataPoints.reduce(
                  (max, d) => (d.count > max.count ? d : max),
                  dataPoints[0]!,
                ).hour
              : null,
        },
        warnings: [],
      };
    }),

  /**
   * 이슈 히스토리 — 급상승/급감 이벤트 타임라인
   */
  issueTimeline: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const endDate = todayDate();
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - input.days);

      // Daily snapshots for trend
      const snapshots = await ctx.db.socialMentionSnapshot.findMany({
        where: {
          projectId: input.projectId,
          keyword: input.keyword,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: "asc" },
      });

      if (snapshots.length < 2) {
        return {
          hasData: false,
          events: [],
          warnings: ["이슈 히스토리를 보려면 최소 2일 이상 데이터가 필요해요."],
        };
      }

      // Detect day-over-day changes
      type IssueEvent = {
        date: string;
        type: "spike" | "drop" | "sentiment_shift" | "new_peak";
        title: string;
        description: string;
        severity: "high" | "medium" | "low";
        value: number;
        previousValue: number;
      };

      const events: IssueEvent[] = [];
      let allTimePeak = 0;

      for (let i = 1; i < snapshots.length; i++) {
        const prev = snapshots[i - 1]!;
        const curr = snapshots[i]!;
        const dateStr = new Date(curr.date).toISOString().split("T")[0]!;
        const prevCount = prev.totalCount;
        const currCount = curr.totalCount;

        // Spike: >100% increase
        if (prevCount > 0 && currCount > prevCount * 2) {
          events.push({
            date: dateStr,
            type: "spike",
            title: "반응 급증",
            description: `${prevCount}건 → ${currCount}건 (${Math.round((currCount / prevCount - 1) * 100)}% 증가)`,
            severity: currCount > prevCount * 3 ? "high" : "medium",
            value: currCount,
            previousValue: prevCount,
          });
        }

        // Drop: >50% decrease
        if (prevCount > 5 && currCount < prevCount * 0.5) {
          events.push({
            date: dateStr,
            type: "drop",
            title: "반응 급감",
            description: `${prevCount}건 → ${currCount}건 (${Math.round((1 - currCount / prevCount) * 100)}% 감소)`,
            severity: currCount < prevCount * 0.25 ? "high" : "medium",
            value: currCount,
            previousValue: prevCount,
          });
        }

        // Sentiment shift: negative ratio change >20pp
        const prevNegRatio =
          prev.totalCount > 0 ? prev.negativeCount / prev.totalCount : 0;
        const currNegRatio =
          curr.totalCount > 0 ? curr.negativeCount / curr.totalCount : 0;
        if (
          Math.abs(currNegRatio - prevNegRatio) > 0.2 &&
          curr.totalCount >= 5
        ) {
          events.push({
            date: dateStr,
            type: "sentiment_shift",
            title:
              currNegRatio > prevNegRatio ? "부정 반응 증가" : "부정 반응 감소",
            description: `부정 비율 ${Math.round(prevNegRatio * 100)}% → ${Math.round(currNegRatio * 100)}%`,
            severity:
              Math.abs(currNegRatio - prevNegRatio) > 0.3 ? "high" : "low",
            value: Math.round(currNegRatio * 100),
            previousValue: Math.round(prevNegRatio * 100),
          });
        }

        // New all-time peak
        if (currCount > allTimePeak && currCount > 10) {
          allTimePeak = currCount;
          events.push({
            date: dateStr,
            type: "new_peak",
            title: "최고 반응 기록",
            description: `${currCount}건으로 이 기간 최고치를 기록했어요`,
            severity: "medium",
            value: currCount,
            previousValue: prevCount,
          });
        }
      }

      return {
        hasData: true,
        events: events.sort((a, b) => b.date.localeCompare(a.date)), // newest first
        totalEvents: events.length,
        warnings: [],
      };
    }),

  // ─── Keyword History & Bookmarks ────────────────────────────

  /**
   * 최근 분석 키워드 + 저장된 키워드 목록 조회
   */
  keywords: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filter: z.enum(["all", "saved", "recent"]).default("all"),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const where: any = {
        projectId: input.projectId,
        userId: ctx.userId,
      };
      if (input.filter === "saved") {
        where.isSaved = true;
      }

      const keywords = await (ctx.db as any).intelligenceKeyword.findMany({
        where,
        orderBy:
          input.filter === "saved"
            ? { updatedAt: "desc" }
            : { lastAnalyzedAt: "desc" },
        take: input.limit,
      });

      return {
        keywords: keywords.map((k: any) => ({
          id: k.id,
          keyword: k.keyword,
          industryType: k.industryType,
          industryLabel: k.industryLabel,
          isSaved: k.isSaved,
          analysisCount: k.analysisCount,
          lastConfidence: k.lastConfidence,
          lastFreshness: k.lastFreshness,
          lastSignalHint: k.lastSignalHint,
          lastAnalyzedAt: k.lastAnalyzedAt,
        })),
        totalCount: keywords.length,
      };
    }),

  /**
   * 키워드 분석 기록 upsert (분석 실행 시 자동 호출용)
   */
  recordKeyword: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
        industryType: z.string().optional(),
        industryLabel: z.string().optional(),
        confidence: z.number().optional(),
        freshness: z.string().optional(),
        signalHint: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      const result = await (ctx.db as any).intelligenceKeyword.upsert({
        where: {
          projectId_userId_keyword: {
            projectId: input.projectId,
            userId: ctx.userId,
            keyword: input.keyword,
          },
        },
        update: {
          industryType: input.industryType,
          industryLabel: input.industryLabel,
          lastConfidence: input.confidence,
          lastFreshness: input.freshness,
          lastSignalHint: input.signalHint,
          lastAnalyzedAt: new Date(),
          analysisCount: { increment: 1 },
        },
        create: {
          projectId: input.projectId,
          userId: ctx.userId,
          keyword: input.keyword,
          industryType: input.industryType,
          industryLabel: input.industryLabel,
          lastConfidence: input.confidence,
          lastFreshness: input.freshness,
          lastSignalHint: input.signalHint,
        },
      });

      return { id: result.id, analysisCount: result.analysisCount };
    }),

  /**
   * 키워드 북마크 토글
   */
  toggleSaveKeyword: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.db, ctx.userId, input.projectId);

      // Find existing
      const existing = await (ctx.db as any).intelligenceKeyword.findUnique({
        where: {
          projectId_userId_keyword: {
            projectId: input.projectId,
            userId: ctx.userId,
            keyword: input.keyword,
          },
        },
      });

      if (existing) {
        const updated = await (ctx.db as any).intelligenceKeyword.update({
          where: { id: existing.id },
          data: { isSaved: !existing.isSaved },
        });
        return { id: updated.id, isSaved: updated.isSaved };
      }

      // Create new saved keyword
      const created = await (ctx.db as any).intelligenceKeyword.create({
        data: {
          projectId: input.projectId,
          userId: ctx.userId,
          keyword: input.keyword,
          isSaved: true,
          analysisCount: 0,
        },
      });
      return { id: created.id, isSaved: created.isSaved };
    }),

  /** LLM 기반 인사이트 해석 */
  interpret: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "intelligence_summary",
          "cluster_analysis",
          "persona_analysis",
          "journey_analysis",
          "trend_change",
          "competitor_comparison",
          "demographic_analysis",
        ]),
        keyword: z.string(),
        data: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ input }) => {
      const { InsightInterpreterService } = await import("@x2/ai");
      const interpreter = new InsightInterpreterService();
      return interpreter.interpret({
        type: input.type,
        keyword: input.keyword,
        data: input.data,
      });
    }),

  /**
   * 신규/급상승 키워드 탐지.
   * 최근 기간에 새로 등장하거나 급격히 증가한 연관 키워드를 탐지.
   */
  emergingKeywords: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        keyword: z.string(),
        currentDays: z.number().min(1).max(30).default(7),
        previousDays: z.number().min(1).max(30).default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const currentStart = new Date(now);
      currentStart.setDate(currentStart.getDate() - input.currentDays);
      const previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - input.previousDays);

      // Current period topics
      const currentMentions = await ctx.db.rawSocialMention.findMany({
        where: {
          projectId: input.projectId,
          matchedKeyword: input.keyword,
          publishedAt: { gte: currentStart },
          topics: { isEmpty: false },
        },
        select: { topics: true },
      });

      // Previous period topics
      const previousMentions = await ctx.db.rawSocialMention.findMany({
        where: {
          projectId: input.projectId,
          matchedKeyword: input.keyword,
          publishedAt: { gte: previousStart, lt: currentStart },
          topics: { isEmpty: false },
        },
        select: { topics: true },
      });

      // Count topics
      const currentTopics = new Map<string, number>();
      for (const m of currentMentions) {
        for (const t of m.topics) {
          currentTopics.set(t, (currentTopics.get(t) ?? 0) + 1);
        }
      }

      const previousTopics = new Map<string, number>();
      for (const m of previousMentions) {
        for (const t of m.topics) {
          previousTopics.set(t, (previousTopics.get(t) ?? 0) + 1);
        }
      }

      // Classify: new, surging, rising, stable, declining, gone
      type EmergingKeyword = {
        keyword: string;
        currentCount: number;
        previousCount: number;
        changeRate: number; // %
        status: "new" | "surging" | "rising" | "stable" | "declining" | "gone";
      };

      const results: EmergingKeyword[] = [];

      // Check current topics
      for (const [topic, count] of currentTopics) {
        const prev = previousTopics.get(topic) ?? 0;
        let status: EmergingKeyword["status"];
        let changeRate: number;

        if (prev === 0) {
          status = "new";
          changeRate = 100;
        } else {
          changeRate = Math.round(((count - prev) / prev) * 100);
          if (changeRate >= 200) status = "surging";
          else if (changeRate >= 50) status = "rising";
          else if (changeRate >= -20) status = "stable";
          else status = "declining";
        }

        results.push({
          keyword: topic,
          currentCount: count,
          previousCount: prev,
          changeRate,
          status,
        });
      }

      // Check gone topics
      for (const [topic, count] of previousTopics) {
        if (!currentTopics.has(topic)) {
          results.push({
            keyword: topic,
            currentCount: 0,
            previousCount: count,
            changeRate: -100,
            status: "gone",
          });
        }
      }

      // Sort: new/surging first, then by change rate
      const statusOrder = {
        new: 0,
        surging: 1,
        rising: 2,
        stable: 3,
        declining: 4,
        gone: 5,
      };
      results.sort(
        (a, b) =>
          statusOrder[a.status] - statusOrder[b.status] ||
          b.changeRate - a.changeRate,
      );

      const newKeywords = results.filter((r) => r.status === "new");
      const surgingKeywords = results.filter((r) => r.status === "surging");
      const risingKeywords = results.filter((r) => r.status === "rising");
      const decliningKeywords = results.filter(
        (r) => r.status === "declining" || r.status === "gone",
      );

      return {
        keyword: input.keyword,
        period: {
          currentDays: input.currentDays,
          previousDays: input.previousDays,
        },
        hasData: currentMentions.length > 0 || previousMentions.length > 0,
        summary: {
          totalCurrent: currentTopics.size,
          totalPrevious: previousTopics.size,
          newCount: newKeywords.length,
          surgingCount: surgingKeywords.length,
          risingCount: risingKeywords.length,
          decliningCount: decliningKeywords.length,
        },
        newKeywords: newKeywords.slice(0, 20),
        surgingKeywords: surgingKeywords.slice(0, 20),
        risingKeywords: risingKeywords.slice(0, 20),
        decliningKeywords: decliningKeywords.slice(0, 20),
        allKeywords: results.slice(0, 50),
      };
    }),
});
