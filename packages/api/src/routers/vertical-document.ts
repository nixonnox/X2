/**
 * Vertical Document Router
 *
 * 업종별 문서 생성 / 프리뷰 / export를 위한 tRPC 라우터.
 *
 * 엔드포인트:
 * 1. suggestIndustry — seedKeyword 기반 업종 자동 추론
 * 2. generate — 업종별 문서 생성 (WorkDoc/PT/GeneratedDocument + vertical 조립)
 * 3. generateAndExport — 문서 생성 + Word/PPT/PDF export 한번에
 * 4. comparisonPreview — 4개 업종 비교 프리뷰
 * 5. exportFormatPreview — 특정 업종 × 형식 export 프리뷰
 * 6. listIndustries — 지원 업종 목록
 */

import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

// ─── Zod Schemas ──────────────────────────────────────────────────

const industryTypeSchema = z.enum([
  "BEAUTY",
  "FNB",
  "FINANCE",
  "ENTERTAINMENT",
]);
const exportFormatSchema = z.enum(["WORD", "PPT", "PDF"]);
const outputTypeSchema = z.enum(["WORKDOC", "PT_DECK", "GENERATED_DOCUMENT"]);

const searchResultSchema = z.object({
  seedKeyword: z.string(),
  analyzedAt: z.string(),
  trace: z.object({
    confidence: z.number(),
    freshness: z.string().optional(),
    sourceSummary: z
      .array(
        z.object({
          name: z.string(),
          status: z.string(),
          itemCount: z.number().optional(),
          latencyMs: z.number().optional(),
        }),
      )
      .optional(),
  }),
  cluster: z
    .object({ success: z.boolean(), data: z.unknown().optional() })
    .optional(),
  pathfinder: z
    .object({ success: z.boolean(), data: z.unknown().optional() })
    .optional(),
  roadview: z
    .object({ success: z.boolean(), data: z.unknown().optional() })
    .optional(),
  persona: z
    .object({ success: z.boolean(), data: z.unknown().optional() })
    .optional(),
});

const qualitySchema = z.object({
  level: z.enum(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT"]),
  confidence: z.number(),
  freshness: z.enum(["fresh", "recent", "stale"]).optional(),
  isPartial: z.boolean().optional(),
  isMockOnly: z.boolean().optional(),
  warnings: z.array(z.string()).optional(),
});

const evidenceItemSchema = z.object({
  category: z.string(),
  label: z.string(),
  dataSourceType: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
  displayType: z.string().optional(),
  summary: z.string().optional(),
  data: z.unknown().optional(),
});

const insightSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  confidence: z.number().optional(),
  evidenceRefs: z.array(z.object({ category: z.string() })).optional(),
});

const actionSchema = z.object({
  id: z.string().optional(),
  action: z.string(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
  owner: z.string().optional(),
  rationale: z.string().optional(),
});

const toneSchema = z
  .enum(["REPORT", "MESSENGER", "MEETING_BULLET", "FORMAL"])
  .optional();

// ─── Router ───────────────────────────────────────────────────────

export const verticalDocumentRouter = router({
  /**
   * 업종 자동 추론
   */
  suggestIndustry: protectedProcedure
    .input(
      z.object({
        seedKeyword: z.string(),
        clusterTopics: z.array(z.string()).optional(),
        category: z.string().optional(),
        relatedKeywords: z.array(z.string()).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.verticalDocumentIntegration.suggestIndustry(input);
    }),

  /**
   * 업종별 문서 생성
   */
  generate: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema.optional(),
        result: searchResultSchema,
        quality: qualitySchema,
        evidenceItems: z.array(evidenceItemSchema),
        insights: z.array(insightSchema),
        actions: z.array(actionSchema),
        outputType: outputTypeSchema,
        audience: z.string(),
        tone: toneSchema,
        relatedKeywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        clusterTopics: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.services.verticalDocumentIntegration.generate(input);
    }),

  /**
   * 문서 생성 + export (한번에)
   */
  generateAndExport: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema.optional(),
        result: searchResultSchema,
        quality: qualitySchema,
        evidenceItems: z.array(evidenceItemSchema),
        insights: z.array(insightSchema),
        actions: z.array(actionSchema),
        outputType: outputTypeSchema,
        audience: z.string(),
        tone: toneSchema,
        exportFormat: exportFormatSchema,
        purpose: z.string(),
        relatedKeywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        clusterTopics: z.array(z.string()).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { exportFormat, purpose, ...docInput } = input;
      return ctx.services.verticalDocumentIntegration.generateAndExport(
        docInput,
        exportFormat,
        purpose as any,
      );
    }),

  /**
   * 4개 업종 비교 프리뷰
   */
  comparisonPreview: protectedProcedure
    .input(
      z.object({
        result: searchResultSchema,
        quality: qualitySchema,
        evidenceItems: z.array(evidenceItemSchema),
        insights: z.array(insightSchema),
        actions: z.array(actionSchema),
        outputType: outputTypeSchema,
        audience: z.string(),
        relatedKeywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        clusterTopics: z.array(z.string()).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.verticalDocumentIntegration.buildComparisonPreview(
        input,
      );
    }),

  /**
   * 특정 업종 × 형식 export 프리뷰
   */
  exportFormatPreview: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema,
        format: exportFormatSchema,
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.verticalDocumentIntegration.buildExportFormatPreview(
        input.industryType,
        input.format,
      );
    }),

  /**
   * 지원 업종 목록
   */
  listIndustries: protectedProcedure.query(({ ctx }) => {
    const industries =
      ctx.services.verticalDocumentIntegration.listIndustries();
    const templates = ctx.services.verticalTemplateRegistry.listTemplates();
    return templates.map((t) => ({
      industryType: t.industryType,
      label: t.label,
      description: t.description,
      supportedOutputTypes: t.supportedOutputTypes,
    }));
  }),

  /**
   * 업종 적용 — 선택 업종 기준 문서 조립 + 블록 구조 반환
   * End-to-end 흐름: seedKeyword 입력 → 업종 추천/선택 → apply → 결과 렌더링
   */
  applyIndustry: protectedProcedure
    .input(
      z.object({
        seedKeyword: z.string(),
        selectedIndustry: industryTypeSchema.optional(),
        outputType: outputTypeSchema,
        audience: z.string().default("OPERATIONS"),
        tone: toneSchema,
        // 검색 결과 (있으면)
        result: searchResultSchema.optional(),
        quality: qualitySchema.optional(),
        evidenceItems: z.array(evidenceItemSchema).optional(),
        insights: z.array(insightSchema).optional(),
        actions: z.array(actionSchema).optional(),
        // 업종 추론 보조
        relatedKeywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        clusterTopics: z.array(z.string()).optional(),
        // 소셜/댓글 데이터 (있으면)
        socialData: z
          .object({
            sentiment: z
              .object({
                total: z.number(),
                positive: z.number(),
                neutral: z.number(),
                negative: z.number(),
                topNegativeTopics: z.array(z.string()),
                topPositiveTopics: z.array(z.string()),
              })
              .optional(),
            commentTopics: z
              .array(
                z.object({
                  topic: z.string(),
                  count: z.number(),
                  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
                  isQuestion: z.boolean(),
                  isRisk: z.boolean(),
                  riskLevel: z
                    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
                    .optional(),
                }),
              )
              .optional(),
            recentMentions: z
              .array(
                z.object({
                  platform: z.string(),
                  text: z.string(),
                  sentiment: z.string(),
                  topics: z.array(z.string()),
                  engagementRate: z.number(),
                  publishedAt: z.string(),
                }),
              )
              .optional(),
          })
          .optional(),
        // 벤치마크 실측값 (있으면)
        measuredMetrics: z.record(z.number()).optional(),
        // 프리뷰 모드
        previewMode: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) => {
      // 1. 업종 추론
      const suggestion =
        ctx.services.verticalDocumentIntegration.suggestIndustry({
          seedKeyword: input.seedKeyword,
          clusterTopics: input.clusterTopics,
          category: input.category,
          relatedKeywords: input.relatedKeywords,
        });

      const industryType =
        input.selectedIndustry ??
        suggestion.suggestedIndustry ??
        ("BEAUTY" as const);

      // 2. Signal Fusion — cluster/social/benchmark 시그널 통합
      //    검색 결과에서 cluster 데이터 추출
      const clusterData =
        input.result?.cluster?.success && input.result.cluster.data
          ? (
              input.result.cluster.data as Array<{
                clusterId: string;
                label: string;
                memberItems?: Array<{ text: string }>;
              }>
            ).map((c) => ({
              clusterId:
                c.clusterId ??
                `cluster-${Math.random().toString(36).slice(2, 8)}`,
              label: c.label ?? "",
              memberTexts: (c.memberItems ?? []).map((m) => m.text ?? ""),
            }))
          : undefined;

      // 3. measuredMetrics 자동 산출 (미제공 시)
      const autoMetrics: Record<string, number> = {};
      if (clusterData && clusterData.length > 0) {
        autoMetrics.avgClusterCount = clusterData.length;

        // FAQ 패턴 감지 (질문형 클러스터 비율)
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
        const faqClusters = clusterData.filter((c) =>
          faqPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        if (clusterData.length > 0) {
          autoMetrics.faqFrequency = faqClusters.length / clusterData.length;
        }

        // 비교 클러스터 비율
        const comparisonPatterns = ["비교", "vs", "차이", "대", "어디", "뭐가"];
        const compClusters = clusterData.filter((c) =>
          comparisonPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        if (clusterData.length > 0) {
          autoMetrics.comparisonClusterRatio =
            compClusters.length / clusterData.length;
          autoMetrics.comparisonSearchRate =
            compClusters.length / clusterData.length;
        }

        // 리뷰 관련 비율
        const reviewPatterns = ["후기", "리뷰", "사용감", "평가", "추천"];
        const reviewClusters = clusterData.filter((c) =>
          reviewPatterns.some(
            (p) =>
              c.label.includes(p) || c.memberTexts.some((t) => t.includes(p)),
          ),
        );
        if (clusterData.length > 0) {
          autoMetrics.reviewMentionRate =
            reviewClusters.length / clusterData.length;
          autoMetrics.reviewInfluenceRate =
            reviewClusters.length / clusterData.length;
        }
      }

      const finalMetrics = input.measuredMetrics
        ? { ...autoMetrics, ...input.measuredMetrics } // 명시적 값이 자동 산출값을 덮어씀
        : Object.keys(autoMetrics).length > 0
          ? autoMetrics
          : undefined;

      const fusionResult = ctx.services.verticalSignalFusion.fuse({
        industryType,
        clusters: clusterData,
        socialData: input.socialData,
        measuredMetrics: finalMetrics,
      });

      // 3. 실제 문서 생성 — fusion 결과를 evidence/insight에 주입
      const baseEvidence = input.evidenceItems ?? [];
      const baseInsights = input.insights ?? [];

      // fusion에서 나온 추가 evidence를 evidence 입력에 병합
      const fusedEvidence = [
        ...baseEvidence,
        ...fusionResult.additionalEvidence.map((e) => ({
          category: e.category,
          label: e.label,
          summary: e.summary,
          dataSourceType: e.dataSourceType,
          data: e.data,
        })),
      ];

      // fusion에서 나온 추가 insight를 insight 입력에 병합
      const fusedInsights = [
        ...baseInsights,
        ...fusionResult.additionalInsights.map((ins) => ({
          type: ins.type,
          title: ins.title,
          description: ins.description,
          confidence: ins.confidence,
        })),
      ];

      const generateInput = {
        industryType,
        result: input.result ?? {
          seedKeyword: input.seedKeyword,
          analyzedAt: new Date().toISOString(),
          trace: { confidence: 0.7, freshness: "fresh" },
        },
        quality: input.quality ?? {
          level: "MEDIUM" as const,
          confidence: 0.7,
          freshness: "fresh" as const,
          isMockOnly: !input.result,
        },
        evidenceItems: fusedEvidence,
        insights: fusedInsights,
        actions: input.actions ?? [],
        outputType: input.outputType,
        audience: input.audience,
        tone: input.tone,
        relatedKeywords: input.relatedKeywords,
        category: input.category,
        clusterTopics: input.clusterTopics,
      };

      const docResult =
        ctx.services.verticalDocumentIntegration.generate(generateInput);

      // 4. 블록 구조화 — emphasis를 blockConfigs에서 가져와 각 섹션에 부착
      const { verticalResult } = docResult;
      const template = verticalResult.appliedTemplate;

      const blockConfigMap = new Map<string, string>();
      for (const bc of template.blockConfigs) {
        blockConfigMap.set(bc.blockType, bc.emphasis);
      }

      // 5. Taxonomy 태그 부착 — CLUSTER 블록에 매핑된 taxonomy 카테고리 표시
      const taxonomyMap = new Map<string, string[]>();
      if (fusionResult.taxonomyMapping) {
        for (const mapping of fusionResult.taxonomyMapping.mappings) {
          if (!mapping.isUnmapped && mapping.bestMatch) {
            taxonomyMap.set(
              mapping.clusterLabel,
              mapping.matches.map((m) => m.category),
            );
          }
        }
      }

      const enrichedSections = verticalResult.sections.map((s) => {
        const base = {
          ...s,
          emphasis: blockConfigMap.get(s.blockType) ?? "OPTIONAL",
        };

        // CLUSTER 블록에 taxonomy 태그 부착
        if (s.blockType === "CLUSTER") {
          const taxonomyCategories = taxonomyMap.get(s.title) ?? [];
          // title에 매칭이 안 되면 전체 taxonomy 커버리지 요약을 부착
          const coveredCategories = fusionResult.taxonomyMapping
            ? Object.entries(fusionResult.taxonomyMapping.taxonomyCoverage)
                .filter(([, count]) => count > 0)
                .map(([cat]) => cat)
            : [];
          return {
            ...base,
            taxonomyTags:
              taxonomyCategories.length > 0
                ? taxonomyCategories
                : coveredCategories,
            taxonomyCoverage: fusionResult.taxonomyMapping?.taxonomyCoverage,
          };
        }

        return base;
      });

      const summaryBlocks = enrichedSections.filter(
        (s) => s.blockType === "QUICK_SUMMARY" || s.blockType === "KEY_FINDING",
      );
      const evidenceBlocks = enrichedSections.filter(
        (s) => s.blockType === "EVIDENCE",
      );
      const actionBlocks = enrichedSections.filter(
        (s) => s.blockType === "ACTION",
      );
      const warningBlocks = enrichedSections.filter(
        (s) => s.blockType === "RISK_NOTE",
      );
      const dataBlocks = enrichedSections.filter((s) =>
        [
          "PERSONA",
          "CLUSTER",
          "PATH",
          "ROAD_STAGE",
          "FAQ",
          "COMPARISON",
        ].includes(s.blockType),
      );

      // 6. Benchmark 비교 데이터 가져오기
      const benchmarkBaseline =
        ctx.services.benchmarkBaseline.getBaseline(industryType);
      const benchmarkRecord =
        ctx.services.benchmarkBaseline.getBaselineRecord(industryType);

      // fusion 경고 + vertical 경고 병합
      const allWarnings = [
        ...verticalResult.additionalWarnings,
        ...fusionResult.additionalWarnings,
      ];

      return {
        selectedIndustry: docResult.industry,
        industryLabel: template.label,
        recommendedIndustry: suggestion.suggestedIndustry,
        suggestion,
        outputType: input.outputType,
        audience: input.audience,
        // 블록별 구조화
        summaryBlocks,
        evidenceBlocks,
        actionBlocks,
        warningBlocks,
        dataBlocks,
        allSections: enrichedSections,
        // 정책 결과
        insightMappings: verticalResult.insightMappings,
        actionMappings: verticalResult.actionMappings,
        evidencePolicy: verticalResult.evidencePolicy,
        additionalWarnings: allWarnings,
        // Intelligence Enhancement 결과
        intelligence: {
          // taxonomy 매핑 요약
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
          // benchmark 기준
          benchmarkBaseline: benchmarkBaseline.map((m) => ({
            key: m.key,
            label: m.label,
            value: m.value,
            unit: m.unit,
            description: m.description,
          })),
          benchmarkRecord,
          // benchmark 비교 결과 (측정값이 있으면)
          benchmarkComparison: fusionResult.benchmarkComparison
            ? {
                overallScore: fusionResult.benchmarkComparison.overallScore,
                highlights: fusionResult.benchmarkComparison.highlights,
                warnings: fusionResult.benchmarkComparison.warnings,
                comparisons: fusionResult.benchmarkComparison.comparisons,
              }
            : null,
          // social 통합 결과
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
          // 측정값 유무 (autoMetrics 또는 수동 입력)
          hasMetrics:
            finalMetrics !== undefined && Object.keys(finalMetrics).length > 0,
          // 시그널 품질
          signalQuality: fusionResult.signalQuality,
          // fusion에서 추가된 evidence/insight 수 (기존 대비 증가량)
          fusedEvidenceCount: fusionResult.additionalEvidence.length,
          fusedInsightCount: fusionResult.additionalInsights.length,
          fusedWarningCount: fusionResult.additionalWarnings.length,
        },
        // 메타데이터
        metadata: {
          confidence: generateInput.quality.confidence,
          freshness: generateInput.quality.freshness,
          isPartial: generateInput.quality.isPartial ?? false,
          isMockOnly: generateInput.quality.isMockOnly ?? false,
          isStaleBased: generateInput.quality.freshness === "stale",
          templateId: template.id,
          toneStyle: template.toneGuideline.defaultTone,
          actionToneStyle: template.actionPolicy.actionToneStyle,
          evidenceThreshold: template.evidencePolicy.minConfidenceThreshold,
          staleAllowed: template.evidencePolicy.allowStaleData,
          blockCount: verticalResult.sections.length,
          warningCount: allWarnings.length,
        },
        generatedAt: docResult.generatedAt,
      };
    }),

  /**
   * 상세 4개 업종 비교 프리뷰 (QA/QC용)
   * — 실제 문서 생성 후 7개 항목 비교 + 차이점 분석 + ViewModel 반환
   */
  detailedComparison: protectedProcedure
    .input(
      z.object({
        result: searchResultSchema,
        quality: qualitySchema,
        evidenceItems: z.array(evidenceItemSchema),
        insights: z.array(insightSchema),
        actions: z.array(actionSchema),
        outputType: outputTypeSchema,
        audience: z.string(),
        tone: toneSchema,
        relatedKeywords: z.array(z.string()).optional(),
        category: z.string().optional(),
        clusterTopics: z.array(z.string()).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      // 1. 전체 프리뷰 파이프라인 실행
      const previewResult =
        ctx.services.verticalPreviewService.generatePreview(input);

      // 2. ViewModel 변환
      const viewModel =
        ctx.services.verticalPreviewViewModelBuilder.build(previewResult);

      return {
        raw: previewResult,
        viewModel,
      };
    }),

  /**
   * 시그널 퓨전 — cluster/social/benchmark 통합 분석
   * 업종별로 다른 해석을 제공
   */
  signalFusion: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema,
        clusters: z
          .array(
            z.object({
              clusterId: z.string(),
              label: z.string(),
              memberTexts: z.array(z.string()),
              score: z.number().optional(),
            }),
          )
          .optional(),
        socialData: z
          .object({
            sentiment: z
              .object({
                total: z.number(),
                positive: z.number(),
                neutral: z.number(),
                negative: z.number(),
                topNegativeTopics: z.array(z.string()),
                topPositiveTopics: z.array(z.string()),
              })
              .optional(),
            commentTopics: z
              .array(
                z.object({
                  topic: z.string(),
                  count: z.number(),
                  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
                  isQuestion: z.boolean(),
                  isRisk: z.boolean(),
                  riskLevel: z
                    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
                    .optional(),
                }),
              )
              .optional(),
            recentMentions: z
              .array(
                z.object({
                  platform: z.string(),
                  text: z.string(),
                  sentiment: z.string(),
                  topics: z.array(z.string()),
                  engagementRate: z.number(),
                  publishedAt: z.string(),
                }),
              )
              .optional(),
          })
          .optional(),
        measuredMetrics: z.record(z.number()).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.verticalSignalFusion.fuse({
        industryType: input.industryType,
        clusters: input.clusters,
        socialData: input.socialData,
        measuredMetrics: input.measuredMetrics,
      });
    }),

  /**
   * 업종별 벤치마크 기준 데이터 조회
   */
  benchmarkBaseline: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema,
      }),
    )
    .query(({ ctx, input }) => {
      return {
        metrics: ctx.services.benchmarkBaseline.getBaseline(input.industryType),
        record: ctx.services.benchmarkBaseline.getBaselineRecord(
          input.industryType,
        ),
      };
    }),

  /**
   * 클러스터 → 업종 topicTaxonomy 매핑
   */
  taxonomyMapping: protectedProcedure
    .input(
      z.object({
        industryType: industryTypeSchema,
        clusters: z.array(
          z.object({
            clusterId: z.string(),
            label: z.string(),
            memberTexts: z.array(z.string()),
            score: z.number().optional(),
          }),
        ),
      }),
    )
    .query(({ ctx, input }) => {
      return ctx.services.topicTaxonomyMapping.mapClusters(
        input.clusters,
        input.industryType,
      );
    }),
});
