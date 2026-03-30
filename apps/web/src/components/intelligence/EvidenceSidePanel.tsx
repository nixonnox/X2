"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  X,
  FileText,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Info,
  Hash,
  ShieldCheck,
  Database,
  Sparkles,
} from "lucide-react";

type EvidenceNode = {
  type: string;
  label: string;
  category?: string;
  clusterCount?: number;
  taxonomyTags?: string[];
  confidence?: number;
};

type DataBlock = {
  id: string;
  type: string;
  label: string;
  value: number | string;
  taxonomyTags?: string[];
  category?: string;
  description?: string;
  sentences?: string[];
};

type BenchmarkBaseline = {
  metric: string;
  value: number;
  industryAvg: number;
  percentile?: number;
};

type SocialIntegration = {
  mentionCount?: number;
  sentiment?: string;
  topPlatforms?: string[];
  recentMentions?: { text: string; platform: string; date: string }[];
};

type Props = {
  node: EvidenceNode | null;
  onClose: () => void;
  industryType: string;
  industryLabel: string;
  dataBlocks?: DataBlock[];
  benchmarkBaseline?: BenchmarkBaseline[];
  socialIntegration?: SocialIntegration;
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80
      ? "bg-green-500"
      : pct >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-[var(--muted-foreground)]">신뢰도</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
      <Icon className="h-3.5 w-3.5" />
      {title}
    </h4>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <p className="py-3 text-center text-[12px] text-gray-400">{message}</p>
  );
}

function getNodeSummary(
  node: EvidenceNode,
  relatedBlocks: DataBlock[],
  socialIntegration?: SocialIntegration,
): { title: string; detail: string; source: string } {
  const blockCount = relatedBlocks.length;
  const hasDescriptions = relatedBlocks.some((b) => b.description);
  const hasSentences = relatedBlocks.some((b) => b.sentences && b.sentences.length > 0);
  const socialInfo = socialIntegration?.mentionCount
    ? `, 소셜 멘션 ${socialIntegration.mentionCount}건 감지`
    : "";

  switch (node.type) {
    case "seed":
      return {
        title: `'${node.label}' 키워드 인텔리전스`,
        detail: `이 키워드를 중심으로 ${blockCount}개의 데이터 블록이 생성되었습니다${socialInfo}. ${
          blockCount > 5
            ? "다양한 관점에서 풍부한 시그널이 수집되었습니다."
            : blockCount > 0
              ? "추가 데이터 수집 시 더 정밀한 분석이 가능합니다."
              : "아직 연결된 데이터가 부족합니다."
        }`,
        source: "검색 클러스터 분석",
      };
    case "taxonomy":
      return {
        title: `'${node.label}' 카테고리 분석`,
        detail: `${node.clusterCount ?? 0}개 클러스터가 이 카테고리에 매핑되었습니다. ${
          (node.clusterCount ?? 0) > 3
            ? "사용자 검색 의도가 이 카테고리에 강하게 집중되어 있습니다."
            : (node.clusterCount ?? 0) > 0
              ? "일부 검색 의도가 감지되었으나 데이터가 더 필요합니다."
              : "아직 관련 클러스터가 발견되지 않았습니다."
        }${socialInfo}`,
        source: "Taxonomy 매핑 엔진",
      };
    case "block": {
      const tags =
        node.taxonomyTags && node.taxonomyTags.length > 0
          ? node.taxonomyTags.join(", ")
          : "미분류";
      const contentHint = hasDescriptions
        ? " 상세 설명이 포함된 블록입니다."
        : hasSentences
          ? " 관련 문장 데이터가 포함되어 있습니다."
          : "";
      return {
        title: `'${node.label}' 데이터 블록`,
        detail: `${tags} 카테고리와 관련됩니다.${contentHint}${socialInfo}`,
        source: "클러스터 → 블록 변환",
      };
    }
    default:
      return {
        title: `'${node.label}' 노드 상세`,
        detail: "이 노드의 상세 정보입니다.",
        source: "분석 엔진",
      };
  }
}

function extractRelatedKeywords(blocks: DataBlock[], limit = 5): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const block of blocks) {
    if (block.sentences) {
      for (const sentence of block.sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 0 && trimmed.length <= 60 && !seen.has(trimmed)) {
          seen.add(trimmed);
          keywords.push(trimmed);
          if (keywords.length >= limit) return keywords;
        }
      }
    }
    if (block.label && !seen.has(block.label)) {
      seen.add(block.label);
      keywords.push(block.label);
      if (keywords.length >= limit) return keywords;
    }
  }
  return keywords;
}

export function EvidenceSidePanel({
  node,
  onClose,
  industryType,
  industryLabel,
  dataBlocks,
  benchmarkBaseline,
  socialIntegration,
}: Props) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  useEffect(() => {
    if (node) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [node]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  // Mobile drag-to-dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0]!.clientY;
    dragCurrentY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const deltaY = e.touches[0]!.clientY - dragStartY.current;
    if (deltaY > 0) {
      dragCurrentY.current = deltaY;
      if (panelRef.current) {
        panelRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragCurrentY.current > 100) {
      handleClose();
    } else if (panelRef.current) {
      panelRef.current.style.transform = "";
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [handleClose]);

  if (!node) return null;

  // Filter data blocks that match the node's taxonomy or type
  const relatedBlocks = (dataBlocks ?? []).filter((block) => {
    if (node.taxonomyTags && block.taxonomyTags) {
      const overlap = node.taxonomyTags.some((tag) =>
        block.taxonomyTags!.includes(tag),
      );
      if (overlap) return true;
    }
    if (block.type === node.type) return true;
    if (node.category && block.category === node.category) return true;
    return false;
  });

  // Filter benchmarks relevant to the node
  const relatedBenchmarks = (benchmarkBaseline ?? []).filter((b) => {
    const metricLower = b.metric.toLowerCase();
    const labelLower = node.label.toLowerCase();
    const typeLower = node.type.toLowerCase();
    return metricLower.includes(labelLower) || metricLower.includes(typeLower);
  });

  const summary = getNodeSummary(node, relatedBlocks, socialIntegration);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed z-50 flex flex-col border-[var(--border)] bg-white shadow-xl transition-transform duration-200 ease-out
          inset-x-0 bottom-0 top-auto max-h-[85vh] rounded-t-2xl border-t
          md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:max-h-none md:h-screen md:w-[340px] lg:w-[400px] md:rounded-none md:border-l md:border-t-0
          ${visible ? "translate-y-0 md:translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {/* Mobile drag handle */}
        <div
          className="flex justify-center py-2 md:hidden touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold">
              {node.label}
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {node.type}
              {node.category ? ` · ${node.category}` : ""}
              {" · "}
              {industryLabel}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="ml-2 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Node meta */}
          {(node.clusterCount !== undefined ||
            (node.taxonomyTags && node.taxonomyTags.length > 0)) && (
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              {node.clusterCount !== undefined && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[var(--muted-foreground)]">
                    관련 클러스터
                  </span>
                  <span className="font-medium">{node.clusterCount}개</span>
                </div>
              )}
              {node.taxonomyTags && node.taxonomyTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {node.taxonomyTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1.5">
            <SectionHeader icon={Info} title="요약" />
            <div className="rounded-lg bg-blue-50 p-3 space-y-2">
              <p className="text-[12px] font-medium text-blue-900">
                {summary.title}
              </p>
              <p className="text-[11px] leading-relaxed text-blue-800">
                {summary.detail}
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                <Database className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] text-blue-500">
                  출처: {summary.source}
                </span>
              </div>
            </div>
          </div>

          {/* 관련 키워드/질문 */}
          <div className="space-y-1.5">
            <SectionHeader icon={Hash} title="관련 키워드/질문" />
            {(() => {
              const keywords = extractRelatedKeywords(relatedBlocks);
              return keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-[12px] text-gray-400">
                  관련 키워드 정보가 없습니다
                </p>
              );
            })()}
          </div>

          {/* Confidence */}
          {node.confidence !== undefined && (
            <div className="space-y-1.5">
              <SectionHeader icon={TrendingUp} title="신뢰도" />
              <div className="rounded-lg bg-gray-50 p-3">
                <ConfidenceBar confidence={node.confidence} />
              </div>
            </div>
          )}

          {/* Related data blocks */}
          <div className="space-y-2">
            <SectionHeader icon={FileText} title="관련 데이터 블록" />
            {relatedBlocks.length > 0 ? (
              <div className="space-y-2">
                {relatedBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-lg bg-gray-50 p-3 space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium">{block.label}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {block.type}
                          {block.category ? ` · ${block.category}` : ""}
                        </p>
                      </div>
                      <span className="ml-2 text-[13px] font-semibold tabular-nums">
                        {typeof block.value === "number"
                          ? block.value.toLocaleString()
                          : block.value}
                      </span>
                    </div>
                    {block.description && (
                      <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                        {block.description}
                      </p>
                    )}
                    {/* Show sentence evidence */}
                    {block.sentences && block.sentences.length > 0 && (
                      <div className="space-y-1 border-l-2 border-blue-200 pl-2">
                        {block.sentences.slice(0, 3).map((s, idx) => (
                          <p
                            key={idx}
                            className="text-[10px] leading-relaxed text-gray-600 italic"
                          >
                            &ldquo;{s}&rdquo;
                          </p>
                        ))}
                        {block.sentences.length > 3 && (
                          <p className="text-[10px] text-gray-400">
                            +{block.sentences.length - 3}건 더
                          </p>
                        )}
                      </div>
                    )}
                    {block.taxonomyTags && block.taxonomyTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {block.taxonomyTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-white px-1.5 py-0.5 text-[9px] text-[var(--muted-foreground)] ring-1 ring-gray-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50">
                <EmptySection message="관련 데이터 없음" />
              </div>
            )}
          </div>

          {/* Benchmark context */}
          <div className="space-y-2">
            <SectionHeader icon={TrendingUp} title="벤치마크 맥락" />
            {relatedBenchmarks.length > 0 ? (
              <div className="space-y-2">
                {relatedBenchmarks.map((benchmark, idx) => {
                  const diff = benchmark.value - benchmark.industryAvg;
                  const diffPct =
                    benchmark.industryAvg !== 0
                      ? ((diff / benchmark.industryAvg) * 100).toFixed(1)
                      : "N/A";
                  const isPositive = diff >= 0;

                  return (
                    <div
                      key={`${benchmark.metric}-${idx}`}
                      className="rounded-lg bg-gray-50 p-3"
                    >
                      <p className="text-[12px] font-medium">
                        {benchmark.metric}
                      </p>
                      <div className="mt-1.5 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <p className="text-[var(--muted-foreground)]">현재</p>
                          <p className="font-semibold tabular-nums">
                            {benchmark.value.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">
                            업계 평균
                          </p>
                          <p className="font-semibold tabular-nums">
                            {benchmark.industryAvg.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-[var(--muted-foreground)]">차이</p>
                          <p
                            className={`font-semibold tabular-nums ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {diffPct}%
                          </p>
                        </div>
                      </div>
                      {benchmark.percentile !== undefined && (
                        <p className="mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                          상위 {100 - benchmark.percentile}% ({industryLabel})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50">
                <EmptySection message="관련 데이터 없음" />
              </div>
            )}
          </div>

          {/* Social signals */}
          <div className="space-y-2">
            <SectionHeader icon={MessageSquare} title="소셜 신호" />
            {socialIntegration &&
            (socialIntegration.mentionCount ||
              (socialIntegration.recentMentions &&
                socialIntegration.recentMentions.length > 0)) ? (
              <div className="space-y-2">
                {/* Summary stats */}
                <div className="flex gap-2">
                  {socialIntegration.mentionCount !== undefined && (
                    <div className="flex-1 rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        멘션 수
                      </p>
                      <p className="text-[16px] font-semibold tabular-nums">
                        {socialIntegration.mentionCount.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {socialIntegration.sentiment && (
                    <div className="flex-1 rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        감성
                      </p>
                      <p className="text-[13px] font-medium">
                        {socialIntegration.sentiment}
                      </p>
                    </div>
                  )}
                </div>

                {/* Top platforms */}
                {socialIntegration.topPlatforms &&
                  socialIntegration.topPlatforms.length > 0 && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-1.5 text-[10px] text-[var(--muted-foreground)]">
                        주요 플랫폼
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {socialIntegration.topPlatforms.map((platform) => (
                          <span
                            key={platform}
                            className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] ring-1 ring-gray-200"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Recent mentions */}
                {socialIntegration.recentMentions &&
                  socialIntegration.recentMentions.length > 0 && (
                    <div className="space-y-1.5">
                      {socialIntegration.recentMentions.map((mention, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-gray-50 p-3"
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
                            <span className="font-medium">
                              {mention.platform}
                            </span>
                            <span>·</span>
                            <span>{mention.date}</span>
                          </div>
                          <p className="line-clamp-3 text-[11px] leading-relaxed">
                            {mention.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="rounded-lg bg-gray-50">
                <EmptySection message="관련 데이터 없음" />
              </div>
            )}
          </div>

          {/* Coverage state */}
          <div className="space-y-2">
            <SectionHeader icon={ShieldCheck} title="커버리지 상태" />
            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              {node.confidence !== undefined && (
                <ConfidenceBar confidence={node.confidence} />
              )}

              <div className="space-y-1.5 pt-1">
                {relatedBenchmarks.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-700">
                    <ChevronRight className="h-3 w-3" />
                    <span>벤치마크 비교 데이터 있음</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      이 노드의 벤치마크 비교 데이터가 없습니다
                    </span>
                  </div>
                )}

                {socialIntegration &&
                (socialIntegration.mentionCount ||
                  (socialIntegration.recentMentions &&
                    socialIntegration.recentMentions.length > 0)) ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-green-700">
                    <ChevronRight className="h-3 w-3" />
                    <span>소셜 신호 감지됨</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      이 노드와 관련된 소셜 신호가 없습니다
                    </span>
                  </div>
                )}

                {node.confidence !== undefined && node.confidence < 0.5 && (
                  <div className="mt-1 flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-[11px] text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                    <span>
                      신뢰도가 낮은 노드입니다. 참고 수준으로 활용하세요.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
