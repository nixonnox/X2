import type { SocialPlatform } from "@x2/types";

/**
 * 소셜 플랫폼 API 에러 기본 클래스.
 */
export class PlatformApiError extends Error {
  constructor(
    public readonly platform: SocialPlatform,
    public readonly statusCode: number,
    message: string,
  ) {
    super(`[${platform}] ${message}`);
    this.name = "PlatformApiError";
  }
}

/**
 * API 호출 한도 초과 에러.
 */
export class RateLimitError extends PlatformApiError {
  constructor(
    platform: SocialPlatform,
    public readonly retryAfterMs: number,
    message?: string,
  ) {
    super(platform, 429, message ?? "Rate limit exceeded");
    this.name = "RateLimitError";
  }
}

/**
 * 인증 실패 에러 (API 키 누락, 만료 등).
 */
export class AuthenticationError extends PlatformApiError {
  constructor(platform: SocialPlatform, message?: string) {
    super(platform, 401, message ?? "Authentication failed");
    this.name = "AuthenticationError";
  }
}

/**
 * 채널을 찾을 수 없을 때의 에러.
 */
export class ChannelNotFoundError extends PlatformApiError {
  constructor(platform: SocialPlatform, channelId: string) {
    super(platform, 404, `Channel not found: ${channelId}`);
    this.name = "ChannelNotFoundError";
  }
}
