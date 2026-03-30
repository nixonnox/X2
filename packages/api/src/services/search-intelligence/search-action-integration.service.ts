/**
 * SearchActionIntegrationService
 *
 * Search Intelligence 결과 → ActionRecommendationOrchestrator 형식의
 * RecommendedAction[] 변환.
 *
 * 기존 ActionRecommendationOrchestrator의 8번째 signal collector 역할.
 * 4개 엔진 결과에서 SEO/콘텐츠/여정 관련 실행 액션을 추출한다.
 *
 * 품질 정책:
 * - quality.level === "INSUFFICIENT" → 빈 배열 반환
 * - quality.isMockOnly → 액션에 "[검증 필요]" 접두 경고
 */

import type { RecommendedAction } from "../actions/action-recommendation-orchestrator";
import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
  RoleContext,
} from "./types";
import { ROLE_OUTPUT_CONFIG } from "./types";

const SOURCE_MODULE = "SEARCH_INTELLIGENCE";

const SEARCH_OWNER_MAP: Record<string, string> = {
  CONTENT_CREATION: "콘텐츠 담당자",
  SEO_OPTIMIZATION: "SEO 담당자",
  CONTENT_OPTIMIZATION: "콘텐츠 담당자",
  ADVERTISING: "광고 담당자",
};

const PRIORITY_TIMING: Record<string, string> = {
  CRITICAL: "즉시 대응 필요",
  HIGH: "1주 이내",
  MEDIUM: "다음 콘텐츠 기획 시",
  LOW: "분기 리뷰 시 검토",
};

export class SearchActionIntegrationService {
  /**
   * SearchIntelligenceResult에서 RecommendedAction 배열을 추출한다.
   */
  collectActions(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    roleContext?: RoleContext,
  ): RecommendedAction[] {
    if (!quality.usableForInsight) {
      return [];
    }

    const actions: RecommendedAction[] = [];
    const prefix = quality.isMockOnly ? "[검증 필요] " : "";
    const config = roleContext ? ROLE_OUTPUT_CONFIG[roleContext] : undefined;

    // 1. Cluster 기반 액션
    if (result.cluster?.success && result.cluster.data) {
      actions.push(...this.clusterActions(result, quality, prefix));
    }

    // 2. Pathfinder 기반 액션
    if (result.pathfinder?.success && result.pathfinder.data) {
      actions.push(...this.pathfinderActions(result, quality, prefix));
    }

    // 3. RoadView 기반 액션
    if (result.roadview?.success && result.roadview.data) {
      actions.push(...this.roadViewActions(result, quality, prefix));
    }

    // 4. Persona 기반 액션
    if (result.persona?.success && result.persona.data) {
      actions.push(...this.personaActions(result, quality, prefix));
    }

    // Owner/timing enrichment
    for (const action of actions) {
      action.suggestedOwner =
        SEARCH_OWNER_MAP[action.category] ?? "마케팅 담당자";
      action.suggestedTiming = PRIORITY_TIMING[action.priority] ?? null;
    }

    // Role-based filtering: EXECUTIVE는 상위 3개만
    if (config && config.narrativeStyle === "strategic") {
      return actions
        .sort((a, b) => {
          const order: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          return (order[a.priority] ?? 99) - (order[b.priority] ?? 99);
        })
        .slice(0, 3);
    }

    return actions;
  }

  // ---------------------------------------------------------------------------
  // Cluster Actions
  // ---------------------------------------------------------------------------

  private clusterActions(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    prefix: string,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    const data = result.cluster!.data as any;
    const clusters = data?.clusters ?? [];
    const keyword = result.seedKeyword;

    if (clusters.length >= 3) {
      const clusterLabels = clusters
        .slice(0, 3)
        .map((c: any) => `"${c.label ?? c.id}"`)
        .join(", ");

      actions.push({
        title: `${prefix}클러스터별 콘텐츠 전략 수립 — "${keyword}"`,
        description:
          `"${keyword}" 검색에서 ${clusters.length}개의 의도 클러스터가 발견되었습니다 (${clusterLabels}). ` +
          `각 클러스터를 타겟으로 한 콘텐츠 시리즈를 기획하세요.`,
        category: "CONTENT_CREATION",
        priority: quality.confidence >= 0.6 ? "HIGH" : "MEDIUM",
        expectedImpact:
          "클러스터별 맞춤 콘텐츠로 검색 의도 커버리지 확대 및 유입 증가",
        evidenceIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        suggestedOwner: null,
        suggestedTiming: null,
        insightContext:
          `${clusters.length}개의 의도 그룹이 "${keyword}" 안에 공존합니다. ` +
          `하나의 콘텐츠로는 모든 의도를 충족할 수 없으므로, 의도별 콘텐츠 분리가 필요합니다.`,
      });
    }

    return actions;
  }

  // ---------------------------------------------------------------------------
  // Pathfinder Actions
  // ---------------------------------------------------------------------------

  private pathfinderActions(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    prefix: string,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    const data = result.pathfinder!.data as any;
    const nodes = data?.nodes ?? [];
    const paths = data?.paths ?? [];
    const keyword = result.seedKeyword;

    // 허브 키워드 콘텐츠 제작
    const hubNodes = nodes
      .filter((n: any) => (n.edges?.length ?? n.connections ?? 0) >= 3)
      .slice(0, 5);

    if (hubNodes.length > 0) {
      const hubKeywords = hubNodes
        .map((n: any) => `"${n.keyword ?? n.label ?? n.id}"`)
        .join(", ");

      actions.push({
        title: `${prefix}허브 키워드 콘텐츠 제작 — ${hubNodes.length}개`,
        description:
          `"${keyword}" 검색 여정에서 높은 연결도를 가진 허브 키워드: ${hubKeywords}. ` +
          `이 키워드를 중심으로 한 피러 콘텐츠를 제작하세요.`,
        category: "SEO_OPTIMIZATION",
        priority: quality.confidence >= 0.5 ? "HIGH" : "MEDIUM",
        expectedImpact: "허브 키워드 선점으로 다수의 검색 경로에서 유입 확보",
        evidenceIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        suggestedOwner: null,
        suggestedTiming: null,
        insightContext:
          `${hubNodes.length}개의 허브 키워드는 검색 여정에서 교차점 역할을 합니다. ` +
          `이 키워드를 타겟으로 콘텐츠를 만들면 여러 검색 경로에서 동시에 노출될 수 있습니다.`,
      });
    }

    // 경로 기반 콘텐츠 시리즈
    if (paths.length >= 2) {
      actions.push({
        title: `${prefix}검색 여정 기반 콘텐츠 시리즈 기획`,
        description:
          `"${keyword}"에서 출발하는 ${paths.length}개의 검색 경로를 발견했습니다. ` +
          `사용자가 따라가는 주요 경로를 커버하는 콘텐츠 시리즈를 기획하세요.`,
        category: "CONTENT_CREATION",
        priority: "MEDIUM",
        expectedImpact:
          "사용자 검색 경로를 따라가는 콘텐츠로 검색 여정 전체를 캡처",
        evidenceIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        suggestedOwner: null,
        suggestedTiming: null,
        insightContext:
          `사용자는 "${keyword}"를 검색한 후 ${paths.length}개의 서로 다른 경로로 탐색합니다. ` +
          `주요 경로를 커버하면 이탈률을 줄이고 브랜드 접점을 늘릴 수 있습니다.`,
      });
    }

    return actions;
  }

  // ---------------------------------------------------------------------------
  // RoadView Actions
  // ---------------------------------------------------------------------------

  private roadViewActions(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    prefix: string,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    const data = result.roadview!.data as any;
    const stages = data?.stages ?? [];
    const keyword = result.seedKeyword;

    const weakStages = stages.filter(
      (s: any) => (s.keywordCount ?? s.keywords?.length ?? 0) < 3,
    );

    if (weakStages.length > 0) {
      const weakNames = weakStages
        .map((s: any) => `"${s.name ?? s.stage}"`)
        .join(", ");

      actions.push({
        title: `${prefix}여정 단계별 콘텐츠 보강 — ${weakStages.length}개 단계`,
        description:
          `"${keyword}" 사용자 여정의 ${weakNames} 단계에서 콘텐츠 갭이 발견되었습니다. ` +
          `해당 단계를 타겟으로 한 콘텐츠를 우선 제작하세요.`,
        category: "CONTENT_CREATION",
        priority: quality.confidence >= 0.5 ? "HIGH" : "MEDIUM",
        expectedImpact: "여정 갭 보완으로 사용자 이탈 방지 및 전환율 향상",
        evidenceIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        suggestedOwner: null,
        suggestedTiming: null,
        insightContext:
          `사용자 여정의 ${weakStages.length}개 단계에서 관련 콘텐츠가 부족합니다. ` +
          `이 갭을 메우면 사용자가 여정 중간에 경쟁사로 이탈하는 것을 방지할 수 있습니다.`,
      });
    }

    return actions;
  }

  // ---------------------------------------------------------------------------
  // Persona Actions
  // ---------------------------------------------------------------------------

  private personaActions(
    result: SearchIntelligenceResult,
    quality: SearchDataQualityAssessment,
    prefix: string,
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    const data = result.persona!.data as any;
    const personas = data?.personas ?? [];
    const keyword = result.seedKeyword;

    if (personas.length >= 2) {
      const personaList = personas
        .slice(0, 3)
        .map((p: any) => `"${p.name ?? p.archetype ?? p.type}"`)
        .join(", ");

      actions.push({
        title: `${prefix}페르소나별 타겟 콘텐츠 전략 수립`,
        description:
          `"${keyword}" 검색에서 ${personas.length}개의 검색자 페르소나가 식별되었습니다: ${personaList}. ` +
          `각 페르소나에 맞춤화된 콘텐츠 전략을 수립하세요.`,
        category: "CONTENT_OPTIMIZATION",
        priority: "MEDIUM",
        expectedImpact: "타겟별 맞춤 콘텐츠로 검색 의도 적합도와 참여율 향상",
        evidenceIds: [result.trace.analysisId],
        sourceModules: [SOURCE_MODULE],
        suggestedOwner: null,
        suggestedTiming: null,
        insightContext:
          `${personas.length}개의 서로 다른 유형의 사용자가 "${keyword}"를 검색합니다. ` +
          `범용 콘텐츠보다 페르소나별로 메시지를 분리하면 전환율이 향상됩니다.`,
      });
    }

    return actions;
  }
}
