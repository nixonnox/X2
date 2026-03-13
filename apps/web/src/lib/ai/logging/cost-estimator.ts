// ─────────────────────────────────────────────────────────────
// AI Cost Estimator — 토큰 비용 추정 유틸리티
// ─────────────────────────────────────────────────────────────

import type { AiProviderType, AiTaskType } from "../types";
import { OPENAI_MODELS, ANTHROPIC_MODELS } from "../providers/base";

const ALL_MODELS = [...OPENAI_MODELS, ...ANTHROPIC_MODELS];

// 태스크별 예상 출력 토큰 비율 (입력 대비)
const OUTPUT_TOKEN_RATIOS: Record<AiTaskType, number> = {
  comment_sentiment_analysis: 0.5,
  comment_topic_classification: 0.4,
  comment_risk_assessment: 0.6,
  reply_suggestion_generation: 1.2,
  faq_extraction: 0.8,
  competitor_insight_generation: 1.0,
  listening_insight_generation: 1.0,
  strategy_insight_generation: 1.5,
  report_summary_generation: 0.7,
  report_action_recommendation: 1.0,
  dashboard_explanation: 0.8,
  user_help_answer: 1.0,
};

/**
 * 텍스트의 대략적인 토큰 수 추정
 * - 영어: ~4 글자당 1 토큰
 * - 한국어: ~2 글자당 1 토큰
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // 한국어 문자 비율 계산
  const koreanChars = (
    text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || []
  ).length;
  const totalChars = text.length;
  const koreanRatio = totalChars > 0 ? koreanChars / totalChars : 0;

  // 가중 평균: 한국어 부분은 2글자/토큰, 나머지는 4글자/토큰
  const koreanTokens = koreanChars / 2;
  const otherTokens = (totalChars - koreanChars) / 4;

  return Math.max(1, Math.ceil(koreanTokens + otherTokens));
}

/**
 * 입출력 토큰 기반 비용 추정 (USD)
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string,
  provider: AiProviderType,
): number {
  const modelConfig = ALL_MODELS.find(
    (m) => m.modelId === model && m.provider === provider,
  );

  if (!modelConfig) {
    // 알 수 없는 모델 — 보수적 추정 (GPT-4o 기준)
    return inputTokens * 0.0000025 + outputTokens * 0.00001;
  }

  return (
    inputTokens * modelConfig.costPerInputToken +
    outputTokens * modelConfig.costPerOutputToken
  );
}

/**
 * 요청 비용 사전 추정
 */
export function estimateRequestCost(
  taskType: AiTaskType,
  inputText: string,
  provider: AiProviderType,
  model: string,
): {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
} {
  const estimatedInputTokens = estimateTokenCount(inputText);
  const ratio = OUTPUT_TOKEN_RATIOS[taskType] ?? 0.8;
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * ratio);

  const estimatedCostUsd = estimateCost(
    estimatedInputTokens,
    estimatedOutputTokens,
    model,
    provider,
  );

  return {
    estimatedInputTokens,
    estimatedOutputTokens,
    estimatedCostUsd,
  };
}

/**
 * USD → KRW 변환 후 포맷 (환율 약 1,350원)
 */
export function formatCostKrw(usd: number): string {
  const krw = Math.round(usd * 1350);
  return `₩${krw.toLocaleString("ko-KR")}`;
}

/**
 * USD 포맷
 */
export function formatCostUsd(usd: number): string {
  if (usd < 0.01) {
    return `$${usd.toFixed(4)}`;
  }
  return `$${usd.toFixed(2)}`;
}
