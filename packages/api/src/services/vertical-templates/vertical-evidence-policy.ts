/**
 * VerticalEvidencePolicyService
 *
 * 업종별로 어떤 근거를 더 중요하게 쓸지, 경고를 어떻게 표시할지 정의.
 *
 * 핵심 원칙:
 * - evidence 없는 업종별 해석 금지
 * - confidence / stale / partial 상태를 숨기지 않음
 * - mock 문서를 업종 템플릿 기본값처럼 쓰지 않음
 * - 금융은 stale 데이터 허용 안 함 (가장 엄격)
 * - 엔터는 타이밍 민감 → stale 허용 안 함
 */

import type {
  IndustryType,
  EvidencePolicyConfig,
  VerticalTemplate,
} from "./types";
import { VerticalTemplateRegistryService } from "./vertical-template-registry";

type EvidenceRef = {
  evidenceId: string;
  category: string;
  label: string;
  snippet?: string;
  dataSourceType?: string;
  entityIds?: string[];
};

type QualityMeta = {
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

export type EvidencePolicyResult = {
  /** 업종별 우선순위로 정렬된 evidence */
  sortedEvidence: EvidenceRef[];
  /** 업종별 경고 문구 */
  warnings: string[];
  /** 사용 가능 여부 (INSUFFICIENT면 false) */
  usable: boolean;
  /** mock 데이터 여부 */
  isMockBased: boolean;
  /** 업종별 최소 신뢰도 충족 여부 */
  meetsConfidenceThreshold: boolean;
};

export class VerticalEvidencePolicyService {
  private registry = new VerticalTemplateRegistryService();

  /**
   * 업종별 evidence 정책 적용
   */
  applyPolicy(
    evidenceRefs: EvidenceRef[],
    quality: QualityMeta,
    industry: IndustryType,
  ): EvidencePolicyResult {
    const template = this.registry.getTemplate(industry);
    const policy = template.evidencePolicy;

    const warnings: string[] = [];
    let usable = true;

    // 1. mock 데이터 체크 — 절대 숨기지 않음
    if (quality.isMockOnly) {
      warnings.push(policy.mockWarningTemplate);
      // mock은 사용 불가가 아니라 경고만 (금지 조항: mock을 기본값처럼 쓰지 않음)
    }

    // 2. stale 데이터 체크
    if (quality.freshness === "stale") {
      warnings.push(policy.staleWarningTemplate);
      if (!policy.allowStaleData) {
        // 금융/엔터: stale 데이터 사용 시 강력 경고
        warnings.push(
          `[${template.label}] 이 업종에서는 오래된 데이터 사용을 권장하지 않습니다.`,
        );
      }
    }

    // 3. partial 데이터 체크
    if (quality.isPartial) {
      warnings.push(policy.partialWarningTemplate);
    }

    // 4. 신뢰도 체크
    const meetsThreshold = quality.confidence >= policy.minConfidenceThreshold;
    if (!meetsThreshold) {
      warnings.push(
        `[${template.label}] 신뢰도 ${Math.round(quality.confidence * 100)}%로 ` +
          `이 업종 기준(${Math.round(policy.minConfidenceThreshold * 100)}%) 미달입니다. ` +
          `추가 데이터 확보를 권장합니다.`,
      );
    }

    // 5. evidence 수 체크
    if (evidenceRefs.length < policy.minEvidenceCount) {
      warnings.push(
        `[${template.label}] 근거 자료가 ${evidenceRefs.length}건으로 ` +
          `최소 기준(${policy.minEvidenceCount}건) 미달입니다.`,
      );
    }

    // 6. evidence 없으면 사용 불가
    if (evidenceRefs.length === 0) {
      usable = false;
      warnings.push("근거 자료가 없어 업종별 문서를 생성할 수 없습니다.");
    }

    // 7. 업종별 우선순위로 정렬
    const sorted = this.sortByPriority(evidenceRefs, policy);

    // 8. 최대 수 제한
    const limited = sorted.slice(0, policy.maxEvidenceCount);

    return {
      sortedEvidence: limited,
      warnings,
      usable,
      isMockBased: quality.isMockOnly ?? false,
      meetsConfidenceThreshold: meetsThreshold,
    };
  }

  /**
   * 업종별 evidence 카테고리 우선순위로 정렬
   */
  private sortByPriority(
    refs: EvidenceRef[],
    policy: EvidencePolicyConfig,
  ): EvidenceRef[] {
    const priorityMap = new Map<string, number>();
    policy.priorityCategories.forEach((cat, i) => {
      priorityMap.set(cat, i);
    });

    return [...refs].sort((a, b) => {
      const pa = priorityMap.get(a.category) ?? 999;
      const pb = priorityMap.get(b.category) ?? 999;
      return pa - pb;
    });
  }

  /**
   * 업종별 경고 문구 생성 (문장에 삽입용)
   */
  buildQualityNote(
    quality: QualityMeta,
    industry: IndustryType,
  ): string | undefined {
    const template = this.registry.getTemplate(industry);
    const notes: string[] = [];

    if (quality.isMockOnly) {
      notes.push(template.evidencePolicy.mockWarningTemplate);
    }
    if (quality.freshness === "stale") {
      notes.push(template.evidencePolicy.staleWarningTemplate);
    }
    if (quality.isPartial) {
      notes.push(template.evidencePolicy.partialWarningTemplate);
    }
    if (quality.confidence < template.evidencePolicy.minConfidenceThreshold) {
      notes.push(
        `${template.toneGuideline.lowConfidencePrefix}신뢰도 ${Math.round(quality.confidence * 100)}%`,
      );
    }

    return notes.length > 0 ? notes.join(" / ") : undefined;
  }
}
