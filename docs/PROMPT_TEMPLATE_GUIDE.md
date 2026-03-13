# Prompt Template Guide

## 개요

프롬프트는 코드에 하드코딩하지 않고, 중앙 레지스트리에서 버전 관리됩니다.
각 프롬프트 템플릿은 작업 유형, 언어, 안전 가이드, 출력 형식을 포함합니다.

## 프롬프트 구조

```typescript
interface PromptTemplate {
  key: string;                    // 고유 식별자
  version: string;                // 버전 (예: "1.0", "1.1")
  taskType: AiTaskType;           // 작업 유형
  language: AiLanguageCode;       // 언어 (ko, en, ja, zh, es)
  systemInstruction: string;      // AI 역할 정의
  developerInstruction: string;   // 구체적 작업 지시
  outputFormatInstruction: string;// 출력 형식 지정
  fewShotExamples?: { input: string; output: string }[];  // 예시
  safetyNote: string;             // 안전 가이드
  metadata: { ... };              // 메타데이터
}
```

## 레지스트리 키 형식

프롬프트는 `{taskType}:{language}` 형식의 키로 관리됩니다.

예: `strategy_insight_generation:ko`, `report_summary_generation:en`

## 기본 제공 프롬프트

| Task Type                     | ko  | en  | 설명               |
| ----------------------------- | --- | --- | ------------------ |
| strategy_insight_generation   | ✅  | ✅  | 전략 인사이트 생성 |
| report_summary_generation     | ✅  | ✅  | 리포트 요약        |
| reply_suggestion_generation   | ✅  | ✅  | 댓글 답변 추천     |
| dashboard_explanation         | ✅  | ✅  | 대시보드 설명      |
| faq_extraction                | ✅  | ✅  | FAQ 추출           |
| competitor_insight_generation | ✅  | ✅  | 경쟁사 인사이트    |

## 프롬프트 작성 가이드

### 1. System Instruction

AI의 역할과 전문 분야를 명확히 정의합니다.

```
✅ "당신은 소셜 미디어 마케팅 전략 분석 전문가입니다."
❌ "You are a helpful assistant."
```

### 2. Developer Instruction

구체적인 작업 지시와 분석 관점을 명시합니다.

```
✅ "제공된 소셜 미디어 데이터를 분석하고, 다음 항목을 포함하는 전략 인사이트를 생성하세요:
    1. 핵심 발견사항 (3-5개)
    2. 데이터 기반 추천 전략 (2-3개)
    3. 위험 요소 (있는 경우)"
```

### 3. Output Format Instruction

구조화된 출력이 필요한 경우 JSON 스키마를 명시합니다.

```
✅ "반드시 다음 JSON 형식으로 응답하세요:
    {
      \"title\": \"인사이트 제목\",
      \"summary\": \"2-3문장 요약\",
      \"bullets\": [\"핵심 발견 1\", ...],
      \"recommendations\": [\"추천 1\", ...],
      \"confidence\": 0.0~1.0
    }"
```

### 4. Safety Note

과도한 확신, 민감한 주제, 브랜드 안전성에 대한 가이드를 포함합니다.

```
✅ "확정적 표현 대신 '~로 보입니다', '~할 수 있습니다' 등 근거 기반 표현을 사용하세요."
✅ "의료/법률 관련 조언은 전문가 상담을 권장하는 문구를 포함하세요."
```

### 5. Few-Shot Examples

1-2개의 입출력 예시를 포함하면 출력 품질이 향상됩니다.

## 다국어 확장

### 언어 폴백 전략

```
요청 언어 → 해당 언어 프롬프트 검색 → 없으면 한국어(ko) 폴백
```

### 새 언어 추가

1. `templates.ts`에 해당 언어의 프롬프트 추가
2. `language` 필드를 새 언어 코드로 설정
3. `systemInstruction`, `safetyNote` 등을 해당 언어로 번역

## 버전 관리

- 프롬프트 수정 시 version을 올립니다 (예: "1.0" → "1.1")
- 레지스트리는 같은 key의 여러 버전을 보관합니다
- 특정 버전을 지정하지 않으면 최신 버전이 사용됩니다
- 모든 실행 로그에 사용된 promptVersion이 기록됩니다

## 관리자 화면

`/admin/ai/prompts`에서 등록된 프롬프트 목록, 버전, 안전 가이드를 확인할 수 있습니다.
