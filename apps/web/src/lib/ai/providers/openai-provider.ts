// ─────────────────────────────────────────────────────────────
// OpenAI Provider — Responses API 기반 구현
// ─────────────────────────────────────────────────────────────

import type {
  IAiProvider,
  AiProviderType,
  AiModelConfig,
  AiGenerateOptions,
  AiGenerateResult,
} from "../types";
import { OPENAI_MODELS } from "./base";

export class OpenAiProvider implements IAiProvider {
  readonly type: AiProviderType = "openai";
  readonly displayName = "OpenAI";

  private get apiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  // ── 텍스트 생성: Responses API 호출 ──
  async generateText(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const { model, messages, temperature, maxTokens } = options;

    // 메시지를 Responses API input 형식으로 변환
    const input = messages.map((m) => ({
      role: m.role === "system" ? ("developer" as const) : m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      input,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }
    if (maxTokens !== undefined) {
      body.max_output_tokens = maxTokens;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
      }

      const data = await response.json();

      // Responses API 응답에서 텍스트 추출
      const outputText =
        data.output_text ??
        data.output
          ?.filter((item: Record<string, unknown>) => item.type === "message")
          ?.flatMap((item: Record<string, unknown>) =>
            (item.content as Array<{ type: string; text: string }>)
              ?.filter((c) => c.type === "output_text")
              ?.map((c) => c.text),
          )
          ?.join("") ??
        "";

      return {
        text: outputText,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        model: data.model ?? model,
        finishReason: data.status ?? "completed",
      };
    } catch (error) {
      // 네트워크 오류 등 예외 처리 — 크래시 방지
      if (error instanceof Error && error.message.startsWith("OpenAI API")) {
        throw error;
      }
      throw new Error(
        `OpenAI provider error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 구조화된 출력 생성: JSON Schema 기반 ──
  async generateStructuredOutput<T>(
    options: AiGenerateOptions,
    schema: Record<string, unknown>,
  ): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    const { model, messages, temperature, maxTokens } = options;

    const input = messages.map((m) => ({
      role: m.role === "system" ? ("developer" as const) : m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model,
      input,
      text: {
        format: {
          type: "json_schema",
          name: (schema.title as string) ?? "structured_output",
          schema,
          strict: true,
        },
      },
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }
    if (maxTokens !== undefined) {
      body.max_output_tokens = maxTokens;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI structured output error (${response.status}): ${errorBody}`,
        );
      }

      const data = await response.json();

      const outputText =
        data.output_text ??
        data.output
          ?.filter((item: Record<string, unknown>) => item.type === "message")
          ?.flatMap((item: Record<string, unknown>) =>
            (item.content as Array<{ type: string; text: string }>)
              ?.filter((c) => c.type === "output_text")
              ?.map((c) => c.text),
          )
          ?.join("") ??
        "{}";

      // JSON 파싱하여 구조화된 데이터 반환
      const parsed = JSON.parse(outputText) as T;

      return {
        data: parsed,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith("OpenAI structured")
      ) {
        throw error;
      }
      throw new Error(
        `OpenAI structured output error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ── 헬스체크: 모델 목록 API 호출로 연결 확인 ──
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
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
    const modelConfig = OPENAI_MODELS.find((m) => m.modelId === model);
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
    return OPENAI_MODELS;
  }
}
