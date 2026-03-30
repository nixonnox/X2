/**
 * VerticalPreviewBuilder
 *
 * 4개 업종별 문서 결과를 비교 프리뷰로 변환하는 서비스.
 *
 * 하는 일:
 * 1. 단일 업종 프리뷰 생성 (제목/요약/블록 미리보기/경고/톤)
 * 2. 4개 업종 비교 프리뷰 생성 (동일 데이터 → 4개 결과 비교)
 * 3. export 형식별 프리뷰 (Word/PPT/PDF 미리보기)
 *
 * 규칙:
 * - 프리뷰는 실제 문서의 요약본 (전체 렌더링이 아님)
 * - 블록 순서, 강조, 숨김 차이를 시각적으로 보여줌
 * - 경고/톤 차이를 비교 가능하게 표시
 */

import type { IndustryType, VerticalTemplate } from "./types";
import type {
  VerticalAssemblyResult,
  VerticalAssemblyInput,
} from "./vertical-document-assembler";
import type { ExportFormat, ExportResult } from "../export/types";
import type { IndustrySuggestion } from "./vertical-industry-suggester";

// ─── Preview Types ────────────────────────────────────────────────

/** 단일 업종 프리뷰 */
export type VerticalPreview = {
  industry: IndustryType;
  label: string;
  /** 블록 구성 미리보기 */
  blockPreview: BlockPreviewItem[];
  /** 톤 가이드라인 요약 */
  tonePreview: TonePreviewItem;
  /** 경고 미리보기 */
  warningPreview: WarningPreviewItem[];
  /** evidence 정책 요약 */
  evidencePreview: EvidencePreviewItem;
  /** 핵심 차이점 요약 (다른 업종과의 차이) */
  keyDifferences: string[];
  /** 프리뷰 생성 시각 */
  generatedAt: string;
};

/** 블록 미리보기 항목 */
type BlockPreviewItem = {
  blockType: string;
  title: string;
  emphasis: "REQUIRED" | "EMPHASIZED" | "OPTIONAL" | "HIDDEN";
  /** 원본 제목 vs 업종 오버라이드 */
  titleOverride?: string;
  /** 첫 문장 미리보기 (있으면) */
  firstSentence?: string;
  order: number;
};

/** 톤 미리보기 */
type TonePreviewItem = {
  defaultTone: string;
  uncertaintyHandling: string;
  forbiddenPatternsCount: number;
  sampleForbidden: string[];
  samplePreferred: string[];
};

/** 경고 미리보기 */
type WarningPreviewItem = {
  type: string;
  message: string;
  severity: string;
};

/** Evidence 정책 미리보기 */
type EvidencePreviewItem = {
  minCount: number;
  maxCount: number;
  minConfidence: number;
  allowStaleData: boolean;
  priorityCategories: string[];
};

/** 4개 업종 비교 프리뷰 */
export type VerticalComparisonPreview = {
  seedKeyword: string;
  /** 업종 자동 추천 결과 */
  suggestion: IndustrySuggestion;
  /** 4개 업종별 프리뷰 */
  previews: VerticalPreview[];
  /** 주요 차이점 매트릭스 */
  differenceMatrix: DifferenceMatrixRow[];
  /** 생성 시각 */
  generatedAt: string;
};

/** 차이점 매트릭스 행 */
type DifferenceMatrixRow = {
  dimension: string;
  values: Record<IndustryType, string>;
};

/** Export 형식별 프리뷰 */
export type ExportFormatPreview = {
  industry: IndustryType;
  format: ExportFormat;
  /** 예상 구조 요약 */
  structureSummary: string;
  /** 블록 배치 미리보기 */
  blockPlacements: { blockType: string; placement: string }[];
  /** 경고 배치 */
  warningPlacements: { type: string; placement: string }[];
  /** 특수 처리 (워터마크, 뱃지 등) */
  specialFeatures: string[];
};

// ─── 업종 라벨 ────────────────────────────────────────────────────

const INDUSTRY_LABELS: Record<IndustryType, string> = {
  BEAUTY: "뷰티",
  FNB: "F&B",
  FINANCE: "금융",
  ENTERTAINMENT: "엔터테인먼트",
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalPreviewBuilder {
  /**
   * 단일 업종 프리뷰 생성
   */
  buildPreview(
    template: VerticalTemplate,
    assemblyResult?: VerticalAssemblyResult,
  ): VerticalPreview {
    const blockPreview = this.buildBlockPreview(template, assemblyResult);
    const tonePreview = this.buildTonePreview(template);
    const warningPreview = this.buildWarningPreview(template, assemblyResult);
    const evidencePreview = this.buildEvidencePreview(template);
    const keyDifferences = this.buildKeyDifferences(template);

    return {
      industry: template.industryType,
      label: template.label,
      blockPreview,
      tonePreview,
      warningPreview,
      evidencePreview,
      keyDifferences,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 4개 업종 비교 프리뷰 생성
   */
  buildComparisonPreview(
    seedKeyword: string,
    suggestion: IndustrySuggestion,
    templates: VerticalTemplate[],
    assemblyResults?: Map<IndustryType, VerticalAssemblyResult>,
  ): VerticalComparisonPreview {
    const previews = templates.map((t) =>
      this.buildPreview(t, assemblyResults?.get(t.industryType)),
    );

    const differenceMatrix = this.buildDifferenceMatrix(templates);

    return {
      seedKeyword,
      suggestion,
      previews,
      differenceMatrix,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Export 형식별 프리뷰 생성
   */
  buildExportFormatPreview(
    template: VerticalTemplate,
    format: ExportFormat,
  ): ExportFormatPreview {
    const blockPlacements = this.getBlockPlacements(template, format);
    const warningPlacements = this.getWarningPlacements(format);
    const specialFeatures = this.getSpecialFeatures(template, format);
    const structureSummary = this.getStructureSummary(template, format);

    return {
      industry: template.industryType,
      format,
      structureSummary,
      blockPlacements,
      warningPlacements,
      specialFeatures,
    };
  }

  // ─── Private: Block Preview ─────────────────────────────────────

  private buildBlockPreview(
    template: VerticalTemplate,
    assemblyResult?: VerticalAssemblyResult,
  ): BlockPreviewItem[] {
    return template.blockConfigs.map((config, i) => {
      const section = assemblyResult?.sections.find(
        (s) => s.blockType === config.blockType,
      );

      return {
        blockType: config.blockType,
        title: config.titleOverride ?? config.blockType,
        emphasis: config.emphasis,
        titleOverride: config.titleOverride,
        firstSentence: section?.sentences[0]?.sentence,
        order: i + 1,
      };
    });
  }

  // ─── Private: Tone Preview ──────────────────────────────────────

  private buildTonePreview(template: VerticalTemplate): TonePreviewItem {
    const tone = template.toneGuideline;
    return {
      defaultTone: tone.defaultTone,
      uncertaintyHandling: tone.uncertaintyHandling,
      forbiddenPatternsCount: tone.forbiddenPatterns.length,
      sampleForbidden: tone.forbiddenPatterns.slice(0, 3),
      samplePreferred: tone.preferredPatterns.slice(0, 3),
    };
  }

  // ─── Private: Warning Preview ───────────────────────────────────

  private buildWarningPreview(
    template: VerticalTemplate,
    assemblyResult?: VerticalAssemblyResult,
  ): WarningPreviewItem[] {
    const warnings: WarningPreviewItem[] = [];

    // 규제 경고
    for (const note of template.riskPolicy.regulatoryNotes) {
      warnings.push({
        type: "REGULATORY",
        message: `[${template.label} 규제] ${note}`,
        severity: template.industryType === "FINANCE" ? "CRITICAL" : "WARNING",
      });
    }

    // 리스크 체크
    for (const check of template.riskPolicy.additionalRiskChecks) {
      warnings.push({
        type: "RISK_CHECK",
        message: `[${template.label} 체크] ${check}`,
        severity: "CAUTION",
      });
    }

    // assembly 결과의 추가 경고
    if (assemblyResult) {
      for (const w of assemblyResult.additionalWarnings) {
        warnings.push({
          type: "VERTICAL_POLICY",
          message: w,
          severity: "WARNING",
        });
      }
    }

    return warnings;
  }

  // ─── Private: Evidence Preview ──────────────────────────────────

  private buildEvidencePreview(
    template: VerticalTemplate,
  ): EvidencePreviewItem {
    const ep = template.evidencePolicy;
    return {
      minCount: ep.minEvidenceCount,
      maxCount: ep.maxEvidenceCount,
      minConfidence: ep.minConfidenceThreshold,
      allowStaleData: ep.allowStaleData,
      priorityCategories: ep.priorityCategories.slice(0, 5),
    };
  }

  // ─── Private: Key Differences ───────────────────────────────────

  private buildKeyDifferences(template: VerticalTemplate): string[] {
    const diffs: string[] = [];

    // 톤 차이
    if (template.toneGuideline.defaultTone === "FORMAL") {
      diffs.push("공식적/보수적 톤 사용 (FORMAL)");
    }
    if (template.toneGuideline.uncertaintyHandling === "CONSERVATIVE") {
      diffs.push("불확실 표현을 보수적으로 처리");
    }

    // 강조 블록
    const emphasized = template.blockConfigs
      .filter((c) => c.emphasis === "EMPHASIZED")
      .map((c) => c.blockType);
    if (emphasized.length > 0) {
      diffs.push(`강조 블록: ${emphasized.join(", ")}`);
    }

    // 숨김 블록
    const hidden = template.blockConfigs
      .filter((c) => c.emphasis === "HIDDEN")
      .map((c) => c.blockType);
    if (hidden.length > 0) {
      diffs.push(`숨김 블록: ${hidden.join(", ")}`);
    }

    // evidence 정책
    if (!template.evidencePolicy.allowStaleData) {
      diffs.push("stale 데이터 사용 불가");
    }
    if (template.evidencePolicy.minConfidenceThreshold > 0.5) {
      diffs.push(
        `높은 신뢰도 기준 (${template.evidencePolicy.minConfidenceThreshold * 100}%)`,
      );
    }

    // 규제
    if (template.riskPolicy.regulatoryNotes.length > 2) {
      diffs.push(
        `규제 주의사항 ${template.riskPolicy.regulatoryNotes.length}건`,
      );
    }

    return diffs;
  }

  // ─── Private: Difference Matrix ─────────────────────────────────

  private buildDifferenceMatrix(
    templates: VerticalTemplate[],
  ): DifferenceMatrixRow[] {
    const rows: DifferenceMatrixRow[] = [];
    const byIndustry = new Map(templates.map((t) => [t.industryType, t]));

    // 톤
    rows.push({
      dimension: "기본 톤",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) => t.toneGuideline.defaultTone,
      ),
    });

    // 불확실성 처리
    rows.push({
      dimension: "불확실성 처리",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) => t.toneGuideline.uncertaintyHandling,
      ),
    });

    // 강조 블록 수
    rows.push({
      dimension: "강조 블록",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) =>
          t.blockConfigs
            .filter((c) => c.emphasis === "EMPHASIZED")
            .map((c) => c.blockType)
            .join(", ") || "없음",
      ),
    });

    // 최소 신뢰도
    rows.push({
      dimension: "최소 신뢰도",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) => `${(t.evidencePolicy.minConfidenceThreshold * 100).toFixed(0)}%`,
      ),
    });

    // 규제 경고 수
    rows.push({
      dimension: "규제 경고",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) => `${t.riskPolicy.regulatoryNotes.length}건`,
      ),
    });

    // 리스크 톤 수준
    rows.push({
      dimension: "리스크 강도",
      values: this.getValuesByIndustry(
        byIndustry,
        (t) => t.riskPolicy.riskToneLevel,
      ),
    });

    // stale 허용
    rows.push({
      dimension: "Stale 허용",
      values: this.getValuesByIndustry(byIndustry, (t) =>
        t.evidencePolicy.allowStaleData ? "허용" : "불가",
      ),
    });

    return rows;
  }

  private getValuesByIndustry(
    byIndustry: Map<IndustryType, VerticalTemplate>,
    extractor: (t: VerticalTemplate) => string,
  ): Record<IndustryType, string> {
    const result: Record<IndustryType, string> = {
      BEAUTY: "-",
      FNB: "-",
      FINANCE: "-",
      ENTERTAINMENT: "-",
    };

    for (const [industry, template] of byIndustry) {
      result[industry] = extractor(template);
    }

    return result;
  }

  // ─── Private: Export Format Preview ─────────────────────────────

  private getBlockPlacements(
    template: VerticalTemplate,
    format: ExportFormat,
  ): { blockType: string; placement: string }[] {
    const placements: Record<ExportFormat, Record<string, string>> = {
      WORD: {
        SUMMARY: "PARAGRAPH",
        BODY: "PARAGRAPH",
        FAQ: "TABLE",
        COMPARISON: "TABLE",
        ACTION: "BULLET_LIST",
        EVIDENCE: "APPENDIX",
      },
      PPT: {
        SUMMARY: "SLIDE_HEADLINE",
        BODY: "SUPPORTING_POINT",
        FAQ: "SUPPORTING_POINT",
        COMPARISON: "VISUAL_HINT",
        ACTION: "SUPPORTING_POINT",
        EVIDENCE: "BACKUP_SLIDE",
      },
      PDF: {
        SUMMARY: "SUMMARY_PAGE",
        BODY: "BODY_PAGE",
        FAQ: "BODY_PAGE",
        COMPARISON: "BODY_PAGE",
        ACTION: "BODY_PAGE",
        EVIDENCE: "APPENDIX_PAGE",
      },
    };

    return template.blockConfigs
      .filter((c) => c.emphasis !== "HIDDEN")
      .map((c) => ({
        blockType: c.blockType,
        placement: placements[format][c.blockType] ?? "BODY",
      }));
  }

  private getWarningPlacements(
    format: ExportFormat,
  ): { type: string; placement: string }[] {
    const map: Record<ExportFormat, { type: string; placement: string }[]> = {
      WORD: [
        { type: "MOCK_DATA", placement: "HEADER" },
        { type: "STALE_DATA", placement: "INLINE" },
        { type: "REGULATORY", placement: "APPENDIX" },
      ],
      PPT: [
        { type: "MOCK_DATA", placement: "FOOTER" },
        { type: "STALE_DATA", placement: "FOOTER" },
        { type: "REGULATORY", placement: "SPEAKER_NOTE" },
      ],
      PDF: [
        { type: "MOCK_DATA", placement: "WATERMARK" },
        { type: "STALE_DATA", placement: "FOOTER" },
        { type: "REGULATORY", placement: "FOOTER" },
      ],
    };
    return map[format];
  }

  private getSpecialFeatures(
    template: VerticalTemplate,
    format: ExportFormat,
  ): string[] {
    const features: string[] = [];

    if (format === "PDF") {
      features.push("표지 신뢰도 뱃지 (HIGH/MEDIUM/LOW)");
      features.push("목차 자동 생성");
      features.push("유의사항 페이지");
      if (template.industryType === "FINANCE") {
        features.push("규제 경고 3건 필수 포함");
        features.push("EVIDENCE 본문 유지 (부록 이동 금지)");
      }
    }

    if (format === "PPT") {
      features.push("시각화 힌트 매핑");
      features.push("발표자 노트에 경고 삽입");
      if (template.industryType === "ENTERTAINMENT") {
        features.push("FAQ/EVIDENCE 숨김 (반응/확산 집중)");
      }
      if (template.industryType === "FINANCE") {
        features.push("FORMAL 톤 강제");
      }
    }

    if (format === "WORD") {
      features.push("표/불릿 혼합 렌더링");
      features.push("부록에 Evidence 표 포함");
      if (template.industryType === "FINANCE") {
        features.push("EVIDENCE 본문 유지");
        features.push("투자 권유 금지 경고");
      }
    }

    return features;
  }

  private getStructureSummary(
    template: VerticalTemplate,
    format: ExportFormat,
  ): string {
    const label = INDUSTRY_LABELS[template.industryType];
    const summaries: Record<ExportFormat, string> = {
      WORD: `${label} × Word: 편집/공유 목적. 문단+표+불릿 혼합 구조. 부록에 근거 표.`,
      PPT: `${label} × PPT: 발표/설득 목적. 슬라이드당 하나의 메시지, 시각화 힌트 포함.`,
      PDF: `${label} × PDF: 배포/보관 목적. 고정 레이아웃, 표지 신뢰도 뱃지, 유의사항 페이지.`,
    };
    return summaries[format];
  }
}
