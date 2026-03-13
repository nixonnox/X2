// ─────────────────────────────────────────────────────────────
// AI Task Policies — 작업 유형별 라우팅 정책 정의
// ─────────────────────────────────────────────────────────────

import type { AiTaskType, AiTaskPolicy, AiFallbackPolicy } from "../types";

// ── 작업별 라우팅 정책 (12개 태스크 유형) ──

export const TASK_POLICIES: Map<AiTaskType, AiTaskPolicy> = new Map([
  // ────────────────────────────────────
  // 분류/라벨링 작업 (빠른 모델 우선)
  // ────────────────────────────────────
  [
    "comment_sentiment_analysis",
    {
      taskType: "comment_sentiment_analysis",
      displayName: "댓글 감성 분석",
      description: "댓글의 긍정/부정/중립 감성을 자동으로 분류합니다.",
      preferredProvider: "openai",
      preferredModel: "gpt-4o-mini",
      fallbackProvider: "anthropic",
      fallbackModel: "claude-haiku-4-5-20251001",
      maxLatencyMs: 3_000,
      maxTokenBudget: 500,
      responseMode: "classification",
      safetyLevel: "low",
      outputSchema: ["sentiment", "confidence"],
      priority: "normal",
    },
  ],
  [
    "comment_topic_classification",
    {
      taskType: "comment_topic_classification",
      displayName: "댓글 주제 분류",
      description: "댓글의 주제 카테고리를 자동으로 분류합니다.",
      preferredProvider: "openai",
      preferredModel: "gpt-4o-mini",
      fallbackProvider: "anthropic",
      fallbackModel: "claude-haiku-4-5-20251001",
      maxLatencyMs: 3_000,
      maxTokenBudget: 500,
      responseMode: "classification",
      safetyLevel: "low",
      outputSchema: ["topic", "confidence"],
      priority: "normal",
    },
  ],
  [
    "comment_risk_assessment",
    {
      taskType: "comment_risk_assessment",
      displayName: "댓글 위험도 평가",
      description: "댓글의 위험 수준(스팸, 악성, 법적 리스크 등)을 평가합니다.",
      preferredProvider: "openai",
      preferredModel: "gpt-4o-mini",
      fallbackProvider: "anthropic",
      fallbackModel: "claude-haiku-4-5-20251001",
      maxLatencyMs: 5_000,
      maxTokenBudget: 800,
      responseMode: "structured",
      safetyLevel: "high",
      outputSchema: ["riskLevel", "riskFlags", "confidence"],
      priority: "high",
    },
  ],

  // ────────────────────────────────────
  // 생성 작업 (표준/프리미엄 모델)
  // ────────────────────────────────────
  [
    "reply_suggestion_generation",
    {
      taskType: "reply_suggestion_generation",
      displayName: "답글 제안 생성",
      description:
        "댓글에 대한 적절한 답글 후보를 생성합니다. 브랜드 톤에 맞춰 작성됩니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-sonnet-4-20250514",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4.1",
      maxLatencyMs: 10_000,
      maxTokenBudget: 1_000,
      responseMode: "text",
      safetyLevel: "high",
      outputSchema: ["suggestions", "confidence"],
      priority: "normal",
    },
  ],
  [
    "faq_extraction",
    {
      taskType: "faq_extraction",
      displayName: "FAQ 자동 추출",
      description:
        "댓글 데이터에서 자주 묻는 질문과 패턴을 자동으로 추출합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-sonnet-4-20250514",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4.1",
      maxLatencyMs: 15_000,
      maxTokenBudget: 2_000,
      responseMode: "structured",
      safetyLevel: "medium",
      outputSchema: ["faqs", "summary", "confidence"],
      priority: "normal",
    },
  ],
  [
    "dashboard_explanation",
    {
      taskType: "dashboard_explanation",
      displayName: "대시보드 설명 생성",
      description: "대시보드 지표와 차트에 대한 자연어 설명을 생성합니다.",
      preferredProvider: "openai",
      preferredModel: "gpt-4o-mini",
      fallbackProvider: "anthropic",
      fallbackModel: "claude-haiku-4-5-20251001",
      maxLatencyMs: 5_000,
      maxTokenBudget: 500,
      responseMode: "text",
      safetyLevel: "low",
      outputSchema: ["summary", "confidence"],
      priority: "low",
    },
  ],
  [
    "user_help_answer",
    {
      taskType: "user_help_answer",
      displayName: "사용자 도움말 답변",
      description: "사용자의 질문에 대해 제품 문서 기반의 답변을 생성합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-sonnet-4-20250514",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4.1",
      maxLatencyMs: 8_000,
      maxTokenBudget: 1_000,
      responseMode: "text",
      safetyLevel: "medium",
      outputSchema: ["summary", "confidence"],
      priority: "normal",
    },
  ],

  // ────────────────────────────────────
  // 심층 분석 작업 (프리미엄 모델)
  // ────────────────────────────────────
  [
    "competitor_insight_generation",
    {
      taskType: "competitor_insight_generation",
      displayName: "경쟁사 인사이트 생성",
      description: "경쟁사 SNS 데이터를 분석하여 전략적 인사이트를 도출합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-opus-4-6",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o",
      maxLatencyMs: 30_000,
      maxTokenBudget: 3_000,
      responseMode: "structured",
      safetyLevel: "medium",
      outputSchema: ["summary", "bullets", "recommendations", "confidence"],
      priority: "normal",
    },
  ],
  [
    "listening_insight_generation",
    {
      taskType: "listening_insight_generation",
      displayName: "리스닝 인사이트 생성",
      description:
        "소셜 리스닝 데이터를 분석하여 브랜드 관련 인사이트를 도출합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-opus-4-6",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o",
      maxLatencyMs: 30_000,
      maxTokenBudget: 3_000,
      responseMode: "structured",
      safetyLevel: "medium",
      outputSchema: ["summary", "bullets", "recommendations", "confidence"],
      priority: "normal",
    },
  ],
  [
    "strategy_insight_generation",
    {
      taskType: "strategy_insight_generation",
      displayName: "전략 인사이트 생성",
      description:
        "종합적인 SNS 데이터 분석을 바탕으로 마케팅 전략 제안을 생성합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-opus-4-6",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o",
      maxLatencyMs: 45_000,
      maxTokenBudget: 4_000,
      responseMode: "structured",
      safetyLevel: "high",
      outputSchema: [
        "title",
        "summary",
        "bullets",
        "recommendations",
        "confidence",
      ],
      priority: "high",
    },
  ],
  [
    "report_summary_generation",
    {
      taskType: "report_summary_generation",
      displayName: "리포트 요약 생성",
      description:
        "분석 리포트의 핵심 내용을 요약하고 주요 포인트를 정리합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-opus-4-6",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o",
      maxLatencyMs: 30_000,
      maxTokenBudget: 3_000,
      responseMode: "structured",
      safetyLevel: "medium",
      outputSchema: ["title", "summary", "bullets", "confidence"],
      priority: "normal",
    },
  ],
  [
    "report_action_recommendation",
    {
      taskType: "report_action_recommendation",
      displayName: "리포트 액션 추천",
      description: "분석 결과를 바탕으로 실행 가능한 액션 아이템을 추천합니다.",
      preferredProvider: "anthropic",
      preferredModel: "claude-opus-4-6",
      fallbackProvider: "openai",
      fallbackModel: "gpt-4o",
      maxLatencyMs: 30_000,
      maxTokenBudget: 3_000,
      responseMode: "structured",
      safetyLevel: "high",
      outputSchema: ["summary", "recommendations", "confidence"],
      priority: "high",
    },
  ],
]);

// ── 폴백 정책 정의 ──

export const FALLBACK_POLICIES: Map<AiTaskType, AiFallbackPolicy> = new Map([
  // 빠른 작업: 2회 재시도, 1초 딜레이, 5초 타임아웃
  [
    "comment_sentiment_analysis",
    {
      taskType: "comment_sentiment_analysis",
      maxRetries: 2,
      retryDelayMs: 1_000,
      timeoutMs: 5_000,
      fallbackChain: [
        { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "comment_topic_classification",
    {
      taskType: "comment_topic_classification",
      maxRetries: 2,
      retryDelayMs: 1_000,
      timeoutMs: 5_000,
      fallbackChain: [
        { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "comment_risk_assessment",
    {
      taskType: "comment_risk_assessment",
      maxRetries: 2,
      retryDelayMs: 1_000,
      timeoutMs: 5_000,
      fallbackChain: [
        { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "dashboard_explanation",
    {
      taskType: "dashboard_explanation",
      maxRetries: 2,
      retryDelayMs: 1_000,
      timeoutMs: 5_000,
      fallbackChain: [
        { provider: "anthropic", model: "claude-haiku-4-5-20251001" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],

  // 표준 작업: 2회 재시도, 2초 딜레이, 15초 타임아웃
  [
    "reply_suggestion_generation",
    {
      taskType: "reply_suggestion_generation",
      maxRetries: 2,
      retryDelayMs: 2_000,
      timeoutMs: 15_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4.1" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "faq_extraction",
    {
      taskType: "faq_extraction",
      maxRetries: 2,
      retryDelayMs: 2_000,
      timeoutMs: 15_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4.1" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "user_help_answer",
    {
      taskType: "user_help_answer",
      maxRetries: 2,
      retryDelayMs: 2_000,
      timeoutMs: 15_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4.1" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],

  // 프리미엄 작업: 1회 재시도, 3초 딜레이, 45초 타임아웃
  [
    "competitor_insight_generation",
    {
      taskType: "competitor_insight_generation",
      maxRetries: 1,
      retryDelayMs: 3_000,
      timeoutMs: 45_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4o" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "listening_insight_generation",
    {
      taskType: "listening_insight_generation",
      maxRetries: 1,
      retryDelayMs: 3_000,
      timeoutMs: 45_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4o" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "strategy_insight_generation",
    {
      taskType: "strategy_insight_generation",
      maxRetries: 1,
      retryDelayMs: 3_000,
      timeoutMs: 45_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4o" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "report_summary_generation",
    {
      taskType: "report_summary_generation",
      maxRetries: 1,
      retryDelayMs: 3_000,
      timeoutMs: 45_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4o" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
  [
    "report_action_recommendation",
    {
      taskType: "report_action_recommendation",
      maxRetries: 1,
      retryDelayMs: 3_000,
      timeoutMs: 45_000,
      fallbackChain: [
        { provider: "openai", model: "gpt-4o" },
        { provider: "mock", model: "mock" },
      ],
      onAllFailed: "return_mock",
      simplerPromptOnRetry: true,
    },
  ],
]);

// ── 헬퍼 함수 ──

/**
 * 특정 작업 유형의 라우팅 정책을 반환합니다.
 * 정의되지 않은 작업 유형일 경우 에러를 발생시킵니다.
 */
export function getTaskPolicy(taskType: AiTaskType): AiTaskPolicy {
  const policy = TASK_POLICIES.get(taskType);
  if (!policy) {
    throw new Error(`[AI Policy] 정의되지 않은 작업 유형입니다: ${taskType}`);
  }
  return policy;
}

/**
 * 모든 작업 유형의 라우팅 정책 목록을 반환합니다.
 */
export function getAllTaskPolicies(): AiTaskPolicy[] {
  return Array.from(TASK_POLICIES.values());
}

/**
 * 특정 작업 유형의 폴백 정책을 반환합니다.
 */
export function getFallbackPolicy(
  taskType: AiTaskType,
): AiFallbackPolicy | undefined {
  return FALLBACK_POLICIES.get(taskType);
}
