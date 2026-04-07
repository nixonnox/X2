/**
 * Redis connection for BullMQ.
 * Uses REDIS_URL from environment or defaults to localhost.
 *
 * bullmq Worker/Queue는 ConnectionOptions union에 IORedis 인스턴스를
 * 직접 받을 수 있으므로 반환 타입을 IORedis로 정직하게 유지한다.
 * 이전엔 `as unknown as ConnectionOptions`로 캐스팅했지만 그러면
 * 다른 패키지가 같은 헬퍼를 받아 쓸 때 ioredis 클래스 identity가
 * 어긋나서 P1-3 (analyzer) typecheck가 깨졌었음.
 */
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });
  }
  return _connection;
}

export { REDIS_URL };
