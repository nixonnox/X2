"use client";

import { useState } from "react";
import {
  Layers,
  BarChart3,
  MessageSquare,
  Merge,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Props = {
  industryType: string;
  industryLabel: string;
  signalQuality: {
    hasClusterData: boolean;
    hasSocialData: boolean;
    hasBenchmarkData: boolean;
    overallRichness: "RICH" | "MODERATE" | "MINIMAL";
  };
  taxonomyMapping: {
    coveredCategories: { category: string; clusterCount: number }[];
    uncoveredCategories: string[];
    unmappedClusters: number;
    totalClusters: number;
  } | null;
  benchmarkBaseline: {
    key: string;
    label: string;
    value: number;
    unit: string;
    description: string;
  }[];
  benchmarkComparison: {
    overallScore: number;
    highlights: string[];
    warnings: string[];
    comparisons: {
      key: string;
      label: string;
      rating: string;
      baseline: number;
      actual: number;
      deviation: number;
      interpretation: string;
    }[];
  } | null;
  socialIntegration: {
    hasSocialData: boolean;
    socialDataQuality: string;
    evidenceCount: number;
    insightCount: number;
    warningCount: number;
  } | null;
  fusedEvidenceCount: number;
  fusedInsightCount: number;
  fusedWarningCount: number;
  metadata: {
    confidence: number;
    freshness?: string;
    isPartial?: boolean;
    isMockOnly?: boolean;
    isStaleBased?: boolean;
  };
};

const richnessConfig = {
  RICH: {
    label: "풍부",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    glow: "shadow-emerald-200/50 shadow-md",
    dot: "bg-emerald-500",
  },
  MODERATE: {
    label: "보통",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    glow: "shadow-blue-200/50 shadow-md",
    dot: "bg-blue-500",
  },
  MINIMAL: {
    label: "최소",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    glow: "shadow-gray-200/50 shadow-sm",
    dot: "bg-gray-400",
  },
};

export function IntelligenceSummaryCards({
  industryLabel,
  signalQuality,
  taxonomyMapping,
  benchmarkComparison,
  socialIntegration,
  fusedEvidenceCount,
  fusedInsightCount,
  fusedWarningCount,
  metadata,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const richness = richnessConfig[signalQuality.overallRichness];

  const taxonomyCoverage = taxonomyMapping
    ? Math.round(
        (taxonomyMapping.coveredCategories.length /
          (taxonomyMapping.coveredCategories.length +
            taxonomyMapping.uncoveredCategories.length)) *
          100
      )
    : null;

  const benchmarkScore = benchmarkComparison?.overallScore ?? null;
  const socialCount = socialIntegration?.evidenceCount ?? 0;
  const fusionTotal = fusedEvidenceCount + fusedInsightCount;

  const confidencePercent = Math.round(metadata.confidence * 100);
  const confidenceColor =
    confidencePercent >= 70
      ? "bg-emerald-500"
      : confidencePercent >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-3">
      {/* Signal quality indicator */}
      <div
        className={`card flex items-center gap-3 px-4 py-3 border ${richness.border} ${richness.glow}`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${richness.dot}`} />
        <div className="flex items-center gap-2">
          <span
            className={`text-[12px] font-semibold ${richness.color}`}
          >
            시그널 품질: {richness.label}
          </span>
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {industryLabel}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {signalQuality.hasClusterData && (
            <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
              검색
            </span>
          )}
          {signalQuality.hasSocialData && (
            <span className="badge bg-blue-100 text-blue-700 text-[10px]">
              소셜
            </span>
          )}
          {signalQuality.hasBenchmarkData && (
            <span className="badge bg-violet-100 text-violet-700 text-[10px]">
              벤치마크
            </span>
          )}
        </div>
      </div>

      {/* Mini cards row */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {/* Taxonomy Coverage */}
        <MiniCard
          icon={<Layers className="h-4 w-4" />}
          label="분류 커버리지"
          value={taxonomyCoverage !== null ? `${taxonomyCoverage}%` : null}
          description={
            taxonomyMapping
              ? `${taxonomyMapping.coveredCategories.length}개 카테고리`
              : undefined
          }
          status={
            taxonomyCoverage !== null
              ? taxonomyCoverage >= 60
                ? "good"
                : taxonomyCoverage >= 30
                  ? "warn"
                  : "bad"
              : "none"
          }
        />

        {/* Benchmark Score */}
        <MiniCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="벤치마크 점수"
          value={benchmarkScore !== null ? `${benchmarkScore}` : null}
          description={
            benchmarkComparison
              ? `${benchmarkComparison.comparisons.length}개 지표`
              : undefined
          }
          status={
            benchmarkScore !== null
              ? benchmarkScore >= 70
                ? "good"
                : benchmarkScore >= 40
                  ? "warn"
                  : "bad"
              : "none"
          }
        />

        {/* Social Signals */}
        <MiniCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="소셜 시그널"
          value={
            socialIntegration?.hasSocialData ? `${socialCount}건` : null
          }
          description={
            socialIntegration
              ? `인사이트 ${socialIntegration.insightCount}건`
              : undefined
          }
          status={
            socialIntegration?.hasSocialData
              ? socialCount > 5
                ? "good"
                : socialCount > 0
                  ? "warn"
                  : "bad"
              : "none"
          }
        />

        {/* Fusion Output */}
        <MiniCard
          icon={<Merge className="h-4 w-4" />}
          label="통합 결과"
          value={fusionTotal > 0 ? `${fusionTotal}건` : null}
          description={
            fusionTotal > 0
              ? `증거 ${fusedEvidenceCount} / 인사이트 ${fusedInsightCount}`
              : undefined
          }
          status={
            fusionTotal > 0
              ? fusedWarningCount === 0
                ? "good"
                : "warn"
              : "none"
          }
        />
      </div>

      {/* Confidence bar + badges */}
      <div className="card px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
            신뢰도
          </span>
          <span className="text-[11px] font-semibold text-[var(--foreground)]">
            {confidencePercent}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--secondary)]">
          <div
            className={`h-1.5 rounded-full transition-all ${confidenceColor}`}
            style={{ width: `${confidencePercent}%` }}
          />
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {metadata.freshness && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-[var(--muted-foreground)]" />
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {metadata.freshness}
              </span>
            </div>
          )}
          {metadata.isStaleBased && (
            <span className="badge bg-amber-100 text-amber-700 text-[10px]">
              과거 데이터 기반
            </span>
          )}
          {metadata.isPartial && (
            <span className="badge bg-amber-100 text-amber-700 text-[10px]">
              부분 데이터
            </span>
          )}
          {metadata.isMockOnly && (
            <span className="badge bg-red-100 text-red-700 text-[10px]">
              샘플 데이터
            </span>
          )}
          {fusedWarningCount > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-amber-700">
                경고 {fusedWarningCount}건
              </span>
            </div>
          )}
        </div>

        {/* Expandable details */}
        {(benchmarkComparison?.highlights.length ||
          benchmarkComparison?.warnings.length) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            상세 보기
          </button>
        )}
        {expanded && benchmarkComparison && (
          <div className="space-y-1.5 pt-1">
            {benchmarkComparison.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-[var(--foreground)]">
                  {h}
                </span>
              </div>
            ))}
            {benchmarkComparison.warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                <span className="text-[11px] text-amber-700">{w}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniCard({
  icon,
  label,
  value,
  description,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  description?: string;
  status: "good" | "warn" | "bad" | "none";
}) {
  const statusStyles = {
    good: "border-emerald-200 bg-emerald-50/30",
    warn: "border-amber-200 bg-amber-50/30",
    bad: "border-red-200 bg-red-50/30",
    none: "border-gray-200 bg-gray-50/50 opacity-60",
  };

  const iconColor = {
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
    none: "text-gray-400",
  };

  return (
    <div
      className={`card border px-3 py-2.5 space-y-1 ${statusStyles[status]}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={iconColor[status]}>{icon}</span>
        <span className="text-[10px] font-medium text-[var(--muted-foreground)] truncate">
          {label}
        </span>
      </div>
      {value !== null ? (
        <>
          <p className="text-lg font-semibold text-[var(--foreground)] leading-tight">
            {value}
          </p>
          {description && (
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">
              {description}
            </p>
          )}
        </>
      ) : (
        <p className="text-[11px] text-gray-400 italic">데이터 없음</p>
      )}
    </div>
  );
}
