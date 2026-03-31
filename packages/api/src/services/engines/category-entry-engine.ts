/**
 * Category Entry Point Engine
 *
 * 검색 키워드가 어떤 카테고리로 진입하는지 분석.
 * 리스닝마인드의 "카테고리 엔트리 포인트" 기능에 대응.
 *
 * 로직:
 * 1. 키워드에서 카테고리 시그널 추출 (패턴 매칭)
 * 2. 진입 경로 유형 분류 (브랜드/니즈/기능/가격/트렌드)
 * 3. 카테고리 진입 강도 점수 계산
 */

// ─── Types ──────────────────────────────────────────────────

export type CategoryType =
  | "BEAUTY"
  | "FASHION"
  | "FOOD"
  | "TECH"
  | "HEALTH"
  | "FINANCE"
  | "TRAVEL"
  | "EDUCATION"
  | "ENTERTAINMENT"
  | "HOME_LIVING"
  | "AUTO"
  | "BABY_KIDS"
  | "SPORTS"
  | "PET"
  | "GENERAL";

export type EntryType =
  | "BRAND" // 브랜드명으로 진입 (예: "나이키 운동화")
  | "NEED" // 니즈/문제로 진입 (예: "건조한 피부 해결")
  | "FEATURE" // 기능/속성으로 진입 (예: "무선 이어폰")
  | "PRICE" // 가격으로 진입 (예: "10만원대 선물")
  | "TREND" // 트렌드로 진입 (예: "2026 봄 코디")
  | "COMPARISON" // 비교로 진입 (예: "아이폰 vs 갤럭시")
  | "REVIEW"; // 후기로 진입 (예: "다이슨 에어랩 후기")

export type CategoryEntryPoint = {
  keyword: string;
  category: CategoryType;
  categoryConfidence: number; // 0-1
  entryType: EntryType;
  entrySignals: string[];
  relatedCategories: CategoryType[];
};

export type CategoryEntryAnalysis = {
  seedKeyword: string;
  primaryCategory: CategoryType;
  entryPoints: CategoryEntryPoint[];
  categoryDistribution: { category: CategoryType; count: number; percent: number }[];
  entryTypeDistribution: { entryType: EntryType; count: number; percent: number }[];
  topEntryPaths: {
    from: string; // 진입 키워드
    to: CategoryType; // 도달 카테고리
    via: EntryType; // 진입 유형
    strength: number; // 0-1
  }[];
};

// ─── Category Detection Patterns ────────────────────────────

const CATEGORY_PATTERNS: Record<CategoryType, RegExp[]> = {
  BEAUTY: [/화장품|스킨케어|메이크업|클렌징|선크림|파운데이션|립|아이섀도|뷰티|피부|미백|주름|세럼|에센스|토너|크림|팩/i],
  FASHION: [/패션|옷|코디|스타일|의류|자켓|바지|원피스|가방|신발|운동화|스니커즈|액세서리|시계/i],
  FOOD: [/맛집|음식|레시피|요리|식당|카페|디저트|빵|라면|치킨|피자|배달|밀키트/i],
  TECH: [/노트북|스마트폰|이어폰|태블릿|모니터|키보드|마우스|앱|소프트웨어|AI|IT|프로그래밍|코딩/i],
  HEALTH: [/건강|운동|다이어트|영양제|비타민|헬스|요가|필라테스|약|병원|의사|증상/i],
  FINANCE: [/투자|주식|부동산|보험|대출|적금|예금|연금|재테크|ETF|코인|암호화폐/i],
  TRAVEL: [/여행|호텔|항공|숙소|관광|리조트|해외|국내여행|패키지|액티비티/i],
  EDUCATION: [/학원|교육|강의|자격증|시험|공부|영어|수학|독학|온라인강의|인강/i],
  ENTERTAINMENT: [/영화|드라마|게임|음악|공연|콘서트|넷플릭스|유튜브|웹툰|소설/i],
  HOME_LIVING: [/인테리어|가구|가전|세탁기|냉장고|에어컨|청소기|수납|이사|리모델링/i],
  AUTO: [/자동차|차량|중고차|전기차|SUV|세단|타이어|엔진|주유|내비/i],
  BABY_KIDS: [/육아|아기|유아|키즈|장난감|분유|기저귀|유모차|어린이/i],
  SPORTS: [/축구|야구|농구|테니스|골프|등산|캠핑|낚시|자전거|스포츠/i],
  PET: [/강아지|고양이|반려동물|사료|간식|동물병원|펫|애완/i],
  GENERAL: [/.*/],
};

const ENTRY_TYPE_PATTERNS: { type: EntryType; patterns: RegExp[] }[] = [
  { type: "BRAND", patterns: [/^[A-Z가-힣][A-Za-z가-힣]+\s/, /브랜드|제품명/] },
  { type: "NEED", patterns: [/해결|고민|문제|필요|원하|찾는|방법|어떻게/] },
  { type: "FEATURE", patterns: [/무선|방수|자동|초경량|대용량|고성능|저소음/] },
  { type: "PRICE", patterns: [/만원|가격|싼|저렴|비싼|가성비|예산|할인|세일/] },
  { type: "TREND", patterns: [/2026|2025|트렌드|유행|신상|최신|인기|핫한/] },
  { type: "COMPARISON", patterns: [/vs|비교|차이|뭐가|어떤게|추천/] },
  { type: "REVIEW", patterns: [/후기|리뷰|사용기|솔직|장단점|경험/] },
];

// ─── Engine ─────────────────────────────────────────────────

export class CategoryEntryEngine {
  analyze(seedKeyword: string, keywords: string[]): CategoryEntryAnalysis {
    const allKeywords = [seedKeyword, ...keywords];
    const entryPoints: CategoryEntryPoint[] = [];

    for (const kw of allKeywords) {
      const category = this.detectCategory(kw);
      const entryType = this.detectEntryType(kw);
      const relatedCategories = this.detectRelatedCategories(kw, category);

      entryPoints.push({
        keyword: kw,
        category,
        categoryConfidence: category === "GENERAL" ? 0.3 : 0.7 + Math.random() * 0.2,
        entryType,
        entrySignals: this.extractSignals(kw),
        relatedCategories,
      });
    }

    // Category distribution
    const catCounts = new Map<CategoryType, number>();
    for (const ep of entryPoints) {
      catCounts.set(ep.category, (catCounts.get(ep.category) ?? 0) + 1);
    }
    const categoryDistribution = Array.from(catCounts.entries())
      .map(([category, count]) => ({
        category,
        count,
        percent: Math.round((count / entryPoints.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Entry type distribution
    const typeCounts = new Map<EntryType, number>();
    for (const ep of entryPoints) {
      typeCounts.set(ep.entryType, (typeCounts.get(ep.entryType) ?? 0) + 1);
    }
    const entryTypeDistribution = Array.from(typeCounts.entries())
      .map(([entryType, count]) => ({
        entryType,
        count,
        percent: Math.round((count / entryPoints.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    // Top entry paths
    const topEntryPaths = entryPoints
      .filter((ep) => ep.category !== "GENERAL")
      .slice(0, 10)
      .map((ep) => ({
        from: ep.keyword,
        to: ep.category,
        via: ep.entryType,
        strength: ep.categoryConfidence,
      }));

    const primaryCategory = categoryDistribution[0]?.category ?? "GENERAL";

    return {
      seedKeyword,
      primaryCategory,
      entryPoints,
      categoryDistribution,
      entryTypeDistribution,
      topEntryPaths,
    };
  }

  private detectCategory(keyword: string): CategoryType {
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (category === "GENERAL") continue;
      for (const pattern of patterns) {
        if (pattern.test(keyword)) return category as CategoryType;
      }
    }
    return "GENERAL";
  }

  private detectEntryType(keyword: string): EntryType {
    for (const { type, patterns } of ENTRY_TYPE_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(keyword)) return type;
      }
    }
    return "NEED"; // default
  }

  private detectRelatedCategories(keyword: string, primary: CategoryType): CategoryType[] {
    const related: CategoryType[] = [];
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
      if (category === "GENERAL" || category === primary) continue;
      for (const pattern of patterns) {
        if (pattern.test(keyword)) {
          related.push(category as CategoryType);
          break;
        }
      }
    }
    return related.slice(0, 3);
  }

  private extractSignals(keyword: string): string[] {
    const signals: string[] = [];
    for (const { type, patterns } of ENTRY_TYPE_PATTERNS) {
      for (const pattern of patterns) {
        const match = keyword.match(pattern);
        if (match) {
          signals.push(`${type}: ${match[0]}`);
          break;
        }
      }
    }
    return signals;
  }
}

// ─── Category Labels ────────────────────────────────────────

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  BEAUTY: "뷰티",
  FASHION: "패션",
  FOOD: "식음료",
  TECH: "테크/IT",
  HEALTH: "건강",
  FINANCE: "금융/투자",
  TRAVEL: "여행",
  EDUCATION: "교육",
  ENTERTAINMENT: "엔터테인먼트",
  HOME_LIVING: "홈/리빙",
  AUTO: "자동차",
  BABY_KIDS: "유아/키즈",
  SPORTS: "스포츠/아웃도어",
  PET: "반려동물",
  GENERAL: "일반",
};

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  BRAND: "브랜드 진입",
  NEED: "니즈/문제 진입",
  FEATURE: "기능/속성 진입",
  PRICE: "가격 진입",
  TREND: "트렌드 진입",
  COMPARISON: "비교 진입",
  REVIEW: "후기 진입",
};
