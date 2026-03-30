/**
 * @x2/queue — BullMQ 기반 비동기 작업 큐
 *
 * Queues:
 *   - intelligence-collection: 키워드별 소셜 멘션 수집 + snapshot 생성
 *   - intelligence-snapshot: 분석 실행 + benchmark/social snapshot 저장
 */

export { getRedisConnection, REDIS_URL } from "./connection";
export {
  intelligenceCollectionQueue,
  intelligenceSnapshotQueue,
  dataRetentionQueue,
  backfillQueue,
  deliveryRetryQueue,
  QUEUE_NAMES,
  type CollectionJobData,
  type SnapshotJobData,
  type RetentionJobData,
  type BackfillJobData,
  type DeliveryRetryJobData,
} from "./queues";
