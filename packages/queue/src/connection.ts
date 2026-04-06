/**
 * Redis connection for BullMQ.
 * Uses REDIS_URL from environment or defaults to localhost.
 */
import IORedis from "ioredis";
import type { ConnectionOptions } from "bullmq";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let _connection: IORedis | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
  }
  return _connection as unknown as ConnectionOptions;
}

export { REDIS_URL };
