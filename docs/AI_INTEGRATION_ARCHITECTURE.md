# AI Integration Architecture

## 개요

X2 플랫폼의 멀티 AI Provider Orchestration 시스템 아키텍처 문서입니다.
단순 모델 호출이 아닌, 작업 유형별 라우팅, provider abstraction, 프롬프트 관리, fallback, 비용 추적, 안전성 검증까지 포함하는 통합 AI 실행 파이프라인입니다.

## 시스템 구조

```
┌─────────────────────────────────────────────────────┐
│  UI Layer (React Pages/Components)                  │
│  - "AI로 요약하기" 버튼                               │
│  - "AI 인사이트 생성" 트리거                            │
└───────────────┬─────────────────────────────────────┘
                │ POST /api/ai/execute
                ▼
┌─────────────────────────────────────────────────────┐
│  API Route Layer                                     │
│  - 입력 검증, 인증, rate limit                        │
└───────────────┬─────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────┐
│  AI Execution Service (orchestrator)                 │
│  1. AI Router → provider/model 선택                  │
│  2. Prompt Registry → 템플릿 조회                     │
│  3. Prompt Renderer → 변수 바인딩                     │
│  4. Fallback Manager → 실행 + 재시도                  │
│  5. Output Validator → 결과 검증                      │
│  6. Safety Guardrails → 안전성 필터                   │
│  7. Usage Logger → 로그 기록                          │
└───────────────┬─────────────────────────────────────┘
                ▼
┌─────────────────────────────────────────────────────┐
│  Provider Abstraction Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  OpenAI   │  │Anthropic │  │   Mock   │          │
│  │ Provider  │  │ Provider │  │ Provider │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

## 핵심 설계 원칙

1. **Provider 추상화**: 비즈니스 로직에서 특정 AI provider에 직접 의존하지 않음
2. **작업 유형별 라우팅**: 12가지 task type에 대해 최적 provider/model 자동 선택
3. **프롬프트 중앙 관리**: 코드에 하드코딩하지 않고 템플릿 레지스트리에서 관리
4. **Graceful Degradation**: provider 실패 시 fallback chain → mock 응답 순서로 degradation
5. **Dev/Mock 모드**: API 키 없이도 전체 흐름 테스트 가능

## 파일 구조

```
src/lib/ai/
├── types.ts                  # 전체 타입 정의
├── index.ts                  # 배럴 export
├── providers/
│   ├── base.ts               # 모델 카탈로그
│   ├── registry.ts           # Provider 레지스트리 (싱글톤)
│   ├── openai-provider.ts    # OpenAI Responses API 어댑터
│   ├── anthropic-provider.ts # Anthropic Messages API 어댑터
│   └── mock-provider.ts      # Mock 응답 provider
├── routing/
│   ├── router.ts             # AI 라우터
│   └── task-policies.ts      # 작업별 정책 정의
├── prompts/
│   ├── registry.ts           # 프롬프트 레지스트리
│   ├── templates.ts          # 프롬프트 템플릿 정의
│   └── renderer.ts           # 템플릿 렌더러
├── execution/
│   ├── executor.ts           # 메인 실행 오케스트레이터
│   ├── fallback-manager.ts   # Fallback/retry 관리
│   └── output-validator.ts   # 출력 검증
├── logging/
│   ├── usage-logger.ts       # 사용량 로깅
│   └── cost-estimator.ts     # 비용 추정
├── safety/
│   └── guardrails.ts         # 안전성 가드레일
└── evals/
    ├── eval-service.ts       # 평가 서비스
    └── eval-cases.ts         # 샘플 평가 케이스
```

## Provider 구조

### 공통 인터페이스 (IAiProvider)

모든 provider는 다음 메서드를 구현합니다:

| 메서드                       | 설명             |
| ---------------------------- | ---------------- |
| `generateText()`             | 텍스트 생성      |
| `generateStructuredOutput()` | JSON 구조화 출력 |
| `healthCheck()`              | 연결 상태 확인   |
| `estimateCost()`             | 비용 추정        |
| `isAvailable()`              | 사용 가능 여부   |
| `getModels()`                | 지원 모델 목록   |

### OpenAI Provider

- **API**: Responses API (`POST /v1/responses`)
- **모델**: gpt-4o (premium), gpt-4o-mini (fast), gpt-4.1 (standard)
- **구조화 출력**: `text.format = { type: "json_schema", ... }`

### Anthropic Provider

- **API**: Messages API (`POST /v1/messages`)
- **모델**: claude-opus-4-6 (premium), claude-sonnet-4-20250514 (standard), claude-haiku-4-5-20251001 (fast)
- **구조화 출력**: system prompt에 JSON 스키마 지시 포함

### Mock Provider

- 개발 모드 전용
- 작업 유형별 현실적인 한국어 mock 응답 반환
- 설정 가능한 지연 시간 (기본 500ms)
- 비용 0, 항상 사용 가능

## 지원 작업 유형 (12가지)

| Task Type                     | 한국어 명        | 모델 등급 | Safety |
| ----------------------------- | ---------------- | --------- | ------ |
| comment_sentiment_analysis    | 댓글 감성 분석   | fast      | low    |
| comment_topic_classification  | 댓글 토픽 분류   | fast      | low    |
| comment_risk_assessment       | 댓글 위험도 평가 | fast      | high   |
| reply_suggestion_generation   | 댓글 답변 추천   | standard  | high   |
| faq_extraction                | FAQ 추출         | standard  | medium |
| competitor_insight_generation | 경쟁사 인사이트  | premium   | medium |
| listening_insight_generation  | 리스닝 인사이트  | premium   | medium |
| strategy_insight_generation   | 전략 인사이트    | premium   | high   |
| report_summary_generation     | 리포트 요약      | premium   | medium |
| report_action_recommendation  | 액션 추천        | premium   | high   |
| dashboard_explanation         | 대시보드 설명    | fast      | low    |
| user_help_answer              | 사용자 도움말    | standard  | medium |

## 실행 파이프라인

```
요청 수신 → 라우팅 → 프롬프트 조회 → 프롬프트 렌더링 →
Provider 실행 → 출력 검증 → 안전성 필터 → 로그 기록 → 응답 반환
```

실패 시:

```
Provider 실패 → retry (with delay) → fallback provider →
fallback model → simpler prompt → mock 응답
```

## 환경 변수

| 변수                       | 설명                    | 기본값 |
| -------------------------- | ----------------------- | ------ |
| `OPENAI_API_KEY`           | OpenAI API 키           | -      |
| `ANTHROPIC_API_KEY`        | Anthropic Claude API 키 | -      |
| `AI_DEFAULT_PROVIDER`      | 기본 provider           | `mock` |
| `AI_DEV_MODE`              | 개발 모드 (mock 사용)   | `true` |
| `AI_COST_TRACKING_ENABLED` | 비용 추적 활성화        | `true` |
| `AI_MOCK_LATENCY_MS`       | Mock 응답 지연          | `500`  |

## 운영 전환 체크리스트

1. `OPENAI_API_KEY` 또는 `ANTHROPIC_API_KEY` 설정
2. `AI_DEV_MODE=false` 설정
3. `AI_DEFAULT_PROVIDER`를 원하는 provider로 변경
4. Provider 헬스체크 확인 (`/admin/ai` 페이지)
5. 프롬프트 품질 평가 실행 (`/admin/ai/evals` 페이지)
6. 비용 모니터링 설정 (`/admin/ai/logs` 페이지)

## 향후 고도화 포인트

- Redis 기반 사용량 로그 영속화
- 워크스페이스별 요금제 연동 (토큰 한도)
- Streaming 응답 지원 (SSE)
- A/B 테스트 (프롬프트 버전 비교)
- 자동 프롬프트 최적화
- 멀티모달 지원 (이미지 분석)
