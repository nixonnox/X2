/**
 * EvidenceToDocumentMapper
 *
 * Evidence Bundle 아이템을 문서/PT/보고서용 EvidenceRef와 SourceRef로 변환.
 * "이 문장이 어떤 근거에서 나왔는지" 역추적 가능하게 만드는 핵심 매퍼.
 *
 * 입력: SearchEvidenceBundleService 출력 (EvidenceBundleItem[])
 * 출력: EvidenceRef[], SourceRef[] (DocumentBlock/PtSlideBlock에 삽입)
 */

import type { EvidenceRef, SourceRef, DocumentQualityMeta } from "./types";

// Phase 7 EvidenceBundleItem shape (from evidence-bundle.service.ts)
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

// Source info from search intelligence trace
type SourceInfo = {
  name: string;
  status: "success" | "partial" | "failed";
  itemCount?: number;
  latencyMs?: number;
};

export class EvidenceToDocumentMapper {
  /**
   * EvidenceBundleItem[] → EvidenceRef[]
   * 각 문서 블록에서 참조할 수 있는 근거 레퍼런스로 변환.
   */
  mapToEvidenceRefs(items: EvidenceBundleItem[]): EvidenceRef[] {
    return items.map((item, i) => ({
      evidenceId: `ev-${item.category}-${i}`,
      category: item.category,
      label: item.label,
      snippet: item.summary,
      dataSourceType: item.dataSourceType,
      entityIds: item.entityIds,
    }));
  }

  /**
   * Source 정보 → SourceRef[]
   * 검색 인텔리전스에서 사용된 데이터 소스를 문서용 출처로 변환.
   */
  mapToSourceRefs(sources: SourceInfo[]): SourceRef[] {
    return sources
      .filter((s) => s.status !== "failed")
      .map((s, i) => ({
        sourceId: `src-${i}`,
        sourceName: s.name,
        sourceType: this.inferSourceType(s.name),
        trustScore: s.status === "success" ? 0.9 : 0.6,
        citationReady: s.status === "success" && (s.itemCount ?? 0) > 0,
      }));
  }

  /**
   * QualityAssessment → DocumentQualityMeta
   * 품질 평가를 문서 블록의 메타데이터로 변환.
   */
  mapQuality(quality: QualityAssessment): DocumentQualityMeta {
    return {
      confidence: quality.confidence,
      freshness: quality.freshness,
      isPartial: quality.isPartial,
      isMockOnly: quality.isMockOnly,
      warnings: quality.warnings,
    };
  }

  /**
   * 카테고리별 근거 필터링.
   * 특정 문서 블록에 관련된 근거만 추출.
   */
  filterByCategory(refs: EvidenceRef[], categories: string[]): EvidenceRef[] {
    return refs.filter((r) => categories.includes(r.category));
  }

  /**
   * 근거가 있는지 확인. evidence 없는 문서 블록 생성 방지.
   */
  hasEvidence(refs: EvidenceRef[], categories: string[]): boolean {
    return refs.some((r) => categories.includes(r.category));
  }

  /**
   * Citation-ready 소스만 필터링 (GEO/AEO용).
   */
  filterCitationReady(refs: SourceRef[]): SourceRef[] {
    return refs.filter((r) => r.citationReady);
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
