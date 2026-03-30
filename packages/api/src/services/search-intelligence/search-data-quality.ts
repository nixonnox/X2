/**
 * Search Data Quality Assessment
 *
 * SearchIntelligenceResult 의 trace 메타데이터를 분석하여
 * 데이터 품질 등급을 결정한다.
 *
 * 품질 등급에 따라 insight/report/evidence 파이프라인에서의 활용 범위가 달라진다:
 * - HIGH: 모든 파이프라인에서 1등급 근거로 사용
 * - MEDIUM: insight/action에 사용, report에서는 경고 표시
 * - LOW: insight에 보조 참고만, report에서는 "제한적 데이터" 표시
 * - INSUFFICIENT: 파이프라인 진입 차단, 재수집 권고
 */

import type {
  SearchIntelligenceResult,
  SearchDataQualityAssessment,
  DataQualityLevel,
} from "./types";

const MOCK_SOURCE_NAMES = ["mock", "mock_data", "test"];

export function assessSearchDataQuality(
  result: SearchIntelligenceResult,
): SearchDataQualityAssessment {
  const { trace, payloadSummary } = result;

  // ── Mock 감지 ──
  const sourceNames = trace.sourceSummary.sources.map((s) =>
    s.name.toLowerCase(),
  );
  const mockSourceCount = sourceNames.filter((n) =>
    MOCK_SOURCE_NAMES.some((m) => n.includes(m)),
  ).length;
  const isMockOnly =
    mockSourceCount > 0 &&
    mockSourceCount >= trace.sourceSummary.successfulSources;

  // ── 엔진 성공률 ──
  const engines = [
    result.pathfinder,
    result.roadview,
    result.persona,
    result.cluster,
  ].filter(Boolean);
  const successfulEngines = engines.filter((e) => e!.success).length;
  const engineSuccessRate =
    engines.length > 0 ? successfulEngines / engines.length : 0;

  // ── 전체 confidence ──
  const confidence = trace.confidence;
  const freshness = trace.freshness;
  const isPartial = trace.isPartial;

  // ── 품질 등급 결정 ──
  let level: DataQualityLevel;
  const warnings: string[] = [];

  if (isMockOnly) {
    level = "LOW";
    warnings.push("모든 데이터가 Mock 소스에서 제공됨 — 실데이터 수집 필요");
  } else if (confidence >= 0.7 && freshness === "fresh" && !isPartial) {
    level = "HIGH";
  } else if (confidence >= 0.4 && freshness !== "stale") {
    level = "MEDIUM";
  } else if (confidence >= 0.2) {
    level = "LOW";
  } else {
    level = "INSUFFICIENT";
  }

  // ── 추가 경고 수집 ──
  if (freshness === "stale") {
    warnings.push("데이터가 24시간 이상 경과 — 재수집 권장");
  }

  if (isPartial) {
    warnings.push(
      `부분 데이터: ${trace.partialDataFlags.join(", ") || "일부 소스 실패"}`,
    );
  }

  if (engineSuccessRate < 0.5) {
    warnings.push(
      `엔진 성공률 낮음: ${successfulEngines}/${engines.length}개 성공`,
    );
  }

  if (confidence < 0.3) {
    warnings.push(`낮은 신뢰도 (${Math.round(confidence * 100)}%)`);
    if (trace.lowConfidenceReasons.length > 0) {
      warnings.push(`이유: ${trace.lowConfidenceReasons.join(", ")}`);
    }
  }

  if (payloadSummary.totalRelatedKeywords < 5) {
    warnings.push(
      `연관 키워드 부족 (${payloadSummary.totalRelatedKeywords}개)`,
    );
  }

  // ── 활용 범위 결정 ──
  const usableForInsight = level !== "INSUFFICIENT";
  const usableForReport = level === "HIGH" || level === "MEDIUM";

  return {
    level,
    confidence,
    freshness,
    isPartial,
    isMockOnly,
    warnings,
    usableForReport,
    usableForInsight,
  };
}
