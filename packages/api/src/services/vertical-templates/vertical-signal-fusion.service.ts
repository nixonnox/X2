/**
 * VerticalSignalFusionService
 *
 * cluster + social/comment + benchmark 시그널을 통합하여
 * vertical 파이프라인에 주입할 enriched input을 생성.
 *
 * 하는 일:
 * 1. cluster → topicTaxonomy 매핑 결과 반영
 * 2. social/comment → 업종별 evidence/insight/warning 변환
 * 3. benchmark → 비교 해석 추가
 * 4. 모든 시그널을 하나의 enriched input으로 통합
 */

import type { IndustryType } from "./types";
import {
  TopicTaxonomyMappingService,
  type ClusterInput,
  type TaxonomyMappingResult,
} from "./topic-taxonomy-mapping.service";
import {
  BenchmarkBaselineService,
  type BenchmarkComparisonResult,
} from "./benchmark-baseline.service";
import {
  VerticalSocialCommentIntegrationService,
  type SocialCommentData,
  type VerticalSocialIntegrationResult,
} from "./vertical-social-comment-integration.service";

// ─── Types ───────────────────────────────────────────────────────

export type SignalFusionInput = {
  industryType: IndustryType;
  /** 클러스터 결과 (있으면) */
  clusters?: ClusterInput[];
  /** 소셜/댓글 데이터 (있으면) */
  socialData?: SocialCommentData;
  /** 실제 분석에서 측정된 벤치마크 값 (있으면) */
  measuredMetrics?: Record<string, number>;
};

export type EnrichedEvidence = {
  category: string;
  label: string;
  summary: string;
  dataSourceType: string;
  data?: unknown;
};

export type EnrichedInsight = {
  type: string;
  title: string;
  description: string;
  confidence: number;
  source: string;
};

export type SignalFusionResult = {
  industryType: IndustryType;
  /** 추가할 evidence 항목들 */
  additionalEvidence: EnrichedEvidence[];
  /** 추가할 insight 항목들 */
  additionalInsights: EnrichedInsight[];
  /** 추가할 warning 메시지들 */
  additionalWarnings: string[];
  /** 각 시그널 소스의 결과 */
  taxonomyMapping: TaxonomyMappingResult | null;
  benchmarkComparison: BenchmarkComparisonResult | null;
  socialIntegration: VerticalSocialIntegrationResult | null;
  /** 시그널 품질 */
  signalQuality: {
    hasClusterData: boolean;
    hasSocialData: boolean;
    hasBenchmarkData: boolean;
    overallRichness: "RICH" | "MODERATE" | "MINIMAL";
  };
};

// ─── Service ─────────────────────────────────────────────────────

export class VerticalSignalFusionService {
  private taxonomyMapper = new TopicTaxonomyMappingService();
  private benchmarkService = new BenchmarkBaselineService();
  private socialIntegration = new VerticalSocialCommentIntegrationService();

  /**
   * 모든 시그널 소스를 통합하여 vertical 파이프라인용 enriched input 생성
   */
  fuse(input: SignalFusionInput): SignalFusionResult {
    const additionalEvidence: EnrichedEvidence[] = [];
    const additionalInsights: EnrichedInsight[] = [];
    const additionalWarnings: string[] = [];

    let taxonomyMapping: TaxonomyMappingResult | null = null;
    let benchmarkComparison: BenchmarkComparisonResult | null = null;
    let socialIntegration: VerticalSocialIntegrationResult | null = null;

    // 1. Cluster → TopicTaxonomy 매핑
    if (input.clusters?.length) {
      taxonomyMapping = this.taxonomyMapper.mapClusters(
        input.clusters,
        input.industryType,
      );

      // 매핑 결과를 evidence로 변환
      additionalEvidence.push({
        category: "cluster_taxonomy_mapping",
        label: "클러스터-업종분류 매핑",
        summary: this.buildTaxonomySummary(taxonomyMapping),
        dataSourceType: "cluster_taxonomy",
        data: {
          coverage: taxonomyMapping.taxonomyCoverage,
          unmappedCount: taxonomyMapping.unmappedCount,
        },
      });

      // 매핑된 카테고리 기반 인사이트
      const topCategories = Object.entries(taxonomyMapping.taxonomyCoverage)
        .filter(([, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (topCategories.length > 0) {
        additionalInsights.push({
          type: "TAXONOMY_CONCENTRATION",
          title: `주요 관심 카테고리: ${topCategories.map(([c]) => c).join(", ")}`,
          description: `클러스터 분석 결과 ${topCategories.map(([c, n]) => `"${c}"(${n}건)`).join(", ")} 카테고리에 관심이 집중되어 있습니다.`,
          confidence: 0.8,
          source: "cluster_taxonomy",
        });
      }

      // 미매핑 클러스터 경고
      if (taxonomyMapping.unmappedCount > 0) {
        additionalWarnings.push(
          `${taxonomyMapping.unmappedCount}개 클러스터가 업종 분류 체계에 매핑되지 않았습니다. 새로운 관심 영역이거나 업종 분류 확장이 필요할 수 있습니다.`,
        );
      }
    }

    // 2. Benchmark 비교
    if (
      input.measuredMetrics &&
      Object.keys(input.measuredMetrics).length > 0
    ) {
      benchmarkComparison = this.benchmarkService.compare(
        input.industryType,
        input.measuredMetrics,
      );

      // 비교 결과를 evidence로 변환
      additionalEvidence.push({
        category: "benchmark_comparison",
        label: "업종 벤치마크 비교",
        summary: `전체 점수 ${Math.round(benchmarkComparison.overallScore * 100)}점 — 상위 ${benchmarkComparison.highlights.length}건, 하위 ${benchmarkComparison.warnings.length}건`,
        dataSourceType: "benchmark",
        data: benchmarkComparison.comparisons,
      });

      // 벤치마크 하이라이트 → 인사이트
      for (const highlight of benchmarkComparison.highlights) {
        additionalInsights.push({
          type: "BENCHMARK_ABOVE",
          title: "업종 평균 상회 지표 발견",
          description: highlight,
          confidence: 0.85,
          source: "benchmark",
        });
      }

      // 벤치마크 경고 → warning
      for (const warning of benchmarkComparison.warnings) {
        additionalWarnings.push(warning);
      }
    }

    // 3. Social/Comment 통합
    if (input.socialData) {
      socialIntegration = this.socialIntegration.integrate(
        input.socialData,
        input.industryType,
      );

      // evidence 변환
      for (const ev of socialIntegration.evidenceItems) {
        additionalEvidence.push({
          category: ev.category,
          label: ev.label,
          summary: ev.summary,
          dataSourceType: ev.dataSourceType,
          data: ev.data,
        });
      }

      // insight 변환
      for (const ins of socialIntegration.insights) {
        additionalInsights.push({
          type: ins.type,
          title: ins.title,
          description: ins.description,
          confidence: ins.confidence,
          source: ins.source,
        });
      }

      // warning 변환
      for (const warn of socialIntegration.warnings) {
        const prefix = warn.level === "CRITICAL" ? "[긴급] " : "[주의] ";
        additionalWarnings.push(`${prefix}${warn.message}`);
      }
    }

    // 시그널 품질 판정
    const hasClusterData = !!input.clusters?.length;
    const hasSocialData = !!socialIntegration?.hasSocialData;
    const hasBenchmarkData = !!benchmarkComparison;

    const richCount = [hasClusterData, hasSocialData, hasBenchmarkData].filter(
      Boolean,
    ).length;
    const overallRichness: "RICH" | "MODERATE" | "MINIMAL" =
      richCount >= 3 ? "RICH" : richCount >= 1 ? "MODERATE" : "MINIMAL";

    return {
      industryType: input.industryType,
      additionalEvidence,
      additionalInsights,
      additionalWarnings,
      taxonomyMapping,
      benchmarkComparison,
      socialIntegration,
      signalQuality: {
        hasClusterData,
        hasSocialData,
        hasBenchmarkData,
        overallRichness,
      },
    };
  }

  private buildTaxonomySummary(result: TaxonomyMappingResult): string {
    const coveredCategories = Object.entries(result.taxonomyCoverage).filter(
      ([, count]) => count > 0,
    ).length;
    const totalCategories = Object.keys(result.taxonomyCoverage).length;

    return `${result.totalClusters}개 클러스터 중 ${result.totalClusters - result.unmappedCount}개 매핑 완료. ${totalCategories}개 카테고리 중 ${coveredCategories}개 커버.`;
  }
}
