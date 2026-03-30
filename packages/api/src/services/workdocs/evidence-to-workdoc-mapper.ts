/**
 * EvidenceToWorkDocMapper
 *
 * Evidence Bundle 아이템을 실무 문서용 EvidenceRef/SourceRef/Quality로 변환.
 * documents/evidence-to-document-mapper.ts와 동일한 shape이지만,
 * 실무 문서에 맞게 snippet을 "복붙 가능한 문장"으로 가공.
 */

import type { EvidenceRef, SourceRef, WorkDocQualityMeta } from "./types";

// Phase 7 EvidenceBundleItem shape
type EvidenceBundleItem = {
  category: string;
  label: string;
  dataSourceType?: string;
  entityIds?: string[];
  displayType?: string;
  summary?: string;
  data?: unknown;
};

// SearchDataQualityAssessment shape
type QualityAssessment = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
  warnings?: string[];
};

// Source info
type SourceInfo = {
  name: string;
  status: "success" | "partial" | "failed";
  itemCount?: number;
  latencyMs?: number;
};

export class EvidenceToWorkDocMapper {
  /**
   * EvidenceBundleItem[] → EvidenceRef[]
   */
  mapToEvidenceRefs(items: EvidenceBundleItem[]): EvidenceRef[] {
    return items.map((item, i) => ({
      evidenceId: `wev-${item.category}-${i}`,
      category: item.category,
      label: item.label,
      snippet: item.summary,
      dataSourceType: item.dataSourceType,
      entityIds: item.entityIds,
    }));
  }

  /**
   * Source → SourceRef[]
   */
  mapToSourceRefs(sources: SourceInfo[]): SourceRef[] {
    return sources
      .filter((s) => s.status !== "failed")
      .map((s, i) => ({
        sourceId: `wsrc-${i}`,
        sourceName: s.name,
        sourceType: this.inferSourceType(s.name),
        trustScore: s.status === "success" ? 0.9 : 0.6,
        citationReady: s.status === "success" && (s.itemCount ?? 0) > 0,
      }));
  }

  /**
   * QualityAssessment → WorkDocQualityMeta
   */
  mapQuality(quality: QualityAssessment): WorkDocQualityMeta {
    return {
      confidence: quality.confidence,
      freshness: quality.freshness,
      isPartial: quality.isPartial,
      isMockOnly: quality.isMockOnly,
      warnings: quality.warnings,
    };
  }

  /**
   * 카테고리별 근거 필터링
   */
  filterByCategory(refs: EvidenceRef[], categories: string[]): EvidenceRef[] {
    return refs.filter((r) => categories.includes(r.category));
  }

  /**
   * 근거 존재 여부 확인
   */
  hasEvidence(refs: EvidenceRef[], categories: string[]): boolean {
    return refs.some((r) => categories.includes(r.category));
  }

  /**
   * snippet을 복붙 가능한 요약 문장으로 가공
   */
  toSnippetSummary(ref: EvidenceRef): string {
    if (!ref.snippet) return ref.label;
    // 너무 긴 snippet은 자르기
    if (ref.snippet.length > 200) {
      return ref.snippet.substring(0, 197) + "...";
    }
    return ref.snippet;
  }

  private inferSourceType(name: string): SourceRef["sourceType"] {
    const lower = name.toLowerCase();
    if (
      lower.includes("google") ||
      lower.includes("naver") ||
      lower.includes("bing")
    )
      return "SEARCH_ENGINE";
    if (
      lower.includes("aeo") ||
      lower.includes("perplexity") ||
      lower.includes("copilot")
    )
      return "AEO_SNAPSHOT";
    if (
      lower.includes("social") ||
      lower.includes("instagram") ||
      lower.includes("youtube")
    )
      return "SOCIAL";
    if (lower.includes("analytics") || lower.includes("search console"))
      return "ANALYTICS";
    return "INTERNAL";
  }
}
