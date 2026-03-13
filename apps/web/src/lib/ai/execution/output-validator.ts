// ─────────────────────────────────────────────────────────────
// AI Output Validator — 출력 검증 및 정규화
// ─────────────────────────────────────────────────────────────

import type {
  AiTaskType,
  AiLanguageCode,
  AiResponseMode,
  StructuredAiOutput,
  OutputValidationResult,
  OutputValidationError,
  OutputValidationWarning,
} from "../types";

// ── 금지 표현 (과도한 확신 표현) ──

const BANNED_PHRASES: string[] = [
  "확실합니다",
  "반드시",
  "100%",
  "절대적으로",
  "틀림없이",
];

// ── 정책 위반 패턴 (의료/법률 단정적 주장) ──

const POLICY_VIOLATION_PATTERNS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /진단\s*(합니다|입니다|됩니다)/,
    description: "의료 진단 단정 표현",
  },
  {
    pattern: /처방\s*(합니다|해드립니다|드립니다)/,
    description: "의료 처방 단정 표현",
  },
  {
    pattern: /법적\s*(책임|의무).*?(있습니다|없습니다)/,
    description: "법적 책임 단정 표현",
  },
  {
    pattern: /소송.*?(이길|승소|패소).*?(합니다|입니다)/,
    description: "법적 결과 단정 표현",
  },
  {
    pattern: /반드시\s*(치료|복용|투여)/,
    description: "의료 행위 강제 표현",
  },
];

// ── 과도한 확신 표현 패턴 ──

const OVERCONFIDENT_PATTERNS: RegExp[] = [
  /의심의\s*여지\s*없이/,
  /명백하게/,
  /분명히\s*(~|합니다|입니다)/,
  /guaranteed/i,
  /100\s*%\s*(확실|정확|보장)/,
  /absolutely\s+certain/i,
  /without\s+a\s+doubt/i,
];

// ── 한국어 판별 (간단한 휴리스틱) ──

const KOREAN_CHAR_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;

function containsKorean(text: string): boolean {
  const koreanChars = text.match(new RegExp(KOREAN_CHAR_REGEX.source, "g"));
  if (!koreanChars) return false;
  // 전체 문자 중 한국어 비율이 5% 이상이면 한국어로 판단
  return koreanChars.length / text.length > 0.05;
}

// ── 응답 모드별 최소 길이 ──

function getMinLength(taskType: AiTaskType): {
  mode: AiResponseMode;
  min: number;
} {
  const classificationTasks: AiTaskType[] = [
    "comment_sentiment_analysis",
    "comment_topic_classification",
  ];
  if (classificationTasks.includes(taskType)) {
    return { mode: "classification", min: 1 };
  }
  // 구조화된 출력이 필요한 태스크
  const structuredTasks: AiTaskType[] = [
    "comment_risk_assessment",
    "faq_extraction",
    "competitor_insight_generation",
    "listening_insight_generation",
    "strategy_insight_generation",
    "report_summary_generation",
    "report_action_recommendation",
  ];
  if (structuredTasks.includes(taskType)) {
    return { mode: "structured", min: 50 };
  }
  return { mode: "text", min: 20 };
}

// ── 메인 검증 함수 ──

export function validateOutput(
  rawOutput: string,
  taskType: AiTaskType,
  language: AiLanguageCode,
  requiredFields: string[],
): OutputValidationResult {
  const errors: OutputValidationError[] = [];
  const warnings: OutputValidationWarning[] = [];
  let score = 100;

  const { mode, min } = getMinLength(taskType);

  // 1. 빈 결과 또는 너무 짧은 결과 검사
  if (!rawOutput || rawOutput.trim().length === 0) {
    errors.push({
      code: "EMPTY_OUTPUT",
      message: "AI 응답이 비어있습니다.",
    });
    return { isValid: false, errors, warnings, score: 0 };
  }

  if (rawOutput.trim().length < min) {
    errors.push({
      code: "TOO_SHORT",
      message: `AI 응답이 너무 짧습니다. 최소 ${min}자 이상이어야 합니다. (현재: ${rawOutput.trim().length}자)`,
    });
    score -= 40;
  }

  // 2. JSON 파싱 가능 여부 (구조화된 모드인 경우)
  let parsedJson: Record<string, unknown> | null = null;
  if (mode === "structured") {
    try {
      parsedJson = JSON.parse(rawOutput) as Record<string, unknown>;
    } catch {
      errors.push({
        code: "JSON_PARSE_ERROR",
        message: "구조화된 응답이 요구되었으나 JSON 파싱에 실패했습니다.",
      });
      score -= 30;
    }
  }

  // 3. 필수 필드 존재 여부 검사
  if (parsedJson && requiredFields.length > 0) {
    for (const field of requiredFields) {
      const value = parsedJson[field];
      if (value === undefined || value === null) {
        errors.push({
          code: "MISSING_FIELD",
          message: `필수 필드 '${field}'가 응답에 포함되어 있지 않습니다.`,
          field,
        });
        score -= 15;
      } else if (typeof value === "string" && value.trim().length === 0) {
        errors.push({
          code: "EMPTY_FIELD",
          message: `필수 필드 '${field}'가 비어있습니다.`,
          field,
        });
        score -= 10;
      }
    }
  }

  // 4. 언어 검사: 한국어가 예상될 때 한국어 포함 여부
  if (language === "ko" && !containsKorean(rawOutput)) {
    warnings.push({
      code: "LANGUAGE_MISMATCH",
      message: "한국어 응답이 예상되었으나, 한국어 문자가 감지되지 않았습니다.",
      suggestion: "프롬프트에 한국어 응답 지시를 강화하세요.",
    });
    score -= 10;
  }

  // 5. 금지 표현 검사 (경고)
  for (const phrase of BANNED_PHRASES) {
    if (rawOutput.includes(phrase)) {
      warnings.push({
        code: "BANNED_PHRASE",
        message: `과도한 확신 표현 '${phrase}'이(가) 감지되었습니다.`,
        suggestion: "보다 신중한 표현으로 대체를 권장합니다.",
      });
      score -= 5;
    }
  }

  // 6. 과도한 확신 표현 패턴 검사
  for (const pattern of OVERCONFIDENT_PATTERNS) {
    if (pattern.test(rawOutput)) {
      warnings.push({
        code: "OVERCONFIDENT_LANGUAGE",
        message: `과도한 확신 표현 패턴이 감지되었습니다: ${pattern.source}`,
        suggestion:
          "AI 응답에는 적절한 불확실성 표현을 포함하는 것이 좋습니다.",
      });
      score -= 5;
    }
  }

  // 7. 정책 위반 패턴 검사
  for (const { pattern, description } of POLICY_VIOLATION_PATTERNS) {
    if (pattern.test(rawOutput)) {
      errors.push({
        code: "POLICY_VIOLATION",
        message: `정책 위반 패턴이 감지되었습니다: ${description}`,
      });
      score -= 20;
    }
  }

  // 점수 하한 보정
  score = Math.max(0, Math.min(100, score));

  const isValid = errors.length === 0;

  return { isValid, errors, warnings, score };
}

// ── 구조화된 출력 파싱 ──

export function parseStructuredOutput(
  rawOutput: string,
): StructuredAiOutput | null {
  try {
    const parsed = JSON.parse(rawOutput) as Record<string, unknown>;

    const output: StructuredAiOutput = {
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      confidence:
        typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };

    if (typeof parsed.title === "string" && parsed.title.length > 0) {
      output.title = parsed.title;
    }

    if (Array.isArray(parsed.bullets)) {
      output.bullets = parsed.bullets.filter(
        (b): b is string => typeof b === "string",
      );
    }

    if (Array.isArray(parsed.riskFlags)) {
      output.riskFlags = parsed.riskFlags.filter(
        (f): f is string => typeof f === "string",
      );
    }

    if (Array.isArray(parsed.recommendations)) {
      output.recommendations = parsed.recommendations.filter(
        (r): r is string => typeof r === "string",
      );
    }

    if (Array.isArray(parsed.citations)) {
      output.citations = parsed.citations.filter(
        (c): c is string => typeof c === "string",
      );
    }

    if (
      typeof parsed.metadata === "object" &&
      parsed.metadata !== null &&
      !Array.isArray(parsed.metadata)
    ) {
      output.metadata = parsed.metadata as Record<string, unknown>;
    }

    // summary가 비어있으면 파싱 실패로 간주
    if (!output.summary || output.summary.trim().length === 0) {
      return null;
    }

    return output;
  } catch {
    return null;
  }
}

// ── 출력 정규화 ──

export function normalizeOutput(
  raw: string,
  _taskType: AiTaskType,
): StructuredAiOutput {
  // JSON 파싱 시도
  const structured = parseStructuredOutput(raw);
  if (structured) {
    return structured;
  }

  // 일반 텍스트인 경우 StructuredAiOutput으로 래핑
  return {
    summary: raw.trim(),
    confidence: 0.5,
  };
}
