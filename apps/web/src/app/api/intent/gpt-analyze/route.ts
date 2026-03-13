// ─────────────────────────────────────────────────────────────
// GPT Cluster Analysis API — 클러스터 종합 분석 (GPT-4o)
// ─────────────────────────────────────────────────────────────
// POST: 선택된 클러스터의 키워드를 GPT로 종합 분석
//   → 종합 요약, 페르소나 분석, 주요 토픽 분석 반환

import { NextResponse } from "next/server";

// ── Types ──

type GptClusterAnalysis = {
  summary: string;
  topKeywords: string[];
  personas: { label: string; situation: string; questions: string[] }[];
  topics: { question: string; evidence: string }[];
};

type RequestBody = {
  seedKeyword: string;
  clusterName: string;
  keywords: string[];
  dominantIntent?: string;
  dominantPhase?: string;
  avgGapScore?: number;
};

// ── System Prompt ──

const SYSTEM_PROMPT = `당신은 검색 의도 분석 전문가이자 디지털 마케팅 컨설턴트입니다.
주어진 키워드 클러스터를 분석하여 다음을 제공합니다:

1. **종합 분석**: 이 클러스터의 검색 패턴과 소비자 심리를 요약 (3-5문장)
2. **상위 키워드**: 클러스터에서 가장 중요한 5개 키워드 선정
3. **페르소나 분석**: 이 클러스터를 검색하는 3가지 소비자 유형 (각각 label, situation, 3개 핵심 질문)
4. **주요 토픽**: 상위 10개 키워드에 대한 핵심 질문과 근거

**응답 형식**: 반드시 아래 JSON 형식으로 응답하세요.
{
  "summary": "종합 분석 텍스트",
  "topKeywords": ["키워드1", "키워드2", ...],
  "personas": [
    { "label": "유형명", "situation": "상황 설명", "questions": ["질문1", "질문2", "질문3"] }
  ],
  "topics": [
    { "question": "핵심 질문", "evidence": "근거 설명" }
  ]
}`;

// ── POST Handler ──

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const {
      seedKeyword,
      clusterName,
      keywords,
      dominantIntent,
      dominantPhase,
      avgGapScore,
    } = body;

    if (
      !seedKeyword ||
      typeof seedKeyword !== "string" ||
      !clusterName ||
      typeof clusterName !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "seedKeyword와 clusterName은 필수입니다." },
        { status: 400 },
      );
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: "키워드가 필요합니다." },
        { status: 400 },
      );
    }

    // 키워드 수 제한 (비용 보호)
    const limitedKeywords = keywords.slice(0, 50).map(String);

    const apiKey = process.env.OPENAI_API_KEY;

    // API 키가 없으면 규칙 기반 fallback 생성
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        data: generateFallbackAnalysis(
          seedKeyword,
          clusterName,
          limitedKeywords,
          dominantIntent,
          avgGapScore,
        ),
      });
    }

    // GPT-4o 호출
    const userPrompt = buildUserPrompt(
      seedKeyword,
      clusterName,
      limitedKeywords,
      dominantIntent,
      dominantPhase,
      avgGapScore,
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      console.error(`[GPT-Analyze] OpenAI API error: ${response.status}`);
      // fallback
      return NextResponse.json({
        success: true,
        data: generateFallbackAnalysis(
          seedKeyword,
          clusterName,
          limitedKeywords,
          dominantIntent,
          avgGapScore,
        ),
        fallback: true,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({
        success: true,
        data: generateFallbackAnalysis(
          seedKeyword,
          clusterName,
          limitedKeywords,
          dominantIntent,
          avgGapScore,
        ),
        fallback: true,
      });
    }

    let parsed: GptClusterAnalysis;
    try {
      parsed = JSON.parse(content);
    } catch {
      // JSON 파싱 실패 시 fallback
      return NextResponse.json({
        success: true,
        data: generateFallbackAnalysis(
          seedKeyword,
          clusterName,
          limitedKeywords,
          dominantIntent,
          avgGapScore,
        ),
        fallback: true,
      });
    }

    // Validate structure
    const result: GptClusterAnalysis = {
      summary: parsed.summary || "",
      topKeywords: Array.isArray(parsed.topKeywords)
        ? parsed.topKeywords.slice(0, 10)
        : keywords.slice(0, 5),
      personas: Array.isArray(parsed.personas)
        ? parsed.personas.slice(0, 5).map((p) => ({
            label: String(p.label || ""),
            situation: String(p.situation || ""),
            questions: Array.isArray(p.questions)
              ? p.questions.map(String).slice(0, 5)
              : [],
          }))
        : [],
      topics: Array.isArray(parsed.topics)
        ? parsed.topics.slice(0, 15).map((t) => ({
            question: String(t.question || ""),
            evidence: String(t.evidence || ""),
          }))
        : [],
    };

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[GPT-Analyze] Error:", err);
    return NextResponse.json(
      { success: false, error: "GPT 분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// ── User Prompt Builder ──

function buildUserPrompt(
  seedKeyword: string,
  clusterName: string,
  keywords: string[],
  dominantIntent?: string,
  dominantPhase?: string,
  avgGapScore?: number,
): string {
  const intentLabel = dominantIntent
    ? ({
        discovery: "정보 탐색",
        comparison: "비교/리뷰",
        action: "구매/행동",
        troubleshooting: "문제 해결",
      }[dominantIntent] ?? dominantIntent)
    : "미분류";
  const phaseLabel = dominantPhase
    ? ({ before: "검색 이전", current: "현재 검색", after: "검색 이후" }[
        dominantPhase
      ] ?? dominantPhase)
    : "미분류";

  return `시드 키워드: "${seedKeyword}"
클러스터명: "${clusterName}"
주요 의도: ${intentLabel}
시간적 단계: ${phaseLabel}
평균 갭 스코어: ${avgGapScore?.toFixed(1) ?? "N/A"} (높을수록 블루오션)
포함 키워드 (${keywords.length}개):
${keywords
  .slice(0, 30)
  .map((k, i) => `${i + 1}. ${k}`)
  .join("\n")}
${keywords.length > 30 ? `... 외 ${keywords.length - 30}개` : ""}

위 클러스터를 종합 분석해주세요.`;
}

// ── Fallback Analysis (API 키 없을 때 규칙 기반) ──

function generateFallbackAnalysis(
  seedKeyword: string,
  clusterName: string,
  keywords: string[],
  dominantIntent?: string,
  avgGapScore?: number,
): GptClusterAnalysis {
  const intentLabel = dominantIntent
    ? ({
        discovery: "정보 탐색",
        comparison: "비교/리뷰",
        action: "구매/행동",
        troubleshooting: "문제 해결",
      }[dominantIntent] ?? "일반")
    : "일반";

  const gapDesc =
    (avgGapScore ?? 50) > 60
      ? "블루오션 기회가 높은"
      : (avgGapScore ?? 50) > 30
        ? "적절한 경쟁이 있는"
        : "경쟁이 치열한";

  return {
    summary: `"${clusterName}" 클러스터는 "${seedKeyword}" 관련 ${keywords.length}개의 키워드로 구성되어 있습니다. 주요 검색 의도는 ${intentLabel}이며, ${gapDesc} 영역입니다. 이 클러스터의 검색자들은 주로 실용적인 정보와 비교 콘텐츠를 찾고 있으며, 구체적인 가이드와 사례 중심의 콘텐츠가 효과적일 것으로 분석됩니다.`,
    topKeywords: keywords.slice(0, 5),
    personas: [
      {
        label: "정보 탐색자",
        situation: `${seedKeyword} 관련 기본 개념과 트렌드를 파악하려는 초기 단계 사용자`,
        questions: [
          `${seedKeyword}이(가) 정확히 무엇인가요?`,
          "어떤 장단점이 있나요?",
          "초보자가 시작하려면 어떻게 해야 하나요?",
        ],
      },
      {
        label: "비교 검토자",
        situation: "여러 대안을 비교하고 최적의 선택을 하려는 사용자",
        questions: [
          "다른 옵션과 비교하면 어떤 점이 다른가요?",
          "가격 대비 성능은 어떤가요?",
          "실제 사용자 후기는 어떤가요?",
        ],
      },
      {
        label: "실행 결정자",
        situation: "이미 결정을 내렸고 구체적인 실행 방법을 찾는 사용자",
        questions: [
          "어디서 시작할 수 있나요?",
          "할인이나 프로모션이 있나요?",
          "단계별 시작 가이드가 있나요?",
        ],
      },
    ],
    topics: keywords.slice(0, 10).map((kw) => ({
      question: `"${kw}"를 검색하는 소비자의 핵심 궁금증은?`,
      evidence: `검색 패턴 분석: ${intentLabel} 의도의 키워드로, 실용적 정보와 비교 콘텐츠에 대한 수요가 높음`,
    })),
  };
}
