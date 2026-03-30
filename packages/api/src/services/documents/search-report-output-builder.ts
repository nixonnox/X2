/**
 * SearchReportOutputBuilder
 *
 * Search Intelligence 결과를 보고서용 섹션으로 변환.
 *
 * 6가지 보고서 유형:
 * 1. WEEKLY_LISTENING — 주간 리스닝 리포트
 * 2. MONTHLY_SEARCH_INTELLIGENCE — 월간 검색 인텔리전스 리포트
 * 3. EXECUTIVE_SUMMARY — 경영진 요약
 * 4. ISSUE_FAQ — 이슈/FAQ 리포트
 * 5. CAMPAIGN_STRATEGY_BRIEF — 캠페인 전략 브리프
 * 6. GEO_AEO_OPTIMIZATION_MEMO — GEO/AEO 최적화 메모
 *
 * 모든 보고서에 포함: 핵심 발견, path/stage, persona/cluster,
 * 근거 차트/원문, 추천 액션, confidence/freshness, 참고 source
 */

import type {
  ReportOutputSection,
  ReportOutputSectionType,
  ReportOutputType,
  DocumentBlock,
  EvidenceRef,
  SourceRef,
  DocumentQualityMeta,
} from "./types";
import type { GeoAeoDocumentBlockBuilder } from "./geo-aeo-document-block-builder";
import type { EvidenceToDocumentMapper } from "./evidence-to-document-mapper";

type EngineResult<T = unknown> = {
  success: boolean;
  data?: T;
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

/** 보고서 유형별 포함 섹션 정의 */
const REPORT_SECTION_MAP: Record<ReportOutputType, ReportOutputSectionType[]> =
  {
    WEEKLY_LISTENING: [
      "EXECUTIVE_SUMMARY",
      "SEARCH_INTENT_OVERVIEW",
      "CLUSTER_ANALYSIS",
      "JOURNEY_ANALYSIS",
      "RECOMMENDED_ACTIONS",
      "DATA_QUALITY_NOTE",
    ],
    MONTHLY_SEARCH_INTELLIGENCE: [
      "EXECUTIVE_SUMMARY",
      "MARKET_BACKGROUND",
      "SEARCH_INTENT_OVERVIEW",
      "CLUSTER_ANALYSIS",
      "JOURNEY_ANALYSIS",
      "PERSONA_ANALYSIS",
      "COMPETITIVE_LANDSCAPE",
      "GEO_AEO_IMPLICATIONS",
      "RECOMMENDED_ACTIONS",
      "EVIDENCE_APPENDIX",
      "DATA_QUALITY_NOTE",
    ],
    EXECUTIVE_SUMMARY: [
      "EXECUTIVE_SUMMARY",
      "SEARCH_INTENT_OVERVIEW",
      "RECOMMENDED_ACTIONS",
    ],
    ISSUE_FAQ: [
      "EXECUTIVE_SUMMARY",
      "CLUSTER_ANALYSIS",
      "RECOMMENDED_ACTIONS",
      "EVIDENCE_APPENDIX",
    ],
    CAMPAIGN_STRATEGY_BRIEF: [
      "MARKET_BACKGROUND",
      "SEARCH_INTENT_OVERVIEW",
      "PERSONA_ANALYSIS",
      "CLUSTER_ANALYSIS",
      "RECOMMENDED_ACTIONS",
      "EVIDENCE_APPENDIX",
    ],
    GEO_AEO_OPTIMIZATION_MEMO: [
      "EXECUTIVE_SUMMARY",
      "SEARCH_INTENT_OVERVIEW",
      "JOURNEY_ANALYSIS",
      "GEO_AEO_IMPLICATIONS",
      "RECOMMENDED_ACTIONS",
      "DATA_QUALITY_NOTE",
    ],
  };

let sectionCounter = 0;
function nextSectionId(type: string): string {
  return `rpt-${type}-${++sectionCounter}-${Date.now()}`;
}

export class SearchReportOutputBuilder {
  constructor(
    private readonly geoBuilder: GeoAeoDocumentBlockBuilder,
    private readonly mapper: EvidenceToDocumentMapper,
  ) {}

  /**
   * 지정된 보고서 유형에 맞는 섹션을 생성.
   */
  buildReport(
    reportType: ReportOutputType,
    result: SearchResult,
    quality: QualityAssessment,
    evidenceRefs: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): ReportOutputSection[] {
    if (quality.level === "INSUFFICIENT") return [];

    const sectionTypes = REPORT_SECTION_MAP[reportType];
    const qualityMeta = this.mapper.mapQuality(quality);

    return sectionTypes
      .map((type, i) =>
        this.buildSection(
          type,
          result,
          qualityMeta,
          evidenceRefs,
          sourceRefs,
          i + 1,
        ),
      )
      .filter((s): s is ReportOutputSection => s !== null);
  }

  /**
   * 지원하는 보고서 유형 목록.
   */
  getSupportedReportTypes(): ReportOutputType[] {
    return Object.keys(REPORT_SECTION_MAP) as ReportOutputType[];
  }

  private buildSection(
    type: ReportOutputSectionType,
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
    order: number,
  ): ReportOutputSection | null {
    switch (type) {
      case "EXECUTIVE_SUMMARY":
        return this.buildExecutiveSummary(
          result,
          quality,
          allEvidence,
          sourceRefs,
          order,
        );
      case "MARKET_BACKGROUND":
        return this.buildMarketBackground(result, quality, allEvidence, order);
      case "SEARCH_INTENT_OVERVIEW":
        return this.buildIntentOverview(result, quality, allEvidence, order);
      case "CLUSTER_ANALYSIS":
        return this.buildClusterAnalysis(result, quality, allEvidence, order);
      case "JOURNEY_ANALYSIS":
        return this.buildJourneyAnalysis(result, quality, allEvidence, order);
      case "PERSONA_ANALYSIS":
        return this.buildPersonaAnalysis(result, quality, allEvidence, order);
      case "COMPETITIVE_LANDSCAPE":
        return this.buildCompetitiveLandscape(
          result,
          quality,
          allEvidence,
          order,
        );
      case "GEO_AEO_IMPLICATIONS":
        return this.buildGeoAeoImplications(
          result,
          quality,
          allEvidence,
          sourceRefs,
          order,
        );
      case "RECOMMENDED_ACTIONS":
        return this.buildRecommendedActions(
          result,
          quality,
          allEvidence,
          order,
        );
      case "EVIDENCE_APPENDIX":
        return this.buildEvidenceAppendix(
          quality,
          allEvidence,
          sourceRefs,
          order,
        );
      case "DATA_QUALITY_NOTE":
        return this.buildDataQualityNote(quality, allEvidence, order);
      default:
        return null;
    }
  }

  // ─── Executive Summary ────────────────────────────────────────────

  private buildExecutiveSummary(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
    order: number,
  ): ReportOutputSection {
    const clusterData = result.cluster?.data as
      | { totalClusters?: number; clusters?: unknown[] }
      | undefined;
    const personaData = result.persona?.data as
      | { totalPersonas?: number; personas?: unknown[] }
      | undefined;
    const pathData = result.pathfinder?.data as
      | { totalNodes?: number; totalPaths?: number }
      | undefined;
    const roadData = result.roadview?.data as
      | { summary?: { weakStages?: string[] } }
      | undefined;

    const clusterCount =
      clusterData?.totalClusters ?? clusterData?.clusters?.length ?? 0;
    const personaCount =
      personaData?.totalPersonas ?? personaData?.personas?.length ?? 0;
    const weakStages = roadData?.summary?.weakStages ?? [];
    const mockNote = quality.isMockOnly
      ? " [검증 필요 — Mock 데이터 기반]"
      : "";

    const summary = [
      `"${result.seedKeyword}" 검색 인텔리전스 분석 결과${mockNote}:`,
      `${clusterCount}개 주제 클러스터, ${personaCount}개 검색자 유형, ${pathData?.totalPaths ?? 0}개 검색 경로 식별.`,
      weakStages.length > 0
        ? `콘텐츠 갭: ${weakStages.join(", ")} 단계에서 보강 필요.`
        : "여정 전 단계에 콘텐츠가 분포되어 있습니다.",
      `신뢰도: ${Math.round((quality.confidence ?? 0) * 100)}%`,
    ].join(" ");

    // GEO 블록을 서브 블록으로 재사용
    const geoBlocks = this.geoBuilder.buildAll(
      result,
      {
        level:
          quality.confidence >= 0.7
            ? "HIGH"
            : quality.confidence >= 0.4
              ? "MEDIUM"
              : "LOW",
        confidence: quality.confidence,
        freshness: quality.freshness,
        isPartial: quality.isPartial,
        isMockOnly: quality.isMockOnly,
        warnings: quality.warnings,
      },
      allEvidence,
      sourceRefs,
    );

    return {
      id: nextSectionId("exec"),
      type: "EXECUTIVE_SUMMARY",
      title: "핵심 요약",
      summary,
      blocks: geoBlocks.filter((b) => b.type === "SUMMARY").slice(0, 1),
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Market Background ────────────────────────────────────────────

  private buildMarketBackground(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const ev = this.mapper.filterByCategory(allEvidence, [
      "search_intelligence_quality",
    ]);
    return {
      id: nextSectionId("market"),
      type: "MARKET_BACKGROUND",
      title: "시장 배경",
      summary: `"${result.seedKeyword}" 키워드의 검색 시장 현황을 분석합니다. 본 분석은 실제 검색 행동 데이터에 기반합니다.`,
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Intent Overview ──────────────────────────────────────────────

  private buildIntentOverview(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const roadData = result.roadview?.data as
      | {
          stages?: { stage: string; label?: string; keywordCount?: number }[];
        }
      | undefined;
    const stages = roadData?.stages ?? [];
    const stageList = stages
      .map((s) => `${s.label ?? s.stage}(${s.keywordCount ?? 0})`)
      .join(", ");

    return {
      id: nextSectionId("intent"),
      type: "SEARCH_INTENT_OVERVIEW",
      title: "검색 인텐트 구조",
      summary:
        stages.length > 0
          ? `사용자 여정은 ${stages.length}단계로 구성됩니다: ${stageList}`
          : "검색 인텐트 데이터를 수집 중입니다.",
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Cluster Analysis ─────────────────────────────────────────────

  private buildClusterAnalysis(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const clusterData = result.cluster?.data as
      | {
          clusters?: { label: string; memberCount?: number }[];
        }
      | undefined;
    const clusters = clusterData?.clusters ?? [];
    const list = clusters
      .slice(0, 5)
      .map((c) => `${c.label}(${c.memberCount ?? 0}개)`)
      .join(", ");

    return {
      id: nextSectionId("cluster"),
      type: "CLUSTER_ANALYSIS",
      title: "주제 클러스터 분석",
      summary:
        clusters.length > 0
          ? `${clusters.length}개 클러스터 식별: ${list}`
          : "클러스터 결과가 없습니다.",
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Journey Analysis ─────────────────────────────────────────────

  private buildJourneyAnalysis(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const pathData = result.pathfinder?.data as
      | {
          totalNodes?: number;
          totalPaths?: number;
          nodes?: { name?: string; hubScore?: number }[];
        }
      | undefined;
    const topHubs = [...(pathData?.nodes ?? [])]
      .sort((a, b) => (b.hubScore ?? 0) - (a.hubScore ?? 0))
      .slice(0, 3)
      .map((n) => n.name ?? "")
      .filter(Boolean);

    return {
      id: nextSectionId("journey"),
      type: "JOURNEY_ANALYSIS",
      title: "검색 경로 분석",
      summary: [
        `노드 ${pathData?.totalNodes ?? 0}개, 경로 ${pathData?.totalPaths ?? 0}개의 네트워크.`,
        topHubs.length > 0 ? `핵심 허브: ${topHubs.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Persona Analysis ─────────────────────────────────────────────

  private buildPersonaAnalysis(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const personaData = result.persona?.data as
      | {
          personas?: { label?: string; name?: string; percentage?: number }[];
        }
      | undefined;
    const personas = personaData?.personas ?? [];
    const list = personas
      .slice(0, 3)
      .map((p) => {
        const name = p.label ?? p.name ?? "알 수 없음";
        return p.percentage != null ? `${name}(${p.percentage}%)` : name;
      })
      .join(", ");

    return {
      id: nextSectionId("persona"),
      type: "PERSONA_ANALYSIS",
      title: "검색자 페르소나 분석",
      summary:
        personas.length > 0
          ? `${personas.length}개 검색자 유형: ${list}`
          : "페르소나 결과가 없습니다.",
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Competitive Landscape ────────────────────────────────────────

  private buildCompetitiveLandscape(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    return {
      id: nextSectionId("competitive"),
      type: "COMPETITIVE_LANDSCAPE",
      title: "경쟁 환경",
      summary: `"${result.seedKeyword}" 시장의 경쟁 구도. 클러스터 점유와 검색 경로 허브 분석 기반.`,
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── GEO/AEO Implications ────────────────────────────────────────

  private buildGeoAeoImplications(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
    order: number,
  ): ReportOutputSection {
    const citationReady = this.mapper.filterCitationReady(sourceRefs);

    return {
      id: nextSectionId("geoaeo"),
      type: "GEO_AEO_IMPLICATIONS",
      title: "AI 검색 최적화 시사점",
      summary: [
        `Citation-ready 소스 ${citationReady.length}건.`,
        "클러스터별 FAQ 구조화, 여정 단계별 가이드 콘텐츠, schema markup 적용이 권장됩니다.",
      ].join(" "),
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Recommended Actions ──────────────────────────────────────────

  private buildRecommendedActions(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const roadData = result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];
    const mockNote = quality.isMockOnly ? " [검증 필요]" : "";

    const actions: string[] = [];
    if (weakStages.length > 0)
      actions.push(`콘텐츠 갭 보강: ${weakStages.join(", ")} 단계`);
    actions.push("클러스터별 FAQ 페이지 생성");
    actions.push("허브 키워드 SEO 강화");
    actions.push("페르소나별 타겟 콘텐츠 개발");

    return {
      id: nextSectionId("actions"),
      type: "RECOMMENDED_ACTIONS",
      title: `추천 액션${mockNote}`,
      summary: actions.join(" / "),
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Evidence Appendix ────────────────────────────────────────────

  private buildEvidenceAppendix(
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
    order: number,
  ): ReportOutputSection {
    return {
      id: nextSectionId("evidence"),
      type: "EVIDENCE_APPENDIX",
      title: "근거 자료 부록",
      summary: `총 ${allEvidence.length}건의 근거 항목, ${sourceRefs.length}건의 출처 참조.`,
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }

  // ─── Data Quality Note ────────────────────────────────────────────

  private buildDataQualityNote(
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    order: number,
  ): ReportOutputSection {
    const warnings = quality.warnings ?? [];
    const notes: string[] = [];

    if (quality.isMockOnly)
      notes.push(
        "⚠ Mock 데이터 기반 분석입니다. 실제 데이터로 재검증이 필요합니다.",
      );
    if (quality.freshness === "stale")
      notes.push("⚠ 데이터가 24시간 이상 경과했습니다. 재분석을 권장합니다.");
    if (quality.isPartial)
      notes.push(
        "⚠ 일부 분석 엔진이 실패했습니다. 부분 데이터로 생성된 보고서입니다.",
      );
    if ((quality.confidence ?? 0) < 0.3)
      notes.push(
        `⚠ 신뢰도 ${Math.round((quality.confidence ?? 0) * 100)}% — 결과 해석에 주의가 필요합니다.`,
      );
    notes.push(...warnings.map((w) => `- ${w}`));

    return {
      id: nextSectionId("quality"),
      type: "DATA_QUALITY_NOTE",
      title: "데이터 품질 안내",
      summary:
        notes.length > 0
          ? notes.join("\n")
          : "데이터 품질 양호. 별도 주의사항 없음.",
      blocks: [],
      relatedInsightIds: [],
      relatedActionIds: [],
      quality,
      order,
    };
  }
}
