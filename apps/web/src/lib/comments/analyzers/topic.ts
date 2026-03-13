import type { TopicLabel } from "../types";

// ============================================
// Rule-based Topic Classifier (mock)
// ============================================

type TopicRule = {
  label: TopicLabel;
  keywords: string[];
};

const TOPIC_RULES: TopicRule[] = [
  {
    label: "price",
    keywords: [
      "가격",
      "비싸",
      "할인",
      "쿠폰",
      "무료",
      "유료",
      "구독료",
      "price",
      "expensive",
      "discount",
      "cost",
      "free",
      "paid",
      "subscription",
    ],
  },
  {
    label: "quality",
    keywords: [
      "퀄리티",
      "화질",
      "음질",
      "품질",
      "영상",
      "콘텐츠",
      "quality",
      "resolution",
      "production",
      "content",
    ],
  },
  {
    label: "design",
    keywords: [
      "디자인",
      "UI",
      "UX",
      "레이아웃",
      "색상",
      "폰트",
      "design",
      "layout",
      "color",
      "font",
      "visual",
    ],
  },
  {
    label: "delivery",
    keywords: [
      "배송",
      "택배",
      "도착",
      "배달",
      "shipping",
      "delivery",
      "arrived",
      "package",
    ],
  },
  {
    label: "schedule",
    keywords: [
      "일정",
      "언제",
      "시간",
      "날짜",
      "공연",
      "라이브",
      "schedule",
      "when",
      "time",
      "date",
      "live",
      "event",
    ],
  },
  {
    label: "service",
    keywords: [
      "서비스",
      "대응",
      "고객",
      "응대",
      "service",
      "customer",
      "support",
      "response",
    ],
  },
  {
    label: "performance",
    keywords: [
      "성능",
      "속도",
      "버그",
      "오류",
      "느려",
      "performance",
      "speed",
      "bug",
      "error",
      "slow",
      "crash",
    ],
  },
  {
    label: "inquiry",
    keywords: [
      "문의",
      "질문",
      "어떻게",
      "방법",
      "알려",
      "궁금",
      "question",
      "how",
      "what",
      "where",
      "can I",
      "help",
      "please",
    ],
  },
  {
    label: "support",
    keywords: [
      "지원",
      "도움",
      "해결",
      "환불",
      "취소",
      "support",
      "help",
      "fix",
      "refund",
      "cancel",
      "issue",
    ],
  },
  {
    label: "spam",
    keywords: [
      "광고",
      "홍보",
      "클릭",
      "링크",
      "돈벌",
      "spam",
      "ad",
      "click",
      "link",
      "earn",
      "free money",
      "check out",
    ],
  },
];

export type TopicResult = {
  label: TopicLabel;
  confidence: number; // 0 to 1
};

/**
 * Rule-based topic classification.
 * Replaceable with actual NLP/LLM service.
 */
export function classifyTopic(text: string): TopicResult {
  const lower = text.toLowerCase();

  let bestLabel: TopicLabel = "other";
  let bestScore = 0;

  for (const rule of TOPIC_RULES) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) hits++;
    }
    if (hits > bestScore) {
      bestScore = hits;
      bestLabel = rule.label;
    }
  }

  const confidence =
    bestScore > 0 ? Math.min(0.4 + bestScore * 0.15, 0.95) : 0.1;
  return { label: bestLabel, confidence };
}

// ---- Topic Display Labels ----

const TOPIC_DISPLAY_LABELS: Record<TopicLabel, string> = {
  price: "Price",
  quality: "Quality",
  design: "Design",
  service: "Service",
  delivery: "Delivery",
  schedule: "Schedule",
  performance: "Performance",
  inquiry: "Inquiry",
  support: "Support",
  spam: "Spam",
  other: "Other",
};

export function getTopicDisplayLabel(topic: TopicLabel): string {
  return TOPIC_DISPLAY_LABELS[topic];
}
