"use client";

import { ArrowRight, Layers, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type ClusterData = {
  clusters?: {
    id?: string;
    label: string;
    memberCount?: number;
    keywords?: string[];
    topKeywords?: string[];
  }[];
  totalClusters?: number;
};

type ClusterSectionProps = {
  clusterResult: EngineExecutionResult<unknown> | undefined;
};

export function ClusterSection({ clusterResult }: ClusterSectionProps) {
  if (!clusterResult) {
    return (
      <section id="section-cluster">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <Layers className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 클러스터가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = clusterResult.data as ClusterData | undefined;
  const clusters = data?.clusters ?? [];
  const confidence = clusterResult.trace?.confidence ?? 0;
  const freshness = clusterResult.trace?.freshness;

  return (
    <section id="section-cluster" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          클러스터 분석
        </h2>
        <Link
          href="/cluster-finder"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Warnings */}
      {confidence < 0.3 && (
        <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            클러스터 신뢰도가 낮습니다 ({Math.round(confidence * 100)}%).
          </p>
        </div>
      )}
      {freshness === "stale" && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <p className="text-[12px] text-amber-700">
            데이터가 오래되었습니다. 최신 분석을 다시 실행하세요.
          </p>
        </div>
      )}

      {!clusterResult.success && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
          클러스터 분석 실패: {clusterResult.error ?? "알 수 없는 오류"}
        </div>
      )}

      {clusterResult.success && clusters.length === 0 && (
        <div className="card border-dashed px-6 py-8 text-center">
          <p className="text-[13px] text-[var(--muted-foreground)]">
            클러스터 결과가 없습니다.
          </p>
        </div>
      )}

      {clusters.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clusters.map((cluster, i) => {
              const topKws = cluster.topKeywords ?? cluster.keywords?.slice(0, 5) ?? [];
              return (
                <Link
                  key={cluster.id ?? i}
                  href="/cluster-finder"
                  className="card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                      {cluster.label}
                    </h3>
                    <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted-foreground)]">
                      {cluster.memberCount ?? cluster.keywords?.length ?? 0}개
                    </span>
                  </div>
                  {topKws.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {topKws.map((kw) => (
                        <span
                          key={kw}
                          className="rounded bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Confidence indicator */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
            <span>클러스터 신뢰도:</span>
            <div className="h-1.5 w-20 rounded-full bg-[var(--secondary)]">
              <div
                className="h-1.5 rounded-full bg-blue-500"
                style={{ width: `${Math.round(confidence * 100)}%` }}
              />
            </div>
            <span>{Math.round(confidence * 100)}%</span>
          </div>

          {/* Cross-section CTA */}
          <button
            onClick={() => {
              const el = document.getElementById("section-persona");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            페르소나에서 이 클러스터의 검색자 유형 확인하기
            <ArrowRight className="h-3 w-3" />
          </button>
        </>
      )}
    </section>
  );
}
