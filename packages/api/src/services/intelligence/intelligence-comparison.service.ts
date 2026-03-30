/**
 * IntelligenceComparisonService
 *
 * A/B 비교 분석: 두 개의 SignalFusionResult를 비교하여
 * 차이점, 하이라이트, 경고, 행동 변화를 도출.
 */

import type { SignalFusionResult } from "../vertical-templates/vertical-signal-fusion.service";

// ─── Types ───────────────────────────────────────────────────────

export type ComparisonSide = {
  label: string;
  seedKeyword: string;
  industryType: string;
  fusionResult: SignalFusionResult;
  metadata: {
    confidence: number;
    freshness: string;
    isPartial: boolean;
    isMockOnly: boolean;
    isStaleBased: boolean;
    generatedAt: string;
  };
};

export type DifferenceLevel = "CRITICAL" | "WARNING" | "INFO" | "NEUTRAL";

export type KeyDifference = {
  area: string;
  label: string;
  level: DifferenceLevel;
  leftValue: string | number | null;
  rightValue: string | number | null;
  delta: number | null;
  deltaDirection: "UP" | "DOWN" | "NEW" | "REMOVED" | "SAME";
  interpretation: string;
};

export type HighlightedChange = {
  type: "taxonomy" | "benchmark" | "social" | "signal" | "warning";
  title: string;
  description: string;
  level: DifferenceLevel;
  leftDetail?: string;
  rightDetail?: string;
};

export type ActionDelta = {
  newInsights: string[];
  removedInsights: string[];
  escalatedWarnings: string[];
  resolvedWarnings: string[];
  recommendations: string[];
};

export type IntelligenceComparisonResult = {
  comparisonType: string;
  leftLabel: string;
  rightLabel: string;
  keyDifferences: KeyDifference[];
  highlightedChanges: HighlightedChange[];
  differenceWarnings: string[];
  actionDelta: ActionDelta;
  overallDifferenceScore: number; // 0-100
  summary: string;
};

// ─── Service ─────────────────────────────────────────────────────

export class IntelligenceComparisonService {
  compare(
    left: ComparisonSide,
    right: ComparisonSide,
    comparisonType: string,
  ): IntelligenceComparisonResult {
    const keyDifferences: KeyDifference[] = [];
    const highlightedChanges: HighlightedChange[] = [];
    const differenceWarnings: string[] = [];

    // 1. Signal Quality 비교
    this.compareSignalQuality(left, right, keyDifferences, highlightedChanges);

    // 2. Taxonomy 비교
    this.compareTaxonomy(left, right, keyDifferences, highlightedChanges);

    // 3. Benchmark 비교
    this.compareBenchmark(left, right, keyDifferences, highlightedChanges);

    // 4. Social 비교
    this.compareSocial(left, right, keyDifferences, highlightedChanges);

    // 5. Warning 비교
    this.compareWarnings(left, right, keyDifferences, differenceWarnings);

    // 6. Action Delta
    const actionDelta = this.computeActionDelta(left, right);

    // 7. Overall score
    const overallDifferenceScore = this.computeOverallScore(keyDifferences);

    // 8. Summary
    const summary = this.generateSummary(
      left,
      right,
      keyDifferences,
      overallDifferenceScore,
    );

    // Metadata warnings
    if (left.metadata.isStaleBased || right.metadata.isStaleBased) {
      differenceWarnings.push(
        "일부 데이터가 최신이 아닙니다. 비교 결과 해석에 주의가 필요합니다.",
      );
    }
    if (left.metadata.isPartial || right.metadata.isPartial) {
      differenceWarnings.push(
        "부분 데이터가 포함되어 있어 일부 차이만 표시됩니다.",
      );
    }
    if (left.metadata.confidence < 0.5 || right.metadata.confidence < 0.5) {
      differenceWarnings.push(
        "신뢰도가 낮은 데이터가 포함되어 있습니다. 점선으로 표시된 변화는 참고 수준입니다.",
      );
    }

    return {
      comparisonType,
      leftLabel: left.label,
      rightLabel: right.label,
      keyDifferences,
      highlightedChanges,
      differenceWarnings,
      actionDelta,
      overallDifferenceScore,
      summary,
    };
  }

  private compareSignalQuality(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    highlights: HighlightedChange[],
  ) {
    const lq = left.fusionResult.signalQuality;
    const rq = right.fusionResult.signalQuality;

    const richnessMap = { RICH: 3, MODERATE: 2, MINIMAL: 1 };
    const lScore = richnessMap[lq.overallRichness];
    const rScore = richnessMap[rq.overallRichness];

    if (lScore !== rScore) {
      diffs.push({
        area: "signal_quality",
        label: "시그널 풍부도",
        level: Math.abs(lScore - rScore) >= 2 ? "CRITICAL" : "WARNING",
        leftValue: lq.overallRichness,
        rightValue: rq.overallRichness,
        delta: rScore - lScore,
        deltaDirection: rScore > lScore ? "UP" : "DOWN",
        interpretation:
          rScore > lScore
            ? `B(${right.label})가 더 풍부한 시그널을 보유합니다.`
            : `A(${left.label})가 더 풍부한 시그널을 보유합니다.`,
      });
    }

    // Source availability differences
    const sources = [
      { key: "검색 데이터", l: lq.hasClusterData, r: rq.hasClusterData },
      { key: "소셜 데이터", l: lq.hasSocialData, r: rq.hasSocialData },
      {
        key: "벤치마크 데이터",
        l: lq.hasBenchmarkData,
        r: rq.hasBenchmarkData,
      },
    ];

    for (const src of sources) {
      if (src.l !== src.r) {
        highlights.push({
          type: "signal",
          title: `${src.key} 가용성 차이`,
          description: `A: ${src.l ? "있음" : "없음"} → B: ${src.r ? "있음" : "없음"}`,
          level: "INFO",
        });
      }
    }
  }

  private compareTaxonomy(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    highlights: HighlightedChange[],
  ) {
    const lt = left.fusionResult.taxonomyMapping;
    const rt = right.fusionResult.taxonomyMapping;

    if (!lt && !rt) return;

    if (lt && rt) {
      // Coverage comparison
      const lCovered = Object.entries(lt.taxonomyCoverage).filter(
        ([, c]) => c > 0,
      );
      const rCovered = Object.entries(rt.taxonomyCoverage).filter(
        ([, c]) => c > 0,
      );

      const lTotal = Object.keys(lt.taxonomyCoverage).length;
      const rTotal = Object.keys(rt.taxonomyCoverage).length;
      const lPct =
        lTotal > 0 ? Math.round((lCovered.length / lTotal) * 100) : 0;
      const rPct =
        rTotal > 0 ? Math.round((rCovered.length / rTotal) * 100) : 0;

      if (Math.abs(lPct - rPct) >= 10) {
        diffs.push({
          area: "taxonomy",
          label: "분류 커버리지",
          level: Math.abs(lPct - rPct) >= 30 ? "CRITICAL" : "WARNING",
          leftValue: `${lPct}%`,
          rightValue: `${rPct}%`,
          delta: rPct - lPct,
          deltaDirection: rPct > lPct ? "UP" : "DOWN",
          interpretation: `커버리지가 ${Math.abs(rPct - lPct)}%p 차이납니다.`,
        });
      }

      // New / removed categories
      const lCats = new Set(lCovered.map(([c]) => c));
      const rCats = new Set(rCovered.map(([c]) => c));

      for (const cat of rCats) {
        if (!lCats.has(cat)) {
          highlights.push({
            type: "taxonomy",
            title: `새로 등장: ${cat}`,
            description: `B(${right.label})에서 새로 감지된 카테고리입니다.`,
            level: "INFO",
          });
        }
      }
      for (const cat of lCats) {
        if (!rCats.has(cat)) {
          highlights.push({
            type: "taxonomy",
            title: `약화/소멸: ${cat}`,
            description: `A(${left.label})에 있던 카테고리가 B에서 사라졌습니다.`,
            level: "WARNING",
          });
        }
      }

      // Category strength changes
      for (const [cat, lCount] of Object.entries(lt.taxonomyCoverage)) {
        const rCount = rt.taxonomyCoverage[cat] ?? 0;
        if (lCount > 0 && rCount > 0 && Math.abs(rCount - lCount) >= 2) {
          diffs.push({
            area: "taxonomy",
            label: `${cat} 클러스터`,
            level: "INFO",
            leftValue: lCount,
            rightValue: rCount,
            delta: rCount - lCount,
            deltaDirection: rCount > lCount ? "UP" : "DOWN",
            interpretation: `${cat} 카테고리 클러스터가 ${lCount}→${rCount}로 변화.`,
          });
        }
      }
    } else {
      diffs.push({
        area: "taxonomy",
        label: "분류 데이터",
        level: "WARNING",
        leftValue: lt ? "있음" : "없음",
        rightValue: rt ? "있음" : "없음",
        delta: null,
        deltaDirection: rt ? "NEW" : "REMOVED",
        interpretation: rt
          ? "B에서 분류 데이터가 새로 생성되었습니다."
          : "B에서 분류 데이터가 사라졌습니다.",
      });
    }
  }

  private compareBenchmark(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    highlights: HighlightedChange[],
  ) {
    const lb = left.fusionResult.benchmarkComparison;
    const rb = right.fusionResult.benchmarkComparison;

    if (!lb && !rb) return;

    if (lb && rb) {
      // Overall score
      const lScore = Math.round(lb.overallScore * 100);
      const rScore = Math.round(rb.overallScore * 100);

      if (Math.abs(lScore - rScore) >= 5) {
        diffs.push({
          area: "benchmark",
          label: "벤치마크 종합 점수",
          level: Math.abs(lScore - rScore) >= 20 ? "CRITICAL" : "WARNING",
          leftValue: lScore,
          rightValue: rScore,
          delta: rScore - lScore,
          deltaDirection: rScore > lScore ? "UP" : "DOWN",
          interpretation: `종합 점수가 ${lScore}→${rScore}로 ${rScore > lScore ? "상승" : "하락"}했습니다.`,
        });
      }

      // Per-metric comparison
      const lMetrics = new Map(lb.comparisons.map((c) => [c.metricKey, c]));
      const rMetrics = new Map(rb.comparisons.map((c) => [c.metricKey, c]));

      for (const [key, lComp] of lMetrics) {
        const rComp = rMetrics.get(key);
        if (rComp) {
          const lRating = lComp.rating;
          const rRating = rComp.rating;
          if (lRating !== rRating) {
            highlights.push({
              type: "benchmark",
              title: `${lComp.metricLabel} 등급 변화`,
              description: `${lRating} → ${rRating}`,
              level:
                rRating === "BELOW"
                  ? "WARNING"
                  : rRating === "ABOVE"
                    ? "INFO"
                    : "NEUTRAL",
              leftDetail: `${lComp.actualValue} (${lRating})`,
              rightDetail: `${rComp.actualValue} (${rRating})`,
            });
          }
        }
      }
    } else {
      diffs.push({
        area: "benchmark",
        label: "벤치마크 비교",
        level: "INFO",
        leftValue: lb ? "있음" : "없음",
        rightValue: rb ? "있음" : "없음",
        delta: null,
        deltaDirection: rb ? "NEW" : "REMOVED",
        interpretation: rb
          ? "B에서 벤치마크 비교가 가능해졌습니다."
          : "B에서 벤치마크 비교 데이터가 없습니다.",
      });
    }
  }

  private compareSocial(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    highlights: HighlightedChange[],
  ) {
    const ls = left.fusionResult.socialIntegration;
    const rs = right.fusionResult.socialIntegration;

    if (!ls?.hasSocialData && !rs?.hasSocialData) return;

    if (ls?.hasSocialData && rs?.hasSocialData) {
      const lEv = ls.evidenceItems.length;
      const rEv = rs.evidenceItems.length;

      if (Math.abs(lEv - rEv) >= 2) {
        diffs.push({
          area: "social",
          label: "소셜 증거",
          level: Math.abs(lEv - rEv) >= 5 ? "WARNING" : "INFO",
          leftValue: lEv,
          rightValue: rEv,
          delta: rEv - lEv,
          deltaDirection: rEv > lEv ? "UP" : "DOWN",
          interpretation: `소셜 증거가 ${lEv}건→${rEv}건으로 변화했습니다.`,
        });
      }

      // Warning level changes
      const lWarn = ls.warnings.filter((w) => w.level === "CRITICAL").length;
      const rWarn = rs.warnings.filter((w) => w.level === "CRITICAL").length;
      if (rWarn > lWarn) {
        highlights.push({
          type: "social",
          title: "소셜 위험 신호 증가",
          description: `긴급 경고가 ${lWarn}→${rWarn}건으로 증가했습니다.`,
          level: "CRITICAL",
        });
      } else if (rWarn < lWarn) {
        highlights.push({
          type: "social",
          title: "소셜 위험 신호 감소",
          description: `긴급 경고가 ${lWarn}→${rWarn}건으로 감소했습니다.`,
          level: "INFO",
        });
      }
    } else {
      diffs.push({
        area: "social",
        label: "소셜 데이터",
        level: "INFO",
        leftValue: ls?.hasSocialData ? "있음" : "없음",
        rightValue: rs?.hasSocialData ? "있음" : "없음",
        delta: null,
        deltaDirection: rs?.hasSocialData ? "NEW" : "REMOVED",
        interpretation: rs?.hasSocialData
          ? "B에서 소셜 신호가 새로 감지되었습니다."
          : "B에서 소셜 신호가 사라졌습니다.",
      });
    }
  }

  private compareWarnings(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    warnings: string[],
  ) {
    const lW = left.fusionResult.additionalWarnings.length;
    const rW = right.fusionResult.additionalWarnings.length;

    if (Math.abs(lW - rW) >= 2) {
      diffs.push({
        area: "warning",
        label: "경고 수",
        level: rW > lW ? "WARNING" : "INFO",
        leftValue: lW,
        rightValue: rW,
        delta: rW - lW,
        deltaDirection: rW > lW ? "UP" : "DOWN",
        interpretation:
          rW > lW
            ? `경고가 ${lW}건→${rW}건으로 증가했습니다. 주의가 필요합니다.`
            : `경고가 ${lW}건→${rW}건으로 감소했습니다.`,
      });
    }

    // New warnings in right
    const lSet = new Set(left.fusionResult.additionalWarnings);
    for (const w of right.fusionResult.additionalWarnings) {
      if (!lSet.has(w)) {
        warnings.push(`[신규 경고] ${w}`);
      }
    }
  }

  private computeActionDelta(
    left: ComparisonSide,
    right: ComparisonSide,
  ): ActionDelta {
    const lInsights = new Set(
      left.fusionResult.additionalInsights.map((i) => i.title),
    );
    const rInsights = new Set(
      right.fusionResult.additionalInsights.map((i) => i.title),
    );

    const newInsights: string[] = [];
    const removedInsights: string[] = [];

    for (const title of rInsights) {
      if (!lInsights.has(title)) newInsights.push(title);
    }
    for (const title of lInsights) {
      if (!rInsights.has(title)) removedInsights.push(title);
    }

    const lWarnSet = new Set(left.fusionResult.additionalWarnings);
    const rWarnSet = new Set(right.fusionResult.additionalWarnings);

    const escalatedWarnings = [...rWarnSet].filter((w) => !lWarnSet.has(w));
    const resolvedWarnings = [...lWarnSet].filter((w) => !rWarnSet.has(w));

    const recommendations: string[] = [];
    if (newInsights.length > 0) {
      recommendations.push(
        `새로운 인사이트 ${newInsights.length}건이 발견되었습니다. 검토가 필요합니다.`,
      );
    }
    if (escalatedWarnings.length > 0) {
      recommendations.push(
        `새로운 경고 ${escalatedWarnings.length}건이 추가되었습니다. 즉시 대응을 권장합니다.`,
      );
    }
    if (resolvedWarnings.length > 0) {
      recommendations.push(
        `이전 경고 ${resolvedWarnings.length}건이 해소되었습니다.`,
      );
    }

    return {
      newInsights,
      removedInsights,
      escalatedWarnings,
      resolvedWarnings,
      recommendations,
    };
  }

  private computeOverallScore(diffs: KeyDifference[]): number {
    if (diffs.length === 0) return 0;

    const weights = { CRITICAL: 30, WARNING: 15, INFO: 5, NEUTRAL: 1 };
    let score = 0;
    for (const d of diffs) {
      score += weights[d.level];
    }
    return Math.min(100, score);
  }

  private generateSummary(
    left: ComparisonSide,
    right: ComparisonSide,
    diffs: KeyDifference[],
    score: number,
  ): string {
    const criticalCount = diffs.filter((d) => d.level === "CRITICAL").length;
    const warningCount = diffs.filter((d) => d.level === "WARNING").length;

    if (score === 0) {
      return `'${left.seedKeyword}'와 '${right.seedKeyword}' 사이에 유의미한 차이가 발견되지 않았습니다.`;
    }

    const parts: string[] = [];
    parts.push(
      `'${left.label}'과 '${right.label}' 비교 결과 총 ${diffs.length}건의 차이가 감지되었습니다`,
    );

    if (criticalCount > 0) {
      parts.push(`(핵심 변화 ${criticalCount}건)`);
    }
    if (warningCount > 0) {
      parts.push(`주의 필요 ${warningCount}건`);
    }

    // Top difference
    const topDiff = diffs.sort(
      (a, b) =>
        ["CRITICAL", "WARNING", "INFO", "NEUTRAL"].indexOf(a.level) -
        ["CRITICAL", "WARNING", "INFO", "NEUTRAL"].indexOf(b.level),
    )[0];
    if (topDiff) {
      parts.push(`. 가장 큰 변화: ${topDiff.interpretation}`);
    }

    return parts.join(" ");
  }
}
