/**
 * RoleBasedWorkDocAssembler
 *
 * WorkDoc을 대상 역할(audience)에 따라 필터링·재조립.
 *
 * - PRACTITIONER: 전체 섹션, 전체 근거, 품질 경고 표시
 * - TEAM_LEAD: 요약 + 핵심 + 액션 중심, 근거 snippet만
 * - EXECUTIVE: 요약 + 액션만, 경고 제거, 최소 구조
 * - OPS_MANAGER: 전체 섹션, 전체 근거, 실행 항목 강조
 */

import type { WorkDoc, WorkDocAudience, WorkDocSection } from "./types";
import { WORKDOC_AUDIENCE_CONFIG } from "./types";

// EXECUTIVE가 볼 블록 유형
const EXECUTIVE_BLOCKS = new Set(["QUICK_SUMMARY", "KEY_FINDING", "ACTION"]);

// TEAM_LEAD가 볼 블록 유형
const TEAM_LEAD_BLOCKS = new Set([
  "QUICK_SUMMARY",
  "KEY_FINDING",
  "COMPARISON",
  "ACTION",
  "RISK_NOTE",
  "EVIDENCE",
]);

export class RoleBasedWorkDocAssembler {
  /**
   * WorkDoc을 audience에 맞게 필터링
   */
  assemble(doc: WorkDoc, audience: WorkDocAudience): WorkDoc {
    const config = WORKDOC_AUDIENCE_CONFIG[audience];

    let sections = this.filterSectionsByAudience(doc.sections, audience);
    sections = sections.slice(0, config.maxSections);

    // 품질 경고 제거 (EXECUTIVE)
    if (!config.includeQualityWarnings) {
      sections = sections
        .filter((s) => s.blockType !== "RISK_NOTE")
        .map((s) => this.stripQualityWarnings(s));
    }

    // raw evidence 제거
    if (!config.includeRawEvidence) {
      sections = sections.map((s) => ({
        ...s,
        evidenceRefs: s.evidenceRefs.map((ref) => ({
          ...ref,
          snippet: ref.snippet?.substring(0, 100),
          entityIds: undefined,
        })),
      }));
    }

    // source 상세 제거
    if (!config.includeSourceDetail) {
      sections = sections.map((s) => ({
        ...s,
        sourceRefs: s.sourceRefs.map((ref) => ({
          ...ref,
          url: undefined,
          domain: undefined,
          trustScore: undefined,
        })),
      }));
    }

    // 순서 재정렬
    sections = sections.map((s, i) => ({ ...s, order: i + 1 }));

    // evidence/source 재수집
    const allEvidence = sections.flatMap((s) => s.evidenceRefs);
    const allSources = sections.flatMap((s) => s.sourceRefs);
    const uniqueEvidence = this.deduplicateEvidence(allEvidence);
    const uniqueSources = this.deduplicateSources(allSources);

    return {
      ...doc,
      audience,
      sections,
      title: this.adjustTitle(doc.title, audience),
      allEvidenceRefs: uniqueEvidence,
      allSourceRefs: uniqueSources,
    };
  }

  private filterSectionsByAudience(
    sections: WorkDocSection[],
    audience: WorkDocAudience,
  ): WorkDocSection[] {
    switch (audience) {
      case "EXECUTIVE":
        return sections.filter((s) => EXECUTIVE_BLOCKS.has(s.blockType));
      case "TEAM_LEAD":
        return sections.filter((s) => TEAM_LEAD_BLOCKS.has(s.blockType));
      case "PRACTITIONER":
      case "OPS_MANAGER":
        return sections; // 전체 포함
      default:
        return sections;
    }
  }

  private stripQualityWarnings(section: WorkDocSection): WorkDocSection {
    return {
      ...section,
      sentences: section.sentences.map((s) => ({
        ...s,
        qualityNote: undefined,
      })),
      quality: {
        ...section.quality,
        warnings: undefined,
      },
    };
  }

  private adjustTitle(title: string, audience: WorkDocAudience): string {
    switch (audience) {
      case "EXECUTIVE":
        return `[임원용] ${title}`;
      case "TEAM_LEAD":
        return `[팀장용] ${title}`;
      case "OPS_MANAGER":
        return `[운영용] ${title}`;
      default:
        return title;
    }
  }

  private deduplicateEvidence(
    refs: WorkDoc["allEvidenceRefs"],
  ): WorkDoc["allEvidenceRefs"] {
    const seen = new Set<string>();
    return refs.filter((r) => {
      if (seen.has(r.evidenceId)) return false;
      seen.add(r.evidenceId);
      return true;
    });
  }

  private deduplicateSources(
    refs: WorkDoc["allSourceRefs"],
  ): WorkDoc["allSourceRefs"] {
    const seen = new Set<string>();
    return refs.filter((r) => {
      if (seen.has(r.sourceId)) return false;
      seen.add(r.sourceId);
      return true;
    });
  }
}
