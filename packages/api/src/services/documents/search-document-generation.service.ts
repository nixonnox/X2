/**
 * SearchDocumentGenerationService
 *
 * Search Intelligence → 문서 생성 파이프라인의 오케스트레이터.
 *
 * 파이프라인:
 * SearchIntelligenceResult
 *   → assessSearchDataQuality()
 *   → SearchEvidenceBundleService.buildSearchEvidenceItems()
 *   → EvidenceToDocumentMapper (EvidenceRef[] + SourceRef[])
 *   → GeoAeoDocumentBlockBuilder (GEO/AEO 블록)
 *   → SearchPtSectionBuilder (PT 슬라이드)
 *   → SearchReportOutputBuilder (보고서 섹션)
 *   → RoleBasedDocumentAssembler (역할별 조립)
 *   → GeneratedDocumentOutput
 *
 * 사용하는 서비스:
 * - EvidenceToDocumentMapper (evidence → 문서용 레퍼런스)
 * - GeoAeoDocumentBlockBuilder (GEO/AEO 문서 블록)
 * - SearchPtSectionBuilder (PT 슬라이드)
 * - SearchReportOutputBuilder (보고서 섹션)
 * - RoleBasedDocumentAssembler (역할별 조립)
 *
 * Evidence/Source 연결:
 * - SearchEvidenceBundleService → EvidenceToDocumentMapper → 모든 블록의 evidenceRefs
 * - trace.sourceSummary → EvidenceToDocumentMapper → 모든 블록의 sourceRefs
 *
 * Confidence/Stale/Partial 처리:
 * - INSUFFICIENT → 빈 출력 반환
 * - isMockOnly → 모든 블록에 "[검증 필요]" 접두
 * - stale → 경고 포함
 * - partial → 실패 엔진 블록 스킵
 *
 * Failure/Log 포인트:
 * - quality.level === "INSUFFICIENT" → 즉시 반환 (로그)
 * - 개별 빌더 실패 → 해당 블록만 스킵, 나머지 계속
 */

import type {
  DocumentRole,
  DocumentUseCase,
  ReportOutputType,
  GeneratedDocumentOutput,
  DocumentBlock,
  ReportOutputSection,
  PtSlideBlock,
  EvidenceRef,
  SourceRef,
} from "./types";
import { EvidenceToDocumentMapper } from "./evidence-to-document-mapper";
import { GeoAeoDocumentBlockBuilder } from "./geo-aeo-document-block-builder";
import { SearchPtSectionBuilder } from "./search-pt-section-builder";
import { SearchReportOutputBuilder } from "./search-report-output-builder";
import { RoleBasedDocumentAssembler } from "./role-based-document-assembler";

// External type shapes (from search-intelligence/types.ts)
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
    sourceSummary?: {
      name: string;
      status: string;
      itemCount?: number;
      latencyMs?: number;
    }[];
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

type EvidenceBundleItem = {
  category: string;
  label: string;
  dataSourceType?: string;
  entityIds?: string[];
  displayType?: string;
  summary?: string;
  data?: unknown;
};

type GenerateDocumentInput = {
  result: SearchResult;
  quality: QualityAssessment;
  evidenceItems: EvidenceBundleItem[];
  role: DocumentRole;
  useCase: DocumentUseCase;
  /** 보고서 유형 (useCase가 보고서일 때) */
  reportType?: ReportOutputType;
};

export class SearchDocumentGenerationService {
  private readonly mapper: EvidenceToDocumentMapper;
  private readonly geoBuilder: GeoAeoDocumentBlockBuilder;
  private readonly ptBuilder: SearchPtSectionBuilder;
  private readonly reportBuilder: SearchReportOutputBuilder;
  private readonly assembler: RoleBasedDocumentAssembler;

  constructor() {
    this.mapper = new EvidenceToDocumentMapper();
    this.geoBuilder = new GeoAeoDocumentBlockBuilder(this.mapper);
    this.ptBuilder = new SearchPtSectionBuilder(this.mapper);
    this.reportBuilder = new SearchReportOutputBuilder(
      this.geoBuilder,
      this.mapper,
    );
    this.assembler = new RoleBasedDocumentAssembler();
  }

  /**
   * 메인 진입점: Search Intelligence 결과 → 문서 출력.
   *
   * @param input - 검색 결과 + 품질 + evidence + 역할 + 용도
   * @returns GeneratedDocumentOutput (역할에 맞게 조립된 최종 출력물)
   */
  generate(input: GenerateDocumentInput): GeneratedDocumentOutput {
    const { result, quality, evidenceItems, role, useCase, reportType } = input;

    // ── Quality Gate ──────────────────────────────────────────────
    if (quality.level === "INSUFFICIENT") {
      return this.emptyOutput(result.seedKeyword, role, useCase, quality);
    }

    // ── 1. Evidence/Source 매핑 ───────────────────────────────────
    const evidenceRefs = this.mapper.mapToEvidenceRefs(evidenceItems);
    const sourceRefs = this.mapper.mapToSourceRefs(
      (result.trace.sourceSummary ?? []).map((s) => ({
        name: s.name,
        status: s.status as "success" | "partial" | "failed",
        itemCount: s.itemCount,
        latencyMs: s.latencyMs,
      })),
    );

    // ── 2. GEO/AEO 문서 블록 ────────────────────────────────────
    let documentBlocks: DocumentBlock[] = [];
    if (this.needsGeoBlocks(useCase)) {
      documentBlocks = this.geoBuilder.buildAll(
        result,
        quality,
        evidenceRefs,
        sourceRefs,
      );
    }

    // ── 3. PT 슬라이드 ──────────────────────────────────────────
    let ptSlides: PtSlideBlock[] = [];
    if (this.needsPtSlides(useCase)) {
      ptSlides = this.ptBuilder.buildAll(
        result,
        quality,
        evidenceRefs,
        sourceRefs,
      );
    }

    // ── 4. 보고서 섹션 ──────────────────────────────────────────
    let reportSections: ReportOutputSection[] = [];
    if (this.needsReportSections(useCase)) {
      const rType = reportType ?? this.inferReportType(useCase);
      reportSections = this.reportBuilder.buildReport(
        rType,
        result,
        quality,
        evidenceRefs,
        sourceRefs,
      );
    }

    // ── 5. 역할별 조립 ──────────────────────────────────────────
    return this.assembler.assemble({
      seedKeyword: result.seedKeyword,
      role,
      useCase,
      quality: this.mapper.mapQuality(quality),
      documentBlocks,
      reportSections,
      ptSlides,
      allEvidenceRefs: evidenceRefs,
      allSourceRefs: sourceRefs,
    });
  }

  /**
   * 지원하는 use case 목록.
   */
  getSupportedUseCases(): DocumentUseCase[] {
    return [
      "GEO_AEO_DOCUMENT",
      "PT_PROPOSAL",
      "WEEKLY_REPORT",
      "MONTHLY_REPORT",
      "EXECUTIVE_BRIEF",
      "CAMPAIGN_BRIEF",
      "FAQ_REPORT",
      "OPTIMIZATION_MEMO",
    ];
  }

  /**
   * 지원하는 보고서 유형 목록.
   */
  getSupportedReportTypes(): ReportOutputType[] {
    return this.reportBuilder.getSupportedReportTypes();
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  private needsGeoBlocks(useCase: DocumentUseCase): boolean {
    return [
      "GEO_AEO_DOCUMENT",
      "OPTIMIZATION_MEMO",
      "MONTHLY_REPORT",
      "FAQ_REPORT",
    ].includes(useCase);
  }

  private needsPtSlides(useCase: DocumentUseCase): boolean {
    return ["PT_PROPOSAL", "CAMPAIGN_BRIEF", "EXECUTIVE_BRIEF"].includes(
      useCase,
    );
  }

  private needsReportSections(useCase: DocumentUseCase): boolean {
    return [
      "WEEKLY_REPORT",
      "MONTHLY_REPORT",
      "EXECUTIVE_BRIEF",
      "FAQ_REPORT",
      "CAMPAIGN_BRIEF",
      "OPTIMIZATION_MEMO",
    ].includes(useCase);
  }

  private inferReportType(useCase: DocumentUseCase): ReportOutputType {
    const map: Partial<Record<DocumentUseCase, ReportOutputType>> = {
      WEEKLY_REPORT: "WEEKLY_LISTENING",
      MONTHLY_REPORT: "MONTHLY_SEARCH_INTELLIGENCE",
      EXECUTIVE_BRIEF: "EXECUTIVE_SUMMARY",
      FAQ_REPORT: "ISSUE_FAQ",
      CAMPAIGN_BRIEF: "CAMPAIGN_STRATEGY_BRIEF",
      OPTIMIZATION_MEMO: "GEO_AEO_OPTIMIZATION_MEMO",
    };
    return map[useCase] ?? "MONTHLY_SEARCH_INTELLIGENCE";
  }

  private emptyOutput(
    seedKeyword: string,
    role: DocumentRole,
    useCase: DocumentUseCase,
    quality: QualityAssessment,
  ): GeneratedDocumentOutput {
    return {
      id: `doc-empty-${Date.now()}`,
      useCase,
      role,
      title: `${seedKeyword} — 데이터 불충분`,
      generatedAt: new Date().toISOString(),
      seedKeyword,
      quality: this.mapper.mapQuality(quality),
      allEvidenceRefs: [],
      allSourceRefs: [],
    };
  }
}
