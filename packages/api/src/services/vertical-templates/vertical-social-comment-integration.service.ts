/**
 * VerticalSocialCommentIntegrationService
 *
 * 소셜/댓글 분석 결과를 업종별로 해석하여 vertical 파이프라인에 주입.
 * "뷰티 업종에서 부정 감성의 주제가 '트러블'이면 → 리스크 강조"
 * "엔터 업종에서 소셜 버즈가 급증하면 → 타이밍 액션 강조"
 *
 * 하는 일:
 * 1. 감성 분석 결과 → 업종별 해석 (BEAUTY: 성분 이슈, FINANCE: 신뢰 이슈 등)
 * 2. 댓글 토픽 → 업종 topicTaxonomy 매핑
 * 3. 소셜 멘션 → 업종별 evidence/insight 변환
 * 4. 리스크 시그널 → 업종별 경고 생성
 */

import type { IndustryType } from "./types";

// ─── Input Types (CommentAnalysis/Social 호환) ──────────────────

export type SocialSentimentInput = {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  topNegativeTopics: string[];
  topPositiveTopics: string[];
};

export type CommentTopicInput = {
  topic: string;
  count: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  isQuestion: boolean;
  isRisk: boolean;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type SocialMentionInput = {
  platform: string;
  text: string;
  sentiment: string;
  topics: string[];
  engagementRate: number;
  publishedAt: string;
};

export type SocialCommentData = {
  sentiment?: SocialSentimentInput;
  commentTopics?: CommentTopicInput[];
  recentMentions?: SocialMentionInput[];
};

// ─── Output Types ───────────────────────────────────────────────

export type SocialEvidenceItem = {
  category: string;
  label: string;
  summary: string;
  dataSourceType:
    | "social_sentiment"
    | "comment_topic"
    | "social_mention"
    | "social_risk";
  data: unknown;
};

export type SocialInsight = {
  type: string;
  title: string;
  description: string;
  confidence: number;
  source: "social" | "comment";
};

export type SocialWarning = {
  level: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  source: string;
};

export type VerticalSocialIntegrationResult = {
  industryType: IndustryType;
  evidenceItems: SocialEvidenceItem[];
  insights: SocialInsight[];
  warnings: SocialWarning[];
  hasSocialData: boolean;
  socialDataQuality: "HIGH" | "MEDIUM" | "LOW" | "NONE";
};

// ─── 업종별 소셜 해석 규칙 ──────────────────────────────────────

type IndustryRules = {
  /** 부정 감성에서 특히 주의할 토픽 키워드 */
  criticalNegativeTopics: string[];
  /** 긍정 감성에서 강조할 토픽 키워드 */
  highlightPositiveTopics: string[];
  /** 소셜 인사이트 유형 매핑 */
  insightTypeMap: Record<string, string>;
  /** 리스크 에스컬레이션 키워드 (이 키워드가 있으면 리스크 레벨 상향) */
  riskEscalationKeywords: string[];
  /** 업종별 감성 해석 프레이밍 */
  sentimentFraming: {
    positiveTemplate: string;
    negativeTemplate: string;
    neutralTemplate: string;
  };
};

const INDUSTRY_RULES: Record<IndustryType, IndustryRules> = {
  BEAUTY: {
    criticalNegativeTopics: [
      "트러블",
      "자극",
      "부작용",
      "알레르기",
      "발진",
      "피부손상",
    ],
    highlightPositiveTopics: [
      "효과",
      "보습",
      "발림성",
      "흡수",
      "사용감",
      "가성비",
    ],
    insightTypeMap: {
      positive_trend: "INGREDIENT_INTEREST",
      negative_trend: "SKIN_CONCERN",
      question: "COMPARISON_INTENT",
      risk: "REVIEW_PATTERN",
    },
    riskEscalationKeywords: [
      "부작용",
      "알레르기",
      "소비자원",
      "리콜",
      "유해성분",
    ],
    sentimentFraming: {
      positiveTemplate:
        "소셜에서 {topic} 관련 긍정 반응이 활발합니다. 성분/효능 콘텐츠 강화 기회입니다.",
      negativeTemplate:
        "소셜에서 {topic} 관련 부정 반응이 감지되었습니다. 성분 안전성 커뮤니케이션이 필요합니다.",
      neutralTemplate: "소셜에서 {topic}에 대한 탐색적 대화가 진행 중입니다.",
    },
  },
  FNB: {
    criticalNegativeTopics: [
      "위생",
      "식중독",
      "이물질",
      "벌레",
      "곰팡이",
      "식품안전",
    ],
    highlightPositiveTopics: [
      "맛",
      "가성비",
      "분위기",
      "서비스",
      "신메뉴",
      "재방문",
    ],
    insightTypeMap: {
      positive_trend: "MENU_INTEREST",
      negative_trend: "VISIT_INTENT",
      question: "LOCATION_CONTEXT",
      risk: "SEASONAL_PATTERN",
    },
    riskEscalationKeywords: ["식중독", "위생", "식품안전", "벌점", "영업정지"],
    sentimentFraming: {
      positiveTemplate:
        "소셜에서 {topic} 관련 긍정 후기가 증가하고 있습니다. 메뉴/프로모션 전략에 활용하세요.",
      negativeTemplate:
        "소셜에서 {topic} 관련 부정 의견이 감지되었습니다. 매장 운영/메뉴 개선 검토가 필요합니다.",
      neutralTemplate: "소셜에서 {topic}에 대한 관심이 증가하고 있습니다.",
    },
  },
  FINANCE: {
    criticalNegativeTopics: [
      "사기",
      "피해",
      "손실",
      "불완전판매",
      "연체",
      "채무",
    ],
    highlightPositiveTopics: ["수익", "혜택", "우대", "편리", "간편", "비대면"],
    insightTypeMap: {
      positive_trend: "CONDITION_ANALYSIS",
      negative_trend: "RISK_AWARENESS",
      question: "PROCEDURE_INTEREST",
      risk: "TRUST_SIGNAL",
    },
    riskEscalationKeywords: [
      "사기",
      "불완전판매",
      "금감원",
      "소비자보호",
      "민원",
      "분쟁",
    ],
    sentimentFraming: {
      positiveTemplate:
        "소셜에서 {topic} 관련 긍정 평가가 확인되었습니다. 신뢰 기반 콘텐츠에 활용 가능합니다.",
      negativeTemplate:
        "소셜에서 {topic} 관련 부정 의견이 감지되었습니다. 신뢰도/투명성 강화 대응이 필요합니다.",
      neutralTemplate: "소셜에서 {topic}에 대한 정보 탐색이 활발합니다.",
    },
  },
  ENTERTAINMENT: {
    criticalNegativeTopics: [
      "논란",
      "비매너",
      "취소",
      "환불",
      "사재기",
      "조작",
    ],
    highlightPositiveTopics: [
      "대박",
      "역주행",
      "화제",
      "1위",
      "신기록",
      "레전드",
    ],
    insightTypeMap: {
      positive_trend: "BUZZ_TIMING",
      negative_trend: "FAN_REACTION",
      question: "CONTENT_SPREAD",
      risk: "ENGAGEMENT_PATTERN",
    },
    riskEscalationKeywords: ["논란", "해체", "탈퇴", "고소", "폭로", "학폭"],
    sentimentFraming: {
      positiveTemplate:
        "소셜에서 {topic} 관련 팬 반응이 폭발적입니다. 타이밍 대응 콘텐츠를 즉시 검토하세요.",
      negativeTemplate:
        "소셜에서 {topic} 관련 부정 반응이 확산 중입니다. 위기 대응 커뮤니케이션이 필요합니다.",
      neutralTemplate:
        "소셜에서 {topic}에 대한 관심이 증가하고 있습니다. 확산 추이를 모니터링하세요.",
    },
  },
};

// ─── Service ─────────────────────────────────────────────────────

export class VerticalSocialCommentIntegrationService {
  /**
   * 소셜/댓글 데이터를 업종별로 해석하여 vertical 파이프라인 입력으로 변환
   */
  integrate(
    socialData: SocialCommentData,
    industryType: IndustryType,
  ): VerticalSocialIntegrationResult {
    const rules = INDUSTRY_RULES[industryType];
    const evidenceItems: SocialEvidenceItem[] = [];
    const insights: SocialInsight[] = [];
    const warnings: SocialWarning[] = [];

    const hasSocialData = !!(
      socialData.sentiment ||
      socialData.commentTopics?.length ||
      socialData.recentMentions?.length
    );

    if (!hasSocialData) {
      return {
        industryType,
        evidenceItems: [],
        insights: [],
        warnings: [],
        hasSocialData: false,
        socialDataQuality: "NONE",
      };
    }

    // 1. 감성 분석 → evidence + insight
    if (socialData.sentiment) {
      const sentResult = this.processSentiment(
        socialData.sentiment,
        industryType,
        rules,
      );
      evidenceItems.push(...sentResult.evidence);
      insights.push(...sentResult.insights);
      warnings.push(...sentResult.warnings);
    }

    // 2. 댓글 토픽 → evidence + insight + warning
    if (socialData.commentTopics?.length) {
      const topicResult = this.processCommentTopics(
        socialData.commentTopics,
        industryType,
        rules,
      );
      evidenceItems.push(...topicResult.evidence);
      insights.push(...topicResult.insights);
      warnings.push(...topicResult.warnings);
    }

    // 3. 소셜 멘션 → evidence
    if (socialData.recentMentions?.length) {
      const mentionResult = this.processMentions(
        socialData.recentMentions,
        industryType,
        rules,
      );
      evidenceItems.push(...mentionResult.evidence);
      insights.push(...mentionResult.insights);
    }

    // 데이터 품질 판정
    const socialDataQuality = this.assessQuality(socialData);

    return {
      industryType,
      evidenceItems,
      insights,
      warnings,
      hasSocialData: true,
      socialDataQuality,
    };
  }

  private processSentiment(
    sentiment: SocialSentimentInput,
    industryType: IndustryType,
    rules: IndustryRules,
  ): {
    evidence: SocialEvidenceItem[];
    insights: SocialInsight[];
    warnings: SocialWarning[];
  } {
    const evidence: SocialEvidenceItem[] = [];
    const insights: SocialInsight[] = [];
    const warnings: SocialWarning[] = [];

    const negativeRatio =
      sentiment.total > 0 ? sentiment.negative / sentiment.total : 0;
    const positiveRatio =
      sentiment.total > 0 ? sentiment.positive / sentiment.total : 0;

    // 감성 분포 evidence
    evidence.push({
      category: "social_sentiment_distribution",
      label: "소셜 감성 분포",
      summary: `총 ${sentiment.total}건 — 긍정 ${Math.round(positiveRatio * 100)}% / 중립 ${Math.round((1 - positiveRatio - negativeRatio) * 100)}% / 부정 ${Math.round(negativeRatio * 100)}%`,
      dataSourceType: "social_sentiment",
      data: sentiment,
    });

    // 부정 비율 높으면 경고
    if (negativeRatio > 0.3) {
      warnings.push({
        level: "WARNING",
        message: `소셜 부정 감성 비율이 ${Math.round(negativeRatio * 100)}%로 높습니다.`,
        source: "social_sentiment",
      });

      // 업종별 크리티컬 토픽과 교차 확인
      const criticalMatches = sentiment.topNegativeTopics.filter((t) =>
        rules.criticalNegativeTopics.some(
          (ct) => t.includes(ct) || ct.includes(t),
        ),
      );
      if (criticalMatches.length > 0) {
        warnings.push({
          level: "CRITICAL",
          message: `업종 리스크 토픽 감지: ${criticalMatches.join(", ")}`,
          source: "social_sentiment",
        });
      }
    }

    // 긍정 트렌드 인사이트
    if (positiveRatio > 0.5 && sentiment.topPositiveTopics.length > 0) {
      const topic = sentiment.topPositiveTopics[0]!;
      insights.push({
        type: rules.insightTypeMap.positive_trend ?? "TREND_CHANGE",
        title: `소셜 긍정 트렌드: ${topic}`,
        description: rules.sentimentFraming.positiveTemplate.replace(
          "{topic}",
          topic,
        ),
        confidence: Math.min(0.9, positiveRatio),
        source: "social",
      });
    }

    // 부정 트렌드 인사이트
    if (negativeRatio > 0.2 && sentiment.topNegativeTopics.length > 0) {
      const topic = sentiment.topNegativeTopics[0]!;
      insights.push({
        type: rules.insightTypeMap.negative_trend ?? "TREND_CHANGE",
        title: `소셜 부정 신호: ${topic}`,
        description: rules.sentimentFraming.negativeTemplate.replace(
          "{topic}",
          topic,
        ),
        confidence: Math.min(0.85, negativeRatio * 2),
        source: "social",
      });
    }

    return { evidence, insights, warnings };
  }

  private processCommentTopics(
    topics: CommentTopicInput[],
    industryType: IndustryType,
    rules: IndustryRules,
  ): {
    evidence: SocialEvidenceItem[];
    insights: SocialInsight[];
    warnings: SocialWarning[];
  } {
    const evidence: SocialEvidenceItem[] = [];
    const insights: SocialInsight[] = [];
    const warnings: SocialWarning[] = [];

    // 상위 토픽 evidence
    const topTopics = [...topics].sort((a, b) => b.count - a.count).slice(0, 5);
    evidence.push({
      category: "comment_topic_distribution",
      label: "댓글 토픽 분포",
      summary: topTopics
        .map((t) => `${t.topic}(${t.count}건, ${t.sentiment})`)
        .join(", "),
      dataSourceType: "comment_topic",
      data: topTopics,
    });

    // 질문형 토픽 → FAQ 인사이트
    const questions = topics.filter((t) => t.isQuestion);
    if (questions.length > 0) {
      insights.push({
        type: rules.insightTypeMap.question ?? "KEY_FINDING",
        title: `댓글 질문 토픽 ${questions.length}건`,
        description: `고객이 자주 묻는 주제: ${questions.map((q) => q.topic).join(", ")}`,
        confidence: 0.7,
        source: "comment",
      });
    }

    // 리스크 토픽
    const riskTopics = topics.filter((t) => t.isRisk);
    for (const risk of riskTopics) {
      const isEscalated = rules.riskEscalationKeywords.some(
        (kw) => risk.topic.includes(kw) || kw.includes(risk.topic),
      );

      warnings.push({
        level: isEscalated ? "CRITICAL" : "WARNING",
        message: `리스크 토픽 감지: "${risk.topic}" (${risk.count}건, ${risk.riskLevel ?? "MEDIUM"})`,
        source: "comment_risk",
      });
    }

    return { evidence, insights, warnings };
  }

  private processMentions(
    mentions: SocialMentionInput[],
    industryType: IndustryType,
    rules: IndustryRules,
  ): { evidence: SocialEvidenceItem[]; insights: SocialInsight[] } {
    const evidence: SocialEvidenceItem[] = [];
    const insights: SocialInsight[] = [];

    // 플랫폼별 분포
    const platformCounts: Record<string, number> = {};
    for (const m of mentions) {
      platformCounts[m.platform] = (platformCounts[m.platform] ?? 0) + 1;
    }

    evidence.push({
      category: "social_mention_distribution",
      label: "소셜 멘션 플랫폼 분포",
      summary: Object.entries(platformCounts)
        .map(([p, c]) => `${p}: ${c}건`)
        .join(", "),
      dataSourceType: "social_mention",
      data: { platformCounts, totalMentions: mentions.length },
    });

    // 높은 engagement 멘션 → 인사이트
    const highEngagement = mentions.filter((m) => m.engagementRate > 0.05);
    if (highEngagement.length > 0) {
      const topMention = highEngagement.sort(
        (a, b) => b.engagementRate - a.engagementRate,
      )[0]!;
      const topic = topMention.topics[0] ?? "관련 주제";
      insights.push({
        type: rules.insightTypeMap.positive_trend ?? "TREND_CHANGE",
        title: `고참여 소셜 멘션 감지`,
        description: `${topMention.platform}에서 "${topic}" 관련 높은 참여율(${Math.round(topMention.engagementRate * 100)}%) 멘션이 발견되었습니다.`,
        confidence: 0.75,
        source: "social",
      });
    }

    return { evidence, insights };
  }

  private assessQuality(data: SocialCommentData): "HIGH" | "MEDIUM" | "LOW" {
    let score = 0;
    if (data.sentiment && data.sentiment.total >= 50) score += 2;
    else if (data.sentiment && data.sentiment.total >= 10) score += 1;

    if (data.commentTopics && data.commentTopics.length >= 5) score += 2;
    else if (data.commentTopics && data.commentTopics.length >= 2) score += 1;

    if (data.recentMentions && data.recentMentions.length >= 20) score += 2;
    else if (data.recentMentions && data.recentMentions.length >= 5) score += 1;

    if (score >= 5) return "HIGH";
    if (score >= 2) return "MEDIUM";
    return "LOW";
  }
}
