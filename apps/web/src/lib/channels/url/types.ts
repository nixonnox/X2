import type { PlatformCode, AnalysisMode } from "../types";

// ============================================
// URL Validation Result
// ============================================

export type ValidationSeverity = "success" | "warning" | "error" | "info";

export type UrlValidationResult = {
  /** 형식상 유효 여부 */
  isValid: boolean;
  /** 감지된 플랫폼 */
  detectedPlatformCode: PlatformCode | null;
  /** 정규화된 URL */
  normalizedUrl: string;
  /** 매칭된 규칙명 */
  matchedRule: string | null;
  /** 추출된 채널 식별자 (@handle, channel ID 등) */
  channelIdentifier: string | null;
  /** UI 표시용 메시지 */
  validationMessage: string;
  /** 메시지 심각도 */
  validationSeverity: ValidationSeverity;
  /** 채널/프로필 수준 URL인지 (게시물/영상 URL이 아닌지) */
  isChannelLevelUrl: boolean;
  /** 권장 분석 모드 */
  suggestedMode: AnalysisMode;
  /** 등록 진행 허용 여부 */
  shouldAllowProceed: boolean;
};

// ============================================
// Platform URL Validator Interface
// ============================================

export type PlatformUrlValidator = {
  /** 이 validator가 담당하는 플랫폼 */
  platformCode: PlatformCode;
  /** 이 URL이 해당 플랫폼의 것인지 빠르게 판별 */
  canHandle: (hostname: string) => boolean;
  /** 상세 검증 수행 */
  validate: (url: URL) => UrlValidationResult;
};

// ============================================
// Basic Analysis Types
// ============================================

export type BasicChannelMetric = {
  label: string;
  value: string;
  description: string;
};

export type BasicChannelInsight = {
  title: string;
  description: string;
  type: "strength" | "opportunity" | "info";
};

export type BasicChannelAnalysisResult = {
  channelId: string;
  platformCode: PlatformCode;
  channelIdentifier: string;
  normalizedUrl: string;
  analysisMode: AnalysisMode;
  profile: {
    name: string;
    audienceLabel: string;
    audienceCount: number;
    totalContents: number;
    totalViewsOrReach: number;
    engagementRate: number;
    growthRate30d: number;
    uploads30d: number;
  };
  contentDistribution: { type: string; count: number }[];
  insights: BasicChannelInsight[];
};
