"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
} from "lucide-react";
import type { AiEvalCase, AiEvalResult } from "@/lib/ai/types";

// ── 점수 색상 ──

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-50";
  if (score >= 70) return "bg-blue-50";
  if (score >= 50) return "bg-amber-50";
  return "bg-red-50";
}

// ── 페이지 ──

export default function AdminAiEvalsPage() {
  const t = useTranslations("admin");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [evalCases, setEvalCases] = useState<AiEvalCase[]>([]);
  const [results, setResults] = useState<AiEvalResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@/lib/ai/evals/eval-cases").then((m) => m.SAMPLE_EVAL_CASES),
      import("@/lib/ai/evals/eval-service").then((m) =>
        m.evalService.getResults(),
      ),
    ])
      .then(([cases, res]) => {
        if (cancelled) return;
        setEvalCases(cases);
        setResults(res);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRunEval = useCallback(async (id: string) => {
    setRunningId(id);
    try {
      const { evalService } = await import("@/lib/ai/evals/eval-service");
      await evalService.runEval(id);
      const updated = evalService.getResults();
      setResults(updated);
    } catch {
      /* silent */
    } finally {
      setRunningId(null);
    }
  }, []);

  const getLastResult = (id: string): AiEvalResult | undefined =>
    results.filter((r) => r.evalCaseId === id).at(-1);

  const evalCasesWithResults = evalCases.filter((c) => getLastResult(c.id));
  const avgScore =
    evalCasesWithResults.length > 0
      ? Math.round(
          evalCasesWithResults.reduce(
            (s, c) => s + (getLastResult(c.id)?.scores.overall ?? 0),
            0,
          ) / evalCasesWithResults.length,
        )
      : 0;

  return (
    <AdminPageLayout
      title="AI 품질 평가"
      description="AI 분석 결과의 품질을 평가하고 모니터링합니다."
      infoText="각 작업 유형별로 평가 케이스가 정의되어 있으며, 자동 평가 또는 수동 리뷰를 통해 AI 결과 품질을 관리합니다."
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
                평가 케이스
              </p>
              <p className="mt-1 text-lg font-semibold">{evalCases.length}개</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
                평가 완료
              </p>
              <p className="mt-1 text-lg font-semibold">
                {evalCasesWithResults.length}개
              </p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
                평균 점수
              </p>
              <p
                className={`mt-1 text-lg font-semibold ${getScoreColor(avgScore)}`}
              >
                {avgScore > 0 ? `${avgScore}점` : "-"}
              </p>
            </div>
          </div>

          {/* 평가 케이스 목록 */}
          <div className="space-y-2">
            {evalCases.map((evalCase) => {
              const lastResult = getLastResult(evalCase.id);
              const isExpanded = expandedId === evalCase.id;
              const isRunning = runningId === evalCase.id;
              const criteriaEntries = Object.entries(evalCase.criteria) as [
                string,
                { weight: number; description: string },
              ][];

              return (
                <div key={evalCase.id} className="card overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : evalCase.id)
                      }
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <Shield className="h-4 w-4 shrink-0 text-indigo-600" />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">
                          {evalCase.name}
                        </p>
                        <p className="text-[11px] text-[var(--muted-foreground)]">
                          {evalCase.taskType} · {evalCase.language}
                        </p>
                      </div>
                      {lastResult && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getScoreBg(lastResult.scores.overall)} ${getScoreColor(lastResult.scores.overall)}`}
                        >
                          {lastResult.scores.overall}점
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRunEval(evalCase.id)}
                      disabled={isRunning}
                      className="flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isRunning ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {isRunning ? "실행 중..." : "실행"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 border-t px-4 py-3">
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {evalCase.description}
                      </p>
                      <div>
                        <p className="mb-2 text-[11px] font-medium text-[var(--muted-foreground)]">
                          평가 기준
                        </p>
                        <div className="space-y-1">
                          {criteriaEntries.map(([key, val]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded-md bg-[var(--secondary)] px-3 py-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <Star className="h-3 w-3 text-amber-500" />
                                <span className="text-[11px]">{key}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[var(--muted-foreground)]">
                                  {Math.round(val.weight * 100)}%
                                </span>
                                {lastResult && (
                                  <span
                                    className={`text-[11px] font-semibold ${getScoreColor((lastResult.scores as Record<string, number>)[key] ?? 0)}`}
                                  >
                                    {(
                                      lastResult.scores as Record<
                                        string,
                                        number
                                      >
                                    )[key] ?? "-"}
                                    점
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {lastResult && (
                        <div className="flex items-center gap-3 text-[11px] text-[var(--muted-foreground)]">
                          {lastResult.scores.overall >= 70 ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          <span>
                            최근 평가:{" "}
                            {new Date(lastResult.evaluatedAt).toLocaleString(
                              "ko-KR",
                            )}
                          </span>
                          <span>by {lastResult.evaluatedBy}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminPageLayout>
  );
}
