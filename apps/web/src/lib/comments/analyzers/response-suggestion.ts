import type {
  SentimentLabel,
  TopicLabel,
  RiskLevel,
  CommentReplySuggestions,
  SuggestionTone,
} from "../types";

// ============================================
// Rule-based Response Suggestion Generator (mock)
// ============================================

type SuggestionTemplate = {
  tone: SuggestionTone;
  text: string;
  recommended: boolean;
};

type TemplateSet = SuggestionTemplate[];

const TEMPLATES: Record<string, TemplateSet> = {
  positive_default: [
    {
      tone: "friendly",
      text: "감사합니다! 앞으로도 좋은 콘텐츠로 찾아뵐게요 😊",
      recommended: true,
    },
    {
      tone: "formal",
      text: "소중한 응원에 감사드립니다. 더 나은 콘텐츠를 제공할 수 있도록 노력하겠습니다.",
      recommended: false,
    },
    {
      tone: "brand-safe",
      text: "Thank you for your kind words! We appreciate your support.",
      recommended: false,
    },
  ],
  negative_default: [
    {
      tone: "formal",
      text: "불편을 드려 죄송합니다. 해당 사항을 확인하고 개선하도록 하겠습니다. 추가 문의사항이 있으시면 DM으로 알려주세요.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "의견 감사합니다! 말씀해주신 부분 꼭 개선해볼게요. 다음에는 더 좋은 경험을 드릴 수 있도록 노력하겠습니다.",
      recommended: false,
    },
    {
      tone: "brand-safe",
      text: "We're sorry for the inconvenience. We take your feedback seriously and will work to improve.",
      recommended: false,
    },
  ],
  inquiry_default: [
    {
      tone: "formal",
      text: "문의해주셔서 감사합니다. 해당 내용에 대해 확인 후 빠르게 안내드리겠습니다.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "좋은 질문이에요! 자세한 내용은 DM이나 공식 채널을 통해 안내해드릴게요 😊",
      recommended: false,
    },
    {
      tone: "brand-safe",
      text: "Thank you for your inquiry. We'll get back to you with the information shortly.",
      recommended: false,
    },
  ],
  price_inquiry: [
    {
      tone: "formal",
      text: "가격 관련 문의 감사합니다. 현재 진행 중인 프로모션은 공식 채널에서 확인하실 수 있습니다.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "가격 정보가 궁금하시군요! 프로필 링크에서 최신 가격을 확인해보세요 👉",
      recommended: false,
    },
  ],
  schedule_inquiry: [
    {
      tone: "formal",
      text: "일정 관련 문의 감사합니다. 정확한 일정은 공식 공지를 통해 안내드릴 예정입니다.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "일정이 궁금하시군요! 곧 공지될 예정이니 알림 설정 해주세요 🔔",
      recommended: false,
    },
  ],
  delivery_complaint: [
    {
      tone: "formal",
      text: "배송 관련 불편을 드려 정말 죄송합니다. DM으로 주문번호를 알려주시면 빠르게 확인해드리겠습니다.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "배송이 늦어져서 불편하셨죠 😥 DM으로 주문 정보 보내주시면 바로 확인해볼게요!",
      recommended: false,
    },
  ],
  support_issue: [
    {
      tone: "formal",
      text: "이용에 불편을 드려 죄송합니다. 고객 지원팀에서 확인 후 빠르게 해결하겠습니다.",
      recommended: true,
    },
    {
      tone: "friendly",
      text: "불편을 겪고 계시군요 😔 DM이나 고객센터로 상세 내용 전달해주시면 빠르게 도와드릴게요!",
      recommended: false,
    },
  ],
  high_risk: [
    {
      tone: "formal",
      text: "소중한 의견 감사합니다. 해당 내용을 내부적으로 긴급 검토하겠습니다. 추가 도움이 필요하시면 고객 지원 채널을 통해 연락 주시기 바랍니다.",
      recommended: true,
    },
    {
      tone: "brand-safe",
      text: "We take your concern very seriously. Our team is reviewing this matter and we will follow up shortly.",
      recommended: false,
    },
  ],
  spam: [
    {
      tone: "brand-safe",
      text: "[내부 메모: 스팸 댓글로 분류됨. 숨김 또는 신고 처리 검토 필요.]",
      recommended: true,
    },
  ],
};

/**
 * Generate reply suggestions based on comment analysis.
 * Replaceable with actual LLM service.
 */
export function generateReplySuggestions(
  commentId: string,
  sentimentLabel: SentimentLabel,
  topicLabel: TopicLabel,
  riskLevel: RiskLevel,
): CommentReplySuggestions {
  let templateKey: string;

  // Pick template based on priority
  if (topicLabel === "spam") {
    templateKey = "spam";
  } else if (riskLevel === "high") {
    templateKey = "high_risk";
  } else if (topicLabel === "price" && sentimentLabel !== "positive") {
    templateKey = "price_inquiry";
  } else if (topicLabel === "schedule") {
    templateKey = "schedule_inquiry";
  } else if (topicLabel === "delivery" && sentimentLabel === "negative") {
    templateKey = "delivery_complaint";
  } else if (topicLabel === "support" || topicLabel === "service") {
    templateKey = "support_issue";
  } else if (topicLabel === "inquiry") {
    templateKey = "inquiry_default";
  } else if (sentimentLabel === "positive") {
    templateKey = "positive_default";
  } else if (sentimentLabel === "negative") {
    templateKey = "negative_default";
  } else {
    templateKey = "inquiry_default";
  }

  const templates = TEMPLATES[templateKey] ?? TEMPLATES.inquiry_default!;

  return {
    commentId,
    suggestions: templates.map((t, i) => ({
      id: `${commentId}-sug-${i}`,
      text: t.text,
      tone: t.tone,
      recommended: t.recommended,
    })),
  };
}
