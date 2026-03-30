"use client";

import {
  Search,
  MessageCircle,
  MessagesSquare,
  Merge,
  ArrowDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Props = {
  signalQuality: {
    hasClusterData: boolean;
    hasSocialData: boolean;
    hasBenchmarkData: boolean;
    overallRichness: string;
  };
  fusedEvidenceCount: number;
  fusedInsightCount: number;
  fusedWarningCount: number;
  socialIntegration: {
    hasSocialData: boolean;
    socialDataQuality: string;
    evidenceCount: number;
    insightCount: number;
    warningCount: number;
  } | null;
  taxonomyMapping: {
    coveredCategories: { category: string; clusterCount: number }[];
    unmappedClusters: number;
    totalClusters: number;
  } | null;
};

type SignalLayer = {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  strength: number;
  detail: string;
  color: string;
  bgActive: string;
  bgInactive: string;
};

export function SignalFusionOverlayPanel({
  signalQuality,
  fusedEvidenceCount,
  fusedInsightCount,
  fusedWarningCount,
  socialIntegration,
  taxonomyMapping,
}: Props) {
  const searchStrength = taxonomyMapping
    ? Math.min(
        (taxonomyMapping.totalClusters / 20) * 100,
        100
      )
    : 0;

  const socialStrength = socialIntegration?.hasSocialData
    ? Math.min((socialIntegration.evidenceCount / 10) * 100, 100)
    : 0;

  const commentStrength = signalQuality.hasBenchmarkData ? 60 : 0;

  const layers: SignalLayer[] = [
    {
      key: "search",
      label: "검색 시그널",
      icon: <Search className="h-4 w-4" />,
      active: signalQuality.hasClusterData,
      strength: searchStrength,
      detail: taxonomyMapping
        ? `${taxonomyMapping.totalClusters}개 클러스터 / ${taxonomyMapping.coveredCategories.length}개 카테고리`
        : "미수집",
      color: "#10b981",
      bgActive: "bg-emerald-50 border-emerald-200",
      bgInactive: "bg-gray-50 border-dashed border-gray-300",
    },
    {
      key: "social",
      label: "소셜 시그널",
      icon: <MessageCircle className="h-4 w-4" />,
      active: signalQuality.hasSocialData,
      strength: socialStrength,
      detail: socialIntegration?.hasSocialData
        ? `증거 ${socialIntegration.evidenceCount}건 / 인사이트 ${socialIntegration.insightCount}건`
        : "미수집",
      color: "#3b82f6",
      bgActive: "bg-blue-50 border-blue-200",
      bgInactive: "bg-gray-50 border-dashed border-gray-300",
    },
    {
      key: "comment",
      label: "댓글 시그널",
      icon: <MessagesSquare className="h-4 w-4" />,
      active: signalQuality.hasBenchmarkData,
      strength: commentStrength,
      detail: signalQuality.hasBenchmarkData
        ? "벤치마크 데이터 연동"
        : "미수집",
      color: "#8b5cf6",
      bgActive: "bg-violet-50 border-violet-200",
      bgInactive: "bg-gray-50 border-dashed border-gray-300",
    },
  ];

  const activeCount = layers.filter((l) => l.active).length;
  const fusionTotal = fusedEvidenceCount + fusedInsightCount;

  return (
    <div className="card p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Merge className="h-4 w-4 text-[var(--muted-foreground)]" />
        <span className="text-[12px] font-semibold text-[var(--foreground)]">
          시그널 융합 현황
        </span>
        <span className="badge bg-[var(--secondary)] text-[10px] text-[var(--muted-foreground)]">
          {activeCount}/3 활성
        </span>
      </div>

      {/* Signal layers */}
      <div className="space-y-2">
        {layers.map((layer) => (
          <div
            key={layer.key}
            className={`relative rounded-lg border px-4 py-3 transition-all ${
              layer.active ? layer.bgActive : layer.bgInactive
            }`}
          >
            {/* Glow effect for active */}
            {layer.active && (
              <div
                className="absolute inset-0 rounded-lg opacity-10 pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 20px ${layer.color}`,
                }}
              />
            )}

            <div className="relative flex items-center gap-3">
              {/* Icon */}
              <span
                style={{ color: layer.active ? layer.color : "#9ca3af" }}
              >
                {layer.icon}
              </span>

              {/* Label + detail */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[12px] font-medium"
                    style={{
                      color: layer.active
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {layer.label}
                  </span>
                  {!layer.active && (
                    <span className="badge bg-gray-200 text-gray-500 text-[9px] border border-dashed border-gray-400">
                      미수집
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {layer.detail}
                </span>
              </div>

              {/* Strength bar */}
              <div className="w-20 shrink-0">
                <div className="h-1.5 rounded-full bg-[var(--secondary)]">
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${layer.active ? layer.strength : 0}%`,
                      backgroundColor: layer.color,
                    }}
                  />
                </div>
              </div>

              {/* Status icon */}
              {layer.active ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: layer.color }}
                />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Arrow indicators */}
      <div className="flex justify-center py-1">
        <div className="flex items-center gap-1 text-[var(--muted-foreground)]">
          <ArrowDown className="h-3.5 w-3.5" />
          <ArrowDown className="h-3.5 w-3.5" />
          <ArrowDown className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Fusion output */}
      <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <Merge className="h-5 w-5 text-indigo-600" />
          <div className="flex-1">
            <span className="text-[12px] font-semibold text-indigo-700">
              통합 시그널
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-indigo-600">
                증거{" "}
                <b className="text-[12px]">{fusedEvidenceCount}</b>건
              </span>
              <span className="text-[10px] text-indigo-600">
                인사이트{" "}
                <b className="text-[12px]">{fusedInsightCount}</b>건
              </span>
              {fusedWarningCount > 0 && (
                <span className="text-[10px] text-amber-600">
                  경고{" "}
                  <b className="text-[12px]">{fusedWarningCount}</b>건
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-indigo-700">
              {fusionTotal}
            </span>
            <p className="text-[9px] text-indigo-500">총 결과</p>
          </div>
        </div>
      </div>
    </div>
  );
}
