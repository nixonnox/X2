// ─────────────────────────────────────────────────────────────
// Social Gap Index Calculator (Enhanced)
// ─────────────────────────────────────────────────────────────
// 검색량 대비 소셜 콘텐츠 발행량이 적을수록 높은 점수
// → "블루오션" 기회를 수치화
// + 난이도 점수, 기회 점수, 플랫폼별 추천 전략 포함
// ─────────────────────────────────────────────────────────────

import type {
  GapAnalysis,
  SocialPlatform,
  AggregatedSocialVolume,
} from "../types";

// ── Gap Score 계산 ──

/**
 * Social Gap Score 계산 (로그 스케일)
 *
 * 공식:
 *   gapScore = clamp(0, 100,
 *     100 × (1 - log(1 + ratio) / log(1 + 2))
 *   )
 *
 * searchVolume이 높고 socialVolume이 낮을수록 점수 ↑
 * searchVolume이 낮고 socialVolume이 높을수록 점수 ↓
 *
 * supplyDemandRatio: 검색량 대비 적정 콘텐츠 수 비율 (기본 0.5)
 * → searchVolume 1000일 때 socialVolume 500이면 균형 (gapScore ≈ 0)
 */
export function calculateGapScore(
  searchVolume: number,
  socialVolume: number,
  supplyDemandRatio = 0.5,
): number {
  if (searchVolume <= 0) return 0;

  const expectedSupply = searchVolume * supplyDemandRatio;
  const ratio = socialVolume / expectedSupply;

  // 로그 스케일로 극단값 완화
  const logRatio = Math.log1p(ratio) / Math.log1p(2);

  const rawScore = (1 - logRatio) * 100;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

// ── Gap Level 분류 ──

/**
 * Gap Level 분류
 * - blue_ocean: 70+ (콘텐츠 공급 극히 부족)
 * - opportunity: 40-69 (기회 영역)
 * - competitive: 20-39 (경쟁 시장)
 * - saturated: 0-19 (포화 시장)
 */
export function getGapLevel(
  gapScore: number,
): "blue_ocean" | "opportunity" | "competitive" | "saturated" {
  if (gapScore >= 70) return "blue_ocean";
  if (gapScore >= 40) return "opportunity";
  if (gapScore >= 20) return "competitive";
  return "saturated";
}

// ── 난이도 점수 계산 ──

/**
 * 콘텐츠 생산 난이도 점수 (0-100)
 *
 * 경쟁 밀도가 높고 콘텐츠 신선도가 높을수록 → 어려움 (높은 점수)
 * 경쟁 밀도가 낮고 콘텐츠 신선도가 낮을수록 → 쉬움 (낮은 점수)
 * 검색량이 높을수록 약간의 난이도 가중치 추가
 */
export function calculateDifficultyScore(
  searchVolume: number,
  socialData: AggregatedSocialVolume | undefined,
): number {
  if (!socialData) {
    // 소셜 데이터 없으면 검색량 기반으로만 추정
    const volumeFactor = Math.min(
      1,
      Math.log1p(searchVolume) / Math.log1p(50000),
    );
    return Math.round(volumeFactor * 50);
  }

  const competition = socialData.avgCompetitionDensity; // 0-100
  const freshness = socialData.avgFreshness; // 0-1
  const volumeFactor = Math.min(
    1,
    Math.log1p(searchVolume) / Math.log1p(50000),
  );

  // 가중 합산: 경쟁 밀도 50%, 신선도 30%, 검색량 20%
  const rawScore =
    competition * 0.5 + freshness * 100 * 0.3 + volumeFactor * 100 * 0.2;

  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

// ── 기회 점수 계산 ──

/**
 * 종합 기회 점수 (0-100)
 *
 * 높은 갭 + 낮은 난이도 + 높은 검색량 + 상승 트렌드 = 최고 기회
 *
 * 공식:
 *   opportunityScore = gapWeight + difficultyWeight + volumeWeight + trendBonus
 *   - gapWeight: gapScore × 0.35
 *   - difficultyWeight: (100 - difficultyScore) × 0.25  (난이도 역수)
 *   - volumeWeight: volumeFactor × 0.25
 *   - trendBonus: isRising ? 15 : 0
 */
export function calculateOpportunityScore(
  gapScore: number,
  difficultyScore: number,
  searchVolume: number,
  isRising: boolean,
): number {
  // 검색량을 0-100 스케일로 정규화 (로그 스케일)
  const volumeFactor = Math.min(
    100,
    (Math.log1p(searchVolume) / Math.log1p(50000)) * 100,
  );

  const gapWeight = gapScore * 0.35;
  const difficultyWeight = (100 - difficultyScore) * 0.25;
  const volumeWeight = volumeFactor * 0.25;
  const trendBonus = isRising ? 15 : 0;

  const rawScore = gapWeight + difficultyWeight + volumeWeight + trendBonus;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

// ── 플랫폼별 추천 전략 생성 ──

/** 플랫폼별 콘텐츠 추천 (한국어) */
function getPlatformRecommendation(
  platform: SocialPlatform,
  gapScore: number,
  freshness: number,
): string {
  if (gapScore >= 70) {
    // 블루오션 — 적극 진입 추천
    const recommendations: Record<SocialPlatform, string> = {
      youtube: "YouTube 숏폼/롱폼 콘텐츠 제작 강력 추천 — 경쟁 매우 낮음",
      instagram: "인스타그램 카로셀 포스트 및 릴스 기회 — 선점 효과 극대화",
      tiktok: "TikTok 숏폼 영상 즉시 제작 추천 — 바이럴 가능성 높음",
      naver_blog: "네이버 블로그 SEO 최적화 포스트 작성 — 검색 상위 노출 용이",
      google: "SEO 최적화 웹 콘텐츠 제작 — 검색 결과 상위 진입 기회",
    };
    return recommendations[platform];
  }

  if (gapScore >= 40) {
    // 기회 영역 — 차별화 필요
    const recommendations: Record<SocialPlatform, string> = {
      youtube: "YouTube 숏폼 콘텐츠 제작 추천 — 차별화된 앵글 필요",
      instagram: "인스타그램 카로셀 포스트 기회 — 비주얼 차별화 중요",
      tiktok: "TikTok 트렌드 활용 콘텐츠 — 독창적 편집 스타일 필요",
      naver_blog: "네이버 블로그 심층 리뷰 작성 — 전문성 강조",
      google: "롱테일 키워드 타겟 콘텐츠 — 니치 영역 공략",
    };
    return recommendations[platform];
  }

  if (freshness > 0.7) {
    // 경쟁/포화 + 높은 신선도 — 최신 트렌드 빠른 대응 필요
    const recommendations: Record<SocialPlatform, string> = {
      youtube: "YouTube 빠른 트렌드 반응 콘텐츠 — 속도가 핵심",
      instagram: "인스타그램 스토리 및 실시간 콘텐츠 — 즉시성 중요",
      tiktok: "TikTok 트렌드 챌린지 참여 — 빠른 대응 필수",
      naver_blog: "네이버 블로그 속보성 포스트 — 최신 정보 우선",
      google: "뉴스/속보 형태 콘텐츠 — 시의성 확보",
    };
    return recommendations[platform];
  }

  // 경쟁/포화 시장 — 진입 신중
  const recommendations: Record<SocialPlatform, string> = {
    youtube: "YouTube 진입 신중 — 독보적 전문성 또는 니치 앵글 필수",
    instagram: "인스타그램 진입 어려움 — 강력한 비주얼 브랜딩 필요",
    tiktok: "TikTok 경쟁 치열 — 독창적 포맷 없이는 노출 어려움",
    naver_blog: "네이버 블로그 경쟁 높음 — 깊이 있는 전문 콘텐츠 필요",
    google: "SEO 경쟁 치열 — 백링크 및 도메인 권위 필요",
  };
  return recommendations[platform];
}

// ── 콘텐츠 제안 생성 ──

/** 갭 레벨과 플랫폼 갭 기반 콘텐츠 제안 생성 */
function generateContentSuggestions(
  keyword: string,
  gapLevel: "blue_ocean" | "opportunity" | "competitive" | "saturated",
  platformGaps: GapAnalysis["platformGaps"],
): string[] {
  const suggestions: string[] = [];

  // 갭 레벨 기반 전략적 제안
  switch (gapLevel) {
    case "blue_ocean":
      suggestions.push(
        `"${keyword}" 관련 입문자용 가이드 콘텐츠 — 선점 효과 극대화`,
        `"${keyword}" 종합 비교/리뷰 콘텐츠 — 레퍼런스 포지셔닝`,
      );
      break;
    case "opportunity":
      suggestions.push(
        `"${keyword}" 심층 분석 및 전문가 인사이트 콘텐츠`,
        `"${keyword}" 실사용 후기/체험 콘텐츠 — 신뢰도 차별화`,
      );
      break;
    case "competitive":
      suggestions.push(
        `"${keyword}" 니치 세그먼트 타겟 콘텐츠 — 롱테일 전략`,
        `"${keyword}" 데이터 기반 비교 분석 — 독자적 리서치 차별화`,
      );
      break;
    case "saturated":
      suggestions.push(
        `"${keyword}" 관련 신규 앵글 발굴 — 기존 콘텐츠와 완전히 다른 관점 필요`,
      );
      break;
  }

  // 플랫폼 갭 기반 제안 (갭이 큰 상위 2개 플랫폼)
  const topGapPlatforms = platformGaps
    .filter((pg) => pg.gapScore >= 40)
    .slice(0, 2);

  for (const pg of topGapPlatforms) {
    switch (pg.platform) {
      case "youtube":
        suggestions.push(
          `YouTube 숏폼 콘텐츠 제작 추천 — "${keyword}" 관련 영상 공급 부족`,
        );
        break;
      case "instagram":
        suggestions.push(
          `인스타그램 카로셀 포스트 기회 — "${keyword}" 비주얼 콘텐츠 수요 높음`,
        );
        break;
      case "tiktok":
        suggestions.push(
          `TikTok 숏폼 영상 기회 — "${keyword}" 바이럴 잠재력 높음`,
        );
        break;
      case "naver_blog":
        suggestions.push(
          `네이버 블로그 SEO 포스트 — "${keyword}" 검색 노출 기회`,
        );
        break;
      case "google":
        suggestions.push(
          `SEO 최적화 웹 콘텐츠 — "${keyword}" 검색 결과 상위 진입 가능`,
        );
        break;
    }
  }

  return suggestions;
}

// ── 전체 Gap 분석 ──

/**
 * 전체 Gap 분석 결과 생성
 *
 * 포함 항목:
 * - gapScore: 검색량 대비 소셜 콘텐츠 갭 점수
 * - difficultyScore: 콘텐츠 생산 난이도
 * - opportunityScore: 종합 기회 점수
 * - platformGaps: 플랫폼별 갭 + 신선도 + 추천 전략
 * - contentSuggestions: 추천 콘텐츠 주제
 */
export function analyzeGap(
  keyword: string,
  searchVolume: number,
  socialData: AggregatedSocialVolume | undefined,
  isRising: boolean = false,
): GapAnalysis {
  const socialVolume = socialData?.totalContentCount || 0;
  const gapScore = calculateGapScore(searchVolume, socialVolume);
  const gapLevel = getGapLevel(gapScore);

  // 난이도 및 기회 점수 계산
  const difficultyScore = calculateDifficultyScore(searchVolume, socialData);
  const opportunityScore = calculateOpportunityScore(
    gapScore,
    difficultyScore,
    searchVolume,
    isRising,
  );

  // 플랫폼별 갭 분석
  const platformGaps: GapAnalysis["platformGaps"] = [];

  if (socialData) {
    const platformCount = socialData.platformBreakdown.length || 1;

    for (const entry of socialData.platformBreakdown) {
      const platformGapScore = calculateGapScore(
        searchVolume / platformCount, // 플랫폼당 검색량 분배
        entry.contentCount,
      );

      const freshness = entry.contentFreshness;
      const recommendation = getPlatformRecommendation(
        entry.platform,
        platformGapScore,
        freshness,
      );

      platformGaps.push({
        platform: entry.platform,
        contentCount: entry.contentCount,
        gapScore: platformGapScore,
        freshness,
        recommendation,
      });
    }
  }

  // 갭이 큰 순서로 정렬
  platformGaps.sort((a, b) => b.gapScore - a.gapScore);

  // 콘텐츠 제안 생성
  const contentSuggestions = generateContentSuggestions(
    keyword,
    gapLevel,
    platformGaps,
  );

  return {
    keyword,
    searchVolume,
    socialVolume,
    gapScore,
    gapLevel,
    difficultyScore,
    opportunityScore,
    platformGaps,
    contentSuggestions,
  };
}
