/**
 * VerticalDocumentIntegrationService
 *
 * vertical template → document generation → vertical assembly → export
 * 전체 파이프라인을 연결하는 통합 서비스.
 *
 * 하는 일:
 * 1. 업종 자동 추론 + 수동 선택 통합
 * 2. document generation (WorkDoc/PT/GeneratedDocument) 호출
 * 3. vertical assembly (업종별 재조립) 적용
 * 4. export (Word/PPT/PDF) 형식 변환
 * 5. 4개 업종 비교 프리뷰 생성
 *
 * 이 서비스가 없으면:
 * - 호출자가 5개 서비스를 직접 순서대로 조합해야 함
 * - 업종 추론 → 생성 → 조립 → export 사이의 데이터 전달이 복잡
 * - 프리뷰/비교 로직이 분산됨
 */

import type {
  IndustryType,
  VerticalTemplate,
  SupportedOutputType,
} from "./types";
import type {
  VerticalAssemblyInput,
  VerticalAssemblyResult,
} from "./vertical-document-assembler";
import type {
  ExportFormat,
  ExportInput,
  ExportResult,
  ExportPurpose,
  ExportQualityMeta,
  ExportEvidenceRef,
} from "../export/types";
import type {
  WorkDoc,
  WorkDocType,
  WorkDocAudience,
  SentenceTone,
} from "../workdocs/types";
import type { PtDeck, PtDeckType, PtAudience } from "../pt/types";
import type {
  GeneratedDocumentOutput,
  DocumentRole,
  DocumentUseCase,
} from "../documents/types";
import type {
  VerticalComparisonPreview,
  ExportFormatPreview,
} from "./vertical-preview-builder";
import type { IndustrySuggestion } from "./vertical-industry-suggester";
import { VerticalTemplateRegistryService } from "./vertical-template-registry";
import { VerticalDocumentAssembler } from "./vertical-document-assembler";
import { VerticalIndustrySuggester } from "./vertical-industry-suggester";
import { VerticalPreviewBuilder } from "./vertical-preview-builder";
import { WorkReportGenerationService } from "../workdocs/work-report-generation.service";
import { PtDeckGenerationService } from "../pt/pt-deck-generation.service";
import { SearchDocumentGenerationService } from "../documents/search-document-generation.service";
import { ExportOrchestratorService } from "../export/export-orchestrator.service";

// ─── Input Types ──────────────────────────────────────────────────

/** 공통 검색 결과 (SearchIntelligenceResult 호환) */
type SearchResultLike = {
  seedKeyword: string;
  analyzedAt: string;
  trace: {
    confidence: number;
    freshness?: string;
    sourceSummary?: {
      name: string;
      status: string;
      itemCount?: number;
      latencyMs?: number;
    }[];
  };
  cluster?: { success: boolean; data?: unknown };
  pathfinder?: { success: boolean; data?: unknown };
  roadview?: { success: boolean; data?: unknown };
  persona?: { success: boolean; data?: unknown };
};

type QualityLike = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

type EvidenceBundleItemLike = {
  category: string;
  label: string;
  dataSourceType?: string;
  entityIds?: string[];
  displayType?: string;
  summary?: string;
  data?: unknown;
};

type InsightLike = {
  id?: string;
  type: string;
  title: string;
  description: string;
  confidence?: number;
  evidenceRefs?: { category: string }[];
};

type ActionLike = {
  id?: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
  rationale?: string;
};

// ─── 통합 입력 ────────────────────────────────────────────────────

export type VerticalDocumentGenerationInput = {
  /** 업종 (수동 선택). 없으면 자동 추론 */
  industryType?: IndustryType;
  /** 검색 결과 */
  result: SearchResultLike;
  /** 품질 평가 */
  quality: QualityLike;
  /** Evidence 항목 */
  evidenceItems: EvidenceBundleItemLike[];
  /** 인사이트 */
  insights: InsightLike[];
  /** 액션 */
  actions: ActionLike[];
  /** 문서 유형 선택 */
  outputType: VerticalDocumentOutputType;
  /** 대상 역할 */
  audience: string;
  /** 톤 오버라이드 */
  tone?: SentenceTone;
  /** 추가 키워드 (업종 추론 보조) */
  relatedKeywords?: string[];
  /** 카테고리 (업종 추론 보조) */
  category?: string;
  /** cluster 주제 (업종 추론 보조) */
  clusterTopics?: string[];
};

/** 문서 출력 유형 */
export type VerticalDocumentOutputType =
  | "WORKDOC"
  | "PT_DECK"
  | "GENERATED_DOCUMENT";

// ─── 통합 결과 ────────────────────────────────────────────────────

export type VerticalDocumentGenerationResult = {
  /** 적용된 업종 */
  industry: IndustryType;
  /** 대상 역할 */
  audience: string;
  /** 업종 추론 결과 (자동 추론이었으면) */
  suggestion?: IndustrySuggestion;
  /** 원본 문서 (vertical 적용 전) */
  originalDocument: {
    workDoc?: WorkDoc;
    ptDeck?: PtDeck;
    generatedDocument?: GeneratedDocumentOutput;
  };
  /** Vertical 조립 결과 */
  verticalResult: VerticalAssemblyResult;
  /** 생성 시각 */
  generatedAt: string;
};

// ─── Export 통합 입력 ─────────────────────────────────────────────

export type VerticalExportInput = {
  /** vertical 문서 생성 결과 */
  documentResult: VerticalDocumentGenerationResult;
  /** export 형식 */
  exportFormat: ExportFormat;
  /** export 목적 */
  purpose: ExportPurpose;
};

// ─── Preview 입력 ─────────────────────────────────────────────────

export type VerticalComparisonInput = {
  result: SearchResultLike;
  quality: QualityLike;
  evidenceItems: EvidenceBundleItemLike[];
  insights: InsightLike[];
  actions: ActionLike[];
  outputType: VerticalDocumentOutputType;
  audience: string;
  relatedKeywords?: string[];
  category?: string;
  clusterTopics?: string[];
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalDocumentIntegrationService {
  private registry = new VerticalTemplateRegistryService();
  private assembler = new VerticalDocumentAssembler();
  private suggester = new VerticalIndustrySuggester();
  private previewBuilder = new VerticalPreviewBuilder();
  private workReportGeneration = new WorkReportGenerationService();
  private ptDeckGeneration = new PtDeckGenerationService();
  private searchDocumentGeneration = new SearchDocumentGenerationService();
  private exportOrchestrator = new ExportOrchestratorService();

  // ─── 1. 업종별 문서 생성 (메인 파이프라인) ─────────────────────

  /**
   * 통합 파이프라인: 업종 추론 → 문서 생성 → vertical 조립
   */
  generate(
    input: VerticalDocumentGenerationInput,
  ): VerticalDocumentGenerationResult {
    // 1. 업종 결정
    const { industry, suggestion } = this.resolveIndustry(input);

    // 2. 원본 문서 생성
    const originalDocument = this.generateOriginalDocument(input);

    // 3. Vertical 조립 입력 구성
    const assemblyInput = this.buildAssemblyInput(
      industry,
      originalDocument,
      input,
    );

    // 4. Vertical 조립 실행
    const verticalResult = this.assembler.assemble(assemblyInput);

    return {
      industry,
      audience: input.audience,
      suggestion,
      originalDocument,
      verticalResult,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── 2. 업종별 문서 + Export ──────────────────────────────────

  /**
   * 문서 생성 → vertical 조립 → export 변환 전체 파이프라인
   */
  generateAndExport(
    input: VerticalDocumentGenerationInput,
    exportFormat: ExportFormat,
    purpose: ExportPurpose,
  ): {
    documentResult: VerticalDocumentGenerationResult;
    exportResult: ExportResult;
  } {
    const documentResult = this.generate(input);
    const exportResult = this.export({
      documentResult,
      exportFormat,
      purpose,
    });

    return { documentResult, exportResult };
  }

  // ─── 3. Export 단독 실행 ────────────────────────────────────

  /**
   * 이미 생성된 vertical 문서를 export
   */
  export(input: VerticalExportInput): ExportResult {
    const { documentResult, exportFormat, purpose } = input;
    const { industry, audience, verticalResult, originalDocument } =
      documentResult;

    const exportInput = this.buildExportInput(
      industry,
      verticalResult,
      originalDocument,
      exportFormat,
      purpose,
      audience,
    );

    return this.exportOrchestrator.execute(exportInput);
  }

  // ─── 4. 업종 자동 추론 ─────────────────────────────────────

  /**
   * seedKeyword / cluster / category 기반 업종 추론
   */
  suggestIndustry(input: {
    seedKeyword: string;
    clusterTopics?: string[];
    category?: string;
    relatedKeywords?: string[];
  }): IndustrySuggestion {
    return this.suggester.suggest(input);
  }

  // ─── 5. 4개 업종 비교 프리뷰 ───────────────────────────────

  /**
   * 동일 데이터 → 4개 업종 결과 비교 프리뷰
   */
  buildComparisonPreview(
    input: VerticalComparisonInput,
  ): VerticalComparisonPreview {
    const suggestion = this.suggester.suggest({
      seedKeyword: input.result.seedKeyword,
      clusterTopics: input.clusterTopics,
      category: input.category,
      relatedKeywords: input.relatedKeywords,
    });

    const templates = this.registry.listTemplates();

    // 각 업종별로 문서 생성 + vertical 조립
    const assemblyResults = new Map<IndustryType, VerticalAssemblyResult>();

    for (const template of templates) {
      const docResult = this.generateOriginalDocument(input);
      const assemblyInput = this.buildAssemblyInput(
        template.industryType,
        docResult,
        input,
      );
      const result = this.assembler.assemble(assemblyInput);
      assemblyResults.set(template.industryType, result);
    }

    return this.previewBuilder.buildComparisonPreview(
      input.result.seedKeyword,
      suggestion,
      templates,
      assemblyResults,
    );
  }

  // ─── 6. Export 형식별 프리뷰 ───────────────────────────────

  /**
   * 특정 업종 × 형식의 export 프리뷰
   */
  buildExportFormatPreview(
    industryType: IndustryType,
    format: ExportFormat,
  ): ExportFormatPreview {
    const template = this.registry.getTemplate(industryType);
    return this.previewBuilder.buildExportFormatPreview(template, format);
  }

  // ─── 7. 지원 현황 조회 ─────────────────────────────────────

  /**
   * 등록된 업종 목록
   */
  listIndustries(): IndustryType[] {
    return this.registry.listIndustries();
  }

  /**
   * 업종이 특정 출력을 지원하는지
   */
  supportsOutput(
    industry: IndustryType,
    outputType: SupportedOutputType,
  ): boolean {
    return this.registry.supportsOutput(industry, outputType);
  }

  // ─── Private: 업종 결정 ─────────────────────────────────────

  private resolveIndustry(input: VerticalDocumentGenerationInput): {
    industry: IndustryType;
    suggestion?: IndustrySuggestion;
  } {
    if (input.industryType) {
      return { industry: input.industryType };
    }

    const suggestion = this.suggester.suggest({
      seedKeyword: input.result.seedKeyword,
      clusterTopics: input.clusterTopics,
      category: input.category,
      relatedKeywords: input.relatedKeywords,
    });

    if (suggestion.suggestedIndustry) {
      return { industry: suggestion.suggestedIndustry, suggestion };
    }

    // 추론 실패 시 기본값 BEAUTY
    return { industry: "BEAUTY", suggestion };
  }

  // ─── Private: 원본 문서 생성 ────────────────────────────────

  private generateOriginalDocument(input: {
    outputType: VerticalDocumentOutputType;
    result: SearchResultLike;
    quality: QualityLike;
    evidenceItems: EvidenceBundleItemLike[];
    insights: InsightLike[];
    actions: ActionLike[];
    audience: string;
    tone?: SentenceTone;
  }): {
    workDoc?: WorkDoc;
    ptDeck?: PtDeck;
    generatedDocument?: GeneratedDocumentOutput;
  } {
    switch (input.outputType) {
      case "WORKDOC":
        return {
          workDoc: this.workReportGeneration.generate({
            result: input.result as any,
            quality: input.quality,
            evidenceItems: input.evidenceItems,
            docType: this.inferWorkDocType(input.audience) as WorkDocType,
            audience: (input.audience as WorkDocAudience) || "OPERATIONS",
            insights: input.insights,
            actions: input.actions as any[],
            tone: input.tone,
          }),
        };

      case "PT_DECK":
        return {
          ptDeck: this.ptDeckGeneration.generate({
            result: input.result as any,
            quality: input.quality,
            evidenceItems: input.evidenceItems,
            deckType: this.inferDeckType(input.audience) as PtDeckType,
            audience: (input.audience as PtAudience) || "MARKETER",
            insights: input.insights as any[],
            actions: input.actions as any[],
          }),
        };

      case "GENERATED_DOCUMENT":
        return {
          generatedDocument: this.searchDocumentGeneration.generate({
            result: input.result as any,
            quality: input.quality,
            evidenceItems: input.evidenceItems,
            role: this.inferDocumentRole(input.audience) as DocumentRole,
            useCase: "WEEKLY_REPORT" as DocumentUseCase,
          }),
        };
    }
  }

  // ─── Private: Vertical Assembly 입력 구성 ───────────────────

  private buildAssemblyInput(
    industry: IndustryType,
    originalDocument: {
      workDoc?: WorkDoc;
      ptDeck?: PtDeck;
      generatedDocument?: GeneratedDocumentOutput;
    },
    input: {
      quality: QualityLike;
      insights: InsightLike[];
      actions: ActionLike[];
    },
  ): VerticalAssemblyInput {
    // WorkDoc → sections 변환
    if (originalDocument.workDoc) {
      const doc = originalDocument.workDoc;
      return {
        industry,
        sections: doc.sections.map((s) => ({
          id: s.id,
          blockType: s.blockType,
          title: s.title,
          oneLiner: s.oneLiner,
          sentences: s.sentences.map((sent) => ({
            sentence: sent.sentence,
            tone: sent.tone,
            evidenceRef: sent.evidenceRef
              ? {
                  evidenceId: sent.evidenceRef.evidenceId ?? "",
                  category: sent.evidenceRef.category,
                  label: sent.evidenceRef.label,
                  snippet: sent.evidenceRef.snippet,
                }
              : undefined,
            qualityNote: sent.qualityNote,
          })),
          evidenceRefs: (doc.allEvidenceRefs ?? []).map((e) => ({
            evidenceId: e.evidenceId ?? "",
            category: e.category,
            label: e.label,
            snippet: e.snippet,
          })),
          quality: {
            confidence: doc.quality?.confidence ?? 0,
            freshness: doc.quality?.freshness as any,
            isPartial: doc.quality?.isPartial,
            isMockOnly: doc.quality?.isMockOnly,
          },
          order: s.order,
        })),
        evidenceRefs: (doc.allEvidenceRefs ?? []).map((e) => ({
          evidenceId: e.evidenceId ?? "",
          category: e.category,
          label: e.label,
          snippet: e.snippet,
        })),
        quality: {
          confidence: input.quality.confidence,
          freshness: input.quality.freshness,
          isPartial: input.quality.isPartial,
          isMockOnly: input.quality.isMockOnly,
        },
        insights: input.insights.map((i) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
          confidence: i.confidence,
          evidenceRefs: i.evidenceRefs,
        })),
        actions: input.actions.map((a) => ({
          id: a.id,
          action: a.action,
          priority: a.priority,
          owner: a.owner,
          rationale: a.rationale,
        })),
      };
    }

    // PtDeck → sections 변환 (slides → workdoc-like sections)
    if (originalDocument.ptDeck) {
      const deck = originalDocument.ptDeck;
      return {
        industry,
        sections: deck.slides.map((slide, i) => ({
          id: slide.id,
          blockType: this.mapSlideTypeToBlockType(slide.slideType),
          title: slide.headline,
          oneLiner: slide.keyMessage,
          sentences: slide.supportingPoints.map((sp) => ({
            sentence: sp,
            tone: "REPORT",
          })),
          evidenceRefs: (slide.evidenceRefs ?? []).map((e: any) => ({
            evidenceId: e.evidenceId ?? "",
            category: e.category ?? "",
            label: e.label ?? "",
          })),
          quality: {
            confidence: deck.quality?.confidence ?? 0,
            freshness: deck.quality?.freshness as any,
          },
          order: i + 1,
        })),
        evidenceRefs: (deck.allEvidenceRefs ?? []).map((e) => ({
          evidenceId: e.evidenceId ?? "",
          category: e.category,
          label: e.label,
          snippet: e.snippet,
        })),
        quality: {
          confidence: input.quality.confidence,
          freshness: input.quality.freshness,
          isPartial: input.quality.isPartial,
          isMockOnly: input.quality.isMockOnly,
        },
        insights: input.insights.map((i) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
        })),
        actions: input.actions.map((a) => ({
          id: a.id,
          action: a.action,
          priority: a.priority,
          owner: a.owner,
        })),
      };
    }

    // GeneratedDocument → sections 변환
    if (originalDocument.generatedDocument) {
      const doc = originalDocument.generatedDocument;
      const reportSections = doc.reportSections ?? [];
      return {
        industry,
        sections: reportSections.map((s: any, i: number) => ({
          id: s.id ?? `section-${i}`,
          blockType: this.mapDocSectionTypeToBlockType(
            s.sectionType ?? s.type ?? "BODY",
          ),
          title: s.title ?? "",
          oneLiner: s.summary ?? "",
          sentences: (s.paragraphs ?? []).map((p: string) => ({
            sentence: p,
            tone: "REPORT",
          })),
          evidenceRefs: (doc.allEvidenceRefs ?? []).map((e: any) => ({
            evidenceId: e.evidenceId ?? "",
            category: e.category ?? "",
            label: e.label ?? "",
          })),
          quality: {
            confidence: doc.quality?.confidence ?? 0,
          },
          order: i + 1,
        })),
        evidenceRefs: (doc.allEvidenceRefs ?? []).map((e: any) => ({
          evidenceId: e.evidenceId ?? "",
          category: e.category ?? "",
          label: e.label ?? "",
        })),
        quality: {
          confidence: input.quality.confidence,
          freshness: input.quality.freshness,
          isPartial: input.quality.isPartial,
          isMockOnly: input.quality.isMockOnly,
        },
        insights: input.insights.map((i) => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description,
        })),
        actions: input.actions.map((a) => ({
          id: a.id,
          action: a.action,
          priority: a.priority,
          owner: a.owner,
        })),
      };
    }

    // fallback
    return {
      industry,
      sections: [],
      evidenceRefs: [],
      quality: { confidence: 0 },
      insights: [],
      actions: [],
    };
  }

  // ─── Private: Export 입력 구성 ──────────────────────────────

  private buildExportInput(
    industry: IndustryType,
    verticalResult: VerticalAssemblyResult,
    originalDocument: {
      workDoc?: WorkDoc;
      ptDeck?: PtDeck;
      generatedDocument?: GeneratedDocumentOutput;
    },
    exportFormat: ExportFormat,
    purpose: ExportPurpose,
    audience?: string,
  ): ExportInput {
    const seedKeyword =
      originalDocument.workDoc?.seedKeyword ??
      originalDocument.ptDeck?.seedKeyword ??
      originalDocument.generatedDocument?.seedKeyword ??
      "";

    // 원본 quality 정보를 그대로 전달 (mock/stale/partial 유실 방지)
    const originalQuality =
      originalDocument.workDoc?.quality ??
      originalDocument.ptDeck?.quality ??
      originalDocument.generatedDocument?.quality;

    const quality: ExportQualityMeta = {
      confidence: originalQuality?.confidence ?? 0,
      freshness: originalQuality?.freshness as ExportQualityMeta["freshness"],
      isPartial: originalQuality?.isPartial,
      isMockOnly: originalQuality?.isMockOnly,
      warnings: originalQuality?.warnings,
    };

    // sections → ExportInput.sourceData.sections
    const sections = verticalResult.sections.map((s) => ({
      id: s.id,
      blockType: s.blockType,
      title: s.title,
      oneLiner: s.oneLiner,
      sentences: s.sentences.map((sent: any) => ({
        sentence: sent.sentence,
        tone: sent.tone,
        evidenceRef: sent.evidenceRef,
        qualityNote: sent.qualityNote,
      })),
      evidenceRefs: (s.evidenceRefs ?? []).map((e: any) => ({
        evidenceId: e.evidenceId ?? "",
        category: e.category ?? "",
        label: e.label ?? "",
      })),
      quality: s.quality ?? { confidence: 0 },
      order: s.order,
    }));

    // allEvidenceRefs
    const allEvidenceRefs: ExportEvidenceRef[] =
      verticalResult.evidencePolicy.sortedEvidence?.map((e: any) => ({
        evidenceId: e.evidenceId ?? "",
        category: e.category ?? "",
        label: e.label ?? "",
        snippet: e.snippet,
        dataSourceType: e.dataSourceType,
      })) ?? [];

    return {
      exportFormat,
      purpose,
      audience: audience ?? "OPERATIONS",
      industryType: industry,
      sourceDocumentId:
        originalDocument.workDoc?.id ??
        originalDocument.ptDeck?.id ??
        originalDocument.generatedDocument?.id ??
        `vertical-${Date.now()}`,
      sourceDocumentType: originalDocument.workDoc
        ? "WORKDOC"
        : originalDocument.ptDeck
          ? "PT_DECK"
          : "GENERATED_DOCUMENT",
      sourceData: {
        id: `src-${Date.now()}`,
        title: `${seedKeyword} — ${industry}`,
        seedKeyword,
        sections,
        allEvidenceRefs,
        allSourceRefs: [],
        quality,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // ─── Private: 유형 추론 ─────────────────────────────────────

  /**
   * PT slideType → vertical blockType 매핑.
   * PT 슬라이드 타입과 vertical 템플릿 블록 타입은 체계가 다르므로
   * 매핑 없이 직접 사용하면 filterAndOrderSections에서 매칭되지 않음.
   */
  private mapSlideTypeToBlockType(slideType: string): string {
    const map: Record<string, string> = {
      TITLE: "QUICK_SUMMARY",
      EXECUTIVE_SUMMARY: "QUICK_SUMMARY",
      PROBLEM_DEFINITION: "KEY_FINDING",
      OPPORTUNITY: "KEY_FINDING",
      PATHFINDER: "PATH",
      PERSONA: "PERSONA",
      CLUSTER: "CLUSTER",
      ROADVIEW: "ROAD_STAGE",
      STRATEGY: "ACTION",
      ACTION: "ACTION",
      EXPECTED_IMPACT: "ACTION",
      EVIDENCE: "EVIDENCE",
      CLOSING: "RISK_NOTE",
      SOCIAL_INSIGHT: "FAQ",
      COMPETITIVE_GAP: "COMPARISON",
      GEO_AEO: "FAQ",
    };
    return map[slideType] ?? slideType;
  }

  /**
   * GeneratedDocument sectionType → vertical blockType 매핑.
   * GEO/AEO 문서의 섹션 타입과 vertical 템플릿 블록 타입은 체계가 다르므로
   * 매핑 없이 직접 사용하면 filterAndOrderSections에서 매칭되지 않음.
   */
  private mapDocSectionTypeToBlockType(sectionType: string): string {
    const map: Record<string, string> = {
      EXECUTIVE_SUMMARY: "QUICK_SUMMARY",
      MARKET_BACKGROUND: "KEY_FINDING",
      SEARCH_INTENT_OVERVIEW: "KEY_FINDING",
      CLUSTER_ANALYSIS: "CLUSTER",
      JOURNEY_ANALYSIS: "PATH",
      PERSONA_ANALYSIS: "PERSONA",
      COMPETITIVE_LANDSCAPE: "COMPARISON",
      GEO_AEO_IMPLICATIONS: "FAQ",
      RECOMMENDED_ACTIONS: "ACTION",
      EVIDENCE_APPENDIX: "EVIDENCE",
      DATA_QUALITY_NOTE: "RISK_NOTE",
    };
    return map[sectionType] ?? sectionType;
  }

  private inferWorkDocType(audience: string): string {
    const map: Record<string, string> = {
      EXECUTIVE: "EXECUTIVE_MEMO",
      MANAGEMENT: "BUSINESS_REPORT",
      OPERATIONS: "BUSINESS_REPORT",
      TEAM_LEAD: "BUSINESS_REPORT",
      MARKETER: "BUSINESS_REPORT",
    };
    return map[audience] ?? "BUSINESS_REPORT";
  }

  private inferDeckType(audience: string): string {
    const map: Record<string, string> = {
      EXECUTIVE: "INTERNAL_STRATEGY",
      MANAGEMENT: "INTERNAL_STRATEGY",
      ADVERTISER: "ADVERTISER_PROPOSAL",
      MARKETER: "CAMPAIGN_STRATEGY",
    };
    return map[audience] ?? "INTERNAL_STRATEGY";
  }

  private inferDocumentRole(audience: string): string {
    const map: Record<string, string> = {
      EXECUTIVE: "EXECUTIVE",
      MANAGEMENT: "MANAGER",
      OPERATIONS: "ANALYST",
      MARKETER: "MARKETER",
    };
    return map[audience] ?? "ANALYST";
  }
}
