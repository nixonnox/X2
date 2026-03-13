// ============================================
// 소셜 플랫폼 관련 타입
// ============================================

/** 지원하는 소셜 플랫폼 */
export type SocialPlatform = "youtube" | "instagram" | "tiktok" | "x";

/** 채널 연동 방식: basic = URL 기반 공개 데이터, connected = OAuth API 연동 */
export type ConnectionType = "basic" | "connected";

/** 채널 기본 정보 */
export type ChannelInfo = {
  platform: SocialPlatform;
  platformChannelId: string;
  name: string;
  url: string;
  thumbnailUrl: string | null;
  subscriberCount: number | null;
  contentCount: number | null;
};

/** 콘텐츠(영상/게시물) 기본 정보 */
export type ContentInfo = {
  platform: SocialPlatform;
  platformContentId: string;
  title: string;
  description: string | null;
  publishedAt: Date;
  thumbnailUrl: string | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
};

/** 감성 분석 결과 */
export type Sentiment = "positive" | "negative" | "neutral";
