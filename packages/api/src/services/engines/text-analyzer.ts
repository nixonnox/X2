/**
 * Text Analyzer Engine.
 *
 * Rule-based + keyword-based text analysis for Korean and English.
 * Provides sentiment, topic, question detection, risk detection, and spam detection.
 *
 * This is the real analysis engine — not a mock. Results are based on
 * linguistic pattern matching, keyword dictionaries, and scoring heuristics.
 *
 * Upgrade path: Replace rule-based analysis with Claude Haiku API calls
 * when @x2/ai module is ready. The interface remains identical.
 */

import type {
  SentimentResult,
  SentimentLabel,
  TopicResult,
  QuestionDetectionResult,
  RiskDetectionResult,
  RiskLevel,
  CommentAnalysisEngineResult,
  EngineVersion,
  QualityFlags,
} from "./types";
import { CONFIDENCE_THRESHOLDS } from "./types";

// ---------------------------------------------------------------------------
// Engine version
// ---------------------------------------------------------------------------

const ENGINE_VERSION: EngineVersion = {
  engine: "text-analyzer",
  version: "1.0.0",
  model: "rule-based-ko-en-v1",
};

// ---------------------------------------------------------------------------
// Korean sentiment lexicon
// ---------------------------------------------------------------------------

const POSITIVE_KEYWORDS_KO = [
  "좋아요",
  "좋다",
  "좋은",
  "좋습니다",
  "최고",
  "대박",
  "짱",
  "훌륭",
  "멋지다",
  "멋진",
  "멋져",
  "멋있",
  "감동",
  "감사",
  "고마워",
  "고맙습니다",
  "사랑",
  "예쁘",
  "이쁘",
  "아름다",
  "귀엽",
  "깔끔",
  "만족",
  "추천",
  "완벽",
  "응원",
  "기대",
  "설레",
  "행복",
  "즐거",
  "재밌",
  "유익",
  "편리",
  "효과",
  "가성비",
  "알차",
  "든든",
  "믿음직",
  "신뢰",
  "빠르",
  "깨끗",
  "정확",
  "친절",
  "세심",
  "꼼꼼",
  "퀄리티",
  "굿",
  "나이스",
  "베스트",
  "갓",
  "레전드",
  "인정",
  "ㅋㅋㅋ",
  "ㅎㅎ",
  "♡",
  "❤",
  "👍",
  "🥰",
  "😍",
];

const NEGATIVE_KEYWORDS_KO = [
  "별로",
  "싫",
  "나쁘",
  "안좋",
  "불만",
  "실망",
  "최악",
  "쓰레기",
  "엉망",
  "짜증",
  "화나",
  "열받",
  "답답",
  "불편",
  "어렵",
  "복잡",
  "느리",
  "비싸",
  "거품",
  "사기",
  "거짓",
  "가짜",
  "불량",
  "하자",
  "고장",
  "파손",
  "문제",
  "오류",
  "에러",
  "버그",
  "환불",
  "취소",
  "반품",
  "교환",
  "무시",
  "불친절",
  "불성실",
  "무책임",
  "황당",
  "어이없",
  "말도안",
  "이게뭐",
  "왜이래",
  "미친",
  "못쓸",
  "쓸모없",
  "후회",
  "손해",
  "낭비",
  "폐급",
  "ㅡㅡ",
  "ㅠㅠ",
  "😡",
  "😤",
  "👎",
  "역겹",
  "더럽",
  "심각",
  "위험",
  "악취",
  "곰팡이",
  "벌레",
];

const POSITIVE_KEYWORDS_EN = [
  "good",
  "great",
  "excellent",
  "amazing",
  "awesome",
  "love",
  "best",
  "perfect",
  "wonderful",
  "fantastic",
  "brilliant",
  "beautiful",
  "nice",
  "impressive",
  "outstanding",
  "recommend",
  "satisfied",
  "helpful",
  "quality",
  "fast",
  "reliable",
  "convenient",
  "clean",
  "easy",
];

const NEGATIVE_KEYWORDS_EN = [
  "bad",
  "terrible",
  "awful",
  "worst",
  "hate",
  "horrible",
  "disappointing",
  "poor",
  "broken",
  "defective",
  "slow",
  "expensive",
  "scam",
  "fake",
  "refund",
  "complaint",
  "issue",
  "problem",
  "error",
  "bug",
  "useless",
  "waste",
  "annoying",
  "frustrating",
  "rude",
  "unprofessional",
  "dangerous",
  "unsafe",
  "dirty",
  "disgusting",
];

// ---------------------------------------------------------------------------
// Topic keyword map (Korean business context)
// ---------------------------------------------------------------------------

const TOPIC_KEYWORDS: Record<string, string[]> = {
  가격: [
    "가격",
    "비싸",
    "싸",
    "저렴",
    "할인",
    "세일",
    "가성비",
    "원",
    "만원",
    "비용",
    "요금",
    "무료",
    "유료",
    "price",
    "cost",
    "cheap",
    "expensive",
  ],
  품질: [
    "품질",
    "퀄리티",
    "질",
    "내구",
    "마감",
    "재질",
    "소재",
    "quality",
    "material",
    "durable",
    "flimsy",
  ],
  사용법: [
    "사용법",
    "사용방법",
    "방법",
    "어떻게",
    "세팅",
    "설정",
    "설치",
    "조립",
    "how to",
    "tutorial",
    "guide",
    "setup",
  ],
  비교: [
    "비교",
    "vs",
    "차이",
    "뭐가 다",
    "어떤 게",
    "어느",
    "대",
    "versus",
    "compare",
    "comparison",
    "better",
    "worse",
  ],
  일정: [
    "일정",
    "날짜",
    "언제",
    "기간",
    "배송",
    "도착",
    "출시",
    "오픈",
    "when",
    "date",
    "schedule",
    "delivery",
    "shipping",
  ],
  지원: [
    "지원",
    "고객센터",
    "문의",
    "상담",
    "A/S",
    "as",
    "수리",
    "서비스센터",
    "support",
    "help",
    "contact",
    "customer service",
  ],
  불만: [
    "불만",
    "항의",
    "신고",
    "고발",
    "피해",
    "소비자",
    "소보원",
    "complaint",
    "report",
    "consumer",
  ],
  칭찬: [
    "칭찬",
    "감사",
    "감동",
    "고마워",
    "최고예요",
    "대만족",
    "praise",
    "thank",
    "grateful",
  ],
  배송: [
    "배송",
    "택배",
    "운송",
    "포장",
    "도착",
    "배달",
    "우체국",
    "shipping",
    "delivery",
    "package",
    "tracking",
  ],
  환불: [
    "환불",
    "취소",
    "반품",
    "교환",
    "반송",
    "refund",
    "return",
    "exchange",
    "cancel",
  ],
  기능: [
    "기능",
    "성능",
    "스펙",
    "사양",
    "용량",
    "속도",
    "feature",
    "spec",
    "performance",
    "capacity",
  ],
  디자인: [
    "디자인",
    "색상",
    "색깔",
    "모양",
    "크기",
    "사이즈",
    "외관",
    "design",
    "color",
    "shape",
    "size",
    "look",
  ],
  성능: [
    "성능",
    "속도",
    "빠르",
    "느리",
    "렉",
    "버벅",
    "performance",
    "speed",
    "fast",
    "slow",
    "lag",
  ],
  내구성: [
    "내구",
    "견고",
    "튼튼",
    "약하",
    "깨지",
    "부러",
    "찢어",
    "durability",
    "sturdy",
    "fragile",
    "break",
  ],
  사이즈: [
    "사이즈",
    "크기",
    "치수",
    "호수",
    "피팅",
    "맞",
    "size",
    "fit",
    "measurement",
  ],
  맛: [
    "맛",
    "맛있",
    "맛없",
    "달",
    "짜",
    "매운",
    "싱거",
    "taste",
    "flavor",
    "delicious",
    "bland",
  ],
  서비스: [
    "서비스",
    "응대",
    "친절",
    "불친절",
    "직원",
    "매니저",
    "service",
    "staff",
    "employee",
    "manager",
  ],
  매장: [
    "매장",
    "가게",
    "지점",
    "방문",
    "오프라인",
    "store",
    "shop",
    "branch",
    "visit",
    "offline",
  ],
  이벤트: [
    "이벤트",
    "행사",
    "프로모션",
    "사은품",
    "경품",
    "event",
    "promotion",
    "giveaway",
  ],
  할인: [
    "할인",
    "쿠폰",
    "적립",
    "포인트",
    "멤버십",
    "discount",
    "coupon",
    "point",
    "membership",
  ],
  추천: ["추천", "강추", "꼭", "필수", "recommend", "must", "essential"],
  후기: [
    "후기",
    "리뷰",
    "사용기",
    "체험",
    "경험",
    "review",
    "experience",
    "testimonial",
  ],
  문의: [
    "문의",
    "질문",
    "궁금",
    "알려",
    "알고싶",
    "inquiry",
    "question",
    "wonder",
    "ask",
  ],
};

// ---------------------------------------------------------------------------
// Question detection patterns
// ---------------------------------------------------------------------------

const QUESTION_PATTERNS_KO = [
  /\?$/,
  /\?[\s\)]*$/,
  /어떻게|어떤|어디|언제|왜|뭐|무엇|누가|몇|얼마/,
  /인가요|일까요|할까요|될까요|있나요|없나요|인지|건지|는지/,
  /맞나요|맞죠|인가|인데|을까|가요|나요|ㄹ까|ㄴ가|하나요/,
  /궁금|알려|알고싶|알수있|알려주|알려줘|가르쳐|설명/,
  /추천.*해주|추천.*좀|추천.*부탁|어떤.*좋|뭐.*좋/,
  /비교.*어떤|비교.*뭐가|차이.*뭐|다른점|뭐가.*다른/,
];

const QUESTION_PATTERNS_EN = [
  /\?$/,
  /\?[\s\)]*$/,
  /^(how|what|where|when|why|who|which|can|could|would|should|is|are|do|does|did)/i,
  /anyone know|does anyone|has anyone|can someone/i,
  /recommend|suggestion|advice/i,
];

const QUESTION_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /어떻게|사용법|방법|how to|tutorial|guide/i, type: "how_to" },
  { pattern: /왜|이유|원인|why|reason|cause/i, type: "why" },
  { pattern: /비교|차이|vs|versus|compare|better/i, type: "comparison" },
  {
    pattern: /추천|어떤.*좋|뭐.*좋|recommend|suggest/i,
    type: "recommendation",
  },
  { pattern: /가격|얼마|비용|price|cost|how much/i, type: "price" },
  {
    pattern: /재고|구매|살수|어디서|available|where.*buy|in stock/i,
    type: "availability",
  },
];

// ---------------------------------------------------------------------------
// Risk detection patterns
// ---------------------------------------------------------------------------

const RISK_ESCALATION_WORDS = [
  "소비자보호원",
  "소보원",
  "공정위",
  "공정거래",
  "법적",
  "소송",
  "변호사",
  "고발",
  "신고",
  "뉴스",
  "기사",
  "방송",
  "언론",
  "폭로",
  "사건",
  "사고",
  "위험",
  "안전",
  "건강",
  "부상",
  "알레르기",
  "독성",
  "유해",
  "리콜",
  "lawsuit",
  "legal",
  "attorney",
  "safety",
  "recall",
  "hazard",
  "toxic",
  "FDA",
  "investigation",
  "report",
  "news",
  "expose",
];

const CRITICAL_RISK_WORDS = [
  "사망",
  "입원",
  "응급",
  "화재",
  "폭발",
  "감전",
  "질식",
  "중독",
  "death",
  "hospital",
  "emergency",
  "fire",
  "explosion",
  "poison",
];

// ---------------------------------------------------------------------------
// Spam detection patterns
// ---------------------------------------------------------------------------

const SPAM_PATTERNS = [
  /https?:\/\/[^\s]+\.(xyz|tk|ml|ga|cf)/i,
  /카톡|카카오톡|텔레그램.*\d{4}/,
  /무료\s*(상담|체험|샘플)/,
  /수익|부업|재택|알바.*만원/,
  /선착순|한정.*명|마감임박/,
  /(.)\1{5,}/, // same character repeated 6+ times
  /[💰🤑💵💸]{2,}/, // money emojis
  /구독.*좋아요.*알림|subscribe.*like.*bell/i,
];

// ---------------------------------------------------------------------------
// Text Analyzer Engine
// ---------------------------------------------------------------------------

export class TextAnalyzer {
  /**
   * Analyze a single comment/text returning all analysis dimensions.
   */
  analyze(
    commentId: string,
    text: string,
    context?: { contentTitle?: string; platform?: string },
  ): CommentAnalysisEngineResult {
    const sentiment = this.analyzeSentiment(text);
    const topics = this.extractTopics(text, context?.contentTitle);
    const question = this.detectQuestion(text);
    const risk = this.detectRisk(text, sentiment);
    const isSpam = this.detectSpam(text);

    // Generate suggested reply for questions and negative sentiments
    let suggestedReply: string | null = null;
    if (question.isQuestion && question.questionType) {
      suggestedReply = this.generateSuggestedReplyHint(question.questionType);
    }

    return {
      commentId,
      sentiment,
      topics,
      question,
      risk,
      isSpam,
      suggestedReply,
      engineVersion: ENGINE_VERSION,
      analyzedAt: new Date(),
    };
  }

  /**
   * Batch analyze multiple texts.
   */
  analyzeBatch(
    items: Array<{
      id: string;
      text: string;
      contentTitle?: string;
      platform?: string;
    }>,
  ): CommentAnalysisEngineResult[] {
    return items.map((item) =>
      this.analyze(item.id, item.text, {
        contentTitle: item.contentTitle,
        platform: item.platform,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Sentiment Analysis
  // ---------------------------------------------------------------------------

  analyzeSentiment(text: string): SentimentResult {
    const normalizedText = text.toLowerCase();
    const language = this.detectLanguage(text);

    let positiveScore = 0;
    let negativeScore = 0;
    let matchCount = 0;

    // Korean sentiment scoring
    for (const keyword of POSITIVE_KEYWORDS_KO) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        positiveScore += 1;
        matchCount++;
      }
    }
    for (const keyword of NEGATIVE_KEYWORDS_KO) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        negativeScore += 1;
        matchCount++;
      }
    }

    // English sentiment scoring
    for (const keyword of POSITIVE_KEYWORDS_EN) {
      if (normalizedText.includes(keyword)) {
        positiveScore += 1;
        matchCount++;
      }
    }
    for (const keyword of NEGATIVE_KEYWORDS_EN) {
      if (normalizedText.includes(keyword)) {
        negativeScore += 1;
        matchCount++;
      }
    }

    // Negation handling (Korean)
    const negationPatterns = [/안\s/, /못\s/, /없/, /아니/];
    for (const pattern of negationPatterns) {
      if (pattern.test(normalizedText)) {
        // Swap a portion of scores for negation
        const temp = positiveScore * 0.5;
        positiveScore = positiveScore * 0.5 + negativeScore * 0.3;
        negativeScore = negativeScore * 0.7 + temp * 0.3;
      }
    }

    // Calculate final sentiment
    const totalScore = positiveScore + negativeScore;
    let sentimentScore: number;
    let sentiment: SentimentLabel;
    let confidence: number;

    if (totalScore === 0) {
      sentimentScore = 0;
      sentiment = "NEUTRAL";
      confidence = text.length < 10 ? 0.3 : 0.5;
    } else {
      sentimentScore =
        (positiveScore - negativeScore) / Math.max(totalScore, 1);
      // Clamp to [-1, 1]
      sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

      if (sentimentScore > 0.15) {
        sentiment = "POSITIVE";
      } else if (sentimentScore < -0.15) {
        sentiment = "NEGATIVE";
      } else {
        sentiment = "NEUTRAL";
      }

      // Confidence based on match count and text length
      const lengthFactor = Math.min(text.length / 50, 1);
      const matchFactor = Math.min(matchCount / 3, 1);
      confidence = 0.4 + lengthFactor * 0.3 + matchFactor * 0.3;
    }

    // Build reason
    let reason: string | null = null;
    if (sentiment !== "NEUTRAL") {
      const topMatches =
        sentiment === "POSITIVE"
          ? POSITIVE_KEYWORDS_KO.concat(POSITIVE_KEYWORDS_EN)
              .filter((k) => normalizedText.includes(k.toLowerCase()))
              .slice(0, 3)
          : NEGATIVE_KEYWORDS_KO.concat(NEGATIVE_KEYWORDS_EN)
              .filter((k) => normalizedText.includes(k.toLowerCase()))
              .slice(0, 3);
      if (topMatches.length > 0) {
        reason = `Keywords: ${topMatches.join(", ")}`;
      }
    }

    const qualityFlags: QualityFlags = {
      lowConfidence: confidence < CONFIDENCE_THRESHOLDS.MEDIUM,
      needsHumanReview:
        sentiment === "NEGATIVE" && confidence < CONFIDENCE_THRESHOLDS.HIGH,
      noisyData: text.length < 5 || /^[.\s!?]+$/.test(text),
      usedFallback: false,
    };

    return {
      sentiment,
      sentimentScore: Math.round(sentimentScore * 1000) / 1000,
      confidence: Math.round(confidence * 100) / 100,
      reason,
      language,
      qualityFlags,
    };
  }

  // ---------------------------------------------------------------------------
  // Topic Extraction
  // ---------------------------------------------------------------------------

  extractTopics(text: string, contentTitle?: string): TopicResult {
    const normalizedText = (text + " " + (contentTitle ?? "")).toLowerCase();
    const topicScores: Record<string, number> = {};

    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
      if (score > 0) {
        topicScores[topic] = score;
      }
    }

    // Sort by score
    const sortedTopics = Object.entries(topicScores).sort(
      (a, b) => b[1] - a[1],
    );

    if (sortedTopics.length === 0) {
      return {
        primaryTopic: "기타",
        secondaryTopics: [],
        confidence: 0.3,
        topicSource: "keyword_match",
      };
    }

    const primaryTopic = sortedTopics[0]![0];
    const secondaryTopics = sortedTopics.slice(1, 4).map(([topic]) => topic);

    const maxScore = sortedTopics[0]![1];
    const confidence = Math.min(0.5 + maxScore * 0.15, 0.95);

    return {
      primaryTopic,
      secondaryTopics,
      confidence: Math.round(confidence * 100) / 100,
      topicSource: "keyword_match",
    };
  }

  // ---------------------------------------------------------------------------
  // Question Detection
  // ---------------------------------------------------------------------------

  detectQuestion(text: string): QuestionDetectionResult {
    const patterns = [...QUESTION_PATTERNS_KO, ...QUESTION_PATTERNS_EN];
    let isQuestion = false;
    let matchCount = 0;

    for (const pattern of patterns) {
      if (pattern.test(text)) {
        isQuestion = true;
        matchCount++;
      }
    }

    if (!isQuestion) {
      return {
        isQuestion: false,
        questionType: null,
        normalizedQuestion: null,
        confidence: 0.9, // confident it's NOT a question
      };
    }

    // Determine question type
    let questionType: string | null = "general";
    for (const { pattern, type } of QUESTION_TYPE_PATTERNS) {
      if (pattern.test(text)) {
        questionType = type;
        break;
      }
    }

    // Normalize question text (trim, remove excessive punctuation)
    const normalizedQuestion = text
      .replace(/[!]{2,}/g, "!")
      .replace(/[?]{2,}/g, "?")
      .trim();

    const confidence = Math.min(0.5 + matchCount * 0.15, 0.95);

    return {
      isQuestion,
      questionType,
      normalizedQuestion,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Risk Detection
  // ---------------------------------------------------------------------------

  detectRisk(text: string, sentiment: SentimentResult): RiskDetectionResult {
    const normalizedText = text.toLowerCase();
    const riskIndicators: string[] = [];
    let riskScore = 0;

    // Check escalation words
    for (const word of RISK_ESCALATION_WORDS) {
      if (normalizedText.includes(word.toLowerCase())) {
        riskIndicators.push(word);
        riskScore += 2;
      }
    }

    // Check critical risk words
    for (const word of CRITICAL_RISK_WORDS) {
      if (normalizedText.includes(word.toLowerCase())) {
        riskIndicators.push(word);
        riskScore += 5;
      }
    }

    // Negative sentiment amplifies risk
    if (sentiment.sentiment === "NEGATIVE") {
      riskScore += 1;
      if (sentiment.sentimentScore < -0.5) {
        riskScore += 1;
      }
    }

    // Strong negative language
    if (/사기|거짓|가짜|scam|fraud|fake/i.test(normalizedText)) {
      riskScore += 2;
      if (!riskIndicators.includes("사기"))
        riskIndicators.push("strong_negative_language");
    }

    // Determine risk level
    let isRisk = false;
    let riskLevel: RiskLevel | null = null;

    if (riskScore >= 5) {
      isRisk = true;
      riskLevel = "CRITICAL";
    } else if (riskScore >= 3) {
      isRisk = true;
      riskLevel = "HIGH";
    } else if (riskScore >= 2) {
      isRisk = true;
      riskLevel = "MEDIUM";
    } else if (riskScore >= 1 && sentiment.sentiment === "NEGATIVE") {
      isRisk = true;
      riskLevel = "LOW";
    }

    const confidence = isRisk
      ? Math.min(0.5 + riskIndicators.length * 0.1, 0.95)
      : 0.8;

    return {
      isRisk,
      riskLevel,
      riskIndicators,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  // ---------------------------------------------------------------------------
  // Spam Detection
  // ---------------------------------------------------------------------------

  detectSpam(text: string): boolean {
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private detectLanguage(text: string): string {
    const koreanChars = (text.match(/[\uac00-\ud7af]/g) ?? []).length;
    const totalChars = text.replace(/\s/g, "").length || 1;
    const koreanRatio = koreanChars / totalChars;

    if (koreanRatio > 0.3) return "ko";
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "ja";
    if (/[\u4e00-\u9fff]/.test(text)) return "zh";
    return "en";
  }

  private generateSuggestedReplyHint(questionType: string): string {
    switch (questionType) {
      case "how_to":
        return "사용 가이드 또는 튜토리얼 링크를 안내해 주세요.";
      case "why":
        return "원인을 설명하고 해결 방안을 안내해 주세요.";
      case "comparison":
        return "주요 차이점과 각 제품의 장점을 비교하여 안내해 주세요.";
      case "recommendation":
        return "용도와 예산에 맞는 추천 제품을 안내해 주세요.";
      case "price":
        return "가격 정보 및 현재 진행 중인 할인/이벤트를 안내해 주세요.";
      case "availability":
        return "재고 현황 및 구매 가능 채널을 안내해 주세요.";
      default:
        return "질문에 대한 답변을 준비해 주세요.";
    }
  }
}
