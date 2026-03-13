import type { PlatformUrlValidator, UrlValidationResult } from "../types";

/**
 * Instagram URL Validator
 *
 * 허용:
 *   instagram.com/username       → 프로필
 *   instagram.com/username/      → 프로필 (trailing slash)
 *
 * 거부 (안내 제공):
 *   instagram.com/p/xxxxx        → 게시물 URL
 *   instagram.com/reel/xxxxx     → 릴스 URL
 *   instagram.com/stories/xxx    → 스토리 URL
 *   instagram.com/explore/       → 탐색 페이지
 *
 * 참고:
 *   username은 영문/숫자/밑줄/마침표만 허용, 최대 30자
 */
export const instagramValidator: PlatformUrlValidator = {
  platformCode: "instagram",

  canHandle(hostname: string): boolean {
    return hostname === "instagram.com";
  },

  validate(url: URL): UrlValidationResult {
    const base: UrlValidationResult = {
      isValid: false,
      detectedPlatformCode: "instagram",
      normalizedUrl: url.toString(),
      matchedRule: null,
      channelIdentifier: null,
      validationMessage: "",
      validationSeverity: "error",
      isChannelLevelUrl: false,
      suggestedMode: "url_basic",
      shouldAllowProceed: false,
    };

    const path = url.pathname.replace(/\/$/, "");

    // /p/ → 게시물
    if (path.startsWith("/p/")) {
      return {
        ...base,
        matchedRule: "instagram_post_url",
        validationMessage:
          "This is a post URL, not a profile URL. Please enter the Instagram profile URL (e.g. instagram.com/username).",
        validationSeverity: "error",
      };
    }

    // /reel/ → 릴스
    if (path.startsWith("/reel/")) {
      return {
        ...base,
        matchedRule: "instagram_reel_url",
        validationMessage:
          "This is a Reel URL, not a profile URL. Please enter the Instagram profile URL.",
        validationSeverity: "error",
      };
    }

    // /stories/ → 스토리
    if (path.startsWith("/stories/")) {
      return {
        ...base,
        matchedRule: "instagram_story_url",
        validationMessage:
          "This is a Story URL, not a profile URL. Please enter the Instagram profile URL.",
        validationSeverity: "error",
      };
    }

    // /explore/ → 탐색
    if (path.startsWith("/explore")) {
      return {
        ...base,
        matchedRule: "instagram_explore_url",
        validationMessage:
          "This is the Explore page, not a profile URL. Please enter a specific user's profile URL.",
        validationSeverity: "error",
      };
    }

    // /username → 프로필 (영문/숫자/밑줄/마침표, 1~30자)
    const profileMatch = path.match(/^\/([\w.]{1,30})$/);
    if (profileMatch?.[1]) {
      const username = profileMatch[1];

      // 예약어 제외
      const reserved = [
        "accounts",
        "about",
        "legal",
        "developer",
        "api",
        "privacy",
        "terms",
      ];
      if (reserved.includes(username.toLowerCase())) {
        return {
          ...base,
          matchedRule: "instagram_reserved_path",
          validationMessage:
            "This looks like an Instagram system page, not a user profile.",
          validationSeverity: "error",
        };
      }

      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://instagram.com/${username}`,
        matchedRule: "instagram_profile",
        channelIdentifier: username,
        validationMessage: `Instagram profile detected: @${username}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    return {
      ...base,
      matchedRule: "instagram_unrecognized",
      validationMessage:
        "This Instagram URL doesn't look like a profile URL. Use instagram.com/username format.",
      validationSeverity: "warning",
      shouldAllowProceed: false,
    };
  },
};
