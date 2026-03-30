/**
 * SearchReportSectionBuilder
 *
 * Search Intelligence 결과 → ReportCompositionService 형식의
 * 리포트 섹션 내러티브 생성.
 *
 * 기존 ReportCompositionService의 buildSectionNarrative에
 * SEARCH_INTELLIGENCE 관련 섹션 타입을 추가한다.
 *
 * 새 섹션 타입:
 * - SEARCH_INTELLIGENCE_OVERVIEW: 검색 인텔리전스 종합 개요
 * - SEARCH_JOURNEY_ANALYSIS: 검색 여정 분석 (Pathfinder + RoadView)
 * - SEARCH_INTENT_CLUSTERS: 검색 의도 클러스터 분석
 * - SEARCH_PERSONA_ANALYSIS: 검색자 페르소나 분석
 * - SEARCH_DATA_QUALITY: 데이터 품질 및 신뢰도 (ADMIN/PRACTITIONER만)
 *
 * Role-based 분기:
 * - PRACTITIONER: 전체 섹션 + 데이터 품질 + 기술 상세
 * - MARKETER: 실행 중심 섹션
 * - ADMIN: 전체 섹션 + 품질 경고
 * - EXECUTIVE: 전략 개요만
 */

import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
  RoleContext,
} from "./types";
import { ROLE_OUTPUT_CONFIG } from "./types";

export type SearchReportSection = {
  title: string;
  type: string;
  order: number;
  narrative: string;
};

export class SearchReportSectionBuilder {
  /**
   * Role에 따라 적절한 검색 인텔리전스 리포트 섹션을 생성한다.
   */
  buildSections(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    roleContext: RoleContext = "MARKETER",
    startOrder: number = 100,
  ): SearchReportSection[] {
    const config = ROLE_OUTPUT_CONFIG[roleContext];
    const sections: SearchReportSection[] = [];
    let order = startOrder;

    // Mock 데이터 경고 prefix
    const qualityNote = quality.isMockOnly
      ? "\n\n⚠️ 주의: 이 분석은 Mock 데이터 기반이며, 실제 의사결정에는 실데이터 재수집 후 활용하세요."
      : quality.freshness === "stale"
        ? "\n\n⚠️ 데이터가 24시간 이상 경과하여, 최신 데이터로 재분석을 권장합니다."
        : "";

    // 1. 종합 개요 (모든 역할)
    sections.push({
      title: "검색 인텔리전스 종합 개요",
      type: "SEARCH_INTELLIGENCE_OVERVIEW",
      order: order++,
      narrative: this.buildOverviewNarrative(result, quality) + qualityNote,
    });

    // 2. 검색 여정 분석 (EXECUTIVE 제외)
    if (config.narrativeStyle !== "strategic") {
      if (result.pathfinder?.success || result.roadview?.success) {
        sections.push({
          title: "검색 여정 분석",
          type: "SEARCH_JOURNEY_ANALYSIS",
          order: order++,
          narrative: this.buildJourneyNarrative(result, quality),
        });
      }
    }

    // 3. 의도 클러스터 (EXECUTIVE 제외)
    if (config.narrativeStyle !== "strategic") {
      if (result.cluster?.success) {
        sections.push({
          title: "검색 의도 클러스터 분석",
          type: "SEARCH_INTENT_CLUSTERS",
          order: order++,
          narrative: this.buildClusterNarrative(result, quality),
        });
      }
    }

    // 4. 페르소나 분석 (EXECUTIVE 제외)
    if (config.narrativeStyle !== "strategic") {
      if (result.persona?.success) {
        sections.push({
          title: "검색자 페르소나 분석",
          type: "SEARCH_PERSONA_ANALYSIS",
          order: order++,
          narrative: this.buildPersonaNarrative(result, quality),
        });
      }
    }

    // 5. 데이터 품질 (PRACTITIONER, ADMIN만)
    if (config.includeDetailedTrace) {
      sections.push({
        title: "데이터 품질 및 신뢰도",
        type: "SEARCH_DATA_QUALITY",
        order: order++,
        narrative: this.buildQualityNarrative(result, quality),
      });
    }

    // maxSections 제한
    return sections.slice(0, config.maxSections);
  }

  /**
   * 기존 ReportCompositionService.getSectionDefinitions에 추가할
   * 검색 인텔리전스 전용 섹션 정의를 반환한다.
   */
  getSectionDefinitions(
    roleContext: RoleContext = "MARKETER",
  ): { title: string; type: string; order: number }[] {
    const base = [
      {
        title: "검색 인텔리전스 개요",
        type: "SEARCH_INTELLIGENCE_OVERVIEW",
        order: 50,
      },
      { title: "검색 여정 분석", type: "SEARCH_JOURNEY_ANALYSIS", order: 51 },
      {
        title: "검색 의도 클러스터",
        type: "SEARCH_INTENT_CLUSTERS",
        order: 52,
      },
      { title: "검색자 페르소나", type: "SEARCH_PERSONA_ANALYSIS", order: 53 },
    ];

    if (roleContext === "PRACTITIONER" || roleContext === "ADMIN") {
      base.push({
        title: "데이터 품질 및 신뢰도",
        type: "SEARCH_DATA_QUALITY",
        order: 54,
      });
    }

    if (roleContext === "EXECUTIVE") {
      // 전략 개요만 반환
      return [base[0]!];
    }

    return base;
  }

  // ---------------------------------------------------------------------------
  // Narrative Builders
  // ---------------------------------------------------------------------------

  private buildOverviewNarrative(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): string {
    const keyword = result.seedKeyword;
    const { payloadSummary, trace } = result;

    const engines = [
      result.pathfinder,
      result.roadview,
      result.persona,
      result.cluster,
    ];
    const successCount = engines.filter((e) => e?.success).length;
    const totalEngines = engines.filter(Boolean).length;

    const parts: string[] = [];

    parts.push(
      `"${keyword}" 키워드에 대한 검색 인텔리전스 분석이 완료되었습니다. ` +
        `${totalEngines}개 엔진 중 ${successCount}개가 성공적으로 실행되었으며, ` +
        `전체 분석 소요 시간은 ${(result.durationMs / 1000).toFixed(1)}초입니다.`,
    );

    parts.push(
      `데이터 수집: 연관 키워드 ${payloadSummary.totalRelatedKeywords}개, ` +
        `SERP 데이터 ${payloadSummary.hasSerpData ? "확보" : "없음"}, ` +
        `트렌드 데이터 ${payloadSummary.hasTrendData ? "확보" : "없음"}, ` +
        `질문 데이터 ${payloadSummary.hasQuestionData ? "확보" : "없음"}. ` +
        `소스: ${payloadSummary.sourcesUsed.join(", ")}.`,
    );

    parts.push(
      `데이터 신뢰도: ${Math.round(quality.confidence * 100)}% (${quality.level}), ` +
        `신선도: ${quality.freshness === "fresh" ? "최신" : quality.freshness === "recent" ? "사용 가능" : "갱신 필요"}.`,
    );

    return parts.join("\n\n");
  }

  private buildJourneyNarrative(
    result: SearchIntelligenceResult,
    _quality: SearchDataQualityAssessment,
  ): string {
    const keyword = result.seedKeyword;
    const parts: string[] = [];

    // Pathfinder
    if (result.pathfinder?.success) {
      const pfData = result.pathfinder.data as any;
      const nodes = pfData?.nodes ?? [];
      const paths = pfData?.paths ?? [];

      parts.push(
        `[검색 경로 분석 (Pathfinder)] "${keyword}"에서 출발하는 검색 여정을 분석한 결과, ` +
          `${nodes.length}개의 키워드 노드와 ${paths.length}개의 탐색 경로가 발견되었습니다.`,
      );

      const hubNodes = nodes
        .filter((n: any) => (n.edges?.length ?? n.connections ?? 0) >= 3)
        .slice(0, 3);
      if (hubNodes.length > 0) {
        const hubList = hubNodes
          .map((n: any) => `"${n.keyword ?? n.label}"`)
          .join(", ");
        parts.push(
          `주요 허브 키워드: ${hubList} — 다수의 경로가 교차하는 핵심 지점입니다.`,
        );
      }
    }

    // RoadView
    if (result.roadview?.success) {
      const rvData = result.roadview.data as any;
      const stages = rvData?.stages ?? [];

      if (stages.length > 0) {
        const stageFlow = stages
          .map(
            (s: any) =>
              `${s.name ?? s.stage}(${s.keywordCount ?? s.keywords?.length ?? 0}개)`,
          )
          .join(" → ");
        parts.push(
          `[사용자 여정 단계 (RoadView)] 검색 사용자의 여정이 ${stages.length}단계로 분석되었습니다: ${stageFlow}.`,
        );

        const weakStages = stages.filter(
          (s: any) => (s.keywordCount ?? s.keywords?.length ?? 0) < 3,
        );
        if (weakStages.length > 0) {
          parts.push(
            `${weakStages.map((s: any) => `"${s.name ?? s.stage}"`).join(", ")} 단계에서 ` +
              `키워드가 부족하여 콘텐츠 보강이 권장됩니다.`,
          );
        }
      }
    }

    return parts.join("\n\n") || "검색 여정 분석 데이터가 없습니다.";
  }

  private buildClusterNarrative(
    result: SearchIntelligenceResult,
    _quality: SearchDataQualityAssessment,
  ): string {
    const data = result.cluster!.data as any;
    const clusters = data?.clusters ?? [];
    const keyword = result.seedKeyword;

    if (clusters.length === 0) return "클러스터 분석 데이터가 없습니다.";

    const parts: string[] = [];

    parts.push(
      `"${keyword}" 관련 검색어를 분석한 결과, ${clusters.length}개의 의도 클러스터로 분류되었습니다.`,
    );

    // 각 클러스터 설명
    for (const cluster of clusters.slice(0, 5)) {
      const label = cluster.label ?? cluster.id;
      const memberCount = cluster.members?.length ?? 0;
      const topMembers = (cluster.members ?? [])
        .slice(0, 3)
        .map((m: any) => m.keyword ?? m)
        .join(", ");
      parts.push(
        `• ${label} (${memberCount}개 키워드): ${topMembers}${memberCount > 3 ? " 외" : ""}`,
      );
    }

    if (clusters.length > 5) {
      parts.push(`(외 ${clusters.length - 5}개 클러스터)`);
    }

    return parts.join("\n");
  }

  private buildPersonaNarrative(
    result: SearchIntelligenceResult,
    _quality: SearchDataQualityAssessment,
  ): string {
    const data = result.persona!.data as any;
    const personas = data?.personas ?? [];
    const keyword = result.seedKeyword;

    if (personas.length === 0) return "페르소나 분석 데이터가 없습니다.";

    const parts: string[] = [];

    parts.push(
      `"${keyword}"를 검색하는 사용자가 ${personas.length}개 페르소나로 분류되었습니다.`,
    );

    for (const persona of personas.slice(0, 5)) {
      const name = persona.name ?? persona.archetype ?? persona.type;
      const desc = persona.description ?? "설명 없음";
      parts.push(`• ${name}: ${desc}`);
    }

    return parts.join("\n");
  }

  private buildQualityNarrative(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
  ): string {
    const { trace } = result;
    const parts: string[] = [];

    parts.push(
      `분석 ID: ${trace.analysisId}\n` +
        `엔진 버전: ${trace.engineVersion}\n` +
        `신뢰도: ${Math.round(quality.confidence * 100)}% (${quality.level})\n` +
        `신선도: ${quality.freshness}\n` +
        `부분 데이터: ${quality.isPartial ? "예" : "아니오"}\n` +
        `Mock 전용: ${quality.isMockOnly ? "예" : "아니오"}`,
    );

    // 소스 현황
    parts.push("\n[소스 현황]");
    for (const source of trace.sourceSummary.sources) {
      parts.push(
        `• ${source.name}: ${source.status} (${source.itemCount}건, ${source.latencyMs}ms)`,
      );
    }

    // 경고
    if (quality.warnings.length > 0) {
      parts.push("\n[경고]");
      for (const w of quality.warnings) {
        parts.push(`⚠️ ${w}`);
      }
    }

    // 낮은 신뢰도 이유
    if (trace.lowConfidenceReasons.length > 0) {
      parts.push("\n[낮은 신뢰도 이유]");
      for (const r of trace.lowConfidenceReasons) {
        parts.push(`• ${r}`);
      }
    }

    return parts.join("\n");
  }
}
