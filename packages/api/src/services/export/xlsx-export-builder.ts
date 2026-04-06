/**
 * XlsxExportBuilder
 *
 * ExportBundle → XlsxDocument 변환.
 * ExportBundle의 블록을 시트별로 분리하여 XLSX 구조로 변환한다.
 *
 * 시트 구성:
 * - 요약: 제목 + 요약 블록
 * - 데이터: 본문 블록 (테이블/비교/FAQ 포함)
 * - 근거: evidence 블록
 * - 실행항목: action 블록
 * - 경고: warning 블록 + global warnings
 */

import type {
  ExportBundle,
  ExportBlock,
  XlsxDocument,
  XlsxExportPurpose,
  XlsxSheet,
  XlsxSheetType,
  XlsxMetadata,
} from "./types";

export class XlsxExportBuilder {
  build(
    bundle: ExportBundle,
    purpose: XlsxExportPurpose,
    _audience: string,
    seedKeyword: string,
    _industryLabel?: string,
  ): XlsxDocument {
    const sheets: XlsxSheet[] = [];

    // 요약 시트
    const summarySheet = this.buildSummarySheet(bundle, seedKeyword);
    if (summarySheet.rows.length > 0) sheets.push(summarySheet);

    // 데이터 시트
    const dataSheet = this.buildDataSheet(bundle);
    if (dataSheet.rows.length > 0) sheets.push(dataSheet);

    // 근거 시트
    const evidenceSheet = this.buildEvidenceSheet(bundle);
    if (evidenceSheet.rows.length > 0) sheets.push(evidenceSheet);

    // 실행항목 시트
    const actionsSheet = this.buildActionsSheet(bundle);
    if (actionsSheet.rows.length > 0) sheets.push(actionsSheet);

    // 경고 시트
    const warningsSheet = this.buildWarningsSheet(bundle);
    if (warningsSheet.rows.length > 0) sheets.push(warningsSheet);

    const totalRowCount = sheets.reduce((sum, s) => sum + s.rows.length, 0);

    const metadata: XlsxMetadata = {
      generatedAt: new Date().toISOString(),
      sheetCount: sheets.length,
      totalRowCount,
      confidence: bundle.quality.confidence,
      isMockBased: bundle.quality.isMockOnly ?? false,
    };

    return {
      id: `xlsx-${Date.now()}`,
      title: `${seedKeyword} - ${this.getPurposeLabel(purpose)}`,
      purpose,
      sheets,
      metadata,
    };
  }

  // ─── 요약 시트 ────────────────────────────────────────────────────

  private buildSummarySheet(
    bundle: ExportBundle,
    seedKeyword: string,
  ): XlsxSheet {
    const headers = ["항목", "내용"];
    const rows: (string | number | null)[][] = [];

    // 타이틀
    rows.push(["키워드", seedKeyword]);
    rows.push(["생성일", new Date().toISOString().split("T")[0] ?? ""]);
    rows.push(["신뢰도", Math.round(bundle.quality.confidence * 100) + "%"]);
    rows.push(["경고 수", bundle.globalWarnings.length]);
    rows.push(["---", "---"]);

    // 요약 블록
    for (const block of bundle.summaryBlocks) {
      rows.push([block.title, block.paragraphs.map((p) => p.text).join(" ")]);
    }

    return {
      name: "요약",
      headers,
      rows,
      columnWidths: [20, 80],
      sheetType: "SUMMARY" as XlsxSheetType,
    };
  }

  // ─── 데이터 시트 ──────────────────────────────────────────────────

  private buildDataSheet(bundle: ExportBundle): XlsxSheet {
    // TABLE/COMPARISON 블록에서 구조화 데이터가 있으면 그대로 사용
    const tableBlock = bundle.bodyBlocks.find(
      (b) =>
        b.structuredData && (b.role === "TABLE" || b.role === "COMPARISON"),
    );

    if (tableBlock?.structuredData) {
      const data = tableBlock.structuredData;
      const headers = (data.headers as string[]) ?? [];
      const rows = (data.rows as (string | number | null)[][]) ?? [];
      if (headers.length > 0) {
        return {
          name: "데이터",
          headers,
          rows,
          sheetType: "DATA" as XlsxSheetType,
        };
      }
    }

    // 일반 본문 블록 → 행별 변환
    const headers = ["순서", "제목", "유형", "내용", "신뢰도"];
    const rows: (string | number | null)[][] = [];

    for (const block of bundle.bodyBlocks) {
      const text = block.paragraphs.map((p) => p.text).join(" ");
      rows.push([
        block.order,
        block.title,
        block.role,
        text,
        Math.round(block.quality.confidence * 100) + "%",
      ]);

      // 구조화 데이터 내 행도 추가
      if (block.structuredData?.rows) {
        const subRows = block.structuredData.rows as (
          | string
          | number
          | null
        )[][];
        for (const subRow of subRows) {
          rows.push([null, null, null, ...subRow.map(String)]);
        }
      }
    }

    return {
      name: "데이터",
      headers,
      rows,
      columnWidths: [8, 25, 12, 60, 10],
      sheetType: "DATA" as XlsxSheetType,
    };
  }

  // ─── 근거 시트 ────────────────────────────────────────────────────

  private buildEvidenceSheet(bundle: ExportBundle): XlsxSheet {
    const headers = ["ID", "카테고리", "라벨", "발췌", "데이터 소스"];
    const rows: (string | number | null)[][] = [];

    const allBlocks = [
      ...bundle.evidenceBlocks,
      ...bundle.bodyBlocks,
      ...bundle.summaryBlocks,
    ];

    const seen = new Set<string>();

    for (const block of allBlocks) {
      for (const ref of block.evidenceRefs) {
        if (seen.has(ref.evidenceId)) continue;
        seen.add(ref.evidenceId);

        rows.push([
          ref.evidenceId,
          ref.category,
          ref.label,
          ref.snippet ?? "",
          ref.dataSourceType ?? "",
        ]);
      }
    }

    return {
      name: "근거",
      headers,
      rows,
      columnWidths: [15, 15, 25, 50, 15],
      sheetType: "EVIDENCE" as XlsxSheetType,
    };
  }

  // ─── 실행항목 시트 ────────────────────────────────────────────────

  private buildActionsSheet(bundle: ExportBundle): XlsxSheet {
    const headers = ["순서", "제목", "내용", "근거"];
    const rows: (string | number | null)[][] = [];

    for (const block of bundle.actionBlocks) {
      const text = block.paragraphs.map((p) => p.text).join(" ");
      const evidence = block.evidenceRefs
        .map((e) => e.label || e.category)
        .join("; ");

      rows.push([block.order, block.title, text, evidence]);
    }

    return {
      name: "실행항목",
      headers,
      rows,
      columnWidths: [8, 25, 55, 25],
      sheetType: "ACTIONS" as XlsxSheetType,
    };
  }

  // ─── 경고 시트 ────────────────────────────────────────────────────

  private buildWarningsSheet(bundle: ExportBundle): XlsxSheet {
    const headers = ["유형", "심각도", "메시지", "관련 참조"];
    const rows: (string | number | null)[][] = [];

    // global warnings
    for (const w of bundle.globalWarnings) {
      rows.push([w.type, w.severity, w.message, w.relatedRefs.join(", ")]);
    }

    // block-level warnings
    for (const block of bundle.warningBlocks) {
      for (const w of block.warnings) {
        rows.push([w.type, w.severity, w.message, w.relatedRefs.join(", ")]);
      }
    }

    return {
      name: "경고",
      headers,
      rows,
      columnWidths: [20, 12, 55, 25],
      sheetType: "WARNINGS" as XlsxSheetType,
    };
  }

  // ─── 유틸 ─────────────────────────────────────────────────────────

  private getPurposeLabel(purpose: XlsxExportPurpose): string {
    const labels: Record<XlsxExportPurpose, string> = {
      FULL_REPORT: "전체 보고서",
      DASHBOARD_DATA: "대시보드 데이터",
      COMPARISON_TABLE: "비교 분석",
      EVIDENCE_BUNDLE: "근거 자료",
    };
    return labels[purpose] ?? purpose;
  }
}
