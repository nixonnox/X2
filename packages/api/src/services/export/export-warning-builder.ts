/**
 * ExportWarningBuilder
 *
 * confidence / stale / partial / mock 상태를 export 형식에 맞는 경고로 변환.
 *
 * 핵심 원칙:
 * - 화면에만 있고 export에 안 나오는 구조 금지
 * - 형식별 경고 배치가 다름 (Word: 인라인+부록, PPT: 발표자노트+백업, PDF: 하단+워터마크)
 * - 업종별 경고 문구 차별화
 */

import type {
  ExportFormat,
  ExportQualityMeta,
  ExportWarning,
  ExportWarningPlacement,
  ExportWarningSeverity,
  ExportWarningType,
} from "./types";
import type { IndustryType } from "../vertical-templates/types";

export class ExportWarningBuilder {
  /**
   * 품질 메타데이터에서 export 경고 목록 생성
   */
  buildWarnings(
    quality: ExportQualityMeta,
    format: ExportFormat,
    industryType?: IndustryType,
  ): ExportWarning[] {
    const warnings: ExportWarning[] = [];

    // 1. Mock 데이터 경고
    if (quality.isMockOnly) {
      warnings.push(this.buildMockWarning(format, industryType));
    }

    // 2. Stale 데이터 경고
    if (quality.freshness === "stale") {
      warnings.push(this.buildStaleWarning(format, industryType));
    }

    // 3. Partial 소스 경고
    if (quality.isPartial) {
      warnings.push(this.buildPartialWarning(format, industryType));
    }

    // 4. Low confidence 경고
    if (quality.confidence < 0.5) {
      warnings.push(
        this.buildLowConfidenceWarning(
          quality.confidence,
          format,
          industryType,
        ),
      );
    }

    // 5. 기존 warnings 변환
    if (quality.warnings?.length) {
      for (const w of quality.warnings) {
        warnings.push({
          type: "EVIDENCE_LIMITATION",
          message: w,
          severity: "CAUTION",
          relatedRefs: [],
          placement: this.getDefaultPlacement(format),
        });
      }
    }

    return warnings;
  }

  /**
   * 업종별 규제 경고 생성 (vertical template 연동)
   */
  buildRegulatoryWarnings(
    regulatoryNotes: string[],
    industryLabel: string,
    format: ExportFormat,
  ): ExportWarning[] {
    return regulatoryNotes.map((note) => ({
      type: "REGULATORY" as ExportWarningType,
      message: `[${industryLabel} 규제] ${note}`,
      severity: "WARNING" as ExportWarningSeverity,
      relatedRefs: [],
      placement: this.getRegulatoryPlacement(format),
    }));
  }

  /**
   * 업종별 evidence 정책 경고 변환
   */
  buildVerticalPolicyWarnings(
    policyWarnings: string[],
    format: ExportFormat,
  ): ExportWarning[] {
    return policyWarnings.map((msg) => ({
      type: "VERTICAL_POLICY" as ExportWarningType,
      message: msg,
      severity: this.inferSeverity(msg),
      relatedRefs: [],
      placement: this.getDefaultPlacement(format),
    }));
  }

  // ─── Private ───────────────────────────────────────────────────────

  private buildMockWarning(
    format: ExportFormat,
    industry?: IndustryType,
  ): ExportWarning {
    const isFinance = industry === "FINANCE";
    return {
      type: "MOCK_DATA",
      message: isFinance
        ? "[경고] 샘플 데이터 기반 분석입니다. 금융 문서에서 샘플 데이터를 근거로 사용하면 안 됩니다."
        : "[검증 필요] 이 문서는 샘플 데이터 기반으로 생성되었습니다. 실제 데이터로 검증이 필요합니다.",
      severity: isFinance ? "CRITICAL" : "WARNING",
      relatedRefs: [],
      placement: this.getMockPlacement(format),
    };
  }

  private buildStaleWarning(
    format: ExportFormat,
    industry?: IndustryType,
  ): ExportWarning {
    const isTimeSensitive =
      industry === "FINANCE" || industry === "ENTERTAINMENT";
    return {
      type: "STALE_DATA",
      message: isTimeSensitive
        ? "[경고] 이 데이터는 오래되어 현재 유효하지 않을 수 있습니다. 최신 데이터로 재분석 후 사용하세요."
        : "[주의] 데이터 갱신이 필요할 수 있습니다. 최신 데이터 확인을 권장합니다.",
      severity: isTimeSensitive ? "CRITICAL" : "CAUTION",
      relatedRefs: [],
      placement: this.getDefaultPlacement(format),
    };
  }

  private buildPartialWarning(
    format: ExportFormat,
    _industry?: IndustryType,
  ): ExportWarning {
    return {
      type: "PARTIAL_SOURCE",
      message:
        "[참고] 일부 데이터 소스만 수집되어 분석 결과가 불완전할 수 있습니다.",
      severity: "CAUTION",
      relatedRefs: [],
      placement: this.getDefaultPlacement(format),
    };
  }

  private buildLowConfidenceWarning(
    confidence: number,
    format: ExportFormat,
    industry?: IndustryType,
  ): ExportWarning {
    const pct = Math.round(confidence * 100);
    const isFinance = industry === "FINANCE";
    return {
      type: "LOW_CONFIDENCE",
      message: isFinance
        ? `[주의: 데이터 불충분] 신뢰도 ${pct}%로, 금융 문서 기준에 미달합니다.`
        : `[참고] 데이터 신뢰도 ${pct}%입니다. 추가 데이터 확보를 권장합니다.`,
      severity: isFinance ? "WARNING" : "CAUTION",
      relatedRefs: [],
      placement: this.getLowConfidencePlacement(format),
    };
  }

  private getMockPlacement(format: ExportFormat): ExportWarningPlacement {
    switch (format) {
      case "WORD":
        return "HEADER";
      case "PPT":
        return "FOOTER";
      case "PDF":
        return "WATERMARK";
    }
  }

  private getDefaultPlacement(format: ExportFormat): ExportWarningPlacement {
    switch (format) {
      case "WORD":
        return "INLINE";
      case "PPT":
        return "FOOTER";
      case "PDF":
        return "FOOTER";
    }
  }

  private getRegulatoryPlacement(format: ExportFormat): ExportWarningPlacement {
    switch (format) {
      case "WORD":
        return "APPENDIX";
      case "PPT":
        return "FOOTER";
      case "PDF":
        return "FOOTER";
    }
  }

  private getLowConfidencePlacement(
    format: ExportFormat,
  ): ExportWarningPlacement {
    switch (format) {
      case "WORD":
        return "HEADER";
      case "PPT":
        return "FOOTER";
      case "PDF":
        return "HEADER";
    }
  }

  private inferSeverity(message: string): ExportWarningSeverity {
    if (message.includes("[경고]") || message.includes("안 됩니다"))
      return "CRITICAL";
    if (message.includes("[주의]") || message.includes("미달"))
      return "WARNING";
    if (message.includes("[참고]")) return "INFO";
    return "CAUTION";
  }
}
