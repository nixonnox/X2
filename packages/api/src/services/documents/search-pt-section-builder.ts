/**
 * SearchPtSectionBuilder
 *
 * Search Intelligence 결과를 PT/제안서용 슬라이드 블록으로 변환.
 *
 * 입력: SearchIntelligenceResult + QualityAssessment + EvidenceRef[] + SourceRef[]
 * 출력: PtSlideBlock[] (10종 슬라이드)
 *
 * 핵심 원칙:
 * - 단순 데이터 나열이 아니라 메시지 구조가 있어야 한다
 * - 각 슬라이드에 evidence 근거가 연결되어야 한다
 * - confidence/stale/partial 상태를 speakerNote에 표기
 */

import type {
  PtSlideBlock,
  PtSlideType,
  EvidenceRef,
  SourceRef,
  DocumentQualityMeta,
} from "./types";
import type { EvidenceToDocumentMapper } from "./evidence-to-document-mapper";

type EngineResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  trace?: { confidence?: number; freshness?: string };
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

type QualityAssessment = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

let slideCounter = 0;
function nextSlideId(type: string): string {
  return `slide-${type}-${++slideCounter}-${Date.now()}`;
}

export class SearchPtSectionBuilder {
  constructor(private readonly mapper: EvidenceToDocumentMapper) {}

  /**
   * 전체 PT 슬라이드 세트 생성.
   * evidence가 없는 엔진 결과의 슬라이드는 건너뜀.
   */
  buildAll(
    result: SearchResult,
    quality: QualityAssessment,
    evidenceRefs: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): PtSlideBlock[] {
    if (quality.level === "INSUFFICIENT") return [];

    const qualityMeta = this.mapper.mapQuality(quality);
    const slides: PtSlideBlock[] = [];
    let order = 0;

    // 1. 타이틀
    slides.push(this.buildTitle(result, qualityMeta, ++order));

    // 2. 시장 배경
    const bg = this.buildMarketBackground(
      result,
      qualityMeta,
      evidenceRefs,
      ++order,
    );
    if (bg) slides.push(bg);

    // 3. 검색 인텐트 변화
    const intent = this.buildIntentShift(
      result,
      qualityMeta,
      evidenceRefs,
      ++order,
    );
    if (intent) slides.push(intent);

    // 4. 주요 탐색 경로
    const journey = this.buildJourneyMap(
      result,
      qualityMeta,
      evidenceRefs,
      ++order,
    );
    if (journey) slides.push(journey);

    // 5. 핵심 persona
    const persona = this.buildPersona(
      result,
      qualityMeta,
      evidenceRefs,
      ++order,
    );
    if (persona) slides.push(persona);

    // 6. 주요 cluster
    const cluster = this.buildClusterInsight(
      result,
      qualityMeta,
      evidenceRefs,
      ++order,
    );
    if (cluster) slides.push(cluster);

    // 7. 경쟁/기회 요약
    slides.push(
      this.buildOpportunity(result, qualityMeta, evidenceRefs, ++order),
    );

    // 8. 추천 액션
    slides.push(this.buildActions(result, qualityMeta, evidenceRefs, ++order));

    // 9. Evidence 근거
    slides.push(
      this.buildEvidenceSlide(qualityMeta, evidenceRefs, sourceRefs, ++order),
    );

    // 10. GEO/AEO 시사점
    slides.push(this.buildGeoAeo(result, qualityMeta, evidenceRefs, ++order));

    return slides;
  }

  // ─── 1. Title Slide ───────────────────────────────────────────────

  private buildTitle(
    result: SearchResult,
    quality: DocumentQualityMeta,
    order: number,
  ): PtSlideBlock {
    const confLabel = Math.round((quality.confidence ?? 0) * 100);
    return {
      id: nextSlideId("title"),
      slideType: "TITLE",
      headline: `"${result.seedKeyword}" 검색 인텔리전스 분석`,
      subheadline: `분석일: ${result.analyzedAt} | 신뢰도: ${confLabel}%`,
      supportingPoints: [],
      evidenceRefs: [],
      sourceRefs: [],
      quality,
      order,
    };
  }

  // ─── 2. Market Background ─────────────────────────────────────────

  private buildMarketBackground(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock | null {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_intelligence_quality",
    ]);
    if (ev.length === 0) return null;

    const clusterData = result.cluster?.data as
      | { totalClusters?: number; clusters?: unknown[] }
      | undefined;
    const pathData = result.pathfinder?.data as
      | { totalNodes?: number }
      | undefined;

    return {
      id: nextSlideId("background"),
      slideType: "MARKET_BACKGROUND",
      headline: "시장 검색 환경 현황",
      supportingPoints: [
        `"${result.seedKeyword}" 키워드를 중심으로 ${clusterData?.totalClusters ?? clusterData?.clusters?.length ?? 0}개 주제 클러스터 형성`,
        `검색 네트워크 노드 ${pathData?.totalNodes ?? 0}개 — 시장 관심이 다양한 방향으로 확산`,
        `이 데이터는 실제 검색 행동에서 수집된 것으로, 시장 수요를 반영합니다`,
      ],
      evidenceRefs: ev,
      sourceRefs: [],
      visualHint: "chart_bar",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 3. Intent Shift ──────────────────────────────────────────────

  private buildIntentShift(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock | null {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_cluster_distribution",
      "search_roadview_stages",
    ]);
    if (ev.length === 0) return null;

    const roadData = result.roadview?.data as
      | {
          stages?: { stage: string; label?: string; keywordCount?: number }[];
        }
      | undefined;
    const stages = roadData?.stages ?? [];

    const points = stages
      .slice(0, 4)
      .map((s) => `${s.label ?? s.stage}: 키워드 ${s.keywordCount ?? 0}개`);

    return {
      id: nextSlideId("intent"),
      slideType: "INTENT_SHIFT",
      headline: "검색 인텐트 구조",
      subheadline: "사용자가 어떤 단계에서 어떤 질문을 하고 있는가",
      supportingPoints:
        points.length > 0 ? points : ["여정 단계 데이터 수집 중"],
      evidenceRefs: ev,
      sourceRefs: [],
      visualHint: "flow_diagram",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 4. Journey Map ───────────────────────────────────────────────

  private buildJourneyMap(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock | null {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_pathfinder_graph",
    ]);
    if (ev.length === 0) return null;

    const pathData = result.pathfinder?.data as
      | {
          totalPaths?: number;
          paths?: { steps?: string[] }[];
          nodes?: { name?: string; label?: string; hubScore?: number }[];
        }
      | undefined;

    const topHubs = [...(pathData?.nodes ?? [])]
      .sort((a, b) => (b.hubScore ?? 0) - (a.hubScore ?? 0))
      .slice(0, 3)
      .map((n) => n.name ?? n.label ?? "");

    const topPath = pathData?.paths?.[0]?.steps?.join(" → ") ?? "";

    return {
      id: nextSlideId("journey"),
      slideType: "JOURNEY_MAP",
      headline: "주요 검색 탐색 경로",
      subheadline: `${pathData?.totalPaths ?? 0}개 경로 중 핵심 허브와 대표 경로`,
      supportingPoints: [
        topHubs.length > 0 ? `핵심 허브 키워드: ${topHubs.join(", ")}` : "",
        topPath ? `대표 경로: ${topPath}` : "",
        "이 경로는 콘텐츠 시리즈/내부 링크 전략의 근거가 됩니다",
      ].filter(Boolean),
      evidenceRefs: ev,
      sourceRefs: [],
      visualHint: "flow_diagram",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 5. Persona ───────────────────────────────────────────────────

  private buildPersona(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock | null {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_persona_profiles",
    ]);
    if (ev.length === 0) return null;

    const personaData = result.persona?.data as
      | {
          personas?: {
            label?: string;
            name?: string;
            description?: string;
            percentage?: number;
          }[];
        }
      | undefined;
    const personas = personaData?.personas ?? [];

    return {
      id: nextSlideId("persona"),
      slideType: "PERSONA_ARCHETYPE",
      headline: "핵심 검색자 페르소나",
      subheadline: `${personas.length}개 유형의 검색자가 이 시장에 존재합니다`,
      supportingPoints: personas.slice(0, 3).map((p) => {
        const name = p.label ?? p.name ?? "알 수 없음";
        const pct = p.percentage != null ? ` (${p.percentage}%)` : "";
        return `${name}${pct}: ${p.description ?? ""}`;
      }),
      evidenceRefs: ev,
      sourceRefs: [],
      visualHint: "persona_card",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 6. Cluster Insight ───────────────────────────────────────────

  private buildClusterInsight(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock | null {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_cluster_distribution",
      "search_cluster_detail",
    ]);
    if (ev.length === 0) return null;

    const clusterData = result.cluster?.data as
      | {
          clusters?: { label: string; memberCount?: number }[];
        }
      | undefined;
    const clusters = clusterData?.clusters ?? [];

    return {
      id: nextSlideId("cluster"),
      slideType: "CLUSTER_INSIGHT",
      headline: "주요 검색 클러스터 분석",
      subheadline: `${clusters.length}개 주제 그룹이 시장 구조를 형성합니다`,
      supportingPoints: clusters
        .slice(0, 4)
        .map((c) => `${c.label}: ${c.memberCount ?? 0}개 키워드`),
      evidenceRefs: ev,
      sourceRefs: [],
      visualHint: "chart_pie",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 7. Opportunity ───────────────────────────────────────────────

  private buildOpportunity(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock {
    const roadData = result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];

    const points: string[] = [];
    if (weakStages.length > 0) {
      points.push(`콘텐츠 갭 단계(${weakStages.join(", ")})에서 선점 기회`);
    }
    points.push("클러스터별 FAQ 콘텐츠로 검색 점유율 확대 가능");
    points.push("허브 키워드 중심의 콘텐츠 시리즈로 검색 경로 장악");

    return {
      id: nextSlideId("opportunity"),
      slideType: "COMPETITIVE_OPPORTUNITY",
      headline: "기회 영역",
      supportingPoints: points,
      evidenceRefs: allEvidence.slice(0, 3),
      sourceRefs: [],
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 8. Actions ───────────────────────────────────────────────────

  private buildActions(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock {
    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";
    return {
      id: nextSlideId("action"),
      slideType: "RECOMMENDED_ACTION",
      headline: `${mockPrefix}추천 실행 액션`,
      supportingPoints: [
        "클러스터별 FAQ 페이지 생성 (GEO 최적화)",
        "여정 갭 단계 콘텐츠 보강",
        "허브 키워드 SEO 강화",
        "페르소나별 타겟 콘텐츠 개발",
      ],
      evidenceRefs: allEvidence.slice(0, 4),
      sourceRefs: [],
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── 9. Evidence Slide ────────────────────────────────────────────

  private buildEvidenceSlide(
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
    order: number,
  ): PtSlideBlock {
    return {
      id: nextSlideId("evidence"),
      slideType: "EVIDENCE_SUPPORT",
      headline: "분석 근거 자료",
      supportingPoints: allEvidence
        .filter((e) => e.snippet)
        .slice(0, 5)
        .map((e) => `[${e.category}] ${e.snippet}`),
      evidenceRefs: allEvidence,
      sourceRefs,
      visualHint: "table",
      speakerNote: `총 ${allEvidence.length}건의 근거, ${sourceRefs.length}건의 출처 참조. ${this.qualityNote(quality)}`,
      quality,
      order,
    };
  }

  // ─── 10. GEO/AEO Insight ─────────────────────────────────────────

  private buildGeoAeo(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): PtSlideBlock {
    return {
      id: nextSlideId("geoaeo"),
      slideType: "GEO_AEO_INSIGHT",
      headline: "AI 검색 최적화 시사점",
      subheadline: "Google AI Overview, Perplexity 등에서 인용되기 위한 전략",
      supportingPoints: [
        `"${result.seedKeyword}" 관련 FAQ 구조화 → FAQPage 스키마 적용`,
        "클러스터별 핵심 질문-답변 페이지 생성",
        "여정 단계별 가이드 콘텐츠로 answerability 확보",
        "citation-ready 소스의 구조화 데이터 강화",
      ],
      evidenceRefs: allEvidence.slice(0, 3),
      sourceRefs: [],
      visualHint: "chart_bar",
      speakerNote: this.qualityNote(quality),
      quality,
      order,
    };
  }

  // ─── Helper ───────────────────────────────────────────────────────

  private qualityNote(q: DocumentQualityMeta): string {
    const notes: string[] = [];
    if (q.isMockOnly) notes.push("⚠ Mock 데이터 기반 — 실데이터 검증 필요");
    if (q.freshness === "stale") notes.push("⚠ 데이터가 24시간 이상 경과");
    if (q.isPartial) notes.push("⚠ 일부 엔진 실패 — 부분 데이터");
    if ((q.confidence ?? 0) < 0.3)
      notes.push(`⚠ 신뢰도 ${Math.round((q.confidence ?? 0) * 100)}%`);
    return notes.length > 0 ? notes.join(" | ") : "데이터 상태 양호";
  }
}
