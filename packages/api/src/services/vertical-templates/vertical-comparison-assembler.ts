/**
 * VerticalComparisonAssembler
 *
 * 동일 입력에 대해 4개 업종 결과를 조립하고
 * 항목별(summary, evidence, action, warning, tone, block) 비교 구조를 생성.
 *
 * 이 서비스가 만드는 것:
 * - 4개 업종의 VerticalAssemblyResult를 입력으로 받아
 * - 항목별 비교 행(ComparisonRow)으로 변환
 * - 차이가 큰 항목을 자동 감지
 */

import type { IndustryType, VerticalTemplate } from "./types";
import type { VerticalAssemblyResult } from "./vertical-document-assembler";
import type { EvidencePolicyResult } from "./vertical-evidence-policy";
import type { VerticalInsightMapping, VerticalActionMapping } from "./types";

// ─── Output Types ─────────────────────────────────────────────────

export type IndustryResult = {
  industry: IndustryType;
  label: string;
  assemblyResult: VerticalAssemblyResult;
};

/** 비교 가능한 전체 프리뷰 데이터 */
export type VerticalComparisonData = {
  /** 입력 요약 */
  inputSummary: ComparisonInputSummary;
  /** 4개 업종별 요약 비교 */
  summaryComparison: SummaryComparisonRow[];
  /** 4개 업종별 블록 구성 비교 */
  blockComparison: BlockComparisonRow[];
  /** 4개 업종별 evidence 비교 */
  evidenceComparison: EvidenceComparisonRow[];
  /** 4개 업종별 action 비교 */
  actionComparison: ActionComparisonRow[];
  /** 4개 업종별 warning 비교 */
  warningComparison: WarningComparisonRow[];
  /** 4개 업종별 톤 비교 */
  toneComparison: ToneComparisonRow[];
  /** 4개 업종별 confidence/stale/partial 비교 */
  qualityComparison: QualityComparisonRow[];
  /** 자동 감지된 주요 차이점 */
  highlightedDifferences: HighlightedDifference[];
  /** 생성 시각 */
  generatedAt: string;
};

type ComparisonInputSummary = {
  seedKeyword: string;
  outputType: string;
  audience: string;
  confidence: number;
  freshness?: string;
  isPartial?: boolean;
  isMockOnly?: boolean;
  evidenceCount: number;
  insightCount: number;
  actionCount: number;
};

/** Summary 비교 행 */
export type SummaryComparisonRow = {
  dimension: string;
  values: Record<IndustryType, string>;
  hasDifference: boolean;
};

/** 블록 구성 비교 행 */
export type BlockComparisonRow = {
  blockType: string;
  values: Record<
    IndustryType,
    {
      emphasis: string;
      title: string;
      order: number;
      sentenceCount: number;
      hasContent: boolean;
    }
  >;
  hasDifference: boolean;
  differenceNote?: string;
};

/** Evidence 비교 행 */
export type EvidenceComparisonRow = {
  dimension: string;
  values: Record<IndustryType, string>;
  hasDifference: boolean;
};

/** Action 비교 행 */
export type ActionComparisonRow = {
  originalAction: string;
  values: Record<
    IndustryType,
    {
      reframedAction: string;
      priority: string;
      owner: string;
      framing: string;
    }
  >;
  hasDifference: boolean;
};

/** Warning 비교 행 */
export type WarningComparisonRow = {
  category: string;
  values: Record<IndustryType, string[]>;
  hasDifference: boolean;
};

/** 톤 비교 행 */
export type ToneComparisonRow = {
  dimension: string;
  values: Record<IndustryType, string>;
  hasDifference: boolean;
};

/** 품질 비교 행 */
export type QualityComparisonRow = {
  dimension: string;
  values: Record<IndustryType, string>;
  hasDifference: boolean;
  severity?: "INFO" | "WARNING" | "CRITICAL";
};

/** 자동 감지된 차이점 */
export type HighlightedDifference = {
  category:
    | "SUMMARY"
    | "BLOCK"
    | "EVIDENCE"
    | "ACTION"
    | "WARNING"
    | "TONE"
    | "QUALITY";
  description: string;
  industries: IndustryType[];
  severity: "HIGH" | "MEDIUM" | "LOW";
};

// ─── 업종 라벨 ────────────────────────────────────────────────────

const LABELS: Record<IndustryType, string> = {
  BEAUTY: "뷰티",
  FNB: "F&B",
  FINANCE: "금융",
  ENTERTAINMENT: "엔터",
};

const ALL_INDUSTRIES: IndustryType[] = [
  "BEAUTY",
  "FNB",
  "FINANCE",
  "ENTERTAINMENT",
];

// ─── Service ──────────────────────────────────────────────────────

export class VerticalComparisonAssembler {
  /**
   * 4개 업종 결과를 비교 구조로 조립
   */
  assemble(
    results: IndustryResult[],
    inputSummary: ComparisonInputSummary,
  ): VerticalComparisonData {
    const byIndustry = new Map(results.map((r) => [r.industry, r]));

    return {
      inputSummary,
      summaryComparison: this.buildSummaryComparison(byIndustry),
      blockComparison: this.buildBlockComparison(byIndustry),
      evidenceComparison: this.buildEvidenceComparison(byIndustry),
      actionComparison: this.buildActionComparison(byIndustry),
      warningComparison: this.buildWarningComparison(byIndustry),
      toneComparison: this.buildToneComparison(byIndustry),
      qualityComparison: this.buildQualityComparison(byIndustry),
      highlightedDifferences: this.detectDifferences(byIndustry),
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── Summary ────────────────────────────────────────────────────

  private buildSummaryComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): SummaryComparisonRow[] {
    const rows: SummaryComparisonRow[] = [];

    // Quick Summary (첫 번째 섹션의 oneLiner)
    rows.push(
      this.buildRow("Quick Summary", byIndustry, (r) => {
        const first = r.assemblyResult.sections[0];
        return first?.oneLiner ?? "(없음)";
      }),
    );

    // 섹션 수
    rows.push(
      this.buildRow(
        "섹션 수",
        byIndustry,
        (r) => `${r.assemblyResult.sections.length}개`,
      ),
    );

    // 적용된 톤
    rows.push(
      this.buildRow(
        "적용 톤",
        byIndustry,
        (r) => r.assemblyResult.appliedTemplate.toneGuideline.defaultTone,
      ),
    );

    // 추가 경고 수
    rows.push(
      this.buildRow(
        "추가 경고",
        byIndustry,
        (r) => `${r.assemblyResult.additionalWarnings.length}건`,
      ),
    );

    // 인사이트 매핑 수
    rows.push(
      this.buildRow(
        "인사이트 매핑",
        byIndustry,
        (r) => `${r.assemblyResult.insightMappings.length}건`,
      ),
    );

    return rows;
  }

  // ─── Block 구성 ─────────────────────────────────────────────────

  private buildBlockComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): BlockComparisonRow[] {
    // 모든 업종에서 사용되는 블록 타입 수집
    const allBlockTypes = new Set<string>();
    for (const r of byIndustry.values()) {
      for (const config of r.assemblyResult.appliedTemplate.blockConfigs) {
        allBlockTypes.add(config.blockType);
      }
    }

    return [...allBlockTypes].map((blockType) => {
      const values = {} as Record<
        IndustryType,
        BlockComparisonRow["values"][IndustryType]
      >;

      for (const industry of ALL_INDUSTRIES) {
        const r = byIndustry.get(industry);
        if (!r) {
          values[industry] = {
            emphasis: "HIDDEN",
            title: blockType,
            order: 99,
            sentenceCount: 0,
            hasContent: false,
          };
          continue;
        }

        const config = r.assemblyResult.appliedTemplate.blockConfigs.find(
          (c) => c.blockType === blockType,
        );
        const section = r.assemblyResult.sections.find(
          (s) => s.blockType === blockType,
        );

        values[industry] = {
          emphasis: config?.emphasis ?? "HIDDEN",
          title: config?.titleOverride ?? blockType,
          order: section?.order ?? 99,
          sentenceCount: section?.sentences?.length ?? 0,
          hasContent: !!section,
        };
      }

      const emphases = new Set(Object.values(values).map((v) => v.emphasis));
      const hasDiff = emphases.size > 1;

      let note: string | undefined;
      if (hasDiff) {
        const hidden = ALL_INDUSTRIES.filter(
          (i) => values[i].emphasis === "HIDDEN",
        );
        const required = ALL_INDUSTRIES.filter(
          (i) => values[i].emphasis === "REQUIRED",
        );
        if (hidden.length > 0) {
          note = `${hidden.map((i) => LABELS[i]).join("/")}에서 숨김`;
        }
        if (required.length > 0 && required.length < 4) {
          note =
            (note ? note + ", " : "") +
            `${required.map((i) => LABELS[i]).join("/")}에서 필수`;
        }
      }

      return {
        blockType,
        values,
        hasDifference: hasDiff,
        differenceNote: note,
      };
    });
  }

  // ─── Evidence ───────────────────────────────────────────────────

  private buildEvidenceComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): EvidenceComparisonRow[] {
    const rows: EvidenceComparisonRow[] = [];

    // 사용 가능 evidence 수
    rows.push(
      this.buildRow(
        "사용 가능 evidence",
        byIndustry,
        (r) => `${r.assemblyResult.evidencePolicy.sortedEvidence.length}건`,
      ),
    );

    // 최소 신뢰도 충족
    rows.push(
      this.buildRow("신뢰도 기준 충족", byIndustry, (r) =>
        r.assemblyResult.evidencePolicy.meetsConfidenceThreshold
          ? "✅ 충족"
          : "⚠️ 미달",
      ),
    );

    // mock 여부
    rows.push(
      this.buildRow("Mock 기반", byIndustry, (r) =>
        r.assemblyResult.evidencePolicy.isMockBased ? "⚠️ Mock" : "실제 데이터",
      ),
    );

    // 업종별 evidence 경고 수
    rows.push(
      this.buildRow(
        "Evidence 경고",
        byIndustry,
        (r) => `${r.assemblyResult.evidencePolicy.warnings.length}건`,
      ),
    );

    // 상위 3개 evidence 카테고리
    rows.push(
      this.buildRow("우선 Evidence (상위 3)", byIndustry, (r) => {
        const sorted = r.assemblyResult.evidencePolicy.sortedEvidence;
        return (
          sorted
            .slice(0, 3)
            .map((e) => e.category)
            .join(", ") || "(없음)"
        );
      }),
    );

    // 최소 신뢰도 기준
    rows.push(
      this.buildRow(
        "최소 신뢰도 기준",
        byIndustry,
        (r) =>
          `${(r.assemblyResult.appliedTemplate.evidencePolicy.minConfidenceThreshold * 100).toFixed(0)}%`,
      ),
    );

    // stale 허용
    rows.push(
      this.buildRow("Stale 데이터 허용", byIndustry, (r) =>
        r.assemblyResult.appliedTemplate.evidencePolicy.allowStaleData
          ? "허용"
          : "❌ 불가",
      ),
    );

    return rows;
  }

  // ─── Action ─────────────────────────────────────────────────────

  private buildActionComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): ActionComparisonRow[] {
    // 최대 5개 액션까지 비교
    const maxActions = Math.max(
      ...Array.from(byIndustry.values()).map(
        (r) => r.assemblyResult.actionMappings.length,
      ),
    );
    const count = Math.min(maxActions, 5);

    const rows: ActionComparisonRow[] = [];

    for (let i = 0; i < count; i++) {
      const values = {} as Record<
        IndustryType,
        ActionComparisonRow["values"][IndustryType]
      >;
      let originalAction = "";

      for (const industry of ALL_INDUSTRIES) {
        const r = byIndustry.get(industry);
        const mapping = r?.assemblyResult.actionMappings[i];
        if (mapping) {
          if (!originalAction) originalAction = mapping.originalAction.action;
          values[industry] = {
            reframedAction: mapping.verticalAction,
            priority: mapping.adjustedPriority,
            owner: mapping.suggestedOwner,
            framing: mapping.framing,
          };
        } else {
          values[industry] = {
            reframedAction: "(없음)",
            priority: "-",
            owner: "-",
            framing: "-",
          };
        }
      }

      const actions = new Set(
        Object.values(values).map((v) => v.reframedAction),
      );
      const priorities = new Set(Object.values(values).map((v) => v.priority));
      const hasDiff = actions.size > 1 || priorities.size > 1;

      rows.push({ originalAction, values, hasDifference: hasDiff });
    }

    return rows;
  }

  // ─── Warning ────────────────────────────────────────────────────

  private buildWarningComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): WarningComparisonRow[] {
    const rows: WarningComparisonRow[] = [];

    // 규제 경고
    const regValues = {} as Record<IndustryType, string[]>;
    for (const industry of ALL_INDUSTRIES) {
      const r = byIndustry.get(industry);
      regValues[industry] =
        r?.assemblyResult.appliedTemplate.riskPolicy.regulatoryNotes ?? [];
    }
    const regCounts = new Set(Object.values(regValues).map((v) => v.length));
    rows.push({
      category: "규제 경고",
      values: regValues,
      hasDifference: regCounts.size > 1,
    });

    // 추가 경고
    const addValues = {} as Record<IndustryType, string[]>;
    for (const industry of ALL_INDUSTRIES) {
      const r = byIndustry.get(industry);
      addValues[industry] = r?.assemblyResult.additionalWarnings ?? [];
    }
    const addCounts = new Set(Object.values(addValues).map((v) => v.length));
    rows.push({
      category: "추가 경고",
      values: addValues,
      hasDifference: addCounts.size > 1,
    });

    // Evidence 정책 경고
    const evValues = {} as Record<IndustryType, string[]>;
    for (const industry of ALL_INDUSTRIES) {
      const r = byIndustry.get(industry);
      evValues[industry] = r?.assemblyResult.evidencePolicy.warnings ?? [];
    }
    const evCounts = new Set(Object.values(evValues).map((v) => v.length));
    rows.push({
      category: "Evidence 정책 경고",
      values: evValues,
      hasDifference: evCounts.size > 1,
    });

    return rows;
  }

  // ─── Tone ───────────────────────────────────────────────────────

  private buildToneComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): ToneComparisonRow[] {
    const rows: ToneComparisonRow[] = [];

    rows.push(
      this.buildRow(
        "기본 톤",
        byIndustry,
        (r) => r.assemblyResult.appliedTemplate.toneGuideline.defaultTone,
      ),
    );

    rows.push(
      this.buildRow(
        "불확실성 처리",
        byIndustry,
        (r) =>
          r.assemblyResult.appliedTemplate.toneGuideline.uncertaintyHandling,
      ),
    );

    rows.push(
      this.buildRow(
        "액션 톤",
        byIndustry,
        (r) => r.assemblyResult.appliedTemplate.actionPolicy.actionToneStyle,
      ),
    );

    rows.push(
      this.buildRow(
        "리스크 강도",
        byIndustry,
        (r) => r.assemblyResult.appliedTemplate.riskPolicy.riskToneLevel,
      ),
    );

    rows.push(
      this.buildRow(
        "금지 표현 수",
        byIndustry,
        (r) =>
          `${r.assemblyResult.appliedTemplate.toneGuideline.forbiddenPatterns.length}개`,
      ),
    );

    rows.push(
      this.buildRow(
        "Low Confidence 접두어",
        byIndustry,
        (r) =>
          r.assemblyResult.appliedTemplate.toneGuideline.lowConfidencePrefix,
      ),
    );

    return rows;
  }

  // ─── Quality ────────────────────────────────────────────────────

  private buildQualityComparison(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): QualityComparisonRow[] {
    const rows: QualityComparisonRow[] = [];

    rows.push({
      ...this.buildRow("신뢰도 충족", byIndustry, (r) =>
        r.assemblyResult.evidencePolicy.meetsConfidenceThreshold
          ? "충족"
          : "미달",
      ),
      severity: undefined,
    });

    rows.push({
      ...this.buildRow("Stale 데이터 정책", byIndustry, (r) =>
        r.assemblyResult.appliedTemplate.evidencePolicy.allowStaleData
          ? "허용 (경고 표시)"
          : "불가 (강력 경고)",
      ),
      severity: undefined,
    });

    rows.push({
      ...this.buildRow("Mock 데이터 처리", byIndustry, (r) => {
        if (!r.assemblyResult.evidencePolicy.isMockBased) return "해당 없음";
        return r.assemblyResult.appliedTemplate.industryType === "FINANCE"
          ? "CRITICAL 경고 + 워터마크"
          : "경고 표시";
      }),
      severity: undefined,
    });

    return rows;
  }

  // ─── Difference Detection ───────────────────────────────────────

  private detectDifferences(
    byIndustry: Map<IndustryType, IndustryResult>,
  ): HighlightedDifference[] {
    const diffs: HighlightedDifference[] = [];

    // 1. 톤 차이 (FORMAL vs REPORT)
    const tones = new Map<string, IndustryType[]>();
    for (const [ind, r] of byIndustry) {
      const tone = r.assemblyResult.appliedTemplate.toneGuideline.defaultTone;
      if (!tones.has(tone)) tones.set(tone, []);
      tones.get(tone)!.push(ind);
    }
    if (tones.size > 1) {
      const parts = [...tones.entries()].map(
        ([t, inds]) => `${inds.map((i) => LABELS[i]).join("/")}=${t}`,
      );
      diffs.push({
        category: "TONE",
        description: `기본 톤이 다름: ${parts.join(", ")}`,
        industries: ALL_INDUSTRIES,
        severity: "HIGH",
      });
    }

    // 2. Evidence 신뢰도 기준 차이
    const thresholds = new Map<number, IndustryType[]>();
    for (const [ind, r] of byIndustry) {
      const t =
        r.assemblyResult.appliedTemplate.evidencePolicy.minConfidenceThreshold;
      if (!thresholds.has(t)) thresholds.set(t, []);
      thresholds.get(t)!.push(ind);
    }
    if (thresholds.size > 1) {
      const parts = [...thresholds.entries()].map(
        ([t, inds]) =>
          `${inds.map((i) => LABELS[i]).join("/")}=${(t * 100).toFixed(0)}%`,
      );
      diffs.push({
        category: "QUALITY",
        description: `신뢰도 기준 차이: ${parts.join(", ")}`,
        industries: ALL_INDUSTRIES,
        severity: "HIGH",
      });
    }

    // 3. Stale 허용 차이
    const staleAllowed = ALL_INDUSTRIES.filter(
      (i) =>
        byIndustry.get(i)?.assemblyResult.appliedTemplate.evidencePolicy
          .allowStaleData,
    );
    const staleBlocked = ALL_INDUSTRIES.filter(
      (i) =>
        !byIndustry.get(i)?.assemblyResult.appliedTemplate.evidencePolicy
          .allowStaleData,
    );
    if (staleAllowed.length > 0 && staleBlocked.length > 0) {
      diffs.push({
        category: "QUALITY",
        description: `Stale 데이터: ${staleAllowed.map((i) => LABELS[i]).join("/")} 허용, ${staleBlocked.map((i) => LABELS[i]).join("/")} 불가`,
        industries: ALL_INDUSTRIES,
        severity: "MEDIUM",
      });
    }

    // 4. HIDDEN 블록 차이
    for (const r of byIndustry.values()) {
      const hidden = r.assemblyResult.appliedTemplate.blockConfigs
        .filter((c) => c.emphasis === "HIDDEN")
        .map((c) => c.blockType);
      if (hidden.length > 0) {
        diffs.push({
          category: "BLOCK",
          description: `${LABELS[r.industry]}에서 ${hidden.join(", ")} 블록 숨김`,
          industries: [r.industry],
          severity: "MEDIUM",
        });
      }
    }

    // 5. 규제 경고 수 차이
    const regCounts = new Map<number, IndustryType[]>();
    for (const [ind, r] of byIndustry) {
      const cnt =
        r.assemblyResult.appliedTemplate.riskPolicy.regulatoryNotes.length;
      if (!regCounts.has(cnt)) regCounts.set(cnt, []);
      regCounts.get(cnt)!.push(ind);
    }
    if (regCounts.size > 1) {
      const max = Math.max(...regCounts.keys());
      const maxInds = regCounts.get(max) ?? [];
      diffs.push({
        category: "WARNING",
        description: `규제 경고 수 차이: ${maxInds.map((i) => LABELS[i]).join("/")}이 ${max}건으로 가장 많음`,
        industries: maxInds,
        severity: "MEDIUM",
      });
    }

    // 6. Action 톤 차이
    const actionTones = new Map<string, IndustryType[]>();
    for (const [ind, r] of byIndustry) {
      const style =
        r.assemblyResult.appliedTemplate.actionPolicy.actionToneStyle;
      if (!actionTones.has(style)) actionTones.set(style, []);
      actionTones.get(style)!.push(ind);
    }
    if (actionTones.size > 1) {
      const parts = [...actionTones.entries()].map(
        ([s, inds]) => `${inds.map((i) => LABELS[i]).join("/")}=${s}`,
      );
      diffs.push({
        category: "ACTION",
        description: `액션 톤 차이: ${parts.join(", ")}`,
        industries: ALL_INDUSTRIES,
        severity: "MEDIUM",
      });
    }

    return diffs.sort((a, b) => {
      const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  // ─── Utility ────────────────────────────────────────────────────

  private buildRow(
    dimension: string,
    byIndustry: Map<IndustryType, IndustryResult>,
    extractor: (r: IndustryResult) => string,
  ): SummaryComparisonRow {
    const values = {} as Record<IndustryType, string>;
    for (const industry of ALL_INDUSTRIES) {
      const r = byIndustry.get(industry);
      values[industry] = r ? extractor(r) : "(없음)";
    }
    const unique = new Set(Object.values(values));
    return { dimension, values, hasDifference: unique.size > 1 };
  }
}
