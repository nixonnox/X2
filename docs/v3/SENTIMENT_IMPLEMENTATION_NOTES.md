# Sentiment Implementation Notes

> Date: 2026-03-16

## 새로 만든 파일

| 파일 | 역할 |
|------|------|
| `packages/ai/src/client.ts` | Anthropic SDK 클라이언트, AI 가용성 체크 |
| `packages/ai/src/services/sentiment.ts` | MentionSentimentAnalysisService (LLM + Rule fallback) |
| `packages/ai/src/index.ts` | 패키지 export (기존 빈 shell 교체) |

## 수정한 파일

| 파일 | 변경 |
|------|------|
| `packages/ai/package.json` | @anthropic-ai/sdk 의존성 추가 |
| `packages/api/package.json` | @x2/ai 의존성 추가 |
| `workers/analyzer/package.json` | @x2/ai 의존성 추가 |
| `live-social-mention-bridge.service.ts` | 수집 후 null sentiment 멘션에 배치 분석 연결 |

## 비용 정책

### Claude Haiku 비용 추정
- 텍스트 20개 배치 기준: ~$0.000065/배치
- 하루 1000개 멘션 분석: ~$0.003/일
- 월간 30,000개: ~$0.10/월

### 비용 최적화
- Haiku 모델 사용 (Sonnet 대비 ~10배 저렴)
- 배치 처리 (20개씩)
- 텍스트 300자 제한
- 중복 분석 방지 (이미 sentiment 있으면 skip)

## 실패/재시도 정책

| 실패 유형 | 처리 |
|-----------|------|
| ANTHROPIC_API_KEY 없음 | Rule-based 자동 전환 (정상 동작) |
| Claude API 타임아웃 | 해당 배치만 Rule fallback |
| Claude API rate limit | 해당 배치만 Rule fallback |
| 응답 파싱 실패 | 개별 멘션 UNCLASSIFIED |
| 전체 import 실패 | 모든 멘션 UNCLASSIFIED (non-blocking) |

## 남은 과제

| 항목 | 우선순위 |
|------|---------|
| Analyzer worker에서 sentiment 분석 직접 호출 | MEDIUM |
| Sentiment 결과 rawSocialMention에 저장 (재분석 방지) | MEDIUM |
| 언어 감지 → 영어 prompt 분기 | LOW |
| Confidence 기반 재분석 (low confidence → 재시도) | LOW |
| OpenAI fallback provider | LOW |
