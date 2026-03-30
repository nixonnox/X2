/**
 * VerticalDocumentAssembler
 *
 * 업종별로 document block을 재조합하는 핵심 어셈블러.
 * 공통 문서 엔진(workdocs/, pt/, documents/) 위에 얹는 vertical layer.
 *
 * 하는 일:
 * 1. 업종별 블록 구성 적용 (REQUIRED/EMPHASIZED/OPTIONAL/HIDDEN)
 * 2. 업종별 제목/oneLiner 오버라이드
 * 3. 업종별 문장 톤 적용
 * 4. 업종별 evidence 우선순위 정렬
 * 5. 업종별 경고 문구 삽입
 * 6. 업종별 리스크 노트 추가
 *
 * PT / 보고서 / 실무 문서 / GEO 문서에 재사용 가능.
 */

import type {
  IndustryType,
  VerticalTemplate,
  VerticalBlockConfig,
  BlockEmphasis,
  VerticalSentenceModification,
} from "./types";
import { VerticalTemplateRegistryService } from "./vertical-template-registry";
import { VerticalInsightMapper } from "./vertical-insight-mapper";
import { VerticalActionMapper } from "./vertical-action-mapper";
import { VerticalEvidencePolicyService } from "./vertical-evidence-policy";

// ─── Input / Output Types ───────────────────────────────────────────

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

type InsightItem = {
  id?: string;
  type: string;
  title: string;
  description: string;
  confidence?: number;
  evidenceRefs?: { category: string }[];
};

type ActionItem = {
  id?: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  owner?: string;
  rationale?: string;
};

/** 공통 문서 블록 (workdocs/WorkDocSection과 호환) */
type DocumentSection = {
  id: string;
  blockType: string;
  title: string;
  oneLiner: string;
  sentences: {
    sentence: string;
    tone: string;
    evidenceRef?: EvidenceRef;
    qualityNote?: string;
  }[];
  evidenceRefs: EvidenceRef[];
  quality: QualityMeta;
  order: number;
  [key: string]: unknown;
};

export type VerticalAssemblyInput = {
  industry: IndustryType;
  sections: DocumentSection[];
  evidenceRefs: EvidenceRef[];
  quality: QualityMeta;
  insights: InsightItem[];
  actions: ActionItem[];
};

export type VerticalAssemblyResult = {
  /** 업종별로 재조립된 섹션 */
  sections: DocumentSection[];
  /** 업종별 인사이트 매핑 */
  insightMappings: ReturnType<VerticalInsightMapper["mapInsights"]>;
  /** 업종별 액션 매핑 */
  actionMappings: ReturnType<VerticalActionMapper["mapActions"]>;
  /** 업종별 evidence 정책 결과 */
  evidencePolicy: ReturnType<VerticalEvidencePolicyService["applyPolicy"]>;
  /** 업종별 추가 경고 */
  additionalWarnings: string[];
  /** 적용된 템플릿 */
  appliedTemplate: VerticalTemplate;
};

export class VerticalDocumentAssembler {
  private registry = new VerticalTemplateRegistryService();
  private insightMapper = new VerticalInsightMapper();
  private actionMapper = new VerticalActionMapper();
  private evidencePolicy = new VerticalEvidencePolicyService();

  /**
   * 공통 문서를 업종별로 재조립
   */
  assemble(input: VerticalAssemblyInput): VerticalAssemblyResult {
    const template = this.registry.getTemplate(input.industry);

    // 1. Evidence 정책 적용
    const policyResult = this.evidencePolicy.applyPolicy(
      input.evidenceRefs,
      input.quality,
      input.industry,
    );

    // 2. 인사이트 매핑
    const insightMappings = this.insightMapper.mapInsights(
      input.insights,
      input.industry,
    );

    // 3. 액션 매핑
    const actionMappings = this.actionMapper.mapActions(
      input.actions,
      input.industry,
    );

    // 4. 섹션 필터링 + 정렬 (업종별 블록 구성)
    let sections = this.filterAndOrderSections(input.sections, template);

    // 5. 제목/oneLiner 오버라이드
    sections = this.applyTitleOverrides(sections, template);

    // 6. 문장 톤 검증 + 금지 패턴 필터링
    sections = this.applySentencePolicy(sections, template);

    // 7. 업종별 리스크 노트 추가
    const additionalWarnings = this.buildAdditionalWarnings(
      template,
      input.quality,
    );

    // 8. 리스크 정책 기반 경고 삽입
    sections = this.injectRiskNotes(sections, template);

    // 9. 순서 재정렬
    sections = sections.map((s, i) => ({ ...s, order: i + 1 }));

    return {
      sections,
      insightMappings,
      actionMappings,
      evidencePolicy: policyResult,
      additionalWarnings,
      appliedTemplate: template,
    };
  }

  /**
   * 업종별 블록 구성에 따라 섹션 필터링 + 정렬
   */
  private filterAndOrderSections(
    sections: DocumentSection[],
    template: VerticalTemplate,
  ): DocumentSection[] {
    const blockConfigMap = new Map<string, VerticalBlockConfig>();
    template.blockConfigs.forEach((config) => {
      blockConfigMap.set(config.blockType, config);
    });

    // HIDDEN 블록 제외
    const filtered = sections.filter((s) => {
      const config = blockConfigMap.get(s.blockType);
      return !config || config.emphasis !== "HIDDEN";
    });

    // 템플릿 블록 순서대로 정렬
    const orderMap = new Map<string, number>();
    template.blockConfigs.forEach((config, i) => {
      orderMap.set(config.blockType, i);
    });

    return [...filtered].sort((a, b) => {
      const oa = orderMap.get(a.blockType) ?? 999;
      const ob = orderMap.get(b.blockType) ?? 999;
      return oa - ob;
    });
  }

  /**
   * 업종별 제목/oneLiner 오버라이드
   */
  private applyTitleOverrides(
    sections: DocumentSection[],
    template: VerticalTemplate,
  ): DocumentSection[] {
    const configMap = new Map<string, VerticalBlockConfig>();
    template.blockConfigs.forEach((c) => configMap.set(c.blockType, c));

    return sections.map((s) => {
      const config = configMap.get(s.blockType);
      if (!config) return s;

      return {
        ...s,
        title: config.titleOverride ?? s.title,
        oneLiner: config.oneLinerPrefix
          ? `${config.oneLinerPrefix}${s.oneLiner}`
          : s.oneLiner,
      };
    });
  }

  /**
   * 업종별 문장 정책 적용
   * - 금지 패턴 감지 → 경고 삽입
   * - 불확실성 처리 (CONSERVATIVE/NEUTRAL/OPTIMISTIC)
   */
  private applySentencePolicy(
    sections: DocumentSection[],
    template: VerticalTemplate,
  ): DocumentSection[] {
    const tone = template.toneGuideline;

    return sections.map((s) => ({
      ...s,
      sentences: s.sentences.map((sent) => {
        // 금지 패턴 체크
        const hasForbidden = tone.forbiddenPatterns.some((p) =>
          sent.sentence.includes(p),
        );

        if (hasForbidden) {
          return {
            ...sent,
            qualityNote: [
              sent.qualityNote,
              `[${template.label} 표현 주의] 이 문장에 업종 가이드라인에 맞지 않는 표현이 포함되어 있습니다.`,
            ]
              .filter(Boolean)
              .join(" / "),
          };
        }

        return sent;
      }),
    }));
  }

  /**
   * 업종별 추가 경고 생성
   */
  private buildAdditionalWarnings(
    template: VerticalTemplate,
    quality: QualityMeta,
  ): string[] {
    const warnings: string[] = [];

    // 리스크 정책 경고
    for (const note of template.riskPolicy.regulatoryNotes) {
      warnings.push(`[${template.label} 규제] ${note}`);
    }

    // 리스크 체크 포인트
    for (const check of template.riskPolicy.additionalRiskChecks) {
      warnings.push(`[${template.label} 체크] ${check}`);
    }

    return warnings;
  }

  /**
   * RISK_NOTE 섹션에 업종별 규제/주의 사항 삽입
   */
  private injectRiskNotes(
    sections: DocumentSection[],
    template: VerticalTemplate,
  ): DocumentSection[] {
    return sections.map((s) => {
      if (s.blockType !== "RISK_NOTE") return s;

      // 업종별 규제 주의사항을 문장으로 추가
      const additionalSentences = template.riskPolicy.regulatoryNotes.map(
        (note) => ({
          sentence: `[${template.label} 규제 주의] ${note}`,
          tone: template.toneGuideline.defaultTone,
        }),
      );

      return {
        ...s,
        sentences: [...s.sentences, ...additionalSentences],
      };
    });
  }
}
