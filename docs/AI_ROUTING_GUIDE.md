# AI Routing Guide

## 개요

AI 라우터는 작업 유형, 우선순위, 사용 가능한 provider 상태를 기반으로 최적의 AI 모델을 자동 선택합니다.

## 라우팅 흐름

```
AiRoutingInput
  ├── taskType          → 작업 정책 조회
  ├── priority          → 모델 등급 조정
  ├── language          → 프롬프트 언어 선택
  ├── tokenBudget       → 모델 제약 확인
  ├── providerPreference → 선호 provider 우선
  └── workspacePlan     → 요금제별 제한
          │
          ▼
    ┌─────────────┐
    │  AI Router   │
    └──────┬──────┘
           │
           ▼
    AiRoutingDecision
      ├── selectedProvider
      ├── selectedModel
      ├── fallbackChain
      ├── expectedCostUsd
      └── reasoning (한국어)
```

## 라우팅 전략

### 1. 작업 유형 기반 기본 라우팅

| 작업 특성               | 선호 모델 등급 | 이유                |
| ----------------------- | -------------- | ------------------- |
| 분류/라벨링 (짧은 출력) | fast           | 빠른 응답, 저비용   |
| 생성/요약 (중간 출력)   | standard       | 품질-비용 균형      |
| 전략 분석 (긴 출력)     | premium        | 높은 추론 능력 필요 |

### 2. Provider 선호 정책

- **빠른 분류 작업**: OpenAI gpt-4o-mini (가장 빠른 응답)
- **표준 생성 작업**: Anthropic claude-sonnet (품질-비용 균형)
- **고급 분석 작업**: Anthropic claude-opus (최고 추론 품질)

### 3. Fallback Chain

모든 작업은 2단계 이상의 fallback을 가집니다:

```
Primary (Anthropic Claude) → Fallback 1 (OpenAI GPT) → Mock 응답
Primary (OpenAI GPT)       → Fallback 1 (Anthropic) → Mock 응답
```

### 4. 우선순위 기반 조정

| 우선순위 | 동작                               |
| -------- | ---------------------------------- |
| critical | premium 모델 강제 사용, 긴 timeout |
| high     | standard 이상 모델, 2회 retry      |
| normal   | 정책 기본값                        |
| low      | fast 모델로 다운그레이드 가능      |

### 5. Dev Mode

`AI_DEV_MODE=true`일 때 모든 라우팅은 mock provider로 강제 전환됩니다.

## 라우팅 의사결정 예시

### 예시 1: 댓글 감성 분석

```
입력: taskType=comment_sentiment_analysis, priority=normal
→ 정책: fast 모델, 3초 timeout, 500 토큰
→ 결정: openai/gpt-4o-mini
→ 폴백: anthropic/claude-haiku-4-5-20251001 → mock
→ 사유: "빠른 분류 작업으로 경량 모델이 적합합니다"
```

### 예시 2: 전략 인사이트 생성

```
입력: taskType=strategy_insight_generation, priority=high
→ 정책: premium 모델, 45초 timeout, 4000 토큰
→ 결정: anthropic/claude-opus-4-6
→ 폴백: openai/gpt-4o → anthropic/claude-sonnet → mock
→ 사유: "복잡한 전략 분석으로 고성능 모델이 필요합니다"
```

### 예시 3: 비용 초과 시

```
입력: taskType=strategy_insight_generation, tokenBudget=1000
→ 정책: premium 모델이지만 budget 부족
→ 결정: openai/gpt-4o-mini (비용 절약 모드)
→ 사유: "토큰 예산 제한으로 경량 모델로 전환합니다"
```

## 커스터마이징

`task-policies.ts`에서 작업별 정책을 수정할 수 있습니다:

```typescript
{
  taskType: "strategy_insight_generation",
  preferredProvider: "anthropic",
  preferredModel: "claude-opus-4-6",
  fallbackProvider: "openai",
  fallbackModel: "gpt-4o",
  maxLatencyMs: 45000,
  maxTokenBudget: 4000,
  safetyLevel: "high",
}
```

## 새 작업 유형 추가

1. `types.ts`의 `AiTaskType`에 새 타입 추가
2. `task-policies.ts`에 정책 정의
3. `prompts/templates.ts`에 프롬프트 작성
4. `safety/guardrails.ts`에 안전 정책 추가
5. `evals/eval-cases.ts`에 평가 케이스 추가
