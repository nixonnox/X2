/**
 * SearchEvidenceBundleService
 *
 * Search Intelligence 결과 → EvidenceBundleItem[] 변환.
 *
 * 기존 EvidenceBundleService에 "SEARCH_INTELLIGENCE" 번들 타입을 추가하고,
 * 4개 엔진 결과를 각각 시각화 가능한 Evidence 아이템으로 변환한다.
 *
 * 표시 타입 매핑:
 * - Cluster → PIE_CHART (클러스터 분포)
 * - Pathfinder → TABLE (노드/경로 목록)
 * - RoadView → BAR_CHART (스테이지별 키워드 수)
 * - Persona → TABLE (페르소나 목록)
 * - Quality → KPI_CARD (품질 지표)
 */

import type { EvidenceBundleItem } from "../evidence/evidence-bundle.service";
import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
  RoleContext,
} from "./types";
import { ROLE_OUTPUT_CONFIG } from "./types";

export class SearchEvidenceBundleService {
  /**
   * SearchIntelligenceResult에서 EvidenceBundleItem 배열을 생성한다.
   */
  buildSearchEvidenceItems(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    roleContext?: RoleContext,
  ): EvidenceBundleItem[] {
    const items: EvidenceBundleItem[] = [];
    const config = roleContext ? ROLE_OUTPUT_CONFIG[roleContext] : undefined;

    // 1. 품질 지표 카드 (항상 포함)
    items.push(this.buildQualityCard(result, quality));

    // 2. Cluster evidence
    if (result.cluster?.success && result.cluster.data) {
      items.push(...this.buildClusterEvidence(result));
    }

    // 3. Pathfinder evidence
    if (result.pathfinder?.success && result.pathfinder.data) {
      items.push(...this.buildPathfinderEvidence(result));
    }

    // 4. RoadView evidence
    if (result.roadview?.success && result.roadview.data) {
      items.push(...this.buildRoadViewEvidence(result));
    }

    // 5. Persona evidence
    if (result.persona?.success && result.persona.data) {
      items.push(...this.buildPersonaEvidence(result));
    }

    // 6. Source summary (PRACTITIONER/ADMIN only)
    if (!config || config.includeDetailedTrace) {
      items.push(this.buildSourceSummary(result));
    }

    // 7. Warnings (if applicable)
    if (quality.warnings.length > 0 && (!config || config.includeWarnings)) {
      items.push(this.buildWarningsCard(quality));
    }

    return items;
  }

  // ---------------------------------------------------------------------------
  // Quality Card
  // ---------------------------------------------------------------------------

  private buildQualityCard(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): EvidenceBundleItem {
    const engines = [
      result.pathfinder,
      result.roadview,
      result.persona,
      result.cluster,
    ];
    const successCount = engines.filter((e) => e?.success).length;
    const totalEngines = engines.filter(Boolean).length;

    return {
      category: "search_intelligence_quality",
      label: "검색 인텔리전스 품질 지표",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "KPI_CARD",
      summary:
        `키워드: "${result.seedKeyword}" | ` +
        `신뢰도: ${Math.round(quality.confidence * 100)}% | ` +
        `신선도: ${quality.freshness} | ` +
        `엔진: ${successCount}/${totalEngines}개 성공 | ` +
        `품질: ${quality.level}`,
      data: {
        seedKeyword: result.seedKeyword,
        confidence: quality.confidence,
        freshness: quality.freshness,
        qualityLevel: quality.level,
        enginesSucceeded: successCount,
        enginesTotal: totalEngines,
        isMockOnly: quality.isMockOnly,
        durationMs: result.durationMs,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Cluster Evidence
  // ---------------------------------------------------------------------------

  private buildClusterEvidence(
    result: SearchIntelligenceResult,
  ): EvidenceBundleItem[] {
    const items: EvidenceBundleItem[] = [];
    const data = result.cluster!.data as any;
    const clusters = data?.clusters ?? [];

    if (clusters.length === 0) return items;

    // 클러스터 분포 차트
    const distribution = clusters.map((c: any) => ({
      label: c.label ?? c.id,
      count: c.members?.length ?? 0,
    }));

    items.push({
      category: "search_cluster_distribution",
      label: "검색 의도 클러스터 분포",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "PIE_CHART",
      summary:
        `${clusters.length}개의 의도 클러스터로 분류됨. ` +
        `최대 클러스터: "${distribution[0]?.label}" (${distribution[0]?.count}개 키워드)`,
      data: distribution,
    });

    // 클러스터 상세 목록
    items.push({
      category: "search_cluster_detail",
      label: "검색 의도 클러스터 상세",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "TABLE",
      summary: `${clusters.length}개 클러스터의 상세 구성 키워드 목록`,
      data: clusters.slice(0, 10).map((c: any) => ({
        label: c.label ?? c.id,
        memberCount: c.members?.length ?? 0,
        topMembers: (c.members ?? [])
          .slice(0, 5)
          .map((m: any) => m.keyword ?? m),
      })),
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // Pathfinder Evidence
  // ---------------------------------------------------------------------------

  private buildPathfinderEvidence(
    result: SearchIntelligenceResult,
  ): EvidenceBundleItem[] {
    const items: EvidenceBundleItem[] = [];
    const data = result.pathfinder!.data as any;
    const nodes = data?.nodes ?? [];
    const paths = data?.paths ?? [];

    if (nodes.length === 0) return items;

    // 검색 여정 그래프 요약
    items.push({
      category: "search_pathfinder_graph",
      label: "검색 여정 그래프",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "TABLE",
      summary: `${nodes.length}개 노드, ${paths.length}개 경로로 구성된 검색 여정 그래프`,
      data: {
        nodeCount: nodes.length,
        pathCount: paths.length,
        topNodes: nodes
          .sort(
            (a: any, b: any) =>
              (b.edges?.length ?? b.connections ?? 0) -
              (a.edges?.length ?? a.connections ?? 0),
          )
          .slice(0, 10)
          .map((n: any) => ({
            keyword: n.keyword ?? n.label ?? n.id,
            connections: n.edges?.length ?? n.connections ?? 0,
          })),
      },
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // RoadView Evidence
  // ---------------------------------------------------------------------------

  private buildRoadViewEvidence(
    result: SearchIntelligenceResult,
  ): EvidenceBundleItem[] {
    const items: EvidenceBundleItem[] = [];
    const data = result.roadview!.data as any;
    const stages = data?.stages ?? [];

    if (stages.length === 0) return items;

    // 여정 스테이지별 키워드 수
    const stageData = stages.map((s: any) => ({
      stage: s.name ?? s.label ?? s.stage,
      keywordCount: s.keywordCount ?? s.keywords?.length ?? 0,
    }));

    items.push({
      category: "search_roadview_stages",
      label: "사용자 여정 단계별 키워드 분포",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "BAR_CHART",
      summary: `${stages.length}단계 여정: ${stageData.map((s: any) => `${s.stage}(${s.keywordCount}개)`).join(" → ")}`,
      data: stageData,
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // Persona Evidence
  // ---------------------------------------------------------------------------

  private buildPersonaEvidence(
    result: SearchIntelligenceResult,
  ): EvidenceBundleItem[] {
    const items: EvidenceBundleItem[] = [];
    const data = result.persona!.data as any;
    const personas = data?.personas ?? [];

    if (personas.length === 0) return items;

    items.push({
      category: "search_persona_profiles",
      label: "검색자 페르소나 프로필",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "TABLE",
      summary:
        `${personas.length}개의 검색자 페르소나 식별: ` +
        personas
          .slice(0, 3)
          .map((p: any) => `"${p.name ?? p.archetype ?? p.type}"`)
          .join(", "),
      data: personas.slice(0, 10).map((p: any) => ({
        name: p.name ?? p.archetype ?? p.type,
        description: p.description ?? null,
        keywordCount: p.keywords?.length ?? 0,
        topKeywords: (p.keywords ?? []).slice(0, 5),
      })),
    });

    return items;
  }

  // ---------------------------------------------------------------------------
  // Source Summary
  // ---------------------------------------------------------------------------

  private buildSourceSummary(
    result: SearchIntelligenceResult,
  ): EvidenceBundleItem {
    const sources = result.trace.sourceSummary.sources;

    return {
      category: "search_source_summary",
      label: "데이터 소스 현황",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [result.trace.analysisId],
      displayType: "TABLE",
      summary:
        `${result.trace.sourceSummary.successfulSources}/${result.trace.sourceSummary.totalSources}개 소스 성공. ` +
        `소스: ${sources.map((s) => `${s.name}(${s.status})`).join(", ")}`,
      data: sources.map((s) => ({
        name: s.name,
        status: s.status,
        itemCount: s.itemCount,
        latencyMs: s.latencyMs,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // Warnings Card
  // ---------------------------------------------------------------------------

  private buildWarningsCard(
    quality: SearchDataQualityAssessment,
  ): EvidenceBundleItem {
    return {
      category: "search_quality_warnings",
      label: "데이터 품질 경고",
      dataSourceType: "SEARCH_INTELLIGENCE",
      entityIds: [],
      displayType: "QUOTE_LIST",
      summary: `${quality.warnings.length}건의 데이터 품질 경고`,
      data: quality.warnings,
    };
  }
}
