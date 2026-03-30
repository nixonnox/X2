# Phase 4: Gap List

> Date: 2026-03-16
> Total: 0 S0, 0 S1, 2 S2, 3 S3

## S0 — 핵심 흐름 불성립

**없음**

## S1 — 출시 전 반드시 수정

**없음**

## S2 — 제한 오픈 가능

### S2-1. rawSocialMention에 sentiment 결과 미저장

- **현상:** 분석된 sentiment가 LiveMention 객체에만 반영되고, rawSocialMention DB 레코드에는 저장되지 않음
- **영향:** 같은 멘션을 재조회하면 다시 분석해야 함 (비용/지연 증가)
- **수정:** collectLiveMentions 후 rawSocialMention.updateMany로 sentiment 필드 업데이트

### S2-2. Analyzer Worker에서 sentiment 직접 호출 미연동

- **현상:** Scheduled collection job (workers/analyzer)이 rawSocialMention에서 기존 sentiment 값을 집계만 함
- **영향:** 스케줄 수집 시 새 멘션의 sentiment가 null인 채로 snapshot에 반영될 수 있음
- **수정:** processCollection에서 sentiment 분석 서비스 호출 추가

## S3 — 개선 권장

### S3-1. MIXED 카테고리 별도 카운트 미지원

- **현상:** MIXED sentiment가 unclassifiedCount에 포함됨
- **영향:** 긍정+부정 혼합 반응이 "미분류"로 표시
- **수정:** mixedCount 컬럼 추가 (schema 변경 필요)

### S3-2. 기존 TextAnalyzer와 SentimentService 통합 미완

- **현상:** Comment 분석용 TextAnalyzer(152개 키워드)와 Mention 분석용 SentimentService(36개 키워드)가 별도 존재
- **영향:** 키워드 사전 중복 관리
- **수정:** 향후 TextAnalyzer를 SentimentService로 통합 또는 공유 사전 추출

### S3-3. 언어 감지 미구현

- **현상:** 한국어 키워드만 사용, 영어/일본어 텍스트는 매칭률 낮음
- **영향:** 글로벌 콘텐츠에서 rule fallback 정확도 저하
- **수정:** 언어 감지 → 언어별 프롬프트/키워드 분기
