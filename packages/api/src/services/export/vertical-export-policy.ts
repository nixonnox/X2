/**
 * VerticalExportPolicyService
 *
 * 업종별 템플릿과 export 형식의 결합 규칙.
 * "Beauty x Word / F&B x PPT / Finance x PDF" 각각 다른 정책 적용.
 *
 * 핵심:
 * - 업종별 블록 강조도를 export 형식에 맞게 변환
 * - 업종별 경고를 export 형식에 맞게 배치
 * - 업종별 톤을 export 형식에 맞게 조정
 */

import type {
  ExportFormat,
  ExportBlock,
  ExportBundle,
  ExportWarning,
} from "./types";
import type {
  IndustryType,
  VerticalTemplate,
} from "../vertical-templates/types";
import { VerticalTemplateRegistryService } from "../vertical-templates/vertical-template-registry";
import { ExportWarningBuilder } from "./export-warning-builder";

// ─── 업종 × 형식 결합 정책 ─────────────────────────────────────────

type VerticalExportPolicy = {
  /** export에서 EMPHASIZED로 올릴 블록 */
  emphasizedBlocks: string[];
  /** export에서 숨길 블록 */
  hiddenBlocks: string[];
  /** 부록으로 이동할 블록 */
  appendixBlocks: string[];
  /** 추가 경고 문구 */
  additionalWarnings: string[];
  /** 톤 조정 */
  toneOverride?: string;
};

const VERTICAL_EXPORT_POLICIES: Record<
  IndustryType,
  Record<ExportFormat, VerticalExportPolicy>
> = {
  BEAUTY: {
    WORD: {
      emphasizedBlocks: ["FAQ", "COMPARISON", "PERSONA"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: [],
      toneOverride: "REPORT",
    },
    PPT: {
      emphasizedBlocks: ["COMPARISON", "PERSONA", "CLUSTER"],
      hiddenBlocks: ["EVIDENCE"],
      appendixBlocks: [],
      additionalWarnings: [],
      toneOverride: undefined,
    },
    PDF: {
      emphasizedBlocks: ["FAQ", "COMPARISON", "KEY_FINDING"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: [
        "화장품 광고 시 의약품 표현 사용 금지 (화장품법 준수)",
      ],
    },
  },
  FNB: {
    WORD: {
      emphasizedBlocks: ["CLUSTER", "ROAD_STAGE", "COMPARISON"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: [],
      toneOverride: "REPORT",
    },
    PPT: {
      emphasizedBlocks: ["CLUSTER", "ROAD_STAGE", "ACTION"],
      hiddenBlocks: ["EVIDENCE"],
      appendixBlocks: [],
      additionalWarnings: [],
    },
    PDF: {
      emphasizedBlocks: ["KEY_FINDING", "COMPARISON", "CLUSTER"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: ["가격 정보는 변동 가능 — 최신 확인 필요"],
    },
  },
  FINANCE: {
    WORD: {
      emphasizedBlocks: ["COMPARISON", "FAQ", "RISK_NOTE", "EVIDENCE"],
      hiddenBlocks: [],
      appendixBlocks: [],
      additionalWarnings: [
        "금융 상품 정보 제공 시 투자 권유로 오해될 수 있는 표현 금지",
        "금리/조건은 변동 가능성을 반드시 명시",
      ],
      toneOverride: "FORMAL",
    },
    PPT: {
      emphasizedBlocks: ["COMPARISON", "KEY_FINDING", "RISK_NOTE"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: [
        "금융 상품 비교 자료는 참고용이며 투자 권유 목적이 아닙니다",
      ],
      toneOverride: "FORMAL",
    },
    PDF: {
      emphasizedBlocks: ["COMPARISON", "FAQ", "RISK_NOTE", "EVIDENCE"],
      hiddenBlocks: [],
      appendixBlocks: [],
      additionalWarnings: [
        "본 문서는 금융 상품 정보 제공 목적이며 투자 권유에 해당하지 않습니다",
        "금리/조건은 작성 시점 기준이며 변동 가능합니다",
        "원금 손실 가능 상품은 반드시 별도 위험 고지를 확인하시기 바랍니다",
      ],
    },
  },
  ENTERTAINMENT: {
    WORD: {
      emphasizedBlocks: ["CLUSTER", "PATH", "ACTION"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: [],
      toneOverride: "REPORT",
    },
    PPT: {
      emphasizedBlocks: ["PATH", "CLUSTER", "ACTION"],
      hiddenBlocks: ["EVIDENCE", "FAQ"],
      appendixBlocks: [],
      additionalWarnings: [],
    },
    PDF: {
      emphasizedBlocks: ["KEY_FINDING", "CLUSTER", "PATH"],
      hiddenBlocks: [],
      appendixBlocks: ["EVIDENCE"],
      additionalWarnings: ["미확인 일정/루머 기반 정보는 별도 표시됨"],
    },
  },
};

export class VerticalExportPolicyService {
  private registry = new VerticalTemplateRegistryService();
  private warningBuilder = new ExportWarningBuilder();

  /**
   * 업종별 정책을 export bundle에 적용
   */
  applyPolicy(
    bundle: ExportBundle,
    format: ExportFormat,
    industryType: IndustryType,
  ): ExportBundle {
    const policy = VERTICAL_EXPORT_POLICIES[industryType]?.[format];
    if (!policy) return bundle;

    const template = this.registry.getTemplate(industryType);

    // 1. 블록 필터링 (hidden 제거)
    const filteredBody = bundle.bodyBlocks.filter(
      (b) => !policy.hiddenBlocks.includes(b.sourceBlockType),
    );

    // 2. 부록 이동
    const toAppendix: ExportBlock[] = [];
    const remaining = filteredBody.filter((b) => {
      if (policy.appendixBlocks.includes(b.sourceBlockType)) {
        toAppendix.push({ ...b, role: "APPENDIX" });
        return false;
      }
      return true;
    });

    // 3. 업종별 추가 경고
    const additionalWarnings: ExportWarning[] = policy.additionalWarnings.map(
      (msg) => ({
        type: "VERTICAL_POLICY" as const,
        message: msg,
        severity:
          industryType === "FINANCE"
            ? ("WARNING" as const)
            : ("CAUTION" as const),
        relatedRefs: [],
        placement:
          format === "PDF" ? ("FOOTER" as const) : ("APPENDIX" as const),
      }),
    );

    // 4. 규제 경고 추가
    const regulatoryWarnings = this.warningBuilder.buildRegulatoryWarnings(
      template.riskPolicy.regulatoryNotes,
      template.label,
      format,
    );

    return {
      ...bundle,
      bodyBlocks: remaining,
      appendixBlocks: [...bundle.appendixBlocks, ...toAppendix],
      globalWarnings: [
        ...bundle.globalWarnings,
        ...additionalWarnings,
        ...regulatoryWarnings,
      ],
    };
  }

  /**
   * 업종 × 형식 지원 여부 확인
   */
  isSupported(industryType: IndustryType, format: ExportFormat): boolean {
    return !!VERTICAL_EXPORT_POLICIES[industryType]?.[format];
  }

  /**
   * 업종별 톤 오버라이드 조회
   */
  getToneOverride(
    industryType: IndustryType,
    format: ExportFormat,
  ): string | undefined {
    return VERTICAL_EXPORT_POLICIES[industryType]?.[format]?.toneOverride;
  }

  /**
   * 업종별 강조 블록 조회
   */
  getEmphasizedBlocks(
    industryType: IndustryType,
    format: ExportFormat,
  ): string[] {
    return (
      VERTICAL_EXPORT_POLICIES[industryType]?.[format]?.emphasizedBlocks ?? []
    );
  }
}
