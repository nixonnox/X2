/**
 * SearchExecutiveSummaryService
 *
 * Search Intelligence 결과 → 경영진 수준의 전략적 요약 생성.
 *
 * 기존 ExecutiveSummaryService의 입력으로 사용되는 KPI/권고를 생성하며,
 * 검색 인텔리전스 관점의 전략적 시사점을 도출한다.
 *
 * 출력:
 * - KPI 하이라이트 (검색 관련)
 * - 전략적 시사점
 * - 위험 요인
 * - 성장 기회
 */

import type { KPIHighlight } from "../insights/executive-summary.service";
import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
} from "./types";

export type SearchExecutiveSummary = {
  seedKeyword: string;
  strategicOverview: string;
  kpiHighlights: KPIHighlight[];
  strategicImplications: string[];
  riskFactors: string[];
  growthOpportunities: string[];
  dataQualityNote: string | null;
};

export class SearchExecutiveSummaryService {
  /**
   * SearchIntelligenceResult에서 경영진 수준의 요약을 생성한다.
   */
  generateSearchExecutiveSummary(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): SearchExecutiveSummary {
    const keyword = result.seedKeyword;

    return {
      seedKeyword: keyword,
      strategicOverview: this.buildStrategicOverview(result, quality),
      kpiHighlights: this.buildKPIHighlights(result, quality),
      strategicImplications: this.buildStrategicImplications(result, quality),
      riskFactors: this.buildRiskFactors(result, quality),
      growthOpportunities: this.buildGrowthOpportunities(result, quality),
      dataQualityNote: this.buildDataQualityNote(quality),
    };
  }

  // ---------------------------------------------------------------------------
  // Strategic Overview
  // ---------------------------------------------------------------------------

  private buildStrategicOverview(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): string {
    const keyword = result.seedKeyword;
    const parts: string[] = [];

    const engines = [
      result.pathfinder,
      result.roadview,
      result.persona,
      result.cluster,
    ];
    const successCount = engines.filter((e) => e?.success).length;

    parts.push(
      `"${keyword}" 키워드에 대한 검색 인텔리전스 분석 결과, ` +
        `${successCount}개 관점에서의 시장 인사이트가 도출되었습니다.`,
    );

    // Cluster 요약
    if (result.cluster?.success) {
      const clusters = (result.cluster.data as any)?.clusters ?? [];
      if (clusters.length > 0) {
        parts.push(
          `검색 의도가 ${clusters.length}개 세그먼트로 분화되어 있어, ` +
            `단일 콘텐츠가 아닌 세그먼트별 전략이 필요합니다.`,
        );
      }
    }

    // Persona 요약
    if (result.persona?.success) {
      const personas = (result.persona.data as any)?.personas ?? [];
      if (personas.length > 0) {
        parts.push(
          `${personas.length}개의 구별되는 검색자 유형이 식별되어, ` +
            `타겟 마케팅의 세분화 기회가 있습니다.`,
        );
      }
    }

    if (quality.isMockOnly) {
      parts.push(
        `(본 분석은 테스트 데이터 기반으로, 실데이터 수집 후 재분석이 필요합니다.)`,
      );
    }

    return parts.join(" ");
  }

  // ---------------------------------------------------------------------------
  // KPI Highlights
  // ---------------------------------------------------------------------------

  private buildKPIHighlights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): KPIHighlight[] {
    const kpis: KPIHighlight[] = [];

    // 연관 키워드 규모
    kpis.push({
      metric: "연관 키워드 규모",
      value: `${result.payloadSummary.totalRelatedKeywords}개`,
      change: null,
      status:
        result.payloadSummary.totalRelatedKeywords >= 30
          ? "POSITIVE"
          : result.payloadSummary.totalRelatedKeywords >= 10
            ? "NEUTRAL"
            : "NEGATIVE",
    });

    // 데이터 신뢰도
    kpis.push({
      metric: "분석 신뢰도",
      value: `${Math.round(quality.confidence * 100)}%`,
      change: null,
      status:
        quality.confidence >= 0.7
          ? "POSITIVE"
          : quality.confidence >= 0.4
            ? "NEUTRAL"
            : "NEGATIVE",
    });

    // 클러스터 수
    if (result.cluster?.success) {
      const clusters = (result.cluster.data as any)?.clusters ?? [];
      kpis.push({
        metric: "의도 세그먼트",
        value: `${clusters.length}개`,
        change: null,
        status: clusters.length >= 3 ? "POSITIVE" : "NEUTRAL",
      });
    }

    // 페르소나 수
    if (result.persona?.success) {
      const personas = (result.persona.data as any)?.personas ?? [];
      kpis.push({
        metric: "검색자 페르소나",
        value: `${personas.length}개`,
        change: null,
        status: personas.length >= 2 ? "POSITIVE" : "NEUTRAL",
      });
    }

    // 여정 경로
    if (result.pathfinder?.success) {
      const paths = (result.pathfinder.data as any)?.paths ?? [];
      kpis.push({
        metric: "검색 경로",
        value: `${paths.length}개`,
        change: null,
        status: paths.length >= 2 ? "POSITIVE" : "NEUTRAL",
      });
    }

    // 데이터 소스
    kpis.push({
      metric: "활용 데이터 소스",
      value: `${result.trace.sourceSummary.successfulSources}/${result.trace.sourceSummary.totalSources}개`,
      change: null,
      status:
        result.trace.sourceSummary.successfulSources ===
        result.trace.sourceSummary.totalSources
          ? "POSITIVE"
          : "NEUTRAL",
    });

    return kpis;
  }

  // ---------------------------------------------------------------------------
  // Strategic Implications
  // ---------------------------------------------------------------------------

  private buildStrategicImplications(
    result: SearchIntelligenceResult,
    _quality: SearchDataQualityAssessment,
  ): string[] {
    const implications: string[] = [];

    // Cluster-based
    if (result.cluster?.success) {
      const clusters = (result.cluster.data as any)?.clusters ?? [];
      if (clusters.length >= 3) {
        implications.push(
          `검색 의도가 ${clusters.length}개 세그먼트로 분화되어 있으므로, ` +
            `세그먼트별 콘텐츠 전략이 단일 전략보다 효과적입니다.`,
        );
      }
    }

    // RoadView-based
    if (result.roadview?.success) {
      const stages = (result.roadview.data as any)?.stages ?? [];
      const weakStages = stages.filter(
        (s: any) => (s.keywordCount ?? s.keywords?.length ?? 0) < 3,
      );
      if (weakStages.length > 0) {
        implications.push(
          `사용자 여정의 ${weakStages.length}개 단계에서 콘텐츠 갭이 발견되어, ` +
            `해당 단계를 보강하면 경쟁사 대비 우위를 확보할 수 있습니다.`,
        );
      }
    }

    // Persona-based
    if (result.persona?.success) {
      const personas = (result.persona.data as any)?.personas ?? [];
      if (personas.length >= 2) {
        implications.push(
          `${personas.length}개의 서로 다른 검색자 유형이 존재하므로, ` +
            `광고 타겟팅과 랜딩 페이지를 페르소나별로 분리하면 전환율 향상이 기대됩니다.`,
        );
      }
    }

    // Pathfinder hub nodes
    if (result.pathfinder?.success) {
      const nodes = (result.pathfinder.data as any)?.nodes ?? [];
      const hubNodes = nodes.filter(
        (n: any) => (n.edges?.length ?? n.connections ?? 0) >= 3,
      );
      if (hubNodes.length > 0) {
        implications.push(
          `${hubNodes.length}개의 허브 키워드가 발견되어, ` +
            `이를 중심으로 한 필러/클러스터 콘텐츠 전략이 검색 트래픽 확보에 효과적입니다.`,
        );
      }
    }

    return implications.slice(0, 5);
  }

  // ---------------------------------------------------------------------------
  // Risk Factors
  // ---------------------------------------------------------------------------

  private buildRiskFactors(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): string[] {
    const risks: string[] = [];

    if (quality.freshness === "stale") {
      risks.push(
        "데이터가 24시간 이상 경과하여 현재 검색 트렌드를 반영하지 못할 수 있습니다.",
      );
    }

    if (quality.isPartial) {
      risks.push(
        "일부 데이터 소스에서 수집이 실패하여 분석의 완전성이 보장되지 않습니다.",
      );
    }

    if (quality.confidence < 0.5) {
      risks.push(
        `분석 신뢰도가 ${Math.round(quality.confidence * 100)}%로 낮아, ` +
          `의사결정 전 추가 데이터 수집을 권장합니다.`,
      );
    }

    if (quality.isMockOnly) {
      risks.push(
        "테스트 데이터로 분석된 결과이므로, 실제 의사결정에 활용해서는 안 됩니다.",
      );
    }

    // Engine failures
    const failedEngines = [
      result.pathfinder && !result.pathfinder.success ? "Pathfinder" : null,
      result.roadview && !result.roadview.success ? "RoadView" : null,
      result.persona && !result.persona.success ? "Persona" : null,
      result.cluster && !result.cluster.success ? "Cluster" : null,
    ].filter(Boolean);

    if (failedEngines.length > 0) {
      risks.push(
        `${failedEngines.join(", ")} 엔진이 실패하여 해당 관점의 분석이 누락되었습니다.`,
      );
    }

    return risks;
  }

  // ---------------------------------------------------------------------------
  // Growth Opportunities
  // ---------------------------------------------------------------------------

  private buildGrowthOpportunities(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): string[] {
    if (!quality.usableForInsight) return [];

    const opportunities: string[] = [];

    // Cluster → 세분화 기회
    if (result.cluster?.success) {
      const clusters = (result.cluster.data as any)?.clusters ?? [];
      if (clusters.length >= 2) {
        const smallClusters = clusters.filter(
          (c: any) => (c.members?.length ?? 0) >= 3,
        );
        if (smallClusters.length > 0) {
          opportunities.push(
            `${smallClusters.length}개의 유의미한 의도 클러스터에 맞춤 콘텐츠를 제작하면 ` +
              `키워드 커버리지를 확장할 수 있습니다.`,
          );
        }
      }
    }

    // RoadView → 갭 기회
    if (result.roadview?.success) {
      const stages = (result.roadview.data as any)?.stages ?? [];
      const weakStages = stages.filter(
        (s: any) => (s.keywordCount ?? s.keywords?.length ?? 0) < 3,
      );
      if (weakStages.length > 0) {
        opportunities.push(
          `사용자 여정의 ${weakStages.length}개 단계에 콘텐츠 갭이 있어, ` +
            `선제적 콘텐츠 배치로 경쟁사 대비 우위를 확보할 수 있습니다.`,
        );
      }
    }

    // Pathfinder → 경로 기반 기회
    if (result.pathfinder?.success) {
      const paths = (result.pathfinder.data as any)?.paths ?? [];
      if (paths.length >= 3) {
        opportunities.push(
          `${paths.length}개의 검색 경로를 커버하는 콘텐츠 네트워크를 구축하면 ` +
            `다양한 유입 경로를 동시에 확보할 수 있습니다.`,
        );
      }
    }

    // Data breadth
    if (result.payloadSummary.totalRelatedKeywords >= 30) {
      opportunities.push(
        `${result.payloadSummary.totalRelatedKeywords}개의 연관 키워드가 발견되어 ` +
          `풍부한 롱테일 콘텐츠 전략이 가능합니다.`,
      );
    }

    return opportunities.slice(0, 5);
  }

  // ---------------------------------------------------------------------------
  // Data Quality Note
  // ---------------------------------------------------------------------------

  private buildDataQualityNote(
    quality: SearchDataQualityAssessment,
  ): string | null {
    if (quality.level === "HIGH" && !quality.isMockOnly) {
      return null; // 높은 품질이면 별도 경고 불필요
    }

    const notes: string[] = [];

    if (quality.isMockOnly) {
      notes.push(
        "⚠️ 본 분석은 테스트(Mock) 데이터 기반입니다. 실제 의사결정에는 실데이터로 재분석하세요.",
      );
    }

    if (quality.freshness === "stale") {
      notes.push("데이터가 24시간 이상 경과하여 재수집이 권장됩니다.");
    }

    if (quality.level === "LOW" || quality.level === "INSUFFICIENT") {
      notes.push(
        `데이터 품질이 "${quality.level}"로 평가되어, 분석 결과의 정확도가 제한적일 수 있습니다.`,
      );
    }

    return notes.length > 0 ? notes.join(" ") : null;
  }
}
