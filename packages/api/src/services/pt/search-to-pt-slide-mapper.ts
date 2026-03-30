/**
 * SearchToPtSlideMapper
 *
 * Search Intelligence 엔진 결과를 PT 장표용 메시지 구조로 변환.
 * 기존 SearchPtSectionBuilder와 달리 "메시지 중심" 구조:
 * - keyMessage 필수
 * - 비즈니스 언어 (내부 기술 용어 X)
 * - "그래서 무엇을 해야 하는가"가 빠지지 않음
 *
 * 입력: SearchResult (4 엔진 결과) + QualityAssessment
 * 출력: 각 슬라이드 유형별 headline/keyMessage/supportingPoints
 *
 * evidence 연결: EvidenceRef[] 카테고리별 필터링 후 삽입
 * confidence 처리: keyMessage에 신뢰도 언급, mock이면 경고
 */

import type {
  PtSlideBlock,
  PtSlideType,
  PtQualityMeta,
  EvidenceRef,
  SourceRef,
} from "./types";
import type { EvidenceToPtVisualHintMapper } from "./evidence-to-pt-visual-hint-mapper";

// ─── External type shapes ─────────────────────────────────────────────

type EngineResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type SearchResult = {
  seedKeyword: string;
  analyzedAt: string;
  cluster?: EngineResult;
  pathfinder?: EngineResult;
  roadview?: EngineResult;
  persona?: EngineResult;
  trace: {
    confidence: number;
    freshness?: string;
    analysisId?: string;
    warnings?: string[];
    sourceSummary?: { name: string; status: string; itemCount?: number }[];
  };
};

type QualityAssessment = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// Insight/Action shapes (from search-intelligence integration services)
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

// Social/comment integration shapes
type SocialInsight = {
  sentimentSummary?: string;
  topTopics?: string[];
  riskSignals?: string[];
  faqHighlights?: string[];
};

type CompetitorGap = {
  summary?: string;
  gaps?: string[];
  opportunities?: string[];
};

// ─── Slide Context (빌더에 전달되는 통합 입력) ─────────────────────────

export type SlideContext = {
  result: SearchResult;
  quality: QualityAssessment;
  qualityMeta: PtQualityMeta;
  evidenceRefs: EvidenceRef[];
  sourceRefs: SourceRef[];
  insights?: InsightItem[];
  actions?: ActionItem[];
  socialInsight?: SocialInsight;
  competitorGap?: CompetitorGap;
};

let slideCounter = 0;
function nextId(type: string): string {
  return `pt-${type}-${++slideCounter}-${Date.now()}`;
}

export class SearchToPtSlideMapper {
  constructor(private readonly visualMapper: EvidenceToPtVisualHintMapper) {}

  /**
   * 슬라이드 유형별 빌드 디스패치.
   * evidence 없이 생성 불가능한 슬라이드는 null 반환.
   */
  buildSlide(
    slideType: PtSlideType,
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock | null {
    switch (slideType) {
      case "TITLE":
        return this.buildTitle(ctx, order);
      case "EXECUTIVE_SUMMARY":
        return this.buildExecutiveSummary(ctx, order);
      case "PROBLEM_DEFINITION":
        return this.buildProblemDefinition(ctx, order);
      case "OPPORTUNITY":
        return this.buildOpportunity(ctx, order);
      case "PATHFINDER":
        return this.buildPathfinder(ctx, order);
      case "ROADVIEW":
        return this.buildRoadview(ctx, order);
      case "PERSONA":
        return this.buildPersona(ctx, order);
      case "CLUSTER":
        return this.buildCluster(ctx, order);
      case "SOCIAL_INSIGHT":
        return this.buildSocialInsight(ctx, order);
      case "COMPETITIVE_GAP":
        return this.buildCompetitiveGap(ctx, order);
      case "GEO_AEO":
        return this.buildGeoAeo(ctx, order);
      case "STRATEGY":
        return this.buildStrategy(ctx, order);
      case "ACTION":
        return this.buildAction(ctx, order);
      case "EXPECTED_IMPACT":
        return this.buildExpectedImpact(ctx, order);
      case "EVIDENCE":
        return this.buildEvidence(ctx, order);
      case "CLOSING":
        return this.buildClosing(ctx, order);
      default:
        return null;
    }
  }

  // ─── TITLE ──────────────────────────────────────────────────────────

  private buildTitle(ctx: SlideContext, order: number): PtSlideBlock {
    const kw = ctx.result.seedKeyword;
    return {
      id: nextId("title"),
      slideType: "TITLE",
      headline: `"${kw}" 시장 검색 인텔리전스 분석`,
      subHeadline: `분석 기준일: ${ctx.result.analyzedAt}`,
      keyMessage: `${kw} 시장의 검색 흐름과 고객 행동을 분석하여 전략적 기회를 도출합니다.`,
      supportingPoints: [],
      evidenceRefs: [],
      sourceRefs: [],
      recommendedVisualType: "none",
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── EXECUTIVE SUMMARY ──────────────────────────────────────────────

  private buildExecutiveSummary(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock {
    const kw = ctx.result.seedKeyword;
    const clusterData = ctx.result.cluster?.data as
      | {
          totalClusters?: number;
          clusters?: unknown[];
        }
      | undefined;
    const personaData = ctx.result.persona?.data as
      | {
          personas?: unknown[];
        }
      | undefined;
    const roadData = ctx.result.roadview?.data as
      | {
          stages?: unknown[];
          summary?: { weakStages?: string[] };
        }
      | undefined;

    const clusterCount =
      clusterData?.totalClusters ?? clusterData?.clusters?.length ?? 0;
    const personaCount = personaData?.personas?.length ?? 0;
    const weakStages = roadData?.summary?.weakStages ?? [];

    const points: string[] = [];
    if (clusterCount > 0)
      points.push(
        `${clusterCount}개 핵심 관심 영역이 시장을 형성하고 있습니다`,
      );
    if (personaCount > 0)
      points.push(
        `${personaCount}가지 유형의 고객이 서로 다른 니즈로 검색하고 있습니다`,
      );
    if (weakStages.length > 0)
      points.push(
        `${weakStages.length}개 단계에서 콘텐츠 부재로 고객 이탈이 발생하고 있습니다`,
      );
    points.push("데이터 기반 전략으로 검색 시장 선점이 가능합니다");

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_intelligence_quality",
    ]);

    return {
      id: nextId("exec"),
      slideType: "EXECUTIVE_SUMMARY",
      headline: "핵심 요약",
      subHeadline: `"${kw}" 시장의 3가지 전략적 시사점`,
      keyMessage:
        weakStages.length > 0
          ? `고객의 검색 여정 중 ${weakStages.length}개 단계에서 경쟁사 대비 콘텐츠 공백이 발견되었습니다. 이 영역을 선점하면 검색 유입을 확대할 수 있습니다.`
          : `${kw} 시장에서 ${clusterCount}개 핵심 관심 영역과 ${personaCount}가지 고객 유형이 발견되었습니다. 타겟 전략 수립이 필요합니다.`,
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: ctx.sourceRefs.slice(0, 3),
      recommendedVisualType: this.visualMapper.recommend(
        "EXECUTIVE_SUMMARY",
        ev,
      ),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── PROBLEM DEFINITION ─────────────────────────────────────────────

  private buildProblemDefinition(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock {
    const kw = ctx.result.seedKeyword;
    const roadData = ctx.result.roadview?.data as
      | {
          stages?: { stage: string; keywordCount?: number }[];
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];
    const pathData = ctx.result.pathfinder?.data as
      | {
          totalPaths?: number;
        }
      | undefined;

    const points: string[] = [];
    points.push(`"${kw}" 관련 검색이 다양한 방향으로 분산되고 있습니다`);
    if (weakStages.length > 0) {
      points.push(
        `비교/검토 단계에서 자사 콘텐츠가 부재하여 경쟁 브랜드로 이탈 가능성이 높습니다`,
      );
    }
    if ((pathData?.totalPaths ?? 0) > 5) {
      points.push(
        `${pathData!.totalPaths}개 이상의 탐색 경로가 존재하지만, 대부분의 경로에서 자사 노출이 부족합니다`,
      );
    }
    points.push("고객의 검색 흐름을 파악하고 전략적으로 대응해야 합니다");

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_intelligence_quality",
      "search_roadview_stages",
    ]);

    return {
      id: nextId("problem"),
      slideType: "PROBLEM_DEFINITION",
      headline: "현재 시장의 과제",
      subHeadline: "검색 흐름에서 발견된 브랜드 노출 공백",
      keyMessage:
        weakStages.length > 0
          ? `고객이 "${kw}"를 검색할 때, ${weakStages.join("·")} 단계에서 경쟁 브랜드로 이탈하고 있습니다.`
          : `"${kw}" 시장의 검색 흐름이 빠르게 변화하고 있어, 현재 전략의 재점검이 필요합니다.`,
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend(
        "PROBLEM_DEFINITION",
        ev,
      ),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── OPPORTUNITY ────────────────────────────────────────────────────

  private buildOpportunity(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock | null {
    const roadData = ctx.result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const pathData = ctx.result.pathfinder?.data as
      | {
          nodes?: { name?: string; hubScore?: number }[];
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];
    const topHubs = [...(pathData?.nodes ?? [])]
      .sort((a, b) => (b.hubScore ?? 0) - (a.hubScore ?? 0))
      .slice(0, 3)
      .map((n) => n.name ?? "")
      .filter(Boolean);

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_roadview_stages",
      "search_pathfinder_graph",
    ]);
    if (ev.length === 0) return null;

    const points: string[] = [];
    if (weakStages.length > 0)
      points.push(
        `${weakStages.join(", ")} 단계에서 콘텐츠 선점 기회가 존재합니다`,
      );
    if (topHubs.length > 0)
      points.push(
        `핵심 허브 키워드(${topHubs.join(", ")}) 중심의 콘텐츠 전략으로 탐색 경로를 장악할 수 있습니다`,
      );
    points.push("경쟁사가 아직 채우지 못한 검색 수요를 선점하세요");

    return {
      id: nextId("opportunity"),
      slideType: "OPPORTUNITY",
      headline: "기회 영역",
      subHeadline: "검색 흐름에서 발견된 선점 가능 영역",
      keyMessage:
        weakStages.length > 0
          ? `경쟁사가 비어 있는 ${weakStages.length}개 단계를 먼저 채우면, 검색 유입의 주도권을 가져올 수 있습니다.`
          : "핵심 허브 키워드를 중심으로 콘텐츠를 배치하면 검색 경로의 주도권을 확보할 수 있습니다.",
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("OPPORTUNITY", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── PATHFINDER ─────────────────────────────────────────────────────

  private buildPathfinder(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock | null {
    const pathData = ctx.result.pathfinder?.data as
      | {
          totalNodes?: number;
          totalPaths?: number;
          paths?: { steps?: string[] }[];
          nodes?: { name?: string; label?: string; hubScore?: number }[];
        }
      | undefined;

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_pathfinder_graph",
    ]);
    if (ev.length === 0) return null;

    const topHubs = [...(pathData?.nodes ?? [])]
      .sort((a, b) => (b.hubScore ?? 0) - (a.hubScore ?? 0))
      .slice(0, 3)
      .map((n) => n.name ?? n.label ?? "");
    const topPath = pathData?.paths?.[0]?.steps?.join(" → ") ?? "";

    const points: string[] = [];
    if (topHubs.length > 0) {
      points.push(`고객이 자주 거치는 핵심 키워드: ${topHubs.join(", ")}`);
      points.push(
        "이 키워드를 중심으로 콘텐츠 시리즈를 구성하면 자연 유입이 증가합니다",
      );
    }
    if (topPath) points.push(`대표 탐색 경로: ${topPath}`);
    points.push(
      "탐색 경로를 이해하면 어디에 콘텐츠를 배치해야 하는지 알 수 있습니다",
    );

    return {
      id: nextId("pathfinder"),
      slideType: "PATHFINDER",
      headline: "고객은 이렇게 검색합니다",
      subHeadline: `${pathData?.totalPaths ?? 0}개 탐색 경로 분석 결과`,
      keyMessage:
        topHubs.length > 0
          ? `고객의 검색 여정에서 "${topHubs[0]}"이(가) 가장 중요한 허브 키워드입니다. 이 키워드를 중심으로 콘텐츠를 배치해야 합니다.`
          : "고객의 검색 경로를 파악하여 자연 유입 경로를 설계할 수 있습니다.",
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("PATHFINDER", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── ROADVIEW ───────────────────────────────────────────────────────

  private buildRoadview(ctx: SlideContext, order: number): PtSlideBlock | null {
    const roadData = ctx.result.roadview?.data as
      | {
          stages?: {
            stage: string;
            label?: string;
            keywordCount?: number;
            gapScore?: number;
          }[];
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const stages = roadData?.stages ?? [];

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_roadview_stages",
    ]);
    if (ev.length === 0 || stages.length === 0) return null;

    const LABELS: Record<string, string> = {
      awareness: "인지",
      interest: "관심",
      comparison: "비교",
      decision: "결정",
      action: "구매",
      advocacy: "추천",
    };
    const weakStages = roadData?.summary?.weakStages ?? [];

    const points = stages.slice(0, 5).map((s) => {
      const label = s.label ?? LABELS[s.stage] ?? s.stage;
      const gap = weakStages.includes(s.stage)
        ? " → 콘텐츠 공백 발견, 우선 보강 필요"
        : "";
      return `${label} 단계: 키워드 ${s.keywordCount ?? 0}개${gap}`;
    });

    return {
      id: nextId("roadview"),
      slideType: "ROADVIEW",
      headline: "고객 여정의 단계별 검색 행동",
      subHeadline: `${stages.length}단계 여정에서 단계별 전략이 다릅니다`,
      keyMessage:
        weakStages.length > 0
          ? `고객이 ${weakStages.map((s) => LABELS[s] ?? s).join("·")} 단계에서 정보를 찾지 못하고 있습니다. 이 단계를 채우면 구매 전환율을 높일 수 있습니다.`
          : `${stages.length}단계의 고객 여정에 맞춘 콘텐츠 전략이 필요합니다.`,
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("ROADVIEW", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── PERSONA ────────────────────────────────────────────────────────

  private buildPersona(ctx: SlideContext, order: number): PtSlideBlock | null {
    const personaData = ctx.result.persona?.data as
      | {
          personas?: {
            label?: string;
            name?: string;
            description?: string;
            percentage?: number;
            archetype?: string;
            keywords?: string[];
            needs?: string[];
          }[];
        }
      | undefined;
    const personas = personaData?.personas ?? [];

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_persona_profiles",
    ]);
    if (ev.length === 0 || personas.length === 0) return null;

    const points = personas.slice(0, 4).map((p) => {
      const name = p.label ?? p.name ?? "미확인";
      const pct = p.percentage != null ? ` (${p.percentage}%)` : "";
      const desc = p.description ?? p.archetype ?? "";
      return `${name}${pct}: ${desc}`;
    });

    const topPersona = personas[0];

    return {
      id: nextId("persona"),
      slideType: "PERSONA",
      headline: "이런 고객이 검색하고 있습니다",
      subHeadline: `${personas.length}가지 유형의 검색자 프로필`,
      keyMessage: topPersona
        ? `가장 큰 비중을 차지하는 "${topPersona.label ?? topPersona.name}" 유형에 맞춘 메시지가 핵심입니다.`
        : `${personas.length}가지 고객 유형에 맞춘 차별화된 콘텐츠 전략이 필요합니다.`,
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("PERSONA", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── CLUSTER ────────────────────────────────────────────────────────

  private buildCluster(ctx: SlideContext, order: number): PtSlideBlock | null {
    const clusterData = ctx.result.cluster?.data as
      | {
          clusters?: {
            label: string;
            memberCount?: number;
            keywords?: string[];
            topKeywords?: string[];
          }[];
        }
      | undefined;
    const clusters = clusterData?.clusters ?? [];

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_cluster_distribution",
      "search_cluster_detail",
    ]);
    if (ev.length === 0 || clusters.length === 0) return null;

    const points = clusters.slice(0, 4).map((c) => {
      const kws = (c.topKeywords ?? c.keywords ?? []).slice(0, 3).join(", ");
      return `${c.label} (${c.memberCount ?? 0}개 키워드): ${kws}`;
    });

    return {
      id: nextId("cluster"),
      slideType: "CLUSTER",
      headline: "고객이 지금 관심 갖는 주제",
      subHeadline: `${clusters.length}개 핵심 관심 영역 분석`,
      keyMessage: `"${ctx.result.seedKeyword}" 시장은 ${clusters.length}개 관심 영역으로 구성되어 있으며, 각 영역별로 다른 콘텐츠/캠페인 전략이 필요합니다.`,
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("CLUSTER", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── SOCIAL INSIGHT ─────────────────────────────────────────────────

  private buildSocialInsight(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock | null {
    const social = ctx.socialInsight;
    if (!social) return null;

    const hasContent =
      social.sentimentSummary ||
      (social.topTopics && social.topTopics.length > 0) ||
      (social.riskSignals && social.riskSignals.length > 0) ||
      (social.faqHighlights && social.faqHighlights.length > 0);
    if (!hasContent) return null;

    const points: string[] = [];
    if (social.sentimentSummary) points.push(social.sentimentSummary);
    if (social.topTopics?.length)
      points.push(
        `소셜에서 화제가 되는 주제: ${social.topTopics.slice(0, 3).join(", ")}`,
      );
    if (social.faqHighlights?.length)
      points.push(
        `고객이 자주 묻는 질문: ${social.faqHighlights.slice(0, 2).join(", ")}`,
      );
    if (social.riskSignals?.length)
      points.push(
        `주의가 필요한 신호: ${social.riskSignals.slice(0, 2).join(", ")}`,
      );

    return {
      id: nextId("social"),
      slideType: "SOCIAL_INSIGHT",
      headline: "소셜과 댓글에서 들리는 목소리",
      subHeadline: "검색 데이터와 소셜 반응의 교차점",
      keyMessage: social.riskSignals?.length
        ? "검색 관심은 높지만 소셜에서 부정적 신호가 감지되고 있어, 선제적 대응이 필요합니다."
        : "검색 관심과 소셜 반응이 일치하는 영역을 중심으로 캠페인을 집중하세요.",
      supportingPoints: points,
      evidenceRefs: ctx.evidenceRefs.slice(0, 2),
      sourceRefs: [],
      recommendedVisualType: "quote_highlight",
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── COMPETITIVE GAP ───────────────────────────────────────────────

  private buildCompetitiveGap(
    ctx: SlideContext,
    order: number,
  ): PtSlideBlock | null {
    const gap = ctx.competitorGap;
    const roadData = ctx.result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];

    const ev = this.filterEvidence(ctx.evidenceRefs, [
      "search_roadview_stages",
      "search_pathfinder_graph",
    ]);

    const points: string[] = [];
    if (gap?.gaps?.length) points.push(...gap.gaps.slice(0, 3));
    else if (weakStages.length > 0)
      points.push(`${weakStages.join(", ")} 단계에서 경쟁사 대비 콘텐츠 공백`);
    if (gap?.opportunities?.length)
      points.push(...gap.opportunities.slice(0, 2));
    else
      points.push(
        "허브 키워드 선점과 FAQ 콘텐츠 확보가 경쟁 우위의 핵심입니다",
      );

    if (points.length === 0) return null;

    return {
      id: nextId("competitive"),
      slideType: "COMPETITIVE_GAP",
      headline: "경쟁 환경에서 우리의 위치",
      subHeadline: gap?.summary ?? "검색 흐름 기반 경쟁 분석",
      keyMessage:
        weakStages.length > 0
          ? `경쟁사가 아직 채우지 못한 ${weakStages.length}개 단계가 존재합니다. 먼저 채우는 브랜드가 검색 시장을 주도합니다.`
          : "검색 경로 분석에서 경쟁 우위를 확보할 수 있는 영역이 발견되었습니다.",
      supportingPoints: points,
      evidenceRefs: ev,
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend("COMPETITIVE_GAP", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── GEO/AEO ───────────────────────────────────────────────────────

  private buildGeoAeo(ctx: SlideContext, order: number): PtSlideBlock {
    const kw = ctx.result.seedKeyword;
    const citationReady = ctx.sourceRefs.filter((s) => s.citationReady);
    const ev = ctx.evidenceRefs.slice(0, 4);

    return {
      id: nextId("geoaeo"),
      slideType: "GEO_AEO",
      headline: "AI 검색에서 선택받는 브랜드 되기",
      subHeadline: "Google AI Overview, Perplexity 등 AI 검색 대응 전략",
      keyMessage: `AI 검색엔진은 구조화된 FAQ와 명확한 답변을 인용합니다. "${kw}" 관련 콘텐츠를 AI가 인용하기 좋은 형태로 재구성해야 합니다.`,
      supportingPoints: [
        "클러스터별 FAQ 페이지를 구조화하여 AI Overview 인용 대상이 되세요",
        "여정 단계별 가이드 콘텐츠로 'How-to' 검색 인용을 확보하세요",
        citationReady.length > 0
          ? `현재 ${citationReady.length}개 소스가 인용 준비 완료 상태입니다`
          : "자사 콘텐츠의 구조화 데이터 적용이 시급합니다",
        "schema.org 마크업 적용으로 AI 검색엔진 가시성을 높이세요",
      ],
      evidenceRefs: ev,
      sourceRefs: citationReady.slice(0, 3),
      recommendedVisualType: this.visualMapper.recommend("GEO_AEO", ev),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── STRATEGY ───────────────────────────────────────────────────────

  private buildStrategy(ctx: SlideContext, order: number): PtSlideBlock {
    const kw = ctx.result.seedKeyword;
    const insights = ctx.insights ?? [];
    const topInsights = insights
      .filter(
        (i) => i.category === "OPPORTUNITY" || i.category === "KEY_FINDING",
      )
      .slice(0, 3);

    const points: string[] = [];
    for (const insight of topInsights) {
      if (insight.title) points.push(insight.title);
    }

    if (points.length === 0) {
      points.push("허브 키워드 중심의 콘텐츠 시리즈 전개");
      points.push("고객 여정 갭 단계 우선 콘텐츠 보강");
      points.push("페르소나별 맞춤 메시지 전략 실행");
    }

    points.push("검색 인텔리전스 기반 데이터 드리븐 전략입니다");

    return {
      id: nextId("strategy"),
      slideType: "STRATEGY",
      headline: "전략 제안",
      subHeadline: `"${kw}" 시장 선점을 위한 핵심 전략`,
      keyMessage: `검색 흐름 분석에 기반한 3가지 핵심 전략으로 "${kw}" 시장에서의 브랜드 존재감을 강화할 수 있습니다.`,
      supportingPoints: points,
      evidenceRefs: ctx.evidenceRefs.slice(0, 3),
      sourceRefs: [],
      recommendedVisualType: "none",
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── ACTION ─────────────────────────────────────────────────────────

  private buildAction(ctx: SlideContext, order: number): PtSlideBlock {
    const actions = ctx.actions ?? [];
    const mockPrefix = ctx.qualityMeta.isMockOnly ? "[검증 필요] " : "";

    const points: string[] = [];
    const highActions = actions.filter((a) => a.priority === "HIGH");
    const medActions = actions.filter((a) => a.priority === "MEDIUM");

    for (const a of highActions.slice(0, 3)) {
      points.push(
        `🔴 ${a.title ?? a.description ?? ""}${a.owner ? ` (${a.owner})` : ""}`,
      );
    }
    for (const a of medActions.slice(0, 2)) {
      points.push(
        `🟡 ${a.title ?? a.description ?? ""}${a.owner ? ` (${a.owner})` : ""}`,
      );
    }

    if (points.length === 0) {
      points.push("클러스터별 FAQ 콘텐츠 제작");
      points.push("여정 갭 단계 콘텐츠 보강");
      points.push("허브 키워드 SEO 최적화");
      points.push("페르소나별 타겟 캠페인 실행");
    }

    return {
      id: nextId("action"),
      slideType: "ACTION",
      headline: `${mockPrefix}실행 액션 플랜`,
      subHeadline: "우선순위별 실행 항목",
      keyMessage:
        highActions.length > 0
          ? `${highActions.length}개 긴급 액션과 ${medActions.length}개 중요 액션을 단계적으로 실행해야 합니다.`
          : "4가지 핵심 실행 항목을 순차적으로 추진하세요.",
      supportingPoints: points,
      evidenceRefs: ctx.evidenceRefs.slice(0, 3),
      sourceRefs: [],
      recommendedVisualType: "none",
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── EXPECTED IMPACT ────────────────────────────────────────────────

  private buildExpectedImpact(ctx: SlideContext, order: number): PtSlideBlock {
    const roadData = ctx.result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];
    const clusterData = ctx.result.cluster?.data as
      | {
          clusters?: unknown[];
        }
      | undefined;
    const clusterCount = clusterData?.clusters?.length ?? 0;

    const points: string[] = [];
    if (weakStages.length > 0)
      points.push(
        `여정 갭 ${weakStages.length}개 단계 보강 시 검색 유입 확대 기대`,
      );
    if (clusterCount > 0)
      points.push(
        `${clusterCount}개 클러스터별 콘텐츠 확보 시 주제 커버리지 확대`,
      );
    points.push("허브 키워드 선점으로 자연 검색 유입 증가 기대");
    points.push("AI 검색엔진 인용 확보로 브랜드 신뢰도 향상");

    return {
      id: nextId("impact"),
      slideType: "EXPECTED_IMPACT",
      headline: "기대 효과",
      subHeadline: "전략 실행 시 예상되는 변화",
      keyMessage:
        "검색 인텔리전스 기반 전략을 실행하면 검색 유입, AI 인용, 브랜드 존재감이 동시에 강화됩니다.",
      supportingPoints: points,
      evidenceRefs: ctx.evidenceRefs.slice(0, 2),
      sourceRefs: [],
      recommendedVisualType: this.visualMapper.recommend(
        "EXPECTED_IMPACT",
        ctx.evidenceRefs,
      ),
      speakerNote: this.qualityNote(ctx.qualityMeta),
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── EVIDENCE ───────────────────────────────────────────────────────

  private buildEvidence(ctx: SlideContext, order: number): PtSlideBlock {
    const snippets = ctx.evidenceRefs
      .filter((e) => e.snippet)
      .slice(0, 6)
      .map((e) => `[${e.label}] ${e.snippet}`);

    return {
      id: nextId("evidence"),
      slideType: "EVIDENCE",
      headline: "분석 근거 자료",
      subHeadline: `${ctx.evidenceRefs.length}건의 데이터 근거`,
      keyMessage: "모든 전략 제안은 실제 검색 행동 데이터에 기반합니다.",
      supportingPoints:
        snippets.length > 0
          ? snippets
          : ["데이터 근거는 별도 부록에서 확인 가능합니다"],
      evidenceRefs: ctx.evidenceRefs,
      sourceRefs: ctx.sourceRefs,
      recommendedVisualType: this.visualMapper.recommend(
        "EVIDENCE",
        ctx.evidenceRefs,
      ),
      speakerNote: `총 ${ctx.evidenceRefs.length}건 evidence, ${ctx.sourceRefs.length}건 source. ${this.qualityNote(ctx.qualityMeta)}`,
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── CLOSING ────────────────────────────────────────────────────────

  private buildClosing(ctx: SlideContext, order: number): PtSlideBlock {
    return {
      id: nextId("closing"),
      slideType: "CLOSING",
      headline: "함께 시작합시다",
      keyMessage: `"${ctx.result.seedKeyword}" 시장의 검색 흐름을 이해하고, 데이터 기반으로 고객에게 먼저 다가가세요.`,
      supportingPoints: [
        "검색 인텔리전스 기반 전략 수립",
        "단계별 실행 로드맵 구체화",
        "성과 측정 및 전략 고도화",
      ],
      evidenceRefs: [],
      sourceRefs: [],
      recommendedVisualType: "none",
      quality: ctx.qualityMeta,
      order,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private filterEvidence(
    refs: EvidenceRef[],
    categories: string[],
  ): EvidenceRef[] {
    return refs.filter((r) => categories.includes(r.category));
  }

  private qualityNote(q: PtQualityMeta): string {
    const notes: string[] = [];
    if (q.isMockOnly) notes.push("⚠ 검증 필요 — 실데이터로 재확인 권장");
    if (q.freshness === "stale") notes.push("⚠ 데이터가 24시간 이상 경과");
    if (q.isPartial) notes.push("⚠ 일부 분석 결과 누락 — 부분 데이터 기반");
    if ((q.confidence ?? 0) < 0.3)
      notes.push(`⚠ 신뢰도 ${Math.round((q.confidence ?? 0) * 100)}%`);
    return notes.length > 0 ? notes.join(" | ") : "";
  }
}
