/**
 * MentionSentimentAnalysisService
 *
 * 소셜 멘션 텍스트의 감성을 분석합니다.
 * - Claude Haiku를 사용한 배치 분석 (비용 최적화)
 * - Mock mode에서는 키워드 기반 규칙 분석
 * - 실패 시 graceful degradation → "UNCLASSIFIED"
 */

import { getAnthropicClient, isAIAvailable } from "../client";

// ─── Types ──────────────────────────────────────────────────

export type SentimentCategory =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "MIXED"
  | "UNCLASSIFIED"
  | "ANALYSIS_FAILED";

export type SentimentResult = {
  text: string;
  sentiment: SentimentCategory;
  confidence: number; // 0.0 ~ 1.0
  reason?: string;
  provider: "anthropic" | "mock" | "rule";
};

export type BatchSentimentResult = {
  results: SentimentResult[];
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  provider: string;
  durationMs: number;
  costEstimate?: number; // USD
};

// ─── Constants ──────────────────────────────────────────────

const BATCH_SIZE = 20; // Claude에 한 번에 보내는 텍스트 수
const MAX_TEXT_LENGTH = 300; // 텍스트 길이 제한
const MODEL = "claude-haiku-4-5-20251001"; // Haiku for cost efficiency

// ─── Service ────────────────────────────────────────────────

export class MentionSentimentAnalysisService {
  /**
   * 단일 텍스트 감성 분석
   */
  async analyzeSingle(text: string): Promise<SentimentResult> {
    const results = await this.analyzeBatch([text]);
    return results.results[0]!;
  }

  /**
   * 배치 감성 분석 (최대 BATCH_SIZE개씩 처리)
   */
  async analyzeBatch(texts: string[]): Promise<BatchSentimentResult> {
    const startTime = Date.now();

    if (texts.length === 0) {
      return {
        results: [],
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        provider: "none",
        durationMs: 0,
      };
    }

    // Truncate texts
    const truncated = texts.map((t) => t.slice(0, MAX_TEXT_LENGTH));

    // Use LLM if available, otherwise fall back to rule-based
    if (isAIAvailable()) {
      return this.analyzeBatchWithLLM(truncated, startTime);
    }

    return this.analyzeBatchWithRules(truncated, startTime);
  }

  // ─── LLM Analysis ──────────────────────────────────────────

  private async analyzeBatchWithLLM(
    texts: string[],
    startTime: number,
  ): Promise<BatchSentimentResult> {
    const allResults: SentimentResult[] = [];
    let failedCount = 0;

    // Process in batches
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);

      try {
        const batchResults = await this.callLLM(batch);
        allResults.push(...batchResults);
      } catch (err) {
        console.error(
          "[Sentiment] LLM batch failed, falling back to rules:",
          err,
        );
        // Fallback to rule-based for this batch
        const fallback = batch.map((text) => this.analyzeWithRules(text));
        allResults.push(...fallback);
        failedCount += batch.length;
      }
    }

    const durationMs = Date.now() - startTime;
    // Cost estimate: Haiku ~$0.25/1M input tokens, ~$1.25/1M output tokens
    // Average ~100 tokens per text input, ~30 tokens per output
    const estimatedInputTokens = texts.length * 100;
    const estimatedOutputTokens = texts.length * 30;
    const costEstimate =
      (estimatedInputTokens * 0.25 + estimatedOutputTokens * 1.25) / 1_000_000;

    return {
      results: allResults,
      totalProcessed: texts.length,
      successCount: texts.length - failedCount,
      failedCount,
      provider: "anthropic",
      durationMs,
      costEstimate,
    };
  }

  private async callLLM(texts: string[]): Promise<SentimentResult[]> {
    const client = getAnthropicClient();
    if (!client) {
      return texts.map((t) => this.analyzeWithRules(t));
    }

    const numberedTexts = texts.map((t, i) => `[${i + 1}] ${t}`).join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze the sentiment of each text below. For each, respond with ONLY the number and one of: POSITIVE, NEGATIVE, NEUTRAL, MIXED.

Format: [number] SENTIMENT

${numberedTexts}`,
        },
      ],
    });

    const responseText =
      response.content[0]?.type === "text" ? response.content[0].text : "";

    // Parse response
    const results: SentimentResult[] = [];
    const lines = responseText.trim().split("\n");

    for (let i = 0; i < texts.length; i++) {
      const line = lines[i] ?? "";
      const match = line.match(
        /\[?\d+\]?\s*(POSITIVE|NEGATIVE|NEUTRAL|MIXED)/i,
      );

      if (match) {
        results.push({
          text: texts[i]!,
          sentiment: match[1]!.toUpperCase() as SentimentCategory,
          confidence: 0.85, // LLM default confidence
          provider: "anthropic",
        });
      } else {
        results.push({
          text: texts[i]!,
          sentiment: "UNCLASSIFIED",
          confidence: 0,
          reason: "LLM response parsing failed",
          provider: "anthropic",
        });
      }
    }

    return results;
  }

  // ─── Rule-Based Fallback ────────────────────────────────────

  private analyzeBatchWithRules(
    texts: string[],
    startTime: number,
  ): BatchSentimentResult {
    const results = texts.map((t) => this.analyzeWithRules(t));
    return {
      results,
      totalProcessed: texts.length,
      successCount: results.filter((r) => r.sentiment !== "UNCLASSIFIED")
        .length,
      failedCount: results.filter((r) => r.sentiment === "UNCLASSIFIED").length,
      provider: "rule",
      durationMs: Date.now() - startTime,
    };
  }

  private analyzeWithRules(text: string): SentimentResult {
    if (!text || text.trim().length < 3) {
      return {
        text,
        sentiment: "UNCLASSIFIED",
        confidence: 0,
        reason: "Text too short",
        provider: "rule",
      };
    }

    const lower = text.toLowerCase();

    // Korean sentiment keywords
    const positiveKw = [
      "좋",
      "최고",
      "추천",
      "만족",
      "대박",
      "완벽",
      "사랑",
      "감동",
      "훌륭",
      "멋",
      "짱",
      "굿",
      "👍",
      "❤️",
      "🔥",
      "😍",
      "잘했",
      "대단",
      "기대",
      "행복",
    ];
    const negativeKw = [
      "별로",
      "나쁘",
      "실망",
      "최악",
      "싫",
      "후회",
      "불만",
      "짜증",
      "화나",
      "문제",
      "심각",
      "위험",
      "걱정",
      "안좋",
      "불편",
      "쓰레기",
      "👎",
      "😡",
      "😤",
      "💢",
    ];

    let posScore = 0;
    let negScore = 0;

    for (const kw of positiveKw) {
      if (lower.includes(kw)) posScore++;
    }
    for (const kw of negativeKw) {
      if (lower.includes(kw)) negScore++;
    }

    if (posScore > 0 && negScore > 0) {
      return {
        text,
        sentiment: "MIXED",
        confidence: 0.4,
        reason: `pos:${posScore} neg:${negScore}`,
        provider: "rule",
      };
    }

    if (posScore > 0) {
      return {
        text,
        sentiment: "POSITIVE",
        confidence: Math.min(0.7, 0.3 + posScore * 0.15),
        provider: "rule",
      };
    }

    if (negScore > 0) {
      return {
        text,
        sentiment: "NEGATIVE",
        confidence: Math.min(0.7, 0.3 + negScore * 0.15),
        provider: "rule",
      };
    }

    // No signal → NEUTRAL (not UNCLASSIFIED — we actively classified it)
    return {
      text,
      sentiment: "NEUTRAL",
      confidence: 0.5,
      reason: "No sentiment keywords detected",
      provider: "rule",
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────

let _instance: MentionSentimentAnalysisService | null = null;

export function getSentimentService(): MentionSentimentAnalysisService {
  if (!_instance) {
    _instance = new MentionSentimentAnalysisService();
  }
  return _instance;
}
