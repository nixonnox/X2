/**
 * VerticalPreviewService
 *
 * Vertical Preview 기능의 오케스트레이터.
 * 동일 입력에 대해 4개 업종 결과를 생성하고,
 * 비교 조립 + 차이점 분석까지 전체 프리뷰 파이프라인을 실행.
 *
 * 하는 일:
 * 1. 입력 데이터로 4개 업종 각각의 문서 생성 + vertical 조립
 * 2. VerticalComparisonAssembler로 비교 구조 생성
 * 3. VerticalDifferenceHighlighter로 차이점 분석
 * 4. 3가지 outputType (WORKDOC, PT_DECK, GENERATED_DOCUMENT) 지원
 *
 * 기존 VerticalDocumentIntegrationService.buildComparisonPreview()와의 차이:
 * - Integration 서비스는 PreviewBuilder 기반의 간략한 비교 프리뷰
 * - 이 서비스는 실제 문서를 생성한 후 상세 비교 (QA/QC 검증용)
 */

import type { IndustryType } from "./types";
import type { VerticalAssemblyResult } from "./vertical-document-assembler";
import type {
  VerticalComparisonData,
  IndustryResult,
} from "./vertical-comparison-assembler";
import type { DifferenceHighlightResult } from "./vertical-difference-highlighter";
import type { IndustrySuggestion } from "./vertical-industry-suggester";
import type { SentenceTone } from "../workdocs/types";

import { VerticalTemplateRegistryService } from "./vertical-template-registry";
import { VerticalDocumentAssembler } from "./vertical-document-assembler";
import { VerticalIndustrySuggester } from "./vertical-industry-suggester";
import { VerticalComparisonAssembler } from "./vertical-comparison-assembler";
import { VerticalDifferenceHighlighter } from "./vertical-difference-highlighter";
import { WorkReportGenerationService } from "../workdocs/work-report-generation.service";
import { PtDeckGenerationService } from "../pt/pt-deck-generation.service";
import { SearchDocumentGenerationService } from "../documents/search-document-generation.service";

// ─── Input Types ──────────────────────────────────────────────────

export type VerticalPreviewInput = {
  result: {
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
  quality: {
    level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
    confidence: number;
    freshness?: "fresh" | "recent" | "stale";
    isPartial?: boolean;
    isMockOnly?: boolean;
    warnings?: string[];
  };
  evidenceItems: {
    category: string;
    label: string;
    dataSourceType?: string;
    entityIds?: string[];
    displayType?: string;
    summary?: string;
    data?: unknown;
  }[];
  insights: {
    id?: string;
    type: string;
    title: string;
    description: string;
    confidence?: number;
    evidenceRefs?: { category: string }[];
  }[];
  actions: {
    id?: string;
    action: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    owner?: string;
    rationale?: string;
  }[];
  outputType: "WORKDOC" | "PT_DECK" | "GENERATED_DOCUMENT";
  audience: string;
  tone?: SentenceTone;
  relatedKeywords?: string[];
  category?: string;
  clusterTopics?: string[];
};

// ─── Output Types ─────────────────────────────────────────────────

/** 전체 프리뷰 결과 */
export type VerticalPreviewResult = {
  /** 입력 요약 */
  seedKeyword: string;
  outputType: string;
  audience: string;
  /** 업종 추론 결과 */
  suggestion: IndustrySuggestion;
  /** 4개 업종별 조립 결과 */
  industryResults: IndustryResult[];
  /** 비교 데이터 */
  comparisonData: VerticalComparisonData;
  /** 차이점 분석 */
  differenceHighlight: DifferenceHighlightResult;
  /** 생성 시각 */
  generatedAt: string;
};

// ─── Constants ────────────────────────────────────────────────────

const LABELS: Record<IndustryType, string> = {
  BEAUTY: "뷰티",
  FNB: "F&B",
  FINANCE: "금융",
  ENTERTAINMENT: "엔터",
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalPreviewService {
  private registry = new VerticalTemplateRegistryService();
  private assembler = new VerticalDocumentAssembler();
  private suggester = new VerticalIndustrySuggester();
  private comparisonAssembler = new VerticalComparisonAssembler();
  private differenceHighlighter = new VerticalDifferenceHighlighter();
  private workReportGeneration = new WorkReportGenerationService();
  private ptDeckGeneration = new PtDeckGenerationService();
  private searchDocumentGeneration = new SearchDocumentGenerationService();

  /**
   * 4개 업종 비교 프리뷰 전체 파이프라인 실행
   */
  generatePreview(input: VerticalPreviewInput): VerticalPreviewResult {
    // 1. 업종 추론
    const suggestion = this.suggester.suggest({
      seedKeyword: input.result.seedKeyword,
      clusterTopics: input.clusterTopics,
      category: input.category,
      relatedKeywords: input.relatedKeywords,
    });

    // 2. 원본 문서 생성 (1회만 — 4개 업종 공통)
    const originalDocument = this.generateOriginalDocument(input);

    // 3. 4개 업종 각각 vertical 조립
    const templates = this.registry.listTemplates();
    const industryResults: IndustryResult[] = templates.map((template) => {
      const assemblyInput = this.buildAssemblyInput(
        template.industryType,
        originalDocument,
        input,
      );
      const assemblyResult = this.assembler.assemble(assemblyInput);

      return {
        industry: template.industryType,
        label: LABELS[template.industryType],
        assemblyResult,
      };
    });

    // 4. 비교 구조 조립
    const comparisonData = this.comparisonAssembler.assemble(industryResults, {
      seedKeyword: input.result.seedKeyword,
      outputType: input.outputType,
      audience: input.audience,
      confidence: input.quality.confidence,
      freshness: input.quality.freshness,
      isPartial: input.quality.isPartial,
      isMockOnly: input.quality.isMockOnly,
      evidenceCount: input.evidenceItems.length,
      insightCount: input.insights.length,
      actionCount: input.actions.length,
    });

    // 5. 차이점 분석
    const differenceHighlight =
      this.differenceHighlighter.highlight(comparisonData);

    return {
      seedKeyword: input.result.seedKeyword,
      outputType: input.outputType,
      audience: input.audience,
      suggestion,
      industryResults,
      comparisonData,
      differenceHighlight,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Private: 원본 문서 생성 ────────────────────────────────────

  private generateOriginalDocument(input: VerticalPreviewInput): {
    workDoc?: any;
    ptDeck?: any;
    generatedDocument?: any;
  } {
    switch (input.outputType) {
      case "WORKDOC":
        return {
          workDoc: this.workReportGeneration.generate({
            result: input.result as any,
            quality: input.quality,
            evidenceItems: input.evidenceItems,
            docType: this.inferWorkDocType(input.audience) as any,
            audience: (input.audience as any) || "OPERATIONS",
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
            deckType: this.inferDeckType(input.audience) as any,
            audience: (input.audience as any) || "MARKETER",
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
            role: this.inferDocumentRole(input.audience) as any,
            useCase: "WEEKLY_REPORT" as any,
          }),
        };
    }
  }

  // ─── Private: Vertical Assembly 입력 구성 ───────────────────────

  private buildAssemblyInput(
    industry: IndustryType,
    originalDocument: { workDoc?: any; ptDeck?: any; generatedDocument?: any },
    input: VerticalPreviewInput,
  ): any {
    if (originalDocument.workDoc) {
      const doc = originalDocument.workDoc;
      return {
        industry,
        sections: doc.sections.map((s: any) => ({
          id: s.id,
          blockType: s.blockType,
          title: s.title,
          oneLiner: s.oneLiner,
          sentences: s.sentences.map((sent: any) => ({
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
          evidenceRefs: (doc.allEvidenceRefs ?? []).map((e: any) => ({
            evidenceId: e.evidenceId ?? "",
            category: e.category,
            label: e.label,
            snippet: e.snippet,
          })),
          quality: {
            confidence: doc.quality?.confidence ?? 0,
            freshness: doc.quality?.freshness,
            isPartial: doc.quality?.isPartial,
            isMockOnly: doc.quality?.isMockOnly,
          },
          order: s.order,
        })),
        evidenceRefs: (doc.allEvidenceRefs ?? []).map((e: any) => ({
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

    if (originalDocument.ptDeck) {
      const deck = originalDocument.ptDeck;
      return {
        industry,
        sections: deck.slides.map((slide: any, i: number) => ({
          id: slide.id,
          blockType: this.mapSlideTypeToBlockType(slide.slideType),
          title: slide.headline,
          oneLiner: slide.keyMessage,
          sentences: slide.supportingPoints.map((sp: string) => ({
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
            freshness: deck.quality?.freshness,
          },
          order: i + 1,
        })),
        evidenceRefs: (deck.allEvidenceRefs ?? []).map((e: any) => ({
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
          quality: { confidence: doc.quality?.confidence ?? 0 },
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

    return {
      industry,
      sections: [],
      evidenceRefs: [],
      quality: { confidence: 0 },
      insights: [],
      actions: [],
    };
  }

  // ─── Private: 유형 추론 ─────────────────────────────────────────

  /**
   * PT slideType → vertical blockType 매핑.
   * PT 슬라이드 타입과 vertical 템플릿 블록 타입은 체계가 다르므로
   * 매핑 없이 직접 사용하면 filterAndOrderSections에서 매칭되지 않음.
   */
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
   * GEO/AEO 보고서의 섹션 타입도 vertical 블록 타입과 체계가 다름.
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
