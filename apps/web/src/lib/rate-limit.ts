/**
 * Edge-compatible sliding window rate limiter.
 *
 * 서버리스 환경(Vercel)에서는 인스턴스별 in-memory이므로
 * 완벽한 글로벌 제한은 아니지만, 단일 edge location에서의
 * 급격한 요청 폭주를 방어한다.
 *
 * 프로덕션 확장 시 @upstash/ratelimit + Redis로 전환 권장.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// 5분마다 만료 항목 정리
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * 지정 키에 대해 sliding window 기반 rate limit 검사.
 *
 * @param key   식별자 (보통 IP 또는 userId)
 * @param limit 윈도우당 최대 요청 수
 * @param windowMs 윈도우 크기 (밀리초)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}
