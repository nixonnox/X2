/**
 * Collection Health Tracker.
 *
 * Monitors platform health, implements circuit breaker pattern,
 * and tracks failure/retry metrics for the collection pipeline.
 *
 * - Tracks consecutive failures per platform
 * - Opens circuit breaker after threshold (5 consecutive failures)
 * - Auto-recovers after cooldown period (5 minutes)
 * - Provides health status for ops monitoring dashboard
 */

import type { Logger } from "../types";
import type {
  PlatformHealthStatus,
  RetryPolicy,
  DEFAULT_RETRY_POLICY,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_RATE_WINDOW_SIZE = 20; // Last N attempts for error rate calculation

// ---------------------------------------------------------------------------
// Health Tracker
// ---------------------------------------------------------------------------

type PlatformState = {
  platform: string;
  consecutiveFailures: number;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  circuitOpenedAt: Date | null;
  recentResults: boolean[]; // true = success, false = failure
};

export class CollectionHealthTracker {
  private platforms = new Map<string, PlatformState>();

  constructor(private readonly logger: Logger) {}

  /**
   * Record a successful collection for a platform.
   */
  recordSuccess(platform: string): void {
    const state = this.getOrCreate(platform);
    state.consecutiveFailures = 0;
    state.lastSuccessAt = new Date();
    state.circuitOpenedAt = null;
    state.recentResults.push(true);
    this.trimResults(state);
  }

  /**
   * Record a failed collection for a platform.
   */
  recordFailure(platform: string, error: string): void {
    const state = this.getOrCreate(platform);
    state.consecutiveFailures++;
    state.lastFailureAt = new Date();
    state.recentResults.push(false);
    this.trimResults(state);

    if (
      state.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD &&
      !state.circuitOpenedAt
    ) {
      state.circuitOpenedAt = new Date();
      this.logger.warn("Circuit breaker opened for platform", {
        platform,
        consecutiveFailures: state.consecutiveFailures,
        error,
      });
    }
  }

  /**
   * Check if the circuit breaker is open for a platform.
   * Returns true if the platform should be skipped.
   */
  isCircuitOpen(platform: string): boolean {
    const state = this.platforms.get(platform);
    if (!state?.circuitOpenedAt) return false;

    // Check if cooldown period has passed
    const elapsed = Date.now() - state.circuitOpenedAt.getTime();
    if (elapsed >= CIRCUIT_BREAKER_COOLDOWN_MS) {
      // Half-open: allow one attempt
      state.circuitOpenedAt = null;
      this.logger.info("Circuit breaker half-open — allowing retry", {
        platform,
      });
      return false;
    }

    return true;
  }

  /**
   * Get health status for a specific platform.
   */
  getStatus(platform: string): PlatformHealthStatus {
    const state = this.getOrCreate(platform);
    const successCount = state.recentResults.filter((r) => r).length;
    const totalCount = state.recentResults.length;
    const errorRate =
      totalCount > 0 ? (totalCount - successCount) / totalCount : 0;

    return {
      platform,
      healthy: state.consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD,
      lastSuccessAt: state.lastSuccessAt,
      lastFailureAt: state.lastFailureAt,
      consecutiveFailures: state.consecutiveFailures,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  /**
   * Get health status for all tracked platforms.
   */
  getAllStatus(): PlatformHealthStatus[] {
    const platforms = ["youtube", "instagram", "tiktok", "x"];
    return platforms.map((p) => this.getStatus(p));
  }

  /**
   * Calculate retry delay with exponential backoff.
   */
  static calculateRetryDelay(
    attempt: number,
    policy: RetryPolicy = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 60_000,
      backoffMultiplier: 2,
    },
  ): number {
    if (attempt >= policy.maxRetries) return -1; // No more retries
    const delay =
      policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt);
    // Add jitter (0-25% of delay)
    const jitter = Math.random() * delay * 0.25;
    return Math.min(delay + jitter, policy.maxDelayMs);
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private getOrCreate(platform: string): PlatformState {
    let state = this.platforms.get(platform);
    if (!state) {
      state = {
        platform,
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        circuitOpenedAt: null,
        recentResults: [],
      };
      this.platforms.set(platform, state);
    }
    return state;
  }

  private trimResults(state: PlatformState): void {
    while (state.recentResults.length > ERROR_RATE_WINDOW_SIZE) {
      state.recentResults.shift();
    }
  }
}
