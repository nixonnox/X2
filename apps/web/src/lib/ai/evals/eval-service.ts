// ─────────────────────────────────────────────────────────────
// AI Eval Service — 품질 평가 스캐폴드
// ─────────────────────────────────────────────────────────────

import type {
  AiTaskType,
  AiEvalCase,
  AiEvalResult,
  PromptExecutionResult,
  StructuredAiOutput,
} from "../types";
import { SAMPLE_EVAL_CASES } from "./eval-cases";
import { checkContentSafety } from "../safety/guardrails";

class AiEvalService {
  private results: AiEvalResult[] = [];

  /** 평가 케이스 목록 조회 (태스크 유형 필터 가능) */
  getEvalCases(taskType?: AiTaskType): AiEvalCase[] {
    if (taskType) {
      return SAMPLE_EVAL_CASES.filter((c) => c.taskType === taskType);
    }
    return SAMPLE_EVAL_CASES;
  }

  /**
   * 평가 실행
   *
   * 실제 AI 실행은 executor 레이어가 구현된 후 연결합니다.
   * 현재는 mock 결과로 자동 채점 로직을 검증합니다.
   */
  async runEval(evalCaseId: string): Promise<AiEvalResult> {
    const evalCase = SAMPLE_EVAL_CASES.find((c) => c.id === evalCaseId);
    if (!evalCase) {
      throw new Error(`평가 케이스를 찾을 수 없습니다: ${evalCaseId}`);
    }

    // TODO: 실제 executor 연결 시 교체
    const executionResult = await this.executeMock(evalCase);

    // 자동 채점
    const scores = this.autoScore(executionResult, evalCase);

    const result: AiEvalResult = {
      evalCaseId,
      executionResult,
      scores,
      notes: `자동 평가 완료 (${evalCase.name})`,
      evaluatedAt: new Date().toISOString(),
      evaluatedBy: "auto",
    };

    this.results.push(result);
    return result;
  }

  /** 평가 결과 조회 */
  getResults(evalCaseId?: string): AiEvalResult[] {
    if (evalCaseId) {
      return this.results.filter((r) => r.evalCaseId === evalCaseId);
    }
    return this.results;
  }

  /** 전체 평균 점수 */
  getOverallScore(): number {
    if (this.results.length === 0) return 0;
    const sum = this.results.reduce((s, r) => s + r.scores.overall, 0);
    return Math.round(sum / this.results.length);
  }

  // ── Private ──

  /** Mock 실행 (executor 구현 전 임시) */
  private async executeMock(
    evalCase: AiEvalCase,
  ): Promise<PromptExecutionResult> {
    const mockOutput: StructuredAiOutput = {
      summary: `${evalCase.name}에 대한 분석 결과입니다. 입력 데이터를 기반으로 분석을 수행했습니다.`,
      bullets: [
        "주요 패턴이 식별되었습니다",
        "데이터 기반 인사이트를 도출했습니다",
        "추가 분석이 권장됩니다",
      ],
      recommendations: [
        "지속적인 모니터링을 권장합니다",
        "세부 전략 수립을 검토해 주세요",
      ],
      confidence: 0.78,
    };

    return {
      requestId: `eval-req-${Date.now()}`,
      taskType: evalCase.taskType,
      status: "completed",
      provider: "mock",
      model: "mock-model",
      promptVersion: "1.0.0",
      rawOutput: JSON.stringify(mockOutput),
      normalizedOutput: mockOutput,
      inputTokens: 150,
      outputTokens: 200,
      latencyMs: 50,
      estimatedCostUsd: 0,
      validationResult: null,
      fallbackUsed: false,
      fallbackReason: null,
      createdAt: new Date().toISOString(),
    };
  }

  /** 자동 채점 — 기본 휴리스틱 */
  private autoScore(
    result: PromptExecutionResult,
    evalCase: AiEvalCase,
  ): AiEvalResult["scores"] {
    const output = result.normalizedOutput;

    // schemaValidity: JSON 구조 검증 (0-100)
    const schemaValidity = this.scoreSchemaValidity(output);

    // koreanNaturalness: 한국어 비율 검증 (0-100)
    const koreanNaturalness = this.scoreKoreanNaturalness(result.rawOutput);

    // clarity: 길이 및 구조 검증 (0-100)
    const clarity = this.scoreClarity(output);

    // relevance: 기대 출력과의 키워드 오버랩 (0-100)
    const relevance = this.scoreRelevance(
      result.rawOutput,
      evalCase.expectedOutputStyle,
    );

    // actionability: 실행 가능한 표현 포함 여부 (0-100)
    const actionability = this.scoreActionability(output);

    // safety: 안전 검사 (0-100)
    const safety = this.scoreSafety(result.rawOutput);

    // 가중 평균
    const criteria = evalCase.criteria;
    const overall = Math.round(
      schemaValidity * criteria.schemaValidity.weight +
        koreanNaturalness * criteria.koreanNaturalness.weight +
        clarity * criteria.clarity.weight +
        relevance * criteria.relevance.weight +
        actionability * criteria.actionability.weight +
        safety * criteria.safety.weight,
    );

    return {
      schemaValidity,
      koreanNaturalness,
      clarity,
      relevance,
      actionability,
      safety,
      overall,
    };
  }

  private scoreSchemaValidity(output: StructuredAiOutput | null): number {
    if (!output) return 0;

    let score = 0;
    // 필수 필드 존재 여부
    if (typeof output.summary === "string" && output.summary.length > 0)
      score += 40;
    if (typeof output.confidence === "number") score += 20;
    if (Array.isArray(output.bullets) && output.bullets.length > 0) score += 20;
    if (Array.isArray(output.recommendations)) score += 10;
    // JSON 파싱 가능 여부
    score += 10;

    return Math.min(100, score);
  }

  private scoreKoreanNaturalness(text: string): number {
    if (!text) return 0;

    const koreanChars = (
      text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []
    ).length;
    const totalLetters = (text.match(/[a-zA-Z\uAC00-\uD7AF]/g) || []).length;

    if (totalLetters === 0) return 50;

    const koreanRatio = koreanChars / totalLetters;

    // 한국어 비율 70% 이상이면 만점
    if (koreanRatio >= 0.7) return 100;
    if (koreanRatio >= 0.5) return 80;
    if (koreanRatio >= 0.3) return 60;
    if (koreanRatio >= 0.1) return 40;
    return 20;
  }

  private scoreClarity(output: StructuredAiOutput | null): number {
    if (!output) return 0;

    let score = 0;

    // summary 길이 적절성 (50~500자)
    const len = output.summary.length;
    if (len >= 50 && len <= 500) score += 40;
    else if (len >= 20 && len <= 1000) score += 25;
    else score += 10;

    // bullets 존재 및 수
    if (
      output.bullets &&
      output.bullets.length >= 2 &&
      output.bullets.length <= 10
    ) {
      score += 30;
    } else if (output.bullets && output.bullets.length > 0) {
      score += 15;
    }

    // 구조화 수준 (recommendations, title 등)
    if (output.recommendations && output.recommendations.length > 0)
      score += 20;
    if (output.title) score += 10;

    return Math.min(100, score);
  }

  private scoreRelevance(rawOutput: string, expectedStyle: string): number {
    if (!rawOutput || !expectedStyle) return 50;

    // 기대 설명에서 키워드 추출 (한국어 단어 기준)
    const expectedKeywords = expectedStyle
      .split(/[\s,./()]+/)
      .filter((w) => w.length >= 2);

    if (expectedKeywords.length === 0) return 50;

    let matchCount = 0;
    for (const keyword of expectedKeywords) {
      if (rawOutput.includes(keyword)) {
        matchCount++;
      }
    }

    const matchRatio = matchCount / expectedKeywords.length;
    return Math.min(100, Math.round(matchRatio * 100));
  }

  private scoreActionability(output: StructuredAiOutput | null): number {
    if (!output) return 0;

    const actionablePhrases = [
      "권장",
      "추천",
      "제안",
      "검토",
      "개선",
      "실행",
      "적용",
      "강화",
      "확대",
      "도입",
      "방안",
      "전략",
      "계획",
      "조치",
      "해야",
    ];

    const allText = [
      output.summary,
      ...(output.bullets ?? []),
      ...(output.recommendations ?? []),
    ].join(" ");

    let matchCount = 0;
    for (const phrase of actionablePhrases) {
      if (allText.includes(phrase)) matchCount++;
    }

    // 3개 이상 포함 시 만점
    if (matchCount >= 5) return 100;
    if (matchCount >= 3) return 80;
    if (matchCount >= 1) return 60;
    return 30;
  }

  private scoreSafety(text: string): number {
    const result = checkContentSafety(text);
    if (result.safe) return 100;

    // 이슈 하나당 -25점
    return Math.max(0, 100 - result.issues.length * 25);
  }
}

/** 싱글톤 인스턴스 */
export const evalService = new AiEvalService();
