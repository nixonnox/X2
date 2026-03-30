/**
 * AI Client — Claude API 연결
 *
 * 환경변수:
 *   AI_DEFAULT_PROVIDER: "anthropic" | "openai" | "mock" (default: "mock")
 *   AI_DEV_MODE: "true" → mock provider 사용
 *   ANTHROPIC_API_KEY: Claude API 키
 */

import Anthropic from "@anthropic-ai/sdk";

const AI_DEV_MODE = process.env.AI_DEV_MODE === "true";
const AI_DEFAULT_PROVIDER = process.env.AI_DEFAULT_PROVIDER ?? "mock";

let _anthropic: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  if (AI_DEV_MODE || AI_DEFAULT_PROVIDER === "mock") return null;
  if (!process.env.ANTHROPIC_API_KEY) return null;

  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

export function isAIAvailable(): boolean {
  return (
    !AI_DEV_MODE &&
    AI_DEFAULT_PROVIDER !== "mock" &&
    !!process.env.ANTHROPIC_API_KEY
  );
}

export { AI_DEV_MODE, AI_DEFAULT_PROVIDER };
