/**
 * @x2/ai
 *
 * AI 기반 분석 및 인사이트 생성 모듈.
 *
 * 구조:
 *   src/
 *   ├── index.ts          ← 공개 API export
 *   ├── client.ts         ← Claude API 클라이언트 (Vercel AI SDK)
 *   ├── prompts/          ← 프롬프트 템플릿
 *   │   ├── channel-summary.ts
 *   │   ├── content-suggestion.ts
 *   │   └── sentiment.ts
 *   └── services/
 *       ├── insight.ts    ← 채널 인사이트 생성
 *       └── sentiment.ts  ← 댓글 감성 분석
 *
 * Phase 1에서 Claude Sonnet/Haiku 연동 예정.
 */
export {};
