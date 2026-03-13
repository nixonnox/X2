import type { PlatformUrlValidator, UrlValidationResult } from "../types";

/**
 * TikTok URL Validator
 *
 * 허용:
 *   tiktok.com/@username         → 프로필
 *
 * 거부 (안내 제공):
 *   tiktok.com/@user/video/xxx   → 영상 URL
 *   vm.tiktok.com/xxxxx          → 단축 링크 (영상)
 *   tiktok.com/t/xxxxx           → 단축 링크
 *   tiktok.com/tag/xxxxx         → 해시태그 페이지
 */
export const tiktokValidator: PlatformUrlValidator = {
  platformCode: "tiktok",

  canHandle(hostname: string): boolean {
    return hostname === "tiktok.com" || hostname === "vm.tiktok.com";
  },

  validate(url: URL): UrlValidationResult {
    const base: UrlValidationResult = {
      isValid: false,
      detectedPlatformCode: "tiktok",
      normalizedUrl: url.toString(),
      matchedRule: null,
      channelIdentifier: null,
      validationMessage: "",
      validationSeverity: "error",
      isChannelLevelUrl: false,
      suggestedMode: "url_basic",
      shouldAllowProceed: false,
    };

    const hostname = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");

    // vm.tiktok.com → 단축 링크 (보통 영상)
    if (hostname === "vm.tiktok.com") {
      return {
        ...base,
        matchedRule: "tiktok_short_link",
        validationMessage:
          "This is a TikTok short link (usually a video). Please enter the profile URL (e.g. tiktok.com/@username).",
        validationSeverity: "error",
      };
    }

    // /t/ → 단축 링크
    if (path.startsWith("/t/")) {
      return {
        ...base,
        matchedRule: "tiktok_t_short_link",
        validationMessage:
          "This is a TikTok short link. Please enter the profile URL (e.g. tiktok.com/@username).",
        validationSeverity: "error",
      };
    }

    // /tag/ → 해시태그
    if (path.startsWith("/tag/")) {
      return {
        ...base,
        matchedRule: "tiktok_tag_url",
        validationMessage:
          "This is a hashtag page, not a profile URL. Please enter tiktok.com/@username.",
        validationSeverity: "error",
      };
    }

    // /@username/video/ → 영상
    if (/^\/@[\w.]+\/video\//.test(path)) {
      return {
        ...base,
        matchedRule: "tiktok_video_url",
        validationMessage:
          "This is a video URL, not a profile URL. Please enter the user's profile URL (e.g. tiktok.com/@username).",
        validationSeverity: "error",
      };
    }

    // /@username → 프로필
    const profileMatch = path.match(/^\/@([\w.]{1,24})$/);
    if (profileMatch?.[1]) {
      const username = profileMatch[1];
      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://tiktok.com/@${username}`,
        matchedRule: "tiktok_profile",
        channelIdentifier: `@${username}`,
        validationMessage: `TikTok profile detected: @${username}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    return {
      ...base,
      matchedRule: "tiktok_unrecognized",
      validationMessage:
        "This TikTok URL doesn't look like a profile URL. Use tiktok.com/@username format.",
      validationSeverity: "warning",
      shouldAllowProceed: false,
    };
  },
};
