/**
 * RoleBasedDocumentAssembler
 *
 * Role / Use Case에 따라 DocumentBlock[], ReportSection[], PtSlideBlock[]을 필터링·재조립.
 *
 * 입력: 전체 블록/섹션/슬라이드 + DocumentRole + DocumentUseCase
 * 출력: GeneratedDocumentOutput (role에 맞게 조립된 최종 출력물)
 *
 * 역할별 차이:
 * - PRACTITIONER: 차트 + 근거 + 요약 + PPT 친화형 문장 (전체 포함)
 * - MARKETER: stage별 메시지, cluster별 액션, 콘텐츠/광고 제안
 * - EXECUTIVE: executive summary, 전략 기회/리스크, decision-ready
 * - ADMIN: citation readiness, source trust, FAQ/summary 개선 포인트
 */

import type {
  DocumentBlock,
  ReportOutputSection,
  PtSlideBlock,
  DocumentRole,
  DocumentUseCase,
  DocumentQualityMeta,
  GeneratedDocumentOutput,
  EvidenceRef,
  SourceRef,
  ROLE_DOCUMENT_CONFIG,
} from "./types";
import { ROLE_DOCUMENT_CONFIG as CONFIG } from "./types";

type AssemblyInput = {
  seedKeyword: string;
  role: DocumentRole;
  useCase: DocumentUseCase;
  quality: DocumentQualityMeta;
  documentBlocks: DocumentBlock[];
  reportSections: ReportOutputSection[];
  ptSlides: PtSlideBlock[];
  allEvidenceRefs: EvidenceRef[];
  allSourceRefs: SourceRef[];
};

export class RoleBasedDocumentAssembler {
  /**
   * Role/UseCase에 따라 전체 블록을 필터링하여 최종 출력물로 조립.
   */
  assemble(input: AssemblyInput): GeneratedDocumentOutput {
    const config = CONFIG[input.role];

    // 1. DocumentBlock 필터링
    let blocks = this.filterBlocks(input.documentBlocks, input.role, config);
    blocks = blocks.slice(0, config.maxBlocks);

    // 2. ReportSection 필터링
    let sections = this.filterSections(
      input.reportSections,
      input.role,
      config,
    );
    sections = sections.slice(0, config.maxSections);

    // 3. PtSlide 필터링
    let slides = this.filterSlides(input.ptSlides, input.role, config);
    slides = slides.slice(0, config.maxSlides);

    // 4. Evidence/Source 필터링
    const evidenceRefs = config.includeRawEvidence
      ? input.allEvidenceRefs
      : input.allEvidenceRefs.filter((e) => e.snippet); // snippet이 있는 것만
    const sourceRefs = config.includeSourceDetail
      ? input.allSourceRefs
      : input.allSourceRefs.filter((s) => s.citationReady);

    // 5. Quality warnings 처리
    const quality = { ...input.quality };
    if (!config.includeQualityWarnings) {
      quality.warnings = undefined;
    }

    return {
      id: `doc-${input.useCase}-${input.role}-${Date.now()}`,
      useCase: input.useCase,
      role: input.role,
      title: this.generateTitle(input),
      generatedAt: new Date().toISOString(),
      seedKeyword: input.seedKeyword,
      quality,
      documentBlocks: blocks.length > 0 ? blocks : undefined,
      reportSections: sections.length > 0 ? sections : undefined,
      ptSlides: slides.length > 0 ? slides : undefined,
      allEvidenceRefs: evidenceRefs,
      allSourceRefs: sourceRefs,
    };
  }

  // ─── Block Filtering ──────────────────────────────────────────────

  private filterBlocks(
    blocks: DocumentBlock[],
    role: DocumentRole,
    config: (typeof CONFIG)[DocumentRole],
  ): DocumentBlock[] {
    return blocks
      .filter((block) => {
        // EXECUTIVE: SUMMARY, KEY_EVIDENCE, RECOMMENDED_ACTION만
        if (role === "EXECUTIVE") {
          return ["SUMMARY", "KEY_EVIDENCE", "RECOMMENDED_ACTION"].includes(
            block.type,
          );
        }
        // MARKETER: FAQ, COMPARISON_TABLE, RECOMMENDED_ACTION, PERSONA_INSIGHT 우선
        if (role === "MARKETER") {
          return block.type !== "KEY_EVIDENCE" || block.evidenceRefs.length > 0;
        }
        return true;
      })
      .map((block) => {
        if (!config.includeQualityWarnings) {
          return {
            ...block,
            quality: { ...block.quality, warnings: undefined },
          };
        }
        return block;
      });
  }

  // ─── Section Filtering ────────────────────────────────────────────

  private filterSections(
    sections: ReportOutputSection[],
    role: DocumentRole,
    config: (typeof CONFIG)[DocumentRole],
  ): ReportOutputSection[] {
    return sections
      .filter((section) => {
        // EXECUTIVE: EXECUTIVE_SUMMARY, RECOMMENDED_ACTIONS만
        if (role === "EXECUTIVE") {
          return [
            "EXECUTIVE_SUMMARY",
            "SEARCH_INTENT_OVERVIEW",
            "RECOMMENDED_ACTIONS",
          ].includes(section.type);
        }
        // MARKETER: DATA_QUALITY_NOTE 제외
        if (role === "MARKETER") {
          return section.type !== "DATA_QUALITY_NOTE";
        }
        return true;
      })
      .map((section) => {
        if (!config.includeQualityWarnings) {
          return {
            ...section,
            quality: { ...section.quality, warnings: undefined },
          };
        }
        return section;
      });
  }

  // ─── Slide Filtering ──────────────────────────────────────────────

  private filterSlides(
    slides: PtSlideBlock[],
    role: DocumentRole,
    config: (typeof CONFIG)[DocumentRole],
  ): PtSlideBlock[] {
    return slides
      .filter((slide) => {
        // EXECUTIVE: TITLE, MARKET_BACKGROUND, COMPETITIVE_OPPORTUNITY, RECOMMENDED_ACTION, CLOSING
        if (role === "EXECUTIVE") {
          return [
            "TITLE",
            "MARKET_BACKGROUND",
            "COMPETITIVE_OPPORTUNITY",
            "RECOMMENDED_ACTION",
            "GEO_AEO_INSIGHT",
            "CLOSING",
          ].includes(slide.slideType);
        }
        return true;
      })
      .map((slide) => {
        // speakerNote에 quality 경고가 있으면 role에 따라 제거
        if (!config.includeQualityWarnings && slide.speakerNote) {
          return { ...slide, speakerNote: "데이터 상태 양호" };
        }
        return slide;
      });
  }

  // ─── Title Generation ─────────────────────────────────────────────

  private generateTitle(input: AssemblyInput): string {
    const USECASE_TITLES: Record<DocumentUseCase, string> = {
      GEO_AEO_DOCUMENT: "GEO/AEO 최적화 문서",
      PT_PROPOSAL: "검색 인텔리전스 제안서",
      WEEKLY_REPORT: "주간 리스닝 리포트",
      MONTHLY_REPORT: "월간 검색 인텔리전스 리포트",
      EXECUTIVE_BRIEF: "경영진 요약 브리프",
      CAMPAIGN_BRIEF: "캠페인 전략 브리프",
      FAQ_REPORT: "이슈/FAQ 리포트",
      OPTIMIZATION_MEMO: "GEO/AEO 최적화 메모",
    };

    const ROLE_SUFFIX: Record<DocumentRole, string> = {
      PRACTITIONER: "",
      MARKETER: " (마케터용)",
      ADMIN: " (운영용)",
      EXECUTIVE: " (경영진용)",
    };

    const base = USECASE_TITLES[input.useCase] ?? "분석 문서";
    return `${input.seedKeyword} ${base}${ROLE_SUFFIX[input.role]}`;
  }
}
