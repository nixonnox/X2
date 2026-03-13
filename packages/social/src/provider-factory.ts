import type { SocialPlatform } from "@x2/types";
import type { SocialProvider } from "./types";
import { YouTubeProvider } from "./youtube";
import { InstagramProvider } from "./instagram";
import { TikTokProvider } from "./tiktok";
import { XProvider } from "./x";

/**
 * 플랫폼에 맞는 SocialProvider 인스턴스를 생성한다.
 */
export function createProvider(platform: SocialPlatform): SocialProvider {
  switch (platform) {
    case "youtube":
      return new YouTubeProvider();
    case "instagram":
      return new InstagramProvider();
    case "tiktok":
      return new TikTokProvider();
    case "x":
      return new XProvider();
    default: {
      const _exhaustive: never = platform;
      throw new Error(`Unknown platform: ${_exhaustive}`);
    }
  }
}
