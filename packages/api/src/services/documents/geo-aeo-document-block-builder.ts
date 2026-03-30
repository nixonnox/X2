/**
 * GeoAeoDocumentBlockBuilder
 *
 * Search Intelligence 결과를 AI 인용에 유리한 GEO/AEO 문서 블록으로 변환.
 *
 * 입력: SearchIntelligenceResult + SearchDataQualityAssessment + EvidenceRef[] + SourceRef[]
 * 출력: DocumentBlock[] (FAQ, Summary, Comparison, Intent/Stage, Persona, Evidence, Action)
 *
 * 핵심 원칙:
 * - 모든 블록에 evidenceRefs 필수 (evidence 없는 블록 생성 금지)
 * - confidence/stale/partial 상태를 숨기지 않음
 * - mock 기반 블록에 명시적 경고
 * - AI가 인용하기 쉬운 질문-답변형, 비교형, 요약형, 정의형 구조
 */

import type {
  DocumentBlock,
  DocumentBlockType,
  EvidenceRef,
  SourceRef,
  DocumentQualityMeta,
} from "./types";
import type { EvidenceToDocumentMapper } from "./evidence-to-document-mapper";

// Lightweight type aliases (from search-intelligence/types.ts shape)
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
  trace: {
    confidence: number;
    freshness?: string;
    analysisId?: string;
    warnings?: string[];
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

let blockCounter = 0;
function nextId(type: string): string {
  return `doc-${type}-${++blockCounter}-${Date.now()}`;
}

export class GeoAeoDocumentBlockBuilder {
  constructor(private readonly mapper: EvidenceToDocumentMapper) {}

  /**
   * Search Intelligence 결과에서 GEO/AEO 최적화 문서 블록 전체를 생성.
   * evidence가 없는 엔진 결과는 건너뜀.
   */
  buildAll(
    result: SearchResult,
    quality: QualityAssessment,
    evidenceRefs: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock[] {
    if (quality.level === "INSUFFICIENT") return [];

    const qualityMeta = this.mapper.mapQuality(quality);
    const blocks: DocumentBlock[] = [];

    // 1. FAQ Block — 클러스터/의도 기반 Q&A
    const faq = this.buildFaqBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (faq) blocks.push(faq);

    // 2. Summary Block — 전체 분석 요약
    const summary = this.buildSummaryBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (summary) blocks.push(summary);

    // 3. Comparison Table — 클러스터 간 비교
    const comparison = this.buildComparisonBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (comparison) blocks.push(comparison);

    // 4. Intent/Stage Explanation — 여정 단계 설명
    const stage = this.buildStageBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (stage) blocks.push(stage);

    // 5. Persona Insight — 페르소나별 인사이트
    const persona = this.buildPersonaBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (persona) blocks.push(persona);

    // 6. Key Evidence — 핵심 근거 요약
    const evidence = this.buildKeyEvidenceBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (evidence) blocks.push(evidence);

    // 7. Recommended Action — GEO 최적화 액션
    const action = this.buildActionBlock(
      result,
      qualityMeta,
      evidenceRefs,
      sourceRefs,
    );
    if (action) blocks.push(action);

    return blocks;
  }

  // ─── FAQ Block ─────────────────────────────────────────────────────

  private buildFaqBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    const clusterEvidence = this.mapper.filterByCategory(allEvidence, [
      "search_cluster_distribution",
      "search_cluster_detail",
    ]);
    if (clusterEvidence.length === 0) return null;

    const clusterData = result.cluster?.data as
      | {
          clusters?: {
            label: string;
            keywords?: string[];
            topKeywords?: string[];
          }[];
        }
      | undefined;
    const clusters = clusterData?.clusters ?? [];
    if (clusters.length === 0) return null;

    const questions = clusters.slice(0, 5).map((c) => ({
      question: `"${result.seedKeyword}"와 관련하여 "${c.label}" 주제에서 사람들이 궁금해하는 것은?`,
      answer: `"${c.label}" 클러스터에서 주요 관련 키워드는 ${(c.topKeywords ?? c.keywords ?? []).slice(0, 3).join(", ")} 등입니다. 이 주제 그룹은 검색자들의 핵심 관심 영역 중 하나입니다.`,
    }));

    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";

    return {
      id: nextId("faq"),
      type: "FAQ",
      title: `${result.seedKeyword} FAQ — 주요 검색 클러스터 기반`,
      purpose:
        "AI 검색엔진이 인용하기 쉬운 질문-답변형 구조. FAQ 스키마 적용 가능.",
      body: `${mockPrefix}아래는 "${result.seedKeyword}" 검색 분석에서 도출된 주요 질문과 답변입니다.`,
      structuredData: { questions },
      evidenceRefs: clusterEvidence,
      sourceRefs: this.mapper.filterCitationReady(sourceRefs),
      quality,
      geoOptimized: true,
      schemaHint: "FAQPage",
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Summary Block ─────────────────────────────────────────────────

  private buildSummaryBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    const qualityEvidence = this.mapper.filterByCategory(allEvidence, [
      "search_intelligence_quality",
    ]);
    if (qualityEvidence.length === 0) return null;

    const clusterData = result.cluster?.data as
      | { totalClusters?: number; clusters?: unknown[] }
      | undefined;
    const pathData = result.pathfinder?.data as
      | { totalNodes?: number; totalPaths?: number }
      | undefined;
    const personaData = result.persona?.data as
      | { totalPersonas?: number; personas?: unknown[] }
      | undefined;
    const roadData = result.roadview?.data as
      | { stages?: unknown[] }
      | undefined;

    const clusterCount =
      clusterData?.totalClusters ?? clusterData?.clusters?.length ?? 0;
    const nodeCount = pathData?.totalNodes ?? 0;
    const pathCount = pathData?.totalPaths ?? 0;
    const personaCount =
      personaData?.totalPersonas ?? personaData?.personas?.length ?? 0;
    const stageCount = roadData?.stages?.length ?? 0;

    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";
    const freshNote =
      quality.freshness === "stale" ? " (데이터 갱신 필요)" : "";
    const confNote = `신뢰도 ${Math.round((quality.confidence ?? 0) * 100)}%`;

    const body = [
      `${mockPrefix}"${result.seedKeyword}" 키워드에 대한 검색 인텔리전스 분석 결과 요약입니다${freshNote}.`,
      "",
      `- 주제 클러스터: ${clusterCount}개`,
      `- 검색 경로 네트워크: 노드 ${nodeCount}개, 경로 ${pathCount}개`,
      `- 검색자 페르소나: ${personaCount}개 유형`,
      `- 사용자 여정 단계: ${stageCount}단계`,
      `- ${confNote}`,
    ].join("\n");

    return {
      id: nextId("summary"),
      type: "SUMMARY",
      title: `${result.seedKeyword} 검색 인텔리전스 요약`,
      purpose:
        "전체 분석 결과를 한눈에 파악할 수 있는 요약형 블록. AI Overview 인용에 유리.",
      body,
      evidenceRefs: [...qualityEvidence, ...allEvidence.slice(0, 3)],
      sourceRefs,
      quality,
      geoOptimized: true,
      schemaHint: "Article",
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Comparison Table Block ────────────────────────────────────────

  private buildComparisonBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    const evidence = this.mapper.filterByCategory(allEvidence, [
      "search_cluster_distribution",
      "search_cluster_detail",
    ]);
    if (evidence.length === 0) return null;

    const clusterData = result.cluster?.data as
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
    if (clusters.length < 2) return null;

    const rows = clusters.slice(0, 6).map((c) => ({
      cluster: c.label,
      keywordCount: c.memberCount ?? c.keywords?.length ?? 0,
      topKeywords: (c.topKeywords ?? c.keywords ?? []).slice(0, 3).join(", "),
    }));

    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";

    return {
      id: nextId("comparison"),
      type: "COMPARISON_TABLE",
      title: `${result.seedKeyword} 클러스터 비교`,
      purpose: "클러스터 간 비교를 통해 시장 구조를 파악하는 비교형 블록.",
      body: `${mockPrefix}"${result.seedKeyword}" 관련 주요 클러스터를 키워드 규모와 핵심 키워드 기준으로 비교합니다.`,
      structuredData: {
        columns: ["클러스터", "키워드 수", "핵심 키워드"],
        rows,
      },
      evidenceRefs: evidence,
      sourceRefs,
      quality,
      geoOptimized: true,
      schemaHint: "Table",
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Intent/Stage Explanation Block ────────────────────────────────

  private buildStageBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    const evidence = this.mapper.filterByCategory(allEvidence, [
      "search_roadview_stages",
    ]);
    if (evidence.length === 0) return null;

    const roadData = result.roadview?.data as
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
    if (stages.length === 0) return null;

    const LABELS: Record<string, string> = {
      awareness: "인지",
      interest: "관심",
      comparison: "비교",
      decision: "결정",
      action: "행동",
      advocacy: "옹호",
    };

    const weakStages = roadData?.summary?.weakStages ?? [];
    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";

    const stageDescriptions = stages.map((s) => {
      const label = s.label ?? LABELS[s.stage] ?? s.stage;
      const weak = weakStages.includes(s.stage) ? " ⚠ 콘텐츠 갭 발견" : "";
      return `- ${label}: 키워드 ${s.keywordCount ?? 0}개${weak}`;
    });

    return {
      id: nextId("stage"),
      type: "INTENT_STAGE_EXPLANATION",
      title: `${result.seedKeyword} 사용자 여정 단계 분석`,
      purpose: "검색자의 구매/탐색 여정을 단계별로 설명하는 정의형 블록.",
      body: `${mockPrefix}"${result.seedKeyword}" 검색자의 여정은 다음 ${stages.length}단계로 구성됩니다.\n\n${stageDescriptions.join("\n")}`,
      structuredData: {
        stages: stages.map((s) => ({
          name: s.label ?? LABELS[s.stage] ?? s.stage,
          keywordCount: s.keywordCount ?? 0,
          hasGap: weakStages.includes(s.stage),
        })),
      },
      evidenceRefs: evidence,
      sourceRefs,
      quality,
      geoOptimized: true,
      schemaHint: "HowTo",
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Persona Insight Block ─────────────────────────────────────────

  private buildPersonaBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    const evidence = this.mapper.filterByCategory(allEvidence, [
      "search_persona_profiles",
    ]);
    if (evidence.length === 0) return null;

    const personaData = result.persona?.data as
      | {
          personas?: {
            label?: string;
            name?: string;
            description?: string;
            percentage?: number;
            archetype?: string;
          }[];
        }
      | undefined;
    const personas = personaData?.personas ?? [];
    if (personas.length === 0) return null;

    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";
    const descriptions = personas.slice(0, 4).map((p) => {
      const name = p.label ?? p.name ?? "알 수 없음";
      const pct = p.percentage != null ? ` (${p.percentage}%)` : "";
      return `- ${name}${pct}: ${p.description ?? p.archetype ?? ""}`;
    });

    return {
      id: nextId("persona"),
      type: "PERSONA_INSIGHT",
      title: `${result.seedKeyword} 검색자 유형 분석`,
      purpose: "검색자 페르소나를 유형별로 설명. 타겟 콘텐츠 전략 수립에 활용.",
      body: `${mockPrefix}"${result.seedKeyword}"를 검색하는 사용자는 다음 유형으로 분류됩니다.\n\n${descriptions.join("\n")}`,
      structuredData: {
        personas: personas.slice(0, 4).map((p) => ({
          name: p.label ?? p.name,
          percentage: p.percentage,
          archetype: p.archetype,
          description: p.description,
        })),
      },
      evidenceRefs: evidence,
      sourceRefs,
      quality,
      geoOptimized: true,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Key Evidence Block ────────────────────────────────────────────

  private buildKeyEvidenceBlock(
    _result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    if (allEvidence.length === 0) return null;

    const evidenceSummaries = allEvidence
      .filter((e) => e.snippet)
      .slice(0, 6)
      .map((e) => `- [${e.category}] ${e.snippet}`);

    if (evidenceSummaries.length === 0) return null;

    return {
      id: nextId("evidence"),
      type: "KEY_EVIDENCE",
      title: "분석 근거 자료 요약",
      purpose: "본 문서의 주요 주장을 뒷받침하는 근거 목록. 출처 역추적 가능.",
      body: `이 분석은 다음 근거에 기반합니다.\n\n${evidenceSummaries.join("\n")}`,
      evidenceRefs: allEvidence,
      sourceRefs,
      quality,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Recommended Action Block ──────────────────────────────────────

  private buildActionBlock(
    result: SearchResult,
    quality: DocumentQualityMeta,
    allEvidence: EvidenceRef[],
    sourceRefs: SourceRef[],
  ): DocumentBlock | null {
    // GEO/AEO 최적화 액션은 evidence 기반으로만 생성
    const stageEvidence = this.mapper.filterByCategory(allEvidence, [
      "search_roadview_stages",
    ]);
    const clusterEvidence = this.mapper.filterByCategory(allEvidence, [
      "search_cluster_distribution",
      "search_cluster_detail",
    ]);
    const relevantEvidence = [...stageEvidence, ...clusterEvidence];
    if (relevantEvidence.length === 0) return null;

    const roadData = result.roadview?.data as
      | {
          summary?: { weakStages?: string[] };
        }
      | undefined;
    const weakStages = roadData?.summary?.weakStages ?? [];

    const mockPrefix = quality.isMockOnly ? "[검증 필요] " : "";
    const actions: string[] = [];

    if (weakStages.length > 0) {
      actions.push(
        `1. 콘텐츠 갭 보강: ${weakStages.join(", ")} 단계에 FAQ 및 가이드 콘텐츠를 추가하세요.`,
      );
    }

    const citationSources = this.mapper.filterCitationReady(sourceRefs);
    if (citationSources.length > 0) {
      actions.push(
        `2. Citation-ready 소스(${citationSources.length}개)에 대해 schema markup과 구조화 데이터를 적용하세요.`,
      );
    }

    actions.push(
      `${actions.length + 1}. 주요 클러스터별 FAQ 페이지를 생성하여 AI 검색엔진 인용 가능성을 높이세요.`,
    );

    return {
      id: nextId("action"),
      type: "RECOMMENDED_ACTION",
      title: `${result.seedKeyword} GEO/AEO 최적화 추천 액션`,
      purpose: "AI 검색엔진 인용을 위한 콘텐츠/구조 최적화 액션 목록.",
      body: `${mockPrefix}다음 액션을 통해 "${result.seedKeyword}" 관련 AI 인용 가능성을 높일 수 있습니다.\n\n${actions.join("\n")}`,
      evidenceRefs: relevantEvidence,
      sourceRefs: citationSources,
      quality,
      geoOptimized: true,
      generatedAt: new Date().toISOString(),
    };
  }
}
