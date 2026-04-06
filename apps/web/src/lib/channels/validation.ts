import type { PlatformCode, ChannelFormInput } from "./types";
import { getPlatform } from "./platform-registry";
import { resolveChannelUrl } from "./url";

function detectPlatformFromUrl(url: string): PlatformCode {
  try {
    const result = resolveChannelUrl(url);
    return (result.detectedPlatformCode as PlatformCode) ?? "custom";
  } catch {
    return "custom";
  }
}

export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function validateChannelForm(input: ChannelFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) {
    errors.name = "채널 이름을 입력하세요.";
  }

  if (!input.url.trim()) {
    errors.url = "채널 URL을 입력하세요.";
  } else if (!isValidUrl(input.url)) {
    errors.url = "올바른 URL 형식이 아닙니다.";
  } else if (
    input.platformCode !== "custom" &&
    !isUrlMatchingPlatform(input.url, input.platformCode)
  ) {
    // custom 플랫폼이거나 URL이 플랫폼에 맞으면 통과
    // 단, 실제 플랫폼인데 URL이 전혀 다른 플랫폼인 경우만 막음
    const urlPlatform = detectPlatformFromUrl(input.url);
    if (urlPlatform !== "custom" && urlPlatform !== input.platformCode) {
      errors.url = "선택한 플랫폼과 맞지 않는 URL입니다.";
    }
  }

  if (!input.country.trim()) {
    errors.country = "국가를 선택하세요.";
  }

  if (!input.category.trim()) {
    errors.category = "카테고리를 선택하세요.";
  }

  if (input.platformCode === "custom" && !input.customPlatformName?.trim()) {
    errors.customPlatformName = "플랫폼 이름을 입력하세요.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    // 프로토콜 없이 입력한 경우 자동 보정
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

function isUrlMatchingPlatform(
  url: string,
  platformCode: PlatformCode,
): boolean {
  if (platformCode === "custom" || platformCode === "website") {
    return isValidUrl(url);
  }

  const platform = getPlatform(platformCode);
  if (!platform) return true;

  // 프로토콜 없는 URL도 매칭되도록 보정
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return platform.supportedUrlPatterns.some(
    (pattern) => pattern.test(url) || pattern.test(normalized),
  );
}
