/**
 * InsightInterpreterService
 *
 * 분석 결과를 LLM(Claude)으로 해석하여 자연어 인사이트를 생성.
 *
 * 사용 시점:
 * - Intelligence 분석 완료 후 요약 해석
 * - 클러스터/페르소나/여정 결과 해석
 * - 트렌드 변화 해석
 * - 경쟁 비교 해석
 *
 * fallback: AI 미설정 시 규칙 기반 요약 반환
 */

import { getAnthropicClient, isAIAvailable } from "../client";

export type InterpretInput = {
  /** 분석 유형 */
  type:
    | "intelligence_summary"
    | "cluster_analysis"
    | "persona_analysis"
    | "journey_analysis"
    | "trend_change"
    | "competitor_comparison"
    | "demographic_analysis";
  /** 분석 대상 키워드 */
  keyword: string;
  /** 분석 결과 데이터 (JSON 직렬화 가능) */
  data: Record<string, unknown>;
  /** 언어 */
  locale?: string;
};

export type InterpretResult = {
  /** LLM 생성 해석 (3-5문장) */
  interpretation: string;
  /** 핵심 발견 (3개) */
  keyFindings: string[];
  /** 추천 액션 (2개) */
  suggestedActions: string[];
  /** LLM 사용 여부 */
  usedLLM: boolean;
};

const SYSTEM_PROMPT = `당신은 디지털 마케팅/검색 분석 전문가입니다.
주어진 분석 데이터를 보고 마케터/기획자가 바로 활용할 수 있는 인사이트를 생성하세요.

규칙:
- 한국어로 작성
- 3-5문장의 해석 (interpretation)
- 핵심 발견 3개 (keyFindings) — 각각 한 문장
- 추천 액션 2개 (suggestedActions) — 각각 한 문장
- 데이터에 없는 내용을 추측하지 마세요
- 숫자가 있으면 구체적으로 인용하세요
- JSON 형식으로 응답하세요

중요 규칙 (반복 방지):
- 각 항목마다 반드시 서로 다른 관점과 구체적 내용을 제시하세요
- 동일한 문장이나 패턴을 반복하지 마세요
- 키워드별 고유한 검색 의도와 맥락을 반영하세요
- 일반적인 설명보다 해당 키워드에만 해당하는 구체적 인사이트를 우선하세요
- 숫자, 비율, 트렌드 방향 등 데이터 근거를 포함하세요

응답 형식:
{
  "interpretation": "...",
  "keyFindings": ["...", "...", "..."],
  "suggestedActions": ["...", "..."]
}`;

export class InsightInterpreterService {
  /**
   * 분석 결과를 LLM으로 해석합니다.
   * AI 미설정 시 규칙 기반 fallback을 반환합니다.
   */
  async interpret(input: InterpretInput): Promise<InterpretResult> {
    if (!isAIAvailable()) {
      return this.fallbackInterpret(input);
    }

    const client = getAnthropicClient();
    if (!client) {
      return this.fallbackInterpret(input);
    }

    try {
      const userMessage = this.buildUserMessage(input);

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const firstBlock = response.content[0];
      const text = firstBlock?.type === "text" ? firstBlock.text : "";

      // JSON 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          interpretation: parsed.interpretation ?? "",
          keyFindings: parsed.keyFindings ?? [],
          suggestedActions: parsed.suggestedActions ?? [],
          usedLLM: true,
        };
      }

      // JSON 파싱 실패 시 텍스트 그대로 사용
      return {
        interpretation: text.slice(0, 500),
        keyFindings: [],
        suggestedActions: [],
        usedLLM: true,
      };
    } catch {
      return this.fallbackInterpret(input);
    }
  }

  private buildUserMessage(input: InterpretInput): string {
    const typeLabels: Record<string, string> = {
      intelligence_summary: "Intelligence 분석 요약",
      cluster_analysis: "키워드 클러스터 분석",
      persona_analysis: "페르소나 분석",
      journey_analysis: "검색 여정 분석",
      trend_change: "트렌드 변화 분석",
      competitor_comparison: "경쟁 비교 분석",
      demographic_analysis: "인구통계 분석",
    };

    return `## ${typeLabels[input.type] ?? input.type}

키워드: "${input.keyword}"

분석 데이터:
\`\`\`json
${JSON.stringify(input.data, null, 2).slice(0, 3000)}
\`\`\`

위 데이터를 기반으로 마케터가 바로 활용할 수 있는 인사이트를 JSON으로 생성해주세요.`;
  }

  /**
   * 규칙 기반 fallback 해석
   */
  private fallbackInterpret(input: InterpretInput): InterpretResult {
    const { keyword, type, data } = input;

    switch (type) {
      case "intelligence_summary":
        return {
          interpretation: `"${keyword}" 키워드에 대한 Intelligence 분석이 완료되었습니다. 상세 데이터를 확인하여 마케팅 전략에 반영하세요.`,
          keyFindings: [
            `"${keyword}" 관련 분석 데이터가 수집되었습니다.`,
            "트렌드 및 연관 키워드를 확인하세요.",
            "경쟁 환경과 콘텐츠 갭을 검토하세요.",
          ],
          suggestedActions: [
            "주요 연관 키워드를 중심으로 콘텐츠를 기획하세요.",
            "경쟁사 대비 차별화 포인트를 찾아보세요.",
          ],
          usedLLM: false,
        };

      case "trend_change": {
        const direction = (data.direction as string) ?? "stable";
        const label =
          direction === "rising"
            ? "상승"
            : direction === "declining"
              ? "하락"
              : "안정";
        return {
          interpretation: `"${keyword}" 키워드의 검색 트렌드가 ${label} 추세를 보이고 있습니다.`,
          keyFindings: [
            `트렌드 방향: ${label}`,
            "시계열 데이터를 확인하여 변곡점을 파악하세요.",
            "연관 키워드의 동반 변화를 확인하세요.",
          ],
          suggestedActions: [
            direction === "rising"
              ? "상승 트렌드를 활용한 콘텐츠를 선제적으로 준비하세요."
              : "하락 원인을 분석하고 대안 키워드를 탐색하세요.",
            "경쟁사의 해당 키워드 대응 현황을 모니터링하세요.",
          ],
          usedLLM: false,
        };
      }

      default:
        return {
          interpretation: `"${keyword}" 키워드에 대한 ${type} 분석 결과입니다.`,
          keyFindings: [
            "분석 데이터를 확인하세요.",
            "주요 변화 포인트를 검토하세요.",
            "실행 가능한 액션을 도출하세요.",
          ],
          suggestedActions: [
            "데이터 기반으로 전략을 수립하세요.",
            "정기적으로 모니터링하세요.",
          ],
          usedLLM: false,
        };
    }
  }
}
