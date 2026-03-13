// ─────────────────────────────────────────────────────────────
// AI Provider Base — 인터페이스 재수출 및 모델 카탈로그 정의
// ─────────────────────────────────────────────────────────────

export type { IAiProvider } from "../types";
import type { AiModelConfig } from "../types";

// ── OpenAI 모델 카탈로그 ──

export const OPENAI_MODELS: AiModelConfig[] = [
  {
    modelId: "gpt-4o",
    provider: "openai",
    tier: "premium",
    displayName: "GPT-4o",
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    costPerInputToken: 0.0000025, // $2.50 / 1M tokens
    costPerOutputToken: 0.00001, // $10.00 / 1M tokens
    supportsStructuredOutput: true,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
  {
    modelId: "gpt-4o-mini",
    provider: "openai",
    tier: "fast",
    displayName: "GPT-4o Mini",
    maxInputTokens: 128_000,
    maxOutputTokens: 16_384,
    costPerInputToken: 0.00000015, // $0.15 / 1M tokens
    costPerOutputToken: 0.0000006, // $0.60 / 1M tokens
    supportsStructuredOutput: true,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
  {
    modelId: "gpt-4.1",
    provider: "openai",
    tier: "standard",
    displayName: "GPT-4.1",
    maxInputTokens: 1_047_576,
    maxOutputTokens: 32_768,
    costPerInputToken: 0.000002, // $2.00 / 1M tokens
    costPerOutputToken: 0.000008, // $8.00 / 1M tokens
    supportsStructuredOutput: true,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
];

// ── Anthropic 모델 카탈로그 ──

export const ANTHROPIC_MODELS: AiModelConfig[] = [
  {
    modelId: "claude-sonnet-4-20250514",
    provider: "anthropic",
    tier: "standard",
    displayName: "Claude Sonnet 4",
    maxInputTokens: 200_000,
    maxOutputTokens: 16_384,
    costPerInputToken: 0.000003, // $3.00 / 1M tokens
    costPerOutputToken: 0.000015, // $15.00 / 1M tokens
    supportsStructuredOutput: false,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
  {
    modelId: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    tier: "fast",
    displayName: "Claude Haiku 4.5",
    maxInputTokens: 200_000,
    maxOutputTokens: 8_192,
    costPerInputToken: 0.0000008, // $0.80 / 1M tokens
    costPerOutputToken: 0.000004, // $4.00 / 1M tokens
    supportsStructuredOutput: false,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
  {
    modelId: "claude-opus-4-6",
    provider: "anthropic",
    tier: "premium",
    displayName: "Claude Opus 4",
    maxInputTokens: 200_000,
    maxOutputTokens: 32_000,
    costPerInputToken: 0.000015, // $15.00 / 1M tokens
    costPerOutputToken: 0.000075, // $75.00 / 1M tokens
    supportsStructuredOutput: false,
    supportsStreaming: true,
    defaultTemperature: 0.7,
  },
];
