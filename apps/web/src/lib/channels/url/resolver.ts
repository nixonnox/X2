import type { UrlValidationResult } from "./types";
import { normalizeUrl, safeHostname, isValidUrlFormat } from "./normalizer";
import { detectPlatform } from "./detector";
import { findValidatorForHostname } from "./validators";

// ============================================
// URL Resolver (Unified Pipeline)
// ============================================

/**
 * 사용자 입력 URL을 통합 파이프라인으로 처리한다.
 *
 * 파이프라인:
 *   raw input → format check → normalize → hostname 추출
 *             → platform detect → validator 선택 → validate → result
 */
export function resolveChannelUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();

  // 빈 입력
  if (!trimmed) {
    return {
      isValid: false,
      detectedPlatformCode: null,
      normalizedUrl: "",
      matchedRule: "empty_input",
      channelIdentifier: null,
      validationMessage: "Please enter a URL.",
      validationSeverity: "error",
      isChannelLevelUrl: false,
      suggestedMode: "url_basic",
      shouldAllowProceed: false,
    };
  }

  // URL 형식 확인
  if (!isValidUrlFormat(trimmed)) {
    return {
      isValid: false,
      detectedPlatformCode: null,
      normalizedUrl: trimmed,
      matchedRule: "invalid_url_format",
      channelIdentifier: null,
      validationMessage:
        "This doesn't look like a valid URL. Please enter a full URL (e.g. https://youtube.com/@channel).",
      validationSeverity: "error",
      isChannelLevelUrl: false,
      suggestedMode: "url_basic",
      shouldAllowProceed: false,
    };
  }

  // 정규화
  const normalized = normalizeUrl(trimmed);
  const hostname = safeHostname(normalized);

  if (!hostname) {
    return {
      isValid: false,
      detectedPlatformCode: null,
      normalizedUrl: normalized,
      matchedRule: "hostname_extraction_failed",
      channelIdentifier: null,
      validationMessage: "Could not extract hostname from URL.",
      validationSeverity: "error",
      isChannelLevelUrl: false,
      suggestedMode: "url_basic",
      shouldAllowProceed: false,
    };
  }

  // 플랫폼 감지
  const platformCode = detectPlatform(hostname);

  // validator 선택 및 실행
  const validator = findValidatorForHostname(hostname);
  const parsedUrl = new URL(normalized);
  const result = validator.validate(parsedUrl);

  // detector 결과와 validator 결과의 플랫폼이 다를 경우
  // detector 결과를 우선 (더 넓은 매핑 테이블 기반)
  if (result.detectedPlatformCode === "custom" && platformCode !== "custom") {
    return {
      ...result,
      detectedPlatformCode: platformCode,
    };
  }

  return result;
}
