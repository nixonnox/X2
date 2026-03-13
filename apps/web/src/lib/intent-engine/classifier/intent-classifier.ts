// ─────────────────────────────────────────────────────────────
// Intent Classifier — 향상된 NLP 기반 검색 의도 분류
// ─────────────────────────────────────────────────────────────
// 1차: 규칙 기반 분류 (키워드 패턴 매칭)
// 2차: LLM 기반 분류 (OpenAI GPT-4o, 옵션)
// 3차: 난이도 점수 및 갭 스코어 계산

import type {
  ExpandedKeyword,
  IntentCategory,
  SubIntent,
  TemporalPhase,
  SearchJourneyStage,
  ClassifiedKeyword,
  AggregatedSocialVolume,
} from "../types";
import { calculateGapScore, calculateDifficultyScore } from "./gap-calculator";
import { classifyWithLLM } from "./llm-adapter";

// ── Intent Category Rules (확장) ──

const INTENT_PATTERNS: { category: IntentCategory; patterns: RegExp[] }[] = [
  {
    category: "discovery",
    patterns: [
      /뜻$/,
      /이란$/,
      /이란\s*무엇/,
      /종류/,
      /입문/,
      /시작/,
      /기초/,
      /기본/,
      /알아보/,
      /개념/,
      /정의/,
      /특징/,
      /차이점/,
      /역사/,
      /의미/,
      /유형/,
      /what\s+is/i,
      /guide/i,
      /tutorial/i,
      /소개/,
      /원리/,
      /구조/,
      /왜/,
      /필요성/,
      /장단점/,
    ],
  },
  {
    category: "comparison",
    patterns: [
      /vs/i,
      /비교/,
      /차이/,
      /추천/,
      /순위/,
      /랭킹/,
      /베스트/,
      /최고/,
      /top\s*\d/i,
      /리뷰/,
      /평가/,
      /장점/,
      /단점/,
      /대안/,
      /대체/,
      /말고/,
      /같은/,
      /비슷한/,
      /선택/,
      /고르는/,
      /versus/i,
      /review/i,
      /best/i,
      /alternative/i,
    ],
  },
  {
    category: "action",
    patterns: [
      /구매/,
      /구입/,
      /주문/,
      /가입/,
      /신청/,
      /등록/,
      /다운로드/,
      /설치/,
      /가격/,
      /요금/,
      /할인/,
      /쿠폰/,
      /무료/,
      /유료/,
      /배송/,
      /결제/,
      /예약/,
      /체험/,
      /시작하기/,
      /방법/,
      /하는\s*법/,
      /만들기/,
      /사용법/,
      /활용/,
      /적용/,
      /구현/,
      /how\s+to/i,
      /buy/i,
      /price/i,
      /order/i,
      /download/i,
      /subscribe/i,
      /free/i,
      /튜토리얼/,
      /가이드/,
      /강좌/,
      /설정/,
    ],
  },
  {
    category: "troubleshooting",
    patterns: [
      /에러/,
      /오류/,
      /안됨/,
      /안\s*되/,
      /문제/,
      /해결/,
      /수리/,
      /고장/,
      /불량/,
      /교환/,
      /환불/,
      /취소/,
      /삭제/,
      /복구/,
      /초기화/,
      /리셋/,
      /반품/,
      /실패/,
      /fix/i,
      /error/i,
      /issue/i,
      /problem/i,
      /won'?t/i,
      /doesn'?t/i,
      /not\s+working/i,
    ],
  },
  {
    category: "action",
    patterns: [
      /가격/,
      /비용/,
      /요금/,
      /얼마/,
      /할인/,
      /쿠폰/,
      /세일/,
      /무료/,
      /유료/,
      /프리미엄/,
      /플랜/,
      /요금제/,
      /price/i,
      /cost/i,
      /pricing/i,
      /cheap/i,
    ],
  },
];

// ── Sub-Intent Rules ──

const SUB_INTENT_PATTERNS: { subIntent: SubIntent; patterns: RegExp[] }[] = [
  { subIntent: "definition", patterns: [/뜻$/, /이란$/, /정의/, /개념/] },
  {
    subIntent: "how_to",
    patterns: [/방법/, /하는\s*법/, /만들기/, /시작하기/],
  },
  { subIntent: "list", patterns: [/추천/, /순위/, /랭킹/, /베스트/, /top/i] },
  { subIntent: "review", patterns: [/후기/, /리뷰/, /평가/, /사용기/] },
  { subIntent: "versus", patterns: [/vs/i, /비교/, /차이/] },
  { subIntent: "price", patterns: [/가격/, /비용/, /요금/, /얼마/] },
  { subIntent: "purchase", patterns: [/구매/, /구입/, /주문/, /결제/] },
  { subIntent: "signup", patterns: [/가입/, /등록/, /신청/] },
  { subIntent: "error_fix", patterns: [/에러/, /오류/, /안됨/, /해결/] },
  { subIntent: "refund", patterns: [/환불/, /교환/, /취소/, /반품/] },
  { subIntent: "alternative", patterns: [/대안/, /대체/, /말고/, /같은/] },
  { subIntent: "trend", patterns: [/트렌드/, /동향/, /전망/, /2025/, /2026/] },
  { subIntent: "experience", patterns: [/체험/, /경험/, /사례/] },
  { subIntent: "tutorial", patterns: [/튜토리얼/, /가이드/, /강좌/] },
];

// ── Temporal Phase Rules (확장) ──

const TEMPORAL_PATTERNS: { phase: TemporalPhase; patterns: RegExp[] }[] = [
  {
    phase: "before",
    patterns: [
      /뜻$/,
      /이란$/,
      /종류/,
      /입문/,
      /시작/,
      /기초/,
      /개념/,
      /왜/,
      /필요성/,
      /알아보/,
      /what/i,
      /why/i,
      /준비/,
      /고려/,
      /선택/,
      /결정/,
      /기본/,
      /소개/,
      /의미/,
      /정의/,
      /고민/,
      /고르는/,
      /계획/,
    ],
  },
  {
    phase: "after",
    patterns: [
      /후기/,
      /결과/,
      /효과/,
      /변화/,
      /성공/,
      /실패/,
      /활용/,
      /고급/,
      /심화/,
      /다음/,
      /이후/,
      /review/i,
      /result/i,
      /after/i,
      /advanced/i,
      /문제/,
      /에러/,
      /해결/,
      /교환/,
      /환불/,
      /취소/,
      /반품/,
      /체험/,
      /경험/,
      /사례/,
      /사용기/,
    ],
  },
];

// ── 검색 여정 단계 매핑 ──

/**
 * 인텐트 카테고리와 시간적 단계를 조합하여 검색 여정 단계를 도출합니다.
 *
 * - discovery + before → awareness
 * - comparison + current → consideration
 * - action + current/after → decision
 * - troubleshooting + after → retention
 * - review/experience + after → advocacy
 */
function deriveJourneyStage(
  intent: IntentCategory,
  temporal: TemporalPhase,
  subIntent: SubIntent,
): SearchJourneyStage {
  // discovery + before → awareness
  if (intent === "discovery" && temporal === "before") {
    return "awareness";
  }

  // comparison + current → consideration
  if (intent === "comparison" && temporal === "current") {
    return "consideration";
  }

  // action + current/after → decision
  if (intent === "action" && (temporal === "current" || temporal === "after")) {
    return "decision";
  }

  // troubleshooting + after → retention
  if (intent === "troubleshooting" && temporal === "after") {
    return "retention";
  }

  // review/experience + after → advocacy
  if (
    (subIntent === "review" || subIntent === "experience") &&
    temporal === "after"
  ) {
    return "advocacy";
  }

  // 기본 매핑: 인텐트 기반 폴백
  switch (intent) {
    case "discovery":
      return "awareness";
    case "comparison":
      return "consideration";
    case "action":
      return "decision";
    case "unknown":
      return "awareness";
    case "troubleshooting":
      return "retention";
    default:
      return "awareness";
  }
}

// ── Rule-based Classification ──

function classifyIntentByRules(keyword: string): {
  category: IntentCategory;
  confidence: number;
} {
  const kw = keyword.toLowerCase();

  for (const rule of INTENT_PATTERNS) {
    const matchCount = rule.patterns.filter((p) => p.test(kw)).length;
    if (matchCount > 0) {
      const confidence = Math.min(0.95, 0.6 + matchCount * 0.1);
      return { category: rule.category, confidence };
    }
  }

  return { category: "discovery", confidence: 0.3 };
}

function classifySubIntentByRules(keyword: string): SubIntent {
  const kw = keyword.toLowerCase();

  for (const rule of SUB_INTENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(kw)) {
        return rule.subIntent;
      }
    }
  }

  return "general";
}

function classifyTemporalByRules(
  keyword: string,
  seedKeyword: string,
): { phase: TemporalPhase; confidence: number } {
  const kw = keyword.toLowerCase();

  // 시드 키워드 자체는 current
  if (kw === seedKeyword.toLowerCase()) {
    return { phase: "current", confidence: 1.0 };
  }

  for (const rule of TEMPORAL_PATTERNS) {
    const matchCount = rule.patterns.filter((p) => p.test(kw)).length;
    if (matchCount > 0) {
      return {
        phase: rule.phase,
        confidence: Math.min(0.9, 0.5 + matchCount * 0.15),
      };
    }
  }

  return { phase: "current", confidence: 0.4 };
}

// ── Main Classifier ──

export async function classifyKeywords(
  keywords: ExpandedKeyword[],
  socialVolumes: Map<string, AggregatedSocialVolume>,
  seedKeyword: string,
  options: {
    useLLM?: boolean;
    openaiApiKey?: string;
    openaiModel?: string;
  } = {},
): Promise<ClassifiedKeyword[]> {
  const results: ClassifiedKeyword[] = [];

  // 1차: 규칙 기반 분류 (인텐트, 서브 인텐트, 시간적 단계)
  for (const kw of keywords) {
    const intent = classifyIntentByRules(kw.keyword);
    const subIntent = classifySubIntentByRules(kw.keyword);
    const temporal = classifyTemporalByRules(kw.keyword, seedKeyword);
    const journeyStage = deriveJourneyStage(
      intent.category,
      temporal.phase,
      subIntent,
    );

    const socialVol = socialVolumes.get(kw.keyword);
    const socialVolume = socialVol?.totalContentCount || 0;
    const gapScore = calculateGapScore(kw.searchVolume, socialVolume);
    const difficultyScore = calculateDifficultyScore(
      kw.searchVolume,
      socialVol,
    );

    results.push({
      keyword: kw.keyword,
      intentCategory: intent.category,
      subIntent,
      temporalPhase: temporal.phase,
      journeyStage,
      confidence:
        Math.round(((intent.confidence + temporal.confidence) / 2) * 100) / 100,
      searchVolume: kw.searchVolume,
      socialVolume,
      gapScore,
      difficultyScore,
      isRising: kw.isRising,
      source: kw.source,
    });
  }

  // 2차: LLM 분류 (옵션, unknown 또는 낮은 confidence만)
  if (options.useLLM && options.openaiApiKey) {
    const uncertain = results.filter((r) => r.confidence < 0.5);

    if (uncertain.length > 0) {
      try {
        const llmResults = await classifyWithLLM(
          uncertain.map((r) => r.keyword),
          seedKeyword,
          options.openaiApiKey,
          options.openaiModel || "gpt-4o",
        );

        // LLM 결과를 기존 결과에 병합
        for (const llmResult of llmResults) {
          const existing = results.find((r) => r.keyword === llmResult.keyword);
          if (existing && llmResult.confidence > existing.confidence) {
            existing.intentCategory = llmResult.intentCategory;
            existing.subIntent = llmResult.subIntent;
            existing.temporalPhase = llmResult.temporalPhase;
            existing.confidence = llmResult.confidence;
            existing.reasoning = llmResult.reasoning;
            // 여정 단계 재계산
            existing.journeyStage = deriveJourneyStage(
              llmResult.intentCategory,
              llmResult.temporalPhase,
              llmResult.subIntent,
            );
          }
        }
      } catch (err) {
        // LLM 실패 시 규칙 기반 결과 유지
        console.warn(
          "[IntentClassifier] LLM 분류 실패, 규칙 기반 결과를 유지합니다:",
          err,
        );
      }
    }
  }

  return results;
}
