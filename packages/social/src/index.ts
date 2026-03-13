// Provider & types
export type { SocialProvider, AnalyticsData, FetchOptions } from "./types";

// Platform providers
export { YouTubeProvider } from "./youtube";
export { InstagramProvider } from "./instagram";
export { TikTokProvider } from "./tiktok";
export { XProvider } from "./x";

// Errors
export {
  PlatformApiError,
  RateLimitError,
  AuthenticationError,
  ChannelNotFoundError,
} from "./errors";

// Rate limiter
export { RateLimiter, getRateLimiter } from "./rate-limiter";

// Factory
export { createProvider } from "./provider-factory";
