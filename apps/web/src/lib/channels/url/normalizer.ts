// ============================================
// URL Normalizer
// ============================================

/**
 * 사용자 입력 URL을 정규화한다.
 *
 * 처리 순서:
 * 1. 공백 제거
 * 2. 프로토콜 없으면 https:// 추가
 * 3. URL 파싱
 * 4. www 유무 일관성 처리 (www 제거)
 * 5. trailing slash 제거
 * 6. 불필요한 query/hash 제거
 * 7. twitter.com → x.com 매핑
 */
export function normalizeUrl(raw: string): string {
  let input = raw.trim();
  if (!input) return "";

  // 프로토콜 보정
  if (!/^https?:\/\//i.test(input)) {
    input = `https://${input}`;
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input; // 파싱 불가 시 원본 반환
  }

  // hostname 소문자화 + www 제거
  let hostname = url.hostname.toLowerCase();
  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4);
  }

  // twitter.com → x.com 내부 매핑
  if (hostname === "twitter.com") {
    hostname = "x.com";
  }

  // pathname: trailing slash 제거 (루트 제외)
  let pathname = url.pathname;
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  // query/hash 제거 (소셜 프로필 URL에서는 불필요)
  return `https://${hostname}${pathname}`;
}

/**
 * 정규화된 URL에서 호스트네임을 안전하게 추출한다.
 */
export function safeHostname(url: string): string | null {
  try {
    let input = url.trim();
    if (!/^https?:\/\//i.test(input)) {
      input = `https://${input}`;
    }
    const parsed = new URL(input);
    let h = parsed.hostname.toLowerCase();
    if (h.startsWith("www.")) h = h.slice(4);
    if (h === "twitter.com") h = "x.com";
    return h;
  } catch {
    return null;
  }
}

/**
 * 사용자 입력이 유효한 URL 형태인지 기본 확인한다.
 */
export function isValidUrlFormat(raw: string): boolean {
  const input = raw.trim();
  if (!input) return false;
  const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    new URL(withProto);
    return true;
  } catch {
    return false;
  }
}
