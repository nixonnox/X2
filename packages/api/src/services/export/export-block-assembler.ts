/**
 * ExportBlockAssembler
 *
 * WorkDoc 섹션 / PtSlide / DocumentBlock을 형식별 ExportBlock으로 변환.
 * "같은 document block이 Word/PPT/PDF에서 다르게 변환되는 핵심 레이어"
 *
 * 역할:
 * 1. 원본 블록 → ExportBlock 변환
 * 2. ExportBlock → ExportBundle 그루핑
 * 3. 형식별 배치 규칙 적용
 */

import type {
  ExportFormat,
  ExportBlock,
  ExportBlockRole,
  ExportBundle,
  ExportEvidenceRef,
  ExportQualityMeta,
  ExportWarning,
  SectionLike,
  SlideLike,
  DocumentBlockLike,
  WORD_BLOCK_PLACEMENT,
  PPT_BLOCK_PLACEMENT,
  PDF_BLOCK_PLACEMENT,
} from "./types";

// ─── Block Type → Export Role 매핑 ───────────────────────────────────

/** WorkDoc blockType → ExportBlockRole */
const WORKDOC_ROLE_MAP: Record<string, ExportBlockRole> = {
  QUICK_SUMMARY: "SUMMARY",
  KEY_FINDING: "BODY",
  EVIDENCE: "EVIDENCE",
  ACTION: "ACTION",
  RISK_NOTE: "RISK",
  FAQ: "FAQ",
  COMPARISON: "COMPARISON",
};

/** PtSlide slideType → ExportBlockRole */
const PT_ROLE_MAP: Record<string, ExportBlockRole> = {
  TITLE: "TITLE",
  EXECUTIVE_SUMMARY: "SUMMARY",
  PROBLEM_DEFINITION: "BODY",
  OPPORTUNITY: "BODY",
  PATHFINDER: "BODY",
  ROADVIEW: "BODY",
  PERSONA: "BODY",
  CLUSTER: "BODY",
  SOCIAL_INSIGHT: "BODY",
  COMPETITIVE_GAP: "COMPARISON",
  GEO_AEO: "BODY",
  STRATEGY: "ACTION",
  ACTION: "ACTION",
  EXPECTED_IMPACT: "BODY",
  EVIDENCE: "EVIDENCE",
  CLOSING: "APPENDIX",
};

/** Document blockType → ExportBlockRole */
const DOC_ROLE_MAP: Record<string, ExportBlockRole> = {
  FAQ: "FAQ",
  SUMMARY: "SUMMARY",
  COMPARISON_TABLE: "COMPARISON",
  INTENT_STAGE_EXPLANATION: "BODY",
  PERSONA_INSIGHT: "BODY",
  KEY_EVIDENCE: "EVIDENCE",
  RECOMMENDED_ACTION: "ACTION",
  DEFINITION: "BODY",
  STAT_HIGHLIGHT: "CHART_HINT",
};

export class ExportBlockAssembler {
  /**
   * WorkDoc 섹션들을 ExportBundle로 조립
   */
  assembleFromSections(
    sections: SectionLike[],
    format: ExportFormat,
    globalWarnings: ExportWarning[],
    globalQuality: ExportQualityMeta,
    titleText: string,
  ): ExportBundle {
    const blocks = sections.map((s, i) => this.sectionToExportBlock(s, i));
    return this.groupIntoBundle(
      blocks,
      format,
      globalWarnings,
      globalQuality,
      titleText,
    );
  }

  /**
   * PtSlide들을 ExportBundle로 조립
   */
  assembleFromSlides(
    slides: SlideLike[],
    format: ExportFormat,
    globalWarnings: ExportWarning[],
    globalQuality: ExportQualityMeta,
    titleText: string,
  ): ExportBundle {
    const blocks = slides.map((s, i) => this.slideToExportBlock(s, i));
    return this.groupIntoBundle(
      blocks,
      format,
      globalWarnings,
      globalQuality,
      titleText,
    );
  }

  /**
   * DocumentBlock들을 ExportBundle로 조립
   */
  assembleFromDocumentBlocks(
    docBlocks: DocumentBlockLike[],
    format: ExportFormat,
    globalWarnings: ExportWarning[],
    globalQuality: ExportQualityMeta,
    titleText: string,
  ): ExportBundle {
    const blocks = docBlocks.map((b, i) => this.docBlockToExportBlock(b, i));
    return this.groupIntoBundle(
      blocks,
      format,
      globalWarnings,
      globalQuality,
      titleText,
    );
  }

  // ─── 변환 메서드 ───────────────────────────────────────────────────

  private sectionToExportBlock(
    section: SectionLike,
    index: number,
  ): ExportBlock {
    const role = WORKDOC_ROLE_MAP[section.blockType] ?? "BODY";

    return {
      id: section.id,
      role,
      sourceBlockType: section.blockType,
      title: section.title,
      oneLiner: section.oneLiner,
      paragraphs: section.sentences.map((s) => ({
        text: s.sentence,
        tone: s.tone,
        qualityNote: s.qualityNote,
        evidenceRef: s.evidenceRef,
      })),
      structuredData: section.structuredData,
      evidenceRefs: section.evidenceRefs,
      quality: section.quality,
      warnings: [],
      order: section.order ?? index + 1,
    };
  }

  private slideToExportBlock(slide: SlideLike, index: number): ExportBlock {
    const role = PT_ROLE_MAP[slide.slideType] ?? "BODY";

    return {
      id: slide.id,
      role,
      sourceBlockType: slide.slideType,
      title: slide.headline,
      oneLiner: slide.subHeadline,
      paragraphs: [
        { text: slide.keyMessage, tone: "persuasive" },
        ...slide.supportingPoints.map((p) => ({
          text: p,
          tone: "supporting",
        })),
      ],
      evidenceRefs: slide.evidenceRefs,
      quality: slide.quality,
      warnings: [],
      order: slide.order ?? index + 1,
    };
  }

  private docBlockToExportBlock(
    block: DocumentBlockLike,
    index: number,
  ): ExportBlock {
    const role = DOC_ROLE_MAP[block.type] ?? "BODY";

    return {
      id: block.id,
      role,
      sourceBlockType: block.type,
      title: block.title,
      oneLiner: block.purpose,
      paragraphs: [{ text: block.body, tone: "analytical" }],
      structuredData: block.structuredData,
      evidenceRefs: block.evidenceRefs,
      quality: block.quality,
      warnings: [],
      order: index + 1,
    };
  }

  // ─── Bundle 그루핑 ─────────────────────────────────────────────────

  private groupIntoBundle(
    blocks: ExportBlock[],
    _format: ExportFormat,
    globalWarnings: ExportWarning[],
    globalQuality: ExportQualityMeta,
    titleText: string,
  ): ExportBundle {
    // 1. 타이틀 블록 (없으면 기본 생성)
    const titleBlock =
      blocks.find((b) => b.role === "TITLE") ??
      this.createTitleBlock(titleText);

    // 2. 역할별 그루핑
    const summaryBlocks = blocks.filter((b) => b.role === "SUMMARY");
    const bodyBlocks = blocks.filter(
      (b) =>
        b.role === "BODY" ||
        b.role === "FAQ" ||
        b.role === "COMPARISON" ||
        b.role === "CHART_HINT",
    );
    const evidenceBlocks = blocks.filter((b) => b.role === "EVIDENCE");
    const actionBlocks = blocks.filter((b) => b.role === "ACTION");
    const warningBlocks = blocks.filter(
      (b) => b.role === "WARNING" || b.role === "RISK",
    );
    const appendixBlocks = blocks.filter((b) => b.role === "APPENDIX");

    return {
      titleBlock,
      summaryBlocks,
      bodyBlocks,
      evidenceBlocks,
      actionBlocks,
      warningBlocks,
      appendixBlocks,
      globalWarnings,
      quality: globalQuality,
    };
  }

  private createTitleBlock(titleText: string): ExportBlock {
    return {
      id: "export-title",
      role: "TITLE",
      sourceBlockType: "TITLE",
      title: titleText,
      paragraphs: [],
      evidenceRefs: [],
      quality: { confidence: 1 },
      warnings: [],
      order: 0,
    };
  }
}
