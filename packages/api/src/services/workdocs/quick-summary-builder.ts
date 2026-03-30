/**
 * QuickSummaryBuilder
 *
 * SearchIntelligenceResult → 한 줄 요약 / 한 문단 요약 생성.
 * 슬랙/메신저/보고서 첫 줄에 바로 붙여넣을 수 있는 형태.
 *
 * 예시:
 * - 한 줄: "'프로틴 음료' 검색 분석: 5개 관심 영역, 3개 고객 유형, 2개 콘텐츠 공백 발견"
 * - 한 문단: "'프로틴 음료' 키워드에 대해 검색 인텔리전스 분석을 수행했습니다.
 *            5개 관심 영역이 분류되었으며, 비교형 탐색자 유형이 가장 큰 비중을 차지합니다.
 *            고객 여정 중 2개 단계에서 콘텐츠 공백이 발견되어 대응이 필요합니다."
 */

import type { WorkDocQualityMeta, SentenceTone } from "./types";

// SearchIntelligenceResult 최소 shape
type SearchResult = {
  seedKeyword: string;
  pathfinder?: {
    success: boolean;
    data?: { hubKeywords?: { keyword: string; hubScore: number }[] };
  };
  roadview?: {
    success: boolean;
    data?: {
      stages?: { name: string; keywords?: string[] }[];
      weakStages?: string[];
    };
  };
  persona?: {
    success: boolean;
    data?: { personas?: { name: string; share?: number }[] };
  };
  cluster?: {
    success: boolean;
    data?: { clusters?: { name: string; keywords?: string[] }[] };
  };
};

type QualityAssessment = {
  level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  confidence: number;
  freshness?: "fresh" | "recent" | "stale";
  isPartial?: boolean;
  isMockOnly?: boolean;
};

export class QuickSummaryBuilder {
  /**
   * 한 줄 요약 (슬랙/메신저/보고서 제목용)
   */
  buildOneLiner(result: SearchResult, quality: QualityAssessment): string {
    const parts: string[] = [];

    const clusterCount = this.getClusterCount(result);
    if (clusterCount > 0) parts.push(`${clusterCount}개 관심 영역`);

    const personaCount = this.getPersonaCount(result);
    if (personaCount > 0) parts.push(`${personaCount}개 고객 유형`);

    const weakCount = this.getWeakStageCount(result);
    if (weakCount > 0) parts.push(`${weakCount}개 콘텐츠 공백`);

    const hubCount = this.getHubKeywordCount(result);
    if (hubCount > 0) parts.push(`${hubCount}개 핵심 키워드`);

    const qualityNote = quality.isMockOnly ? " [검증 필요]" : "";

    if (parts.length === 0) {
      return `'${result.seedKeyword}' 검색 인텔리전스 분석 완료${qualityNote}`;
    }

    return `'${result.seedKeyword}' 검색 분석: ${parts.join(", ")} 발견${qualityNote}`;
  }

  /**
   * 한 문단 요약 (보고서 서두/메신저 본문용)
   */
  buildParagraph(
    result: SearchResult,
    quality: QualityAssessment,
    tone: SentenceTone = "REPORT",
  ): string {
    const sentences: string[] = [];

    // 첫 문장: 분석 개요
    sentences.push(
      this.toneWrap(
        `'${result.seedKeyword}' 키워드에 대해 검색 인텔리전스 분석을 수행`,
        tone,
      ),
    );

    // 클러스터 요약
    const clusterCount = this.getClusterCount(result);
    if (clusterCount > 0) {
      sentences.push(
        this.toneWrap(`${clusterCount}개 관심 영역이 분류됨`, tone),
      );
    }

    // 페르소나 요약
    const topPersona = this.getTopPersona(result);
    if (topPersona) {
      sentences.push(
        this.toneWrap(`'${topPersona}' 유형이 가장 큰 비중을 차지`, tone),
      );
    }

    // 콘텐츠 공백
    const weakStages = this.getWeakStages(result);
    if (weakStages.length > 0) {
      sentences.push(
        this.toneWrap(
          `고객 여정 중 ${weakStages.length}개 단계(${weakStages.join(", ")})에서 콘텐츠 공백이 발견되어 대응이 필요`,
          tone,
        ),
      );
    }

    // 허브 키워드
    const topHub = this.getTopHubKeyword(result);
    if (topHub) {
      sentences.push(this.toneWrap(`핵심 허브 키워드는 '${topHub}'`, tone));
    }

    // 품질 경고
    if (quality.isMockOnly) {
      sentences.push("[검증 필요] 샘플 데이터 기반 분석 결과입니다.");
    }
    if (quality.freshness === "stale") {
      sentences.push(
        "[주의] 분석 데이터가 오래되었습니다. 최신 데이터로 재분석을 권장합니다.",
      );
    }

    return sentences.join(" ");
  }

  /**
   * 품질 한 줄 요약
   */
  buildQualityOneLiner(quality: QualityAssessment): string {
    const parts: string[] = [];
    parts.push(`신뢰도 ${Math.round(quality.confidence * 100)}%`);
    if (quality.freshness)
      parts.push(`데이터 상태: ${this.freshnessLabel(quality.freshness)}`);
    if (quality.isPartial) parts.push("일부 데이터만 수집됨");
    if (quality.isMockOnly) parts.push("샘플 데이터 기반");
    return parts.join(" / ");
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private getClusterCount(r: SearchResult): number {
    return r.cluster?.success && r.cluster.data?.clusters
      ? r.cluster.data.clusters.length
      : 0;
  }

  private getPersonaCount(r: SearchResult): number {
    return r.persona?.success && r.persona.data?.personas
      ? r.persona.data.personas.length
      : 0;
  }

  private getWeakStageCount(r: SearchResult): number {
    return r.roadview?.success && r.roadview.data?.weakStages
      ? r.roadview.data.weakStages.length
      : 0;
  }

  private getWeakStages(r: SearchResult): string[] {
    return r.roadview?.success && r.roadview.data?.weakStages
      ? r.roadview.data.weakStages
      : [];
  }

  private getHubKeywordCount(r: SearchResult): number {
    return r.pathfinder?.success && r.pathfinder.data?.hubKeywords
      ? r.pathfinder.data.hubKeywords.length
      : 0;
  }

  private getTopPersona(r: SearchResult): string | null {
    if (!r.persona?.success || !r.persona.data?.personas?.length) return null;
    const sorted = [...r.persona.data.personas].sort(
      (a, b) => (b.share ?? 0) - (a.share ?? 0),
    );
    return sorted[0]?.name ?? null;
  }

  private getTopHubKeyword(r: SearchResult): string | null {
    if (!r.pathfinder?.success || !r.pathfinder.data?.hubKeywords?.length)
      return null;
    const sorted = [...r.pathfinder.data.hubKeywords].sort(
      (a, b) => b.hubScore - a.hubScore,
    );
    return sorted[0]?.keyword ?? null;
  }

  private toneWrap(content: string, tone: SentenceTone): string {
    switch (tone) {
      case "REPORT":
        return `${content}했습니다.`;
      case "MESSENGER":
        return `${content}했습니다.`;
      case "MEETING_BULLET":
        return `• ${content}`;
      case "FORMAL":
        return `${content}하였습니다.`;
      default:
        return `${content}.`;
    }
  }

  private freshnessLabel(f: string): string {
    switch (f) {
      case "fresh":
        return "최신";
      case "recent":
        return "최근";
      case "stale":
        return "오래됨";
      default:
        return f;
    }
  }
}
