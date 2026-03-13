/**
 * GEO/AEO Scoring Engine.
 *
 * Evaluates content for citation readiness by AI search engines.
 * Analyzes structure quality, answerability, and source trustworthiness.
 *
 * Upgrade path: Add actual AI engine querying via Perplexity API etc.
 */

import type { GeoAeoScoreResult, EngineVersion } from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "geo-aeo-scorer",
  version: "1.0.0",
  model: "structure-analysis-v1",
};

// ---------------------------------------------------------------------------
// Scoring criteria
// ---------------------------------------------------------------------------

const STRUCTURE_PATTERNS = {
  hasHeadings: /#{1,3}\s|<h[1-3]>/i,
  hasLists: /^[\s]*[-*•]\s|^[\s]*\d+\.\s|<[ou]l>/im,
  hasTable: /\|.*\|.*\||<table>/i,
  hasFAQ: /FAQ|자주\s*묻는|frequently\s*asked/i,
  hasDefinition: /이란|란\s|means|is defined as|refers to/i,
  hasSteps: /단계|step\s?\d|방법\s?\d|1\.\s|첫째|첫\s*번째/i,
  hasConclusion: /결론|요약|정리|마무리|conclusion|summary|in\s+conclusion/i,
  hasSchema: /schema\.org|@type|itemtype|structured\s*data/i,
  shortParagraphs: /\n{2,}/g, // multiple paragraph breaks = good structure
};

const TRUST_INDICATORS = {
  hasCitation: /출처|참고|reference|source|according to|study|research/i,
  hasAuthor: /작성자|저자|author|written by|편집자|editor/i,
  hasDate: /\d{4}[-./]\d{1,2}[-./]\d{1,2}|updated|작성일|수정일/i,
  hasDisclaimer: /주의|참고사항|disclaimer|note:|알림|안내/i,
  hasExpertise: /전문가|박사|교수|expert|Ph\.D|certified|인증/i,
};

const ANSWERABILITY_PATTERNS = {
  directAnswer: /입니다|입니다\.|이에요|예요|is\s|are\s|was\s/,
  comparison: /비교|차이|vs|versus|보다|than/i,
  howTo: /방법|단계|하는\s*법|how\s*to|steps|guide/i,
  list: /목록|리스트|종류|types|list|options/i,
  definition: /정의|뜻|의미|means|definition|what\s*is/i,
};

// ---------------------------------------------------------------------------
// GEO/AEO Scorer
// ---------------------------------------------------------------------------

export class GeoAeoScorer {
  /**
   * Score content for AI citation readiness.
   */
  score(content: {
    title: string;
    text: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }): GeoAeoScoreResult {
    const fullText = `${content.title}\n${content.text}`;

    const structureScore = this.scoreStructure(fullText);
    const answerabilityScore = this.scoreAnswerability(fullText);
    const trustScore = this.scoreTrust(fullText);
    const citationReadinessScore = this.scoreCitationReadiness(
      content.title,
      content.text,
      content.url,
    );

    const overallScore = Math.round(
      structureScore * 0.25 +
        answerabilityScore * 0.3 +
        trustScore * 0.2 +
        citationReadinessScore * 0.25,
    );

    const suggestions = this.generateSuggestions(
      structureScore,
      answerabilityScore,
      trustScore,
      citationReadinessScore,
      fullText,
    );

    return {
      citationReadinessScore,
      answerabilityScore,
      structureQualityScore: structureScore,
      sourceTrustScore: trustScore,
      overallScore,
      improvementSuggestions: suggestions,
      engineVersion: ENGINE_VERSION,
    };
  }

  /**
   * Batch score multiple content items.
   */
  scoreBatch(
    items: Array<{ title: string; text: string; url?: string }>,
  ): GeoAeoScoreResult[] {
    return items.map((item) => this.score(item));
  }

  // ---------------------------------------------------------------------------
  // Scoring dimensions
  // ---------------------------------------------------------------------------

  private scoreStructure(text: string): number {
    let score = 30; // base score

    if (STRUCTURE_PATTERNS.hasHeadings.test(text)) score += 15;
    if (STRUCTURE_PATTERNS.hasLists.test(text)) score += 12;
    if (STRUCTURE_PATTERNS.hasTable.test(text)) score += 10;
    if (STRUCTURE_PATTERNS.hasFAQ.test(text)) score += 10;
    if (STRUCTURE_PATTERNS.hasSteps.test(text)) score += 8;
    if (STRUCTURE_PATTERNS.hasConclusion.test(text)) score += 8;
    if (STRUCTURE_PATTERNS.hasSchema.test(text)) score += 12;

    // Short paragraphs are better for AI parsing
    const paragraphs = text.split(/\n{2,}/);
    if (paragraphs.length >= 3) score += 5;
    const avgParagraphLength = text.length / Math.max(paragraphs.length, 1);
    if (avgParagraphLength < 300) score += 5;

    // Text length bonus (medium length is optimal)
    if (text.length >= 500 && text.length <= 3000) score += 5;

    return Math.min(score, 100);
  }

  private scoreAnswerability(text: string): number {
    let score = 20; // base score

    if (ANSWERABILITY_PATTERNS.directAnswer.test(text)) score += 15;
    if (ANSWERABILITY_PATTERNS.comparison.test(text)) score += 12;
    if (ANSWERABILITY_PATTERNS.howTo.test(text)) score += 15;
    if (ANSWERABILITY_PATTERNS.list.test(text)) score += 12;
    if (ANSWERABILITY_PATTERNS.definition.test(text)) score += 15;

    // Clear first sentence/paragraph bonus
    const firstParagraph = text.split(/\n{2,}/)[0] ?? "";
    if (firstParagraph.length > 20 && firstParagraph.length < 200) {
      score += 10;
    }

    // Question-answer format detection
    if (/\?[\s\n]+[^\?]+[.입니다]/.test(text)) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  private scoreTrust(text: string): number {
    let score = 30; // base score

    if (TRUST_INDICATORS.hasCitation.test(text)) score += 20;
    if (TRUST_INDICATORS.hasAuthor.test(text)) score += 15;
    if (TRUST_INDICATORS.hasDate.test(text)) score += 15;
    if (TRUST_INDICATORS.hasDisclaimer.test(text)) score += 10;
    if (TRUST_INDICATORS.hasExpertise.test(text)) score += 15;

    return Math.min(score, 100);
  }

  private scoreCitationReadiness(
    title: string,
    text: string,
    url?: string,
  ): number {
    let score = 20;

    // Title quality
    if (title.length >= 10 && title.length <= 70) score += 15;
    if (/\d+/.test(title)) score += 5; // numbers in title
    if (/방법|가이드|비교|추천|정리|총정리|how|guide|best|top/i.test(title))
      score += 10;

    // URL quality
    if (url) {
      if (/https/.test(url)) score += 5;
      if (!/[?&]/.test(url) || url.indexOf("?") > url.length * 0.8) score += 5;
    }

    // Content completeness
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 300) score += 10;
    if (wordCount >= 1000) score += 10;

    // Has both Korean and structured content
    if (
      /[\uac00-\ud7af]/.test(text) &&
      STRUCTURE_PATTERNS.hasHeadings.test(text)
    ) {
      score += 10;
    }

    // Internal linking (suggests authority)
    const linkCount = (text.match(/https?:\/\//g) ?? []).length;
    if (linkCount >= 1 && linkCount <= 5) score += 5;

    return Math.min(score, 100);
  }

  // ---------------------------------------------------------------------------
  // Suggestions
  // ---------------------------------------------------------------------------

  private generateSuggestions(
    structureScore: number,
    answerabilityScore: number,
    trustScore: number,
    citationScore: number,
    text: string,
  ): string[] {
    const suggestions: string[] = [];

    if (structureScore < 50) {
      if (!STRUCTURE_PATTERNS.hasHeadings.test(text)) {
        suggestions.push("제목(H1-H3) 태그를 추가하여 구조를 개선하세요.");
      }
      if (!STRUCTURE_PATTERNS.hasLists.test(text)) {
        suggestions.push(
          "목록(bullet/numbered list)을 추가하여 가독성을 높이세요.",
        );
      }
      if (!STRUCTURE_PATTERNS.hasFAQ.test(text)) {
        suggestions.push("FAQ 섹션을 추가하면 AI 인용 가능성이 높아집니다.");
      }
    }

    if (answerabilityScore < 50) {
      suggestions.push("첫 문단에 핵심 답변을 직접적으로 제시하세요.");
      if (!ANSWERABILITY_PATTERNS.definition.test(text)) {
        suggestions.push("용어 정의나 직접적인 설명을 추가하세요.");
      }
    }

    if (trustScore < 50) {
      if (!TRUST_INDICATORS.hasCitation.test(text)) {
        suggestions.push("출처/참고 자료를 명시하여 신뢰성을 높이세요.");
      }
      if (!TRUST_INDICATORS.hasDate.test(text)) {
        suggestions.push("작성일/수정일을 표기하여 최신성을 보여주세요.");
      }
      if (!TRUST_INDICATORS.hasAuthor.test(text)) {
        suggestions.push("저자 정보를 추가하여 전문성을 강조하세요.");
      }
    }

    if (citationScore < 50) {
      suggestions.push(
        "제목에 숫자, '방법', '가이드' 등 검색 친화적 키워드를 포함하세요.",
      );
      suggestions.push("콘텐츠 길이를 300단어 이상으로 확보하세요.");
    }

    return suggestions.slice(0, 5);
  }
}
