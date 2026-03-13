import type { PlatformUrlValidator, UrlValidationResult } from "../types";

/**
 * X (Twitter) URL Validator
 *
 * 허용:
 *   x.com/username               → 프로필
 *   twitter.com/username          → 프로필 (정규화 시 x.com으로 변환)
 *
 * 거부 (안내 제공):
 *   x.com/username/status/xxxxx  → 게시글 URL
 *   x.com/i/lists/xxxxx          → 리스트
 *   x.com/search?...             → 검색
 *   x.com/hashtag/xxxxx          → 해시태그
 *   x.com/home, x.com/explore    → 시스템 페이지
 */
export const xValidator: PlatformUrlValidator = {
  platformCode: "x",

  canHandle(hostname: string): boolean {
    return hostname === "x.com" || hostname === "twitter.com";
  },

  validate(url: URL): UrlValidationResult {
    const base: UrlValidationResult = {
      isValid: false,
      detectedPlatformCode: "x",
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

    // /username/status/ → 게시글
    if (/^\/[\w]+\/status\/\d+/.test(path)) {
      return {
        ...base,
        matchedRule: "x_status_url",
        validationMessage:
          "This is a post/tweet URL, not a profile URL. Please enter the user's profile URL (e.g. x.com/username).",
        validationSeverity: "error",
      };
    }

    // /i/ → 내부 페이지 (lists, bookmarks 등)
    if (path.startsWith("/i/")) {
      return {
        ...base,
        matchedRule: "x_internal_url",
        validationMessage:
          "This is an internal X page, not a profile URL. Please enter x.com/username.",
        validationSeverity: "error",
      };
    }

    // /search → 검색
    if (path.startsWith("/search")) {
      return {
        ...base,
        matchedRule: "x_search_url",
        validationMessage: "This is a search page, not a profile URL.",
        validationSeverity: "error",
      };
    }

    // /hashtag/ → 해시태그
    if (path.startsWith("/hashtag/")) {
      return {
        ...base,
        matchedRule: "x_hashtag_url",
        validationMessage: "This is a hashtag page, not a profile URL.",
        validationSeverity: "error",
      };
    }

    // /username → 프로필 (1~15자, 영문/숫자/밑줄)
    const profileMatch = path.match(/^\/([\w]{1,15})$/);
    if (profileMatch?.[1]) {
      const username = profileMatch[1];

      // X 예약어
      const reserved = [
        "home",
        "explore",
        "notifications",
        "messages",
        "settings",
        "login",
        "signup",
        "compose",
        "intent",
        "tos",
        "privacy",
      ];
      if (reserved.includes(username.toLowerCase())) {
        return {
          ...base,
          matchedRule: "x_reserved_path",
          validationMessage: "This is an X system page, not a user profile.",
          validationSeverity: "error",
        };
      }

      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://x.com/${username}`,
        matchedRule: "x_profile",
        channelIdentifier: `@${username}`,
        validationMessage: `X profile detected: @${username}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    return {
      ...base,
      matchedRule: "x_unrecognized",
      validationMessage:
        "This X URL doesn't look like a profile URL. Use x.com/username format.",
      validationSeverity: "warning",
      shouldAllowProceed: false,
    };
  },
};
