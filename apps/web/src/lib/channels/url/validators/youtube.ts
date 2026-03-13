import type { PlatformUrlValidator, UrlValidationResult } from "../types";

/**
 * YouTube URL Validator
 *
 * 허용:
 *   youtube.com/@handle          → 채널 (handle)
 *   youtube.com/channel/UCxxxxx  → 채널 (channel ID)
 *   youtube.com/c/customname     → 채널 (custom URL)
 *   youtube.com/user/username    → 채널 (legacy user URL)
 *
 * 거부 (안내 제공):
 *   youtube.com/watch?v=xxxxx    → 영상 URL (채널 아님)
 *   youtube.com/shorts/xxxxx     → 쇼츠 URL (채널 아님)
 *   youtube.com/playlist?...     → 재생목록 (채널 아님)
 *   youtu.be/xxxxx               → 단축 영상 URL (채널 아님)
 */
export const youtubeValidator: PlatformUrlValidator = {
  platformCode: "youtube",

  canHandle(hostname: string): boolean {
    return hostname === "youtube.com" || hostname === "youtu.be";
  },

  validate(url: URL): UrlValidationResult {
    const base: UrlValidationResult = {
      isValid: false,
      detectedPlatformCode: "youtube",
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
    const path = url.pathname;

    // youtu.be → 영상 단축 URL
    if (hostname === "youtu.be") {
      return {
        ...base,
        matchedRule: "youtu.be_short_link",
        validationMessage:
          "This is a video short link, not a channel URL. Please enter a YouTube channel URL (e.g. youtube.com/@handle).",
        validationSeverity: "error",
      };
    }

    // /watch → 영상 URL
    if (path.startsWith("/watch")) {
      return {
        ...base,
        matchedRule: "youtube_video_url",
        validationMessage:
          "This is a video URL, not a channel URL. Please enter the channel's profile URL.",
        validationSeverity: "error",
      };
    }

    // /shorts/ → 쇼츠 URL
    if (path.startsWith("/shorts/")) {
      return {
        ...base,
        matchedRule: "youtube_shorts_url",
        validationMessage:
          "This is a Shorts URL, not a channel URL. Please enter the channel's profile URL.",
        validationSeverity: "error",
      };
    }

    // /playlist → 재생목록
    if (path.startsWith("/playlist")) {
      return {
        ...base,
        matchedRule: "youtube_playlist_url",
        validationMessage:
          "This is a playlist URL, not a channel URL. Please enter the channel's profile URL.",
        validationSeverity: "error",
      };
    }

    // /@handle → 채널 handle
    const handleMatch = path.match(/^\/@([\w.-]+)/);
    if (handleMatch?.[1]) {
      const handle = handleMatch[1];
      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://youtube.com/@${handle}`,
        matchedRule: "youtube_handle",
        channelIdentifier: `@${handle}`,
        validationMessage: `YouTube channel detected: @${handle}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    // /channel/UCxxxxx → 채널 ID
    const channelIdMatch = path.match(/^\/channel\/(UC[\w-]+)/);
    if (channelIdMatch?.[1]) {
      const channelId = channelIdMatch[1];
      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://youtube.com/channel/${channelId}`,
        matchedRule: "youtube_channel_id",
        channelIdentifier: channelId,
        validationMessage: `YouTube channel detected: ${channelId}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    // /c/customname → custom URL
    const customMatch = path.match(/^\/c\/([\w.-]+)/);
    if (customMatch?.[1]) {
      const customName = customMatch[1];
      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://youtube.com/c/${customName}`,
        matchedRule: "youtube_custom_url",
        channelIdentifier: customName,
        validationMessage: `YouTube channel detected: ${customName}`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    // /user/username → legacy user URL
    const userMatch = path.match(/^\/user\/([\w.-]+)/);
    if (userMatch?.[1]) {
      const username = userMatch[1];
      return {
        ...base,
        isValid: true,
        normalizedUrl: `https://youtube.com/user/${username}`,
        matchedRule: "youtube_user_url",
        channelIdentifier: username,
        validationMessage: `YouTube channel detected: ${username} (legacy URL format)`,
        validationSeverity: "success",
        isChannelLevelUrl: true,
        shouldAllowProceed: true,
      };
    }

    // youtube.com 이지만 매칭 규칙 없음
    return {
      ...base,
      matchedRule: "youtube_unrecognized",
      validationMessage:
        "This YouTube URL doesn't look like a channel URL. Use youtube.com/@handle or youtube.com/channel/UCxxxxx format.",
      validationSeverity: "warning",
      shouldAllowProceed: false,
    };
  },
};
