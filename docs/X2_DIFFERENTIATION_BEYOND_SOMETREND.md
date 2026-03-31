# X2 Differentiation Beyond Sometrend

## 썸트렌드가 하는 것

- 네이버 기반 국내 검색 트렌드
- 연관어/감성/시간별 추이
- 채널/콘텐츠 랭킹
- 국내 뉴스/블로그/카페 검색
- 리포트 다운로드

## X2가 이미 넘어선 것

### 1. 국내+글로벌 통합 분석
- 네이버 4종 + SerpAPI (Google) + NewsAPI + GDELT
- 15개국 11개 언어 지원 구조
- 같은 키워드로 한국 vs 글로벌 동시 분석

### 2. 검색 의도 + 소셜 반응 + 뉴스 확산 통합
- Intent Finder: 40+ 패턴 의도 분류
- 소셜 멘션: YouTube/X/Instagram/TikTok/네이버 통합
- 뉴스: NewsAPI + GDELT 65개 언어
- 한 키워드에 대해 "검색 의도 → 소셜 반응 → 뉴스 확산"을 한 번에 분석

### 3. 리스닝마인드 수준 검색 여정 분석
- Pathfinder: before/seed/after 캔버스 그래프
- Road View: A→B 6단계 여정 + 분기점
- Persona View: 8 아키타입 × 7 마인드셋
- Cluster Finder: 네트워크 그래프 + 워드클라우드

### 4. GEO/AEO (AI 검색 최적화)
- Perplexity, Google AI Overview, Bing Copilot 가시성 추적
- 인용 소스 등록/추적/건강도 리포트
- URL별 GEO 4축 점수 분석 (구조/답변성/신뢰/인용준비도)
- **썸트렌드에 없는 완전히 새로운 축**

### 5. LLM 기반 해석
- Claude Sonnet 연동 인사이트 해석
- 7가지 분석 타입별 자연어 해석
- 핵심 발견 3개 + 추천 액션 2개 자동 생성
- 규칙 기반 fallback (AI 미설정 시)

### 6. 5포맷 Export + 차트 이미지
- Word / PPT / PDF / CSV / XLSX
- html2canvas 차트 PNG 캡처
- Evidence 필수 정책 (근거 없는 export 거부)
- 업종별 vertical export policy

### 7. 인구통계 분석
- 네이버 DataLab 성별/연령 필터
- 성별 파이차트 + 연령대 바차트 + 시계열 비교
- 행동 기반 페르소나와 결합

### 8. 카테고리 엔트리 포인트
- 15개 카테고리 × 7개 진입 유형
- 검색 키워드가 어떤 카테고리로 어떻게 진입하는지 분석
- **썸트렌드에 없는 기능**

### 9. 운영/자동화 시스템
- BullMQ Worker 기반 자동 수집 (6시간 주기)
- 알림: 4가지 알림 타입, snooze/dismiss, 이메일/웹훅
- Usage 대시보드: 일별 추적, 한도 관리
- Pipeline 모니터링 admin UI

## X2 포지셔닝

```
썸트렌드   = 국내 검색 트렌드 분석 도구
리스닝마인드 = 검색 의도/여정 분석 도구
X2         = 국내+글로벌 통합 인텔리전스 + AI 해석 + GEO/AEO 플랫폼
```
