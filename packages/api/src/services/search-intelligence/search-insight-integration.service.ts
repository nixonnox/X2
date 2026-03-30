/**
 * SearchInsightIntegrationService
 *
 * Search Intelligence 결과 → InsightGenerationService 형식의 GeneratedInsight[] 변환.
 *
 * 기존 InsightGenerationService의 8번째 collector 역할을 하며,
 * 4개 엔진(pathfinder, roadview, cluster, persona) 결과에서
 * KEY_FINDING / OPPORTUNITY / RISK / TREND_CHANGE 인사이트를 추출한다.
 *
 * 품질 정책:
 * - quality.level === "INSUFFICIENT" → 빈 배열 반환
 * - quality.isMockOnly → 인사이트에 "[Mock 데이터]" 접두 경고
 * - confidence < 0.3 → severity를 한 단계 낮춤
 */

import { randomUUID } from "crypto";
import type {
  GeneratedInsight,
  InsightCategory,
} from "../insights/insight-generation.service";
import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
} from "./types";

const SOURCE_MODULE = "SEARCH_INTELLIGENCE";

export class SearchInsightIntegrationService {
  /**
   * SearchIntelligenceResult에서 GeneratedInsight 배열을 추출한다.
   * 이 결과를 InsightGenerationService의 allInsights에 합류시킨다.
   */
  collectInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): GeneratedInsight[] {
    if (!quality.usableForInsight) {
      return [];
    }

    const insights: GeneratedInsight[] = [];
    const mockPrefix = quality.isMockOnly ? "[Mock 데이터] " : "";

    // 1. Cluster 기반 인사이트
    if (result.cluster?.success && result.cluster.data) {
      insights.push(
        ...this.extractClusterInsights(result, quality, mockPrefix),
      );
    }

    // 2. Pathfinder 기반 인사이트
    if (result.pathfinder?.success && result.pathfinder.data) {
      insights.push(
        ...this.extractPathfinderInsights(result, quality, mockPrefix),
      );
    }

    // 3. RoadView 기반 인사이트
    if (result.roadview?.success && result.roadview.data) {
      insights.push(
        ...this.extractRoadViewInsights(result, quality, mockPrefix),
      );
    }

    // 4. Persona 기반 인사이트
    if (result.persona?.success && result.persona.data) {
      insights.push(
        ...this.extractPersonaInsights(result, quality, mockPrefix),
      );
    }

    // 5. 크로스엔진 인사이트 (다수 엔진 결과 종합)
    insights.push(
      ...this.extractCrossEngineInsights(result, quality, mockPrefix),
    );

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Cluster Insights
  // ---------------------------------------------------------------------------

  private extractClusterInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    mockPrefix: string,
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];
    const data = result.cluster!.data as any;
    const clusters = data?.clusters ?? [];
    const keyword = result.seedKeyword;

    if (clusters.length === 0) return insights;

    // 클러스터 분포 인사이트
    const largestCluster = clusters.reduce(
      (max: any, c: any) =>
        (c.members?.length ?? 0) > (max.members?.length ?? 0) ? c : max,
      clusters[0],
    );

    const largestSize = largestCluster?.members?.length ?? 0;
    const totalMembers = clusters.reduce(
      (sum: number, c: any) => sum + (c.members?.length ?? 0),
      0,
    );
    const concentrationRatio =
      totalMembers > 0 ? largestSize / totalMembers : 0;

    insights.push({
      id: randomUUID(),
      category: "KEY_FINDING",
      title: `${mockPrefix}"${keyword}" 검색 의도 ${clusters.length}개 클러스터 발견`,
      narrative:
        `"${keyword}" 키워드의 연관 검색을 분석한 결과, ${clusters.length}개의 의미 그룹으로 분류되었습니다. ` +
        `가장 큰 클러스터는 "${largestCluster?.label ?? "주요 그룹"}"(${largestSize}개 키워드)로, ` +
        `전체의 ${Math.round(concentrationRatio * 100)}%를 차지합니다. ` +
        (concentrationRatio > 0.5
          ? `특정 의도에 집중되어 있어, 해당 의도에 최적화된 콘텐츠가 효과적입니다.`
          : `다양한 의도가 분포되어 있어, 세분화된 콘텐츠 전략이 필요합니다.`),
      severity: this.adjustSeverity("MEDIUM", quality),
      confidence: this.adjustConfidence(0.8, quality),
      evidenceRefs: clusters.slice(0, 3).map((c: any) => ({
        dataSourceType: "SEARCH_INTELLIGENCE_CLUSTER",
        entityId: result.trace.analysisId,
        label: `클러스터: ${c.label ?? c.id}`,
        snippet: `${c.members?.length ?? 0}개 키워드`,
      })),
      relatedEntityIds: [result.trace.analysisId],
      sourceModules: [SOURCE_MODULE],
      generatedAt: new Date(),
    });

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Pathfinder Insights
  // ---------------------------------------------------------------------------

  private extractPathfinderInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    mockPrefix: string,
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];
    const data = result.pathfinder!.data as any;
    const nodes = data?.nodes ?? [];
    const paths = data?.paths ?? [];
    const keyword = result.seedKeyword;

    if (nodes.length === 0) return insights;

    // 검색 여정 경로 인사이트
    const pathCount = paths.length;
    const avgPathLength =
      pathCount > 0
        ? Math.round(
            paths.reduce(
              (sum: number, p: any) => sum + (p.steps?.length ?? 0),
              0,
            ) / pathCount,
          )
        : 0;

    insights.push({
      id: randomUUID(),
      category: "KEY_FINDING",
      title: `${mockPrefix}"${keyword}" 검색 여정 ${pathCount}개 경로 분석`,
      narrative:
        `"${keyword}" 관련 검색 여정을 분석한 결과, ${nodes.length}개의 키워드 노드와 ${pathCount}개의 탐색 경로가 발견되었습니다. ` +
        (avgPathLength > 0 ? `평균 경로 길이는 ${avgPathLength}단계로, ` : ``) +
        `사용자가 "${keyword}"에서 시작하여 어떤 방향으로 탐색하는지 파악할 수 있습니다.`,
      severity: this.adjustSeverity("MEDIUM", quality),
      confidence: this.adjustConfidence(0.75, quality),
      evidenceRefs: [
        {
          dataSourceType: "SEARCH_INTELLIGENCE_PATHFINDER",
          entityId: result.trace.analysisId,
          label: `검색 여정 그래프`,
          snippet: `노드 ${nodes.length}개, 경로 ${pathCount}개`,
        },
      ],
      relatedEntityIds: [result.trace.analysisId],
      sourceModules: [SOURCE_MODULE],
      generatedAt: new Date(),
    });

    // 높은 연결도 노드 → 기회 인사이트
    const highConnectNodes = nodes
      .filter((n: any) => (n.edges?.length ?? n.connections ?? 0) >= 3)
      .slice(0, 3);

    if (highConnectNodes.length > 0) {
      const nodeNames = highConnectNodes
        .map((n: any) => n.keyword ?? n.label ?? n.id)
        .join(", ");
      insights.push({
        id: randomUUID(),
        category: "OPPORTUNITY",
        title: `${mockPrefix}핵심 허브 키워드 발견: ${highConnectNodes.length}개`,
        narrative:
          `검색 여정에서 높은 연결도를 보이는 허브 키워드가 발견되었습니다: ${nodeNames}. ` +
          `이 키워드들은 다수의 검색 경로가 교차하는 지점으로, ` +
          `콘텐츠를 집중하면 다양한 유입 경로를 확보할 수 있습니다.`,
        severity: this.adjustSeverity("MEDIUM", quality),
        confidence: this.adjustConfidence(0.7, quality),
        evidenceRefs: highConnectNodes.map((n: any) => ({
          dataSourceType: "SEARCH_INTELLIGENCE_PATHFINDER",
          entityId: result.trace.analysisId,
          label: `허브 키워드: ${n.keyword ?? n.label ?? n.id}`,
          snippet: `연결 수: ${n.edges?.length ?? n.connections ?? 0}`,
        })),
        relatedEntityIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  // ---------------------------------------------------------------------------
  // RoadView Insights
  // ---------------------------------------------------------------------------

  private extractRoadViewInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    mockPrefix: string,
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];
    const data = result.roadview!.data as any;
    const stages = data?.stages ?? [];
    const keyword = result.seedKeyword;

    if (stages.length === 0) return insights;

    // 검색 여정 스테이지 인사이트
    const stageNames = stages
      .map((s: any) => s.name ?? s.label ?? s.stage)
      .join(" → ");
    const weakStages = stages.filter(
      (s: any) => (s.keywordCount ?? s.keywords?.length ?? 0) < 3,
    );

    insights.push({
      id: randomUUID(),
      category: "KEY_FINDING",
      title: `${mockPrefix}"${keyword}" 사용자 여정 ${stages.length}단계 분석`,
      narrative:
        `"${keyword}" 검색의 사용자 여정이 ${stages.length}단계로 분석되었습니다: ${stageNames}. ` +
        (weakStages.length > 0
          ? `${weakStages.map((s: any) => s.name ?? s.label ?? s.stage).join(", ")} 단계에서 ` +
            `키워드가 부족하여 콘텐츠 보강이 필요합니다.`
          : `각 단계에 충분한 키워드가 분포되어 있어 종합적인 콘텐츠 전략이 가능합니다.`),
      severity: this.adjustSeverity("MEDIUM", quality),
      confidence: this.adjustConfidence(0.75, quality),
      evidenceRefs: stages.map((s: any) => ({
        dataSourceType: "SEARCH_INTELLIGENCE_ROADVIEW",
        entityId: result.trace.analysisId,
        label: `스테이지: ${s.name ?? s.label ?? s.stage}`,
        snippet: `${s.keywordCount ?? s.keywords?.length ?? 0}개 키워드`,
      })),
      relatedEntityIds: [result.trace.analysisId],
      sourceModules: [SOURCE_MODULE],
      generatedAt: new Date(),
    });

    // 약한 스테이지 → 갭 기회
    if (weakStages.length > 0) {
      insights.push({
        id: randomUUID(),
        category: "OPPORTUNITY",
        title: `${mockPrefix}콘텐츠 갭 발견: ${weakStages.length}개 여정 단계`,
        narrative:
          `사용자 여정의 ${weakStages.map((s: any) => `"${s.name ?? s.stage}"`).join(", ")} 단계에서 ` +
          `관련 키워드가 부족합니다. 이 단계를 타겟으로 한 콘텐츠를 제작하면 ` +
          `사용자 여정 전체를 커버하는 콘텐츠 전략을 완성할 수 있습니다.`,
        severity: this.adjustSeverity("MEDIUM", quality),
        confidence: this.adjustConfidence(0.65, quality),
        evidenceRefs: weakStages.map((s: any) => ({
          dataSourceType: "SEARCH_INTELLIGENCE_ROADVIEW",
          entityId: result.trace.analysisId,
          label: `갭 스테이지: ${s.name ?? s.stage}`,
          snippet: `키워드 부족`,
        })),
        relatedEntityIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Persona Insights
  // ---------------------------------------------------------------------------

  private extractPersonaInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    mockPrefix: string,
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];
    const data = result.persona!.data as any;
    const personas = data?.personas ?? [];
    const keyword = result.seedKeyword;

    if (personas.length === 0) return insights;

    const personaDescriptions = personas
      .slice(0, 3)
      .map((p: any) => `"${p.name ?? p.archetype ?? p.type}"`)
      .join(", ");

    insights.push({
      id: randomUUID(),
      category: "KEY_FINDING",
      title: `${mockPrefix}"${keyword}" 검색자 페르소나 ${personas.length}개 식별`,
      narrative:
        `"${keyword}"를 검색하는 사용자의 페르소나가 ${personas.length}개로 분류되었습니다: ${personaDescriptions}. ` +
        `각 페르소나의 의도와 행동 패턴이 다르므로, 타겟별 맞춤 콘텐츠 전략이 효과적입니다.`,
      severity: this.adjustSeverity("MEDIUM", quality),
      confidence: this.adjustConfidence(0.7, quality),
      evidenceRefs: personas.slice(0, 3).map((p: any) => ({
        dataSourceType: "SEARCH_INTELLIGENCE_PERSONA",
        entityId: result.trace.analysisId,
        label: `페르소나: ${p.name ?? p.archetype ?? p.type}`,
        snippet: p.description ?? `${p.keywords?.length ?? 0}개 키워드 연관`,
      })),
      relatedEntityIds: [result.trace.analysisId],
      sourceModules: [SOURCE_MODULE],
      generatedAt: new Date(),
    });

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Cross-engine Insights
  // ---------------------------------------------------------------------------

  private extractCrossEngineInsights(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    mockPrefix: string,
  ): GeneratedInsight[] {
    const insights: GeneratedInsight[] = [];
    const keyword = result.seedKeyword;

    const successfulEngines = [
      result.pathfinder,
      result.roadview,
      result.persona,
      result.cluster,
    ].filter((e) => e?.success);

    // 다수 엔진 성공 → 종합 인사이트
    if (successfulEngines.length >= 3) {
      insights.push({
        id: randomUUID(),
        category: "KEY_FINDING",
        title: `${mockPrefix}"${keyword}" 종합 검색 인텔리전스 분석 완료`,
        narrative:
          `"${keyword}" 키워드에 대해 ${successfulEngines.length}개 엔진의 종합 분석이 완료되었습니다. ` +
          `검색 여정(Pathfinder), 사용자 여정 단계(RoadView), 의도 클러스터(Cluster), ` +
          `검색자 페르소나(Persona) 데이터를 통합하여 전방위적 검색 전략 수립이 가능합니다.`,
        severity: this.adjustSeverity("LOW", quality),
        confidence: this.adjustConfidence(0.85, quality),
        evidenceRefs: [
          {
            dataSourceType: "SEARCH_INTELLIGENCE",
            entityId: result.trace.analysisId,
            label: "종합 분석 결과",
            snippet: `${successfulEngines.length}개 엔진 완료, 신뢰도 ${Math.round(quality.confidence * 100)}%`,
          },
        ],
        relatedEntityIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        generatedAt: new Date(),
      });
    }

    // Stale 데이터 경고
    if (quality.freshness === "stale") {
      insights.push({
        id: randomUUID(),
        category: "RISK",
        title: `${mockPrefix}"${keyword}" 검색 데이터 갱신 필요`,
        narrative:
          `"${keyword}"의 검색 인텔리전스 데이터가 24시간 이상 경과하여 최신 상태가 아닙니다. ` +
          `검색 트렌드는 빠르게 변하므로, 최신 데이터로 재분석을 권장합니다.`,
        severity: "LOW",
        confidence: 0.9,
        evidenceRefs: [
          {
            dataSourceType: "SEARCH_INTELLIGENCE",
            entityId: result.trace.analysisId,
            label: "데이터 신선도 경고",
            snippet: `freshness: stale, 분석 시각: ${result.analyzedAt}`,
          },
        ],
        relatedEntityIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        generatedAt: new Date(),
      });
    }

    return insights;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private adjustSeverity(
    base: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    quality: SearchDataQualityAssessment,
  ): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
    if (quality.confidence < 0.3 || quality.isMockOnly) {
      const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
      const idx = order.indexOf(base);
      return idx < order.length - 1 ? order[idx + 1]! : "LOW";
    }
    return base;
  }

  private adjustConfidence(
    base: number,
    quality: SearchDataQualityAssessment,
  ): number {
    // confidence = base × quality.confidence (최소 0.1)
    return Math.max(0.1, Math.round(base * quality.confidence * 100) / 100);
  }
}
