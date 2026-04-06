// ─────────────────────────────────────────────
// Intent Engine 캐시 매니저
// 인메모리 및 Redis 기반 캐시 지원
// ─────────────────────────────────────────────

import type { CacheEntry } from "../types";

// ─────────────────────────────────────────────
// 캐시 저장소 인터페이스
// ─────────────────────────────────────────────

interface ICacheStore {
  /** 캐시에서 값을 가져옴 */
  get<T>(key: string): Promise<T | null>;
  /** 캐시에 값을 저장 */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  /** 키가 캐시에 존재하는지 확인 */
  has(key: string): Promise<boolean>;
  /** 캐시에서 키를 삭제 */
  delete(key: string): Promise<boolean>;
  /** 모든 캐시 항목 삭제 */
  clear(): Promise<void>;
  /** 캐시 통계 반환 */
  stats(): Promise<{ size: number; hitCount: number; missCount: number }>;
}

// ─────────────────────────────────────────────
// 해시 유틸리티
// ─────────────────────────────────────────────

/** 간단한 문자열 해시 함수 (djb2 알고리즘) */
function simpleHash(str: string): string {
  if (!str) return "0";
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

// ─────────────────────────────────────────────
// 인메모리 캐시 저장소
// ─────────────────────────────────────────────

class InMemoryCacheStore implements ICacheStore {
  /** 캐시 저장소 (Map 기반) */
  private cache = new Map<string, { value: unknown; expiresAt: number }>();
  /** 최대 항목 수 */
  private readonly maxEntries = 200;
  /** 접근 순서 추적 (LRU) */
  private accessOrder: string[] = [];
  /** 적중 횟수 */
  private hitCount = 0;
  /** 미적중 횟수 */
  private missCount = 0;

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // TTL 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.missCount++;
      return null;
    }

    // LRU 접근 순서 갱신
    this.updateAccessOrder(key);
    this.hitCount++;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    // 최대 항목 수 초과 시 LRU 제거
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this.updateAccessOrder(key);
  }

  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }

    return true;
  }

  async delete(key: string): Promise<boolean> {
    this.removeFromAccessOrder(key);
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  async stats(): Promise<{
    size: number;
    hitCount: number;
    missCount: number;
  }> {
    // 만료된 항목 정리
    this.purgeExpired();

    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }

  /** LRU 정책에 따라 가장 오래된 항목 제거 */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    const oldest = this.accessOrder.shift()!;
    this.cache.delete(oldest);
  }

  /** 접근 순서 갱신 */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /** 접근 순서에서 제거 */
  private removeFromAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  /** 만료된 항목 일괄 정리 */
  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
  }
}

// ─────────────────────────────────────────────
// Redis 캐시 저장소
// ─────────────────────────────────────────────

class RedisCacheStore implements ICacheStore {
  /** Redis 클라이언트 인스턴스 */
  private client: any = null;
  /** Redis 연결 URL */
  private readonly redisUrl: string;
  /** Redis 키 접두사 */
  private readonly prefix = "intent:";
  /** 적중 횟수 */
  private hitCount = 0;
  /** 미적중 횟수 */
  private missCount = 0;
  /** 초기화 프로미스 */
  private initPromise: Promise<boolean>;
  /** 폴백 인메모리 저장소 (ioredis 로드 실패 시) */
  private fallback: InMemoryCacheStore | null = null;

  constructor(redisUrl: string) {
    this.redisUrl = redisUrl;
    this.initPromise = this.initialize();
  }

  /** Redis 클라이언트 초기화 (ioredis 동적 임포트) */
  private async initialize(): Promise<boolean> {
    try {
      const Redis = (await import("ioredis")).default;
      this.client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      await this.client.connect();
      console.log("[CacheManager] Redis 연결 성공:", this.redisUrl);
      return true;
    } catch (error) {
      console.warn(
        "[CacheManager] ioredis를 로드할 수 없습니다. 인메모리 캐시로 폴백합니다.",
        error,
      );
      this.fallback = new InMemoryCacheStore();
      return false;
    }
  }

  /** Redis 사용 가능 여부 확인 후 클라이언트 반환 */
  private async ensureClient(): Promise<boolean> {
    await this.initPromise;
    return this.client !== null && this.fallback === null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!(await this.ensureClient())) {
      return this.fallback!.get<T>(key);
    }

    try {
      const raw = await this.client.get(this.prefix + key);
      if (raw === null) {
        this.missCount++;
        return null;
      }

      this.hitCount++;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error("[CacheManager] Redis GET 오류:", error);
      this.missCount++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    if (!(await this.ensureClient())) {
      return this.fallback!.set<T>(key, value, ttlMs);
    }

    try {
      const serialized = JSON.stringify(value);
      await this.client.set(this.prefix + key, serialized, "PX", ttlMs);
    } catch (error) {
      console.error("[CacheManager] Redis SET 오류:", error);
    }
  }

  async has(key: string): Promise<boolean> {
    if (!(await this.ensureClient())) {
      return this.fallback!.has(key);
    }

    try {
      const exists = await this.client.exists(this.prefix + key);
      return exists === 1;
    } catch (error) {
      console.error("[CacheManager] Redis EXISTS 오류:", error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!(await this.ensureClient())) {
      return this.fallback!.delete(key);
    }

    try {
      const result = await this.client.del(this.prefix + key);
      return result > 0;
    } catch (error) {
      console.error("[CacheManager] Redis DEL 오류:", error);
      return false;
    }
  }

  /** SCAN 패턴으로 모든 intent: 키 삭제 (KEYS 명령 대신 사용하여 블로킹 방지) */
  async clear(): Promise<void> {
    if (!(await this.ensureClient())) {
      return this.fallback!.clear();
    }

    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          "MATCH",
          this.prefix + "*",
          "COUNT",
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      console.error("[CacheManager] Redis CLEAR 오류:", error);
    }
  }

  async stats(): Promise<{
    size: number;
    hitCount: number;
    missCount: number;
  }> {
    if (!(await this.ensureClient())) {
      return this.fallback!.stats();
    }

    // Redis는 크기를 저렴하게 추적할 수 없으므로 -1 반환
    return {
      size: -1,
      hitCount: this.hitCount,
      missCount: this.missCount,
    };
  }
}

// ─────────────────────────────────────────────
// 캐시 매니저
// ─────────────────────────────────────────────

/** 기본 TTL: 1시간 */
const DEFAULT_TTL_MS = 60 * 60 * 1000;

class CacheManager {
  /** 캐시 저장소 인스턴스 */
  private store: ICacheStore;

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      console.log("[CacheManager] Redis 캐시 백엔드 활성화");
      this.store = new RedisCacheStore(redisUrl);
    } else {
      console.log("[CacheManager] 인메모리 캐시 백엔드 활성화");
      this.store = new InMemoryCacheStore();
    }
  }

  /**
   * 캐시 키 생성
   * 시드 키워드와 옵션을 기반으로 정규화된 키 생성
   */
  buildKey(seedKeyword: string, options?: Record<string, unknown>): string {
    const normalized = seedKeyword.trim().toLowerCase();
    const optionStr = options
      ? JSON.stringify(options, Object.keys(options).sort())
      : "";
    const raw = `${normalized}:${optionStr}`;
    return `${normalized}:${simpleHash(raw)}`;
  }

  /** 캐시에서 값을 가져옴 */
  async get<T>(key: string): Promise<T | null> {
    return this.store.get<T>(key);
  }

  /** 캐시에 값을 저장 */
  async set<T>(
    key: string,
    value: T,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<void> {
    return this.store.set<T>(key, value, ttlMs);
  }

  /** 키가 캐시에 존재하는지 확인 */
  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  /** 캐시에서 키를 삭제 (무효화) */
  async invalidate(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  /** 모든 캐시 항목 삭제 */
  async clear(): Promise<void> {
    return this.store.clear();
  }

  /** 캐시 통계 반환 */
  async stats(): Promise<{
    size: number;
    hitCount: number;
    missCount: number;
  }> {
    return this.store.stats();
  }

  /**
   * 캐시 워밍 — 캐시에 없으면 fetcher를 실행하여 캐시에 저장
   * 이미 캐시에 존재하면 캐시된 값을 반환
   */
  async warmCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttlMs);
    return value;
  }
}

// ─────────────────────────────────────────────
// 싱글톤 인스턴스
// ─────────────────────────────────────────────

export const cacheManager = new CacheManager();

export type { ICacheStore };
export { CacheManager, InMemoryCacheStore, RedisCacheStore, simpleHash };
