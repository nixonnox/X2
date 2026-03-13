/**
 * @x2/queue
 *
 * BullMQ 기반 비동기 작업 큐 정의.
 *
 * 구조:
 *   src/
 *   ├── index.ts          ← 큐 인스턴스 및 작업 타입 export
 *   ├── connection.ts     ← Redis 연결 설정
 *   └── jobs/
 *       ├── sync-channel.ts   ← 채널 데이터 동기화
 *       ├── analyze-content.ts ← 콘텐츠 분석 파이프라인
 *       └── generate-report.ts ← 리포트 생성
 *
 * Phase 2에서 Upstash Redis + BullMQ 연동 예정.
 */
export {};
