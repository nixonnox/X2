/**
 * ExportOrchestratorService
 *
 * Word / PPT / PDF export의 전체 파이프라인을 오케스트레이션.
 *
 * 파이프라인:
 * 1. 입력 검증 (evidence 필수, mock 경고)
 * 2. ExportWarning 생성
 * 3. ExportBlockAssembler → ExportBundle
 * 4. VerticalExportPolicy 적용 (업종이 있으면)
 * 5. 형식별 Builder (Word / PPT / PDF)
 * 6. ExportJob 생성
 *
 * 금지:
 * - evidence 없는 export 생성
 * - confidence/stale/partial 숨기기
 * - mock 데이터를 기본 경로로 사용
 */

import type {
  ExportInput,
  ExportResult,
  ExportJob,
  ExportStatus,
  ExportBundle,
  ExportWarning,
  WordExportPurpose,
  PptExportPurpose,
  PdfExportPurpose,
} from "./types";
import { ExportBlockAssembler } from "./export-block-assembler";
import { ExportWarningBuilder } from "./export-warning-builder";
import { VerticalExportPolicyService } from "./vertical-export-policy";
import { WordExportBuilder } from "./word-export-builder";
import { PptExportBuilder } from "./ppt-export-builder";
import { PdfExportBuilder } from "./pdf-export-builder";

export class ExportOrchestratorService {
  private blockAssembler = new ExportBlockAssembler();
  private warningBuilder = new ExportWarningBuilder();
  private verticalPolicy = new VerticalExportPolicyService();
  private wordBuilder = new WordExportBuilder();
  private pptBuilder = new PptExportBuilder();
  private pdfBuilder = new PdfExportBuilder();

  /**
   * Export 실행
   */
  execute(input: ExportInput): ExportResult {
    const { exportFormat, purpose, audience, industryType, sourceData } = input;

    // 1. 입력 검증
    this.validate(input);

    // 2. 경고 생성
    const warnings = this.warningBuilder.buildWarnings(
      sourceData.quality,
      exportFormat,
      industryType,
    );

    // 3. ExportBundle 조립
    let bundle = this.assembleBundle(input, warnings);

    // 4. 업종별 정책 적용
    if (industryType) {
      bundle = this.verticalPolicy.applyPolicy(
        bundle,
        exportFormat,
        industryType,
      );
    }

    // 5. 형식별 빌드
    const industryLabel = industryType
      ? this.getIndustryLabel(industryType)
      : undefined;

    const result: ExportResult = {
      job: this.createJob(input, bundle),
      bundle,
    };

    switch (exportFormat) {
      case "WORD":
        result.wordDocument = this.wordBuilder.build(
          bundle,
          purpose as WordExportPurpose,
          audience,
          sourceData.seedKeyword,
          industryLabel,
        );
        break;

      case "PPT":
        result.pptPresentation = this.pptBuilder.build(
          bundle,
          purpose as PptExportPurpose,
          audience,
          sourceData.seedKeyword,
          industryLabel,
        );
        break;

      case "PDF":
        result.pdfDocument = this.pdfBuilder.build(
          bundle,
          purpose as PdfExportPurpose,
          audience,
          sourceData.seedKeyword,
          industryLabel,
        );
        break;
    }

    return result;
  }

  // ─── 검증 ──────────────────────────────────────────────────────────

  private validate(input: ExportInput): void {
    const { sourceData } = input;

    // evidence 없는 export 금지
    if (sourceData.allEvidenceRefs.length === 0) {
      throw new Error(
        "EXPORT_NO_EVIDENCE: 근거 자료가 없어 export를 생성할 수 없습니다. " +
          "최소 1건 이상의 evidence가 필요합니다.",
      );
    }

    // 데이터 자체가 없는 경우
    const hasContent =
      (sourceData.sections?.length ?? 0) > 0 ||
      (sourceData.slides?.length ?? 0) > 0 ||
      (sourceData.documentBlocks?.length ?? 0) > 0;

    if (!hasContent) {
      throw new Error(
        "EXPORT_NO_CONTENT: 변환할 콘텐츠가 없습니다. " +
          "sections, slides, documentBlocks 중 하나 이상이 필요합니다.",
      );
    }
  }

  // ─── Bundle 조립 ───────────────────────────────────────────────────

  private assembleBundle(
    input: ExportInput,
    warnings: ExportWarning[],
  ): ExportBundle {
    const { exportFormat, sourceData } = input;
    const title = sourceData.title;
    const quality = sourceData.quality;

    // WorkDoc sections 기반
    if (sourceData.sections?.length) {
      return this.blockAssembler.assembleFromSections(
        sourceData.sections,
        exportFormat,
        warnings,
        quality,
        title,
      );
    }

    // PtDeck slides 기반
    if (sourceData.slides?.length) {
      return this.blockAssembler.assembleFromSlides(
        sourceData.slides,
        exportFormat,
        warnings,
        quality,
        title,
      );
    }

    // DocumentBlock 기반
    if (sourceData.documentBlocks?.length) {
      return this.blockAssembler.assembleFromDocumentBlocks(
        sourceData.documentBlocks,
        exportFormat,
        warnings,
        quality,
        title,
      );
    }

    // fallback (validate에서 걸림)
    throw new Error("EXPORT_NO_CONTENT: 변환할 콘텐츠가 없습니다.");
  }

  // ─── ExportJob 생성 ────────────────────────────────────────────────

  private createJob(input: ExportInput, bundle: ExportBundle): ExportJob {
    const now = new Date().toISOString();

    return {
      id: `export-${Date.now()}-${input.exportFormat.toLowerCase()}`,
      exportFormat: input.exportFormat,
      purpose: input.purpose,
      audience: input.audience,
      industryType: input.industryType,
      sourceDocumentId: input.sourceDocumentId,
      sourceDocumentType: input.sourceDocumentType,
      status: "COMPLETED" as ExportStatus,
      createdAt: now,
      completedAt: now,
      metadata: {
        seedKeyword: input.sourceData.seedKeyword,
        title: input.sourceData.title,
        blockCount:
          bundle.summaryBlocks.length +
          bundle.bodyBlocks.length +
          bundle.actionBlocks.length +
          bundle.evidenceBlocks.length +
          bundle.warningBlocks.length +
          bundle.appendixBlocks.length,
        warningCount: bundle.globalWarnings.length,
        hasEvidence:
          bundle.evidenceBlocks.length > 0 ||
          bundle.appendixBlocks.some((b) => b.evidenceRefs.length > 0),
        isMockBased: bundle.quality.isMockOnly ?? false,
      },
    };
  }

  // ─── 유틸 ──────────────────────────────────────────────────────────

  private getIndustryLabel(industry: string): string {
    const labels: Record<string, string> = {
      BEAUTY: "뷰티",
      FNB: "F&B",
      FINANCE: "금융",
      ENTERTAINMENT: "엔터테인먼트",
    };
    return labels[industry] ?? industry;
  }
}
