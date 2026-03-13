import type { PlatformCode } from "../types";

// ============================================
// Platform Detector
// ============================================

/**
 * hostname → PlatformCode 매핑 테이블.
 * 정확한 hostname 매칭으로 플랫폼을 감지한다.
 */
const HOSTNAME_MAP: Record<string, PlatformCode> = {
  // YouTube
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "m.youtube.com": "youtube",

  // Instagram
  "instagram.com": "instagram",

  // TikTok
  "tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",

  // X (Twitter)
  "x.com": "x",
  "twitter.com": "x",
  "mobile.twitter.com": "x",

  // Threads
  "threads.net": "threads",

  // Facebook
  "facebook.com": "facebook",
  "fb.com": "facebook",
  "m.facebook.com": "facebook",
  "fb.watch": "facebook",

  // LinkedIn
  "linkedin.com": "linkedin",

  // Naver Blog
  "blog.naver.com": "naver_blog",

  // Naver Cafe
  "cafe.naver.com": "naver_cafe",
};

/**
 * hostname에서 PlatformCode를 감지한다.
 * 매칭 실패 시 "custom" 반환.
 */
export function detectPlatform(hostname: string): PlatformCode {
  const h = hostname.toLowerCase().replace(/^www\./, "");
  return HOSTNAME_MAP[h] ?? "custom";
}

/**
 * 주어진 hostname이 알려진 소셜 플랫폼인지 확인한다.
 */
export function isKnownPlatform(hostname: string): boolean {
  return detectPlatform(hostname) !== "custom";
}
