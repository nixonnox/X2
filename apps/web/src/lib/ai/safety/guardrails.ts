// ─────────────────────────────────────────────────────────────
// AI Safety Guardrails — 안전 정책 및 출력 필터링
// ─────────────────────────────────────────────────────────────

import type { AiTaskType, AiSafetyPolicy, StructuredAiOutput } from "../types";

// ── 공통 금지 표현 ──

const COMMON_BANNED_PHRASES = [
  "확실합니다",
  "반드시 ~해야",
  "100% 보장",
  "절대적으로",
  "틀림없이",
  "무조건",
  "의심의 여지 없이",
  "완벽하게 정확",
  "절대 실패하지",
  "확정적으로",
];

const EVIDENCE_DISCLAIMER =
  "이 분석은 AI가 생성한 참고 자료이며, 전문가의 판단을 대체하지 않습니다.";

// ── 태스크별 안전 정책 ──

export const SAFETY_POLICIES: Map<AiTaskType, AiSafetyPolicy> = new Map([
  [
    "comment_sentiment_analysis",
    {
      taskType: "comment_sentiment_analysis",
      safetyLevel: "medium",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: false,
      disclaimerText: "",
      maxConfidenceDisplay: 0.95,
      requireEvidenceBased: false,
    },
  ],
  [
    "comment_topic_classification",
    {
      taskType: "comment_topic_classification",
      safetyLevel: "low",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: false,
      disclaimerText: "",
      maxConfidenceDisplay: 1.0,
      requireEvidenceBased: false,
    },
  ],
  [
    "comment_risk_assessment",
    {
      taskType: "comment_risk_assessment",
      safetyLevel: "critical",
      bannedPhrases: [
        ...COMMON_BANNED_PHRASES,
        "법적 조치가 필요합니다",
        "반드시 신고해야",
        "범죄 행위입니다",
      ],
      requireDisclaimer: true,
      disclaimerText:
        "이 위험도 분석은 AI가 생성한 참고 자료이며, 실제 법적·윤리적 판단은 전문가에게 문의하세요.",
      maxConfidenceDisplay: 0.85,
      requireEvidenceBased: true,
      blockedTopics: ["개인정보 노출", "신상 특정"],
    },
  ],
  [
    "reply_suggestion_generation",
    {
      taskType: "reply_suggestion_generation",
      safetyLevel: "high",
      bannedPhrases: [
        ...COMMON_BANNED_PHRASES,
        "경쟁사보다 우월",
        "최고의 제품",
        "업계 1위",
      ],
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.85,
      requireEvidenceBased: false,
    },
  ],
  [
    "faq_extraction",
    {
      taskType: "faq_extraction",
      safetyLevel: "low",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: false,
      disclaimerText: "",
      maxConfidenceDisplay: 1.0,
      requireEvidenceBased: false,
    },
  ],
  [
    "competitor_insight_generation",
    {
      taskType: "competitor_insight_generation",
      safetyLevel: "medium",
      bannedPhrases: [
        ...COMMON_BANNED_PHRASES,
        "경쟁사가 실패할 것",
        "도산 위기",
      ],
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.95,
      requireEvidenceBased: true,
    },
  ],
  [
    "listening_insight_generation",
    {
      taskType: "listening_insight_generation",
      safetyLevel: "medium",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.95,
      requireEvidenceBased: true,
    },
  ],
  [
    "strategy_insight_generation",
    {
      taskType: "strategy_insight_generation",
      safetyLevel: "high",
      bannedPhrases: [
        ...COMMON_BANNED_PHRASES,
        "반드시 성공합니다",
        "실패할 리 없습니다",
        "보장된 성과",
      ],
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.85,
      requireEvidenceBased: true,
    },
  ],
  [
    "report_summary_generation",
    {
      taskType: "report_summary_generation",
      safetyLevel: "medium",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.95,
      requireEvidenceBased: false,
    },
  ],
  [
    "report_action_recommendation",
    {
      taskType: "report_action_recommendation",
      safetyLevel: "high",
      bannedPhrases: [
        ...COMMON_BANNED_PHRASES,
        "반드시 실행해야",
        "지금 당장",
        "유일한 방법",
      ],
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.85,
      requireEvidenceBased: true,
    },
  ],
  [
    "dashboard_explanation",
    {
      taskType: "dashboard_explanation",
      safetyLevel: "low",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: false,
      disclaimerText: "",
      maxConfidenceDisplay: 1.0,
      requireEvidenceBased: false,
    },
  ],
  [
    "user_help_answer",
    {
      taskType: "user_help_answer",
      safetyLevel: "medium",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: false,
      disclaimerText: "",
      maxConfidenceDisplay: 0.95,
      requireEvidenceBased: false,
    },
  ],
]);

/**
 * 태스크 유형에 해당하는 안전 정책 반환
 */
export function getSafetyPolicy(taskType: AiTaskType): AiSafetyPolicy {
  const policy = SAFETY_POLICIES.get(taskType);
  if (!policy) {
    // 기본 정책 (안전 우선)
    return {
      taskType,
      safetyLevel: "high",
      bannedPhrases: COMMON_BANNED_PHRASES,
      requireDisclaimer: true,
      disclaimerText: EVIDENCE_DISCLAIMER,
      maxConfidenceDisplay: 0.85,
      requireEvidenceBased: true,
    };
  }
  return policy;
}

/**
 * 구조화된 출력에 안전 필터 적용
 */
export function applySafetyFilters(
  output: StructuredAiOutput,
  policy: AiSafetyPolicy,
): StructuredAiOutput {
  const filtered = { ...output };

  // 1. 신뢰도 상한 적용
  if (filtered.confidence > policy.maxConfidenceDisplay) {
    filtered.confidence = policy.maxConfidenceDisplay;
  }

  // 2. 금지 표현 제거/대체
  filtered.summary = removeBannedPhrases(
    filtered.summary,
    policy.bannedPhrases,
  );

  if (filtered.bullets) {
    filtered.bullets = filtered.bullets.map((b) =>
      removeBannedPhrases(b, policy.bannedPhrases),
    );
  }

  if (filtered.recommendations) {
    filtered.recommendations = filtered.recommendations.map((r) =>
      removeBannedPhrases(r, policy.bannedPhrases),
    );
  }

  // 3. 면책 조항 추가
  if (policy.requireDisclaimer && policy.disclaimerText) {
    if (!filtered.summary.includes(policy.disclaimerText)) {
      filtered.summary = `${filtered.summary}\n\n${policy.disclaimerText}`;
    }
  }

  // 4. 민감 콘텐츠 감지 시 리스크 플래그 추가
  const safetyCheck = checkContentSafety(filtered.summary);
  if (!safetyCheck.safe) {
    filtered.riskFlags = [...(filtered.riskFlags ?? []), ...safetyCheck.issues];
  }

  return filtered;
}

/**
 * 텍스트 콘텐츠 안전성 검사
 */
export function checkContentSafety(text: string): {
  safe: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // 의료/법률 단정적 표현 검사
  const medicalLegalPatterns = [
    /진단합니다/,
    /처방합니다/,
    /법적으로 문제/,
    /소송을 제기/,
    /치료 방법은/,
    /복용하세요/,
    /법률 위반/,
  ];
  for (const pattern of medicalLegalPatterns) {
    if (pattern.test(text)) {
      issues.push("의료/법률 관련 단정적 표현이 감지되었습니다");
      break;
    }
  }

  // 차별적 표현 검사
  const discriminatoryPatterns = [
    /인종\s*차별/,
    /성\s*차별/,
    /장애인\s*비하/,
    /혐오\s*발언/,
    /열등한\s*인종/,
    /특정\s*성별이\s*우월/,
  ];
  for (const pattern of discriminatoryPatterns) {
    if (pattern.test(text)) {
      issues.push("차별적 표현이 감지되었습니다");
      break;
    }
  }

  // 개인정보 패턴 검사
  const personalInfoPatterns = [
    /\d{6}[-\s]?\d{7}/, // 주민등록번호
    /\d{3}[-\s]?\d{4}[-\s]?\d{4}/, // 전화번호
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // 이메일
    /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/, // 카드번호
  ];
  for (const pattern of personalInfoPatterns) {
    if (pattern.test(text)) {
      issues.push("개인정보 패턴이 감지되었습니다");
      break;
    }
  }

  return {
    safe: issues.length === 0,
    issues,
  };
}

// ── Internal helpers ──

function removeBannedPhrases(text: string, banned: string[]): string {
  let result = text;
  for (const phrase of banned) {
    // "반드시 ~해야" 같은 패턴은 단순 포함 검사
    const cleanPhrase = phrase.replace(/~/g, ".*?");
    const regex = new RegExp(cleanPhrase, "g");
    result = result.replace(regex, "");
  }
  // 연속 공백 정리
  return result.replace(/\s{2,}/g, " ").trim();
}
