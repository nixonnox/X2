// ─────────────────────────────────────────────────────────────
// Social Volume Collector (Enhanced)
// ─────────────────────────────────────────────────────────────
// 키워드별 소셜 미디어 콘텐츠 발행량 수집/추정
// YouTube, Instagram, TikTok, Naver Blog, Google 볼륨 + 참여율 + 신선도 + 경쟁 밀도
//
// 운영 환경 연동 포인트:
// - YouTube Data API v3: search.list (q=keyword, part=id,snippet,statistics)
// - Instagram Graph API: ig_hashtag_search + top_media + recent_media
// - TikTok Research API: /v2/research/video/query/, /v2/research/hashtag/
// - Naver Search API: blog.json, datalab/search (query=keyword)
// - Google Custom Search API: cx search, Google Trends API
//
// Rate Limiting 전략:
// - YouTube: 일일 10,000 units 쿼터. search.list = 100 units/call
// - Instagram: 시간당 200회 호출. 429 시 지수 백오프 적용
// - TikTok: 일일 1,000회. 요청 간 최소 100ms 간격
// - Naver: 일일 25,000회. 초당 10회 제한
// - Google: 일일 10,000회 (유료), 무료 티어 100회
// ─────────────────────────────────────────────────────────────

import type {
  SocialPlatform,
  SocialVolumeEntry,
  AggregatedSocialVolume,
} from "../types";

// ── 헬퍼 함수 ──

/** 한글 포함 여부 감지 */
function containsKorean(text: string): boolean {
  return /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(text);
}

/** 키워드 길이 기반 가중치 (짧을수록 검색량이 높은 경향) */
function lengthFactor(keyword: string): number {
  const len = keyword.length;
  if (len <= 2) return 1.5;
  if (len <= 5) return 1.2;
  if (len <= 10) return 1.0;
  if (len <= 20) return 0.8;
  return 0.6;
}

/** 시드 기반 의사난수 생성 (동일 키워드에 일관된 결과) */
function seededRandom(seed: string, offset: number = 0): number {
  let hash = 0;
  const str = seed + String(offset);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(Math.sin(hash)) % 1;
}

/** 범위 내 시드 기반 랜덤 값 */
function seededRange(
  seed: string,
  min: number,
  max: number,
  offset: number = 0,
): number {
  return min + seededRandom(seed, offset) * (max - min);
}

// ── 플랫폼별 볼륨 추정기 ──

/**
 * YouTube 볼륨 추정
 * - 실제 구현: YouTube Data API v3 → search.list + videos.list (statistics)
 * - GET https://www.googleapis.com/youtube/v3/search?part=id&q={keyword}&type=video
 * - GET https://www.googleapis.com/youtube/v3/videos?part=statistics&id={ids}
 * - Rate Limit: 일일 10,000 units. search.list = 100 units/call
 *
 * 특성: 높은 콘텐츠 수, 낮은 해시태그, 높은 도달률, 보통 참여율(2-8%)
 */
function estimateYouTubeVolume(keyword: string): SocialVolumeEntry {
  const isKo = containsKorean(keyword);
  const factor = lengthFactor(keyword);
  const base = isKo ? 8000 : 15000;

  const contentCount = Math.round(
    base * factor * seededRange(keyword, 0.6, 1.4, 1),
  );
  // YouTube는 해시태그 중심이 아님 — 낮은 해시태그 비율
  const hashtagCount = Math.round(
    contentCount * seededRange(keyword, 0.02, 0.08, 2),
  );
  // 높은 도달률
  const estimatedReach = Math.round(
    contentCount * seededRange(keyword, 80, 200, 3),
  );

  // 보통 참여율 (2-8%)
  const avgEngagement = Math.round(seededRange(keyword, 2, 8, 10) * 10) / 10;
  // 보통 수준의 콘텐츠 신선도
  const contentFreshness =
    Math.round(seededRange(keyword, 0.2, 0.6, 11) * 100) / 100;
  // 경쟁 밀도
  const competitionDensity = Math.min(
    100,
    Math.round(seededRange(keyword, 20, 70, 12) * factor),
  );

  return {
    platform: "youtube",
    keyword,
    contentCount,
    hashtagCount,
    estimatedReach,
    avgEngagement,
    contentFreshness,
    competitionDensity,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Instagram 볼륨 추정
 * - 실제 구현: Instagram Graph API → ig_hashtag_search + top_media
 * - GET /{ig-hashtag-id}/recent_media?fields=id,caption,media_type,like_count
 * - Rate Limit: 시간당 200회 호출. 429 시 지수 백오프 적용
 *
 * 특성: 높은 해시태그 수, 보통 콘텐츠, 보통 참여율(3-12%), 트렌딩 시 높은 신선도
 */
function estimateInstagramVolume(keyword: string): SocialVolumeEntry {
  const isKo = containsKorean(keyword);
  const factor = lengthFactor(keyword);
  const base = isKo ? 5000 : 12000;

  const contentCount = Math.round(
    base * factor * seededRange(keyword, 0.5, 1.3, 4),
  );
  // 인스타그램은 해시태그 중심 — 콘텐츠보다 해시태그가 더 많음
  const hashtagCount = Math.round(
    contentCount * seededRange(keyword, 1.5, 4.0, 5),
  );
  const estimatedReach = Math.round(
    contentCount * seededRange(keyword, 30, 120, 6),
  );

  // 보통~높은 참여율 (3-12%)
  const avgEngagement = Math.round(seededRange(keyword, 3, 12, 13) * 10) / 10;
  // 트렌딩 키워드일수록 높은 신선도
  const isTrending = keyword.length <= 4 || seededRandom(keyword, 20) > 0.6;
  const contentFreshness =
    Math.round(
      seededRange(keyword, isTrending ? 0.5 : 0.2, isTrending ? 0.9 : 0.5, 14) *
        100,
    ) / 100;
  const competitionDensity = Math.min(
    100,
    Math.round(seededRange(keyword, 30, 80, 15) * factor),
  );

  return {
    platform: "instagram",
    keyword,
    contentCount,
    hashtagCount,
    estimatedReach,
    avgEngagement,
    contentFreshness,
    competitionDensity,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * TikTok 볼륨 추정
 * - 실제 구현: TikTok Research API → /v2/research/video/query/
 * - POST https://open.tiktokapis.com/v2/research/video/query/
 * - Rate Limit: 일일 1,000회 호출. 요청 간 최소 100ms 간격
 *
 * 특성: 최고 해시태그, 가변 콘텐츠, 최고 참여율(5-20%), 최고 신선도
 */
function estimateTikTokVolume(keyword: string): SocialVolumeEntry {
  const isKo = containsKorean(keyword);
  const factor = lengthFactor(keyword);
  const base = isKo ? 6000 : 18000;

  // 가변적인 콘텐츠 수 (바이럴 여부에 따라 크게 달라짐)
  const contentCount = Math.round(
    base * factor * seededRange(keyword, 0.3, 1.8, 7),
  );
  // 최고 수준의 해시태그 — 콘텐츠 대비 3~8배
  const hashtagCount = Math.round(
    contentCount * seededRange(keyword, 3.0, 8.0, 8),
  );
  const estimatedReach = Math.round(
    contentCount * seededRange(keyword, 50, 300, 9),
  );

  // 최고 수준의 참여율 (5-20%)
  const avgEngagement = Math.round(seededRange(keyword, 5, 20, 16) * 10) / 10;
  // 최고 수준의 신선도 — TikTok은 최신 콘텐츠 위주
  const contentFreshness =
    Math.round(seededRange(keyword, 0.5, 0.95, 17) * 100) / 100;
  const competitionDensity = Math.min(
    100,
    Math.round(seededRange(keyword, 25, 85, 18) * factor),
  );

  return {
    platform: "tiktok",
    keyword,
    contentCount,
    hashtagCount,
    estimatedReach,
    avgEngagement,
    contentFreshness,
    competitionDensity,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * 네이버 블로그 볼륨 추정
 * - 실제 구현: Naver Search API → /v1/search/blog.json + datalab/search
 * - GET https://openapi.naver.com/v1/search/blog.json?query={keyword}
 * - Rate Limit: 일일 25,000회. 초당 10회 제한
 *
 * 특성: 보통 콘텐츠, 낮은 해시태그, 낮지만 일관된 도달률, 보통 참여율(1-5%)
 */
function estimateNaverBlogVolume(keyword: string): SocialVolumeEntry {
  const isKo = containsKorean(keyword);
  const factor = lengthFactor(keyword);
  // 네이버 블로그는 한국어 키워드에서 훨씬 높은 볼륨
  const base = isKo ? 10000 : 1500;

  const contentCount = Math.round(
    base * factor * seededRange(keyword, 0.5, 1.2, 20),
  );
  // 낮은 해시태그 비율
  const hashtagCount = Math.round(
    contentCount * seededRange(keyword, 0.05, 0.15, 21),
  );
  // 낮지만 일관된 도달률
  const estimatedReach = Math.round(
    contentCount * seededRange(keyword, 15, 50, 22),
  );

  // 보통 수준의 참여율 (1-5%)
  const avgEngagement = Math.round(seededRange(keyword, 1, 5, 23) * 10) / 10;
  const contentFreshness =
    Math.round(seededRange(keyword, 0.25, 0.55, 24) * 100) / 100;
  const competitionDensity = Math.min(
    100,
    Math.round(seededRange(keyword, 15, 60, 25) * factor),
  );

  return {
    platform: "naver_blog",
    keyword,
    contentCount,
    hashtagCount,
    estimatedReach,
    avgEngagement,
    contentFreshness,
    competitionDensity,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * Google 검색 볼륨 추정
 * - 실제 구현: Google Custom Search API + Google Trends API
 * - GET https://www.googleapis.com/customsearch/v1?q={keyword}&key={API_KEY}
 * - Rate Limit: 일일 10,000회 (유료), 무료 티어 100회/일
 *
 * 특성: 높은 콘텐츠 수, 해시태그 없음, 도달률 추정 불가, 낮은 참여율
 */
function estimateGoogleVolume(keyword: string): SocialVolumeEntry {
  const isKo = containsKorean(keyword);
  const factor = lengthFactor(keyword);
  const base = isKo ? 12000 : 25000;

  const contentCount = Math.round(
    base * factor * seededRange(keyword, 0.7, 1.5, 30),
  );
  // Google 검색: 해시태그 개념 없음
  const hashtagCount = 0;
  // Google 검색: 도달률 추정 불가
  const estimatedReach = 0;

  // 낮은 참여율 (검색 결과 페이지 특성)
  const avgEngagement =
    Math.round(seededRange(keyword, 0.5, 2.5, 31) * 10) / 10;
  const contentFreshness =
    Math.round(seededRange(keyword, 0.15, 0.45, 32) * 100) / 100;
  const competitionDensity = Math.min(
    100,
    Math.round(seededRange(keyword, 30, 90, 33) * factor),
  );

  return {
    platform: "google",
    keyword,
    contentCount,
    hashtagCount,
    estimatedReach,
    avgEngagement,
    contentFreshness,
    competitionDensity,
    collectedAt: new Date().toISOString(),
  };
}

// ── 플랫폼 추정기 매핑 ──

const COLLECTORS: Record<
  SocialPlatform,
  (keyword: string) => SocialVolumeEntry
> = {
  youtube: estimateYouTubeVolume,
  instagram: estimateInstagramVolume,
  tiktok: estimateTikTokVolume,
  naver_blog: estimateNaverBlogVolume,
  google: estimateGoogleVolume,
};

// ── Single Keyword Volume ──

/**
 * 단일 키워드의 소셜 볼륨을 수집하고 집계합니다.
 * 각 플랫폼별 추정치를 합산하여 AggregatedSocialVolume을 반환합니다.
 */
export function collectSingleVolume(
  keyword: string,
  platforms: SocialPlatform[] = [
    "youtube",
    "instagram",
    "tiktok",
    "naver_blog",
  ],
): AggregatedSocialVolume {
  const entries: SocialVolumeEntry[] = [];

  for (const platform of platforms) {
    const collector = COLLECTORS[platform];
    if (collector) {
      entries.push(collector(keyword));
    }
  }

  // 기본 집계
  let totalContentCount = 0;
  let totalHashtagCount = 0;
  let totalReach = 0;

  // 확장 메트릭 집계
  let engagementSum = 0;
  let freshnessSum = 0;
  let competitionSum = 0;

  for (const entry of entries) {
    totalContentCount += entry.contentCount;
    totalHashtagCount += entry.hashtagCount;
    totalReach += entry.estimatedReach;
    engagementSum += entry.avgEngagement;
    freshnessSum += entry.contentFreshness;
    competitionSum += entry.competitionDensity;
  }

  const count = entries.length || 1;

  // 플랫폼 수 기준 가중 평균
  const avgEngagement = Math.round((engagementSum / count) * 10) / 10;
  const avgFreshness = Math.round((freshnessSum / count) * 100) / 100;
  const avgCompetitionDensity = Math.round((competitionSum / count) * 10) / 10;

  return {
    keyword,
    totalContentCount,
    totalHashtagCount,
    totalReach,
    avgEngagement,
    avgFreshness,
    avgCompetitionDensity,
    platformBreakdown: entries,
  };
}

// ── Main Collection Function ──

/**
 * 여러 키워드의 소셜 볼륨을 수집합니다.
 *
 * TODO: 프로덕션 환경에서는 아래 API들을 실제 호출하도록 교체
 * - YouTube Data API v3: 검색 결과 및 동영상 통계
 * - Instagram Graph API: 해시태그 검색 및 미디어 통계
 * - TikTok Research API: 동영상 쿼리 및 해시태그 정보
 * - Naver Search API: 블로그 검색 및 데이터랩 트렌드
 * - Google Custom Search API: 웹 검색 결과 수
 *
 * TODO: Rate limiting 구현
 * - 플랫폼별 요청 간격 조절 (예: YouTube 100ms, TikTok 100ms, Instagram 500ms)
 * - 일일 쿼터 추적 및 초과 방지
 * - 429 응답 시 지수 백오프 재시도 (최대 3회)
 * - 동시 요청 수 제한 (Promise.allSettled + p-limit)
 */
export async function collectSocialVolumes(
  keywords: string[],
  platforms: SocialPlatform[] = [
    "youtube",
    "instagram",
    "tiktok",
    "naver_blog",
  ],
): Promise<Map<string, AggregatedSocialVolume>> {
  const results = new Map<string, AggregatedSocialVolume>();

  // TODO: 실제 API 호출 시 Promise.allSettled로 병렬 처리
  // TODO: Rate limiter 적용 — 플랫폼별 동시 요청 수 제한
  // TODO: 실패한 플랫폼은 건너뛰고 부분 결과 반환
  for (const keyword of keywords) {
    const aggregated = collectSingleVolume(keyword, platforms);
    results.set(keyword, aggregated);
  }

  return results;
}
