import type { SocialPlatform } from "@x2/types";

type RateLimiterConfig = {
  maxTokens: number;
  refillRate: number; // tokens per ms
};

/**
 * 간단한 토큰 버킷 기반 Rate Limiter.
 *
 * 플랫폼별 API 호출 한도를 in-memory로 관리한다.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private readonly config: RateLimiterConfig) {
    this.tokens = config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * 토큰 1개를 소비한다.
   * 토큰이 부족하면 리필될 때까지 대기한다.
   */
  async acquire(cost = 1): Promise<void> {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return;
    }

    // 토큰이 부족하면 필요한 만큼 기다린다
    const deficit = cost - this.tokens;
    const waitMs = Math.ceil(deficit / this.config.refillRate);
    await sleep(waitMs);

    this.refill();
    this.tokens -= cost;
  }

  /** 남은 토큰 수 (테스트용) */
  get remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.config.maxTokens,
      this.tokens + elapsed * this.config.refillRate,
    );
    this.lastRefill = now;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 플랫폼별 설정 ──────────────────────────────────────

const PLATFORM_CONFIGS: Record<SocialPlatform, RateLimiterConfig> = {
  // YouTube Data API v3: 10,000 quota units/day
  youtube: {
    maxTokens: 10_000,
    refillRate: 10_000 / (24 * 60 * 60 * 1000), // 10,000 per day
  },
  // Instagram Graph API: 200 calls/hour
  instagram: {
    maxTokens: 200,
    refillRate: 200 / (60 * 60 * 1000), // 200 per hour
  },
  // TikTok Research API: 100 calls/min
  tiktok: {
    maxTokens: 100,
    refillRate: 100 / (60 * 1000), // 100 per minute
  },
  // X (Twitter) API v2: 300 calls/15min
  x: {
    maxTokens: 300,
    refillRate: 300 / (15 * 60 * 1000), // 300 per 15 minutes
  },
};

const limiterInstances = new Map<SocialPlatform, RateLimiter>();

/**
 * 플랫폼에 맞는 RateLimiter 싱글턴을 반환한다.
 */
export function getRateLimiter(platform: SocialPlatform): RateLimiter {
  let limiter = limiterInstances.get(platform);
  if (!limiter) {
    limiter = new RateLimiter(PLATFORM_CONFIGS[platform]);
    limiterInstances.set(platform, limiter);
  }
  return limiter;
}
