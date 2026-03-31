/**
 * CsvExportBuilder
 *
 * ExportBundle → CsvDocument 변환.
 * ExportBundle의 블록을 평탄화하여 CSV 행/열 구조로 변환한다.
 *
 * 원칙:
 * - TABLE/COMPARISON 블록은 structuredData에서 행/열 추출
 * - BODY/SUMMARY 등 텍스트 블록은 [제목, 내용, 근거] 형태로 변환
 * - evidence 정보 포함
 * - UTF-8 BOM으로 한글 Excel 호환
 */

import type {
  ExportBundle,
  ExportBlock,
  CsvDocument,
  CsvExportPurpose,
  CsvMetadata,
} from "./types";

export class CsvExportBuilder {
  build(
    bundle: ExportBundle,
    purpose: CsvExportPurpose,
    _audience: string,
    seedKeyword: string,
    _industryLabel?: string,
  ): CsvDocument {
    const { headers, rows } = this.extractRows(bundle, purpose);

    const metadata: CsvMetadata = {
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      columnCount: headers.length,
      confidence: bundle.quality.confidence,
      isMockBased: bundle.quality.isMockOnly ?? false,
      encoding: "utf-8-bom",
    };

    return {
      id: `csv-${Date.now()}`,
      title: `${seedKeyword} - ${this.getPurposeLabel(purpose)}`,
      purpose,
      headers,
      rows,
      metadata,
    };
  }

  private extractRows(
    bundle: ExportBundle,
    purpose: CsvExportPurpose,
  ): { headers: string[]; rows: string[][] } {
    switch (purpose) {
      case "KEYWORD_LIST":
      case "RANKING_EXPORT":
      case "MENTION_LIST":
        return this.extractFromStructuredData(bundle);
      case "DATA_TABLE":
      default:
        return this.extractFromAllBlocks(bundle);
    }
  }

  /**
   * 모든 블록을 [섹션, 제목, 내용, 근거, 신뢰도] 형태로 평탄화
   */
  private extractFromAllBlocks(
    bundle: ExportBundle,
  ): { headers: string[]; rows: string[][] } {
    const headers = ["섹션", "제목", "내용", "근거", "신뢰도"];
    const rows: string[][] = [];

    const blockGroups: { label: string; blocks: ExportBlock[] }[] = [
      { label: "요약", blocks: bundle.summaryBlocks },
      { label: "본문", blocks: bundle.bodyBlocks },
      { label: "실행항목", blocks: bundle.actionBlocks },
      { label: "근거", blocks: bundle.evidenceBlocks },
      { label: "부록", blocks: bundle.appendixBlocks },
    ];

    for (const group of blockGroups) {
      for (const block of group.blocks) {
        const text = block.paragraphs.map((p) => p.text).join(" ");
        const evidence = block.evidenceRefs
          .map((e) => e.label || e.category)
          .join("; ");
        const confidence = String(block.quality.confidence);

        rows.push([group.label, block.title, text, evidence, confidence]);

        // structuredData가 테이블 형태면 행 추가
        if (block.structuredData) {
          const tableRows = this.tryExtractTableRows(block.structuredData);
          rows.push(...tableRows);
        }
      }
    }

    return { headers, rows };
  }

  /**
   * structuredData가 있는 블록에서 테이블 데이터 추출
   */
  private extractFromStructuredData(
    bundle: ExportBundle,
  ): { headers: string[]; rows: string[][] } {
    // TABLE/COMPARISON 역할 블록에서 구조화 데이터 우선 추출
    const tableBlocks = [
      ...bundle.bodyBlocks,
      ...bundle.summaryBlocks,
      ...bundle.appendixBlocks,
    ].filter(
      (b) =>
        b.structuredData &&
        (b.role === "TABLE" || b.role === "COMPARISON" || b.role === "FAQ"),
    );

    if (tableBlocks.length > 0 && tableBlocks[0].structuredData) {
      const data = tableBlocks[0].structuredData;
      const hdrs = (data.headers as string[]) ?? [];
      const rws = (data.rows as string[][]) ?? [];
      if (hdrs.length > 0) {
        return { headers: hdrs, rows: rws };
      }
    }

    // fallback: 전체 블록 평탄화
    return this.extractFromAllBlocks(bundle);
  }

  private tryExtractTableRows(
    data: Record<string, unknown>,
  ): string[][] {
    const rows = data.rows as string[][] | undefined;
    if (Array.isArray(rows)) {
      return rows;
    }
    return [];
  }

  private getPurposeLabel(purpose: CsvExportPurpose): string {
    const labels: Record<CsvExportPurpose, string> = {
      DATA_TABLE: "데이터 테이블",
      KEYWORD_LIST: "키워드 목록",
      RANKING_EXPORT: "랭킹",
      MENTION_LIST: "멘션 목록",
    };
    return labels[purpose] ?? purpose;
  }
}
