"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { AdminPageLayout } from "@/components/admin";
import {
  Shield,
  Play,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";

// ── 타입 ──

type EvalCase = {
  id: string;
  taskType: string;
  name: string;
  description: string;
  language: string;
  criteria: { name: string; weight: number }[];
  lastResult: EvalResult | null;
};

type EvalResult = {
  scores: Record<string, number>;
  overall: number;
  evaluatedAt: string;
  evaluatedBy: string;
};

// ── Mock 평가 케이스 ──

const MOCK_EVAL_CASES: EvalCase[] = [
  {
    id: "eval-sentiment-001",
    taskType: "comment_sentiment_analysis",
    name: "댓글 감성 분석 기본 테스트",
    description:
      "긍정/부정/중립 댓글 혼합 세트에 대한 감성 분류 정확도를 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.3 },
      { name: "명확성", weight: 0.2 },
      { name: "실행 가능성", weight: 0.1 },
      { name: "안전성", weight: 0.15 },
      { name: "한국어 자연스러움", weight: 0.15 },
      { name: "스키마 유효성", weight: 0.1 },
    ],
    lastResult: {
      scores: {
        정확성: 82,
        명확성: 88,
        "실행 가능성": 72,
        안전성: 95,
        "한국어 자연스러움": 90,
        "스키마 유효성": 100,
      },
      overall: 86,
      evaluatedAt: "2026-03-08T10:30:00Z",
      evaluatedBy: "auto",
    },
  },
  {
    id: "eval-strategy-001",
    taskType: "strategy_insight_generation",
    name: "전략 인사이트 품질 테스트",
    description:
      "소셜 미디어 데이터를 기반으로 한 전략 인사이트 생성 품질을 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.25 },
      { name: "명확성", weight: 0.2 },
      { name: "실행 가능성", weight: 0.25 },
      { name: "안전성", weight: 0.1 },
      { name: "한국어 자연스러움", weight: 0.1 },
      { name: "스키마 유효성", weight: 0.1 },
    ],
    lastResult: {
      scores: {
        정확성: 78,
        명확성: 85,
        "실행 가능성": 80,
        안전성: 92,
        "한국어 자연스러움": 88,
        "스키마 유효성": 95,
      },
      overall: 84,
      evaluatedAt: "2026-03-08T11:00:00Z",
      evaluatedBy: "auto",
    },
  },
  {
    id: "eval-reply-001",
    taskType: "reply_suggestion_generation",
    name: "댓글 답변 추천 톤 테스트",
    description:
      "다양한 댓글 유형에 대한 답변 추천의 브랜드 톤 적합성을 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.2 },
      { name: "명확성", weight: 0.2 },
      { name: "실행 가능성", weight: 0.15 },
      { name: "안전성", weight: 0.25 },
      { name: "한국어 자연스러움", weight: 0.15 },
      { name: "스키마 유효성", weight: 0.05 },
    ],
    lastResult: null,
  },
  {
    id: "eval-report-001",
    taskType: "report_summary_generation",
    name: "리포트 요약 정확도 테스트",
    description:
      "분석 리포트 요약의 정확성과 핵심 지표 포함 여부를 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.3 },
      { name: "명확성", weight: 0.25 },
      { name: "실행 가능성", weight: 0.15 },
      { name: "안전성", weight: 0.1 },
      { name: "한국어 자연스러움", weight: 0.1 },
      { name: "스키마 유효성", weight: 0.1 },
    ],
    lastResult: {
      scores: {
        정확성: 75,
        명확성: 82,
        "실행 가능성": 70,
        안전성: 90,
        "한국어 자연스러움": 85,
        "스키마 유효성": 100,
      },
      overall: 81,
      evaluatedAt: "2026-03-07T15:00:00Z",
      evaluatedBy: "auto",
    },
  },
  {
    id: "eval-faq-001",
    taskType: "faq_extraction",
    name: "FAQ 추출 정확도 테스트",
    description: "댓글 세트에서 반복되는 질문을 정확히 추출하는지 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.35 },
      { name: "명확성", weight: 0.2 },
      { name: "실행 가능성", weight: 0.15 },
      { name: "안전성", weight: 0.1 },
      { name: "한국어 자연스러움", weight: 0.1 },
      { name: "스키마 유효성", weight: 0.1 },
    ],
    lastResult: null,
  },
  {
    id: "eval-competitor-001",
    taskType: "competitor_insight_generation",
    name: "경쟁사 인사이트 객관성 테스트",
    description:
      "경쟁사 분석 결과의 객관성과 근거 기반 표현 사용 여부를 평가합니다.",
    language: "ko",
    criteria: [
      { name: "정확성", weight: 0.25 },
      { name: "명확성", weight: 0.2 },
      { name: "실행 가능성", weight: 0.2 },
      { name: "안전성", weight: 0.2 },
      { name: "한국어 자연스러움", weight: 0.1 },
      { name: "스키마 유효성", weight: 0.05 },
    ],
    lastResult: {
      scores: {
        정확성: 80,
        명확성: 83,
        "실행 가능성": 77,
        안전성: 88,
        "한국어 자연스러움": 86,
        "스키마 유효성": 95,
      },
      overall: 83,
      evaluatedAt: "2026-03-08T09:00:00Z",
      evaluatedBy: "auto",
    },
  },
];

// ── 점수 색상 ──

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 90) return "bg-green-50";
  if (score >= 70) return "bg-blue-50";
  if (score >= 50) return "bg-amber-50";
  return "bg-red-50";
}

// ── 페이지 ──

export default function AdminAiEvalsPage() {
  const t = useTranslations("admin");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const evalCasesWithResults = MOCK_EVAL_CASES.filter((c) => c.lastResult);
  const avgScore =
    evalCasesWithResults.length > 0
      ? Math.round(
          evalCasesWithResults.reduce(
            (s, c) => s + (c.lastResult?.overall ?? 0),
            0,
          ) / evalCasesWithResults.length,
        )
      : 0;

  const handleRunEval = (id: string) => {
    setRunningId(id);
    // Mock: 2초 후 완료
    setTimeout(() => setRunningId(null), 2000);
  };

  return (
    <AdminPageLayout
      title="AI 품질 평가"
      description="AI 분석 결과의 품질을 평가하고 모니터링합니다."
      infoText="각 작업 유형별로 평가 케이스가 정의되어 있으며, 자동 평가 또는 수동 리뷰를 통해 AI 결과 품질을 관리합니다."
    >
      {/* 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
            평가 케이스
          </p>
          <p className="mt-1 text-lg font-semibold">
            {MOCK_EVAL_CASES.length}개
          </p>
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
          <p className={`mt-1 text-lg font-semibold ${scoreColor(avgScore)}`}>
            {avgScore}점
          </p>
        </div>
      </div>

      {/* 평가 케이스 목록 */}
      <div className="space-y-2">
        {MOCK_EVAL_CASES.map((evalCase) => {
          const isExpanded = expandedId === evalCase.id;
          const isRunning = runningId === evalCase.id;
          const result = evalCase.lastResult;

          return (
            <div key={evalCase.id} className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : evalCase.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <Shield className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-[13px] font-semibold">{evalCase.name}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      {evalCase.description}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {result && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${scoreBg(result.overall)} ${scoreColor(result.overall)}`}
                    >
                      {result.overall}점
                    </span>
                  )}
                  {!result && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                      미평가
                    </span>
                  )}
                  <button
                    onClick={() => handleRunEval(evalCase.id)}
                    disabled={isRunning}
                    className="hover:bg-[var(--muted)]/50 flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50"
                  >
                    <Play
                      className={`h-3 w-3 ${isRunning ? "animate-pulse" : ""}`}
                    />
                    {isRunning ? "실행 중..." : "평가 실행"}
                  </button>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
                  )}
                </div>
              </div>

              {isExpanded && result && (
                <div className="space-y-3 border-t px-4 py-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {Object.entries(result.scores).map(([criterion, score]) => (
                      <div
                        key={criterion}
                        className="rounded-md border p-2 text-center"
                      >
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {criterion}
                        </p>
                        <p
                          className={`text-sm font-semibold ${scoreColor(score)}`}
                        >
                          {score}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
                    <span>
                      평가 시각:{" "}
                      {new Date(result.evaluatedAt).toLocaleString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      평가 방식:{" "}
                      {result.evaluatedBy === "auto"
                        ? "자동 평가"
                        : "수동 리뷰"}
                    </span>
                  </div>
                </div>
              )}

              {isExpanded && !result && (
                <div className="border-t px-4 py-6 text-center">
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    아직 평가 결과가 없습니다. &ldquo;평가 실행&rdquo; 버튼을
                    클릭하여 테스트를 실행해 주세요.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted-foreground)]">
        평가 기준은 정확성, 명확성, 실행 가능성, 안전성, 한국어 자연스러움,
        스키마 유효성의 6가지 항목으로 구성됩니다. 가중치는 작업 유형별로 다르게
        적용됩니다.
      </p>
    </AdminPageLayout>
  );
}
