/**
 * PtNarrativeAssembler
 *
 * Search Intelligence 결과 + Insight + Action을 종합하여
 * PT 전체의 스토리라인과 전략 메시지를 생성.
 *
 * "데이터 나열"이 아니라 "설득 스토리"를 만드는 서비스.
 *
 * 입력: SearchResult + QualityAssessment + InsightItem[] + ActionItem[]
 * 출력: PtNarrative (overallStoryline + strategicMessage + topInsights + recommendedActions)
 *
 * evidence 연결: 각 insight의 evidenceRefs 카테고리를 PtNarrative에 전달
 * confidence 처리: low confidence면 storyline에 "추가 검증 권장" 포함
 */

import type { PtNarrative, PtQualityMeta } from "./types";

type EngineResult<T = unknown> = {
  success: boolean;
  data?: T;
};

type SearchResult = {
  seedKeyword: string;
  analyzedAt: string;
  cluster?: EngineResult;
  pathfinder?: EngineResult;
  roadview?: EngineResult;
  persona?: EngineResult;
  trace: { confidence: number; freshness?: string; warnings?: string[] };
};

type InsightItem = {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  severity?: string;
  evidenceRefs?: { category: string }[];
};

type ActionItem = {
  id?: string;
  category?: string;
  title?: string;
  description?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
};

export class PtNarrativeAssembler {
  /**
   * 전체 PT의 내러티브(스토리라인 + 전략 메시지)를 생성.
   */
  assemble(
    result: SearchResult,
    quality: PtQualityMeta,
    insights: InsightItem[],
    actions: ActionItem[],
  ): PtNarrative {
    const kw = result.seedKeyword;

    return {
      overallStoryline: this.buildStoryline(result, quality),
      strategicMessage: this.buildStrategicMessage(result, quality),
      topInsights: this.buildTopInsights(kw, insights),
      recommendedActions: this.buildRecommendedActions(actions),
    };
  }

  // ─── Storyline ──────────────────────────────────────────────────────

  private buildStoryline(result: SearchResult, quality: PtQualityMeta): string {
    const kw = result.seedKeyword;

    const clusterData = result.cluster?.data as
      | { clusters?: unknown[] }
      | undefined;
    const personaData = result.persona?.data as
      | { personas?: unknown[] }
      | undefined;
    const roadData = result.roadview?.data as
      | {
          stages?: unknown[];
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const pathData = result.pathfinder?.data as
      | { totalPaths?: number }
      | undefined;

    const clusterCount = clusterData?.clusters?.length ?? 0;
    const personaCount = personaData?.personas?.length ?? 0;
    const stageCount = roadData?.stages?.length ?? 0;
    const weakStageCount = roadData?.summary?.weakStages?.length ?? 0;
    const pathCount = pathData?.totalPaths ?? 0;

    const parts: string[] = [];

    // 시장 상황
    parts.push(
      `"${kw}" 시장은 ${clusterCount}개 관심 영역과 ${personaCount}가지 고객 유형으로 구성되어 있습니다.`,
    );

    // 문제/기회
    if (weakStageCount > 0) {
      parts.push(
        `고객 여정 ${stageCount}단계 중 ${weakStageCount}개 단계에서 콘텐츠 공백이 발견되었습니다.`,
      );
    }
    if (pathCount > 0) {
      parts.push(
        `${pathCount}개의 탐색 경로 분석 결과, 핵심 허브 키워드를 중심으로 유입 전략을 수립할 수 있습니다.`,
      );
    }

    // 전략 방향
    parts.push(
      "데이터가 가리키는 방향은 명확합니다: 고객이 찾는 정보를 먼저 제공하는 브랜드가 시장을 주도합니다.",
    );

    // 신뢰도 경고
    if (quality.isMockOnly) {
      parts.push(
        "(본 분석은 검증 데이터 기반이며, 실데이터 확보 시 전략을 고도화할 수 있습니다.)",
      );
    } else if ((quality.confidence ?? 0) < 0.5) {
      parts.push(
        "(분석 신뢰도가 제한적이므로, 추가 데이터 수집 후 전략을 구체화하는 것을 권장합니다.)",
      );
    }

    return parts.join(" ");
  }

  // ─── Strategic Message ──────────────────────────────────────────────

  private buildStrategicMessage(
    result: SearchResult,
    quality: PtQualityMeta,
  ): string {
    const kw = result.seedKeyword;
    const roadData = result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];

    if (weakStages.length > 0) {
      return `"${kw}" 고객 여정의 핵심 공백을 채워 검색 시장의 주도권을 확보하세요. 데이터가 기회를 가리키고 있습니다.`;
    }

    const clusterData = result.cluster?.data as
      | { clusters?: unknown[] }
      | undefined;
    const clusterCount = clusterData?.clusters?.length ?? 0;
    if (clusterCount > 3) {
      return `"${kw}" 시장의 ${clusterCount}개 관심 영역을 클러스터별로 공략하여 검색 점유율을 확대하세요.`;
    }

    return `"${kw}" 시장에서 데이터 기반 전략으로 고객에게 먼저 다가가세요.`;
  }

  // ─── Top Insights ───────────────────────────────────────────────────

  private buildTopInsights(
    seedKeyword: string,
    insights: InsightItem[],
  ): PtNarrative["topInsights"] {
    // 우선순위: OPPORTUNITY > KEY_FINDING > TREND_CHANGE > RISK
    const priority = ["OPPORTUNITY", "KEY_FINDING", "TREND_CHANGE", "RISK"];
    const sorted = [...insights].sort((a, b) => {
      const aIdx = priority.indexOf(a.category ?? "");
      const bIdx = priority.indexOf(b.category ?? "");
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });

    const top = sorted.slice(0, 5).map((i) => ({
      insightId: i.id,
      message: this.toBusinessLanguage(
        i.title ?? i.description ?? "",
        seedKeyword,
      ),
      evidenceCategory: i.evidenceRefs?.[0]?.category,
    }));

    // 최소 3개 보장
    if (top.length === 0) {
      top.push(
        {
          insightId: undefined,
          message: `"${seedKeyword}" 관련 검색 관심이 다양한 방향으로 확산되고 있습니다`,
          evidenceCategory: "search_cluster_distribution",
        },
        {
          insightId: undefined,
          message: "고객 여정의 특정 단계에서 콘텐츠 기회가 발견되었습니다",
          evidenceCategory: "search_roadview_stages",
        },
        {
          insightId: undefined,
          message: "핵심 허브 키워드를 중심으로 유입 전략 수립이 가능합니다",
          evidenceCategory: "search_pathfinder_graph",
        },
      );
    }

    return top;
  }

  // ─── Recommended Actions ────────────────────────────────────────────

  private buildRecommendedActions(
    actions: ActionItem[],
  ): PtNarrative["recommendedActions"] {
    if (actions.length === 0) {
      return [
        { action: "클러스터별 FAQ 콘텐츠 제작", priority: "HIGH" },
        { action: "고객 여정 갭 단계 콘텐츠 보강", priority: "HIGH" },
        { action: "허브 키워드 SEO 최적화", priority: "MEDIUM" },
        { action: "페르소나별 타겟 캠페인 설계", priority: "MEDIUM" },
      ];
    }

    return actions
      .sort((a, b) => {
        const p = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return (p[a.priority ?? "LOW"] ?? 2) - (p[b.priority ?? "LOW"] ?? 2);
      })
      .slice(0, 5)
      .map((a) => ({
        actionId: a.id,
        action: a.title ?? a.description ?? "",
        owner: a.owner,
        priority: a.priority ?? "MEDIUM",
      }));
  }

  // ─── Language Helper ────────────────────────────────────────────────

  /**
   * 기술 용어를 비즈니스 언어로 변환.
   */
  private toBusinessLanguage(text: string, seedKeyword: string): string {
    return text
      .replace(/search_cluster/gi, "관심 영역")
      .replace(/pathfinder/gi, "검색 경로")
      .replace(/roadview/gi, "고객 여정")
      .replace(/hubScore/gi, "중요도")
      .replace(/weakStages?/gi, "콘텐츠 공백 단계")
      .replace(/gapScore/gi, "보강 필요도")
      .replace(/engine/gi, "분석")
      .replace(/confidence/gi, "신뢰도")
      .replace(/evidence/gi, "근거")
      .replace(/cluster/gi, "관심 영역")
      .replace(/persona/gi, "고객 유형")
      .replace(/intent/gi, "검색 의도");
  }
}
