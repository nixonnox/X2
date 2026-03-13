// URL validation module re-exports
export type {
  UrlValidationResult,
  ValidationSeverity,
  PlatformUrlValidator,
  BasicChannelAnalysisResult,
  BasicChannelMetric,
  BasicChannelInsight,
} from "./types";

export { normalizeUrl, safeHostname, isValidUrlFormat } from "./normalizer";
export { detectPlatform, isKnownPlatform } from "./detector";
export { findValidatorForHostname, getAllValidators } from "./validators";
export { resolveChannelUrl } from "./resolver";
