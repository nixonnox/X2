"use client";

import { ArrowRight, GitBranch, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import type { EngineExecutionResult } from "@/services/search-intelligence";

type PathfinderData = {
  nodes?: { id?: string; name?: string; label?: string; hubScore?: number }[];
  paths?: { steps?: unknown[]; keywords?: unknown[] }[];
  totalNodes?: number;
  totalPaths?: number;
};

type PathfinderSectionProps = {
  pathfinderResult: EngineExecutionResult<unknown> | undefined;
};

export function PathfinderSection({
  pathfinderResult,
}: PathfinderSectionProps) {
  if (!pathfinderResult) {
    return (
      <section id="section-pathfinder">
        <div className="card flex flex-col items-center justify-center border-dashed px-6 py-12 text-center">
          <GitBranch className="h-8 w-8 text-[var(--muted-foreground)]" />
          <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">
            분석을 실행하면 검색 경로가 여기에 표시됩니다
          </p>
        </div>
      </section>
    );
  }

  const data = pathfinderResult.data as PathfinderData | undefined;
  const nodes = data?.nodes ?? [];
  const paths = data?.paths ?? [];
  const nodeCount = data?.totalNodes ?? nodes.length;
  const pathCount = data?.totalPaths ?? paths.length;
  const confidence = pathfinderResult.trace?.confidence ?? 0;
  const freshness = pathfinderResult.trace?.freshness;

  // Top hub keywords (by hubScore)
  const topHubs = [...nodes]
    .sort((a, b) => (b.hubScore ?? 0) - (a.hubScore ?? 0))
    .slice(0, 5);

  // Top 3 paths preview
  const topPaths = paths.slice(0, 3);

  return (
    <section id="section-pathfinder" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
          검색 경로 (Pathfinder)
        </h2>
        <Link
          href="/pathfinder"
          className="flex items-center gap-1 text-[12px] font-medium text-blue-600 hover:underline"
        >
          전체 그래프 보기 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {confidence < 0.3 && (
        <div className="flex items-start gap-2 rounded-md bg-orange-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-orange-400" />
          <p className="text-[12px] text-orange-700">
            경로 탐색 신뢰도가 낮습니다 ({Math.round(confidence * 100)}%).
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

      {!pathfinderResult.success && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
          경로 탐색 실패:{" "}
          {typeof pathfinderResult.error === "string"
            ? pathfinderResult.error
            : "알 수 없는 오류"}
        </div>
      )}

      {pathfinderResult.success && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                노드 수
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">{nodeCount}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                경로 수
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">{pathCount}</p>
            </div>
            <div className="card p-3">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                허브 키워드
              </p>
              <p className="mt-0.5 text-[14px] font-semibold">
                {topHubs.length}
              </p>
            </div>
          </div>

          {/* Top hub keywords */}
          {topHubs.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-2 text-[12px] font-semibold text-[var(--muted-foreground)]">
                핵심 허브 키워드
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {topHubs.map((hub, i) => (
                  <span
                    key={hub.id ?? i}
                    className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700"
                  >
                    {hub.name ?? hub.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Top paths preview */}
          {topPaths.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-[12px] font-semibold text-[var(--muted-foreground)]">
                주요 검색 경로 미리보기
              </h3>
              <div className="space-y-2">
                {topPaths.map((path, i) => {
                  const rawSteps = path.steps ?? path.keywords ?? [];
                  // steps may be strings or objects — normalize to string[]
                  const steps = rawSteps.map((s: unknown) =>
                    typeof s === "string"
                      ? s
                      : ((s as any)?.keyword ??
                        (s as any)?.label ??
                        (s as any)?.name ??
                        JSON.stringify(s)),
                  );
                  return (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-1 rounded-md bg-[var(--secondary)] px-3 py-2"
                    >
                      {steps.map((step: string, j: number) => (
                        <span key={j} className="flex items-center gap-1">
                          <span className="text-[12px] font-medium text-[var(--foreground)]">
                            {step}
                          </span>
                          {j < steps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-[var(--muted-foreground)]" />
                          )}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cross-section CTA */}
          <button
            onClick={() => {
              const el = document.getElementById("section-action");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-2 text-[12px] font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            이 경로에 기반한 콘텐츠 액션 보기
            <ArrowRight className="h-3 w-3" />
          </button>
        </>
      )}
    </section>
  );
}
