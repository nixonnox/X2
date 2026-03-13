import type { PlatformUrlValidator, UrlValidationResult } from "../types";

/**
 * Generic / Custom URL Validator
 *
 * 허용:
 *   모든 유효한 HTTPS/HTTP URL
 *
 * 이 validator는 다른 플랫폼 validator에 매칭되지 않은 URL에 대한 fallback이다.
 * custom 플랫폼 등록이나 website/blog 등록에 사용된다.
 */
export const genericValidator: PlatformUrlValidator = {
  platformCode: "custom",

  canHandle(_hostname: string): boolean {
    // fallback — 항상 true
    return true;
  },

  validate(url: URL): UrlValidationResult {
    const hostname = url.hostname.replace(/^www\./, "");
    const normalized = `${url.protocol}//${hostname}${url.pathname.replace(/\/$/, "") || ""}`;

    // 알려진 소셜 플랫폼 호스트네임인데 validator에서 처리 안 된 경우 경고
    const knownSocial = [
      "facebook.com",
      "linkedin.com",
      "threads.net",
      "blog.naver.com",
      "cafe.naver.com",
    ];
    const isKnownUnhandled = knownSocial.some(
      (h) => hostname === h || hostname.endsWith(`.${h}`),
    );

    if (isKnownUnhandled) {
      return {
        isValid: true,
        detectedPlatformCode: "custom",
        normalizedUrl: normalized,
        matchedRule: "generic_known_platform",
        channelIdentifier: hostname,
        validationMessage: `Detected ${hostname}. This platform doesn't have a dedicated validator yet. You can register it as a custom channel.`,
        validationSeverity: "info",
        isChannelLevelUrl: true,
        suggestedMode: "custom_manual",
        shouldAllowProceed: true,
      };
    }

    return {
      isValid: true,
      detectedPlatformCode: "custom",
      normalizedUrl: normalized,
      matchedRule: "generic_url",
      channelIdentifier: hostname,
      validationMessage: `Custom URL detected: ${hostname}. This will be registered as a custom channel with manual analysis.`,
      validationSeverity: "info",
      isChannelLevelUrl: true,
      suggestedMode: "custom_manual",
      shouldAllowProceed: true,
    };
  },
};
