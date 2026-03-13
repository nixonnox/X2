/**
 * Intent Classifier Engine.
 *
 * Classifies user intent from keywords, search phrases, and comment text.
 * Korean-focused with English support.
 *
 * Upgrade path: Replace with Claude Sonnet API calls via @x2/ai.
 */

import type {
  IntentCategory,
  IntentSubCategory,
  IntentClassificationResult,
  EngineVersion,
} from "./types";

const ENGINE_VERSION: EngineVersion = {
  engine: "intent-classifier",
  version: "1.0.0",
  model: "rule-based-ko-en-v1",
};

// ---------------------------------------------------------------------------
// Intent patterns (Korean + English)
// ---------------------------------------------------------------------------

const INTENT_PATTERNS: Array<{
  category: IntentCategory;
  subIntent: IntentSubCategory;
  patterns: RegExp[];
  weight: number;
}> = [
  {
    category: "DISCOVERY",
    subIntent: "정보_탐색",
    patterns: [
      /추천|인기|트렌드|핫한|요즘|유행|뜨는|떠오르/,
      /trending|popular|hot|best|top\s?\d+/i,
      /소개|알아보|알아볼|찾아/,
      /무엇|뭐|어떤.*있/,
    ],
    weight: 1,
  },
  {
    category: "DISCOVERY",
    subIntent: "후기_탐색",
    patterns: [
      /후기|리뷰|사용기|체험|경험|평가|평점/,
      /review|experience|testimonial|rating/i,
      /써본|써봤|먹어본|가본|해본/,
    ],
    weight: 1,
  },
  {
    category: "DISCOVERY",
    subIntent: "추천_탐색",
    patterns: [
      /추천.*해주|추천.*좀|뭐.*좋|어떤.*좋|강추/,
      /recommend|suggest|advice/i,
      /괜찮은|쓸만한|좋은.*뭐/,
    ],
    weight: 1.2,
  },
  {
    category: "COMPARISON",
    subIntent: "비교_검토",
    patterns: [
      /비교|vs|차이|다른점|뭐가.*다른|어떤.*나은/,
      /compare|versus|difference|better.*than|which.*better/i,
      /둘.*중|선택|고민|망설|갈등/,
    ],
    weight: 1.1,
  },
  {
    category: "ACTION",
    subIntent: "구매_의도",
    patterns: [
      /구매|구입|사려|살까|사고싶|주문|결제|장바구니/,
      /buy|purchase|order|cart|checkout/i,
      /가격|얼마|비용|할인|쿠폰|세일/,
    ],
    weight: 1.3,
  },
  {
    category: "ACTION",
    subIntent: "실행_방문_의도",
    patterns: [
      /방문|가볼|가려|위치|주소|영업시간|예약/,
      /visit|location|address|hours|reservation|book/i,
      /가는.*법|어디.*있|찾아가/,
    ],
    weight: 1.2,
  },
  {
    category: "TROUBLESHOOTING",
    subIntent: "문제_해결",
    patterns: [
      /문제|오류|에러|안되|안됨|고장|먹통|버그|해결/,
      /problem|error|bug|issue|broken|fix|not working|crash/i,
      /왜.*안|어떻게.*해결|도움|도와/,
    ],
    weight: 1.1,
  },
  {
    category: "NAVIGATION",
    subIntent: "실행_방문_의도",
    patterns: [
      /공식|홈페이지|사이트|앱|다운로드|설치/,
      /official|website|app|download|install|login|sign up/i,
      /어플|어디서.*다운|링크/,
    ],
    weight: 0.9,
  },
];

// ---------------------------------------------------------------------------
// Gap scoring patterns
// ---------------------------------------------------------------------------

const HIGH_COMPETITION_INDICATORS = [
  /광고|스폰서|협찬|PPL|sponsored/i,
  /공식|official|인증|verified/i,
];

const LOW_COMPETITION_INDICATORS = [
  /아직|없|모르|찾기.*어려|정보.*부족/,
  /nobody|no one|hard to find|limited/i,
];

// ---------------------------------------------------------------------------
// Intent Classifier
// ---------------------------------------------------------------------------

export class IntentClassifier {
  /**
   * Classify intent from a keyword or phrase.
   */
  classify(
    keyword: string,
    context?: { relatedTexts?: string[] },
  ): IntentClassificationResult {
    const normalizedKeyword = keyword.toLowerCase();
    const allText = [normalizedKeyword, ...(context?.relatedTexts ?? [])].join(
      " ",
    );

    let bestMatch: {
      category: IntentCategory;
      subIntent: IntentSubCategory;
      score: number;
      supportingPhrases: string[];
    } | null = null;

    for (const intentDef of INTENT_PATTERNS) {
      let score = 0;
      const supportingPhrases: string[] = [];

      for (const pattern of intentDef.patterns) {
        // Check keyword directly
        if (pattern.test(normalizedKeyword)) {
          score += 2 * intentDef.weight;
          supportingPhrases.push(`keyword: ${pattern.source}`);
        }
        // Check context texts
        if (context?.relatedTexts) {
          for (const text of context.relatedTexts) {
            if (pattern.test(text)) {
              score += 0.5 * intentDef.weight;
              const match = text.match(pattern);
              if (match) supportingPhrases.push(match[0]);
            }
          }
        }
      }

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          category: intentDef.category,
          subIntent: intentDef.subIntent,
          score,
          supportingPhrases: [...new Set(supportingPhrases)].slice(0, 5),
        };
      }
    }

    if (!bestMatch) {
      return {
        keyword,
        intentCategory: "UNKNOWN",
        subIntent: null,
        confidence: 0.3,
        supportingPhrases: [],
        gapScore: this.calculateGapScore(allText, "UNKNOWN"),
        gapType: "OPPORTUNITY",
        engineVersion: ENGINE_VERSION,
      };
    }

    const confidence = Math.min(0.4 + bestMatch.score * 0.1, 0.95);
    const gapScore = this.calculateGapScore(allText, bestMatch.category);
    const gapType = this.classifyGap(gapScore);

    return {
      keyword,
      intentCategory: bestMatch.category,
      subIntent: bestMatch.subIntent,
      confidence: Math.round(confidence * 100) / 100,
      supportingPhrases: bestMatch.supportingPhrases,
      gapScore: Math.round(gapScore * 100) / 100,
      gapType,
      engineVersion: ENGINE_VERSION,
    };
  }

  /**
   * Batch classify keywords.
   */
  classifyBatch(
    keywords: string[],
    context?: { relatedTexts?: string[] },
  ): IntentClassificationResult[] {
    return keywords.map((kw) => this.classify(kw, context));
  }

  /**
   * Expand a seed keyword into related keywords with intent classification.
   * Rule-based expansion using Korean suffix patterns.
   */
  expandAndClassify(seedKeyword: string): IntentClassificationResult[] {
    const expansions = [
      { suffix: " 추천", hint: "DISCOVERY" },
      { suffix: " 비교", hint: "COMPARISON" },
      { suffix: " 후기", hint: "DISCOVERY" },
      { suffix: " 가격", hint: "ACTION" },
      { suffix: " 구매", hint: "ACTION" },
      { suffix: " 사용법", hint: "TROUBLESHOOTING" },
      { suffix: " 문제", hint: "TROUBLESHOOTING" },
      { suffix: " 해결", hint: "TROUBLESHOOTING" },
      { suffix: " 장단점", hint: "COMPARISON" },
      { suffix: " 대안", hint: "COMPARISON" },
      { suffix: " 순위", hint: "DISCOVERY" },
      { suffix: " 효과", hint: "DISCOVERY" },
      { suffix: " 부작용", hint: "TROUBLESHOOTING" },
      { suffix: " 매장", hint: "NAVIGATION" },
      { suffix: " 할인", hint: "ACTION" },
    ];

    const results: IntentClassificationResult[] = [];

    // Classify the seed keyword itself
    results.push(this.classify(seedKeyword));

    // Classify expanded keywords
    for (const { suffix } of expansions) {
      const expanded = `${seedKeyword}${suffix}`;
      results.push(this.classify(expanded));
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Gap scoring
  // ---------------------------------------------------------------------------

  private calculateGapScore(text: string, category: IntentCategory): number {
    let competitionLevel = 0.5; // default mid-range

    // Check for high competition signals
    for (const pattern of HIGH_COMPETITION_INDICATORS) {
      if (pattern.test(text)) {
        competitionLevel += 0.15;
      }
    }

    // Check for low competition signals
    for (const pattern of LOW_COMPETITION_INDICATORS) {
      if (pattern.test(text)) {
        competitionLevel -= 0.2;
      }
    }

    competitionLevel = Math.max(0, Math.min(1, competitionLevel));

    // Gap score is inverse of competition (high gap = low competition = opportunity)
    // Adjusted by intent category (troubleshooting often has gaps)
    let categoryMultiplier = 1;
    if (category === "TROUBLESHOOTING") categoryMultiplier = 1.2;
    if (category === "NAVIGATION") categoryMultiplier = 0.8;
    if (category === "UNKNOWN") categoryMultiplier = 1.3;

    return Math.min((1 - competitionLevel) * categoryMultiplier, 1);
  }

  private classifyGap(gapScore: number): IntentClassificationResult["gapType"] {
    if (gapScore >= 0.75) return "BLUE_OCEAN";
    if (gapScore >= 0.5) return "OPPORTUNITY";
    if (gapScore >= 0.25) return "COMPETITIVE";
    return "SATURATED";
  }
}
