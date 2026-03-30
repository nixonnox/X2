/**
 * VerticalIndustrySuggester
 *
 * seedKeyword / cluster / category 기반으로 업종을 추론하는 서비스.
 *
 * 하는 일:
 * 1. seedKeyword → 업종 키워드 매칭
 * 2. cluster 주제 → 업종 관련성 스코어링
 * 3. category → 업종 직접 매핑
 * 4. 복수 시그널 결합 → 최종 추천 + confidence
 *
 * 규칙:
 * - 단일 키워드로 단정하지 않음 (복수 시그널 결합)
 * - confidence 40% 미만이면 "추천 없음" 반환
 * - 금융은 오탐 방지를 위해 기준이 더 높음 (50%)
 */

import type { IndustryType } from "./types";

// ─── 업종별 키워드 사전 ───────────────────────────────────────────

const INDUSTRY_KEYWORDS: Record<IndustryType, string[]> = {
  BEAUTY: [
    "화장품",
    "스킨케어",
    "메이크업",
    "뷰티",
    "피부",
    "성분",
    "세럼",
    "선크림",
    "클렌저",
    "토너",
    "에센스",
    "파운데이션",
    "립스틱",
    "마스크팩",
    "보습",
    "미백",
    "주름",
    "여드름",
    "모공",
    "각질",
    "콜라겐",
    "레티놀",
    "나이아신아마이드",
    "히알루론산",
    "비타민C",
    "더마",
    "코스메틱",
    "뷰티템",
    "피부타입",
    "지성",
    "건성",
    "복합성",
  ],
  FNB: [
    "맛집",
    "레스토랑",
    "카페",
    "커피",
    "메뉴",
    "음식",
    "배달",
    "프랜차이즈",
    "디저트",
    "빵",
    "치킨",
    "피자",
    "햄버거",
    "한식",
    "중식",
    "일식",
    "양식",
    "분식",
    "야식",
    "브런치",
    "밀키트",
    "편의점",
    "간식",
    "음료",
    "주류",
    "맥주",
    "와인",
    "가성비",
    "맛",
    "식당",
    "외식",
    "배달앱",
    "요리",
    "레시피",
  ],
  FINANCE: [
    "금융",
    "은행",
    "보험",
    "투자",
    "주식",
    "펀드",
    "ETF",
    "대출",
    "금리",
    "이자",
    "적금",
    "예금",
    "카드",
    "신용카드",
    "체크카드",
    "증권",
    "채권",
    "부동산",
    "연금",
    "ISA",
    "핀테크",
    "간편결제",
    "토스",
    "카카오뱅크",
    "네이버페이",
    "자산관리",
    "재테크",
    "저축",
    "수익률",
    "원금",
    "만기",
  ],
  ENTERTAINMENT: [
    "아이돌",
    "연예인",
    "드라마",
    "영화",
    "음악",
    "앨범",
    "콘서트",
    "팬덤",
    "팬",
    "굿즈",
    "컴백",
    "데뷔",
    "뮤직비디오",
    "MV",
    "예능",
    "버라이어티",
    "OTT",
    "넷플릭스",
    "웹툰",
    "웹소설",
    "게임",
    "e스포츠",
    "스트리밍",
    "유튜브",
    "틱톡",
    "공연",
    "뮤지컬",
    "페스티벌",
    "축제",
    "티켓",
    "팬미팅",
  ],
};

// ─── 카테고리 → 업종 매핑 ─────────────────────────────────────────

const CATEGORY_INDUSTRY_MAP: Record<string, IndustryType> = {
  // Beauty
  cosmetics: "BEAUTY",
  skincare: "BEAUTY",
  makeup: "BEAUTY",
  beauty: "BEAUTY",
  personal_care: "BEAUTY",
  // FNB
  food: "FNB",
  beverage: "FNB",
  restaurant: "FNB",
  cafe: "FNB",
  delivery: "FNB",
  fnb: "FNB",
  // Finance
  finance: "FINANCE",
  banking: "FINANCE",
  insurance: "FINANCE",
  investment: "FINANCE",
  fintech: "FINANCE",
  // Entertainment
  entertainment: "ENTERTAINMENT",
  kpop: "ENTERTAINMENT",
  drama: "ENTERTAINMENT",
  movie: "ENTERTAINMENT",
  music: "ENTERTAINMENT",
  gaming: "ENTERTAINMENT",
};

// ─── Types ────────────────────────────────────────────────────────

export type IndustrySuggestion = {
  /** 추천 업종 (없으면 null) */
  suggestedIndustry: IndustryType | null;
  /** 추천 신뢰도 (0-1) */
  confidence: number;
  /** 업종별 스코어 */
  scores: Record<IndustryType, number>;
  /** 매칭된 시그널 */
  matchedSignals: IndustrySignal[];
  /** 추천 근거 요약 */
  reasoning: string;
};

type IndustrySignal = {
  source: "KEYWORD" | "CLUSTER" | "CATEGORY";
  industry: IndustryType;
  matchedTerm: string;
  weight: number;
};

type SuggestionInput = {
  seedKeyword: string;
  /** cluster 주제 (있으면) */
  clusterTopics?: string[];
  /** 카테고리 (있으면) */
  category?: string;
  /** 추가 키워드 (검색어 확장) */
  relatedKeywords?: string[];
};

// ─── Service ──────────────────────────────────────────────────────

export class VerticalIndustrySuggester {
  /**
   * seedKeyword / cluster / category 기반 업종 추론
   */
  suggest(input: SuggestionInput): IndustrySuggestion {
    const signals: IndustrySignal[] = [];

    // 1. seedKeyword 매칭
    signals.push(...this.matchKeyword(input.seedKeyword));

    // 2. relatedKeywords 매칭
    if (input.relatedKeywords) {
      for (const kw of input.relatedKeywords) {
        signals.push(...this.matchKeyword(kw, 0.5));
      }
    }

    // 3. cluster 주제 매칭
    if (input.clusterTopics) {
      for (const topic of input.clusterTopics) {
        signals.push(...this.matchClusterTopic(topic));
      }
    }

    // 4. category 직접 매핑
    if (input.category) {
      const mapped = this.matchCategory(input.category);
      if (mapped) signals.push(mapped);
    }

    // 5. 스코어 집계
    const scores = this.aggregateScores(signals);

    // 6. 최종 추천
    return this.buildSuggestion(scores, signals);
  }

  /**
   * 모든 업종에 대해 스코어 비교를 반환 (preview 비교용)
   */
  scoreAll(input: SuggestionInput): Record<IndustryType, number> {
    const suggestion = this.suggest(input);
    return suggestion.scores;
  }

  // ─── Private ────────────────────────────────────────────────────

  private matchKeyword(keyword: string, weight = 1.0): IndustrySignal[] {
    const signals: IndustrySignal[] = [];
    const normalized = keyword.toLowerCase().trim();

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      for (const kw of keywords) {
        if (normalized.includes(kw) || kw.includes(normalized)) {
          signals.push({
            source: "KEYWORD",
            industry: industry as IndustryType,
            matchedTerm: kw,
            weight: weight * (normalized === kw ? 1.0 : 0.7),
          });
        }
      }
    }

    return signals;
  }

  private matchClusterTopic(topic: string): IndustrySignal[] {
    const signals: IndustrySignal[] = [];
    const normalized = topic.toLowerCase().trim();

    for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
      for (const kw of keywords) {
        if (normalized.includes(kw)) {
          signals.push({
            source: "CLUSTER",
            industry: industry as IndustryType,
            matchedTerm: kw,
            weight: 0.6,
          });
        }
      }
    }

    return signals;
  }

  private matchCategory(category: string): IndustrySignal | null {
    const normalized = category
      .toLowerCase()
      .trim()
      .replace(/[^a-z_]/g, "");
    const industry = CATEGORY_INDUSTRY_MAP[normalized];
    if (!industry) return null;

    return {
      source: "CATEGORY",
      industry,
      matchedTerm: category,
      weight: 1.5,
    };
  }

  private aggregateScores(
    signals: IndustrySignal[],
  ): Record<IndustryType, number> {
    const scores: Record<IndustryType, number> = {
      BEAUTY: 0,
      FNB: 0,
      FINANCE: 0,
      ENTERTAINMENT: 0,
    };

    for (const signal of signals) {
      scores[signal.industry] += signal.weight;
    }

    // 정규화 (0-1)
    const maxScore = Math.max(...Object.values(scores), 0.01);
    for (const industry of Object.keys(scores) as IndustryType[]) {
      scores[industry] = Math.round((scores[industry] / maxScore) * 100) / 100;
    }

    return scores;
  }

  private buildSuggestion(
    scores: Record<IndustryType, number>,
    signals: IndustrySignal[],
  ): IndustrySuggestion {
    const sorted = (Object.entries(scores) as [IndustryType, number][]).sort(
      ([, a], [, b]) => b - a,
    );

    const [topIndustry, topScore] = sorted[0]!;
    const secondEntry = sorted[1];
    const secondScore = secondEntry ? secondEntry[1] : 0;

    // 금융은 오탐 방지: 50% 이상이어야 추천
    const threshold = topIndustry === "FINANCE" ? 0.5 : 0.4;

    // 1위와 2위 차이가 0.15 미만이면 확신 부족
    const gap = topScore - secondScore;
    const hasConfidence = topScore >= threshold && gap >= 0.15;

    if (!hasConfidence || signals.length === 0) {
      return {
        suggestedIndustry: null,
        confidence: topScore,
        scores,
        matchedSignals: signals,
        reasoning:
          signals.length === 0
            ? "매칭되는 업종 시그널이 없습니다."
            : `최고 스코어(${topIndustry}: ${topScore})가 기준 미달이거나 2위와의 차이(${gap.toFixed(2)})가 충분하지 않습니다.`,
      };
    }

    const signalSources = [
      ...new Set(
        signals.filter((s) => s.industry === topIndustry).map((s) => s.source),
      ),
    ];

    return {
      suggestedIndustry: topIndustry,
      confidence: topScore,
      scores,
      matchedSignals: signals,
      reasoning:
        `${topIndustry} 업종 추천 (confidence: ${topScore}, 시그널: ${signalSources.join("+")}). ` +
        `2위 ${secondEntry ? secondEntry[0] : "없음"}(${secondScore})와 ${gap.toFixed(2)} 차이.`,
    };
  }
}
