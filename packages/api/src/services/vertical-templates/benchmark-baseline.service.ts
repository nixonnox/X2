/**
 * BenchmarkBaselineService
 *
 * 업종별 벤치마크 기준 데이터를 관리하고, 실제 분석 결과와 비교.
 * "이 업종에서 FAQ 비율 15%는 평균(20%) 대비 낮은 편" 같은 맥락 제공.
 *
 * 하는 일:
 * 1. 업종별 benchmarkBaseline 데이터 제공
 * 2. 실제 분석 결과 vs 벤치마크 비교
 * 3. 비교 결과 해석 (상위/평균/하위 판정)
 * 4. 업종별 벤치마크 기반 경고/인사이트 생성
 */

import type { IndustryType } from "./types";

// ─── Types ───────────────────────────────────────────────────────

export type BenchmarkMetric = {
  key: string;
  label: string;
  value: number;
  unit: "percent" | "ratio" | "count" | "hours" | "score";
  description: string;
};

export type BenchmarkComparison = {
  metricKey: string;
  metricLabel: string;
  baselineValue: number;
  actualValue: number;
  unit: string;
  deviation: number;
  deviationPercent: number;
  rating: "ABOVE" | "AVERAGE" | "BELOW";
  interpretation: string;
};

export type BenchmarkComparisonResult = {
  industryType: IndustryType;
  comparisons: BenchmarkComparison[];
  overallScore: number;
  highlights: string[];
  warnings: string[];
};

// ─── 업종별 벤치마크 데이터 ──────────────────────────────────────

const BEAUTY_BASELINE: BenchmarkMetric[] = [
  {
    key: "faqFrequency",
    label: "FAQ 비중",
    value: 0.22,
    unit: "percent",
    description: "전체 검색 중 FAQ 형태 비율",
  },
  {
    key: "comparisonClusterRatio",
    label: "비교 클러스터 비중",
    value: 0.28,
    unit: "percent",
    description: "비교/대조 관련 클러스터 비율",
  },
  {
    key: "ingredientSearchShare",
    label: "성분 검색 비중",
    value: 0.35,
    unit: "percent",
    description: "성분 관련 키워드 검색 비율",
  },
  {
    key: "reviewMentionRate",
    label: "리뷰 언급률",
    value: 0.18,
    unit: "percent",
    description: "리뷰/후기 관련 검색 비율",
  },
  {
    key: "skinTypeMentionRate",
    label: "피부타입 언급률",
    value: 0.15,
    unit: "percent",
    description: "피부타입 관련 키워드 비율",
  },
  {
    key: "seasonalVariation",
    label: "시즌 변동폭",
    value: 0.25,
    unit: "ratio",
    description: "월별 검색량 변동 계수",
  },
  {
    key: "purchaseIntentRatio",
    label: "구매 의도 비율",
    value: 0.3,
    unit: "percent",
    description: "구매 의도 검색 비율",
  },
  {
    key: "avgClusterCount",
    label: "평균 클러스터 수",
    value: 6,
    unit: "count",
    description: "시드키워드당 평균 클러스터 수",
  },
];

const FNB_BASELINE: BenchmarkMetric[] = [
  {
    key: "menuSearchShare",
    label: "메뉴 검색 비중",
    value: 0.3,
    unit: "percent",
    description: "메뉴/음식 관련 검색 비율",
  },
  {
    key: "locationSearchRatio",
    label: "지역 검색 비중",
    value: 0.25,
    unit: "percent",
    description: "지역/맛집 관련 검색 비율",
  },
  {
    key: "seasonalVariation",
    label: "시즌 변동폭",
    value: 0.35,
    unit: "ratio",
    description: "월별 검색량 변동 계수 (시즌 메뉴 영향)",
  },
  {
    key: "deliverySearchRate",
    label: "배달 검색 비율",
    value: 0.2,
    unit: "percent",
    description: "배달/포장 관련 검색 비율",
  },
  {
    key: "priceComparisonRate",
    label: "가격 비교 비율",
    value: 0.18,
    unit: "percent",
    description: "가격/가성비 비교 검색 비율",
  },
  {
    key: "visitIntentRatio",
    label: "방문 의도 비율",
    value: 0.22,
    unit: "percent",
    description: "매장 방문 의도 검색 비율",
  },
  {
    key: "reviewInfluenceRate",
    label: "리뷰 영향률",
    value: 0.28,
    unit: "percent",
    description: "후기/리뷰 기반 검색 비율",
  },
  {
    key: "avgClusterCount",
    label: "평균 클러스터 수",
    value: 5,
    unit: "count",
    description: "시드키워드당 평균 클러스터 수",
  },
];

const FINANCE_BASELINE: BenchmarkMetric[] = [
  {
    key: "comparisonSearchRate",
    label: "비교 검색 비율",
    value: 0.35,
    unit: "percent",
    description: "조건/금리 비교 검색 비율",
  },
  {
    key: "procedureQueryRate",
    label: "절차 문의 비율",
    value: 0.2,
    unit: "percent",
    description: "가입/해지 절차 문의 비율",
  },
  {
    key: "trustSignalPresence",
    label: "신뢰 시그널 비율",
    value: 0.15,
    unit: "percent",
    description: "신뢰/안전 관련 검색 비율",
  },
  {
    key: "rateComparisonFrequency",
    label: "금리 비교 빈도",
    value: 0.25,
    unit: "percent",
    description: "금리/이자율 비교 검색 비율",
  },
  {
    key: "riskAwarenessRate",
    label: "리스크 인식 비율",
    value: 0.12,
    unit: "percent",
    description: "위험/손실 관련 검색 비율",
  },
  {
    key: "faqFrequency",
    label: "FAQ 비중",
    value: 0.28,
    unit: "percent",
    description: "FAQ 형태 검색 비율 (금융은 높음)",
  },
  {
    key: "regulatoryMentionRate",
    label: "규제 언급률",
    value: 0.08,
    unit: "percent",
    description: "규제/법적 관련 검색 비율",
  },
  {
    key: "avgClusterCount",
    label: "평균 클러스터 수",
    value: 7,
    unit: "count",
    description: "시드키워드당 평균 클러스터 수 (금융은 세분화 높음)",
  },
];

const ENTERTAINMENT_BASELINE: BenchmarkMetric[] = [
  {
    key: "buzzDecayHours",
    label: "버즈 감소 시간",
    value: 48,
    unit: "hours",
    description: "이슈 발생 후 검색량 50% 감소까지 시간",
  },
  {
    key: "fanEngagementRate",
    label: "팬 참여율",
    value: 0.4,
    unit: "percent",
    description: "팬덤 관련 검색/참여 비율",
  },
  {
    key: "spreadVelocity",
    label: "확산 속도 점수",
    value: 0.65,
    unit: "score",
    description: "콘텐츠 확산 속도 (0~1)",
  },
  {
    key: "socialSearchCrossover",
    label: "소셜-검색 교차율",
    value: 0.35,
    unit: "percent",
    description: "소셜에서 시작된 검색 비율",
  },
  {
    key: "merchandiseSearchRate",
    label: "굿즈 검색 비율",
    value: 0.15,
    unit: "percent",
    description: "굿즈/MD/공연 관련 검색 비율",
  },
  {
    key: "contentTypeVariety",
    label: "콘텐츠 유형 다양성",
    value: 0.7,
    unit: "score",
    description: "검색된 콘텐츠 유형 다양성 (0~1)",
  },
  {
    key: "viralPotentialScore",
    label: "바이럴 잠재력",
    value: 0.55,
    unit: "score",
    description: "바이럴/밈 관련 검색 잠재력 (0~1)",
  },
  {
    key: "avgClusterCount",
    label: "평균 클러스터 수",
    value: 5,
    unit: "count",
    description: "시드키워드당 평균 클러스터 수",
  },
];

const ALL_BASELINES: Record<IndustryType, BenchmarkMetric[]> = {
  BEAUTY: BEAUTY_BASELINE,
  FNB: FNB_BASELINE,
  FINANCE: FINANCE_BASELINE,
  ENTERTAINMENT: ENTERTAINMENT_BASELINE,
};

// ─── Service ─────────────────────────────────────────────────────

export class BenchmarkBaselineService {
  /**
   * 업종별 벤치마크 기준 데이터 반환
   */
  getBaseline(industryType: IndustryType): BenchmarkMetric[] {
    return ALL_BASELINES[industryType];
  }

  /**
   * 업종별 벤치마크 기준을 Record<string, number>로 반환
   * (VerticalDocumentProfile.benchmarkBaseline 호환)
   */
  getBaselineRecord(industryType: IndustryType): Record<string, number> {
    const metrics = ALL_BASELINES[industryType];
    const record: Record<string, number> = {};
    for (const m of metrics) {
      record[m.key] = m.value;
    }
    return record;
  }

  /**
   * 실제 값과 벤치마크 비교
   */
  compare(
    industryType: IndustryType,
    actualValues: Record<string, number>,
  ): BenchmarkComparisonResult {
    const baseline = ALL_BASELINES[industryType];
    const comparisons: BenchmarkComparison[] = [];
    const highlights: string[] = [];
    const warnings: string[] = [];

    for (const metric of baseline) {
      const actual = actualValues[metric.key];
      if (actual === undefined) continue;

      const deviation = actual - metric.value;
      const deviationPercent =
        metric.value !== 0 ? (deviation / metric.value) * 100 : 0;

      // 판정: ±15% 이내 = AVERAGE, 초과 = ABOVE, 미만 = BELOW
      let rating: "ABOVE" | "AVERAGE" | "BELOW";
      if (deviationPercent > 15) {
        rating = "ABOVE";
      } else if (deviationPercent < -15) {
        rating = "BELOW";
      } else {
        rating = "AVERAGE";
      }

      const interpretation = this.buildInterpretation(
        metric,
        actual,
        rating,
        industryType,
      );

      comparisons.push({
        metricKey: metric.key,
        metricLabel: metric.label,
        baselineValue: metric.value,
        actualValue: actual,
        unit: metric.unit,
        deviation,
        deviationPercent: Math.round(deviationPercent * 10) / 10,
        rating,
        interpretation,
      });

      if (rating === "ABOVE") {
        highlights.push(interpretation);
      } else if (rating === "BELOW") {
        warnings.push(interpretation);
      }
    }

    // 전체 점수 (ABOVE=1, AVERAGE=0.5, BELOW=0 → 평균)
    const scoreMap = { ABOVE: 1, AVERAGE: 0.5, BELOW: 0 };
    const overallScore =
      comparisons.length > 0
        ? comparisons.reduce((sum, c) => sum + scoreMap[c.rating], 0) /
          comparisons.length
        : 0.5;

    return {
      industryType,
      comparisons,
      overallScore: Math.round(overallScore * 100) / 100,
      highlights,
      warnings,
    };
  }

  private buildInterpretation(
    metric: BenchmarkMetric,
    actual: number,
    rating: "ABOVE" | "AVERAGE" | "BELOW",
    industryType: IndustryType,
  ): string {
    const formatValue = (v: number, unit: string) => {
      if (unit === "percent") return `${Math.round(v * 100)}%`;
      if (unit === "ratio") return `${v.toFixed(2)}`;
      if (unit === "hours") return `${v}시간`;
      if (unit === "score") return `${v.toFixed(2)}`;
      return `${v}`;
    };

    const actualStr = formatValue(actual, metric.unit);
    const baselineStr = formatValue(metric.value, metric.unit);

    const labels: Record<IndustryType, string> = {
      BEAUTY: "뷰티",
      FNB: "F&B",
      FINANCE: "금융",
      ENTERTAINMENT: "엔터",
    };

    if (rating === "ABOVE") {
      return `${labels[industryType]} 업종 평균(${baselineStr}) 대비 ${metric.label}이(가) ${actualStr}로 높은 편입니다.`;
    } else if (rating === "BELOW") {
      return `${labels[industryType]} 업종 평균(${baselineStr}) 대비 ${metric.label}이(가) ${actualStr}로 낮은 편입니다.`;
    }
    return `${metric.label}이(가) ${actualStr}로 ${labels[industryType]} 업종 평균(${baselineStr}) 수준입니다.`;
  }
}
