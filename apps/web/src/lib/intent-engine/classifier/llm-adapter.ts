// ─────────────────────────────────────────────────────────────
// LLM Adapter — OpenAI GPT-4o 통합 (향상된 3차원 분류)
// ─────────────────────────────────────────────────────────────
// 규칙 기반 분류가 불확실한 키워드를 LLM으로 재분류
// 인텐트 카테고리 + 서브 인텐트 + 시간적 단계 3차원 분류 지원
// API 키가 없으면 fallback 규칙 사용

import type { IntentCategory, SubIntent, TemporalPhase } from "../types";

export type LLMClassificationResult = {
  keyword: string;
  intentCategory: IntentCategory;
  subIntent: SubIntent;
  temporalPhase: TemporalPhase;
  confidence: number;
  reasoning: string;
};

// ── 배치 크기 ──

const BATCH_SIZE = 30;

// ── System Prompt (3차원 분류 지원) ──

const SYSTEM_PROMPT = `당신은 한국어 검색 쿼리를 분류하는 검색 의도 분석 전문가입니다.

각 키워드에 대해 3가지 차원으로 분류해주세요:

1. **intentCategory** (검색 의도 카테고리, 다음 중 하나):
   - "discovery": 정보 탐색, 개념 이해, 학습 목적 (예: "SEO란", "마케팅 기초")
   - "comparison": 비교, 리뷰, 평가, 대안 탐색 (예: "A vs B", "추천 순위")
   - "action": 구매, 가입, 다운로드, 실행 등 행동 유도 (예: "구매 방법", "가입하기")
   - "troubleshooting": 문제 해결, 에러 수정, 고장 수리 (예: "에러 해결", "안됨")
   - "commercial": 가격, 비용, 요금 관련 상업적 의도 (예: "가격 비교", "요금제")

2. **subIntent** (세부 의도, 다음 중 하나):
   - "definition": 정의/뜻 파악 (예: "SEO 뜻", "블록체인이란", "마케팅 정의")
   - "how_to": 방법/절차 안내 (예: "블로그 만들기", "시작하는 방법")
   - "list": 목록/순위/추천 (예: "추천 앱", "베스트 10", "Top 5")
   - "review": 후기/리뷰/평가 (예: "사용 후기", "리뷰", "평가")
   - "versus": 비교/대결 (예: "A vs B", "차이점 비교")
   - "price": 가격/비용 정보 (예: "가격", "비용", "얼마")
   - "purchase": 구매/결제 관련 (예: "구매 방법", "결제하기")
   - "signup": 가입/등록 관련 (예: "가입 방법", "등록하기")
   - "error_fix": 에러/오류 해결 (예: "에러 해결", "오류 수정")
   - "refund": 환불/교환/취소 (예: "환불 방법", "교환 절차")
   - "alternative": 대안/대체 탐색 (예: "대안 서비스", "대체 방법")
   - "trend": 트렌드/동향/전망 (예: "2025 트렌드", "시장 전망")
   - "experience": 체험/경험/사례 (예: "사용 경험", "체험기")
   - "tutorial": 튜토리얼/가이드/강좌 (예: "초보 가이드", "튜토리얼")
   - "general": 위 카테고리에 해당하지 않는 경우

3. **temporalPhase** (시드 키워드 대비 검색 시점, 다음 중 하나):
   - "before": 시드 키워드를 검색하기 전 단계 (배경 지식, 동기, 탐색)
   - "current": 시드 키워드와 직접 관련된 현재 검색
   - "after": 시드 키워드 검색 이후 단계 (결과, 후기, 다음 행동, 문제 해결)

**추가 규칙 (유사 키워드 차별화)**:
- 동일하거나 매우 유사한 키워드가 있으면, 미묘한 차이를 구분하여 분류하세요
- 예: "더크림유니언 추천"과 "더크림유니언 추천 순위"는 같은 의도지만, 후자는 더 구체적인 순위/랭킹 니즈를 반영합니다
- 유사 키워드 그룹 내에서도 subIntent를 차별화하세요

**응답 형식**: JSON 객체로 응답해주세요.
{
  "results": [
    {
      "keyword": "키워드",
      "intentCategory": "카테고리",
      "subIntent": "세부의도",
      "temporalPhase": "시간단계",
      "confidence": 0.0~1.0,
      "reasoning": "분류 근거를 한국어로 설명"
    }
  ]
}`;

// ── LLM Classification ──

export async function classifyWithLLM(
  keywords: string[],
  seedKeyword: string,
  apiKey: string,
  model = "gpt-4o",
): Promise<LLMClassificationResult[]> {
  if (!apiKey) {
    return classifyWithFallback(keywords, seedKeyword);
  }

  // 키워드가 BATCH_SIZE보다 많으면 배치 처리
  if (keywords.length > BATCH_SIZE) {
    return processBatches(keywords, seedKeyword, apiKey, model);
  }

  return classifySingleBatch(keywords, seedKeyword, apiKey, model);
}

// ── 배치 처리 (30개씩 순차 처리) ──

async function processBatches(
  keywords: string[],
  seedKeyword: string,
  apiKey: string,
  model: string,
): Promise<LLMClassificationResult[]> {
  const allResults: LLMClassificationResult[] = [];

  for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
    const batch = keywords.slice(i, i + BATCH_SIZE);

    try {
      const batchResults = await classifySingleBatch(
        batch,
        seedKeyword,
        apiKey,
        model,
      );
      allResults.push(...batchResults);
    } catch (err) {
      // 배치 실패 시 해당 배치만 폴백 처리
      console.warn(
        `[LLMAdapter] 배치 ${Math.floor(i / BATCH_SIZE) + 1} 처리 실패, 폴백 적용:`,
        err,
      );
      allResults.push(...classifyWithFallback(batch, seedKeyword));
    }
  }

  return allResults;
}

// ── 단일 배치 분류 ──

async function classifySingleBatch(
  keywords: string[],
  seedKeyword: string,
  apiKey: string,
  model: string,
): Promise<LLMClassificationResult[]> {
  try {
    const userPrompt = `시드 키워드: "${seedKeyword}"

다음 ${keywords.length}개의 키워드를 분류해주세요:
${keywords.map((k, i) => `${i + 1}. "${k}"`).join("\n")}`;

    // 30초 타임아웃
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.error(
        `[LLMAdapter] OpenAI API 오류: ${response.status} ${response.statusText}`,
      );
      return classifyWithFallback(keywords, seedKeyword);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.warn("[LLMAdapter] OpenAI 응답에 content가 없습니다");
      return classifyWithFallback(keywords, seedKeyword);
    }

    const parsed = JSON.parse(content);
    const items: Record<string, unknown>[] = Array.isArray(parsed)
      ? parsed
      : parsed.results || parsed.classifications || [];

    return items.map((item) => ({
      keyword: String(item.keyword || ""),
      intentCategory: validateCategory(item.intentCategory),
      subIntent: validateSubIntent(item.subIntent),
      temporalPhase: validatePhase(item.temporalPhase),
      confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.7)),
      reasoning: String(item.reasoning || ""),
    }));
  } catch (err) {
    console.error("[LLMAdapter] LLM 분류 실패:", err);
    return classifyWithFallback(keywords, seedKeyword);
  }
}

// ── Fallback (향상된 규칙 기반 폴백, 서브 인텐트 포함) ──

export function classifyWithFallback(
  keywords: string[],
  _seedKeyword: string,
): LLMClassificationResult[] {
  return keywords.map((keyword) => {
    const kw = keyword.toLowerCase();

    // 인텐트 카테고리 분류
    let category: IntentCategory = "discovery";
    if (/가격|비용|요금|얼마|할인|쿠폰|세일|요금제/.test(kw))
      category = "action";
    else if (/구매|구입|주문|가입|신청|등록|결제|다운로드/.test(kw))
      category = "action";
    else if (/비교|리뷰|추천|vs|대안|순위|랭킹|베스트/.test(kw))
      category = "comparison";
    else if (/에러|문제|해결|안됨|오류|환불|교환|취소|반품/.test(kw))
      category = "troubleshooting";

    // 서브 인텐트 분류
    let subIntent: SubIntent = "general";
    if (/뜻$|이란$|정의|개념/.test(kw)) subIntent = "definition";
    else if (/방법|하는\s*법|만들기|시작하기/.test(kw)) subIntent = "how_to";
    else if (/추천|순위|랭킹|베스트|top/i.test(kw)) subIntent = "list";
    else if (/후기|리뷰|평가|사용기/.test(kw)) subIntent = "review";
    else if (/vs|비교|차이/i.test(kw)) subIntent = "versus";
    else if (/가격|비용|요금|얼마/.test(kw)) subIntent = "price";
    else if (/구매|구입|주문|결제/.test(kw)) subIntent = "purchase";
    else if (/가입|등록|신청/.test(kw)) subIntent = "signup";
    else if (/에러|오류|안됨|해결/.test(kw)) subIntent = "error_fix";
    else if (/환불|교환|취소|반품/.test(kw)) subIntent = "refund";
    else if (/대안|대체|말고|같은/.test(kw)) subIntent = "alternative";
    else if (/트렌드|동향|전망|2025|2026/.test(kw)) subIntent = "trend";
    else if (/체험|경험|사례/.test(kw)) subIntent = "experience";
    else if (/튜토리얼|가이드|강좌/.test(kw)) subIntent = "tutorial";

    // 시간적 단계 분류
    let phase: TemporalPhase = "current";
    if (/뜻|이란|종류|입문|왜|기초|개념|알아보|준비|고민/.test(kw))
      phase = "before";
    else if (
      /후기|결과|활용|고급|효과|에러|해결|환불|교환|체험|경험|사례/.test(kw)
    )
      phase = "after";

    return {
      keyword,
      intentCategory: category,
      subIntent,
      temporalPhase: phase,
      confidence: 0.55,
      reasoning: "규칙 기반 폴백 분류",
    };
  });
}

// ── Validators (검증 함수) ──

function validateCategory(val: unknown): IntentCategory {
  const valid: IntentCategory[] = [
    "discovery",
    "comparison",
    "action",
    "troubleshooting",
  ];
  return valid.includes(val as IntentCategory)
    ? (val as IntentCategory)
    : "discovery";
}

function validatePhase(val: unknown): TemporalPhase {
  const valid: TemporalPhase[] = ["before", "current", "after"];
  return valid.includes(val as TemporalPhase)
    ? (val as TemporalPhase)
    : "current";
}

function validateSubIntent(val: unknown): SubIntent {
  const valid: SubIntent[] = [
    "definition",
    "how_to",
    "list",
    "review",
    "versus",
    "price",
    "purchase",
    "signup",
    "error_fix",
    "refund",
    "alternative",
    "trend",
    "experience",
    "tutorial",
    "general",
  ];
  return valid.includes(val as SubIntent) ? (val as SubIntent) : "general";
}
