// ---------------------------------------------------------------------------
// trend-aggregator.ts - 키워드 트렌드 분석 및 집계 파이프라인
// ---------------------------------------------------------------------------
// 키워드별 12개월 시뮬레이션 트렌드 데이터를 생성하고,
// 시즈널리티, YoY 성장률, 브레이크아웃 감지 등을 수행한다.
//
// 운영 환경 연동:
// - Google Trends API (unofficial): pytrends -> Node bridge 또는 SerpAPI
// - Naver DataLab API: https://developers.naver.com/docs/serviceapi/datalab/
// - DataForSEO Trends API
// ---------------------------------------------------------------------------

import type { TrendAnalysis, TrendDataPoint } from "../types";

// ---------------------------------------------------------------------------
// 시즈널 패턴 정의 (키워드 신호 -> 피크 월)
// ---------------------------------------------------------------------------

const SEASONAL_PATTERNS: { signal: string; peakMonths: number[] }[] = [
  { signal: "여름", peakMonths: [6, 7, 8] },
  { signal: "겨울", peakMonths: [11, 12, 1] },
  { signal: "봄", peakMonths: [3, 4, 5] },
  { signal: "가을", peakMonths: [9, 10, 11] },
  { signal: "추석", peakMonths: [9] },
  { signal: "설날", peakMonths: [1, 2] },
  { signal: "크리스마스", peakMonths: [12] },
  { signal: "블프", peakMonths: [11] },
  { signal: "연말정산", peakMonths: [1, 2] },
  { signal: "여름휴가", peakMonths: [7, 8] },
  { signal: "신학기", peakMonths: [3] },
  { signal: "발렌타인", peakMonths: [2] },
  { signal: "수능", peakMonths: [11] },
  { signal: "벚꽃", peakMonths: [4] },
  { signal: "장마", peakMonths: [6, 7] },
];

// ---------------------------------------------------------------------------
// 유틸리티 함수
// ---------------------------------------------------------------------------

/**
 * 키워드에 해당하는 시즈널 패턴의 피크 월 목록을 반환한다.
 * 매칭되는 패턴이 없으면 빈 배열을 반환한다.
 */
function findSeasonalPeaks(keyword: string): number[] {
  for (const pattern of SEASONAL_PATTERNS) {
    if (keyword.includes(pattern.signal)) {
      return pattern.peakMonths;
    }
  }
  return [];
}

/**
 * 시드 기반 의사 난수 생성기
 * 같은 키워드에 대해 일관된(결정적) 데이터를 생성하기 위함
 */
function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = `${seed}-${index}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 32비트 정수로 변환
  }
  // 0~1 범위의 값으로 정규화
  return Math.abs(hash % 10000) / 10000;
}

/**
 * 변동계수(Coefficient of Variation)를 계산한다.
 * CV가 높을수록 계절성이 강하다고 판단한다.
 */
function coefficientOfVariation(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

// ---------------------------------------------------------------------------
// 월 라벨 생성 (최근 12개월)
// ---------------------------------------------------------------------------

function generateMonthLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    labels.push(`${year}-${String(month).padStart(2, "0")}`);
  }
  return labels;
}

// ---------------------------------------------------------------------------
// 단일 키워드 트렌드 분석
// ---------------------------------------------------------------------------

/**
 * 단일 키워드에 대해 12개월 시뮬레이션 트렌드 데이터를 생성하고 분석한다.
 *
 * - 시즈널 패턴이 있는 키워드: 해당 월에 볼륨 스파이크
 * - 일반 키워드: 미세한 랜덤 계절 변동
 * - 브레이크아웃 감지: 연속 2개월 50% 이상 급등 패턴
 * - YoY 성장률: 전반기 vs 후반기 비교로 시뮬레이션
 */
export function analyzeSingleTrend(keyword: string): TrendAnalysis {
  const monthLabels = generateMonthLabels();
  const peakMonths = findSeasonalPeaks(keyword);
  const hasSeasonal = peakMonths.length > 0;

  // ---------------------------------------------------------------------------
  // 기본 검색량 결정 (키워드 길이 기반)
  // ---------------------------------------------------------------------------
  const charCount = keyword.replace(/\s/g, "").length;
  let baseVolume: number;
  if (charCount <= 3) {
    baseVolume = 8000 + seededRandom(keyword, 0) * 4000;
  } else if (charCount <= 6) {
    baseVolume = 3000 + seededRandom(keyword, 0) * 3000;
  } else {
    baseVolume = 500 + seededRandom(keyword, 0) * 2000;
  }

  // ---------------------------------------------------------------------------
  // 12개월 데이터 포인트 생성
  // ---------------------------------------------------------------------------
  const dataPoints: TrendDataPoint[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < 12; i++) {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const currentMonth = d.getMonth() + 1; // 1~12

    let volume: number;

    if (hasSeasonal) {
      // 시즈널 키워드: 피크 월에 1.8~2.5배 볼륨, 비피크 월에 0.5~0.9배
      const isPeak = peakMonths.includes(currentMonth);
      const peakMultiplier = isPeak
        ? 1.8 + seededRandom(keyword, i + 100) * 0.7
        : 0.5 + seededRandom(keyword, i + 200) * 0.4;
      volume = baseVolume * peakMultiplier;
    } else {
      // 일반 키워드: +-15% 미세 변동 + 점진적 트렌드
      const noise = 0.85 + seededRandom(keyword, i) * 0.3;
      // 점진적 상승/하락 트렌드 적용 (시드 기반 방향 결정)
      const trendFactor = 1 + (seededRandom(keyword, 999) - 0.5) * 0.03 * i;
      volume = baseVolume * noise * trendFactor;
    }

    volume = Math.round(Math.max(10, volume));
    volumes.push(volume);

    dataPoints.push({
      period: monthLabels[i]!,
      volume,
      normalizedVolume: 0, // 아래에서 정규화
    });
  }

  // ---------------------------------------------------------------------------
  // 시즈널리티 판단 (변동계수 기반)
  // CV > 0.3 이면 계절성이 있다고 판단
  // ---------------------------------------------------------------------------
  const cv = coefficientOfVariation(volumes);
  const SEASONALITY_THRESHOLD = 0.3;
  const isSeasonal = cv > SEASONALITY_THRESHOLD || hasSeasonal;

  // ---------------------------------------------------------------------------
  // 피크 월 감지 (상위 3개 볼륨 월)
  // ---------------------------------------------------------------------------
  const sortedByVolume = [...dataPoints].sort((a, b) => b.volume - a.volume);
  const detectedPeakMonths = sortedByVolume.slice(0, 3).map((dp) => {
    const parts = dp.period.split("-");
    return parseInt(parts[1] ?? "1", 10);
  });

  // ---------------------------------------------------------------------------
  // YoY 성장률 시뮬레이션 (전반기 vs 후반기 비교)
  // 실제로는 전년 동기 데이터와 비교해야 하지만, 12개월 데이터만으로
  // 전반기/후반기를 나누어 성장 추세를 추정한다.
  // ---------------------------------------------------------------------------
  const firstHalf = volumes.slice(0, 6);
  const secondHalf = volumes.slice(6, 12);
  const firstHalfAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const secondHalfAvg =
    secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const yoyGrowthRate =
    firstHalfAvg > 0
      ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 * 10) /
        10
      : 0;

  // ---------------------------------------------------------------------------
  // 브레이크아웃 감지 (연속 2개월 50% 이상 급등)
  // 갑자기 검색량이 급등하는 키워드를 포착한다.
  // ---------------------------------------------------------------------------
  let isBreakout = false;
  for (let i = 2; i < volumes.length; i++) {
    const vi = volumes[i] ?? 0;
    const vi1 = volumes[i - 1] ?? 0;
    const vi2 = volumes[i - 2] ?? 0;
    const growth1 = vi1 > 0 ? (vi - vi1) / vi1 : 0;
    const growth2 = vi2 > 0 ? (vi1 - vi2) / vi2 : 0;
    if (growth1 > 0.5 && growth2 > 0.5) {
      isBreakout = true;
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // 전체 트렌드 방향 결정
  // YoY 성장률 10% 초과 -> rising, -10% 미만 -> declining, 그 외 stable
  // ---------------------------------------------------------------------------
  let overallTrend: "rising" | "declining" | "stable";
  if (yoyGrowthRate > 10) {
    overallTrend = "rising";
  } else if (yoyGrowthRate < -10) {
    overallTrend = "declining";
  } else {
    overallTrend = "stable";
  }

  // 볼륨 정규화 (최대값 기준 0-100)
  const maxVol = Math.max(...volumes, 1);
  for (const dp of dataPoints) {
    dp.normalizedVolume = Math.round((dp.volume / maxVol) * 100);
  }

  // 트렌드 스코어 계산 (-1.0 ~ 1.0)
  const trendScore =
    yoyGrowthRate > 10
      ? Math.min(1.0, yoyGrowthRate / 50)
      : yoyGrowthRate < -10
        ? Math.max(-1.0, yoyGrowthRate / 50)
        : yoyGrowthRate / 50;

  return {
    keyword,
    dataPoints,
    overallTrend: isSeasonal ? ("seasonal" as const) : overallTrend,
    trendScore: Math.round(trendScore * 100) / 100,
    seasonality: Math.round(cv * 1000) / 1000,
    peakMonths: hasSeasonal ? peakMonths : detectedPeakMonths,
    yoyGrowth: yoyGrowthRate,
    isBreakout,
  };
}

// ---------------------------------------------------------------------------
// 다중 키워드 트렌드 집계
// ---------------------------------------------------------------------------

/**
 * 여러 키워드에 대해 트렌드 분석을 일괄 수행하고 Map으로 반환한다.
 * 비동기 호환을 위해 Promise로 래핑한다 (향후 실제 API 연동 시 await 사용).
 *
 * @param keywords - 분석할 키워드 배열
 * @returns 키워드 -> TrendAnalysis 매핑
 */
export async function aggregateTrends(
  keywords: string[],
): Promise<Map<string, TrendAnalysis>> {
  const results = new Map<string, TrendAnalysis>();

  for (const keyword of keywords) {
    // 중복 키워드 방지
    if (results.has(keyword)) {
      continue;
    }

    const analysis = analyzeSingleTrend(keyword);
    results.set(keyword, analysis);
  }

  return results;
}
