/**
 * PdfExportBuilder
 *
 * ExportBundle → PdfDocument 변환.
 *
 * PDF의 목적: 읽기/배포/보관 중심 + 레이아웃 안정성
 * - 수정이 아닌 읽기/전달 목적
 * - 레이아웃 깨짐 최소화
 * - 출력 시 안정성 우선
 * - 상태/warning 표시 중요
 *
 * 조립 규칙:
 * - SUMMARY → 표지 다음 첫 페이지 (요약 페이지)
 * - BODY → 본문 페이지 (섹션 제목 + 문단/표)
 * - FAQ/COMPARISON → 표/불릿 혼합 페이지
 * - ACTION → 실행 항목 페이지
 * - EVIDENCE → 부록 페이지
 * - WARNING/RISK → 하단 경고 + 유의사항 페이지
 */

import type {
  ExportBundle,
  ExportBlock,
  ExportWarning,
  PdfDocument,
  PdfPage,
  PdfPageType,
  PdfContentBlock,
  PdfCoverPage,
  PdfConfidenceIndicator,
  PdfTocEntry,
  PdfDisclaimerPage,
  PdfExportPurpose,
} from "./types";

export class PdfExportBuilder {
  /**
   * ExportBundle → PdfDocument 변환
   */
  build(
    bundle: ExportBundle,
    purpose: PdfExportPurpose,
    audience: string,
    seedKeyword: string,
    industryLabel?: string,
  ): PdfDocument {
    const title = bundle.titleBlock.title;
    const now = new Date().toISOString();

    // 1. 표지
    const coverPage = this.buildCoverPage(
      title,
      seedKeyword,
      audience,
      industryLabel,
      bundle,
      now,
    );

    // 2. 페이지 조립
    const pages: PdfPage[] = [];
    let pageNum = 2; // 1 = cover

    // 2a. 요약 페이지
    for (const block of bundle.summaryBlocks) {
      pages.push(
        this.buildSummaryPage(block, bundle.globalWarnings, pageNum++),
      );
    }

    // 2b. 본문 페이지
    for (const block of bundle.bodyBlocks) {
      pages.push(this.buildBodyPage(block, pageNum++));
    }

    // 2c. 액션 페이지
    for (const block of bundle.actionBlocks) {
      pages.push(this.buildActionPage(block, pageNum++));
    }

    // 2d. 경고/리스크 페이지 (있으면)
    if (bundle.warningBlocks.length > 0) {
      pages.push(this.buildRiskPage(bundle.warningBlocks, pageNum++));
    }

    // 2e. 부록 페이지
    for (const block of [...bundle.evidenceBlocks, ...bundle.appendixBlocks]) {
      pages.push(this.buildAppendixPage(block, pageNum++));
    }

    // 3. 목차
    const tableOfContents = this.buildToc(pages);

    // 4. 유의사항 페이지
    const disclaimerPage = this.buildDisclaimerPage(bundle, now);

    return {
      id: `pdf-${Date.now()}`,
      title,
      purpose,
      coverPage,
      tableOfContents,
      pages,
      disclaimerPage,
      metadata: {
        generatedAt: now,
        pageCount: pages.length + 2, // cover + disclaimer
        confidence: bundle.quality.confidence,
        warningCount: bundle.globalWarnings.length,
        isMockBased: bundle.quality.isMockOnly ?? false,
        isWatermarked: bundle.quality.isMockOnly ?? false,
      },
    };
  }

  // ─── 표지 ──────────────────────────────────────────────────────────

  private buildCoverPage(
    title: string,
    seedKeyword: string,
    audience: string,
    industryLabel: string | undefined,
    bundle: ExportBundle,
    date: string,
  ): PdfCoverPage {
    return {
      title,
      subtitle: industryLabel
        ? `${industryLabel} | ${seedKeyword} 검색 인텔리전스 분석`
        : `${seedKeyword} 검색 인텔리전스 분석`,
      date: date.split("T")[0] ?? date,
      seedKeyword,
      industryLabel,
      audience,
      confidenceIndicator: this.buildConfidenceIndicator(
        bundle.quality.confidence,
      ),
    };
  }

  private buildConfidenceIndicator(confidence: number): PdfConfidenceIndicator {
    if (confidence >= 0.7) {
      return {
        level: "HIGH",
        label: "신뢰도 높음",
        description: `신뢰도 ${Math.round(confidence * 100)}%`,
      };
    }
    if (confidence >= 0.4) {
      return {
        level: "MEDIUM",
        label: "신뢰도 보통",
        description: `신뢰도 ${Math.round(confidence * 100)}% — 추가 확인 권장`,
      };
    }
    return {
      level: "LOW",
      label: "신뢰도 낮음",
      description: `신뢰도 ${Math.round(confidence * 100)}% — 참고용으로만 사용`,
    };
  }

  // ─── 페이지 빌더 ───────────────────────────────────────────────────

  private buildSummaryPage(
    block: ExportBlock,
    globalWarnings: ExportWarning[],
    pageNumber: number,
  ): PdfPage {
    const contentBlocks: PdfContentBlock[] = [];

    // 요약 문단
    for (const p of block.paragraphs) {
      contentBlocks.push({
        type: "PARAGRAPH",
        content: p.text,
        qualityNote: p.qualityNote,
      });
    }

    // 품질 뱃지
    const headerBadge = block.quality.isMockOnly
      ? "샘플 데이터 기반"
      : block.quality.confidence < 0.5
        ? `신뢰도 ${Math.round(block.quality.confidence * 100)}%`
        : undefined;

    // 하단 경고
    const footerWarnings = globalWarnings
      .filter((w) => w.severity === "CRITICAL" || w.severity === "WARNING")
      .map((w) => w.message);

    return {
      pageNumber,
      pageType: "SUMMARY",
      sectionTitle: block.title,
      contentBlocks,
      footerWarnings,
      headerBadge,
    };
  }

  private buildBodyPage(block: ExportBlock, pageNumber: number): PdfPage {
    const contentBlocks: PdfContentBlock[] = [];
    const pageType = this.inferPageType(block);

    // FAQ → 표
    if (block.sourceBlockType === "FAQ" || block.role === "FAQ") {
      const faqData = block.structuredData as
        | { questions?: { question: string; answer?: string }[] }
        | undefined;
      if (faqData?.questions) {
        contentBlocks.push({
          type: "TABLE",
          content: block.title,
          structuredData: {
            headers: ["질문", "답변/요약"],
            rows: faqData.questions.map((q) => [q.question, q.answer ?? "—"]),
          },
        });
      } else {
        contentBlocks.push({
          type: "BULLET_LIST",
          content: block.paragraphs.map((p) => p.text).join("\n"),
        });
      }
    }
    // COMPARISON → 표
    else if (
      block.sourceBlockType === "COMPARISON" ||
      block.sourceBlockType === "COMPARISON_TABLE" ||
      block.role === "COMPARISON"
    ) {
      const compData = block.structuredData as
        | { headers?: string[]; rows?: string[][] }
        | undefined;
      contentBlocks.push({
        type: "TABLE",
        content: block.title,
        structuredData: {
          headers: compData?.headers ?? ["항목", "값"],
          rows: compData?.rows ?? block.paragraphs.map((p) => [p.text]),
        },
      });
    }
    // CHART_HINT → 차트 플레이스홀더
    else if (block.role === "CHART_HINT") {
      contentBlocks.push({
        type: "CHART_PLACEHOLDER",
        content: `[차트 영역] ${block.title}`,
      });
      for (const p of block.paragraphs) {
        contentBlocks.push({
          type: "PARAGRAPH",
          content: p.text,
          qualityNote: p.qualityNote,
        });
      }
    }
    // 기본: 문단
    else {
      for (const p of block.paragraphs) {
        contentBlocks.push({
          type: "PARAGRAPH",
          content: p.text,
          qualityNote: p.qualityNote,
        });
      }
    }

    // 하단 경고
    const footerWarnings: string[] = [];
    for (const p of block.paragraphs) {
      if (p.qualityNote) footerWarnings.push(p.qualityNote);
    }
    for (const w of block.warnings) {
      footerWarnings.push(w.message);
    }

    return {
      pageNumber,
      pageType,
      sectionTitle: block.title,
      contentBlocks,
      footerWarnings,
      headerBadge: this.buildPageBadge(block),
    };
  }

  private buildActionPage(block: ExportBlock, pageNumber: number): PdfPage {
    const contentBlocks: PdfContentBlock[] = [];

    contentBlocks.push({
      type: "BULLET_LIST",
      content: block.paragraphs.map((p) => `• ${p.text}`).join("\n"),
    });

    return {
      pageNumber,
      pageType: "ACTION",
      sectionTitle: block.title,
      contentBlocks,
      footerWarnings: [],
    };
  }

  private buildRiskPage(
    warningBlocks: ExportBlock[],
    pageNumber: number,
  ): PdfPage {
    const contentBlocks: PdfContentBlock[] = [];

    for (const block of warningBlocks) {
      for (const p of block.paragraphs) {
        contentBlocks.push({
          type: "WARNING_BOX",
          content: p.text,
          qualityNote: p.qualityNote,
        });
      }
    }

    return {
      pageNumber,
      pageType: "RISK",
      sectionTitle: "주의 사항 및 유의 사항",
      contentBlocks,
      footerWarnings: [],
    };
  }

  private buildAppendixPage(block: ExportBlock, pageNumber: number): PdfPage {
    const contentBlocks: PdfContentBlock[] = [];

    // Evidence 목록
    if (block.evidenceRefs.length > 0) {
      contentBlocks.push({
        type: "TABLE",
        content: "근거 자료",
        structuredData: {
          headers: ["카테고리", "라벨", "스니펫"],
          rows: block.evidenceRefs.map((e) => [
            e.category,
            e.label,
            e.snippet ?? "—",
          ]),
        },
      });
    }

    // 본문
    for (const p of block.paragraphs) {
      contentBlocks.push({
        type: "PARAGRAPH",
        content: p.text,
      });
    }

    return {
      pageNumber,
      pageType: "APPENDIX",
      sectionTitle: `[부록] ${block.title}`,
      contentBlocks,
      footerWarnings: [],
    };
  }

  // ─── 목차 ──────────────────────────────────────────────────────────

  private buildToc(pages: PdfPage[]): PdfTocEntry[] {
    return pages.map((p) => ({
      title: p.sectionTitle,
      pageNumber: p.pageNumber,
      level: p.pageType === "APPENDIX" ? 2 : 1,
    }));
  }

  // ─── 유의사항 페이지 ───────────────────────────────────────────────

  private buildDisclaimerPage(
    bundle: ExportBundle,
    date: string,
  ): PdfDisclaimerPage {
    const disclaimers: string[] = [];
    const qualityWarnings: string[] = [];

    // 전역 경고 → 유의사항
    for (const w of bundle.globalWarnings) {
      if (w.type === "REGULATORY" || w.type === "VERTICAL_POLICY") {
        disclaimers.push(w.message);
      } else {
        qualityWarnings.push(w.message);
      }
    }

    // 기본 유의사항
    disclaimers.push(
      "이 문서의 분석 결과는 수집 데이터 기반이며, 실제 시장 상황과 차이가 있을 수 있습니다.",
    );

    // 품질 관련
    const pct = Math.round(bundle.quality.confidence * 100);
    qualityWarnings.push(`데이터 신뢰도: ${pct}%`);

    if (bundle.quality.isMockOnly) {
      qualityWarnings.push(
        "이 문서는 샘플 데이터 기반으로 생성되었습니다. 실제 데이터로 재검증이 필요합니다.",
      );
    }
    if (bundle.quality.freshness === "stale") {
      qualityWarnings.push(
        "데이터 갱신이 필요합니다. 최신 데이터로 재분석을 권장합니다.",
      );
    }
    if (bundle.quality.isPartial) {
      qualityWarnings.push(
        "일부 데이터 소스만 수집되어 분석 결과가 불완전할 수 있습니다.",
      );
    }

    // Evidence 요약
    const totalEvidence = bundle.evidenceBlocks.reduce(
      (sum, b) => sum + b.evidenceRefs.length,
      0,
    );
    const evidenceSummary = `이 문서는 총 ${totalEvidence}건의 근거 자료를 기반으로 작성되었습니다.`;

    return {
      title: "유의 사항 및 데이터 품질 안내",
      disclaimers,
      qualityWarnings,
      evidenceSummary,
      generatedAt: date,
    };
  }

  // ─── 유틸 ──────────────────────────────────────────────────────────

  private inferPageType(block: ExportBlock): PdfPageType {
    switch (block.role) {
      case "SUMMARY":
        return "SUMMARY";
      case "EVIDENCE":
        return "EVIDENCE";
      case "ACTION":
        return "ACTION";
      case "FAQ":
        return "FAQ";
      case "COMPARISON":
        return "COMPARISON";
      case "RISK":
        return "RISK";
      case "WARNING":
        return "RISK";
      case "APPENDIX":
        return "APPENDIX";
      default:
        return "ANALYSIS";
    }
  }

  private buildPageBadge(block: ExportBlock): string | undefined {
    if (block.quality.isMockOnly) return "샘플 데이터";
    if (block.quality.freshness === "stale") return "오래된 데이터";
    if (block.quality.isPartial) return "불완전 데이터";
    return undefined;
  }
}
