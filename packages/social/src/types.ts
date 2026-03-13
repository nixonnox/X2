/**
 * 소셜 미디어 Provider 공통 인터페이스.
 *
 * 모든 플랫폼(YouTube, Instagram, TikTok, X)은 이 인터페이스를 구현한다.
 * 새 플랫폼을 추가할 때 이 인터페이스에 맞춰 구현체만 추가하면 된다.
 */

import type {
  ChannelInfo,
  ContentInfo,
  DateRange,
  SocialPlatform,
} from "@x2/types";

/** 콘텐츠 목록 조회 옵션 */
export type FetchOptions = {
  limit?: number;
  cursor?: string;
};

/** 채널 분석 지표 */
export type AnalyticsData = {
  period: DateRange;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  subscriberChange: number;
  topContents: ContentInfo[];
};

/** 모든 소셜 플랫폼 Provider가 구현해야 하는 인터페이스 */
export interface SocialProvider {
  /** 이 Provider가 지원하는 플랫폼 */
  readonly platform: SocialPlatform;

  /** URL에서 채널 ID를 추출한다 */
  parseChannelUrl(url: string): string | null;

  /** 채널 기본 정보를 가져온다 */
  getChannelInfo(channelId: string): Promise<ChannelInfo>;

  /** 채널의 콘텐츠 목록을 가져온다 */
  getContents(
    channelId: string,
    options?: FetchOptions,
  ): Promise<ContentInfo[]>;

  /** 채널의 분석 지표를 가져온다 */
  getAnalytics(channelId: string, period: DateRange): Promise<AnalyticsData>;
}
