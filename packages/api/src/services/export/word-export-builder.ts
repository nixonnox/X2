/**
 * WordExportBuilder
 *
 * ExportBundle → WordDocument 변환.
 *
 * Word의 목적: 편집/공유/회의용 문서
 * - 문단형 구조
 * - 표/불릿 혼합
 * - 복붙/수정 친화형
 * - Word에서 바로 편집 가능한 구조
 *
 * 조립 규칙:
 * - SUMMARY → 한 줄 요약 + 문단
 * - BODY → 문단 + 핵심 발견 불릿
 * - FAQ/COMPARISON → 표
 * - ACTION → 불릿 리스트
 * - EVIDENCE → 부록 표
 * - WARNING/RISK → 인라인 경고 박스
 */

import type {
  ExportBundle,
  ExportBlock,
  ExportWarning,
  ExportQualityMeta,
  WordDocument,
  WordSection,
  WordParagraph,
  WordTable,
  WordBulletList,
  WordAppendix,
  WordExportPurpose,
  WordRenderMode,
} from "./types";

export class WordExportBuilder {
  /**
   * ExportBundle → WordDocument 변환
   */
  build(
    bundle: ExportBundle,
    purpose: WordExportPurpose,
    audience: string,
    seedKeyword: string,
    industryLabel?: string,
  ): WordDocument {
    const title = bundle.titleBlock.title;
    const now = new Date().toISOString();

    // 1. 한 줄 요약
    const quickSummary = this.buildQuickSummary(bundle);

    // 2. 섹션 조립
    const sections: WordSection[] = [];
    let order = 1;

    // 2a. 요약 섹션
    for (const block of bundle.summaryBlocks) {
      sections.push(this.buildParagraphSection(block, order++));
    }

    // 2b. 본문 섹션 (BODY / FAQ / COMPARISON)
    for (const block of bundle.bodyBlocks) {
      sections.push(this.buildBodySection(block, order++));
    }

    // 2c. 액션 섹션
    for (const block of bundle.actionBlocks) {
      sections.push(this.buildActionSection(block, order++));
    }

    // 2d. 경고/리스크 섹션
    for (const block of bundle.warningBlocks) {
      sections.push(this.buildWarningSection(block, order++));
    }

    // 3. 부록
    const appendix = this.buildAppendix(bundle);

    // 4. 유의사항 (전역 경고)
    const disclaimers = this.buildDisclaimers(
      bundle.globalWarnings,
      bundle.quality,
    );

    return {
      id: `word-${Date.now()}`,
      title,
      purpose,
      header: {
        title,
        date: now.split("T")[0] ?? now,
        seedKeyword,
        industryLabel,
        audience,
      },
      quickSummary,
      sections,
      appendix,
      disclaimers,
      metadata: {
        generatedAt: now,
        confidence: bundle.quality.confidence,
        warningCount: bundle.globalWarnings.length,
        evidenceCount: bundle.evidenceBlocks.reduce(
          (sum, b) => sum + b.evidenceRefs.length,
          0,
        ),
        isMockBased: bundle.quality.isMockOnly ?? false,
      },
    };
  }

  // ─── 섹션 빌더 ─────────────────────────────────────────────────────

  private buildQuickSummary(bundle: ExportBundle): string {
    const summaryBlock = bundle.summaryBlocks[0];
    if (!summaryBlock) return bundle.titleBlock.title;

    const firstSentence = summaryBlock.paragraphs[0]?.text ?? "";
    const qualityNote = summaryBlock.quality.isMockOnly
      ? " [검증 필요: 샘플 데이터 기반]"
      : "";
    return firstSentence + qualityNote;
  }

  private buildParagraphSection(
    block: ExportBlock,
    order: number,
  ): WordSection {
    const paragraphs: WordParagraph[] = [
      { text: block.title, style: "HEADING2" },
    ];

    if (block.oneLiner) {
      paragraphs.push({ text: block.oneLiner, style: "CAPTION" });
    }

    for (const p of block.paragraphs) {
      paragraphs.push({
        text: p.text,
        style: "NORMAL",
        qualityNote: p.qualityNote,
      });
    }

    return {
      id: block.id,
      title: block.title,
      renderMode: "PARAGRAPH",
      paragraphs,
      tables: [],
      bulletLists: [],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildBodySection(block: ExportBlock, order: number): WordSection {
    // FAQ → 표형
    if (block.sourceBlockType === "FAQ" || block.role === "FAQ") {
      return this.buildFaqTableSection(block, order);
    }

    // COMPARISON → 표형
    if (
      block.sourceBlockType === "COMPARISON" ||
      block.sourceBlockType === "COMPARISON_TABLE" ||
      block.role === "COMPARISON"
    ) {
      return this.buildComparisonTableSection(block, order);
    }

    // CHART_HINT → 표 + 설명
    if (block.role === "CHART_HINT") {
      return this.buildChartHintSection(block, order);
    }

    // 기본: 문단 + 불릿 혼합
    return this.buildMixedSection(block, order);
  }

  private buildFaqTableSection(block: ExportBlock, order: number): WordSection {
    const faqData = block.structuredData as
      | { questions?: { question: string; answer?: string }[] }
      | undefined;
    const table: WordTable = {
      caption: block.title,
      headers: ["질문", "답변/요약"],
      rows: [],
    };

    if (faqData?.questions) {
      for (const q of faqData.questions) {
        table.rows.push([q.question, q.answer ?? "—"]);
      }
    } else {
      // structuredData 없으면 paragraphs에서 추출
      for (const p of block.paragraphs) {
        table.rows.push([p.text, "—"]);
      }
    }

    return {
      id: block.id,
      title: block.title,
      renderMode: "TABLE",
      paragraphs: [{ text: block.title, style: "HEADING2" }],
      tables: [table],
      bulletLists: [],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildComparisonTableSection(
    block: ExportBlock,
    order: number,
  ): WordSection {
    const compData = block.structuredData as
      | { headers?: string[]; rows?: string[][] }
      | undefined;
    const table: WordTable = {
      caption: block.title,
      headers: compData?.headers ?? ["항목", "값", "비고"],
      rows: compData?.rows ?? block.paragraphs.map((p) => [p.text, "", ""]),
    };

    return {
      id: block.id,
      title: block.title,
      renderMode: "TABLE",
      paragraphs: [{ text: block.title, style: "HEADING2" }],
      tables: [table],
      bulletLists: [],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildChartHintSection(
    block: ExportBlock,
    order: number,
  ): WordSection {
    const paragraphs: WordParagraph[] = [
      { text: block.title, style: "HEADING2" },
    ];

    for (const p of block.paragraphs) {
      paragraphs.push({
        text: p.text,
        style: "NORMAL",
        qualityNote: p.qualityNote,
      });
    }

    paragraphs.push({
      text: "[시각화 참고: 이 데이터는 차트/그래프로 표현하면 효과적입니다]",
      style: "CAPTION",
    });

    return {
      id: block.id,
      title: block.title,
      renderMode: "MIXED",
      paragraphs,
      tables: [],
      bulletLists: [],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildMixedSection(block: ExportBlock, order: number): WordSection {
    const paragraphs: WordParagraph[] = [
      { text: block.title, style: "HEADING2" },
    ];

    const bulletList: WordBulletList = { items: [] };

    for (const p of block.paragraphs) {
      if (
        p.text.startsWith("•") ||
        p.text.startsWith("-") ||
        p.text.startsWith("- ")
      ) {
        bulletList.items.push({
          text: p.text.replace(/^[•\-]\s*/, ""),
          level: 0,
          qualityNote: p.qualityNote,
        });
      } else {
        paragraphs.push({
          text: p.text,
          style: "NORMAL",
          qualityNote: p.qualityNote,
        });
      }
    }

    const renderMode: WordRenderMode =
      bulletList.items.length > 0 ? "MIXED" : "PARAGRAPH";

    return {
      id: block.id,
      title: block.title,
      renderMode,
      paragraphs,
      tables: [],
      bulletLists: bulletList.items.length > 0 ? [bulletList] : [],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildActionSection(block: ExportBlock, order: number): WordSection {
    const bulletList: WordBulletList = {
      title: block.title,
      items: block.paragraphs.map((p) => ({
        text: p.text,
        level: 0,
        qualityNote: p.qualityNote,
      })),
    };

    return {
      id: block.id,
      title: block.title,
      renderMode: "BULLET_LIST",
      paragraphs: [{ text: block.title, style: "HEADING2" }],
      tables: [],
      bulletLists: [bulletList],
      inlineWarnings: this.extractInlineWarnings(block),
      order,
    };
  }

  private buildWarningSection(block: ExportBlock, order: number): WordSection {
    const paragraphs: WordParagraph[] = [
      { text: block.title, style: "HEADING2" },
    ];

    for (const p of block.paragraphs) {
      paragraphs.push({ text: p.text, style: "WARNING_BOX" });
    }

    return {
      id: block.id,
      title: block.title,
      renderMode: "PARAGRAPH",
      paragraphs,
      tables: [],
      bulletLists: [],
      inlineWarnings: [],
      order,
    };
  }

  // ─── 부록 ──────────────────────────────────────────────────────────

  private buildAppendix(bundle: ExportBundle): WordAppendix {
    // Evidence 표
    const evidenceTable: WordTable | null =
      bundle.evidenceBlocks.length > 0
        ? {
            caption: "근거 자료 목록",
            headers: ["ID", "카테고리", "라벨", "스니펫"],
            rows: bundle.evidenceBlocks.flatMap((b) =>
              b.evidenceRefs.map((e) => [
                e.evidenceId,
                e.category,
                e.label,
                e.snippet ?? "—",
              ]),
            ),
          }
        : null;

    // 부록 원문
    const rawDataSections = bundle.appendixBlocks.map((b) => ({
      title: b.title,
      content: b.paragraphs.map((p) => p.text).join("\n\n"),
    }));

    // 품질 노트
    const qualityNotes: string[] = [];
    if (bundle.quality.isMockOnly) {
      qualityNotes.push(
        "[검증 필요] 이 문서는 샘플 데이터 기반으로 생성되었습니다.",
      );
    }
    if (bundle.quality.freshness === "stale") {
      qualityNotes.push("[주의] 데이터 갱신이 필요합니다.");
    }
    if (bundle.quality.isPartial) {
      qualityNotes.push("[참고] 일부 데이터 소스만 수집되었습니다.");
    }

    return {
      evidenceTable,
      sourceTable: null,
      qualityNotes,
      rawDataSections,
    };
  }

  // ─── 유의사항 ──────────────────────────────────────────────────────

  private buildDisclaimers(
    warnings: ExportWarning[],
    quality: ExportQualityMeta,
  ): string[] {
    const disclaimers: string[] = [];

    // 전역 경고 → 유의사항
    for (const w of warnings) {
      if (w.severity === "CRITICAL" || w.severity === "WARNING") {
        disclaimers.push(w.message);
      }
    }

    // 신뢰도 표시
    const pct = Math.round(quality.confidence * 100);
    disclaimers.push(`이 문서의 데이터 신뢰도는 ${pct}%입니다.`);

    // mock 경고
    if (quality.isMockOnly) {
      disclaimers.push(
        "이 문서는 샘플 데이터 기반이며, 실제 데이터로 재검증이 필요합니다.",
      );
    }

    return disclaimers;
  }

  // ─── 유틸 ──────────────────────────────────────────────────────────

  private extractInlineWarnings(block: ExportBlock): string[] {
    const warnings: string[] = [];
    for (const p of block.paragraphs) {
      if (p.qualityNote) warnings.push(p.qualityNote);
    }
    for (const w of block.warnings) {
      warnings.push(w.message);
    }
    return warnings;
  }
}
