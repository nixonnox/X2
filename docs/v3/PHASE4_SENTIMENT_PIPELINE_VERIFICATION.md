# Phase 4: Sentiment Pipeline Verification

> Date: 2026-03-16
> Status: PASS

## 1. Mention → Sentiment 연결

| 항목 | 상태 | 근거 |
|------|------|------|
| 수집 후 분석 호출 | PASS | `live-social-mention-bridge.service.ts:166-188` — null sentiment 멘션 필터 → `analyzeBatch()` 호출 |
| 배치 처리 | PASS | `sentiment.ts:42` — BATCH_SIZE=20, 20개씩 LLM에 전송 |
| 동적 import | PASS | `await import("@x2/ai")` — 비동기 import로 순환 의존 방지 |
| 이미 sentiment 있는 멘션 skip | PASS | `allMentions.filter((m) => !m.sentiment)` — 중복 분석 방지 |

## 2. 분석 전략 (3단계)

| 단계 | 조건 | Provider | 상태 |
|------|------|----------|------|
| 1차 | `isAIAvailable()` = true | Claude Haiku (anthropic) | PASS |
| 2차 | LLM 실패 / AI 미설정 | Rule-based (한국어 키워드 매칭) | PASS |
| 3차 | 전체 실패 | UNCLASSIFIED 마킹 | PASS |

## 3. LLM 연결 구조

| 항목 | 상태 | 근거 |
|------|------|------|
| Anthropic SDK | PASS | `client.ts:10` — `@anthropic-ai/sdk` import |
| 모델 | PASS | `sentiment.ts:44` — `claude-haiku-4-5-20251001` |
| 프롬프트 | PASS | `sentiment.ts:143-147` — 번호 + SENTIMENT 형식 응답 요청 |
| 응답 파싱 | PASS | `sentiment.ts:161-163` — regex `\[?\d+\]?\s*(POSITIVE|NEGATIVE|NEUTRAL|MIXED)` |
| 파싱 실패 처리 | PASS | `sentiment.ts:173-179` — UNCLASSIFIED + reason |

## 4. Rule-Based Fallback 구조

| 항목 | 상태 | 근거 |
|------|------|------|
| 긍정 키워드 | PASS | 20개 (좋, 최고, 추천, 만족 등 + 이모지) |
| 부정 키워드 | PASS | 16개 (별로, 나쁘, 실망, 최악 등 + 이모지) |
| MIXED 감지 | PASS | posScore > 0 && negScore > 0 |
| 매칭 없음 → NEUTRAL | PASS | 적극적 분류 (null이 아님) |
| 짧은 텍스트 → UNCLASSIFIED | PASS | 3자 미만 |
| Confidence 계산 | PASS | 매칭 수에 비례 (0.3 ~ 0.7) |
