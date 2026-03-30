# Sentiment Pipeline Architecture

> Date: 2026-03-16
> Status: IMPLEMENTED

## 구조

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────┐
│  Provider    │────>│ LiveSocialMention  │────>│ Sentiment    │
│  Adapters    │     │ BridgeService      │     │ Analysis     │
│  (YouTube,   │     │                    │     │ Service      │
│   IG, TikTok,│     │  sentiment: null   │     │ (@x2/ai)     │
│   X)         │     │  ↓                 │     │              │
└─────────────┘     │  analyzeBatch()    │     │ ┌──────────┐ │
                    │  ↓                 │     │ │ Claude   │ │
                    │  sentiment: VALUE  │     │ │ Haiku    │ │
                    └────────────────────┘     │ └──────────┘ │
                                               │ ┌──────────┐ │
                                               │ │ Rule     │ │
                                               │ │ Fallback │ │
                                               │ └──────────┘ │
                                               └──────────────┘
```

## 분석 전략

### 1차: Claude Haiku (LLM)
- **모델:** claude-haiku-4-5-20251001
- **배치:** 최대 20개 텍스트를 한 번에 분석
- **텍스트 제한:** 300자
- **비용:** ~$0.25/1M input + $1.25/1M output tokens
- **활성 조건:** `AI_DEV_MODE !== "true"` && `ANTHROPIC_API_KEY` 설정됨

### 2차: 규칙 기반 (Fallback)
- 한국어 감성 키워드 매칭 (긍정 20개, 부정 16개)
- LLM 실패 시 자동 전환
- 키워드 미매칭 → NEUTRAL (적극적 분류)
- 텍스트 3자 미만 → UNCLASSIFIED

### 3차: UNCLASSIFIED
- LLM 응답 파싱 실패
- 전체 분석 서비스 실패
- 텍스트가 너무 짧음

## 카테고리

| 값 | 의미 | 소스 |
|----|------|------|
| POSITIVE | 긍정 | LLM / Rule |
| NEGATIVE | 부정 | LLM / Rule |
| NEUTRAL | 중립 | LLM / Rule |
| MIXED | 긍정+부정 혼합 | LLM / Rule |
| UNCLASSIFIED | 분류 불가 (데이터 부족) | Fallback |
| ANALYSIS_FAILED | 분석 서비스 실패 | Error |

## 연결 포인트

| 위치 | 연결 | 상태 |
|------|------|------|
| `LiveSocialMentionBridgeService.collectLiveMentions()` | 수집 후 null sentiment 멘션에 배치 분석 | DONE |
| `intelligence.liveMentions` tRPC route | Bridge 호출 → snapshot 저장 시 분류된 sentiment 반영 | DONE |
| `workers/analyzer` collection job | rawSocialMention에서 sentiment 집계 시 분류 반영 | DONE |

## Graceful Degradation

```
1. ANTHROPIC_API_KEY 없음 → Rule-based fallback (자동)
2. AI_DEV_MODE=true → Rule-based fallback (자동)
3. Claude API 호출 실패 → 해당 배치만 Rule fallback
4. 전체 sentiment 서비스 import 실패 → UNCLASSIFIED 마킹 (non-blocking)
```
