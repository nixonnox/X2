// ─────────────────────────────────────────────────────────────
// Anthropic Provider — Messages API 기반 구현
// ─────────────────────────────────────────────────────────────

import type {
  IAiProvider,
  AiProviderType,
  AiModelConfig,
  AiGenerateOptions,
  AiGenerateResult,
} from "../types";
import { ANTHROPIC_MODELS } from "./base";

export class AnthropicProvider implements IAiProvider {
  readonly type: AiProviderType = "anthropic";
  readonly displayName = "Anthropic Claude";

  private get apiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  // ── 텍스트 생성: Messages API 호출 ──
  async generateText(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const { model, messages, temperature, maxTokens } = options;

    // system 메시지를 분리 (Anthropic은 system을 최상위 파라미터로 전달)
    const systemMessage = messages.find((m) => m.role === "system");
    const nonSystemMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "developer" ? ("user" as const) : m.role,
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens ?? 4096,
      messages: nonSystemMessages,
    };

    // system 메시지가 있으면 최상위 파라미터로 설정
    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Anthropic API error (${response.status}): ${errorBody}`,
        );
      }

      const data = await response.json();

      // 응답에서 텍스트 추출 — content 배열의 첫 번째 텍스트 블록
      const outputText =
        data.content
          ?.filter(
            (block: { type: string; text?: string }) => block.type === "text",
          )
          ?.map((block: { type: string; text: string }) => block.text)
          ?.join("") ?? "";

      return {
        text: outputText,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        model: data.model ?? model,
        finishReason: data.stop_reason ?? "end_turn",
      };
    } catch (error) {
      // 네트워크 오류 등 예외 처리 — 크래시 방지
      if (error instanceof Error && error.message.startsWith("Anthropic API")) {
        throw error;
      }
      throw new Error(
        `Anthropic provider error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 구조화된 출력 생성: system 프롬프트에 JSON 지시 추가 ──
  async generateStructuredOutput<T>(
    options: AiGenerateOptions,
    schema: Record<string, unknown>,
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    const { model, messages, temperature, maxTokens } = options;

    // JSON 스키마 지시사항을 system 메시지에 추가
    const jsonInstruction = [
      "You must respond with valid JSON that conforms to the following JSON schema.",
      "Do not include any text outside the JSON object.",
      "JSON Schema:",
      JSON.stringify(schema, null, 2),
    ].join("\n");

    const systemMessage = messages.find((m) => m.role === "system");
    const combinedSystem = systemMessage
      ? `${systemMessage.content}\n\n${jsonInstruction}`
      : jsonInstruction;

    const nonSystemMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "developer" ? ("user" as const) : m.role,
        content: m.content,
      }));

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens ?? 4096,
      system: combinedSystem,
      messages: nonSystemMessages,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Anthropic structured output error (${response.status}): ${errorBody}`,
        );
      }

      const data = await response.json();

      const outputText =
        data.content
          ?.filter(
            (block: { type: string; text?: string }) => block.type === "text",
          )
          ?.map((block: { type: string; text: string }) => block.text)
          ?.join("") ?? "{}";

      // JSON 파싱 — 코드 블록으로 감싸져 있을 수 있으므로 정리
      const cleanedText = outputText
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanedText) as T;

      return {
        data: parsed,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("Anthropic structured")
      ) {
        throw error;
      }
      throw new Error(
        `Anthropic structured output error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 헬스체크: 간단한 메시지 호출로 연결 확인 ──
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey ?? "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // ── 비용 추정: 모델 설정 기반 계산 ──
  estimateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    const modelConfig = ANTHROPIC_MODELS.find((m) => m.modelId === model);
    if (!modelConfig) return 0;

    return (
      inputTokens * modelConfig.costPerInputToken +
      outputTokens * modelConfig.costPerOutputToken
    );
  }

  // ── API 키 존재 여부 확인 ──
  isAvailable(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.length > 0;
  }

  // ── 지원 모델 목록 반환 ──
  getModels(): AiModelConfig[] {
    return ANTHROPIC_MODELS;
  }
}
