// ---------------------------------------------------------------------------
// keyword-expander.ts - ListeningMind 급 키워드 확장 파이프라인
// ---------------------------------------------------------------------------
// BFS 기반으로 시드 키워드에서 출발하여 다양한 소스(자동완성, 연관 검색어,
// 질문형, 시즈널, 공동 검색어 등)를 통해 키워드를 확장한다.
// ---------------------------------------------------------------------------

import type { ExpandedKeyword, KeywordSource } from "../types";

// ---------------------------------------------------------------------------
// 한국어 접미사 사전 (카테고리별)
// ---------------------------------------------------------------------------

const AUTOCOMPLETE_SUFFIXES: Record<string, string[]> = {
  general: [
    "추천",
    "비교",
    "순위",
    "종류",
    "방법",
    "가격",
    "후기",
    "장점",
    "단점",
    "차이",
    "정리",
    "정보",
    "사이트",
    "앱",
  ],
  tech: [
    "사용법",
    "설정",
    "오류",
    "업데이트",
    "대안",
    "플러그인",
    "API",
    "튜토리얼",
    "성능",
    "보안",
    "호환성",
    "무료",
  ],
  product: [
    "가격",
    "할인",
    "쿠폰",
    "구매",
    "리뷰",
    "스펙",
    "최저가",
    "직구",
    "정품",
    "짝퉁",
    "AS",
    "보증",
  ],
  service: [
    "가입",
    "해지",
    "요금제",
    "고객센터",
    "이용방법",
    "혜택",
    "프로모션",
    "무료체험",
    "프리미엄",
    "환불",
  ],
  beauty: [
    "성분",
    "효과",
    "부작용",
    "사용법",
    "추천",
    "올리브영",
    "랭킹",
    "민감성",
    "지성",
    "건성",
    "피부타입",
  ],
  food: [
    "맛집",
    "레시피",
    "칼로리",
    "효능",
    "부작용",
    "먹는법",
    "보관법",
    "유통기한",
    "원산지",
    "가격",
  ],
  education: [
    "독학",
    "인강",
    "자격증",
    "학원",
    "교재",
    "기출문제",
    "합격률",
    "취업",
    "연봉",
    "전망",
  ],
  finance: [
    "금리",
    "이자",
    "한도",
    "조건",
    "신청",
    "비교",
    "세금",
    "절세",
    "수익률",
    "리스크",
  ],
};

// ---------------------------------------------------------------------------
// 네이버 자동완성 시뮬레이션용 한국어 패턴
// ---------------------------------------------------------------------------

const NAVER_PATTERNS = [
  "{keyword} 하는 법",
  "{keyword} 맛집",
  "{keyword} 가격",
  "{keyword} 뜻",
  "{keyword} 나무위키",
  "{keyword} 디시",
  "{keyword} 블로그",
  "{keyword} 카페",
  "{keyword} 지식인",
  "{keyword} 후기",
  "{keyword} 이벤트",
  "{keyword} 할인",
];

// ---------------------------------------------------------------------------
// 연관 검색어 패턴
// ---------------------------------------------------------------------------

const RELATED_PATTERNS = [
  "{keyword} vs",
  "{keyword} 대체",
  "{keyword} 대안",
  "{keyword} 같은",
  "최고의 {keyword}",
  "{keyword} 입문",
  "{keyword} 고급",
  "{keyword} 실전",
  "{keyword} 활용",
  "{keyword} 트렌드",
];

// ---------------------------------------------------------------------------
// 5W1H 질문 생성 (한국어)
// ---------------------------------------------------------------------------

const QUESTION_TEMPLATES: { prefix: string; questionType: string }[] = [
  { prefix: "누가 {keyword}을 사용하나", questionType: "who" },
  { prefix: "{keyword}이란 무엇인가", questionType: "what" },
  { prefix: "{keyword} 언제 사용하나", questionType: "when" },
  { prefix: "{keyword} 어디서 구하나", questionType: "where" },
  { prefix: "왜 {keyword}이 필요한가", questionType: "why" },
  { prefix: "어떻게 {keyword}을 시작하나", questionType: "how" },
  { prefix: "{keyword} 누가 만들었나", questionType: "who" },
  { prefix: "{keyword} 무엇이 다른가", questionType: "what" },
  { prefix: "{keyword} 언제 출시되나", questionType: "when" },
  { prefix: "{keyword} 어디에 적용하나", questionType: "where" },
  { prefix: "{keyword} 왜 인기인가", questionType: "why" },
  { prefix: "{keyword} 어떻게 활용하나", questionType: "how" },
];

// ---------------------------------------------------------------------------
// 시간적 키워드 (Before / After 의도)
// ---------------------------------------------------------------------------

const TEMPORAL_BEFORE = [
  "뜻",
  "종류",
  "이란",
  "시작하기",
  "입문",
  "왜",
  "필요성",
  "고려사항",
  "선택기준",
];

const TEMPORAL_AFTER = [
  "후기",
  "결과",
  "효과",
  "성공사례",
  "실패",
  "활용",
  "고급",
  "심화",
  "다음단계",
  "유지보수",
];

// ---------------------------------------------------------------------------
// 공동 검색 쌍 (co-search)
// ---------------------------------------------------------------------------

const CO_SEARCH_PAIRS: Record<string, string[]> = {
  맥북: ["아이패드", "윈도우 노트북", "맥미니"],
  아이폰: ["갤럭시", "에어팟", "케이스"],
  다이어트: ["운동", "식단", "칼로리"],
  투자: ["주식", "부동산", "코인"],
  코딩: ["파이썬", "자바스크립트", "개발자"],
  영어: ["토익", "회화", "유학"],
  이직: ["연봉", "면접", "포트폴리오"],
};

// ---------------------------------------------------------------------------
// 계절 키워드
// ---------------------------------------------------------------------------

const SEASONAL_KEYWORDS: { suffix: string; months: number[] }[] = [
  { suffix: "여름 {keyword}", months: [6, 7, 8] },
  { suffix: "겨울 {keyword}", months: [11, 12, 1] },
  { suffix: "봄 {keyword}", months: [3, 4, 5] },
  { suffix: "가을 {keyword}", months: [9, 10, 11] },
  { suffix: "{keyword} 추석", months: [9] },
  { suffix: "{keyword} 설날", months: [1, 2] },
  { suffix: "{keyword} 크리스마스", months: [12] },
  { suffix: "{keyword} 여름휴가", months: [7, 8] },
  { suffix: "{keyword} 신학기", months: [3] },
  { suffix: "{keyword} 연말정산", months: [1, 2] },
  { suffix: "{keyword} 블프", months: [11] },
];

// ---------------------------------------------------------------------------
// 키워드 카테고리 감지용 신호어
// ---------------------------------------------------------------------------

const CATEGORY_SIGNALS: Record<string, string[]> = {
  tech: [
    "개발",
    "코딩",
    "프로그래밍",
    "API",
    "서버",
    "앱",
    "소프트웨어",
    "AI",
    "클라우드",
    "데이터",
  ],
  product: [
    "구매",
    "제품",
    "상품",
    "가격",
    "할인",
    "스펙",
    "리뷰",
    "최저가",
    "직구",
  ],
  service: ["서비스", "가입", "해지", "요금", "구독", "플랜", "이용"],
  beauty: [
    "화장품",
    "스킨케어",
    "메이크업",
    "피부",
    "미백",
    "주름",
    "선크림",
    "세럼",
  ],
  food: ["맛집", "레시피", "요리", "음식", "식당", "카페", "배달", "디저트"],
  education: ["학습", "공부", "시험", "자격증", "학원", "인강", "독학", "교육"],
  finance: [
    "투자",
    "주식",
    "금융",
    "대출",
    "보험",
    "연금",
    "세금",
    "저축",
    "코인",
  ],
};

// ---------------------------------------------------------------------------
// 유틸리티 함수
// ---------------------------------------------------------------------------

/**
 * 키워드 카테고리를 감지한다.
 * 키워드에 포함된 신호어(signal word)를 기반으로 판단하며,
 * 매칭되는 카테고리가 없으면 "general"을 반환한다.
 */
export function detectKeywordCategory(keyword: string): string {
  for (const [category, signals] of Object.entries(CATEGORY_SIGNALS)) {
    if (signals.some((signal) => keyword.includes(signal))) {
      return category;
    }
  }
  return "general";
}

/**
 * 검색량을 추정한다.
 * depth가 깊을수록 검색량이 줄어들며, 한국어 키워드 길이에 따른 가중치를 적용한다.
 * 짧은 키워드일수록 검색량이 높고, 너무 긴 키워드는 검색량이 낮다.
 */
export function estimateSearchVolume(keyword: string, depth: number): number {
  // 기본 검색량: depth 0 = 10000, depth 1 = 3000, depth 2 = 800 ...
  const baseVolume = Math.max(100, 10000 / Math.pow(3, depth));

  // 한국어 글자 수 기반 가중치 (2~4자 최적, 그 이상은 감소)
  const charCount = keyword.replace(/\s/g, "").length;
  let lengthWeight: number;
  if (charCount <= 2) {
    lengthWeight = 1.3;
  } else if (charCount <= 4) {
    lengthWeight = 1.0;
  } else if (charCount <= 7) {
    lengthWeight = 0.7;
  } else if (charCount <= 10) {
    lengthWeight = 0.4;
  } else {
    lengthWeight = 0.2;
  }

  // 약간의 랜덤 변동 추가 (+-20%)
  const noise = 0.8 + Math.random() * 0.4;

  return Math.round(baseVolume * lengthWeight * noise);
}

/**
 * 트렌드 점수를 추정한다.
 * 특정 패턴(2025, 2026, AI 등)이 포함된 키워드는 상승 트렌드로,
 * 과거 연도나 구버전 등은 하락 트렌드로 판단한다.
 */
export function estimateTrendScore(keyword: string): number {
  // 상승 트렌드 신호
  const risingSignals = [
    "2025",
    "2026",
    "AI",
    "GPT",
    "신규",
    "최신",
    "트렌드",
    "핫",
  ];
  // 하락 트렌드 신호
  const decliningSignals = ["2023", "2022", "구버전", "단종", "폐지", "레거시"];

  let score = 50; // 기본 중립 점수

  for (const signal of risingSignals) {
    if (keyword.includes(signal)) {
      score += 15;
    }
  }

  for (const signal of decliningSignals) {
    if (keyword.includes(signal)) {
      score -= 15;
    }
  }

  // 0~100 범위로 클램핑
  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// BFS 큐 항목 내부 타입
// ---------------------------------------------------------------------------

interface QueueItem {
  keyword: string;
  depth: number;
  parentKeyword?: string;
  source: KeywordSource;
  questionType?: string;
  seasonalPeak?: number[];
}

// ---------------------------------------------------------------------------
// 소스별 키워드 생성기
// ---------------------------------------------------------------------------

/**
 * Google 자동완성 시뮬레이션
 * 카테고리별 접미사를 조합하여 키워드를 확장한다.
 */
function generateGoogleAutocomplete(
  seed: string,
  category: string,
): QueueItem[] {
  const suffixes =
    AUTOCOMPLETE_SUFFIXES[category] ?? AUTOCOMPLETE_SUFFIXES["general"] ?? [];
  return suffixes.map((suffix) => ({
    keyword: `${seed} ${suffix}`,
    depth: 0, // 호출 시 현재 depth + 1로 덮어씀
    source: "google_autocomplete" as KeywordSource,
  }));
}

/**
 * 연관 검색어 시뮬레이션
 * 패턴 기반으로 연관 키워드를 생성한다.
 */
function generateRelatedSearches(seed: string): QueueItem[] {
  return RELATED_PATTERNS.map((pattern) => ({
    keyword: pattern.replace("{keyword}", seed),
    depth: 0,
    source: "related_search" as KeywordSource,
  }));
}

/**
 * 네이버 자동완성 시뮬레이션
 * 한국 사용자 특화 패턴(~하는 법, ~맛집 등)을 적용한다.
 */
function generateNaverAutocomplete(seed: string): QueueItem[] {
  return NAVER_PATTERNS.map((pattern) => ({
    keyword: pattern.replace("{keyword}", seed),
    depth: 0,
    source: "naver_autocomplete" as KeywordSource,
  }));
}

/**
 * 5W1H 질문형 키워드 생성
 * 누가/무엇/언제/어디서/왜/어떻게 형식의 질문 키워드를 만든다.
 */
function generateQuestions(seed: string): QueueItem[] {
  return QUESTION_TEMPLATES.map((tmpl) => ({
    keyword: tmpl.prefix.replace("{keyword}", seed),
    depth: 0,
    source: "question_5w1h" as KeywordSource,
    questionType: tmpl.questionType,
  }));
}

/**
 * 시간적 키워드 생성 (Before / After 의도)
 * 사용자의 탐색 여정에서 사전/사후 의도를 반영한다.
 */
function generateTemporalKeywords(seed: string): QueueItem[] {
  const before = TEMPORAL_BEFORE.map((suffix) => ({
    keyword: `${seed} ${suffix}`,
    depth: 0,
    source: "temporal" as KeywordSource,
  }));

  const after = TEMPORAL_AFTER.map((suffix) => ({
    keyword: `${seed} ${suffix}`,
    depth: 0,
    source: "temporal" as KeywordSource,
  }));

  return [...before, ...after];
}

/**
 * 공동 검색 쌍 생성
 * 함께 자주 검색되는 키워드 쌍을 반환한다.
 */
function generateCoSearchPairs(seed: string): QueueItem[] {
  const results: QueueItem[] = [];

  for (const [key, pairs] of Object.entries(CO_SEARCH_PAIRS)) {
    if (seed.includes(key)) {
      for (const pair of pairs) {
        results.push({
          keyword: `${seed} ${pair}`,
          depth: 0,
          source: "co_search" as KeywordSource,
        });
      }
    }
  }

  return results;
}

/**
 * 계절 키워드 생성
 * 시즈널 변형 키워드와 해당 월 정보를 함께 반환한다.
 */
function generateSeasonalKeywords(seed: string): QueueItem[] {
  return SEASONAL_KEYWORDS.map((entry) => ({
    keyword: entry.suffix.replace("{keyword}", seed),
    depth: 0,
    source: "seasonal" as KeywordSource,
    seasonalPeak: entry.months,
  }));
}

// ---------------------------------------------------------------------------
// 메인 확장 함수
// ---------------------------------------------------------------------------

/**
 * BFS 기반 키워드 확장 파이프라인
 *
 * 시드 키워드에서 출발하여 Google/Naver 자동완성, 연관 검색어, 5W1H 질문형,
 * 시간적 의도(Before/After), 공동 검색쌍, 계절 키워드 등 7가지 소스를 통해
 * 키워드를 재귀적으로 확장한다.
 *
 * @param seedKeyword  - 시드 키워드 (시작점)
 * @param maxDepth     - 최대 탐색 깊이 (0이면 시드만)
 * @param maxKeywords  - 최대 확장 키워드 수
 * @param options      - 추가 옵션 (질문형 포함 여부, 시즈널 포함 여부)
 * @returns 확장된 키워드 배열
 */
export async function expandKeywords(
  seedKeyword: string,
  maxDepth: number,
  maxKeywords: number,
  options?: {
    includeQuestions?: boolean;
    includeSeasonality?: boolean;
  },
): Promise<ExpandedKeyword[]> {
  const includeQuestions = options?.includeQuestions ?? true;
  const includeSeasonality = options?.includeSeasonality ?? true;

  // 중복 방지를 위한 Set
  const visited = new Set<string>();
  // BFS 큐
  const queue: QueueItem[] = [];
  // 결과 배열
  const results: ExpandedKeyword[] = [];

  // 시드 키워드의 카테고리 감지
  const seedCategory = detectKeywordCategory(seedKeyword);

  // ---------------------------------------------------------------------------
  // 시드 키워드를 결과에 추가
  // ---------------------------------------------------------------------------
  visited.add(seedKeyword);
  results.push({
    keyword: seedKeyword,
    source: "seed" as KeywordSource,
    depth: 0,
    searchVolume: estimateSearchVolume(seedKeyword, 0),
    trendScore: estimateTrendScore(seedKeyword),
    parentKeyword: null,
    trend:
      estimateTrendScore(seedKeyword) > 0.2
        ? "rising"
        : estimateTrendScore(seedKeyword) < -0.2
          ? "declining"
          : "stable",
    isRising: estimateTrendScore(seedKeyword) > 0.3,
  });

  // ---------------------------------------------------------------------------
  // 시드 키워드에서 1차 확장 후보들을 큐에 추가
  // ---------------------------------------------------------------------------
  const initialCandidates: QueueItem[] = [
    ...generateGoogleAutocomplete(seedKeyword, seedCategory),
    ...generateRelatedSearches(seedKeyword),
    ...generateNaverAutocomplete(seedKeyword),
    ...generateTemporalKeywords(seedKeyword),
    ...generateCoSearchPairs(seedKeyword),
  ];

  if (includeQuestions) {
    initialCandidates.push(...generateQuestions(seedKeyword));
  }

  if (includeSeasonality) {
    initialCandidates.push(...generateSeasonalKeywords(seedKeyword));
  }

  // depth를 1로 설정하여 큐에 추가
  for (const candidate of initialCandidates) {
    candidate.depth = 1;
    candidate.parentKeyword = seedKeyword;
    queue.push(candidate);
  }

  // ---------------------------------------------------------------------------
  // BFS 탐색 루프
  // ---------------------------------------------------------------------------
  while (queue.length > 0 && results.length < maxKeywords) {
    const item = queue.shift()!;

    // 이미 방문한 키워드는 스킵
    if (visited.has(item.keyword)) {
      continue;
    }

    // 키워드를 방문 처리하고 결과에 추가
    visited.add(item.keyword);

    const ts = estimateTrendScore(item.keyword);
    const expandedKeyword: ExpandedKeyword = {
      keyword: item.keyword,
      source: item.source,
      depth: item.depth,
      searchVolume: estimateSearchVolume(item.keyword, item.depth),
      trendScore: ts,
      trend: ts > 0.2 ? "rising" : ts < -0.2 ? "declining" : "stable",
      isRising: ts > 0.3,
      parentKeyword: item.parentKeyword ?? null,
    };

    // 질문형 키워드인 경우 questionType 추가
    if (item.questionType) {
      expandedKeyword.questionType = item.questionType;
    }

    // 시즈널 키워드인 경우 seasonalPeak 추가
    if (item.seasonalPeak && item.seasonalPeak.length > 0) {
      expandedKeyword.seasonalPeak = `${item.seasonalPeak[0]}월`;
    }

    results.push(expandedKeyword);

    // ---------------------------------------------------------------------------
    // 현재 depth가 maxDepth 미만이면 다음 레벨 후보를 큐에 추가
    // depth가 깊어질수록 생성하는 후보 수를 줄여 폭발을 방지한다.
    // ---------------------------------------------------------------------------
    if (item.depth < maxDepth) {
      const nextDepth = item.depth + 1;
      const category = detectKeywordCategory(item.keyword);

      // depth가 깊어질수록 소스를 제한 (핵심 소스만 사용)
      const nextCandidates: QueueItem[] = [
        ...generateGoogleAutocomplete(item.keyword, category).slice(0, 3),
        ...generateRelatedSearches(item.keyword).slice(0, 2),
      ];

      // depth 2 이하에서만 질문형 생성
      if (includeQuestions && nextDepth <= 2) {
        nextCandidates.push(...generateQuestions(item.keyword).slice(0, 3));
      }

      for (const candidate of nextCandidates) {
        candidate.depth = nextDepth;
        candidate.parentKeyword = item.keyword;
        queue.push(candidate);
      }
    }
  }

  return results;
}
